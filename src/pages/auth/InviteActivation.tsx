import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCustomerStore } from '../../stores/customerStore'
import { CheckCircleIcon, KeyIcon, MailIcon, BuildingIcon, UserIcon } from '../../components/Icons'
import './InviteActivation.css'

export default function InviteActivation() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const { getCustomerByToken, activateCustomer } = useCustomerStore()

    const customer = useMemo(() => getCustomerByToken(token || ''), [token, getCustomerByToken])

    const [email, setEmail] = useState(customer?.email || '')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    if (!customer) {
        return (
            <div className="activation-container error">
                <div className="activation-card glass-card">
                    <h1>유효하지 않은 링크</h1>
                    <p>이미 사용되었거나 만료된 초대 링크입니다.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/login')}>
                        로그인으로 이동
                    </button>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.')
            return
        }
        if (password.length < 4) {
            alert('비밀번호는 4자 이상이어야 합니다.')
            return
        }

        setIsSubmitting(true)
        try {
            await activateCustomer(token!, email, password)
            setIsSuccess(true)
        } catch (error) {
            alert(error instanceof Error ? error.message : '활성화 중 오류가 발생했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="activation-container success">
                <div className="activation-card glass-card animate-fade-in">
                    <div className="success-icon">
                        <CheckCircleIcon size={64} />
                    </div>
                    <h1>활성화 완료! ✨</h1>
                    <p><strong>{customer.companyName}</strong>의 공식 계정이 생성되었습니다.</p>
                    <p className="text-secondary">설정하신 이메일과 비밀번호로 로그인해주세요.</p>
                    <div className="mt-8">
                        <button className="btn btn-primary btn-lg w-full" onClick={() => navigate('/login')}>
                            로그인하러 가기
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="activation-container">
            <div className="activation-card glass-card animate-fade-in">
                <div className="header">
                    <span className="brand">TRS Standard</span>
                    <h1>파트너 계정 활성화</h1>
                    <p className="text-secondary">아래 정보를 설정하여 TRS Standard를 시작하세요.</p>
                </div>

                <div className="customer-preview">
                    <div className="info-item">
                        <BuildingIcon size={16} />
                        <span>{customer.companyName}</span>
                    </div>
                    <div className="info-item">
                        <UserIcon size={16} />
                        <span>{customer.ceoName} 대표님</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="activation-form">
                    <div className="form-group">
                        <label><MailIcon size={14} /> 로그인 이메일</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="사용할 이메일을 입력하세요"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><KeyIcon size={14} /> 비밀번호 설정</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="4자 이상의 비밀번호"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>비밀번호 확인</label>
                        <input
                            type="password"
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="비밀번호를 다시 입력하세요"
                            required
                        />
                    </div>

                    <div className="footer-actions mt-6">
                        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
                            {isSubmitting ? '활성화 중...' : '계정 활성화 및 시작하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
