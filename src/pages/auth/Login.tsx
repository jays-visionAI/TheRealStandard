import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserIcon, FactoryIcon, FilesIcon, ShoppingCartIcon, InfoIcon, PackageIcon, KakaoIcon } from '../../components/Icons'
import { kakaoLogin } from '../../lib/kakaoService'
import './Login.css'

// Mock 사용자 목록 (데모용)
const DEMO_USERS = [
    { id: 'admin-001', email: 'admin@trs.co.kr', password: '1234', name: '김관리', role: 'ADMIN' as const },
    { id: 'warehouse-001', email: 'warehouse@trs.co.kr', password: '1234', name: '박창고', role: 'WAREHOUSE' as const },
    { id: 'accounting-001', email: 'accounting@trs.co.kr', password: '1234', name: '이경리', role: 'ACCOUNTING' as const },
    { id: 'customer-001', email: 'customer@example.com', password: '1234', name: '최고객', role: 'CUSTOMER' as const },
]

const FEATURES = [
    { icon: '📦', title: '실시간 주문 관리', desc: '주문부터 출고까지 전 과정 추적' },
    { icon: '🚚', title: '물류 최적화', desc: '창고 관리 및 배송 현황 모니터링' },
    { icon: '📊', title: '정산 자동화', desc: '매출/매입 내역 및 세금계산서 관리' },
    { icon: '🔒', title: '안전한 데이터', desc: '클라우드 기반 보안 시스템' },
]

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            // Mock 로그인
            const user = DEMO_USERS.find(u => u.email === email && u.password === password)

            if (!user) {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.')
                setIsLoading(false)
                return
            }

            // localStorage에 사용자 정보 저장 (데모용)
            localStorage.setItem('trs_user', JSON.stringify(user))

            // login 함수 호출
            await login(email, password)

            // 역할별 리다이렉트
            switch (user.role) {
                case 'ADMIN':
                    navigate('/admin/workflow')
                    break
                case 'WAREHOUSE':
                    navigate('/warehouse')
                    break
                case 'ACCOUNTING':
                    navigate('/accounting')
                    break
                case 'CUSTOMER':
                    navigate('/')
                    break
                default:
                    navigate('/admin/workflow')
            }
        } catch {
            setError('로그인 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleKakaoLogin = () => {
        kakaoLogin()
    }

    const handleQuickLogin = (userEmail: string) => {
        const user = DEMO_USERS.find(u => u.email === userEmail)
        if (user) {
            setEmail(user.email)
            setPassword(user.password)
        }
    }

    return (
        <div className="login-page">
            {/* Left Side - Branding (PC Only) */}
            <div className="login-branding">
                <div className="branding-content">
                    <a href="/" className="branding-logo">
                        <PackageIcon size={56} />
                        <span className="branding-logo-text">TRS</span>
                    </a>
                    <h1 className="branding-title">지능형 육류유통혁신 플랫폼</h1>
                    <p className="branding-subtitle">The Real Standard</p>

                    <div className="branding-features">
                        {FEATURES.map((feature, idx) => (
                            <div key={idx} className="feature-item">
                                <span className="feature-icon">{feature.icon}</span>
                                <div className="feature-text">
                                    <strong>{feature.title}</strong>
                                    <span>{feature.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="branding-footer">
                        <p>국내 최고의 육류 유통 관리 솔루션</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="login-form-section">
                <div className="login-container">
                    {/* Mobile Logo */}
                    <div className="login-header mobile-only">
                        <a href="/" className="logo">
                            <span className="logo-icon"><PackageIcon size={40} /></span>
                            <span className="logo-text">TRS</span>
                        </a>
                        <h1>지능형 육류유통혁신 플랫폼</h1>
                        <p className="tagline">The Real Standard</p>
                    </div>

                    {/* PC Header */}
                    <div className="login-header-pc desktop-only">
                        <h2>로그인</h2>
                        <p>계정에 로그인하여 서비스를 이용하세요</p>
                    </div>

                    {/* Login Form */}
                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <label htmlFor="email">이메일</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                placeholder="이메일을 입력하세요"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">비밀번호</label>
                            <input
                                id="password"
                                type="password"
                                className="input"
                                placeholder="비밀번호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="error-message">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>

                        <div className="login-divider">
                            <span>또는</span>
                        </div>

                        <button
                            type="button"
                            className="btn btn-kakao btn-lg w-full flex items-center justify-center gap-2"
                            onClick={handleKakaoLogin}
                            disabled={isLoading}
                        >
                            <KakaoIcon size={20} /> 카카오톡으로 시작하기
                        </button>
                    </form>

                    {/* Quick Login (Demo) */}
                    <div className="demo-section">
                        <p className="demo-label"><InfoIcon size={16} /> 데모 빠른 로그인</p>
                        <div className="demo-buttons">
                            <button
                                className="demo-btn admin"
                                onClick={() => handleQuickLogin('admin@trs.co.kr')}
                            >
                                <UserIcon size={16} /> 관리자
                            </button>
                            <button
                                className="demo-btn warehouse"
                                onClick={() => handleQuickLogin('warehouse@trs.co.kr')}
                            >
                                <FactoryIcon size={16} /> 창고직원
                            </button>
                            <button
                                className="demo-btn accounting"
                                onClick={() => handleQuickLogin('accounting@trs.co.kr')}
                            >
                                <FilesIcon size={16} /> 경리직원
                            </button>
                            <button
                                className="demo-btn customer"
                                onClick={() => handleQuickLogin('customer@example.com')}
                            >
                                <ShoppingCartIcon size={16} /> 고객
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="login-footer">
                        <p>© 2024 The Real Standard. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
