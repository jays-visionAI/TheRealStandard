import { useState } from 'react'
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    DashboardIcon,
    PackageIcon,
    ClipboardListIcon,
    TruckIcon,
    LogOutIcon,
    UserIcon,
    ClipboardCheckIcon
} from '../components/Icons'
import { LogoSmall } from '../components/Logo'
import './FrontLayout.css'

export default function FrontLayout() {
    const { user, logout } = useAuth()
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogoutClick = () => {
        setShowLogoutModal(true)
    }

    const confirmLogout = async () => {
        await logout()
        navigate('/login')
    }

    const getMenus = () => {
        if (user?.role === '3PL') {
            return [
                { path: '/order/dashboard', label: '대시보드', icon: <DashboardIcon size={20} /> },
                { path: '/order/fleet', label: '차량/기사 관리', icon: <UserIcon size={20} /> },
                { path: '/order/tracking', label: '배송 현황', icon: <TruckIcon size={20} /> },
            ]
        }
        return [
            { path: '/order/dashboard', label: '대시보드', icon: <DashboardIcon size={20} /> },
            { path: '/order/catalog', label: '상품 카탈로그', icon: <PackageIcon size={20} /> },
            { path: '/order/list', label: '발주서', icon: <ClipboardListIcon size={20} /> },
            { path: '/order/history', label: '발주 내역', icon: <ClipboardCheckIcon size={20} /> },
            { path: '/order/tracking', label: '배송 현황', icon: <TruckIcon size={20} /> },
        ]
    }

    const menus = getMenus()

    return (
        <div className="front-layout-v2">
            {/* Sidebar - Only shown for logged in users with an organization */}
            {user && user.orgId && (
                <aside className="front-sidebar glass-card">
                    <div className="sidebar-header">
                        <LogoSmall />
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
                            <button className="logout-btn" onClick={handleLogoutClick} title="로그아웃">
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
                        <span>MEATGO</span>
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
                    <p>© 2026 MEATGO Solution. All rights reserved. | 1588-0000</p>
                </footer>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
                    <div className="modal logout-confirmation-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-body text-center py-8">
                            <div className="logout-icon-circle mb-6 mx-auto flex items-center justify-center bg-blue-50 rounded-full w-20 h-20">
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
