import { useState } from 'react'
import { useSystemStore } from '../../stores/systemStore'
import {
    SettingsIcon,
    SaveIcon,
    ShieldIcon,
    KeyIcon,
    MessageCircleIcon,
    BuildingIcon,
    MailIcon
} from '../../components/Icons'
import './SystemSettings.css'

export default function SystemSettings() {
    const { settings, updateSettings } = useSystemStore()
    const [formData, setFormData] = useState({ ...settings })
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage({ type: '', text: '' })

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800))
            updateSettings(formData)
            setMessage({ type: 'success', text: '설정이 성공적으로 저장되었습니다.' })

            // Re-initialize Kakao if needed (Note: usually requires page reload in simple implementations)
            if (formData.kakaoJsKey !== settings.kakaoJsKey) {
                setMessage({ type: 'warning', text: '카카오 API 키가 변경되었습니다. 반영을 위해 페이지를 새로고침해주세요.' })
            }
        } catch {
            setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다.' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="settings-page">
            <div className="settings-header mb-8">
                <div className="header-info">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <SettingsIcon size={28} className="text-primary" /> 시스템 및 API 설정
                    </h1>
                    <p className="text-muted mt-1">TRS 시스템의 핵심 API 연동 및 기업 정보를 관리합니다.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="settings-grid">
                {/* Kakao API Section */}
                <section className="settings-card glass-card">
                    <div className="card-header">
                        <KeyIcon size={20} className="text-kakao" />
                        <h2>Kakao Developers 설정</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Javascript 키</label>
                            <input
                                type="password"
                                value={formData.kakaoJsKey}
                                onChange={e => setFormData({ ...formData, kakaoJsKey: e.target.value })}
                                placeholder="Kakao Javascript Key"
                            />
                            <p className="help-text">클라이언트 측 SDK 초기화에 사용됩니다.</p>
                        </div>
                        <div className="form-group">
                            <label>REST API 키</label>
                            <input
                                type="password"
                                value={formData.kakaoRestApiKey}
                                onChange={e => setFormData({ ...formData, kakaoRestApiKey: e.target.value })}
                                placeholder="Kakao REST API Key"
                            />
                            <p className="help-text">알림톡 발송 등 서버 간 API 호출에 사용됩니다.</p>
                        </div>
                        <div className="form-group">
                            <label>카카오톡 채널 ID</label>
                            <div className="input-with-icon">
                                <MessageCircleIcon size={16} className="input-icon" />
                                <input
                                    type="text"
                                    value={formData.kakaoChannelId}
                                    onChange={e => setFormData({ ...formData, kakaoChannelId: e.target.value })}
                                    placeholder="_zeXxjG"
                                />
                            </div>
                            <p className="help-text">고객 연결용 공식 채널 ID (_문자로 시작)</p>
                        </div>
                    </div>
                </section>

                {/* Company Info Section */}
                <section className="settings-card glass-card">
                    <div className="card-header">
                        <BuildingIcon size={20} className="text-primary" />
                        <h2>기업 정보 설정</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>회사 명칭</label>
                            <input
                                type="text"
                                value={formData.companyName}
                                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                placeholder="회사명을 입력하세요"
                            />
                        </div>
                        <div className="form-group">
                            <label>대표 지원 이메일</label>
                            <div className="input-with-icon">
                                <MailIcon size={16} className="input-icon" />
                                <input
                                    type="email"
                                    value={formData.supportEmail}
                                    onChange={e => setFormData({ ...formData, supportEmail: e.target.value })}
                                    placeholder="support@company.com"
                                />
                            </div>
                        </div>
                        <div className="form-group mt-6">
                            <div className="security-notice">
                                <ShieldIcon size={16} />
                                <span>모든 API 키는 브라우저 보안 정책에 따라 암호화되어 관리됩니다.</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="settings-actions">
                    {message.text && (
                        <div className={`status-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={isSaving}>
                        <SaveIcon size={20} /> {isSaving ? '저장 중...' : '변경사항 저장'}
                    </button>
                    {message.type === 'warning' && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => window.location.reload()}
                        >
                            페이지 새로고침
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
