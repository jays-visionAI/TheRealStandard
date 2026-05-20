import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getAllUsers, type FirestoreUser } from '../../lib/userService'
import { getAllStocks, getOverageStocks, type InventoryStock, type InventoryEvent } from '../../lib/inventoryService'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import {
    PackageIcon,
    AlertTriangleIcon,
    TruckIcon,
    ClipboardListIcon,
    ChevronRightIcon,
    FactoryIcon,
} from '../../components/Icons'
import './PurchaseDashboard.css'

export default function PurchaseDashboard() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [pendingPOs, setPendingPOs] = useState<any[]>([])
    const [stocks, setStocks] = useState<InventoryStock[]>([])
    const [overage, setOverage] = useState<InventoryEvent[]>([])
    const [suppliers, setSuppliers] = useState<FirestoreUser[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const poSnap = await getDocs(
                    query(collection(db, 'purchaseOrders'), where('status', 'in', ['DRAFT', 'SENT']))
                )
                const pos = poSnap.docs.map(d => ({ id: d.id, ...d.data() }))

                const [stockData, overageData, users] = await Promise.all([
                    getAllStocks(),
                    getOverageStocks(2),
                    getAllUsers(),
                ])

                setPendingPOs(pos)
                setStocks(stockData)
                setOverage(overageData)
                setSuppliers(users.filter(u => u.role === 'SUPPLIER'))
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const shortage = stocks.filter(s => s.totalWeightKg <= 0)
    const totalStockKg = stocks.reduce((s, i) => s + i.totalWeightKg, 0)

    if (loading) return <div className="purchase-dashboard"><div className="loading-state"><div className="spinner" /></div></div>

    return (
        <div className="purchase-dashboard">
            <div className="dashboard-header">
                <h1><PackageIcon size={22} /> 구매팀 대시보드</h1>
                <p className="welcome">안녕하세요, {user?.name}님</p>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card primary">
                    <ClipboardListIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">진행 중 발주</span>
                        <span className="kpi-value">{pendingPOs.length}건</span>
                    </div>
                    <button className="kpi-action" onClick={() => navigate('/admin/purchase-orders')}>
                        바로가기 <ChevronRightIcon size={12} />
                    </button>
                </div>

                <div className="kpi-card">
                    <PackageIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">전체 재고</span>
                        <span className="kpi-value">{totalStockKg.toFixed(0)} kg</span>
                        <span className="kpi-sub">{stocks.length} 품목</span>
                    </div>
                    <button className="kpi-action" onClick={() => navigate('/warehouse/inventory')}>
                        바로가기 <ChevronRightIcon size={12} />
                    </button>
                </div>

                <div className="kpi-card danger">
                    <AlertTriangleIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">결품 위험</span>
                        <span className="kpi-value">{shortage.length} 품목</span>
                    </div>
                </div>

                <div className="kpi-card warn">
                    <TruckIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">2일 초과 재고</span>
                        <span className="kpi-value">{overage.length} 건</span>
                    </div>
                </div>
            </div>

            <div className="section-card">
                <div className="section-header">
                    <h2><AlertTriangleIcon size={16} /> 결품 위험 상품</h2>
                    <button className="btn-link" onClick={() => navigate('/warehouse/inventory')}>
                        전체 보기
                    </button>
                </div>
                {shortage.length === 0 ? (
                    <p className="empty">결품 위험 상품이 없습니다.</p>
                ) : (
                    <div className="list">
                        {shortage.slice(0, 8).map(s => (
                            <div key={`${s.productId}_${s.tempZone}`} className="list-item danger">
                                <span className="item-title">{s.productName}</span>
                                <span className="item-zone">
                                    {s.tempZone === 'CHILLED' ? '냉장' : '냉동'}
                                </span>
                                <span className="item-amount text-danger">재고 0kg</span>
                                <button
                                    className="btn-mini"
                                    onClick={(e) => { e.stopPropagation(); navigate('/admin/purchase-orders') }}
                                >
                                    발주 생성
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="section-card">
                <div className="section-header">
                    <h2><ClipboardListIcon size={16} /> 입고 대기 발주</h2>
                    <button className="btn-link" onClick={() => navigate('/admin/purchase-orders')}>
                        전체 보기
                    </button>
                </div>
                {pendingPOs.length === 0 ? (
                    <p className="empty">입고 대기 발주가 없습니다.</p>
                ) : (
                    <div className="list">
                        {pendingPOs.slice(0, 5).map((po: any) => (
                            <div
                                key={po.id}
                                className="list-item"
                                onClick={() => navigate(`/admin/purchase-orders/${po.id}`)}
                            >
                                <span className="item-title">{po.supplierName || '공급사'}</span>
                                <span className="item-status">{po.status}</span>
                                <span className="item-amount">{po.totalsAmount?.toLocaleString() || '-'}원</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="quick-actions">
                <button onClick={() => navigate('/admin/purchase-orders/create')}>
                    + 새 발주 생성
                </button>
                <button onClick={() => navigate('/admin/users/suppliers')}>
                    <FactoryIcon size={14} /> 공급사 관리 ({suppliers.length})
                </button>
                <button onClick={() => navigate('/warehouse/inventory')}>
                    <PackageIcon size={14} /> 재고 현황
                </button>
            </div>
        </div>
    )
}
