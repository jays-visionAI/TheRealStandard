import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PackageIcon } from './Icons'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
    children: React.ReactNode
    allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth()
    const location = useLocation()

    // 로딩 중일 때
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner">
                    <PackageIcon size={32} className="spinner-icon" />
                    <span className="spinner-text">로딩 중...</span>
                </div>
            </div>
        )
    }

    // 로그인하지 않은 경우
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // 권한이 없는 경우
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // 역할에 따른 기본 페이지로 리다이렉트
        const defaultPath = getDefaultPathForRole(user.role)
        return <Navigate to={defaultPath} replace />
    }

    // 임시PW 사용 중인 사용자 — 비번 변경 강제
    // 거래처 계열은 /order/profile-setup (사업자정보 + 서류 + 비번)
    // 직원은 /account/profile (비번만)
    const externalRoles = ['CUSTOMER', 'SUPPLIER', '3PL']
    const isExternal = externalRoles.includes(user.role)
    const onboardingPath = isExternal ? '/order/profile-setup' : '/account/profile'

    if (user.mustChangePassword && location.pathname !== onboardingPath) {
        return <Navigate to={onboardingPath} replace />
    }

    // 거래처 계열 프로필 미완성 시 강제 온보딩
    if (isExternal && !user.business?.companyName && location.pathname !== '/order/profile-setup') {
        return <Navigate to="/order/profile-setup" replace />
    }

    return <>{children}</>
}

// 역할별 기본 경로
export function getDefaultPathForRole(role: UserRole): string {
    switch (role) {
        case 'ADMIN':
        case 'OPS':
            return '/admin/workflow'
        case 'WAREHOUSE':
            return '/warehouse'
        case 'ACCOUNTING':
            return '/admin/workflow'
        case 'CUSTOMER':
            return '/order/dashboard'
        default:
            return '/login'
    }
}

// 로그인 상태에서 로그인 페이지 접근 방지
export function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner">
                    <PackageIcon size={32} className="spinner-icon" />
                    <span className="spinner-text">로딩 중...</span>
                </div>
            </div>
        )
    }

    // 이미 로그인된 경우에도 로그인 페이지를 볼 수 있도록 리다이렉트 제거
    return <>{children}</>

    return <>{children}</>
}
