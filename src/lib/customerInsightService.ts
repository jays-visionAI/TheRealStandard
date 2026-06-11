import {
    getSalesOrdersByCustomer, getAllSalesOrders, getAllSalesOrderItems,
    type FirestoreSalesOrder, type FirestoreSalesOrderItem,
} from './orderService'
import { getSettlementsByCustomer } from './settlementService'

// ============ CUSTOMER INSIGHT SERVICE (고객 맞춤 인사이트 — v1 룰 기반) ============
// docs/customer_insights_spec.md 참고.
// 본인 주문 0건 → COHORT(플랫폼 평균/인기), ≥1건 → PERSONAL(본인 이력 + 교차추천).
// ML/예측이 아니라 룰 기반이며, 모든 카드에 데이터 출처(personal/cohort)를 표기한다.

export type InsightKind = 'reorder' | 'spend' | 'top' | 'cross' | 'settlement' | 'popular' | 'pattern' | 'start'
export type InsightTone = 'info' | 'action' | 'warning'
export type InsightBasis = 'personal' | 'cohort'

export interface CustomerInsight {
    id: string
    kind: InsightKind
    title: string
    body: string
    metric?: string                          // 강조 수치 (예: "+12%", "D-3")
    cta?: { label: string; path: string }
    tone: InsightTone
    basis: InsightBasis
}

export interface CustomerInsightResult {
    mode: 'PERSONAL' | 'COHORT'
    sampleNote?: string                      // 표본 가드 캡션
    insights: CustomerInsight[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function toDate(ts: any): Date | null {
    try { return ts?.toDate ? ts.toDate() : null } catch { return null }
}

function orderDate(o: FirestoreSalesOrder): Date | null {
    return toDate(o.confirmedAt) || toDate(o.createdAt)
}

function orderRevenue(o: FirestoreSalesOrder): number {
    return o.finalAmount ?? o.totalsAmount ?? 0
}

function won(n: number): string {
    return Math.round(n).toLocaleString('ko-KR')
}

/** 품목별 합계 (중량 기준 정렬) */
function aggregateItems(items: FirestoreSalesOrderItem[]): { productId: string; productName: string; kg: number; amount: number }[] {
    const map = new Map<string, { productId: string; productName: string; kg: number; amount: number }>()
    items.forEach(it => {
        const key = it.productId || it.productName
        if (!key) return
        const e = map.get(key) || { productId: it.productId, productName: it.productName, kg: 0, amount: 0 }
        e.kg += it.qtyKg || 0
        e.amount += it.amount || 0
        map.set(key, e)
    })
    return [...map.values()].sort((a, b) => b.kg - a.kg)
}

export async function computeCustomerInsights(customerOrgId: string): Promise<CustomerInsightResult> {
    const [ownOrders, allOrders, allItems] = await Promise.all([
        getSalesOrdersByCustomer(customerOrgId),
        getAllSalesOrders(),
        getAllSalesOrderItems(),
    ])

    const now = new Date()
    const insights: CustomerInsight[] = []
    const sampleNote = allOrders.length < 5 ? '플랫폼 초기 데이터 기준 — 참고용입니다. 주문이 쌓일수록 정확해집니다.' : undefined

    // ---------- 코호트 공통 집계 ----------
    const cohortTop = aggregateItems(allItems)

    // ================= COHORT 모드 (본인 주문 0건) =================
    if (ownOrders.length === 0) {
        if (cohortTop.length > 0) {
            const top3 = cohortTop.slice(0, 3).map(t => t.productName).join(' · ')
            insights.push({
                id: 'popular', kind: 'popular', basis: 'cohort', tone: 'info',
                title: '거래처들이 가장 많이 찾는 품목',
                body: `${top3} 순으로 출고량이 많아요.`,
                cta: { label: '카탈로그에서 보기', path: '/order/catalog' },
            })
        }

        const recent = allOrders.filter(o => { const d = orderDate(o); return d && (now.getTime() - d.getTime()) <= 30 * DAY_MS })
        if (recent.length > 0) {
            const orgs = new Set(recent.map(o => o.customerOrgId).filter(Boolean)).size
            const avg = recent.reduce((s, o) => s + orderRevenue(o), 0) / recent.length
            insights.push({
                id: 'pattern', kind: 'pattern', basis: 'cohort', tone: 'info',
                title: '요즘 거래 분위기',
                body: `최근 30일 동안 ${orgs}곳의 거래처가 ${recent.length}건 발주했어요.`,
                metric: avg > 0 ? `건당 평균 ₩${won(avg)}` : undefined,
            })
        }

        insights.push({
            id: 'start', kind: 'start', basis: 'cohort', tone: 'action',
            title: '첫 주문을 시작해보세요',
            body: '첫 주문이 등록되면 이 영역이 사장님 데이터 기반 맞춤 분석으로 바뀝니다.',
            cta: { label: '상품 카탈로그 열기', path: '/order/catalog' },
        })

        return { mode: 'COHORT', sampleNote, insights }
    }

    // ================= PERSONAL 모드 (본인 주문 ≥1건) =================
    const ownIds = new Set(ownOrders.map(o => o.id))
    const ownItems = allItems.filter(it => ownIds.has(it.salesOrderId))
    const dateByOrderId = new Map(ownOrders.map(o => [o.id, orderDate(o)]))

    // 1) 재주문 알림 — 품목별 주문일 간격 평균 대비 경과
    {
        const datesByProduct = new Map<string, { name: string; dates: number[] }>()
        ownItems.forEach(it => {
            const d = dateByOrderId.get(it.salesOrderId)
            if (!d) return
            const key = it.productId || it.productName
            const e = datesByProduct.get(key) || { name: it.productName, dates: [] }
            e.dates.push(d.getTime())
            datesByProduct.set(key, e)
        })
        let best: { name: string; avg: number; since: number; ratio: number } | null = null
        datesByProduct.forEach(({ name, dates }) => {
            const uniq = [...new Set(dates)].sort((a, b) => a - b)
            if (uniq.length < 2) return
            const intervals = uniq.slice(1).map((t, i) => (t - uniq[i]) / DAY_MS)
            const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length
            const since = (now.getTime() - uniq[uniq.length - 1]) / DAY_MS
            if (avg > 0 && since >= avg * 0.9) {
                const ratio = since / avg
                if (!best || ratio > best.ratio) best = { name, avg, since, ratio }
            }
        })
        if (best) {
            const b = best as { name: string; avg: number; since: number; ratio: number }
            insights.push({
                id: 'reorder', kind: 'reorder', basis: 'personal', tone: 'action',
                title: `${b.name} 재주문 시기예요`,
                body: `평소 약 ${Math.round(b.avg)}일마다 주문하셨는데, 마지막 주문 후 ${Math.round(b.since)}일이 지났어요.`,
                cta: { label: '발주서 작성', path: '/order/list' },
            })
        }
    }

    // 2) 지출 트렌드 — 이번 달 vs 지난 달
    {
        const ym = (d: Date) => d.getFullYear() * 12 + d.getMonth()
        const cur = ym(now)
        let thisM = 0, lastM = 0
        ownOrders.forEach(o => {
            const d = orderDate(o)
            if (!d) return
            const m = ym(d)
            if (m === cur) thisM += orderRevenue(o)
            else if (m === cur - 1) lastM += orderRevenue(o)
        })
        if (lastM > 0) {
            const pct = ((thisM - lastM) / lastM) * 100
            insights.push({
                id: 'spend', kind: 'spend', basis: 'personal', tone: 'info',
                title: '이번 달 주문 규모',
                body: `지난달 ₩${won(lastM)} → 이번 달 ₩${won(thisM)}.`,
                metric: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`,
            })
        }
    }

    // 3) 단골 품목 Top 3
    {
        const top = aggregateItems(ownItems).slice(0, 3)
        if (top.length > 0) {
            insights.push({
                id: 'top', kind: 'top', basis: 'personal', tone: 'info',
                title: '사장님의 단골 품목',
                body: top.map((t, i) => `${i + 1}. ${t.productName} (${Math.round(t.kg).toLocaleString()}kg)`).join('  '),
            })
        }
    }

    // 4) 교차 추천 — 플랫폼 인기 품목 중 미구매
    {
        const ownKeys = new Set(ownItems.map(it => it.productId || it.productName))
        const notTried = cohortTop.filter(t => !ownKeys.has(t.productId) && !ownKeys.has(t.productName)).slice(0, 2)
        if (notTried.length > 0) {
            insights.push({
                id: 'cross', kind: 'cross', basis: 'cohort', tone: 'info',
                title: '다른 거래처가 많이 찾는 품목',
                body: `${notTried.map(t => t.productName).join(' · ')} — 아직 주문해보지 않으셨네요.`,
                cta: { label: '카탈로그에서 보기', path: '/order/catalog' },
            })
        }
    }

    // 5) 정산 임박/연체
    try {
        const settlements = await getSettlementsByCustomer(customerOrgId)
        const open = settlements
            .filter(s => (s.remainingAmount ?? 0) > 0 && toDate(s.paymentDueAt))
            .sort((a, b) => (toDate(a.paymentDueAt)!.getTime()) - (toDate(b.paymentDueAt)!.getTime()))
        if (open.length > 0) {
            const due = toDate(open[0].paymentDueAt)!
            const dday = Math.ceil((due.getTime() - now.getTime()) / DAY_MS)
            const totalOpen = open.reduce((s, x) => s + (x.remainingAmount ?? 0), 0)
            insights.push({
                id: 'settlement', kind: 'settlement', basis: 'personal',
                tone: dday < 0 ? 'warning' : 'action',
                title: dday < 0 ? '결제 기한이 지났어요' : '다가오는 결제 기한',
                body: `미정산 잔액 ₩${won(totalOpen)} (${open.length}건).`,
                metric: dday < 0 ? `${Math.abs(dday)}일 경과` : `D-${dday}`,
                cta: { label: '정산 내역 보기', path: '/order/settlement' },
            })
        }
    } catch { /* 정산 조회 실패 시 카드 생략 */ }

    // 개인화 카드가 하나도 없으면(이력 빈약) 코호트 인기 품목으로 채움
    if (insights.length === 0 && cohortTop.length > 0) {
        insights.push({
            id: 'popular', kind: 'popular', basis: 'cohort', tone: 'info',
            title: '거래처들이 가장 많이 찾는 품목',
            body: `${cohortTop.slice(0, 3).map(t => t.productName).join(' · ')} 순으로 출고량이 많아요.`,
            cta: { label: '카탈로그에서 보기', path: '/order/catalog' },
        })
    }

    return { mode: 'PERSONAL', sampleNote, insights }
}
