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
    PackageIcon,
    AlertTriangleIcon,
    HourglassIcon
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

                setOrderSheets(sheets.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))

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

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>데이터를 불러오는 중입니다...</p>
        </div>
    )

    // Filter sheets by status for Active Page
    const writingSheets = orderSheets.filter(s => s.status === 'SENT' || s.status === 'REVISION')
    const pendingSheets = orderSheets.filter(s => s.status === 'SUBMITTED')

    return (
        <div className="customer-order-list">
            <header className="section-header">
                <h2>{isHistoryPage ? '주문 내역' : '내 주문 관리'}</h2>
                <p>{isHistoryPage
                    ? '지난 주문 내역과 배송 완료된 건들을 확인합니다.'
                    : '작성 필요한 주문서와 현재 진행중인 주문 현황입니다.'}
                </p>
            </header>

            {!isHistoryPage && (
                <>
                    {/* 1. 작성할 주문서 (SENT, REVISION) */}
                    <section className="order-section">
                        <div className="section-title">
                            <ClipboardListIcon size={20} color="#3b82f6" />
                            <h3>작성할 주문서 <span className="count-badge">{writingSheets.length}</span></h3>
                        </div>

                        <div className="sheet-grid">
                            {writingSheets.map(sheet => (
                                <div
                                    key={sheet.id}
                                    className={`sheet-card glass-card animate-fade-in ${sheet.status === 'REVISION' ? 'status-revision' : 'status-sent'}`}
                                    onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}
                                >
                                    <div className="card-status-bubble">
                                        {sheet.status === 'REVISION' ? (
                                            <><AlertTriangleIcon size={14} /> 수정요청</>
                                        ) : (
                                            <><PackageIcon size={14} /> 신규작성</>
                                        )}
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
                            ))}

                            {writingSheets.length === 0 && (
                                <div className="empty-state-mini glass-card">
                                    <p>현재 작성할 주문서가 없습니다.</p>
                                </div>
                            )}
                        </div>

                        {/* List View for Writing Sheets */}
                        {writingSheets.length > 0 && (
                            <div className="order-list-view glass-card mt-6">
                                <div className="list-view-header">
                                    <h4>주문서 목록</h4>
                                </div>
                                <table className="order-table">
                                    <thead>
                                        <tr>
                                            <th>주문번호</th>
                                            <th>고객사</th>
                                            <th>마감일시</th>
                                            <th>상태</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {writingSheets.map(sheet => (
                                            <tr
                                                key={sheet.id}
                                                onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td className="font-mono font-medium text-primary">#{sheet.id.slice(0, 12)}</td>
                                                <td>{sheet.customerName}</td>
                                                <td>{formatDate(sheet.cutOffAt)}</td>
                                                <td>
                                                    {sheet.status === 'REVISION' ? (
                                                        <span className="status-pill revision">수정요청</span>
                                                    ) : (
                                                        <span className="status-pill sent">신규작성</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <button className="btn btn-sm btn-primary">작성하기</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* 2. 승인 대기 주문 (SUBMITTED) */}
                    <section className="order-section mt-12">
                        <div className="section-title">
                            <HourglassIcon size={20} color="#f59e0b" />
                            <h3>승인 대기 주문 <span className="count-badge warning">{pendingSheets.length}</span></h3>
                        </div>

                        <div className="sheet-grid">
                            {pendingSheets.map(sheet => (
                                <div key={sheet.id} className="sheet-card glass-card status-pending opacity-80">
                                    <div className="card-status-bubble pending">
                                        ⏳ 관리자 확인중
                                    </div>
                                    <div className="card-body">
                                        <p className="order-id">#{sheet.id.slice(0, 8)}</p>
                                        <h4>{sheet.customerName} 주문장</h4>
                                        <div className="meta-info">
                                            <span>제출일: {formatDate(sheet.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <span className="status-text italic text-gray-400">품목 및 수량 확인 중입니다...</span>
                                    </div>
                                </div>
                            ))}

                            {pendingSheets.length === 0 && (
                                <div className="empty-state-mini glass-card border-dashed">
                                    <p>승인 대기 중인 주문이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}

            {/* 3. 진행 중인 주문 / 지난 주문 내역 */}
            <section className="order-section mt-12">
                <div className="section-title">
                    {isHistoryPage ? <TruckIcon size={20} color="#6366f1" /> : <CheckCircleIcon size={20} color="#10b981" />}
                    <h3>{isHistoryPage ? '지난 주문 내역' : '진행 중인 주문 (확정됨)'} <span className="count-badge active">{salesOrders.length}</span></h3>
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
                                        <td className="order-link-cell">#{order.id.slice(0, 8)}</td>
                                        <td>
                                            <span className="weight-text">{order.totalsKg.toFixed(1)} kg</span>
                                        </td>
                                        <td className="amount-text">₩{order.totalsAmount.toLocaleString()}</td>
                                        <td>
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="text-right">{isHistoryPage && <ChevronRightIcon size={16} />}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-table-state">
                            <p>{isHistoryPage ? '지난 주문 내역이 없습니다.' : '현재 진행 중인 주문이 없습니다.'}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
