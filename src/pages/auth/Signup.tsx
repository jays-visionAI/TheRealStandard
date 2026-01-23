import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserIcon, BuildingIcon, MailIcon, KeyIcon, PhoneIcon, MapPinIcon, CheckCircleIcon, ClipboardListIcon } from '../../components/Icons'
import { LogoSmall } from '../../components/Logo'
import { claimOrderSheetByToken } from '../../lib/orderService'
import './Signup.css'

export default function Signup() {
    const navigate = useNavigate()
    const { signup } = useAuth()

    const location = useLocation()
    const prefillData = location.state || {}

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: prefillData.name || '',
        companyName: prefillData.companyName || prefillData.name || '',
        bizRegNo: prefillData.bizRegNo || '',
        ceoName: prefillData.ceoName || '',
        phone: prefillData.phone || prefillData.tel || '',
        address: prefillData.address || prefillData.shipAddress || ''
    })

    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.')
            return
        }

        if (formData.password.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.')
            return
        }

        setIsLoading(true)

        try {
            const newUser = await signup(
                formData.email,
                formData.password,
                formData.name || formData.companyName,
                {
                    companyName: formData.companyName,
                    bizRegNo: formData.bizRegNo,
                    ceoName: formData.ceoName,
                    tel: formData.phone,
                    address: formData.address
                }
            )

            // 만약 이전 페이지에서 전달된 발주서 토큰이 있다면, 해당 발주서를 이 계정에 연결
            if (prefillData.orderToken) {
                try {
                    await claimOrderSheetByToken(prefillData.orderToken, newUser.orgId || newUser.id)
                    console.log('Linked guest order sheet to new user:', prefillData.orderToken)
                } catch (linkErr) {
                    console.error('Failed to link order sheet:', linkErr)
                }
            }

            setIsSuccess(true)
        } catch (err: any) {
            console.error(err)
            setError(err.message || '회원가입 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="signup-page">
                <div className="signup-container success-state animate-fade-in">
                    <div className="success-icon">
                        <CheckCircleIcon size={32} />
                    </div>
                    <h2>정식 거래처 신청 완료</h2>
                    <p>
                        회원가입 신청이 완료되었습니다.<br />
                        관리자 승인 후 정식 거래처 서비스 이용이 가능합니다.<br />
                        승인 결과는 입력하신 이메일로 안내해 드립니다.
                    </p>
                    <button
                        className="btn btn-primary btn-lg w-full"
                        onClick={() => navigate('/login')}
                    >
                        로그인 화면으로 이동
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="signup-page">
            <div className="signup-container animate-fade-in">
                <div className="signup-header">
                    <div className="logo">
                        <LogoSmall />
                    </div>
                    <h1>정식 거래처 등록 신청</h1>
                    <p className="tagline">MEATGO 파트너 멤버십으로 더 편리한 거래를 시작하세요.</p>
                </div>

                <form className="signup-form" onSubmit={handleSubmit}>
                    <div className="form-group full-width">
                        <label><MailIcon size={12} className="inline mr-1" /> 이메일 (계정 아이디)</label>
                        <input
                            name="email"
                            type="email"
                            className="input"
                            placeholder="example@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><KeyIcon size={12} className="inline mr-1" /> 비밀번호</label>
                        <input
                            name="password"
                            type="password"
                            className="input"
                            placeholder="6자 이상 입력"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>비밀번호 확인</label>
                        <input
                            name="confirmPassword"
                            type="password"
                            className="input"
                            placeholder="다시 입력"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group full-width border-t pt-4 mt-2">
                        <label><BuildingIcon size={12} className="inline mr-1" /> 회사명 (상호명)</label>
                        <input
                            name="companyName"
                            type="text"
                            className="input"
                            placeholder="사업자 등록상의 회사명"
                            value={formData.companyName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><ClipboardListIcon size={12} className="inline mr-1" /> 사업자등록번호</label>
                        <input
                            name="bizRegNo"
                            type="text"
                            className="input"
                            placeholder="000-00-00000"
                            value={formData.bizRegNo}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><UserIcon size={12} className="inline mr-1" /> 대표자명</label>
                        <input
                            name="ceoName"
                            type="text"
                            className="input"
                            placeholder="대표자 성함"
                            value={formData.ceoName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group full-width">
                        <label><PhoneIcon size={12} className="inline mr-1" /> 연락처</label>
                        <input
                            name="phone"
                            type="tel"
                            className="input"
                            placeholder="010-0000-0000"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group full-width">
                        <label><MapPinIcon size={12} className="inline mr-1" /> 배송지 주소</label>
                        <input
                            name="address"
                            className="input"
                            placeholder="주문 상품을 받으실 주소"
                            value={formData.address}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full mt-6 full-width"
                        disabled={isLoading}
                    >
                        {isLoading ? '신청 처리 중...' : '정식 거래처 신청하기'}
                    </button>

                    <div className="signup-footer full-width">
                        <p className="login-link">
                            이미 계정이 있으신가요? <Link to="/login">로그인하기</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}
