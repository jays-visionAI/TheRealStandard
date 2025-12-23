import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Login.css'

// Mock 사용자 목록 (데모용)
const DEMO_USERS = [
    { id: 'admin-001', email: 'admin@trs.co.kr', password: '1234', name: '김관리', role: 'ADMIN' as const },
    { id: 'warehouse-001', email: 'warehouse@trs.co.kr', password: '1234', name: '박창고', role: 'WAREHOUSE' as const },
    { id: 'accounting-001', email: 'accounting@trs.co.kr', password: '1234', name: '이경리', role: 'ACCOUNTING' as const },
    { id: 'customer-001', email: 'customer@example.com', password: '1234', name: '최고객', role: 'CUSTOMER' as const },
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
                    navigate('/order/my-orders')
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

    const handleQuickLogin = (userEmail: string) => {
        const user = DEMO_USERS.find(u => u.email === userEmail)
        if (user) {
            setEmail(user.email)
            setPassword(user.password)
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Logo & Title */}
                <div className="login-header">
                    <div className="logo">
                        <span className="logo-icon">📦</span>
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
                </form>

                {/* Quick Login (Demo) */}
                <div className="demo-section">
                    <p className="demo-label">🧪 데모 빠른 로그인</p>
                    <div className="demo-buttons">
                        <button
                            className="demo-btn admin"
                            onClick={() => handleQuickLogin('admin@trs.co.kr')}
                        >
                            👤 관리자
                        </button>
                        <button
                            className="demo-btn warehouse"
                            onClick={() => handleQuickLogin('warehouse@trs.co.kr')}
                        >
                            🏭 창고직원
                        </button>
                        <button
                            className="demo-btn accounting"
                            onClick={() => handleQuickLogin('accounting@trs.co.kr')}
                        >
                            📄 경리직원
                        </button>
                        <button
                            className="demo-btn customer"
                            onClick={() => handleQuickLogin('customer@example.com')}
                        >
                            🛒 고객
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p>© 2024 태윤인터내셔널. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}
