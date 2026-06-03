import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    User as FirebaseUser
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import type { UserRole } from '../types'
import { getUserByEmail, getUserById, createUser, type BusinessProfile } from '../lib/userService'
import { setCurrentActor } from '../lib/auditing'
import { getSystemApiKeys } from '../lib/systemConfigService'
import { useSystemStore } from '../stores/systemStore'

interface User {
    id: string          // Firebase UID와 동일
    email: string
    name: string
    role: UserRole
    avatar?: string
    firebaseUid?: string
    business?: BusinessProfile
    mustChangePassword?: boolean  // 관리자 발급 임시PW 사용 중인 경우 true. 첫 로그인 시 비번 변경 강제
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
    updateUserPassword: (newPassword: string) => Promise<void>
    signup: (email: string, password: string, name: string, businessData?: BusinessProfile) => Promise<User>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 관리자 권한을 가질 실제 이메일 목록
const ADMIN_EMAILS = ['jays@visai.io', 'glcej@naver.com']

// 데모 계정 정의 (Firebase Auth에 등록된 계정)
const DEMO_ACCOUNTS: Record<string, { email: string; password: string; name: string; role: UserRole }> = {
    'ADMIN': { email: 'jays@visai.io', password: '1q2w3e4r', name: '서상재 관리자', role: 'ADMIN' },
    'ADMIN2': { email: 'glcej@naver.com', password: '1q2w3e4r', name: '이세종 관리자', role: 'ADMIN' },
    'CUSTOMER': { email: 'customer@meatgo.kr', password: '1q2w3e4r', name: '고객사', role: 'CUSTOMER' },
    'WAREHOUSE': { email: 'warehouse@meatgo.kr', password: '1q2w3e4r', name: '물류담당', role: 'WAREHOUSE' },
    'ACCOUNTING': { email: 'accounting@meatgo.kr', password: '1q2w3e4r', name: '정산담당', role: 'ACCOUNTING' },
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
                    // Firebase UID로 직접 조회 (doc ID === Firebase UID)
                    const firestoreUser = await getUserById(fbUser.uid)

                    if (firestoreUser) {
                        // INACTIVE 유저는 차단 (관리자가 비활성화한 경우)
                        if (firestoreUser.status === 'INACTIVE') {
                            await signOut(auth)
                            setUser(null)
                            setLoading(false)
                            alert('비활성화된 계정입니다. 관리자에게 문의해주세요.')
                            return
                        }
                        // PENDING 유저는 로그인 허용 — ProtectedRoute가 /order/profile-setup으로
                        // 강제 라우팅하여 첫 로그인 시 비번 변경 + 프로필/서류 입력하게 함.
                        // 이전엔 PENDING을 차단했지만 그러면 신규 사용자가 프로필을 못 채우는
                        // 데드락에 걸렸음 (CUSTOMER 자가입 + SUPPLIER 관리자 발급 모두 해당).

                        // 관리자 이메일 목록에 있으면 권한을 ADMIN으로 강제 설정
                        const isAdminEmail = ADMIN_EMAILS.includes(fbUser.email.toLowerCase())
                        const finalRole = isAdminEmail ? 'ADMIN' : firestoreUser.role

                        setUser({
                            id: firestoreUser.id,
                            email: firestoreUser.email,
                            name: firestoreUser.business?.companyName || firestoreUser.name,
                            role: finalRole as UserRole,
                            firebaseUid: fbUser.uid,
                            business: firestoreUser.business,
                            mustChangePassword: firestoreUser.mustChangePassword
                        })
                    } else {
                        // users 컬렉션에 doc 없음.
                        // 정상 흐름(signup, Kakao/Google login)에서는 doc이 함께 생성되므로
                        // 여기 도달하는 건 비정상 케이스(Firestore 생성 실패 등).
                        // 이전엔 자동으로 CUSTOMER로 만들었지만 → SUPPLIER/직원 발급 도중 실패 시
                        // 역할이 오염되는 위험이 있어 제거. 명시적 에러 + 강제 로그아웃.
                        console.error('User document not found in Firestore for uid:', fbUser.uid, 'email:', fbUser.email)
                        await signOut(auth)
                        setUser(null)
                        setLoading(false)
                        alert('계정 정보를 찾을 수 없습니다.\n관리자에게 문의해주세요.\n(가입 직후라면 잠시 후 다시 시도해주세요.)')
                        return
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
            const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
            console.log('Login successful')
            const updatedUser = await getUserById(credential.user.uid)
            if (!updatedUser) throw new Error('사용자 정보를 찾을 수 없습니다.')

            // 관리자 권한 강제 부여
            const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail)
            const finalRole = isAdminEmail ? 'ADMIN' : updatedUser.role

            return {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: finalRole as UserRole,
                business: updatedUser.business
            }
        } catch (error: any) {
            console.error('Firebase Login Error Object:', error)

            // 인증 실패 처리.
            // [보안] 과거엔 계정이 없으면 입력값으로 자동 생성했으나(가입 통제 우회 위험),
            // 운영에서는 제거하고 개발(DEV) 데모 편의로만 한정한다. 운영 빌드에선 실행되지 않음.
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
                if (import.meta.env.DEV) {
                    try {
                        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
                        const demoAccount = Object.values(DEMO_ACCOUNTS).find(d => d.email === normalizedEmail)
                        await createUser({
                            email: normalizedEmail,
                            name: demoAccount?.name || '신규 사용자',
                            role: demoAccount?.role || 'CUSTOMER',
                            status: 'ACTIVE',
                        }, userCredential.user.uid)
                        const newUser = await getUserById(userCredential.user.uid)
                        if (!newUser) throw new Error('계정 생성 후 정보를 불러올 수 없습니다.')
                        return {
                            id: newUser.id,
                            email: newUser.email,
                            name: newUser.name,
                            role: newUser.role,
                            business: newUser.business
                        }
                    } catch (createError: any) {
                        if (createError.code === 'auth/email-already-in-use') {
                            throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
                        }
                        throw new Error(`계정 생성 실패: ${createError.message}`)
                    }
                }
                // 운영: 자동 생성하지 않고 표준 인증 실패 에러
                throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
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

        let kakaoUid: string | undefined
        try {
            // 먼저 로그인 시도
            const credential = await signInWithEmailAndPassword(auth, email, tempPassword)
            kakaoUid = credential.user.uid
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                // 계정이 없으면 생성
                try {
                    const credential = await createUserWithEmailAndPassword(auth, email, tempPassword)
                    kakaoUid = credential.user.uid

                    // Firestore에 사용자 정보 저장
                    await createUser({
                        email: email,
                        name: kakaoUser.properties?.nickname || '카카오 사용자',
                        role: 'CUSTOMER',
                        status: 'ACTIVE',
                    }, kakaoUid)
                } catch (createError) {
                    console.error('Kakao login error:', createError)
                    throw new Error('카카오 로그인에 실패했습니다.')
                }
            } else {
                throw error
            }
        }
        const updatedUser = await getUserById(kakaoUid!)
        if (!updatedUser) throw new Error('사용자 정보를 찾을 수 없습니다.')
        return {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
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
            const existingUser = await getUserById(googleUser.uid)
            if (!existingUser) {
                await createUser({
                    email: googleUser.email,
                    name: googleUser.displayName || '구글 사용자',
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                }, googleUser.uid)
            }

            const updatedUser = await getUserById(googleUser.uid)
            if (!updatedUser) throw new Error('사용자 정보를 찾을 수 없습니다.')
            return {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
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

    const updateUserPassword = async (newPassword: string) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.')
        try {
            await updatePassword(firebaseUser, newPassword)
        } catch (error: any) {
            console.error('Password Update Error:', error)
            if (error.code === 'auth/requires-recent-login') {
                throw new Error('보안을 위해 최근 로그인 기록이 필요합니다. 다시 로그인 후 시도해 주세요.')
            }
            throw new Error(`비밀번호 변경 실패: ${error.message}`)
        }
    }

    const signup: AuthContextType['signup'] = async (email, password, name, businessData) => {
        const normalizedEmail = email.toLowerCase().trim()
        try {
            // 1. Firebase Auth 계정 생성
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
            console.log('Signup Auth success:', userCredential.user.uid)

            // 2. Firestore 사용자 정보 생성 (기본 role: CUSTOMER, status: PENDING)
            const newUser = await createUser({
                email: normalizedEmail,
                name: name,
                role: 'CUSTOMER',
                status: 'PENDING',
                firebaseUid: userCredential.user.uid,
                business: businessData
            }, userCredential.user.uid)

            return {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role as UserRole,
                firebaseUid: userCredential.user.uid,
                business: newUser.business
            }
        } catch (error: any) {
            console.error('Signup error:', error)
            if (error.code === 'auth/email-already-in-use') {
                throw new Error('이미 사용 중인 이메일입니다.')
            }
            throw error
        }
    }

    // 작성자 자동기록을 위한 currentActor 동기화
    useEffect(() => {
        if (user) {
            setCurrentActor({
                uid: user.firebaseUid || user.id,
                name: user.name,
                role: user.role,
            })
        } else {
            setCurrentActor(null)
        }
    }, [user])

    // 로그인된 직원이 있으면 Firestore의 외부 API 키를 store에 sync
    // (firestore.rules에 의해 isStaff()만 read 가능)
    useEffect(() => {
        if (!user) return
        const staffRoles = ['ADMIN', 'OPS', 'SALES', 'PURCHASE', 'ACCOUNTING', 'WAREHOUSE']
        if (!staffRoles.includes(user.role)) return
        getSystemApiKeys().then(remote => {
            if (!remote) return
            useSystemStore.getState().updateSettings({
                datagoKey: remote.datagoKey ?? undefined,
                kamisKey: remote.kamisKey ?? undefined,
                kamisId: remote.kamisId ?? undefined,
                naverClientId: remote.naverClientId ?? undefined,
                naverClientSecret: remote.naverClientSecret ?? undefined,
            })
        }).catch(err => console.warn('API key sync failed:', err))
    }, [user])

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
                updateUserPassword,
                signup,
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
