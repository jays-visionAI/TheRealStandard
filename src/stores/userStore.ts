import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserRole } from '../types'

export interface UserAccount {
    id: string
    email: string
    name: string
    role: UserRole
    orgId?: string // 소속 거래처 ID (고객/공급사 유저인 경우)
    status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
    password?: string
    createdAt: Date
    updatedAt: Date
    lastLogin?: Date
}

interface UserStore {
    users: UserAccount[]
    addUser: (user: UserAccount) => void
    updateUser: (id: string, data: Partial<UserAccount>) => void
    deleteUser: (id: string) => void
    getUserById: (id: string) => UserAccount | undefined
    getUserByEmail: (email: string) => UserAccount | undefined
    getUsersByRole: (role: UserRole) => UserAccount[]
    initializeStore: () => void
}

const initialUsers: UserAccount[] = [
    { id: 'admin-1', email: 'admin@trs.co.kr', name: '김관리', role: 'ADMIN', status: 'ACTIVE', password: '1234', createdAt: new Date(), updatedAt: new Date() },
    { id: 'acc-1', email: 'accounting@trs.co.kr', name: '이경리', role: 'ACCOUNTING', status: 'ACTIVE', password: '1234', createdAt: new Date(), updatedAt: new Date() },
    { id: 'wh-1', email: 'warehouse@trs.co.kr', name: '박창고', role: 'WAREHOUSE', status: 'ACTIVE', password: '1234', createdAt: new Date(), updatedAt: new Date() },
    { id: 'sales-1', email: 'sales@trs.co.kr', name: '최영업', role: 'OPS', status: 'ACTIVE', password: '1234', createdAt: new Date(), updatedAt: new Date() },
]

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            users: initialUsers,

            addUser: (user) => set((state) => ({
                users: [...state.users, user]
            })),

            updateUser: (id, data) => set((state) => ({
                users: state.users.map(u => u.id === id ? { ...u, ...data, updatedAt: new Date() } : u)
            })),

            deleteUser: (id) => set((state) => ({
                users: state.users.filter(u => u.id !== id)
            })),

            getUserById: (id) => get().users.find(u => u.id === id),

            getUserByEmail: (email) => get().users.find(u => u.email === email),

            getUsersByRole: (role) => get().users.filter(u => u.role === role),

            initializeStore: () => {
                if (get().users.length === 0) {
                    set({ users: initialUsers })
                }
            }
        }),
        {
            name: 'trs-user-storage',
        }
    )
)
