import {
    collection, doc, getDocs, getDoc, setDoc, deleteDoc,
    query, where,
    serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db, cleanData } from './firebase'

// ============ PRODUCT SERVICE ============

/**
 * 상품 멀티미디어 — 최대 5장 이미지 + 1개 YouTube 영상.
 * 대표 이미지(isPrimary=true)는 한 개만. 카탈로그 카드/테이블 썸네일에 사용.
 */
export interface ProductMediaImage {
    url: string            // 원본 Firebase Storage URL
    thumbnailUrl?: string  // Canvas 클라이언트 리사이즈된 200x200 썸네일 (선택)
    storagePath: string    // 삭제용
    isPrimary: boolean     // 대표 이미지 (1개만 true)
}

export interface FirestoreProduct {
    id: string
    name: string
    category1: '냉장' | '냉동' | '부산물'
    category2: 'B2B' | 'B2C' | 'BOTH'
    subCategory?: string
    unit: 'kg' | 'box'
    boxWeight?: number | null
    taxFree: boolean
    costPrice: number
    wholesalePrice: number
    wholesaleProfit?: number
    wholesaleMargin?: number
    isActive: boolean
    memo?: string
    // 공급사 연결 (1상품 : 1공급사)
    supplierOrgId?: string       // users 컬렉션의 SUPPLIER role doc ID
    supplierName?: string        // 디노멀라이즈 (UI 빠른 조회용)
    // 진열용 미디어 (Phase 1)
    mediaImages?: ProductMediaImage[]  // 최대 5장, isPrimary=true 한 개
    videoUrl?: string                  // YouTube URL (정규화된 형태)
    displayOnPublic?: boolean          // 공개 카탈로그(/products)에 노출 여부 (기본 false)
    // [DEPRECATED] 단일 이미지 모델 — 자동으로 mediaImages[0]으로 마이그레이션됨
    imageUrl?: string
    createdAt: Timestamp
    updatedAt: Timestamp
}

/**
 * 레거시 imageUrl을 mediaImages[0]으로 변환 (마이그레이션 없이 런타임 호환).
 * 카드/테이블에서 항상 이 함수를 통해 대표 이미지를 가져오면 안전.
 */
export function getPrimaryImageUrl(p: Pick<FirestoreProduct, 'mediaImages' | 'imageUrl'>): string | undefined {
    if (p.mediaImages && p.mediaImages.length > 0) {
        const primary = p.mediaImages.find(m => m.isPrimary) || p.mediaImages[0]
        return primary.thumbnailUrl || primary.url
    }
    return p.imageUrl
}

export function getPrimaryImageFullUrl(p: FirestoreProduct): string | undefined {
    if (p.mediaImages && p.mediaImages.length > 0) {
        const primary = p.mediaImages.find(m => m.isPrimary) || p.mediaImages[0]
        return primary.url
    }
    return p.imageUrl
}

export function getAllImageUrls(p: FirestoreProduct): string[] {
    if (p.mediaImages && p.mediaImages.length > 0) {
        return p.mediaImages.map(m => m.url)
    }
    return p.imageUrl ? [p.imageUrl] : []
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

// 공급사별 상품 조회 (supplierOrgId가 비어있으면 미지정 상품을 반환)
export async function getProductsBySupplier(supplierOrgId: string | null): Promise<FirestoreProduct[]> {
    if (supplierOrgId === null || supplierOrgId === '') {
        // 미지정 상품: supplierOrgId 필드가 없거나 빈 문자열인 경우
        const all = await getAllProducts()
        return all.filter(p => !p.supplierOrgId)
    }
    const q = query(productsRef, where('supplierOrgId', '==', supplierOrgId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreProduct))
}

export async function createProduct(data: Omit<FirestoreProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreProduct> {
    const newDocRef = doc(productsRef)
    const now = serverTimestamp()
    // undefined 필드 제거 (Firestore는 undefined 불허) — 타임스탬프는 cleanData 밖에서 추가
    await setDoc(newDocRef, { ...cleanData(data), createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreProduct
}

export async function createProductWithId(id: string, data: Omit<FirestoreProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreProduct> {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    const now = serverTimestamp()
    await setDoc(docRef, { ...cleanData(data), createdAt: now, updatedAt: now })
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreProduct
}

export async function updateProduct(id: string, data: Partial<FirestoreProduct>): Promise<void> {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    const { id: _id, ...updateData } = data as any
    await setDoc(docRef, { ...cleanData(updateData), updatedAt: serverTimestamp() }, { merge: true })
}

export async function deleteProduct(id: string): Promise<void> {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    await deleteDoc(docRef)
}

export async function seedInitialProducts(): Promise<void> {
    const existing = await getAllProducts()
    if (existing.length > 0) return

    const initialProducts = [
        { id: 'p01', name: '삼겹살', category1: '냉장' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 17500, isActive: true },
        { id: 'p02', name: '미삼겹살', category1: '냉장' as const, category2: 'B2B' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 17000, isActive: true },
        { id: 'p03', name: '삼겹살(대패)', category1: '냉장' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 18500, isActive: true },
        { id: 'p04', name: '삼겹살(칼집)', category1: '냉장' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 19500, isActive: true },
        { id: 'p05', name: '삼겹살/오겹살(찌개용, 불고기용)', category1: '냉장' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 14000, isActive: true },
        { id: 'p06', name: '목살', category1: '냉장' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 16000, isActive: true },
        { id: 'p07', name: '목살(대패)', category1: '냉장' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 16500, isActive: true },
        { id: 'p08', name: '항정살', category1: '냉장' as const, category2: 'B2B' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 38000, isActive: true },
        { id: 'p09', name: '가브리살', category1: '냉장' as const, category2: 'B2B' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 25000, isActive: true },
        { id: 'p10', name: '갈매기살', category1: '냉장' as const, category2: 'B2B' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 22000, isActive: true },
        // 냉동
        { id: 'p30', name: '등심(짜장,카레,돈까스,잡채,탕수육) - 냉동', category1: '냉동' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 8000, isActive: true },
        { id: 'p31', name: '뒷다리(다짐육)', category1: '냉동' as const, category2: 'BOTH' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 5700, isActive: true },
        // 부산물
        { id: 'p37', name: '앞장족', category1: '부산물' as const, category2: 'B2B' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 6000, isActive: true },
        { id: 'p38', name: '뒷장족', category1: '부산물' as const, category2: 'B2B' as const, unit: 'kg' as const, taxFree: true, costPrice: 0, wholesalePrice: 5500, isActive: true },
    ]

    for (const p of initialProducts) {
        const { id, ...data } = p
        await createProductWithId(id, data)
    }
    console.log('Initial products seeded')
}
