import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    getOrderSheetsByCustomer,
    getSalesOrdersByCustomer,
    type FirestoreOrderSheet,
    type FirestoreSalesOrder
} from '../../lib/orderService'
import {
    ClipboardListIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    ClockIcon,
    TruckIcon,
    PackageIcon
} from '../../components/Icons'
import './CustomerOrderList.css'

export default function CustomerOrderList() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const isHistoryPage = location.pathname.includes('/history')

    const [orderSheets, setOrderSheets] = useState<FirestoreOrderSheet[]>([])
    const [salesOrders, setSalesOrders] = useState<FirestoreSalesOrder[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadOrders = async () => {
            if (!user?.orgId) {
                setLoading(false)
                return
            }

            try {
                const [sheets, orders] = await Promise.all([
                    getOrderSheetsByCustomer(user.orgId),
                    getSalesOrdersByCustomer(user.orgId)
                ])

                // Filter sheets (only meaningful for active list)
                // We show SENT, REVISION, SUBMITTED in active list
                // CONFIRMED and CLOSED sheets are converted to SalesOrders or History
                setOrderSheets(sheets.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))

                // Filter sales orders based on page
                const historyStatuses = ['SHIPPED', 'COMPLETED', 'DELIVERED', 'CANCELLED']

                if (isHistoryPage) {
                    setSalesOrders(orders.filter(o => historyStatuses.includes(o.status))
                        .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
                } else {
                    setSalesOrders(orders.filter(o => !historyStatuses.includes(o.status))
                        .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
                }

            } catch (err) {
                console.error('Failed to load orders:', err)
            } finally {
                setLoading(false)
            }
        }

        loadOrders()
    }, [user, isHistoryPage])

    const formatDate = (ts: any) => {
        if (!ts) return '-'
        return ts.toDate().toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CREATED': return <span className="status-pill created">주문확정 (준비중)</span>
            case 'PO_GENERATED': return <span className="status-pill po-generated">상품 준비중</span>
            case 'SHIPPED': return <span className="status-pill shipped">배송중</span>
            case 'COMPLETED': return <span className="status-pill completed">배송완료</span>
            default: return <span className="status-pill">{status}</span>
        }
    }

    if (loading) return <div className="p-10 text-center">불러오는 중...</div>

    return (
        <div className="customer-order-list">
            <header className="section-header">
                <h2>{isHistoryPage ? '주문 내역' : '내 주문 관리'}</h2>
                <p>{isHistoryPage
                    ? '지난 주문 내역과 배송 완료된 건들을 확인합니다.'
                    : '작성 필요한 주문서와 현재 진행중인 주문입니다.'}
                </p>
            </header>

            {/* Active Page: Show Order Sheets */}
            {!isHistoryPage && (
                <section className="order-section">
                    <div className="section-title">
                        <ClipboardListIcon size={20} />
                        <h3>주문서 현황</h3>
                    </div>

                    <div className="sheet-grid">
                        {/* 1. Action Required: SENT, REVISION */}
                        {orderSheets
                            .filter(s => s.status === 'SENT' || s.status === 'REVISION')
                            .map(sheet => (
                                <div key={sheet.id} className="sheet-card glass-card animate-fade-in action-required" onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}>
                                    <div className={`card-status ${sheet.status === 'REVISION' ? 'badge-error' : 'badge-primary'}`}>
                                        {sheet.status === 'REVISION' ? '⚠️ 수정요청' : '🆕 작성필요'}
                                    </div>
                                    <div className="card-body">
                                        <p className="order-id">#{sheet.id.slice(0, 8)}</p>
                                        <h4>{sheet.customerName} 주문장</h4>
                                        <div className="meta-info">
                                            <span><ClockIcon size={14} /> 마감: {formatDate(sheet.cutOffAt)}</span>
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <span className="action-text">작성하기</span>
                                        <ChevronRightIcon size={18} />
                                    </div>
                                </div>
                            ))}

                        {/* 2. Pending Approval: SUBMITTED */}
                        {orderSheets
                            .filter(s => s.status === 'SUBMITTED')
                            .map(sheet => (
                                <div key={sheet.id} className="sheet-card glass-card opacity-card">
                                    <div className="card-status badge-warning">
                                        ⏳ 관리자 확인중
                                    </div>
                                    <div className="card-body">
                                        <p className="order-id">#{sheet.id.slice(0, 8)}</p>
                                        <h4>{sheet.customerName} 주문장</h4>
                                        <div className="meta-info">
                                            <span>제출됨: {formatDate(sheet.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <div className="card-footer" style={{ color: 'var(--text-muted)' }}>
                                        <span className="text-sm">승인 대기중...</span>
                                    </div>
                                </div>
                            ))}

                        {orderSheets.filter(s => ['SENT', 'REVISION', 'SUBMITTED'].includes(s.status)).length === 0 && (
                            <div className="empty-state glass-card w-full col-span-full">
                                <p>현재 대기중인 주문서가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Sales Orders List */}
            <section className="order-section mt-10">
                <div className="section-title">
                    {isHistoryPage ? <TruckIcon size={20} /> : <CheckCircleIcon size={20} />}
                    <h3>{isHistoryPage ? '지난 주문 내역' : '진행 중인 주문 (확정됨)'}</h3>
                </div>

                <div className="order-history-list glass-card">
                    {salesOrders.length > 0 ? (
                        <table className="order-table">
                            <thead>
                                <tr>
                                    <th>주문일시</th>
                                    <th>주문번호</th>
                                    <th>품목/중량</th>
                                    <th>금액</th>
                                    <th>상태</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesOrders.map(order => (
                                    <tr key={order.id} onClick={() => navigate(isHistoryPage ? `/order/tracking?id=${order.id}` : '#')} style={{ cursor: isHistoryPage ? 'pointer' : 'default' }}>
                                        <td>{formatDate(order.createdAt)}</td>
                                        <td className="font-semibold">#{order.id.slice(0, 8)}</td>
                                        <td>
                                            <span className="text-secondary">{order.totalsKg.toFixed(1)} kg</span>
                                        </td>
                                        <td>₩{order.totalsAmount.toLocaleString()}</td>
                                        <td>
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td>{isHistoryPage && <ChevronRightIcon size={16} />}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-10 text-center text-muted">
                            {isHistoryPage ? '지난 주문 내역이 없습니다.' : '현재 진행 중인 주문이 없습니다.'}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
