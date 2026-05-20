import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllStocks, getOverageStocks, type InventoryStock } from '../../lib/inventoryService'
import { PackageIcon, AlertTriangleIcon, CheckCircleIcon, FactoryIcon, ChevronLeftIcon } from '../../components/Icons'
import './InventoryDashboard.css'

export default function InventoryDashboard() {
    const navigate = useNavigate()
    const [stocks, setStocks] = useState<InventoryStock[]>([])
    const [overageCount, setOverageCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterZone, setFilterZone] = useState<'ALL' | 'CHILLED' | 'FROZEN'>('ALL')

    const loadData = async () => {
        try {
            setLoading(true)
            const [stockData, overageData] = await Promise.all([
                getAllStocks(),
                getOverageStocks(2)
            ])
            setStocks(stockData)
            setOverageCount(overageData.length)
        } catch (err) {
            console.error(err)
            setError('재고 데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const filtered = stocks.filter(s =>
        filterZone === 'ALL' ? true : s.tempZone === filterZone
    )

    const totalKg = filtered.reduce((s, i) => s + i.totalWeightKg, 0)
    const totalBox = filtered.reduce((s, i) => s + i.totalBoxCount, 0)

    if (loading) return (
        <div className="inventory-dashboard">
            <div className="inv-loading-state">
                <div className="spinner" />
                <p>재고 데이터 로딩 중...</p>
            </div>
        </div>
    )

    if (error) return (
        <div className="inventory-dashboard">
            <div className="inv-error-state">
                <AlertTriangleIcon size={40} />
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadData}>다시 시도</button>
            </div>
        </div>
    )

    return (
        <div className="inventory-dashboard">
            {/* Header */}
            <header className="inv-header">
                <div className="inv-header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/warehouse')}>
                        <ChevronLeftIcon size={16} /> 창고 대시보드
                    </button>
                    <h1><PackageIcon size={24} /> 재고 현황</h1>
                </div>

                {/* 2일 초과 알람 배너 */}
                {overageCount > 0 && (
                    <div className="inv-alarm-banner">
                        <AlertTriangleIcon size={18} />
                        <span>{overageCount}건의 상품이 입고 후 2일이 경과했습니다. 출고 또는 냉동 전환을 검토하세요.</span>
                    </div>
                )}

                {/* 요약 KPI */}
                <div className="inv-kpi-row">
                    <div className="inv-kpi-card">
                        <span className="inv-kpi-label">총 재고 중량</span>
                        <span className="inv-kpi-value">{totalKg.toFixed(1)} kg</span>
                    </div>
                    <div className="inv-kpi-card">
                        <span className="inv-kpi-label">총 박스 수</span>
                        <span className="inv-kpi-value">{totalBox} 박스</span>
                    </div>
                    <div className="inv-kpi-card">
                        <span className="inv-kpi-label">품목 수</span>
                        <span className="inv-kpi-value">{filtered.length} 품목</span>
                    </div>
                    <div className={`inv-kpi-card ${overageCount > 0 ? 'warn' : ''}`}>
                        <span className="inv-kpi-label">2일 초과 재고</span>
                        <span className="inv-kpi-value">{overageCount} 건</span>
                    </div>
                </div>

                {/* 온도대 필터 */}
                <div className="inv-filter-tabs">
                    {(['ALL', 'CHILLED', 'FROZEN'] as const).map(zone => (
                        <button
                            key={zone}
                            className={`inv-filter-tab ${filterZone === zone ? 'active' : ''}`}
                            onClick={() => setFilterZone(zone)}
                        >
                            {zone === 'ALL' ? '전체' : zone === 'CHILLED' ? '냉장' : '냉동'}
                        </button>
                    ))}
                </div>
            </header>

            {/* 재고 테이블 */}
            <main className="inv-content">
                {filtered.length === 0 ? (
                    <div className="inv-empty-state">
                        <PackageIcon size={48} />
                        <p>현재 재고가 없습니다.</p>
                    </div>
                ) : (
                    <div className="inv-table-wrapper glass-card">
                        <table className="inv-table">
                            <thead>
                                <tr>
                                    <th>상품명</th>
                                    <th>온도대</th>
                                    <th>재고 중량</th>
                                    <th>박스 수</th>
                                    <th>마지막 입고</th>
                                    <th>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((stock, idx) => {
                                    const lastInbound = stock.lastInboundAt?.toDate?.()
                                    const daysSince = lastInbound
                                        ? Math.floor((Date.now() - lastInbound.getTime()) / 86400000)
                                        : null
                                    const isOverage = daysSince !== null && daysSince >= 2

                                    return (
                                        <tr key={idx} className={isOverage ? 'row-warn' : ''}>
                                            <td className="inv-product-name">{stock.productName}</td>
                                            <td>
                                                <span className={`inv-badge-zone ${stock.tempZone.toLowerCase()}`}>
                                                    {stock.tempZone === 'CHILLED' ? '냉장' : '냉동'}
                                                </span>
                                            </td>
                                            <td className="inv-weight">{stock.totalWeightKg.toFixed(1)} kg</td>
                                            <td>{stock.totalBoxCount} 박스</td>
                                            <td className="inv-date">
                                                {lastInbound
                                                    ? lastInbound.toLocaleDateString('ko-KR')
                                                    : '-'}
                                            </td>
                                            <td>
                                                {isOverage ? (
                                                    <span className="inv-status-warn">
                                                        <AlertTriangleIcon size={14} /> {daysSince}일 경과
                                                    </span>
                                                ) : (
                                                    <span className="inv-status-ok">
                                                        <CheckCircleIcon size={14} /> 정상
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    )
}
