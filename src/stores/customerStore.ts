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
const initialCustomers: Customer[] = [
    {
        id: 'cust-001',
        companyName: '한우명가',
        bizRegNo: '123-45-67890',
        ceoName: '김대표',
        phone: '02-1234-5678',
        fax: '02-1234-5679',
        email: 'order@hanwoo.co.kr',
        address: '서울시 강남구 역삼동 123-45',
        shipAddress1: '서울시 강남구 역삼동 123-45 (본점)',
        shipAddress2: '서울시 서초구 서초동 456-78 (2호점)',
        contactPerson: '이과장',
        contactPhone: '010-1234-5678',
        priceType: 'wholesale',
        paymentTerms: '월말 정산',
        creditLimit: 50000000,
        memo: 'VIP 거래처',
        isActive: true,
        isKeyAccount: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'cust-002',
        companyName: '정육왕',
        bizRegNo: '234-56-78901',
        ceoName: '이대표',
        phone: '02-2345-6789',
        email: 'master@meat.co.kr',
        address: '서울시 서초구 서초동 234-56',
        shipAddress1: '서울시 서초구 서초동 234-56',
        contactPerson: '최대리',
        contactPhone: '010-2345-6789',
        priceType: 'wholesale',
        paymentTerms: '선결제',
        isActive: true,
        isKeyAccount: true,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
    },
    {
        id: 'cust-003',
        companyName: '고기마을',
        bizRegNo: '345-67-89012',
        ceoName: '박대표',
        phone: '031-345-6789',
        email: 'info@meatvillage.kr',
        address: '경기도 성남시 분당구 정자동 345',
        shipAddress1: '경기도 성남시 분당구 정자동 345',
        priceType: 'retail',
        isActive: true,
        isKeyAccount: false,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-20'),
    },
    {
        id: 'cust-004',
        companyName: '미트하우스',
        bizRegNo: '456-78-90123',
        ceoName: '최대표',
        phone: '02-456-7890',
        email: 'contact@meathouse.kr',
        address: '서울시 마포구 상암동 456',
        shipAddress1: '서울시 마포구 상암동 456',
        priceType: 'wholesale',
        isActive: true,
        isKeyAccount: false,
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-12'),
    },
    {
        id: 'cust-005',
        companyName: '육가공센터',
        bizRegNo: '567-89-01234',
        ceoName: '정대표',
        phone: '031-567-8901',
        email: 'center@meat.kr',
        address: '경기도 용인시 기흥구 567',
        shipAddress1: '경기도 용인시 기흥구 567',
        priceType: 'wholesale',
        isActive: true,
        isKeyAccount: false,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'cust-006',
        companyName: '프리미엄정육',
        bizRegNo: '678-90-12345',
        ceoName: '한대표',
        phone: '02-678-9012',
        email: 'premium@meat.kr',
        address: '서울시 송파구 잠실동 678',
        shipAddress1: '서울시 송파구 잠실동 678',
        priceType: 'wholesale',
        paymentTerms: '월말 정산',
        isActive: true,
        isKeyAccount: true,
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-18'),
    },
    {
        id: 'cust-007',
        companyName: '테이스티미트',
        bizRegNo: '789-01-23456',
        ceoName: '강대표',
        phone: '032-789-0123',
        email: 'tasty@meat.kr',
        address: '인천시 연수구 송도동 789',
        shipAddress1: '인천시 연수구 송도동 789',
        priceType: 'retail',
        isActive: true,
        isKeyAccount: false,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
    },
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
