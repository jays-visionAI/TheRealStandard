import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ============ PRODUCT SERVICE ============
export interface FirestoreProduct {
    id: string
    name: string
    category: '냉장' | '냉동' | '부산물'
    subCategory?: string
    unit: 'kg' | 'box'
    boxWeight?: number | null
    taxFree: boolean
    costPrice: number
    wholesalePrice: number
    retailPrice: number
    isActive: boolean
    memo?: string
    createdAt: Timestamp
    updatedAt: Timestamp
}

const PRODUCTS_COLLECTION = 'products'
const productsRef = collection(db, PRODUCTS_COLLECTION)

export async function getAllProducts(): Promise<FirestoreProduct[]> {
    const snapshot = await getDocs(productsRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreProduct))
}

export async function getProductById(id: string): Promise<FirestoreProduct | null> {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreProduct
}

export async function createProduct(data: Omit<FirestoreProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreProduct> {
    const newDocRef = doc(productsRef)
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreProduct
}

export async function createProductWithId(id: string, data: Omit<FirestoreProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreProduct> {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    const now = serverTimestamp()
    await setDoc(docRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreProduct
}

export async function updateProduct(id: string, data: Partial<FirestoreProduct>): Promise<void> {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteProduct(id: string): Promise<void> {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    await deleteDoc(docRef)
}

export async function seedInitialProducts(): Promise<void> {
    const existing = await getAllProducts()
    if (existing.length > 0) return

    const initialProducts = [
        { id: 'p01', name: '삼겹살', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 17500, retailPrice: 25000, isActive: true },
        { id: 'p02', name: '미삼겹살', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 17000, retailPrice: 25000, isActive: true },
        { id: 'p03', name: '삼겹살(대패)', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 18500, retailPrice: 26000, isActive: true },
        { id: 'p04', name: '삼겹살(칼집)', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 19500, retailPrice: 27000, isActive: true },
        { id: 'p05', name: '삼겹살/오겹살(찌개용, 불고기용)', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 14000, retailPrice: 17000, isActive: true },
        { id: 'p06', name: '목살', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 16000, retailPrice: 23000, isActive: true },
        { id: 'p07', name: '목살(대패)', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 16500, retailPrice: 24000, isActive: true },
        { id: 'p08', name: '항정살', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 38000, retailPrice: 42000, isActive: true },
        { id: 'p09', name: '가브리살', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 25000, retailPrice: 33000, isActive: true },
        { id: 'p10', name: '갈매기살', category: '냉장' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 22000, retailPrice: 30000, isActive: true },
        // 냉동
        { id: 'p30', name: '등심(짜장,카레,돈까스,잡채,탕수육) - 냉동', category: '냉동' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 8000, retailPrice: 10000, isActive: true },
        { id: 'p31', name: '뒷다리(다짐육)', category: '냉동' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 5700, retailPrice: 6500, isActive: true },
        // 부산물
        { id: 'p37', name: '앞장족', category: '부산물' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 6000, retailPrice: 8000, isActive: true },
        { id: 'p38', name: '뒷장족', category: '부산물' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 5500, retailPrice: 7000, isActive: true },
    ]

    for (const p of initialProducts) {
        await createProductWithId(p.id, p)
    }
    console.log('Initial products seeded')
}
