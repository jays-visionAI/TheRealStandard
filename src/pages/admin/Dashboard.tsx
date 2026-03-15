import { useState, useMemo, useEffect } from 'react'
import { TrendingUpIcon, PackageIcon, TruckIcon, ClockIcon } from '../../components/Icons'
import {
    getAllOrderSheets,
    getAllSalesOrders,
    getAllShipments,
    type FirestoreOrderSheet,
    type FirestoreSalesOrder,
    type FirestoreShipment
} from '../../lib/orderService'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import './Dashboard.css'

// Helper for currency and numbers
const formatKRW = (v: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(v)
const formatNum = (v: number) => new Intl.NumberFormat('ko-KR').format(v)
const formatPercent = (v: number) => `${v.toFixed(1)}%`

// 타입 정의
type OrderSheet = Omit<FirestoreOrderSheet, 'createdAt' | 'updatedAt' | 'shipDate'> & {
    createdAt?: Date
    updatedAt?: Date
    shipDate?: Date
}

type SalesOrder = Omit<FirestoreSalesOrder, 'createdAt' | 'confirmedAt'> & {
    createdAt?: Date
    confirmedAt?: Date
}

type Shipment = Omit<FirestoreShipment, 'createdAt' | 'updatedAt' | 'etaAt'> & {
    createdAt?: Date
    updatedAt?: Date
    etaAt?: Date
}

type SalesOrderItem = {
    id: string
    salesOrderId: string
    productId: string
    productName: string
    qtyKg: number
    unitPrice: number
    amount: number
}

export default function Dashboard() {
    // Firebase에서 직접 로드되는 데이터
    const [orderSheets, setOrderSheets] = useState<OrderSheet[]>([])
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
    const [shipments, setShipments] = useState<Shipment[]>([])
    const [salesOrderItems, setSalesOrderItems] = useState<SalesOrderItem[]>([])
    const [loading, setLoading] = useState(true)

    const [timeframe, setTimeframe] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY')
    const [customerFilter, setCustomerFilter] = useState<string>('ALL')
    const [aggregationMode, setAggregationMode] = useState<'CONFIRMED' | 'ALL_SALES'>('CONFIRMED')

    // Firebase에서 모든 데이터 로드
    const loadData = async () => {
        try {
            setLoading(true)

            const [osData, soData, shipData, itemsSnap] = await Promise.all([
                getAllOrderSheets(),
                getAllSalesOrders(),
                getAllShipments(),
                getDocs(collection(db, 'salesOrderItems'))
            ])

            setOrderSheets(osData.map(os => ({
                ...os,
                createdAt: os.createdAt?.toDate?.() || new Date(),
                updatedAt: os.updatedAt?.toDate?.() || new Date(),
                shipDate: os.shipDate?.toDate?.() || undefined,
            })))

            setSalesOrders(soData.map(so => ({
                ...so,
                createdAt: so.createdAt?.toDate?.() || new Date(),
                confirmedAt: so.confirmedAt?.toDate?.() || new Date(),
            })))

            setShipments(shipData.map(s => ({
                ...s,
                createdAt: s.createdAt?.toDate?.() || new Date(),
                updatedAt: s.updatedAt?.toDate?.() || new Date(),
                etaAt: s.etaAt?.toDate?.() || undefined,
            })))

            setSalesOrderItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SalesOrderItem)))
        } catch (err) {
            console.error('Failed to load dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadData()
    }, [])

    // orderSheets 중 salesOrder로 전환되지 않은 것들 (매출발주 상태)
    const pendingOrderSheets = useMemo(() => {
        const soSourceIds = new Set(salesOrders.map(so => so.sourceOrderSheetId).filter(Boolean))
        return orderSheets.filter(os =>
            !soSourceIds.has(os.id) &&
            (os.status === 'SUBMITTED' || os.status === 'CONFIRMED' || os.status === 'SENT')
        )
    }, [orderSheets, salesOrders])

    // 총 매출 (모드에 따라)
    const totalSales = useMemo(() => {
        const confirmed = salesOrders.reduce((sum, so) => sum + so.totalsAmount, 0)
        if (aggregationMode === 'ALL_SALES') {
            const pending = pendingOrderSheets.reduce((sum, os) => sum + (os.totalAmount || 0), 0)
            return confirmed + pending
        }
        return confirmed
    }, [salesOrders, pendingOrderSheets, aggregationMode])

    // 활성 거래처
    const activeCustomers = useMemo(() => {
        const ids = new Set(salesOrders.map(so => so.customerOrgId))
        if (aggregationMode === 'ALL_SALES') {
            pendingOrderSheets.forEach(os => ids.add(os.customerOrgId))
        }
        return ids.size
    }, [salesOrders, pendingOrderSheets, aggregationMode])

    // 주문처리율: 확정매출 건수 / (고객 승인요청 발주서 + 확정매출) * 100
    const orderCompletionRate = useMemo(() => {
        const confirmedCount = salesOrders.length
        // 고객이 승인 요청한 발주서 (SUBMITTED 상태, 금액 기록 있는 건만)
        const submittedCount = orderSheets.filter(os =>
            os.status === 'SUBMITTED' && (os.totalAmount || 0) > 0
        ).length
        const total = confirmedCount + submittedCount
        if (total === 0) return 0
        return (confirmedCount / total) * 100
    }, [salesOrders, orderSheets])

    // 미처리 주문
    const pendingOrders = useMemo(() => {
        const base = salesOrders.filter(so => so.status === 'CREATED').length
        if (aggregationMode === 'ALL_SALES') return base + pendingOrderSheets.length
        return base
    }, [salesOrders, pendingOrderSheets, aggregationMode])

    // 총 주문 수
    const totalOrders = aggregationMode === 'ALL_SALES'
        ? salesOrders.length + pendingOrderSheets.length
        : salesOrders.length

    // 총 중량
    const totalKg = useMemo(() => {
        const confirmed = salesOrders.reduce((sum, so) => sum + so.totalsKg, 0)
        if (aggregationMode === 'ALL_SALES') {
            const pending = pendingOrderSheets.reduce((sum, os) => sum + (os.totalKg || 0), 0)
            return confirmed + pending
        }
        return confirmed
    }, [salesOrders, pendingOrderSheets, aggregationMode])

    // 차트용 데이터: 실제 confirmedAt 기반으로 매출 집계 (연도 포함)
    const chartData = useMemo(() => {
        if (timeframe === 'WEEKLY') {
            const days: string[] = []
            const data: number[] = []
            const now = new Date()
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now)
                d.setDate(d.getDate() - i)
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                const yr = String(d.getFullYear()).slice(2)
                days.push(`${yr}/${d.getMonth() + 1}/${d.getDate()}`)
                const dayTotal = salesOrders
                    .filter(so => so.confirmedAt &&
                        so.confirmedAt.getFullYear() === d.getFullYear() &&
                        so.confirmedAt.getMonth() === d.getMonth() &&
                        so.confirmedAt.getDate() === d.getDate()
                    )
                    .reduce((sum, so) => sum + so.totalsAmount, 0)
                data.push(dayTotal)
            }
            return { labels: days, data }
        } else if (timeframe === 'MONTHLY') {
            // 실제 데이터 범위의 연월 기반
            const ymMap = new Map<string, number>()
            salesOrders.forEach(so => {
                if (!so.confirmedAt) return
                const y = so.confirmedAt.getFullYear()
                const m = so.confirmedAt.getMonth()
                const key = `${y}-${String(m).padStart(2, '0')}`
                ymMap.set(key, (ymMap.get(key) || 0) + so.totalsAmount)
            })
            const sorted = [...ymMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
            if (sorted.length === 0) return { labels: ['데이터 없음'], data: [0] }
            // 범위를 채워서 빈 월도 표시
            const first = sorted[0][0].split('-').map(Number)
            const last = sorted[sorted.length - 1][0].split('-').map(Number)
            const labels: string[] = []
            const data: number[] = []
            let y = first[0], m = first[1]
            while (y < last[0] || (y === last[0] && m <= last[1])) {
                const key = `${y}-${String(m).padStart(2, '0')}`
                const yr = String(y).slice(2)
                labels.push(`${yr}/${m + 1}월`)
                data.push(ymMap.get(key) || 0)
                m++
                if (m > 11) { m = 0; y++ }
            }
            return { labels, data }
        } else if (timeframe === 'QUARTERLY') {
            const qMap = new Map<string, number>()
            salesOrders.forEach(so => {
                if (!so.confirmedAt) return
                const y = so.confirmedAt.getFullYear()
                const q = Math.floor(so.confirmedAt.getMonth() / 3) + 1
                const key = `${y}-Q${q}`
                qMap.set(key, (qMap.get(key) || 0) + so.totalsAmount)
            })
            const sorted = [...qMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
            if (sorted.length === 0) return { labels: ['데이터 없음'], data: [0] }
            // 범위 채우기
            const parseQ = (k: string) => { const [y, q] = k.split('-Q'); return [Number(y), Number(q)] }
            const [fy, fq] = parseQ(sorted[0][0])
            const [ly, lq] = parseQ(sorted[sorted.length - 1][0])
            const labels: string[] = []
            const data: number[] = []
            let cy = fy, cq = fq
            while (cy < ly || (cy === ly && cq <= lq)) {
                const key = `${cy}-Q${cq}`
                const yr = String(cy).slice(2)
                labels.push(`${yr}년 Q${cq}`)
                data.push(qMap.get(key) || 0)
                cq++
                if (cq > 4) { cq = 1; cy++ }
            }
            return { labels, data }
        } else {
            // 연간
            const years = new Set<number>()
            salesOrders.forEach(so => {
                if (so.confirmedAt) years.add(so.confirmedAt.getFullYear())
            })
            const sortedYears = [...years].sort()
            if (sortedYears.length === 0) return { labels: ['2026년'], data: [0] }
            const data = sortedYears.map(year =>
                salesOrders
                    .filter(so => so.confirmedAt?.getFullYear() === year)
                    .reduce((sum, so) => sum + so.totalsAmount, 0)
            )
            return { labels: sortedYears.map(y => `${y}년`), data }
        }
    }, [salesOrders, timeframe])

    const salesData = chartData.data
    const labels = chartData.labels

    // 거래처 목록 (필터용)
    const customerNames = useMemo(() => {
        const map = new Map<string, string>()
        salesOrders.forEach(so => map.set(so.customerOrgId, so.customerName))
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
    }, [salesOrders])

    // Product Mix: salesOrderItems에서 상품명별 매출 비중 (거래처 필터 적용)
    const productMix = useMemo(() => {
        // 거래처 필터가 적용된 salesOrderIds
        const filteredSOIds = customerFilter === 'ALL'
            ? new Set(salesOrders.map(so => so.id))
            : new Set(salesOrders.filter(so => so.customerOrgId === customerFilter).map(so => so.id))

        const productSales = new Map<string, number>()
        salesOrderItems.forEach(item => {
            if (!filteredSOIds.has(item.salesOrderId)) return
            const name = (item.productName || '').replace(/\s*\(국내산\)\s*$/, '').trim()
            const baseName = name.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim()
            productSales.set(baseName, (productSales.get(baseName) || 0) + item.amount)
        })

        const sorted = [...productSales.entries()].sort((a, b) => b[1] - a[1])
        const total = sorted.reduce((sum, [, v]) => sum + v, 0)
        if (total === 0) return { items: [{ name: '데이터 없음', value: 100, amount: 0, color: '#f0f0f0' }], total: 0 }

        const colors = ['#7c4dff', '#00d2ff', '#00e676', '#ff9d00', '#f06292', '#ab47bc', '#26a69a', '#78909c']
        const top = sorted.slice(0, 6)
        const others = sorted.slice(6)
        const otherAmount = others.reduce((sum, [, v]) => sum + v, 0)

        const result = top.map(([name, amount], i) => ({
            name,
            value: Math.round((amount / total) * 1000) / 10,
            amount,
            color: colors[i % colors.length]
        }))

        if (otherAmount > 0) {
            result.push({
                name: '기타',
                value: Math.round((otherAmount / total) * 1000) / 10,
                amount: otherAmount,
                color: '#78909c'
            })
        }

        return { items: result, total }
    }, [salesOrderItems, salesOrders, customerFilter])

    // 거래처별 매출 TOP
    const customerRanking = useMemo(() => {
        const customerMap = new Map<string, { name: string; amount: number; kg: number; count: number }>()
        salesOrders.forEach(so => {
            const existing = customerMap.get(so.customerOrgId) || { name: so.customerName, amount: 0, kg: 0, count: 0 }
            existing.amount += so.totalsAmount
            existing.kg += so.totalsKg
            existing.count += 1
            customerMap.set(so.customerOrgId, existing)
        })
        return [...customerMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5)
    }, [salesOrders])

    // Logistics Data
    const logisticsStatus = useMemo(() => {
        const preparing = shipments.filter(s => s.status === 'PREPARING').length
        const inTransit = shipments.filter(s => s.status === 'IN_TRANSIT').length
        const delivered = shipments.filter(s => s.status === 'DELIVERED').length
        const total = Math.max(shipments.length, 1)
        return [
            { label: '대기', value: Math.round((preparing / total) * 100), count: preparing, color: '#7c4dff' },
            { label: '배송중', value: Math.round((inTransit / total) * 100), count: inTransit, color: '#00d2ff' },
            { label: '배송완료', value: Math.round((delivered / total) * 100), count: delivered, color: '#00e676' },
            { label: '전체', value: 100, count: shipments.length, color: '#ff9d00' },
        ]
    }, [shipments])

    // 로딩 상태
    if (loading) {
        return (
            <div className="dashboard-v2">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>대시보드 데이터를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    const maxSales = Math.max(...salesData, 1)

    return (
        <div className="dashboard-v2">
            {/* Header */}
            <header className="dashboard-v2-header">
                <div>
                    <h1>MEATGO Insights Hub</h1>
                    <p className="text-secondary mt-1">비즈니스 현황 요약</p>
                </div>
                <select
                    value={aggregationMode}
                    onChange={(e) => setAggregationMode(e.target.value as 'CONFIRMED' | 'ALL_SALES')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1.5px solid #ddd',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: aggregationMode === 'ALL_SALES' ? '#e65100' : '#333',
                        background: aggregationMode === 'ALL_SALES' ? '#fff3e0' : '#f9f9f9',
                        cursor: 'pointer',
                        outline: 'none',
                    }}
                >
                    <option value="CONFIRMED">확정주문 총액만 보기</option>
                    <option value="ALL_SALES">매출발주내역 포함</option>
                </select>
            </header>

            {/* Top Stats Row */}
            <div className="stats-v2-grid">
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">총 매출</span>
                    <div className="stat-v2-value">{formatKRW(totalSales)}</div>
                    <div className="stat-v2-trend">
                        {totalOrders}건 / {formatNum(Math.round(totalKg))}kg
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">활성 거래처</span>
                    <div className="stat-v2-value">{formatNum(activeCustomers)}</div>
                    <div className="stat-v2-trend">
                        주문 이력이 있는 거래처
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">주문 처리율</span>
                    <div className="stat-v2-value">{formatPercent(orderCompletionRate)}</div>
                    <div className="stat-v2-trend">
                        전체 {salesOrders.length + orderSheets.filter(os => os.status === 'SUBMITTED' && (os.totalAmount || 0) > 0).length}건 중 {salesOrders.length}건 처리
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">미처리 주문</span>
                    <div className="stat-v2-value">{pendingOrders}건</div>
                    <div className="stat-v2-trend warning">
                        {pendingOrders > 0 ? '검토가 필요합니다' : '처리 완료'}
                    </div>
                </div>
            </div>

            {/* Second Stats Row: Order Pipeline */}
            <div className="stats-v2-grid">
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">주문 미승인</span>
                    <div className="stat-v2-value" style={{ color: '#e65100' }}>
                        {orderSheets.filter(os => os.status === 'SUBMITTED').length}건
                    </div>
                    <div className="stat-v2-trend warning">
                        고객 승인요청 대기중
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">주문 승인</span>
                    <div className="stat-v2-value" style={{ color: '#2979ff' }}>
                        {orderSheets.filter(os => os.status === 'CONFIRMED').length}건
                    </div>
                    <div className="stat-v2-trend">
                        관리자 최종 승인 완료
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">주문 확정</span>
                    <div className="stat-v2-value" style={{ color: '#00c853' }}>
                        {salesOrders.length}건
                    </div>
                    <div className="stat-v2-trend">
                        확정주문 발행 완료
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">배송 완료</span>
                    <div className="stat-v2-value" style={{ color: '#7c4dff' }}>
                        {shipments.filter(s => s.status === 'DELIVERED').length}건
                    </div>
                    <div className="stat-v2-trend">
                        납품 완료
                    </div>
                </div>
            </div>

            {/* Middle Row: Sales Trend & Product Mix */}
            <div className="chart-grid">
                {/* Sales Trend */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3><TrendingUpIcon size={18} className="text-primary mr-2" /> 매출 추이</h3>
                        <div className="timeframe-selector">
                            {(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map(tf => (
                                <button
                                    key={tf}
                                    className={timeframe === tf ? 'active' : ''}
                                    onClick={() => setTimeframe(tf)}
                                >
                                    {tf === 'WEEKLY' ? '주간' : tf === 'MONTHLY' ? '월간' : tf === 'QUARTERLY' ? '분기' : '연간'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="chart-container">
                        {salesData.every(v => v === 0) ? (
                            <div className="empty-chart-overlay">
                                <p>해당 기간 데이터가 없습니다</p>
                            </div>
                        ) : (
                            <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c4dff" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#7c4dff" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {/* Bar chart */}
                                {salesData.map((d, i) => {
                                    const barWidth = 800 / salesData.length
                                    const x = 100 + i * barWidth
                                    const barHeight = (d / maxSales) * 250
                                    return (
                                        <g key={i}>
                                            <rect
                                                x={x + barWidth * 0.15}
                                                y={300 - barHeight}
                                                width={barWidth * 0.7}
                                                height={barHeight}
                                                rx="4"
                                                fill={d > 0 ? 'url(#barGradient)' : 'rgba(255,255,255,0.05)'}
                                                opacity={0.9}
                                            />
                                            {d > 0 && (
                                                <text
                                                    x={x + barWidth * 0.5}
                                                    y={300 - barHeight - 8}
                                                    textAnchor="middle"
                                                    fill="#ccc"
                                                    fontSize="11"
                                                    fontWeight="600"
                                                >
                                                    {(d / 10000).toFixed(0)}만
                                                </text>
                                            )}
                                        </g>
                                    )
                                })}
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c4dff" />
                                        <stop offset="100%" stopColor="#3d1f99" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        )}

                        {/* Labels Overlay */}
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.5rem', padding: '0 60px' }}>
                            {labels.map(l => <span key={l} style={{ fontSize: '0.65rem', color: '#999', fontWeight: 600 }}>{l}</span>)}
                        </div>
                    </div>
                </div>

                {/* Product Mix Donut */}
                <div className="premium-card">
                    <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        <h3><PackageIcon size={18} className="text-primary mr-2" /> 상품별 매출</h3>
                        <select
                            value={customerFilter}
                            onChange={(e) => setCustomerFilter(e.target.value)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#444',
                                background: '#f8f8f8',
                                cursor: 'pointer',
                                outline: 'none',
                                maxWidth: '180px',
                            }}
                        >
                            <option value="ALL">전체 거래처</option>
                            {customerNames.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="donut-container">
                        <div style={{ position: 'relative', width: '192px', height: '192px', flexShrink: 0 }}>
                            <svg width="192" height="192" className="donut-svg">
                                <circle cx="96" cy="96" r="72" fill="transparent" stroke="rgba(0,0,0,0.04)" strokeWidth="22" />
                                {productMix.items.reduce((acc, item, i) => {
                                    const offset = productMix.items.slice(0, i).reduce((sum, prev) => sum + prev.value, 0)
                                    const length = (item.value / 100) * (2 * Math.PI * 72)
                                    const totalLength = 2 * Math.PI * 72
                                    acc.push(
                                        <circle
                                            key={item.name}
                                            cx="96" cy="96" r="72"
                                            fill="transparent"
                                            stroke={item.color}
                                            strokeWidth="24"
                                            strokeDasharray={`${length} ${totalLength - length}`}
                                            strokeDashoffset={-(offset / 100) * totalLength}
                                            strokeLinecap="round"
                                        />
                                    )
                                    return acc
                                }, [] as React.ReactElement[])}
                            </svg>
                            <div className="donut-center-text" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                                <div className="donut-center-label">총 매출</div>
                                <div className="donut-center-value" style={{ fontSize: '0.7rem' }}>{formatKRW(productMix.total)}</div>
                            </div>
                        </div>
                        <div className="donut-legend">
                            {productMix.items.map(item => (
                                <div key={item.name} className="legend-item">
                                    <div className="legend-color" style={{ background: item.color }}></div>
                                    <span>{item.name} ({item.value}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Customer Ranking & Logistics */}
            <div className="bottom-grid">
                {/* 거래처별 매출 TOP */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3><TruckIcon size={18} className="text-primary mr-2" /> 거래처별 매출 TOP</h3>
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                        {customerRanking.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>거래 데이터가 없습니다</p>
                        ) : (
                            customerRanking.map((c, i) => {
                                const maxAmount = customerRanking[0]?.amount || 1
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888', width: '24px', textAlign: 'center' }}>
                                            {i + 1}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{c.name}</div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(c.amount / maxAmount) * 100}%`, background: 'linear-gradient(90deg, #7c4dff, #00d2ff)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{formatKRW(c.amount)}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#888' }}>{c.count}건 / {formatNum(Math.round(c.kg))}kg</div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Lead Time Operational Matrix */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3><ClockIcon size={18} className="text-primary mr-2" /> 운영 현황</h3>
                    </div>
                    <div className="lead-time-matrix">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div style={{ background: 'rgba(124,77,255,0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c4dff' }}>{totalOrders}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>총 주문 수</div>
                            </div>
                            <div style={{ background: 'rgba(0,210,255,0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00d2ff' }}>{shipments.length}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>총 배송 건수</div>
                            </div>
                            <div style={{ background: 'rgba(0,230,118,0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e676' }}>{formatNum(Math.round(totalKg))}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>총 중량 (kg)</div>
                            </div>
                            <div style={{ background: 'rgba(255,157,0,0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9d00' }}>{activeCustomers}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>활성 거래처</div>
                            </div>
                        </div>

                        <div className="metrics-summary">
                            {logisticsStatus.map(item => (
                                <div key={item.label} className="metric-item">
                                    <span className="metric-label">{item.label}</span>
                                    <span className="metric-avg" style={{ color: item.color }}>{item.count}건</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
