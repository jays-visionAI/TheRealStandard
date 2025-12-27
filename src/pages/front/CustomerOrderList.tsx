import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
    ClockIcon
} from '../../components/Icons'
import './CustomerOrderList.css'

export default function CustomerOrderList() {
    const { user } = useAuth()
    const navigate = useNavigate()
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

                setOrderSheets(sheets.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
                setSalesOrders(orders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
            } catch (err) {
                console.error('Failed to load orders:', err)
            } finally {
                setLoading(false)
            }
        }

        loadOrders()
    }, [user])

    const formatDate = (ts: any) => {
        if (!ts) return '-'
        return ts.toDate().toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) return <div className="p-10 text-center">불러오는 중...</div>

    return (
        <div className="customer-order-list">
            <header className="section-header">
                <h2>내 주문 관리</h2>
                <p>TRS에서 발송한 주문서와 진행중인 주문 내역입니다.</p>
            </header>

            {/* Pending Order Sheets */}
            <section className="order-section">
                <div className="section-title">
                    <ClipboardListIcon size={20} />
                    <h3>새로운 주문서 (작성 필요)</h3>
                </div>

                <div className="sheet-grid">
                    {orderSheets.filter(s => s.status === 'SENT' || s.status === 'REVISION').length > 0 ? (
                        orderSheets
                            .filter(s => s.status === 'SENT' || s.status === 'REVISION')
                            .map(sheet => (
                                <div key={sheet.id} className="sheet-card glass-card animate-fade-in" onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}>
                                    <div className="card-status badge-primary">
                                        {sheet.status === 'REVISION' ? '⚠️ 수정요청' : '🆕 뉴 주문서'}
                                    </div>
                                    <div className="card-body">
                                        <p className="order-id">#{sheet.id.slice(0, 8)}</p>
                                        <h4>{sheet.customerName} 주문장</h4>
                                        <div className="meta-info">
                                            <span><ClockIcon size={14} /> 마감: {formatDate(sheet.cutOffAt)}</span>
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <span className="action-text">주문서 작성하기</span>
                                        <ChevronRightIcon size={18} />
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div className="empty-state glass-card">
                            <p>입력 대기 중인 주문서가 없습니다.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Recent Orders (Sales Orders) */}
            <section className="order-section mt-10">
                <div className="section-title">
                    <CheckCircleIcon size={20} />
                    <h3>진행 중인 주문</h3>
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
                                    <tr key={order.id} onClick={() => navigate(`/order/tracking?id=${order.id}`)}>
                                        <td>{formatDate(order.createdAt)}</td>
                                        <td className="font-semibold">#{order.id.slice(0, 8)}</td>
                                        <td>
                                            <span className="text-secondary">{order.totalsKg.toFixed(1)} kg</span>
                                        </td>
                                        <td>₩{order.totalsAmount.toLocaleString()}</td>
                                        <td>
                                            <span className={`status-pill ${order.status.toLowerCase()}`}>
                                                {order.status === 'CREATED' ? '주문접수' : order.status}
                                            </span>
                                        </td>
                                        <td><ChevronRightIcon size={16} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-10 text-center text-muted">
                            진행 중인 주문이 없습니다.
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
