import { useState, useMemo } from 'react'
import { TrendingUpIcon, PackageIcon, TruckIcon, ClockIcon } from '../../components/Icons'
import { useOrderStore } from '../../stores/orderStore'
import './Dashboard.css'

// Helper for currency and numbers
const formatKRW = (v: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(v)
const formatNum = (v: number) => new Intl.NumberFormat('ko-KR').format(v)
const formatPercent = (v: number) => `${v.toFixed(1)}%`

export default function Dashboard() {
    const { salesOrders, orderSheets, shipments } = useOrderStore()
    const [timeframe, setTimeframe] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('WEEKLY')

    // 계산된 지표들
    const todaySales = useMemo(() => {
        const today = new Date().toDateString()
        return salesOrders
            .filter(so => new Date(so.createdAt).toDateString() === today)
            .reduce((sum, so) => sum + so.totalsAmount, 0)
    }, [salesOrders])

    const activeCustomers = useMemo(() => {
        const uniqueCustomers = new Set(orderSheets.map(os => os.customerOrgId))
        return uniqueCustomers.size
    }, [orderSheets])

    const orderCompletionRate = useMemo(() => {
        if (orderSheets.length === 0) return 0
        const confirmed = orderSheets.filter(os => os.status === 'CONFIRMED').length
        return (confirmed / orderSheets.length) * 100
    }, [orderSheets])

    // 차트용 데이터 (실제 데이터 축적 전까지 0으로 초기화된 배열 제공)
    const salesData = useMemo(() => {
        const count = timeframe === 'WEEKLY' ? 7 : timeframe === 'MONTHLY' ? 12 : 4
        return new Array(count).fill(0)
    }, [timeframe])

    const labels = useMemo(() => {
        if (timeframe === 'WEEKLY') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        if (timeframe === 'MONTHLY') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return ['Q1', 'Q2', 'Q3', 'Q4']
    }, [timeframe])

    // Donut Data
    const productMix = [
        { name: '대기 중', value: 100, color: '#f0f0f0' }
    ]

    // Logistics Data
    const logisticsStatus = [
        { label: '입고(In)', value: 0, color: '#7c4dff' },
        { label: '출고(Out)', value: shipments.filter(s => s.status === 'PREPARING').length, color: '#00d2ff' },
        { label: '배송(Del)', value: shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'DELIVERED').length, color: '#00e676' },
        { label: '완료(Done)', value: shipments.filter(s => s.status === 'DELIVERED').length, color: '#ff9d00' },
    ]

    return (
        <div className="dashboard-v2">
            {/* Header */}
            <header className="dashboard-v2-header">
                <div>
                    <h1>TRS Insights Hub</h1>
                    <p className="text-secondary mt-1">오늘의 비즈니스 현황을 요약합니다</p>
                </div>
                <div className="date-badge">
                    {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </div>
            </header>

            {/* Top Stats Row */}
            <div className="stats-v2-grid">
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">오늘의 매출</span>
                    <div className="stat-v2-value">{formatKRW(todaySales)}</div>
                    <div className="stat-v2-trend">
                        실시간 업데이트 중
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">활성 거래처 (Active)</span>
                    <div className="stat-v2-value">{formatNum(activeCustomers)}</div>
                    <div className="stat-v2-trend">
                        운영 중인 고객사 수
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">주문 완료율</span>
                    <div className="stat-v2-value">{formatPercent(orderCompletionRate)}</div>
                    <div className="stat-v2-trend">
                        전체 대비 승인 완료 비중
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">미처리 주문</span>
                    <div className="stat-v2-value">{orderSheets.filter(os => os.status !== 'CONFIRMED').length}건</div>
                    <div className="stat-v2-trend warning">
                        검토가 필요한 주문장
                    </div>
                </div>
            </div>

            {/* Middle Row: Sales Trend & Product Mix */}
            <div className="chart-grid">
                {/* Sales Trend */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3><TrendingUpIcon size={18} className="text-primary mr-2" /> Sales Trend</h3>
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
                                <p>데이터를 축적 중입니다...</p>
                            </div>
                        ) : (
                            <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c4dff" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#7c4dff" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <polyline
                                    className="chart-line"
                                    points={salesData.map((d, i) => `${(i / (salesData.length - 1)) * 1000},${300 - (d / Math.max(1, ...salesData)) * 250}`).join(' ')}
                                />
                                <path
                                    className="chart-area"
                                    d={`M0,300 ${salesData.map((d, i) => `${(i / (salesData.length - 1)) * 1000},${300 - (d / Math.max(1, ...salesData)) * 250}`).join(' ')} L1000,300 Z`}
                                />
                            </svg>
                        )}

                        {/* Labels Overlay */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', padding: '0 10px' }}>
                            {labels.map(l => <span key={l} style={{ fontSize: '0.65rem', color: '#999', fontWeight: 600 }}>{l}</span>)}
                        </div>
                    </div>
                </div>

                {/* Product Mix Donut */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3><PackageIcon size={18} className="text-primary mr-2" /> Product Mix</h3>
                    </div>
                    <div className="donut-container">
                        <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                            <svg width="180" height="180" className="donut-svg">
                                <circle cx="90" cy="90" r="70" fill="transparent" stroke="#f0f0f0" strokeWidth="20" />
                                {productMix.reduce((acc, item, i) => {
                                    const offset = productMix.slice(0, i).reduce((sum, prev) => sum + prev.value, 0)
                                    const length = (item.value / 100) * (2 * Math.PI * 70)
                                    const totalLength = 2 * Math.PI * 70
                                    acc.push(
                                        <circle
                                            key={item.name}
                                            cx="90" cy="90" r="70"
                                            fill="transparent"
                                            stroke={item.color}
                                            strokeWidth="22"
                                            strokeDasharray={`${length} ${totalLength - length}`}
                                            strokeDashoffset={-(offset / 100) * totalLength}
                                            strokeLinecap="round"
                                        />
                                    )
                                    return acc
                                }, [] as any)}
                            </svg>
                            <div className="donut-center-text">
                                <div className="donut-center-label">총 매출</div>
                                <div className="donut-center-value">84%</div>
                            </div>
                        </div>
                        <div className="donut-legend">
                            {productMix.map(item => (
                                <div key={item.name} className="legend-item">
                                    <div className="legend-color" style={{ background: item.color }}></div>
                                    <span>{item.name} ({item.value}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Logistics & Operational Lead Time */}
            <div className="bottom-grid">
                {/* Logistics status bars */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3><TruckIcon size={18} className="text-primary mr-2" /> Logistics Throughput</h3>
                    </div>
                    <div className="logistics-grid">
                        {logisticsStatus.map(item => (
                            <div key={item.label} className="progress-tube-container">
                                <div className="progress-tube">
                                    <div className="progress-fill" style={{ height: `${item.value}%`, background: `linear-gradient(to top, ${item.color}, ${item.color}cc)` }}></div>
                                    <div className="progress-segments">
                                        {[...Array(10)].map((_, i) => <div key={i} className="segment-divider"></div>)}
                                    </div>
                                </div>
                                <div className="progress-label">{item.label}</div>
                                <div className="progress-percent">{item.value}%</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lead Time Operational Matrix */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3><ClockIcon size={18} className="text-primary mr-2" /> Operational Matrix</h3>
                        <span className="text-xs text-secondary">Avg. Lead Time: <strong>2.4 Days</strong></span>
                    </div>
                    <div className="lead-time-matrix">
                        <div className="timeline">
                            <div className="timeline-step active">
                                <div className="step-node"></div>
                                <div className="step-info">
                                    <div className="step-name">주문접수</div>
                                    <div className="step-time">Day 0</div>
                                </div>
                            </div>
                            <div className="timeline-step active">
                                <div className="step-node"></div>
                                <div className="step-info">
                                    <div className="step-name">내부승인</div>
                                    <div className="step-time">+4h</div>
                                </div>
                            </div>
                            <div className="timeline-step active">
                                <div className="step-node"></div>
                                <div className="step-info">
                                    <div className="step-name">발주완료</div>
                                    <div className="step-time">+12h</div>
                                </div>
                            </div>
                            <div className="timeline-step active">
                                <div className="step-node"></div>
                                <div className="step-info">
                                    <div className="step-name">배차매칭</div>
                                    <div className="step-time">+18h</div>
                                </div>
                            </div>
                            <div className="timeline-step">
                                <div className="step-node"></div>
                                <div className="step-info">
                                    <div className="step-name">배송완료</div>
                                    <div className="step-time">Day 2.4</div>
                                </div>
                            </div>
                        </div>

                        <div className="metrics-summary">
                            <div className="metric-item">
                                <span className="metric-label">주문 → 발주</span>
                                <span className="metric-avg">8.5h</span>
                            </div>
                            <div className="metric-item">
                                <span className="metric-label">발주 → 출고</span>
                                <span className="metric-avg">14.2h</span>
                            </div>
                            <div className="metric-item">
                                <span className="metric-label">총 배송 소요</span>
                                <span className="metric-avg">32.8h</span>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-sm">세부 지표 리포트 보기 →</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
