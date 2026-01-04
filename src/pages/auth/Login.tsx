import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserIcon, FactoryIcon, FilesIcon, ShoppingCartIcon, InfoIcon, PackageIcon, KakaoIcon, GoogleIcon } from '../../components/Icons'
import { kakaoLogin } from '../../lib/kakaoService'
import { getDefaultPathForRole } from '../../components/ProtectedRoute'
import './Login.css'

export default function Login() {
    const navigate = useNavigate()
    const { user, login, logout, loginWithKakao, loginWithGoogle } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const loggedInUser = await login(email, password)
            navigate(getDefaultPathForRole(loggedInUser.role))
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
            const loggedInUser = await loginWithKakao(result.user)
            navigate(getDefaultPathForRole(loggedInUser.role))
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
            const loggedInUser = await loginWithGoogle()
            navigate(getDefaultPathForRole(loggedInUser.role))
        } catch (err: any) {
            console.error(err)
            setError(err.message || '구글 로그인에 실패했습니다.')
            setIsLoading(false)
        }
    }

    const handleQuickLogin = async (userEmail: string, userPass: string) => {
        setError('')
        setIsLoading(true)
        setEmail(userEmail)
        setPassword(userPass)
        try {
            const loggedInUser = await login(userEmail, userPass)
            navigate(getDefaultPathForRole(loggedInUser.role))
        } catch (err: any) {
            console.error(err)
            setError(err.message || '빠른 로그인 중 오류가 발생했습니다.')
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            await logout()
            window.location.reload()
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="logo">
                        <span className="logo-icon"><PackageIcon size={48} /></span>
                        <span className="logo-text">TRS</span>
                    </div>
                    <h1>물류 주문관리 솔루션</h1>
                    <p className="tagline">Taeyoon Resource System</p>
                </div>

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

                    {user && (
                        <div style={{ marginTop: '20px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-lg w-full"
                                onClick={handleLogout}
                            >
                                현재 계정 로그아웃 처리
                            </button>
                        </div>
                    )}
                </form>

                <div className="demo-section">
                    <p className="demo-label"><InfoIcon size={16} /> 데모 빠른 로그인</p>
                    <div className="demo-buttons">
                        <button
                            className="demo-btn admin"
                            onClick={() => handleQuickLogin('admin@trs.com', 'admin123')}
                        >
                            <UserIcon size={16} /> 관리자
                        </button>
                        <button
                            className="demo-btn warehouse"
                            onClick={() => handleQuickLogin('warehouse@trs.com', 'warehouse123')}
                        >
                            <FactoryIcon size={16} /> 창고직원
                        </button>
                        <button
                            className="demo-btn accounting"
                            onClick={() => handleQuickLogin('accounting@trs.com', 'accounting123')}
                        >
                            <FilesIcon size={16} /> 경리직원
                        </button>
                        <button
                            className="demo-btn customer"
                            onClick={() => handleQuickLogin('customer@trs.com', 'customer123')}
                        >
                            <ShoppingCartIcon size={16} /> 고객
                        </button>
                    </div>
                </div>

                <div className="login-footer">
                    <p>© 2024 The Real Standard. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}
