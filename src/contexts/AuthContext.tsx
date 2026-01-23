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
import { getUserByEmail, createUser, type BusinessProfile } from '../lib/userService'

interface User {
    id: string
    email: string
    name: string
    role: UserRole
    orgId?: string
    avatar?: string
    firebaseUid?: string
    business?: BusinessProfile
}

interface AuthContextType {
    user: User | null
    firebaseUser: FirebaseUser | null
    loading: boolean
    login: (email: string, password: string) => Promise<User>
    loginWithKakao: (kakaoUser: any) => Promise<User>
    loginWithGoogle: () => Promise<User>
    logout: () => Promise<void>
    isAdmin: boolean
    isCustomer: boolean
    isWarehouse: boolean
    isAccounting: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 관리자 권한을 가질 실제 이메일 목록
const ADMIN_EMAILS = ['jays@visai.io', 'glcej@naver.com']

// 데모 계정 정의 (Firebase Auth에 등록된 계정)
const DEMO_ACCOUNTS: Record<string, { email: string; password: string; name: string; role: UserRole }> = {
    'ADMIN': { email: 'jays@visai.io', password: 'meatgo123!', name: '서상재 관리자', role: 'ADMIN' },
    'ADMIN2': { email: 'glcej@naver.com', password: 'meatgo123!', name: '이세종 관리자', role: 'ADMIN' },
    'CUSTOMER': { email: 'customer@meatgo.kr', password: 'meatgo123!', name: '고객사', role: 'CUSTOMER' },
    'WAREHOUSE': { email: 'warehouse@meatgo.kr', password: 'meatgo123!', name: '물류담당', role: 'WAREHOUSE' },
    'ACCOUNTING': { email: 'accounting@meatgo.kr', password: 'meatgo123!', name: '정산담당', role: 'ACCOUNTING' },
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
                    // 통합 users 컬렉션에서 사용자 정보 가져오기
                    const firestoreUser = await getUserByEmail(fbUser.email)

                    if (firestoreUser) {
                        // 관리자 이메일 목록에 있으면 권한을 ADMIN으로 강제 설정
                        const isAdminEmail = ADMIN_EMAILS.includes(fbUser.email.toLowerCase())
                        const finalRole = isAdminEmail ? 'ADMIN' : firestoreUser.role

                        setUser({
                            id: firestoreUser.id,
                            email: firestoreUser.email,
                            name: firestoreUser.business?.companyName || firestoreUser.name,
                            role: finalRole as UserRole,
                            orgId: firestoreUser.id,
                            firebaseUid: fbUser.uid,
                            business: firestoreUser.business
                        })
                    } else {
                        // users 컬렉션에 없는 경우 - 신규 사용자로 자동 생성
                        console.log('User not found in Firestore, creating new user...')
                        const { createUser } = await import('../lib/userService')
                        await createUser({
                            email: fbUser.email.toLowerCase().trim(),
                            name: fbUser.displayName || '신규 사용자',
                            role: 'CUSTOMER',
                            status: 'PENDING',
                            firebaseUid: fbUser.uid
                        })

                        // 생성된 사용자 정보 다시 조회
                        const newUser = await getUserByEmail(fbUser.email)
                        if (newUser) {
                            setUser({
                                id: newUser.id,
                                email: newUser.email,
                                name: newUser.name,
                                role: newUser.role,
                                orgId: newUser.id,
                                firebaseUid: fbUser.uid
                            })
                        } else {
                            // fallback: 기본 정보로 설정
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
                    setUser({
                        id: fbUser.uid,
                        email: fbUser.email,
                        name: fbUser.displayName || '사용자',
                        role: 'CUSTOMER',
                        firebaseUid: fbUser.uid,
                        business: undefined // No business profile on error fallback
                    })
                }
            } else {
                setUser(null)
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const login: AuthContextType['login'] = async (email, password) => {
        const normalizedEmail = email.toLowerCase().trim()
        try {
            console.log('Attempting login for:', normalizedEmail)
            // Firebase Auth로 로그인
            await signInWithEmailAndPassword(auth, normalizedEmail, password)
            console.log('Login successful')
            const updatedUser = await getUserByEmail(normalizedEmail)
            if (!updatedUser) throw new Error('사용자 정보를 찾을 수 없습니다.')

            // 관리자 권한 강제 부여
            const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail)
            const finalRole = isAdminEmail ? 'ADMIN' : updatedUser.role

            return {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: finalRole as UserRole,
                orgId: updatedUser.orgId,
                business: updatedUser.business
            }
        } catch (error: any) {
            console.error('Firebase Login Error Object:', error)

            // Firebase Auth 계정이 없으면 자동 생성 시도 (데모용)
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
                try {
                    console.log('Account not found, attempting to create demo account:', normalizedEmail)
                    // 새 Firebase Auth 계정 생성
                    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
                    console.log('Auth account created:', userCredential.user.uid)

                    // Firestore에 사용자 정보 저장 (데모 계정 확인)
                    const demoAccount = Object.values(DEMO_ACCOUNTS).find(d => d.email === normalizedEmail)

                    await createUser({
                        email: normalizedEmail,
                        name: demoAccount?.name || '신규 사용자',
                        role: demoAccount?.role || 'CUSTOMER',
                        status: 'ACTIVE',
                    })
                    console.log('Firestore user identity created')
                    const newUser = await getUserByEmail(normalizedEmail)
                    if (!newUser) throw new Error('계정 생성 후 정보를 불러올 수 없습니다.')
                    return {
                        id: newUser.id,
                        email: newUser.email,
                        name: newUser.name,
                        role: newUser.role,
                        orgId: newUser.orgId,
                        business: newUser.business
                    }
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
                throw new Error(`로그인 오류 (${error.code || 'unknown'}): ${error.message}`)
            }
        }
    }

    const loginWithKakao: AuthContextType['loginWithKakao'] = async (kakaoUser) => {
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
        const updatedUser = await getUserByEmail(email)
        if (!updatedUser) throw new Error('사용자 정보를 찾을 수 없습니다.')
        return {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            orgId: updatedUser.orgId,
            business: updatedUser.business
        }
    }

    const loginWithGoogle: AuthContextType['loginWithGoogle'] = async () => {
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

            const updatedUser = await getUserByEmail(googleUser.email)
            if (!updatedUser) throw new Error('사용자 정보를 찾을 수 없습니다.')
            return {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                orgId: updatedUser.orgId,
                business: updatedUser.business
            }
        } catch (error: any) {
            console.warn('Google Popup Login failed, checking for popup-blocked error:', error)

            // 팝업 차단 에러 발생 시 리다이렉트 방식으로 자동 전환
            if (error.message?.includes('팝업이 차단되었습니다') || error.code?.includes('popup-blocked')) {
                console.log('Redirecting to Google login due to popup block...')
                await signInWithGoogleRedirect()
                // 리다이렉트가 일어나므로 이 이후 코드는 실행되지 않음
                return null as any
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
