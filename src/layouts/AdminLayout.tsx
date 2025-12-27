import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    DashboardIcon,
    UsersIcon,
    PackageIcon,
    ClipboardListIcon,
    WalletIcon,
    SettingsIcon,
    BookOpenIcon,
    MessageCircleIcon,
    LogOutIcon
} from '../components/Icons'
import { addKakaoChannel } from '../lib/kakaoService'
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
            { label: 'Staff Setting (임직원)', path: '/admin/users/staff' },
            { label: '고객사 (구매처) 관리', path: '/admin/users/customers' },
            { label: '공급 거래처 관리', path: '/admin/users/suppliers' },
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
            { label: 'API 설정', path: '/admin/settings/system' },
        ],
    },
]

export default function AdminLayout() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

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
                    <div className="kakao-channel-section mb-4 px-3">
                        <button
                            className="btn btn-kakao btn-sm w-full"
                            onClick={() => addKakaoChannel()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                borderRadius: '8px',
                                padding: '10px'
                            }}
                        >
                            <MessageCircleIcon size={16} /> 24시 관제 채널
                        </button>
                    </div>
                    <div className="user-info">
                        <div className="user-avatar overflow-hidden">
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.charAt(0) || 'A'
                            )}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.name || '관리자'}</span>
                            <span className="user-role">{user?.role || 'ADMIN'}</span>
                        </div>
                        <button
                            className="logout-btn"
                            onClick={handleLogout}
                            title="로그아웃"
                        >
                            <LogOutIcon size={18} />
                        </button>
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
        '/admin/users/staff': '임직원 계정 및 권한 관리',
        '/admin/users/customers': '고객사 (구매처) 마스터',
        '/admin/users/suppliers': '공급거래처 마스터',
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
        '/admin/settings/warehouse': '물류 게이트 세팅',
        '/admin/settings/system': '시스템 API 설정',
    }
    return titles[pathname] || 'TRS 물류관리'
}
