import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    getAllOrderSheets,
    getAllSalesOrders,
    type FirestoreOrderSheet,
    type FirestoreSalesOrder,
} from '../../lib/orderService'
import { getReceivables, type FirestoreSettlement } from '../../lib/settlementService'
import { getAllUsers, type FirestoreUser } from '../../lib/userService'
import {
    ClipboardListIcon,
    PackageIcon,
    TrendingUpIcon,
    WalletIcon,
    UsersIcon,
    FileTextIcon,
    ChevronRightIcon,
} from '../../components/Icons'
import './SalesDashboard.css'

export default function SalesDashboard() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [pendingSheets, setPendingSheets] = useState<FirestoreOrderSheet[]>([])
    const [activeOrders, setActiveOrders] = useState<FirestoreSalesOrder[]>([])
    const [receivables, setReceivables] = useState<FirestoreSettlement[]>([])
    const [customers, setCustomers] = useState<FirestoreUser[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const [sheets, orders, recvs, users] = await Promise.all([
                    getAllOrderSheets(),
                    getAllSalesOrders(),
                    getReceivables(),
                    getAllUsers(),
                ])
                setPendingSheets(sheets.filter(s =>
                    ['SENT', 'REVISION', 'SUBMITTED'].includes(s.status)
                ))
                setActiveOrders(orders.filter(o => o.status !== 'COMPLETED'))
                setReceivables(recvs)
                setCustomers(users.filter(u => u.role === 'CUSTOMER'))
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const now = new Date()
    const thisMonthOrders = activeOrders.filter(o => {
        const d = o.createdAt?.toDate()
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const monthlyRevenue = thisMonthOrders.reduce((s, o) => s + (o.totalsAmount || 0), 0)
    const totalReceivable = receivables.reduce((s, r) => s + r.remainingAmount, 0)

    if (loading) return <div className="sales-dashboard"><div className="loading-state"><div className="spinner" /></div></div>

    return (
        <div className="sales-dashboard">
            <div className="dashboard-header">
                <h1><TrendingUpIcon size={22} /> 영업팀 대시보드</h1>
                <p className="welcome">안녕하세요, {user?.name}님</p>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card primary">
                    <ClipboardListIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">검토 대기 주문장</span>
                        <span className="kpi-value">{pendingSheets.length}건</span>
                    </div>
                    <button className="kpi-action" onClick={() => navigate('/admin/order-sheets')}>
                        바로가기 <ChevronRightIcon size={12} />
                    </button>
                </div>

                <div className="kpi-card">
                    <PackageIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">진행 중 주문</span>
                        <span className="kpi-value">{activeOrders.length}건</span>
                    </div>
                    <button className="kpi-action" onClick={() => navigate('/admin/sales-orders')}>
                        바로가기 <ChevronRightIcon size={12} />
                    </button>
                </div>

                <div className="kpi-card success">
                    <TrendingUpIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">이번 달 매출</span>
                        <span className="kpi-value">{monthlyRevenue.toLocaleString()}원</span>
                    </div>
                </div>

                <div className="kpi-card warn">
                    <WalletIcon size={24} />
                    <div className="kpi-content">
                        <span className="kpi-label">미수금 합계</span>
                        <span className="kpi-value">{totalReceivable.toLocaleString()}원</span>
                        <span className="kpi-sub">{receivables.length}건</span>
                    </div>
                </div>
            </div>

            <div className="section-card">
                <div className="section-header">
                    <h2><ClipboardListIcon size={16} /> 검토 대기 주문장</h2>
                    <button className="btn-link" onClick={() => navigate('/admin/order-sheets')}>
                        전체 보기
                    </button>
                </div>
                {pendingSheets.length === 0 ? (
                    <p className="empty">검토 대기 주문장이 없습니다.</p>
                ) : (
                    <div className="list">
                        {pendingSheets.slice(0, 5).map(s => (
                            <div
                                key={s.id}
                                className="list-item"
                                onClick={() => navigate(`/admin/order-sheets/${s.id}/review`)}
                            >
                                <span className="item-title">{s.customerName}</span>
                                <span className="item-customer">#{s.id.slice(-6)}</span>
                                <span className={`item-status status-${s.status.toLowerCase()}`}>
                                    {s.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="section-card">
                <div className="section-header">
                    <h2><WalletIcon size={16} /> 미수채권 임박</h2>
                    <button className="btn-link" onClick={() => navigate('/admin/settlement')}>
                        전체 보기
                    </button>
                </div>
                {receivables.length === 0 ? (
                    <p className="empty">미수채권이 없습니다.</p>
                ) : (
                    <div className="list">
                        {receivables.slice(0, 5).map(r => (
                            <div
                                key={r.id}
                                className={`list-item ${r.status === 'OVERDUE' ? 'danger' : ''}`}
                                onClick={() => navigate(`/admin/settlement/${r.id}`)}
                            >
                                <span className="item-title">{r.customerName}</span>
                                <span className="item-amount">{r.remainingAmount.toLocaleString()}원</span>
                                <span className="item-due">
                                    기한: {r.paymentDueAt?.toDate().toLocaleDateString('ko-KR')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="quick-actions">
                <button onClick={() => navigate('/admin/order-sheets/create')}>
                    + 새 주문장 만들기
                </button>
                <button onClick={() => navigate('/admin/products/price-lists')}>
                    <FileTextIcon size={14} /> 단가표 관리
                </button>
                <button onClick={() => navigate('/admin/users/customers')}>
                    <UsersIcon size={14} /> 고객사 관리 ({customers.length})
                </button>
            </div>
        </div>
    )
}
