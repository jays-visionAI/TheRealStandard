// 거래처(고객사) 공유 데이터 스토어
// 향후 Firebase Firestore로 교체 시 이 파일만 수정하면 됨

import { create } from 'zustand'

// 거래처 인터페이스
export interface Customer {
    id: string
    // 기본 정보
    companyName: string
    bizRegNo: string           // 사업자등록번호
    ceoName: string            // 대표자명
    // 연락처
    phone: string
    fax?: string
    email: string
    // 주소
    address: string            // 본사 주소
    shipAddress1: string       // 배송지 주소 1
    shipAddress2?: string      // 배송지 주소 2
    // 담당자 정보
    contactPerson?: string     // 담당자명
    contactPhone?: string      // 담당자 연락처
    // 거래 정보
    priceType: 'wholesale' | 'retail'  // 도매가 / 소매가 적용
    paymentTerms?: string      // 결제 조건
    creditLimit?: number       // 신용 한도
    // 메모
    memo?: string
    // 상태
    isActive: boolean
    isKeyAccount: boolean      // ⭐ 주요 거래처 여부
    createdAt: Date
    updatedAt: Date
}

// 초기 Mock 데이터
const initialCustomers: Customer[] = []

// Zustand 스토어 정의
interface CustomerStore {
    customers: Customer[]
    // CRUD 액션
    addCustomer: (customer: Customer) => void
    updateCustomer: (id: string, data: Partial<Customer>) => void
    deleteCustomer: (id: string) => void
    toggleKeyAccount: (id: string) => void
    toggleActive: (id: string) => void
    // 조회
    getKeyAccounts: () => Customer[]
    getActiveCustomers: () => Customer[]
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
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
            c.id === id ? { ...c, isActive: !c.isActive, updatedAt: new Date() } : c
        )
    })),

    getKeyAccounts: () => get().customers.filter(c => c.isKeyAccount && c.isActive),

    getActiveCustomers: () => get().customers.filter(c => c.isActive),
}))
