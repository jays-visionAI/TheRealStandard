import { useState, useEffect } from 'react'
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
import { LogoSmall } from '../components/Logo'
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
        label: '상품관리',
        iconKey: 'products',
        children: [
            { label: '상품리스트', path: '/admin/products/b2b' },
            { label: '단가표', path: '/admin/products/price-lists' },
        ],
    },
    {
        label: '발주 관리',
        iconKey: 'orders',
        children: [
            { label: '매출발주(고객용) 목록', path: '/admin/order-sheets' },
            { label: '매입발주(공급사용) 목록', path: '/admin/purchase-orders' },
            { label: '확정주문(매출)', path: '/admin/sales-orders' },
            { label: '확정주문(매입)', path: '/admin/confirmed-purchase-orders' },
        ],
    },
    {
        label: '물류/배송',
        iconKey: 'transactions',
        children: [
            { label: '배송 목록', path: '/admin/shipments' },
            { label: '정산 현황', path: '/admin/transactions' },
        ],
    },
    {
        label: 'Users',
        iconKey: 'users',
        children: [
            { label: '전체 유저 리스트', path: '/admin/users/list' },
            { label: 'Staff Setting (임직원)', path: '/admin/users/staff' },
            { label: '고객사 (구매처) 관리', path: '/admin/users/customers' },
            { label: '공급 거래처 관리', path: '/admin/users/suppliers' },
            { label: '배송업체 관리', path: '/admin/users/carriers' },
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
            { label: 'LLM 설정', path: '/admin/settings/llm' },
        ],
    },
]

export default function AdminLayout() {
    const { user, logout } = useAuth()
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogoutClick = () => {
        setShowLogoutModal(true)
    }

    const confirmLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <div className="logo p-2">
                        <LogoSmall />
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
                        <div className="user-details flex-1">
                            <span className="user-name">{user?.name || '관리자'}</span>
                            <span className="user-role">{user?.role || 'ADMIN'}</span>
                        </div>
                        <button className="logout-btn" onClick={handleLogoutClick} title="로그아웃">
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

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
                    <div className="modal logout-confirmation-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-body text-center py-8">
                            <div className="logout-icon-circle mb-6 mx-auto flex items-center justify-center bg-slate-100 rounded-full w-20 h-20">
                                <LogOutIcon size={32} color="var(--color-primary)" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">로그아웃 하시겠습니까?</h3>
                            <p className="text-secondary mb-8">안전하게 로그아웃하고 나중에 다시 시작하세요.</p>

                            <div className="modal-actions-horizontal">
                                <button
                                    className="btn btn-secondary w-full"
                                    onClick={() => setShowLogoutModal(false)}
                                >
                                    취소
                                </button>
                                <button
                                    className="btn btn-primary w-full"
                                    onClick={confirmLogout}
                                >
                                    로그아웃
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function getPageTitle(pathname: string): string {
    const titles: Record<string, string> = {
        '/admin': '대시보드',
        '/admin/documents': 'Document Hub (지식 창고)',
        // Users
        '/admin/users/list': '전체 유저 리스트',
        '/admin/users': '유저 관리',
        '/admin/users/staff': '임직원 계정 및 권한 관리',
        '/admin/users/customers': '고객사 (구매처) 마스터',
        '/admin/users/suppliers': '공급거래처 마스터',
        '/admin/users/carriers': '배송업체 마스터',
        // Products
        '/admin/products/b2b': '상품 리스트',
        '/admin/products/price-lists': '단가표 관리',
        // Order Book
        '/admin/order-sheets': '발주서 목록',
        '/admin/order-sheets/create': '발주서 생성',
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
        '/admin/settings/llm': 'LLM API 및 모델 설정',
    }
    if (pathname.includes('/order-sheets/') && pathname.endsWith('/review')) {
        return '발주서 검토'
    }
    return titles[pathname] || 'MEATGO 물류관리'
}
