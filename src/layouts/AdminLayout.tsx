import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    DashboardIcon,
    UsersIcon,
    PackageIcon,
    ClipboardListIcon,
    WalletIcon,
    SettingsIcon,
    BookOpenIcon,
} from '../components/Icons'
import './AdminLayout.css'

// 아이콘 매핑
const iconComponents: Record<string, React.FC<{ size?: number; className?: string }>> = {
    dashboard: DashboardIcon,
    users: UsersIcon,
    products: PackageIcon,
    orders: ClipboardListIcon,
    transactions: WalletIcon,
    settings: SettingsIcon,
    docs: BookOpenIcon,
}

const navigation = [
    {
        label: '대시보드',
        path: '/admin',
        iconKey: 'dashboard',
    },
    {
        label: 'Document Hub',
        path: '/admin/documents',
        iconKey: 'docs',
    },
    {
        label: 'Users',
        iconKey: 'users',
        children: [
            { label: '전체 사용자 리스트', path: '/admin/users' },
            { label: '고객사 (구매처)', path: '/admin/users/customers' },
            { label: '공급거래처', path: '/admin/users/suppliers' },
            { label: '회계팀 계정', path: '/admin/users/accounting' },
            { label: '물류팀 계정', path: '/admin/users/warehouse' },
            { label: '영업팀 계정', path: '/admin/users/sales' },
        ],
    },
    {
        label: 'Products',
        path: '/admin/products',
        iconKey: 'products',
    },
    {
        label: 'Order Book',
        iconKey: 'orders',
        children: [
            { label: '주문장 목록', path: '/admin/order-sheets' },
            { label: '주문장 생성', path: '/admin/order-sheets/create' },
            { label: '확정주문', path: '/admin/sales-orders' },
        ],
    },
    {
        label: '거래내역',
        iconKey: 'transactions',
        children: [
            { label: '발주 관리', path: '/admin/purchase-orders' },
            { label: '배송 목록', path: '/admin/shipments' },
            { label: '정산 현황', path: '/admin/transactions' },
        ],
    },
    {
        label: 'Settings',
        iconKey: 'settings',
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
                        <div className="logo-text">
                            <span className="logo-title">TRS</span>
                            <span className="logo-subtitle">THE REAL STANDARD</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navigation.map((item) => {
                        const IconComponent = iconComponents[item.iconKey]
                        return item.children ? (
                            <div key={item.label} className="nav-group">
                                <div className="nav-group-title">
                                    <span className="nav-icon">
                                        {IconComponent && <IconComponent size={18} />}
                                    </span>
                                    {item.label}
                                </div>
                                <div className="nav-group-items">
                                    {item.children.map((child) => (
                                        <NavLink
                                            key={child.path}
                                            to={child.path}
                                            end
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
                                to={item.path!}
                                end={item.path === '/admin'}
                                className={({ isActive }) =>
                                    `nav-link nav-link-single ${isActive ? 'active' : ''}`
                                }
                            >
                                <span className="nav-icon">
                                    {IconComponent && <IconComponent size={18} />}
                                </span>
                                {item.label}
                            </NavLink>
                        )
                    })}
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
        '/admin/documents': 'Document Hub (지식 창고)',
        // Users
        '/admin/users': '전체 사용자 계정 관리',
        '/admin/users/customers': '고객사 (구매처) 마스터',
        '/admin/users/suppliers': '공급거래처 마스터',
        '/admin/users/accounting': '회계팀 사용자 관리',
        '/admin/users/warehouse': '물류팀 사용자 관리',
        '/admin/users/sales': '영업팀 사용자 관리',
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
