import {
    collection, doc, getDocs, query, where, orderBy, limit,
    serverTimestamp, Timestamp, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { fetchEkapeDailyPrices } from './external/ekapeService'

const COLLECTION = 'marketPrices'
const ref = collection(db, COLLECTION)

export type ProductType = 'BEEF' | 'PORK' | 'CHICKEN' | 'OTHER'

export interface FirestoreMarketPrice {
    id: string
    source: 'EKAPE' | 'KAMIS' | 'MAFRA'
    productType: ProductType
    productCategory?: string
    grade?: string
    region?: string
    unitPrice: number
    highPrice?: number
    lowPrice?: number
    tradedHeads?: number
    tradedKg?: number
    priceDate: Timestamp
    rawData?: any
    fetchedAt: Timestamp
}

/**
 * EKAPE에서 일별 데이터 수집 후 Firestore 저장
 * @param dateStr YYYYMMDD
 */
export async function ingestEkapeDailyPrices(dateStr: string): Promise<number> {
    const items = await fetchEkapeDailyPrices(dateStr, '1')
    const items2 = await fetchEkapeDailyPrices(dateStr, '2')
    const allItems = [...items, ...items2]

    if (allItems.length === 0) return 0

    // YYYYMMDD -> Date
    const yyyy = parseInt(dateStr.slice(0, 4))
    const mm = parseInt(dateStr.slice(4, 6)) - 1
    const dd = parseInt(dateStr.slice(6, 8))
    const priceDate = Timestamp.fromDate(new Date(yyyy, mm, dd))

    let batch = writeBatch(db)
    let count = 0
    for (const item of allItems) {
        const docRef = doc(ref)
        batch.set(docRef, {
            source: 'EKAPE',
            productType: item.cattleClsCd === '1' ? 'BEEF' : 'PORK',
            grade: item.gradeCd || '',
            region: item.marketName || '',
            unitPrice: item.avgPrice || 0,
            highPrice: item.maxPrice || 0,
            lowPrice: item.minPrice || 0,
            tradedHeads: item.judgeHead || 0,
            priceDate,
            rawData: item,
            fetchedAt: serverTimestamp(),
        })
        count++
        if (count % 400 === 0) {
            await batch.commit()
            batch = writeBatch(db)
        }
    }
    await batch.commit()
    return count
}

/**
 * 특정 상품 타입의 최근 N일 가격 추이
 */
export async function getPriceTrend(
    productType: ProductType,
    days: number = 30
): Promise<FirestoreMarketPrice[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const q = query(
        ref,
        where('productType', '==', productType),
        where('priceDate', '>=', Timestamp.fromDate(since)),
        orderBy('priceDate', 'asc'),
        limit(1000)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMarketPrice))
}

/**
 * 일별 평균가 시리즈 (차트용)
 */
export async function getDailyAvgPriceSeries(
    productType: ProductType,
    days: number = 30
): Promise<{ date: string; avgPrice: number; count: number }[]> {
    const data = await getPriceTrend(productType, days)
    const byDate = new Map<string, { sum: number; count: number }>()

    for (const p of data) {
        const dateKey = p.priceDate.toDate().toISOString().slice(0, 10)
        if (!byDate.has(dateKey)) byDate.set(dateKey, { sum: 0, count: 0 })
        const agg = byDate.get(dateKey)!
        agg.sum += p.unitPrice
        agg.count++
    }

    return Array.from(byDate.entries())
        .map(([date, { sum, count }]) => ({
            date,
            avgPrice: count > 0 ? sum / count : 0,
            count
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
}
