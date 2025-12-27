import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserIcon, FactoryIcon, FilesIcon, ShoppingCartIcon, InfoIcon, PackageIcon, KakaoIcon, GoogleIcon } from '../../components/Icons'
import { kakaoLogin } from '../../lib/kakaoService'
import './Login.css'

// Mock 사용자 목록 (데모용)
const DEMO_USERS = [
    { email: 'admin@trs.com', password: 'admin123', label: '관리자', role: 'ADMIN' as const },
    { email: 'warehouse@trs.com', password: 'warehouse123', label: '창고직원', role: 'WAREHOUSE' as const },
    { email: 'accounting@trs.com', password: 'accounting123', label: '경리직원', role: 'ACCOUNTING' as const },
    { email: 'customer@trs.com', password: 'customer123', label: '고객', role: 'CUSTOMER' as const },
]

export default function Login() {
    const navigate = useNavigate()
    const { user, login, loginWithKakao, loginWithGoogle, loading } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // 이미 로그인된 상태라면 리다이렉트
    useEffect(() => {
        if (!loading && user) {
            switch (user.role) {
                case 'ADMIN':
                case 'OPS':
                    navigate('/admin/workflow')
                    break
                case 'WAREHOUSE':
                    navigate('/warehouse')
                    break
                case 'ACCOUNTING':
                    navigate('/accounting')
                    break
                case 'CUSTOMER':
                    // 고객은 보통 링크(토큰)를 통해 들어오지만, 직접 로그인 시 메인으로
                    navigate('/')
                    break
                default:
                    navigate('/admin/workflow')
            }
        }
    }, [user, loading, navigate])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            await login(email, password)
            // useEffect가 리다이렉트를 처리함
        } catch (err: any) {
            console.error(err)
            setError(err.message || '로그인 중 오류가 발생했습니다.')
            setIsLoading(false)
        }
    }

    const handleKakaoLogin = async () => {
        setError('')
        setIsLoading(true)
        try {
            const result = await kakaoLogin()
            await loginWithKakao(result.user)
            // useEffect가 리다이렉트를 처리함
        } catch (err) {
            console.error(err)
            setError('카카오 로그인에 실패했습니다.')
            setIsLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setError('')
        setIsLoading(true)
        try {
            await loginWithGoogle()
            // useEffect가 리다이렉트를 처리함
        } catch (err: any) {
            console.error(err)
            setError(err.message || '구글 로그인에 실패했습니다.')
            setIsLoading(false)
        }
    }

    const handleQuickLogin = (userEmail: string) => {
        const demoUser = DEMO_USERS.find(u => u.email === userEmail)
        if (demoUser) {
            setEmail(demoUser.email)
            setPassword(demoUser.password)
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Logo & Title */}
                <div className="login-header">
                    <div className="logo">
                        <span className="logo-icon"><PackageIcon size={48} /></span>
                        <span className="logo-text">TRS</span>
                    </div>
                    <h1>물류 주문관리 솔루션</h1>
                    <p className="tagline">Taeyoon Resource System</p>
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

                    <button
                        type="button"
                        className="btn btn-google btn-lg w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <GoogleIcon size={20} /> Google로 시작하기
                    </button>
                </form>

                {/* Quick Login (Demo) */}
                <div className="demo-section">
                    <p className="demo-label"><InfoIcon size={16} /> 데모 빠른 로그인</p>
                    <div className="demo-buttons">
                        <button
                            className="demo-btn admin"
                            onClick={() => handleQuickLogin('admin@trs.com')}
                        >
                            <UserIcon size={16} /> 관리자
                        </button>
                        <button
                            className="demo-btn warehouse"
                            onClick={() => handleQuickLogin('warehouse@trs.com')}
                        >
                            <FactoryIcon size={16} /> 창고직원
                        </button>
                        <button
                            className="demo-btn accounting"
                            onClick={() => handleQuickLogin('accounting@trs.com')}
                        >
                            <FilesIcon size={16} /> 경리직원
                        </button>
                        <button
                            className="demo-btn customer"
                            onClick={() => handleQuickLogin('customer@trs.com')}
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
    )
}
