import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 거래처 인터페이스
// ... (Customer interface remains same)
export interface Customer {
    id: string
    companyName: string
    bizRegNo: string
    ceoName: string
    phone: string
    fax?: string
    email: string
    address: string
    shipAddress1: string
    shipAddress2?: string
    contactPerson?: string
    contactPhone?: string
    priceType: 'wholesale' | 'retail'
    paymentTerms?: string
    creditLimit?: number
    memo?: string
    isActive: boolean
    isKeyAccount: boolean
    createdAt: Date
    updatedAt: Date
    // 인증 관련 필드 추가
    password?: string
    inviteToken?: string
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE'
}

// 초기 Mock 데이터
const initialCustomers: Customer[] = [
    {
        id: 'cust-1',
        companyName: '아우내식품',
        bizRegNo: '123-45-67890',
        ceoName: '박아우',
        phone: '02-1234-5678',
        email: 'aunae@example.com',
        address: '서울시 강남구 삼성동 123',
        shipAddress1: '서울시 강남구 삼성동 123',
        priceType: 'wholesale',
        isActive: true,
        isKeyAccount: true,
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2025-12-01'),
        status: 'ACTIVE',
        password: '1234'
    },
    {
        id: 'cust-2',
        companyName: '진심왕돈가스',
        bizRegNo: '987-65-43210',
        ceoName: '김진심',
        phone: '02-9876-5432',
        email: 'jinsim@example.com',
        address: '서울시 송파구 잠실동 456',
        shipAddress1: '서울시 송파구 잠실동 456',
        priceType: 'wholesale',
        isActive: true,
        isKeyAccount: true,
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2025-12-01'),
        status: 'PENDING',
        inviteToken: 'welcome-jinsim'
    }
]

// Zustand 스토어 정의
interface CustomerStore {
    customers: Customer[]
    // CRUD 액션
    addCustomer: (customer: Customer) => void
    updateCustomer: (id: string, data: Partial<Customer>) => void
    deleteCustomer: (id: string) => void
    toggleKeyAccount: (id: string) => void
    toggleActive: (id: string) => void

    // 초대/활성화 액션 추가
    generateInviteToken: (id: string) => string
    activateCustomer: (token: string, email: string, password: string) => Promise<void>

    // 조회
    getCustomerByToken: (token: string) => Customer | undefined
    getCustomerByEmail: (email: string) => Customer | undefined
    getKeyAccounts: () => Customer[]
    getActiveCustomers: () => Customer[]
    initializeStore: () => void
}

export const useCustomerStore = create<CustomerStore>()(
    persist(
        (set, get) => ({
            customers: initialCustomers,

            addCustomer: (customer) => set((state) => ({
                customers: [...state.customers, customer]
            })),

            updateCustomer: (id, data) => set((state) => ({
                customers: state.customers.map(c =>
                    c.id === id ? { ...c, ...data, updatedAt: new Date() } : c
                )
            })),

            deleteCustomer: (id) => set((state) => ({
                customers: state.customers.filter(c => c.id !== id)
            })),

            toggleKeyAccount: (id) => set((state) => ({
                customers: state.customers.map(c =>
                    c.id === id ? { ...c, isKeyAccount: !c.isKeyAccount, updatedAt: new Date() } : c
                )
            })),

            toggleActive: (id) => set((state) => ({
                customers: state.customers.map(c =>
                    c.id === id ? {
                        ...c,
                        isActive: !c.isActive,
                        status: !c.isActive ? (c.status === 'INACTIVE' ? 'PENDING' : c.status) : 'INACTIVE',
                        updatedAt: new Date()
                    } : c
                )
            })),

            generateInviteToken: (id) => {
                const token = `invite-${Math.random().toString(36).substr(2, 9)}`
                set((state) => ({
                    customers: state.customers.map(c =>
                        c.id === id ? { ...c, inviteToken: token, updatedAt: new Date() } : c
                    )
                }))
                return token
            },

            activateCustomer: async (token, email, password) => {
                const customer = get().customers.find(c => c.inviteToken === token)
                if (!customer) throw new Error('유효하지 않은 초대 토큰입니다.')

                set((state) => ({
                    customers: state.customers.map(c =>
                        c.inviteToken === token ? {
                            ...c,
                            email,
                            password,
                            status: 'ACTIVE',
                            isActive: true,
                            inviteToken: undefined, // 사용 후 제거
                            updatedAt: new Date()
                        } : c
                    )
                }))
            },

            getCustomerByToken: (token) => get().customers.find(c => c.inviteToken === token),
            getCustomerByEmail: (email) => get().customers.find(c => c.email === email),

            getKeyAccounts: () => get().customers.filter(c => c.isKeyAccount && c.isActive),

            getActiveCustomers: () => get().customers.filter(c => c.isActive && c.status === 'ACTIVE'),

            initializeStore: () => {
                if (get().customers.length === 0 && initialCustomers.length > 0) {
                    set({ customers: initialCustomers })
                }
            }
        }),
        {
            name: 'trs-customer-storage',
        }
    )
)
