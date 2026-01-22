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
    const newSheets = orderSheets.filter(s => s.status === 'SENT')
    const revisionSheets = orderSheets.filter(s => s.status === 'REVISION')
    const pendingSheets = orderSheets.filter(s => s.status === 'SUBMITTED')

    return (
        <div className="customer-order-list">
            <header className="section-header">
                <h2>{isHistoryPage ? '발주 내역' : '내 발주서 관리'}</h2>
                <p>{isHistoryPage
                    ? '지난 발주 내역과 배송 완료된 건들을 확인합니다.'
                    : '작성 필요한 발주서와 현재 진행중인 발주 현황입니다.'}</p>
            </header>

            {!isHistoryPage && (
                <>
                    {/* 1. 작성할 발주서 (SENT) */}
                    <section className="order-section">
                        <div className="section-title">
                            <ClipboardListIcon size={20} color="#3b82f6" />
                            <h3>작성할 발주서 <span className="count-badge">{newSheets.length}</span></h3>
                        </div>

                        <div className="sheet-grid">
                            {newSheets.map(sheet => (
                                <div
                                    key={sheet.id}
                                    className="sheet-card glass-card animate-fade-in status-sent"
                                    onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}
                                >
                                    <div className="card-status-bubble">
                                        <PackageIcon size={14} /> 신규작성
                                    </div>
                                    <div className="card-body">
                                        <p className="order-id">#{sheet.id.slice(0, 8)}</p>
                                        <h4>{sheet.customerName} 발주서</h4>
                                        <div className="meta-info">
                                            <span><ClockIcon size={14} /> 마감: {formatDate(sheet.cutOffAt)}</span>
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <span className="action-text">발주서 작성하기</span>
                                        <ChevronRightIcon size={18} />
                                    </div>
                                </div>
                            ))}

                            {newSheets.length === 0 && (
                                <div className="empty-state-mini glass-card">
                                    <p>현재 작성할 발주서가 없습니다.</p>
                                </div>
                            )}
                        </div>

                        {/* List View for New Sheets */}
                        {newSheets.length > 0 && (
                            <div className="order-list-view glass-card mt-6">
                                <div className="list-view-header">
                                    <h4>발주서 목록</h4>
                                </div>
                                <table className="order-table">
                                    <thead>
                                        <tr>
                                            <th>발주번호</th>
                                            <th>고객사</th>
                                            <th>마감일시</th>
                                            <th>상태</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newSheets.map(sheet => (
                                            <tr
                                                key={sheet.id}
                                                onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td className="font-mono font-medium text-primary">#{sheet.id.slice(0, 12)}</td>
                                                <td>{sheet.customerName}</td>
                                                <td>{formatDate(sheet.cutOffAt)}</td>
                                                <td>
                                                    <span className="status-pill sent">신규작성</span>
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

                    {/* 2. 승인대기 발주 (SUBMITTED) */}
                    <section className="order-section mt-12">
                        <div className="section-title">
                            <HourglassIcon size={20} color="#f59e0b" />
                            <h3>승인대기 발주 <span className="count-badge warning">{pendingSheets.length}</span></h3>
                        </div>

                        <div className="sheet-grid">
                            {pendingSheets.map(sheet => (
                                <div key={sheet.id} className="sheet-card glass-card status-pending opacity-80">
                                    <div className="card-status-bubble pending">
                                        <HourglassIcon size={14} /> 관리자 확인중
                                    </div>
                                    <div className="card-body">
                                        <p className="order-id">#{sheet.id.slice(0, 8)}</p>
                                        <h4>{sheet.customerName} 발주서</h4>
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
                                    <p>승인 대기 중인 발주가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 3. 주문내역이 변경된 발주서 (REVISION) */}
                    {revisionSheets.length > 0 && (
                        <section className="order-section mt-12">
                            <div className="section-title">
                                <AlertTriangleIcon size={20} color="#ef4444" />
                                <h3>주문내역이 변경된 발주서 <span className="count-badge danger">{revisionSheets.length}</span></h3>
                            </div>

                            <div className="revision-alert glass-card mb-4" style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', borderColor: '#fca5a5', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <AlertTriangleIcon size={24} color="#ef4444" />
                                    <div>
                                        <p style={{ fontWeight: 600, color: '#dc2626', marginBottom: '0.25rem' }}>관리자가 품목/수량을 수정했습니다</p>
                                        <p style={{ fontSize: '0.875rem', color: '#b91c1c' }}>변경된 내역을 확인하고 다시 제출해주세요.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="sheet-grid">
                                {revisionSheets.map(sheet => (
                                    <div
                                        key={sheet.id}
                                        className="sheet-card glass-card animate-fade-in status-revision"
                                        onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}
                                        style={{ borderColor: '#f87171', borderWidth: '2px' }}
                                    >
                                        <div className="card-status-bubble" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' }}>
                                            <AlertTriangleIcon size={14} /> 수정요청
                                        </div>
                                        <div className="card-body">
                                            <p className="order-id">#{sheet.id.slice(0, 8)}</p>
                                            <h4>{sheet.customerName} 발주서</h4>
                                            <div className="meta-info">
                                                <span><ClockIcon size={14} /> 마감: {formatDate(sheet.cutOffAt)}</span>
                                            </div>
                                            {(sheet as any).revisionComment && (
                                                <div className="revision-comment" style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '8px', fontSize: '0.75rem', color: '#dc2626' }}>
                                                    <strong>수정사유:</strong> {(sheet as any).revisionComment}
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-footer" style={{ background: '#fef2f2' }}>
                                            <span className="action-text" style={{ color: '#dc2626', fontWeight: 600 }}>변경내역 확인 및 재제출</span>
                                            <ChevronRightIcon size={18} color="#dc2626" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* 4. 진행 중인 주문 / 지난 주문 내역 */}
            <section className="order-section mt-12">
                <div className="section-title">
                    {isHistoryPage ? <TruckIcon size={20} color="#6366f1" /> : <CheckCircleIcon size={20} color="#10b981" />}
                    <h3>{isHistoryPage ? '지난 발주 내역' : '진행 중인 발주 (확정됨)'} <span className="count-badge active">{salesOrders.length}</span></h3>
                </div>

                <div className="order-history-list glass-card">
                    {salesOrders.length > 0 ? (
                        <table className="order-table">
                            <thead>
                                <tr>
                                    <th>발주일시</th>
                                    <th>발주번호</th>
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
                            <p>{isHistoryPage ? '지난 발주 내역이 없습니다.' : '현재 진행 중인 발주가 없습니다.'}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
