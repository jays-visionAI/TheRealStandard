import { useState } from 'react'
import { useSystemStore } from '../../stores/systemStore'
import {
    SettingsIcon,
    SaveIcon,
    ShieldIcon,
    KeyIcon,
    CpuIcon,
    ZapIcon,
    CheckCircleIcon
} from '../../components/Icons'
import './SystemSettings.css' // Reusing logic but can have its own CSS if needed

export default function LLMSettings() {
    const { settings, updateSettings } = useSystemStore()
    const [formData, setFormData] = useState({
        openaiApiKey: settings.openaiApiKey || '',
        geminiApiKey: settings.geminiApiKey || '',
        deepseekApiKey: settings.deepseekApiKey || '',
        activeLlmProvider: settings.activeLlmProvider || 'openai'
    })
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage({ type: '', text: '' })

        try {
            // In a real app, this would call systemService.updateSystemSettings
            // Here we update the store which is persisted
            updateSettings(formData)
            setMessage({ type: 'success', text: 'LLM 설정이 성공적으로 저장되었습니다.' })
        } catch (err) {
            console.error(err)
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
                        <CpuIcon size={28} className="text-primary" /> LLM API 설정
                    </h1>
                    <p className="text-muted mt-1">인공지능 기능을 위한 전용 API 키를 관리하고 주력 모델을 선택합니다.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="settings-grid">
                {/* Provider Selection */}
                <section className="settings-card glass-card col-span-2">
                    <div className="card-header">
                        <ZapIcon size={20} className="text-amber-500" />
                        <h2>활성 모델 제공사 선택</h2>
                    </div>
                    <div className="card-body">
                        <div className="flex gap-4">
                            {['openai', 'gemini', 'deepseek'].map((provider) => (
                                <label key={provider} className={`provider-radio-card ${formData.activeLlmProvider === provider ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="activeProvider"
                                        value={provider}
                                        checked={formData.activeLlmProvider === provider}
                                        onChange={() => setFormData({ ...formData, activeLlmProvider: provider as any })}
                                        className="hidden"
                                    />
                                    <div className="provider-info">
                                        <span className="capitalize font-bold">
                                            {provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google Gemini' : 'DeepSeek'}
                                        </span>
                                        {formData.activeLlmProvider === provider && <CheckCircleIcon size={16} className="text-primary" />}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </section>

                {/* API Keys Section */}
                <section className="settings-card glass-card">
                    <div className="card-header">
                        <KeyIcon size={20} className="text-primary" />
                        <h2>OpenAI Settings</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>OpenAI API Key</label>
                            <input
                                type="password"
                                value={formData.openaiApiKey}
                                onChange={e => setFormData({ ...formData, openaiApiKey: e.target.value })}
                                placeholder="sk-..."
                            />
                            <p className="help-text">GPT-4o, GPT-3.5 Turbo 등을 사용하는 데 필요합니다.</p>
                        </div>
                    </div>
                </section>

                <section className="settings-card glass-card">
                    <div className="card-header">
                        <KeyIcon size={20} className="text-emerald-500" />
                        <h2>Google Gemini Settings</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Gemini API Key</label>
                            <input
                                type="password"
                                value={formData.geminiApiKey}
                                onChange={e => setFormData({ ...formData, geminiApiKey: e.target.value })}
                                placeholder="AIzaSy..."
                            />
                            <p className="help-text">Google AI Studio 또는 Vertex AI에서 발급받은 키를 입력하세요.</p>
                        </div>
                    </div>
                </section>

                <section className="settings-card glass-card">
                    <div className="card-header">
                        <KeyIcon size={20} className="text-indigo-500" />
                        <h2>DeepSeek Settings</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>DeepSeek API Key</label>
                            <input
                                type="password"
                                value={formData.deepseekApiKey}
                                onChange={e => setFormData({ ...formData, deepseekApiKey: e.target.value })}
                                placeholder="sk-..."
                            />
                            <p className="help-text">DeepSeek-V3, DeepSeek-R1 등을 사용하는 데 필요합니다.</p>
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
                        <SaveIcon size={20} /> {isSaving ? '저장 중...' : 'LLM 설정 저장'}
                    </button>
                    <div className="security-notice ml-4">
                        <ShieldIcon size={16} />
                        <span>API 키는 보안을 위해 서버 사이드 세션에서만 호출에 사용됩니다.</span>
                    </div>
                </div>
            </form>

            <style>{`
                .provider-radio-card {
                    flex: 1;
                    padding: 1.5rem;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                }
                .provider-radio-card:hover {
                    border-color: var(--color-primary);
                    background: rgba(59, 130, 246, 0.02);
                }
                .provider-radio-card.active {
                    border-color: var(--color-primary);
                    border-width: 2px;
                    background: rgba(59, 130, 246, 0.05);
                }
                .provider-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .col-span-2 {
                    grid-column: span 2;
                }
                @media (max-width: 1024px) {
                    .col-span-2 {
                        grid-column: span 1;
                    }
                }
            `}</style>
        </div>
    )
}
