import { getAllSalesOrders, getAllSalesOrderItems, getAllShipments, type FirestoreSalesOrder } from './orderService'
import { getAllProducts } from './productService'
import { getAllSettlements } from './settlementService'

// ============ CUSTOMER PROFITABILITY SERVICE (Phase 2.2) ============
//
// 공헌이익(CM) = 매출 - 매입원가 - 운송비 - 회수기간 비용
//   · 매출       : salesOrders.finalAmount ?? totalsAmount
//   · 매입원가   : Σ salesOrderItems(costPrice × qtyKg)  ← products.costPrice 조인
//   · 운송비     : shipments에 비용 필드가 없어 현재 0 (데이터 확보 시 반영)
//   · 회수기간비 : Σ settlements(금액 × paymentTermDays/365 × 기회비용율)
//
// 모든 계산은 클라이언트 사이드 (거래처 수십 × 수백 주문 규모면 충분).

export interface CustomerProfitability {
    customerOrgId: string
    customerName: string
    revenue: number              // 매출
    cost: number                 // 매입원가 (COGS)
    grossProfit: number          // 매출총이익 = 매출 - 원가
    transportCost: number        // 운송비 (현재 데이터 없음 → 0)
    carryingCost: number         // 회수기간 기회비용
    contributionMargin: number   // 공헌이익
    cmPercent: number            // 공헌이익률 (0~1)
    outstanding: number          // 미수 잔액
    avgPaymentDays: number       // 평균 결제기한(일)
    orderCount: number           // 매출 주문 건수
    monthly: { month: string; revenue: number }[]  // 월별 매출 추이 (YYYY-MM)
}

export interface ProfitabilityResult {
    rows: CustomerProfitability[]
    totals: {
        revenue: number
        cost: number
        contributionMargin: number
        cmPercent: number
        outstanding: number
        customerCount: number
    }
    /** 데이터 한계 등 사용자에게 알릴 메모 */
    notes: string[]
}

function orderRevenue(o: FirestoreSalesOrder): number {
    return o.finalAmount ?? o.totalsAmount ?? 0
}

function monthKey(ts: any): string | null {
    try {
        const d = ts?.toDate ? ts.toDate() : null
        if (!d) return null
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } catch {
        return null
    }
}

/**
 * 거래처별 수익성 계산.
 * @param opportunityRate 회수기간 연 기회비용율 (예: 0.08 = 연 8%)
 */
export async function computeCustomerProfitability(opportunityRate = 0.08): Promise<ProfitabilityResult> {
    const [orders, items, products, settlements, shipments] = await Promise.all([
        getAllSalesOrders(),
        getAllSalesOrderItems(),
        getAllProducts(),
        getAllSettlements(),
        getAllShipments(),
    ])

    const costPriceById = new Map<string, number>()
    products.forEach(p => costPriceById.set(p.id, p.costPrice ?? 0))

    // salesOrderId → 주문 (고객 매핑 + 월 키)
    const orderById = new Map<string, FirestoreSalesOrder>()
    orders.forEach(o => orderById.set(o.id, o))

    // 거래처별 누적기 초기화
    type Acc = Omit<CustomerProfitability, 'grossProfit' | 'contributionMargin' | 'cmPercent' | 'avgPaymentDays' | 'monthly'> & {
        _termDaysSum: number
        _termCount: number
        _monthly: Map<string, number>
    }
    const acc = new Map<string, Acc>()

    const ensure = (orgId: string, name: string): Acc => {
        let a = acc.get(orgId)
        if (!a) {
            a = {
                customerOrgId: orgId, customerName: name,
                revenue: 0, cost: 0, transportCost: 0, carryingCost: 0,
                outstanding: 0, orderCount: 0,
                _termDaysSum: 0, _termCount: 0, _monthly: new Map(),
            }
            acc.set(orgId, a)
        }
        return a
    }

    // 매출 + 월별 추이 + 건수
    orders.forEach(o => {
        if (!o.customerOrgId) return
        const a = ensure(o.customerOrgId, o.customerName || '(이름없음)')
        const rev = orderRevenue(o)
        a.revenue += rev
        a.orderCount += 1
        const mk = monthKey(o.confirmedAt) || monthKey(o.createdAt)
        if (mk) a._monthly.set(mk, (a._monthly.get(mk) || 0) + rev)
    })

    // 매입원가 (품목 × 상품 단가)
    items.forEach(it => {
        const o = orderById.get(it.salesOrderId)
        if (!o || !o.customerOrgId) return
        const a = ensure(o.customerOrgId, o.customerName || '(이름없음)')
        const cp = costPriceById.get(it.productId) ?? 0
        const kg = it.qtyKg ?? 0
        a.cost += cp * kg
    })

    // 운송비 (shipment.shippingCost → sourceSalesOrderId → 고객)
    let hasAnyShippingCost = false
    shipments.forEach(sh => {
        const cost = sh.shippingCost ?? 0
        if (cost <= 0) return
        const o = orderById.get(sh.sourceSalesOrderId)
        if (!o || !o.customerOrgId) return
        const a = ensure(o.customerOrgId, o.customerName || '(이름없음)')
        a.transportCost += cost
        hasAnyShippingCost = true
    })

    // 회수기간 비용 + 미수 + 평균 결제기한
    settlements.forEach(s => {
        if (!s.customerOrgId) return
        const a = ensure(s.customerOrgId, s.customerName || '(이름없음)')
        const amount = s.finalAmount ?? s.estimatedAmount ?? 0
        const term = s.paymentTermDays ?? 30
        a.carryingCost += amount * (term / 365) * opportunityRate
        a._termDaysSum += term
        a._termCount += 1
        if (s.status !== 'PAID') {
            a.outstanding += s.remainingAmount ?? 0
        }
    })

    const rows: CustomerProfitability[] = Array.from(acc.values()).map(a => {
        const grossProfit = a.revenue - a.cost
        const contributionMargin = grossProfit - a.transportCost - a.carryingCost
        const cmPercent = a.revenue > 0 ? contributionMargin / a.revenue : 0
        const monthly = Array.from(a._monthly.entries())
            .sort(([m1], [m2]) => m1.localeCompare(m2))
            .map(([month, revenue]) => ({ month, revenue }))
        return {
            customerOrgId: a.customerOrgId,
            customerName: a.customerName,
            revenue: a.revenue,
            cost: a.cost,
            grossProfit,
            transportCost: a.transportCost,
            carryingCost: a.carryingCost,
            contributionMargin,
            cmPercent,
            outstanding: a.outstanding,
            avgPaymentDays: a._termCount > 0 ? Math.round(a._termDaysSum / a._termCount) : 0,
            orderCount: a.orderCount,
            monthly,
        }
    }).sort((x, y) => y.contributionMargin - x.contributionMargin)

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
    const totalCost = rows.reduce((s, r) => s + r.cost, 0)
    const totalCM = rows.reduce((s, r) => s + r.contributionMargin, 0)
    const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)

    const notes = [
        hasAnyShippingCost
            ? '운송비는 배송 목록에서 입력한 shipments.shippingCost 실비 합산입니다. (미입력 배송은 0)'
            : '운송비가 아직 입력되지 않았습니다. 배송 목록(배송 관리)에서 건별 운송비를 입력하면 공헌이익에 반영됩니다.',
        '매입원가는 상품의 현재 costPrice 기준입니다. (주문 시점 원가 스냅샷이 아닌 현재가)',
    ]

    return {
        rows,
        totals: {
            revenue: totalRevenue,
            cost: totalCost,
            contributionMargin: totalCM,
            cmPercent: totalRevenue > 0 ? totalCM / totalRevenue : 0,
            outstanding: totalOutstanding,
            customerCount: rows.length,
        },
        notes,
    }
}
