import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserRole } from '../types'

interface User {
    id: string
    email: string
    name: string
    role: UserRole
    orgId?: string
    avatar?: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    loginWithKakao: (kakaoUser: any) => Promise<void>
    loginWithGoogle: () => Promise<void>
    logout: () => void
    isAdmin: boolean
    isCustomer: boolean
    isWarehouse: boolean
    isAccounting: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    // 초기 로드시 localStorage에서 사용자 정보 확인
    useEffect(() => {
        const savedUser = localStorage.getItem('trs_user')
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser)
                setUser(parsedUser)
            } catch {
                localStorage.removeItem('trs_user')
            }
        }
        setLoading(false)
    }, [])

    const login = async (email: string, password: string) => {
        // Firebase Firestore에서 사용자 검증
        const { validateLogin } = await import('../lib/userService')

        const foundUser = await validateLogin(email, password)

        if (!foundUser) {
            // 고객 초대 프로세스로 가입된 고객 계정 백업 체크 (추후 customers 컬렉션도 Firebase로 마이그레이션 예정)
            const { useCustomerStore } = await import('../stores/customerStore')
            const { customers } = useCustomerStore.getState()
            const foundCustomer = customers.find(c => c.email === email && c.password === password && c.status === 'ACTIVE')

            if (foundCustomer) {
                const mappedUser: User = {
                    id: foundCustomer.id,
                    email: foundCustomer.email,
                    name: foundCustomer.ceoName,
                    role: 'CUSTOMER',
                    orgId: foundCustomer.id
                }
                localStorage.setItem('trs_user', JSON.stringify(mappedUser))
                setUser(mappedUser)
                return
            }
            throw new Error('이메일 또는 비밀번호가 일치하지 않거나 유효하지 않은 계정입니다.')
        }

        const mappedUser: User = {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
            orgId: foundUser.orgId
        }

        localStorage.setItem('trs_user', JSON.stringify(mappedUser))
        setUser(mappedUser)
    }

    const loginWithKakao = async (kakaoUser: any) => {
        const email = kakaoUser.kakao_account?.email || `${kakaoUser.id}@kakao.com`

        // 1. 사내 직원 목록(userStore)에서 이메일 매칭 확인
        const { useUserStore } = await import('../stores/userStore')
        const { users } = useUserStore.getState()
        const internalUser = users.find(u => u.email === email && u.status === 'ACTIVE')

        if (internalUser) {
            // 사내 직원으로 로그인 (ADMIN, WAREHOUSE, ACCOUNTING 등)
            const mappedUser: User = {
                id: internalUser.id,
                email: internalUser.email,
                name: internalUser.name,
                role: internalUser.role,
                orgId: internalUser.orgId,
                avatar: kakaoUser.properties?.profile_image
            }
            localStorage.setItem('trs_user', JSON.stringify(mappedUser))
            setUser(mappedUser)
            return
        }

        // 2. 고객사 DB에서도 확인 (기존 가입 고객인지)
        const { useCustomerStore } = await import('../stores/customerStore')
        const { customers } = useCustomerStore.getState()
        const existingCustomer = customers.find(c => c.email === email && c.status === 'ACTIVE')

        if (existingCustomer) {
            const mappedUser: User = {
                id: existingCustomer.id,
                email: existingCustomer.email,
                name: existingCustomer.ceoName,
                role: 'CUSTOMER',
                orgId: existingCustomer.id,
                avatar: kakaoUser.properties?.profile_image
            }
            localStorage.setItem('trs_user', JSON.stringify(mappedUser))
            setUser(mappedUser)
            return
        }

        // 3. 신규 사용자라면 기본 '고객'으로 처리 (데모용 자동 가입)
        const newUser: User = {
            id: `kakao-${kakaoUser.id}`,
            email: email,
            name: kakaoUser.properties?.nickname || '카카오 사용자',
            role: 'CUSTOMER',
            avatar: kakaoUser.properties?.profile_image
        }

        localStorage.setItem('trs_user', JSON.stringify(newUser))
        setUser(newUser)
    }

    const loginWithGoogle = async () => {
        const { signInWithGoogle } = await import('../lib/googleService')
        const { getUserByEmail, createUser } = await import('../lib/userService')

        const googleUser = await signInWithGoogle()
        if (!googleUser.email) throw new Error('구글 계정에 이메일이 없습니다.')

        // 1. 사내 직원 목록(users)에서 이메일 매칭
        let existingUser = await getUserByEmail(googleUser.email)

        if (existingUser) {
            const mappedUser: User = {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                role: existingUser.role,
                orgId: existingUser.orgId,
                avatar: googleUser.photoURL || undefined
            }
            localStorage.setItem('trs_user', JSON.stringify(mappedUser))
            setUser(mappedUser)
            return
        }

        // 2. 신규 사용자라면 기본 'CUSTOMER'로 자동 등록
        const newFirestoreUser = await createUser({
            email: googleUser.email,
            name: googleUser.displayName || '구글 사용자',
            role: 'CUSTOMER',
            status: 'ACTIVE',
        })

        const newUser: User = {
            id: newFirestoreUser.id,
            email: newFirestoreUser.email,
            name: newFirestoreUser.name,
            role: 'CUSTOMER',
            avatar: googleUser.photoURL || undefined
        }

        localStorage.setItem('trs_user', JSON.stringify(newUser))
        setUser(newUser)
    }

    const logout = () => {
        localStorage.removeItem('trs_user')
        setUser(null)
    }

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPS'
    const isCustomer = user?.role === 'CUSTOMER'
    const isWarehouse = user?.role === 'WAREHOUSE'
    const isAccounting = user?.role === 'ACCOUNTING'

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                loginWithKakao,
                loginWithGoogle,
                logout,
                isAdmin,
                isCustomer,
                isWarehouse,
                isAccounting,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
