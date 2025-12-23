import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AdminLayout.css'

const navigation = [
    {
        label: '대시보드',
        path: '/admin',
        icon: '📊',
    },
    {
        label: 'Users',
        icon: '👥',
        children: [
            { label: '고객사 (거래처)', path: '/admin/users/customers' },
            { label: '회계팀', path: '/admin/users/accounting' },
            { label: '물류팀', path: '/admin/users/warehouse' },
            { label: '영업팀', path: '/admin/users/sales' },
        ],
    },
    {
        label: 'Products',
        path: '/admin/products',
        icon: '📦',
    },
    {
        label: 'Order Book',
        icon: '📋',
        children: [
            { label: '주문장 목록', path: '/admin/order-sheets' },
            { label: '주문장 생성', path: '/admin/order-sheets/create' },
            { label: '확정주문', path: '/admin/sales-orders' },
        ],
    },
    {
        label: '거래내역',
        icon: '💰',
        children: [
            { label: '발주 관리', path: '/admin/purchase-orders' },
            { label: '배송 목록', path: '/admin/shipments' },
            { label: '정산 현황', path: '/admin/transactions' },
        ],
    },
    {
        label: 'Settings',
        icon: '⚙️',
        children: [
            { label: '카탈로그 관리', path: '/admin/settings/catalogs' },
            { label: '차량 타입', path: '/admin/settings/vehicles' },
            { label: '문서 관리', path: '/admin/settings/documents' },
            { label: '물류 게이트', path: '/admin/settings/warehouse' },
        ],
    },
]

export default function AdminLayout() {
    const { user } = useAuth()
    const location = useLocation()

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">🥩</span>
                        <div className="logo-text">
                            <span className="logo-title">TRS</span>
                            <span className="logo-subtitle">물류 주문관리 솔루션</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navigation.map((item) =>
                        item.children ? (
                            <div key={item.label} className="nav-group">
                                <div className="nav-group-title">
                                    <span className="nav-icon">{item.icon}</span>
                                    {item.label}
                                </div>
                                <div className="nav-group-items">
                                    {item.children.map((child) => (
                                        <NavLink
                                            key={child.path}
                                            to={child.path}
                                            className={({ isActive }) =>
                                                `nav-link ${isActive ? 'active' : ''}`
                                            }
                                        >
                                            {child.label}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/admin'}
                                className={({ isActive }) =>
                                    `nav-link nav-link-single ${isActive ? 'active' : ''}`
                                }
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        )
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.name || '관리자'}</span>
                            <span className="user-role">{user?.role || 'ADMIN'}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="header-title">
                        {getPageTitle(location.pathname)}
                    </div>
                    <div className="header-actions">
                        <div className="header-time">
                            {new Date().toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                            })}
                        </div>
                    </div>
                </header>

                <div className="admin-content">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

function getPageTitle(pathname: string): string {
    const titles: Record<string, string> = {
        '/admin': '대시보드',
        // Users
        '/admin/users/customers': '고객사 (거래처) 관리',
        '/admin/users/accounting': '회계팀 관리',
        '/admin/users/warehouse': '물류팀 관리',
        '/admin/users/sales': '영업팀 관리',
        // Products
        '/admin/products': '상품 마스터',
        // Order Book
        '/admin/order-sheets': '주문장 목록',
        '/admin/order-sheets/create': '주문장 생성',
        '/admin/sales-orders': '확정주문 목록',
        // 거래내역
        '/admin/purchase-orders': '발주 관리',
        '/admin/shipments': '배송 목록',
        '/admin/transactions': '정산 현황',
        // Settings
        '/admin/settings/catalogs': '카탈로그 관리',
        '/admin/settings/vehicles': '차량 타입 설정',
        '/admin/settings/documents': '문서 관리',
        '/admin/settings/warehouse': '물류 게이트',
    }
    return titles[pathname] || 'TRS 물류관리'
}
