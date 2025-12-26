import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardListIcon, PencilIcon, FilesIcon, TruckDeliveryIcon, FactoryIcon, FilePlusIcon } from '../../components/Icons'
import './Dashboard.css'

interface DashboardStats {
    pendingOrders: number
    revisionRequested: number
    documentsWaiting: number
    dispatchPending: number
    todayShipments: number
    todayAmount: number
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        pendingOrders: 0,
        revisionRequested: 0,
        documentsWaiting: 0,
        dispatchPending: 0,
        todayShipments: 0,
        todayAmount: 0,
    })

    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [recentShipments, setRecentShipments] = useState<any[]>([])

    useEffect(() => {
        // 프로토타입용 목업 데이터 제거
        setStats({
            pendingOrders: 0,
            revisionRequested: 0,
            documentsWaiting: 0,
            dispatchPending: 0,
            todayShipments: 0,
            todayAmount: 0,
        })

        setRecentOrders([])
        setRecentShipments([])
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; class: string }> = {
            SUBMITTED: { label: '제출됨', class: 'badge-primary' },
            REVISION: { label: '수정요청', class: 'badge-warning' },
            CONFIRMED: { label: '확정', class: 'badge-success' },
            PREPARING: { label: '준비중', class: 'badge-secondary' },
            IN_TRANSIT: { label: '배송중', class: 'badge-primary' },
            DELIVERED: { label: '배송완료', class: 'badge-success' },
        }
        const { label, class: className } = statusMap[status] || { label: status, class: 'badge-secondary' }
        return <span className={`badge ${className}`}>{label}</span>
    }

    return (
        <div className="dashboard">
            {/* Stats Grid */}
            <div className="stats-grid">
                <Link to="/admin/order-sheets" className="stat-card glass-card">
                    <div className="stat-icon"><ClipboardListIcon size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pendingOrders}</div>
                        <div className="stat-label">미검토 주문</div>
                    </div>
                    <div className="stat-indicator pending"></div>
                </Link>

                <Link to="/admin/order-sheets" className="stat-card glass-card">
                    <div className="stat-icon"><PencilIcon size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.revisionRequested}</div>
                        <div className="stat-label">수정요청 대기</div>
                    </div>
                    <div className="stat-indicator warning"></div>
                </Link>

                <Link to="/admin/documents" className="stat-card glass-card">
                    <div className="stat-icon"><FilesIcon size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.documentsWaiting}</div>
                        <div className="stat-label">문서 매칭 대기</div>
                    </div>
                    <div className="stat-indicator info"></div>
                </Link>

                <Link to="/admin/shipments" className="stat-card glass-card">
                    <div className="stat-icon"><TruckDeliveryIcon size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.dispatchPending}</div>
                        <div className="stat-label">배차 미입력</div>
                    </div>
                    <div className="stat-indicator error"></div>
                </Link>
            </div>

            {/* Summary Row */}
            <div className="summary-row">
                <div className="summary-card glass-card">
                    <div className="summary-header">
                        <h3>오늘의 배송</h3>
                        <span className="summary-badge">{stats.todayShipments}건</span>
                    </div>
                    <div className="summary-value gradient-text">
                        {formatCurrency(stats.todayAmount)}
                    </div>
                    <p className="summary-note">총 출고 금액</p>
                </div>

                <div className="summary-card glass-card quick-actions">
                    <h3>빠른 작업</h3>
                    <div className="action-buttons">
                        <Link to="/admin/order-sheets/create" className="btn btn-primary">
                            + 주문장 생성
                        </Link>
                        <Link to="/admin/documents" className="btn btn-secondary">
                            <FilePlusIcon size={16} /> 문서 업로드
                        </Link>
                        <Link to="/admin/warehouse" className="btn btn-secondary">
                            <FactoryIcon size={16} /> 물류 게이트
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tables Row */}
            <div className="tables-row">
                {/* Recent Orders */}
                <div className="table-section glass-card">
                    <div className="section-header">
                        <h3>최근 주문</h3>
                        <Link to="/admin/order-sheets" className="btn btn-ghost btn-sm">
                            전체보기 →
                        </Link>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>주문번호</th>
                                    <th>고객사</th>
                                    <th>상태</th>
                                    <th>금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="font-medium">{order.id}</td>
                                        <td>{order.customer}</td>
                                        <td>{getStatusBadge(order.status)}</td>
                                        <td>{formatCurrency(order.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Shipments */}
                <div className="table-section glass-card">
                    <div className="section-header">
                        <h3>오늘 배송</h3>
                        <Link to="/admin/shipments" className="btn btn-ghost btn-sm">
                            전체보기 →
                        </Link>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>배송번호</th>
                                    <th>고객사</th>
                                    <th>상태</th>
                                    <th>ETA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentShipments.map((shipment) => (
                                    <tr key={shipment.id}>
                                        <td className="font-medium">{shipment.id}</td>
                                        <td>{shipment.customer}</td>
                                        <td>{getStatusBadge(shipment.status)}</td>
                                        <td>{shipment.eta}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
