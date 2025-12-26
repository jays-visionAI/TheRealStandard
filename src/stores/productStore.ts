import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Product {
    id: string
    name: string
    category: '냉장' | '냉동' | '부산물'
    subCategory?: string
    unit: 'kg' | 'box'
    boxWeight?: number
    taxFree: boolean
    costPrice: number
    wholesalePrice: number
    retailPrice: number
    isActive: boolean
    memo?: string
    createdAt: string
    updatedAt: string
}

interface ProductStore {
    products: Product[]
    setProducts: (products: Product[]) => void
    addProduct: (product: Product) => void
    updateProduct: (id: string, data: Partial<Product>) => void
    deleteProduct: (id: string) => void
    initializeStore: () => void  // 초기화용
}

const INITIAL_PRODUCTS: Product[] = [
    // ... (rest of products remain)
    // 냉장 (Chilled)
    { id: 'p01', name: '삼겹살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 17500, retailPrice: 25000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p02', name: '미삼겹살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 17000, retailPrice: 25000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p03', name: '삼겹살(대패)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 18500, retailPrice: 26000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p04', name: '삼겹살(칼집)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 19500, retailPrice: 27000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p05', name: '삼겹살/오겹살(찌개용, 불고기용)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 14000, retailPrice: 17000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p06', name: '목살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 16000, retailPrice: 23000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p07', name: '목살(대패)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 16500, retailPrice: 24000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p08', name: '항정살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 38000, retailPrice: 42000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p09', name: '가브리살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 25000, retailPrice: 33000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p10', name: '갈매기살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 22000, retailPrice: 30000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p11', name: '토시살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 7000, retailPrice: 9000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p12', name: '앞다리살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 10300, retailPrice: 12500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p13', name: '미박 앞다리살(미전지)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 10000, retailPrice: 12500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p14', name: '속사태/수육', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 6500, retailPrice: 11000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p15', name: '꽃살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 17500, retailPrice: 25000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p16', name: '미사태', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 9500, retailPrice: 18000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p17', name: '안심', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 8500, retailPrice: 10000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p18', name: '등심(짜장,카레,돈까스,잡채,탕수육)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 8300, retailPrice: 11000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p19', name: '뒷다리살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 5700, retailPrice: 7500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p20', name: '갈비', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 8500, retailPrice: 13000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p21', name: '등갈비', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 15000, retailPrice: 25000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p22', name: '꼬리반골', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 1000, retailPrice: 1500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p23', name: '등뼈/목뼈', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 2500, retailPrice: 3500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p24', name: '돈우콤마', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 17500, retailPrice: 25000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p25', name: '사골', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 1500, retailPrice: 1500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p26', name: '돈피(껍데기)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 2500, retailPrice: 3500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p27', name: '뒷고기(잡육)', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 4500, retailPrice: 5000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p28', name: 'A지방', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 2000, retailPrice: 2000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p29', name: '꼬들살', category: '냉장', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 18500, retailPrice: 26000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    // 냉동 (Frozen)
    { id: 'p30', name: '등심(짜장,카레,돈까스,잡채,탕수육) - 냉동', category: '냉동', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 8000, retailPrice: 10000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p31', name: '뒷다리(다짐육)', category: '냉동', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 5700, retailPrice: 6500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p32', name: '등갈비 - 냉동', category: '냉동', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 15000, retailPrice: 23000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p33', name: '목살(대패) - 냉동', category: '냉동', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 13000, retailPrice: 21000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p34', name: '삼겹살(대패) - 냉동', category: '냉동', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 13500, retailPrice: 22000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p35', name: '갈비(LA식)', category: '냉동', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 7000, retailPrice: 11500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p36', name: '갈비(찜용)', category: '냉동', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 7000, retailPrice: 10500, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    // 부산물 (By-products)
    { id: 'p37', name: '앞장족', category: '부산물', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 6000, retailPrice: 8000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p38', name: '뒷장족', category: '부산물', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 5500, retailPrice: 7000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
    { id: 'p39', name: '미니족(냉동)', category: '부산물', unit: 'kg', taxFree: true, costPrice: 0, wholesalePrice: 5000, retailPrice: 7000, isActive: true, createdAt: '2024-01-26', updatedAt: '2024-01-26' },
]

export const useProductStore = create<ProductStore>()(
    persist(
        (set) => ({
            products: INITIAL_PRODUCTS,
            setProducts: (products) => set({ products }),
            addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
            updateProduct: (id, data) => set((state) => ({
                products: state.products.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString().split('T')[0] } : p)
            })),
            deleteProduct: (id) => set((state) => ({
                products: state.products.filter(p => p.id !== id)
            })),
            initializeStore: () => set((state) => {
                if (state.products.length === 0) {
                    return { products: INITIAL_PRODUCTS }
                }
                return state
            }),
        }),
        {
            name: 'trs-product-storage',
        }
    )
)
