import { getDailyAvgPriceSeries, type ProductType } from './marketDataService'

// ============ MARKET INSIGHT — 시세 연계 (v2) ============
// 고객 대시보드가 키 없이 동작하도록, EKAPE 원본이 아니라 marketPrices(관리자가 수집)에서 읽는다.
// 데이터가 없으면 조용히 null/빈값 → 인사이트 카드 생략(정직성).

const BEEF_KEYWORDS = ['한우', '소고기', '우삼겹', '우둔', '우족', '차돌', '양지', '사태', '채끝', '살치', '부채', '토시', '제비추리', '안창', '업진', '우대']

/** 상품명으로 육종 추정 (명시 필드 없음 → 휴리스틱, 기본 PORK). 부산물/기타는 OTHER 가능 */
export function guessSpecies(productName: string): ProductType {
    const n = (productName || '')
    if (BEEF_KEYWORDS.some(k => n.includes(k))) return 'BEEF'
    if (n.includes('닭') || n.includes('계육')) return 'CHICKEN'
    return 'PORK' // 본 사업은 돼지 중심 — 기본값
}

export const SPECIES_LABEL: Record<ProductType, string> = {
    BEEF: '소(한우/육우)', PORK: '돼지', CHICKEN: '닭', OTHER: '기타',
}

export interface MarketTrend {
    productType: ProductType
    hasData: boolean
    latestAvg: number        // 최근 영업일 평균 도매가
    weekAgoAvg: number       // ~7일 전 평균
    changePct: number        // 주간 변동률(%)
    latestDate: string       // YYYY-MM-DD
    points: { date: string; avgPrice: number }[]
}

/**
 * 육종별 주간 시세 추이 (marketPrices에서 집계). 데이터 부족 시 hasData=false.
 */
export async function getSpeciesPriceTrend(productType: ProductType): Promise<MarketTrend> {
    const empty: MarketTrend = { productType, hasData: false, latestAvg: 0, weekAgoAvg: 0, changePct: 0, latestDate: '', points: [] }
    try {
        const series = (await getDailyAvgPriceSeries(productType, 21)).filter(p => p.avgPrice > 0)
        if (series.length < 2) return { ...empty, points: series.map(p => ({ date: p.date, avgPrice: p.avgPrice })) }

        const latest = series[series.length - 1]
        // 최신일에서 ~7일 전에 가장 가까운 지점
        const latestMs = new Date(latest.date).getTime()
        let weekAgo = series[0]
        let bestDiff = Infinity
        for (const p of series) {
            const gapDays = Math.abs((latestMs - new Date(p.date).getTime()) / 86400000 - 7)
            if (gapDays < bestDiff) { bestDiff = gapDays; weekAgo = p }
        }
        const changePct = weekAgo.avgPrice > 0 ? ((latest.avgPrice - weekAgo.avgPrice) / weekAgo.avgPrice) * 100 : 0
        return {
            productType, hasData: true,
            latestAvg: latest.avgPrice, weekAgoAvg: weekAgo.avgPrice, changePct,
            latestDate: latest.date,
            points: series.map(p => ({ date: p.date, avgPrice: p.avgPrice })),
        }
    } catch (err) {
        console.warn('getSpeciesPriceTrend failed:', err)
        return empty
    }
}

/** 고객 단골 품목들의 지배적 육종 (kg 가중) */
export function dominantSpecies(items: { productName: string; kg: number }[]): ProductType | null {
    if (items.length === 0) return null
    const score = new Map<ProductType, number>()
    for (const it of items) {
        const sp = guessSpecies(it.productName)
        score.set(sp, (score.get(sp) || 0) + (it.kg || 1))
    }
    let best: ProductType | null = null, max = -1
    score.forEach((v, k) => { if (k !== 'OTHER' && v > max) { max = v; best = k } })
    return best
}
