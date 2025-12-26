import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserRole } from '../types'

interface User {
    id: string
    email: string
    name: string
    role: UserRole
    orgId?: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
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
        const { useUserStore } = await import('../stores/userStore')
        const { users } = useUserStore.getState()

        const foundUser = users.find(u => u.email === email && u.password === password && u.status === 'ACTIVE')

        if (!foundUser) {
            // 고객 초대 프로세스로 가입된 고객 계정 백업 체크
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
