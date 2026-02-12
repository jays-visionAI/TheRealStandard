import { useState } from 'react'
import { useSystemStore } from '../../stores/systemStore'
import {
    SettingsIcon,
    SaveIcon,
    ShieldIcon,
    KeyIcon,
    CpuIcon,
    ZapIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    LoaderIcon
} from '../../components/Icons'
import './SystemSettings.css'
import { llmTestService } from '../../lib/llmTestService'

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
    const [testStatus, setTestStatus] = useState<{
        [key: string]: { status: 'idle' | 'testing' | 'success' | 'error', message: string }
    }>({
        openai: { status: 'idle', message: '' },
        gemini: { status: 'idle', message: '' },
        deepseek: { status: 'idle', message: '' }
    })

    const handleTestConnection = async (provider: string, apiKey: string) => {
        if (!apiKey) {
            setTestStatus(prev => ({
                ...prev,
                [provider]: { status: 'error', message: 'API 키를 먼저 입력해주세요.' }
            }))
            return
        }

        setTestStatus(prev => ({ ...prev, [provider]: { status: 'testing', message: '연결 확인 중...' } }))

        let result
        if (provider === 'openai') result = await llmTestService.testOpenAIConnection(apiKey)
        else if (provider === 'gemini') result = await llmTestService.testGeminiConnection(apiKey)
        else if (provider === 'deepseek') result = await llmTestService.testDeepSeekConnection(apiKey)

        if (result) {
            setTestStatus(prev => ({
                ...prev,
                [provider]: {
                    status: result.success ? 'success' : 'error',
                    message: result.message
                }
            }))
        }
    }

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
                                        <div className="provider-main">
                                            <span className="provider-name font-bold">
                                                {provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google Gemini' : 'DeepSeek'}
                                            </span>
                                            <div className="status-badges">
                                                {formData[(`${provider}ApiKey` as keyof typeof formData)] ? (
                                                    <span className="badge badge-success-outline">등록됨</span>
                                                ) : (
                                                    <span className="badge badge-gray-outline">미등록</span>
                                                )}
                                                {formData.activeLlmProvider === provider && (
                                                    <span className="badge badge-primary">활성</span>
                                                )}
                                            </div>
                                        </div>
                                        {formData.activeLlmProvider === provider && <CheckCircleIcon size={20} className="text-primary" />}
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
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={formData.openaiApiKey}
                                    onChange={e => setFormData({ ...formData, openaiApiKey: e.target.value })}
                                    placeholder="sk-..."
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary whitespace-nowrap"
                                    onClick={() => handleTestConnection('openai', formData.openaiApiKey)}
                                    disabled={testStatus.openai.status === 'testing'}
                                >
                                    {testStatus.openai.status === 'testing' ? <LoaderIcon className="animate-spin" size={16} /> : '연결 테스트'}
                                </button>
                            </div>
                            <p className="help-text">GPT-4o, GPT-3.5 Turbo 등을 사용하는 데 필요합니다.</p>
                            {testStatus.openai.status !== 'idle' && (
                                <p className={`text-sm mt-1 flex items-center gap-1 ${testStatus.openai.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {testStatus.openai.status === 'success' ? <CheckCircleIcon size={14} /> : <AlertCircleIcon size={14} />}
                                    {testStatus.openai.message}
                                </p>
                            )}
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
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={formData.geminiApiKey}
                                    onChange={e => setFormData({ ...formData, geminiApiKey: e.target.value })}
                                    placeholder="AIzaSy..."
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary whitespace-nowrap"
                                    onClick={() => handleTestConnection('gemini', formData.geminiApiKey)}
                                    disabled={testStatus.gemini.status === 'testing'}
                                >
                                    {testStatus.gemini.status === 'testing' ? <LoaderIcon className="animate-spin" size={16} /> : '연결 테스트'}
                                </button>
                            </div>
                            <p className="help-text">Google AI Studio 또는 Vertex AI에서 발급받은 키를 입력하세요.</p>
                            {testStatus.gemini.status !== 'idle' && (
                                <p className={`text-sm mt-1 flex items-center gap-1 ${testStatus.gemini.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {testStatus.gemini.status === 'success' ? <CheckCircleIcon size={14} /> : <AlertCircleIcon size={14} />}
                                    {testStatus.gemini.message}
                                </p>
                            )}
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
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={formData.deepseekApiKey}
                                    onChange={e => setFormData({ ...formData, deepseekApiKey: e.target.value })}
                                    placeholder="sk-..."
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary whitespace-nowrap"
                                    onClick={() => handleTestConnection('deepseek', formData.deepseekApiKey)}
                                    disabled={testStatus.deepseek.status === 'testing'}
                                >
                                    {testStatus.deepseek.status === 'testing' ? <LoaderIcon className="animate-spin" size={16} /> : '연결 테스트'}
                                </button>
                            </div>
                            <p className="help-text">DeepSeek-V3, DeepSeek-R1 등을 사용하는 데 필요합니다.</p>
                            {testStatus.deepseek.status !== 'idle' && (
                                <p className={`text-sm mt-1 flex items-center gap-1 ${testStatus.deepseek.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {testStatus.deepseek.status === 'success' ? <CheckCircleIcon size={14} /> : <AlertCircleIcon size={14} />}
                                    {testStatus.deepseek.message}
                                </p>
                            )}
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
                    width: 100%;
                }
                .provider-main {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .provider-name {
                    font-size: 1.1rem;
                    color: var(--text-primary);
                }
                .status-badges {
                    display: flex;
                    gap: 0.4rem;
                }
                .badge-success-outline {
                    background: rgba(16, 185, 129, 0.05);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                .badge-gray-outline {
                    background: rgba(107, 114, 128, 0.05);
                    color: #6b7280;
                    border: 1px solid rgba(107, 114, 128, 0.2);
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
