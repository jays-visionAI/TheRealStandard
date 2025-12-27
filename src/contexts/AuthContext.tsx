import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import type { UserRole } from '../types'
import { getUserByEmail, createUser } from '../lib/userService'
import { getAllCustomers } from '../lib/customerService'

interface User {
    id: string
    email: string
    name: string
    role: UserRole
    orgId?: string
    avatar?: string
    firebaseUid?: string
}

interface AuthContextType {
    user: User | null
    firebaseUser: FirebaseUser | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    loginWithKakao: (kakaoUser: any) => Promise<void>
    loginWithGoogle: () => Promise<void>
    logout: () => Promise<void>
    isAdmin: boolean
    isCustomer: boolean
    isWarehouse: boolean
    isAccounting: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 데모 계정 정의 (Firebase Auth에 등록된 계정)
const DEMO_ACCOUNTS: Record<string, { email: string; password: string; name: string; role: UserRole }> = {
    'ADMIN': { email: 'admin@trs.com', password: 'admin123', name: '관리자', role: 'ADMIN' },
    'CUSTOMER': { email: 'customer@trs.com', password: 'customer123', name: '고객사', role: 'CUSTOMER' },
    'WAREHOUSE': { email: 'warehouse@trs.com', password: 'warehouse123', name: '물류담당', role: 'WAREHOUSE' },
    'ACCOUNTING': { email: 'accounting@trs.com', password: 'accounting123', name: '정산담당', role: 'ACCOUNTING' },
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
    const [loading, setLoading] = useState(true)

    // Firebase Auth 상태 감지
    useEffect(() => {
        const checkRedirect = async () => {
            try {
                const { handleGoogleRedirectResult } = await import('../lib/googleService')
                await handleGoogleRedirectResult()
            } catch (err) {
                console.error('Redirect result check failed:', err)
            }
        }
        checkRedirect()

        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser)

            if (fbUser && fbUser.email) {
                try {
                    // Firestore에서 사용자 정보 가져오기
                    const firestoreUser = await getUserByEmail(fbUser.email)

                    if (firestoreUser) {
                        setUser({
                            id: firestoreUser.id,
                            email: firestoreUser.email,
                            name: firestoreUser.name,
                            role: firestoreUser.role,
                            orgId: firestoreUser.orgId,
                            firebaseUid: fbUser.uid
                        })
                    } else {
                        // 고객 DB에서 확인
                        const customers = await getAllCustomers()
                        const foundCustomer = customers.find(c => c.email === fbUser.email)

                        if (foundCustomer) {
                            setUser({
                                id: foundCustomer.id,
                                email: foundCustomer.email,
                                name: foundCustomer.ceoName,
                                role: 'CUSTOMER',
                                orgId: foundCustomer.id,
                                firebaseUid: fbUser.uid
                            })
                        } else {
                            // 설정되지 않은 사용자 - 기본 고객으로 처리
                            setUser({
                                id: fbUser.uid,
                                email: fbUser.email,
                                name: fbUser.displayName || '사용자',
                                role: 'CUSTOMER',
                                firebaseUid: fbUser.uid
                            })
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch user data:', error)
                    // Firebase Auth는 성공했지만 Firestore 조회 실패 시
                    // 기본 정보로 설정
                    setUser({
                        id: fbUser.uid,
                        email: fbUser.email,
                        name: fbUser.displayName || '사용자',
                        role: 'CUSTOMER',
                        firebaseUid: fbUser.uid
                    })
                }
            } else {
                setUser(null)
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const login = async (email: string, password: string) => {
        try {
            console.log('Attempting login for:', email)
            // Firebase Auth로 로그인
            await signInWithEmailAndPassword(auth, email, password)
            console.log('Login successful')
        } catch (error: any) {
            console.error('Firebase Login Error Object:', error)

            // Firebase Auth 계정이 없으면 자동 생성 시도 (데모용)
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
                try {
                    console.log('Account not found, attempting to create demo account:', email)
                    // 새 Firebase Auth 계정 생성
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
                    console.log('Auth account created:', userCredential.user.uid)

                    // Firestore에 사용자 정보 저장 (데모 계정 확인)
                    const demoAccount = Object.values(DEMO_ACCOUNTS).find(d => d.email === email)

                    await createUser({
                        email: email,
                        name: demoAccount?.name || '신규 사용자',
                        role: demoAccount?.role || 'CUSTOMER',
                        status: 'ACTIVE',
                    })
                    console.log('Firestore user identity created')
                } catch (createError: any) {
                    console.error('Account Creation Error:', createError)
                    if (createError.code === 'auth/email-already-in-use') {
                        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
                    }
                    throw new Error(`계정 생성 실패: ${createError.message}`)
                }
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('비밀번호가 올바르지 않습니다.')
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('유효하지 않은 이메일 형식입니다.')
            } else {
                throw new Error(`로그인 오류 (${error.code}): ${error.message}`)
            }
        }
    }

    const loginWithKakao = async (kakaoUser: any) => {
        const email = kakaoUser.kakao_account?.email || `${kakaoUser.id}@kakao.com`
        const tempPassword = `kakao_${kakaoUser.id}_temp`

        try {
            // 먼저 로그인 시도
            await signInWithEmailAndPassword(auth, email, tempPassword)
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                // 계정이 없으면 생성
                try {
                    await createUserWithEmailAndPassword(auth, email, tempPassword)

                    // Firestore에 사용자 정보 저장
                    await createUser({
                        email: email,
                        name: kakaoUser.properties?.nickname || '카카오 사용자',
                        role: 'CUSTOMER',
                        status: 'ACTIVE',
                    })
                } catch (createError) {
                    console.error('Kakao login error:', createError)
                    throw new Error('카카오 로그인에 실패했습니다.')
                }
            } else {
                throw error
            }
        }
    }

    const loginWithGoogle = async () => {
        const { signInWithGoogle, signInWithGoogleRedirect } = await import('../lib/googleService')

        try {
            const googleUser = await signInWithGoogle()
            if (!googleUser.email) throw new Error('구글 계정에 이메일이 없습니다.')

            console.log('Google login (popup) success:', googleUser.email)

            // Firestore에 사용자 정보가 없으면 생성
            const existingUser = await getUserByEmail(googleUser.email)
            if (!existingUser) {
                await createUser({
                    email: googleUser.email,
                    name: googleUser.displayName || '구글 사용자',
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                })
            }
        } catch (error: any) {
            console.warn('Google Popup Login failed, checking for popup-blocked error:', error)

            // 팝업 차단 에러 발생 시 리다이렉트 방식으로 자동 전환
            if (error.message.includes('팝업이 차단되었습니다') || error.code?.includes('popup-blocked')) {
                console.log('Redirecting to Google login due to popup block...')
                await signInWithGoogleRedirect()
            } else {
                throw error
            }
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
            setUser(null)
            setFirebaseUser(null)
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'OPS'
    const isCustomer = user?.role === 'CUSTOMER'
    const isWarehouse = user?.role === 'WAREHOUSE'
    const isAccounting = user?.role === 'ACCOUNTING'

    return (
        <AuthContext.Provider
            value={{
                user,
                firebaseUser,
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
