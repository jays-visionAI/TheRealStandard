import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    DashboardIcon,
    PackageIcon,
    ClipboardListIcon,
    TruckIcon,
    LogOutIcon,
    UserIcon,
    TRSLogo,
    ClipboardCheckIcon
} from '../components/Icons'
import './FrontLayout.css'

export default function FrontLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = async () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            await logout()
            navigate('/login')
        }
    }

    const menus = [
        { path: '/order/dashboard', label: '대시보드', icon: <DashboardIcon size={20} /> },
        { path: '/order/catalog', label: '상품 카탈로그', icon: <PackageIcon size={20} /> },
        { path: '/order/list', label: '내 주문장', icon: <ClipboardListIcon size={20} /> },
        { path: '/order/history', label: '주문 내역', icon: <ClipboardCheckIcon size={20} /> },
        { path: '/order/tracking', label: '배송 현황', icon: <TruckIcon size={20} /> },
    ]

    return (
        <div className="front-layout-v2">
            {/* Sidebar - Only shown for logged in users with an organization */}
            {user && user.orgId && (
                <aside className="front-sidebar glass-card">
                    <div className="sidebar-header">
                        <TRSLogo size={32} />
                        <div className="logo-text">
                            <span className="logo-title">TRS</span>
                            <span className="logo-subtitle">CUSTOMER</span>
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        {menus.map((menu) => (
                            <Link
                                key={menu.path}
                                to={menu.path}
                                className={`nav-item ${location.pathname === menu.path ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{menu.icon}</span>
                                <span className="nav-label">{menu.label}</span>
                            </Link>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <div className="user-profile">
                            <div className="user-info">
                                <p className="user-name">{user.name}</p>
                                <p className="user-email">{user.email}</p>
                            </div>
                            <button className="logout-btn" onClick={handleLogout} title="로그아웃">
                                <LogOutIcon size={18} />
                            </button>
                        </div>
                    </div>
                </aside>
            )}

            {/* Main Content Area */}
            <div className="front-main-container">
                <header className="front-top-header glass-card">
                    <div className="header-breadcrumbs">
                        <span>TRS</span>
                        <span className="separator">/</span>
                        <span className="current">고객 서비스</span>
                    </div>
                    {user && (
                        <div className="header-user-badge">
                            <span className="org-name">{user.orgId ? '회원 고객' : '비회원'}</span>
                        </div>
                    )}
                </header>

                <main className="front-content">
                    <Outlet />
                </main>

                <footer className="front-footer-v2">
                    <p>© 2024 TRS Solution. All rights reserved. | 02-1234-5678</p>
                </footer>
            </div>
        </div>
    )
}
