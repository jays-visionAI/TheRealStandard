import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getUserById, updateUser, type BusinessProfile } from '../../lib/userService'
import {
    BuildingIcon,
    ClipboardListIcon,
    PhoneIcon,
    MapPinIcon,
    UserIcon,
    WalletIcon,
    FileTextIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    LockIcon
} from '../../components/Icons'
import './ProfileSetup.css'

export default function ProfileSetup() {
    const { user, updateUserPassword } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isPasswordChanging, setIsPasswordChanging] = useState(false)
    const [isOnboarding, setIsOnboarding] = useState(false)

    // 비밀번호 변경 관련 상태
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [formData, setFormData] = useState<Partial<BusinessProfile>>({
        companyName: '',
        bizRegNo: '',
        ceoName: '',
        address: '',
        tel: '',
        shipAddress1: '',
        priceType: 'wholesale'
    })

    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) return
            try {
                const userData = await getUserById(user.id)
                if (userData?.business) {
                    setFormData(userData.business)
                    setIsOnboarding(false)
                } else {
                    setIsOnboarding(true)
                }
            } catch (err) {
                console.error('Failed to load profile:', err)
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.id) return

        setIsSubmitting(true)
        try {
            await updateUser(user.id, {
                business: formData as BusinessProfile,
                // 정보를 입력하면 상태를 ACTIVE로 변경
                status: 'ACTIVE'
            })

            // 성공 후 대시보드로 이동
            alert('비즈니스 프로필이 저장되었습니다.')
            navigate('/order/dashboard')
        } catch (err) {
            console.error('Save failed:', err)
            alert('저장에 실패했습니다. 다시 시도해주세요.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.')
            return
        }
        if (newPassword.length < 6) {
            alert('비밀번호는 최소 6자 이상이어야 합니다.')
            return
        }

        setIsPasswordChanging(true)
        try {
            await updateUserPassword(newPassword)
            alert('비밀번호가 성공적으로 변경되었습니다.')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err: any) {
            alert(err.message)
            if (err.message.includes('다시 로그인')) {
                // 재로그인이 필요한 경우
            }
        } finally {
            setIsPasswordChanging(false)
        }
    }

    if (loading) return <div className="p-20 text-center">프로필 정보를 확인하는 중...</div>

    return (
        <div className="profile-setup-container">
            <div className="profile-setup-card glass-card animate-fade-in">
                <div className="setup-header">
                    <div className="brand-badge">MEATGO Partner</div>
                    <h1>{isOnboarding ? '비즈니스 프로필 완성' : '거래처 정보 수정'}</h1>
                    <p className="description">
                        {isOnboarding
                            ? 'MEATGO 서비스를 시작하기 위해 사업자 정보를 입력해주세요.'
                            : '등록된 사업자 정보를 최신 상태로 관리하세요.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="setup-form">
                    {/* 기본 정보 */}
                    <div className="form-section">
                        <h3><ClipboardListIcon size={18} /> 사업자 기본 정보</h3>
                        <div className="form-grid">
                            <div className="form-group required">
                                <label>상호명 (법인명)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="상호명을 입력하세요"
                                    value={formData.companyName}
                                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group required">
                                <label>사업자등록번호</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="000-00-00000"
                                    value={formData.bizRegNo}
                                    onChange={e => setFormData({ ...formData, bizRegNo: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group required">
                                <label>대표자명</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.ceoName}
                                    onChange={e => setFormData({ ...formData, ceoName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* 연락처 */}
                    <div className="form-section">
                        <h3><PhoneIcon size={18} /> 비즈니스 연락처</h3>
                        <div className="form-grid">
                            <div className="form-group required">
                                <label>대표 전화번호</label>
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="02-000-0000"
                                    value={formData.tel}
                                    onChange={e => setFormData({ ...formData, tel: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>담당자 연락처 (선택)</label>
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="010-0000-0000"
                                    value={formData.contactPhone}
                                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 주소 정보 */}
                    <div className="form-section">
                        <h3><MapPinIcon size={18} /> 주소 및 배송지</h3>
                        <div className="form-group required full-width">
                            <label>사업장 주소</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="주소 찾기를 통한 입력을 권장합니다"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group required full-width">
                            <label>기본 배송지</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="물품을 수령할 정확한 주소를 입력하세요"
                                value={formData.shipAddress1}
                                onChange={e => setFormData({ ...formData, shipAddress1: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* 비밀번호 변경 섹션 (Onboarding이 아닐 때만 표시) */}
                    {!isOnboarding && (
                        <div className="form-section password-change-section" style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
                            <h3 style={{ color: 'var(--color-primary)' }}><LockIcon size={18} /> 계정 비밀번호 변경</h3>
                            <p className="description mb-4">보안을 위해 정기적인 비밀번호 변경을 권장합니다.</p>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>새 비밀번호</label>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="6자 이상 입력"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>비밀번호 확인</label>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="다시 한번 입력"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handlePasswordChange}
                                    disabled={isPasswordChanging || !newPassword}
                                >
                                    {isPasswordChanging ? '변경 중...' : '비밀번호 변경하기'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="setup-footer">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                        >
                            취소
                        </button>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                            {isSubmitting ? '저장 중...' : (isOnboarding ? '프로필 완성 및 시작하기' : '수정 완료')}
                            {!isSubmitting && <ArrowRightIcon size={18} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
