import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    getOrderSheetsByCustomer,
    getSalesOrdersByCustomer,
    type FirestoreOrderSheet
} from '../../lib/orderService'
import {
    ClipboardListIcon,
    PackageIcon,
    TruckIcon,
    TrendingUpIcon,
    ChevronRightIcon
} from '../../components/Icons'
import './CustomerDashboard.css'

export default function CustomerDashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        pendingSheets: 0,
        activeOrders: 0,
        completedMonth: 0,
        totalSpentMonth: 0
    })
    const [recentSheets, setRecentSheets] = useState<FirestoreOrderSheet[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            if (!user?.orgId) {
                setLoading(false)
                return
            }

            try {
                const [sheets, orders] = await Promise.all([
                    getOrderSheetsByCustomer(user.orgId),
                    getSalesOrdersByCustomer(user.orgId)
                ])

                const pending = sheets.filter(s => s.status === 'SENT' || s.status === 'REVISION')
                const active = orders.filter(o => o.status !== 'COMPLETED')

                const now = new Date()
                const thisMonthOrders = orders.filter(o => {
                    const d = o.createdAt.toDate()
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                })

                setStats({
                    pendingSheets: pending.length,
                    activeOrders: active.length,
                    completedMonth: thisMonthOrders.length,
                    totalSpentMonth: thisMonthOrders.reduce((sum, o) => sum + o.totalsAmount, 0)
                })

                setRecentSheets(pending.slice(0, 3))
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    if (loading) return <div className="p-10 text-center">Loading...</div>

    return (
        <div className="customer-dashboard">
            <header className="dashboard-header">
                <h2>반갑습니다, {user?.name}님! 👋</h2>
                <p>오늘의 주문 현황과 소식을 확인하세요.</p>
            </header>

            <div className="stats-container">
                <div className="stat-card glass-card accent-blue" onClick={() => navigate('/order/list')}>
                    <div className="stat-icon"><ClipboardListIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="label">작성 대기 주문서</span>
                        <span className="value">{stats.pendingSheets}건</span>
                    </div>
                </div>
                <div className="stat-card glass-card accent-orange" onClick={() => navigate('/order/tracking')}>
                    <div className="stat-icon"><TruckIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="label">진행 중인 배송</span>
                        <span className="value">{stats.activeOrders}건</span>
                    </div>
                </div>
                <div className="stat-card glass-card accent-green" onClick={() => navigate('/order/history')}>
                    <div className="stat-icon"><TrendingUpIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="label">이달의 주문 금액</span>
                        <span className="value">₩{(stats.totalSpentMonth / 10000).toFixed(0)}<small>만원</small></span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="grid-section glass-card">
                    <div className="section-header">
                        <h3>⚡ 바로 작성하기</h3>
                        <Link to="/order/list" className="view-all">모두 보기 <ChevronRightIcon size={14} /></Link>
                    </div>
                    <div className="pending-list">
                        {recentSheets.length > 0 ? (
                            recentSheets.map(sheet => (
                                <div key={sheet.id} className="pending-item" onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}>
                                    <div className="item-icon"><PackageIcon size={20} /></div>
                                    <div className="item-info">
                                        <p className="item-title">{sheet.customerName} 주문서</p>
                                        <p className="item-meta">마감: {sheet.cutOffAt.toDate().toLocaleDateString()}</p>
                                    </div>
                                    <button className="item-btn">작성 <ChevronRightIcon size={14} /></button>
                                </div>
                            ))
                        ) : (
                            <div className="empty-message">작성할 주문서가 없습니다.</div>
                        )}
                    </div>
                </div>

                <div className="grid-section glass-card">
                    <div className="section-header">
                        <h3>📚 상품 추천</h3>
                        <Link to="/order/catalog" className="view-all">카탈로그 <ChevronRightIcon size={14} /></Link>
                    </div>
                    <div className="catalog-preview">
                        <p className="preview-text">최신 육류 상품 리스트와 가격을 확인하세요.</p>
                        <button className="btn btn-primary w-full" onClick={() => navigate('/order/catalog')}>
                            카탈로그 열기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
