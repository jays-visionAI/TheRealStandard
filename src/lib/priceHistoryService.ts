// Price History Service - 상품 가격 변동 기록 관리
import { db } from './firebase'
import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    limit
} from 'firebase/firestore'

// 가격 히스토리 인터페이스
export interface PriceHistoryEntry {
    id?: string
    productId: string
    productName: string
    costPrice: number
    wholesalePrice: number
    changedAt: Timestamp
    changedBy?: string
    note?: string
}

// Firestore 컬렉션 참조
const priceHistoryCollection = collection(db, 'priceHistory')

/**
 * 가격 변동 기록 추가
 */
export async function addPriceHistory(entry: Omit<PriceHistoryEntry, 'id' | 'changedAt'>): Promise<string> {
    // undefined 필드 제거 (Firestore 에러 방지)
    const data: any = {
        productId: entry.productId,
        productName: entry.productName,
        costPrice: entry.costPrice,
        wholesalePrice: entry.wholesalePrice,
        changedAt: Timestamp.now()
    }

    if (entry.changedBy) data.changedBy = entry.changedBy
    if (entry.note) data.note = entry.note

    const docRef = await addDoc(priceHistoryCollection, data)
    return docRef.id
}

/**
 * 특정 상품의 가격 히스토리 조회
 */
export async function getPriceHistoryByProduct(
    productId: string,
    startDate?: Date,
    endDate?: Date
): Promise<PriceHistoryEntry[]> {
    let results: PriceHistoryEntry[] = []

    try {
        // 복합 인덱스가 있는 경우 (productId + changedAt ASC)
        const q = query(
            priceHistoryCollection,
            where('productId', '==', productId),
            orderBy('changedAt', 'asc')
        )
        const snapshot = await getDocs(q)
        results = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        } as PriceHistoryEntry))
    } catch (err) {
        // 복합 인덱스가 없는 경우 fallback: where만 사용 후 클라이언트 정렬
        console.warn('Composite index not available, falling back to client-side sort:', err)
        const fallbackQ = query(
            priceHistoryCollection,
            where('productId', '==', productId)
        )
        const snapshot = await getDocs(fallbackQ)
        results = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        } as PriceHistoryEntry))
        results.sort((a, b) => a.changedAt.toMillis() - b.changedAt.toMillis())
    }

    // 클라이언트 사이드 날짜 필터링
    if (startDate) {
        const startTs = Timestamp.fromDate(startDate)
        results = results.filter(r => r.changedAt.toMillis() >= startTs.toMillis())
    }
    if (endDate) {
        const endTs = Timestamp.fromDate(endDate)
        results = results.filter(r => r.changedAt.toMillis() <= endTs.toMillis())
    }

    return results
}

/**
 * 특정 상품의 최신 가격 기록 조회
 */
export async function getLatestPriceHistory(productId: string): Promise<PriceHistoryEntry | null> {
    try {
        const q = query(
            priceHistoryCollection,
            where('productId', '==', productId),
            orderBy('changedAt', 'desc'),
            limit(1)
        )

        const snapshot = await getDocs(q)
        if (snapshot.empty) return null

        const d = snapshot.docs[0]
        return {
            id: d.id,
            ...d.data()
        } as PriceHistoryEntry
    } catch (err) {
        // 복합 인덱스가 없는 경우 fallback
        console.warn('Composite index not available for latest price, falling back:', err)
        const fallbackQ = query(
            priceHistoryCollection,
            where('productId', '==', productId)
        )
        const snapshot = await getDocs(fallbackQ)
        if (snapshot.empty) return null

        const results = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        } as PriceHistoryEntry))
        results.sort((a, b) => b.changedAt.toMillis() - a.changedAt.toMillis())
        return results[0]
    }
}

/**
 * 연간 가격 히스토리 조회 (특정 연도)
 */
export async function getYearlyPriceHistory(
    productId: string,
    year: number
): Promise<PriceHistoryEntry[]> {
    const startDate = new Date(year, 0, 1) // 1월 1일
    const endDate = new Date(year, 11, 31, 23, 59, 59) // 12월 31일

    return getPriceHistoryByProduct(productId, startDate, endDate)
}

/**
 * 가격 변동 여부 확인 및 기록
 * 이전 가격과 다를 경우에만 기록
 */
export async function checkAndRecordPriceChange(
    productId: string,
    productName: string,
    newCostPrice: number,
    newWholesalePrice: number,
    changedBy?: string
): Promise<boolean> {
    const latest = await getLatestPriceHistory(productId)

    // 가격이 변동된 경우에만 기록
    if (!latest ||
        latest.costPrice !== newCostPrice ||
        latest.wholesalePrice !== newWholesalePrice) {
        await addPriceHistory({
            productId,
            productName,
            costPrice: newCostPrice,
            wholesalePrice: newWholesalePrice,
            changedBy
        })
        return true
    }

    return false
}
