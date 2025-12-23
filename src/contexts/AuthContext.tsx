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

// Mock 사용자 목록 (데모용)
const DEMO_USERS: User[] = [
    { id: 'admin-001', email: 'admin@taeyoon.co.kr', name: '김관리', role: 'ADMIN' },
    { id: 'warehouse-001', email: 'warehouse@taeyoon.co.kr', name: '박창고', role: 'WAREHOUSE' },
    { id: 'accounting-001', email: 'accounting@taeyoon.co.kr', name: '이경리', role: 'ACCOUNTING' },
    { id: 'customer-001', email: 'customer@example.com', name: '최고객', role: 'CUSTOMER' },
]

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
        // 데모용 비밀번호 체크 (실제로는 Firebase Auth 사용)
        if (password !== '1234') {
            throw new Error('Invalid password')
        }

        const foundUser = DEMO_USERS.find(u => u.email === email)
        if (!foundUser) {
            throw new Error('User not found')
        }

        localStorage.setItem('trs_user', JSON.stringify(foundUser))
        setUser(foundUser)
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
