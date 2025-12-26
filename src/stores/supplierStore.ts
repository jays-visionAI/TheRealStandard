import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Supplier {
    id: string
    companyName: string
    bizRegNo: string
    ceoName: string
    phone: string
    fax?: string
    email: string
    address: string
    contactPerson?: string
    contactPhone?: string
    supplyCategory: 'meat' | 'byproduct' | 'packaging' | 'other'
    paymentTerms?: string
    bankName?: string
    bankAccount?: string
    memo?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

interface SupplierStore {
    suppliers: Supplier[]
    addSupplier: (supplier: Supplier) => void
    updateSupplier: (id: string, data: Partial<Supplier>) => void
    deleteSupplier: (id: string) => void
    initializeStore: () => void
}

const initialSuppliers: Supplier[] = [
    {
        id: 'supp-1',
        companyName: '우경인터내셔널',
        bizRegNo: '111-22-33333',
        ceoName: '박공급',
        phone: '02-1111-2222',
        email: 'wookyoung@example.com',
        address: '경기도 용인시 처인구...',
        supplyCategory: 'meat',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }
]

export const useSupplierStore = create<SupplierStore>()(
    persist(
        (set, get) => ({
            suppliers: initialSuppliers,
            addSupplier: (supplier) => set((state) => ({ suppliers: [...state.suppliers, supplier] })),
            updateSupplier: (id, data) => set((state) => ({
                suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date() } : s)
            })),
            deleteSupplier: (id) => set((state) => ({ suppliers: state.suppliers.filter(s => s.id !== id) })),
            initializeStore: () => {
                if (get().suppliers.length === 0) set({ suppliers: initialSuppliers })
            }
        }),
        { name: 'trs-supplier-storage' }
    )
)
