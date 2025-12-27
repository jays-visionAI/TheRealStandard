import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    DashboardIcon,
    PackageIcon,
    TruckIcon,
    ClipboardListIcon,
    LogOutIcon,
    MessageCircleIcon
} from '../components/Icons'
import { addKakaoChannel } from '../lib/kakaoService'
import './WarehouseLayout.css'

const navigation = [
    {
        label: '대시보드',
        path: '/warehouse',
        iconKey: 'dashboard',
    },
    {
        label: '입고 관리',
        iconKey: 'receive',
        children: [
            { label: '반입 대기', path: '/warehouse/receive' },
            { label: '반입 완료 내역', path: '/warehouse/receive/history' },
        ],
    },
    {
        label: '출고 관리',
        iconKey: 'release',
        children: [
            { label: '출고 대기', path: '/warehouse/release' },
            { label: '출고 완료 내역', path: '/warehouse/release/history' },
        ],
    },
    {
        label: '배송 현황',
        path: '/warehouse/shipments',
        iconKey: 'shipments',
    },
]

const iconComponents: Record<string, React.FC<{ size?: number; className?: string }>> = {
    dashboard: DashboardIcon,
    receive: PackageIcon,
    release: ClipboardListIcon,
    shipments: TruckIcon,
}

export default function WarehouseLayout() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="warehouse-layout">
            {/* Sidebar */}
            <aside className="warehouse-sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-text">
                            <span className="logo-title">TRS</span>
                            <span className="logo-subtitle">WAREHOUSE</span>
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
                                end={item.path === '/warehouse'}
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
                                user?.name?.charAt(0) || 'W'
                            )}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.name || '창고직원'}</span>
                            <span className="user-role">{user?.role || 'WAREHOUSE'}</span>
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
            <main className="warehouse-main">
                <header className="warehouse-header">
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

                <div className="warehouse-content">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

function getPageTitle(pathname: string): string {
    const titles: Record<string, string> = {
        '/warehouse': '물류창고 대시보드',
        '/warehouse/receive': '반입 대기',
        '/warehouse/receive/history': '반입 완료 내역',
        '/warehouse/release': '출고 대기',
        '/warehouse/release/history': '출고 완료 내역',
        '/warehouse/shipments': '배송 현황',
    }
    return titles[pathname] || '물류창고 관리'
}
