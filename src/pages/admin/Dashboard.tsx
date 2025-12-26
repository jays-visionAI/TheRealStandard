import { useState, useMemo } from 'react'
import {
    TrendingUpIcon,
    PackageIcon,
    TruckIcon,
    ClockIcon,
    ChevronUpIcon,
    ChevronDownIcon
} from '../../components/Icons'
import './Dashboard.css'

// Helper for currency and numbers
const formatKRW = (v: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(v)
const formatNum = (v: number) => new Intl.NumberFormat('ko-KR').format(v)

export default function Dashboard() {
    const [timeframe, setTimeframe] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('WEEKLY')

    // Mock Data for Charts (Usually from a store or API)
    const salesData = useMemo(() => {
        const base = timeframe === 'WEEKLY' ? [45, 52, 48, 70, 61, 85, 80] :
            timeframe === 'MONTHLY' ? [450, 520, 480, 700, 610, 850, 800, 950, 1100, 1050, 1200, 1150] :
                [1200, 1500, 1800, 2100] // Quarterly/Yearly
        return base
    }, [timeframe])

    const labels = useMemo(() => {
        if (timeframe === 'WEEKLY') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        if (timeframe === 'MONTHLY') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return ['Q1', 'Q2', 'Q3', 'Q4']
    }, [timeframe])

    // Donut Data
    const productMix = [
        { name: '한우/돈육', value: 45, color: '#7c4dff' },
        { name: '수입육', value: 25, color: '#00d2ff' },
        { name: '가공품', value: 15, color: '#ff9d00' },
        { name: '부속/기타', value: 15, color: '#ff5252' },
    ]

    // Logistics Data
    const logisticsStatus = [
        { label: '입고(In)', value: 88, color: '#7c4dff' },
        { label: '출고(Out)', value: 72, color: '#00d2ff' },
        { label: '배송(Del)', value: 95, color: '#00e676' },
        { label: '재고(Inv)', value: 64, color: '#ff9d00' },
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
                    <div className="stat-v2-value">{formatKRW(12450000)}</div>
                    <div className="stat-v2-trend up">
                        <TrendingUpIcon size={14} /> 12.5% vs Yesterday
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">활성 거래처 (Active)</span>
                    <div className="stat-v2-value">{formatNum(128)}</div>
                    <div className="stat-v2-trend up">
                        <ChevronUpIcon size={14} /> 4 신규 가입
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">주문 처리율</span>
                    <div className="stat-v2-value">94.2%</div>
                    <div className="stat-v2-trend up">
                        <TrendingUpIcon size={14} /> 2.1% 목표 달성
                    </div>
                </div>
                <div className="premium-card stat-v2-card">
                    <span className="stat-v2-label">평균 리드타임</span>
                    <div className="stat-v2-value">28.4시간</div>
                    <div className="stat-v2-trend down">
                        <ChevronDownIcon size={14} /> 1.2시간 단축
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
                        <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7c4dff" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#7c4dff" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {/* Simple Line Chart logic */}
                            <polyline
                                className="chart-line"
                                points={salesData.map((d, i) => `${(i / (salesData.length - 1)) * 1000},${300 - (d / Math.max(...salesData)) * 250}`).join(' ')}
                            />
                            <path
                                className="chart-area"
                                d={`M0,300 ${salesData.map((d, i) => `${(i / (salesData.length - 1)) * 1000},${300 - (d / Math.max(...salesData)) * 250}`).join(' ')} L1000,300 Z`}
                            />
                        </svg>

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
