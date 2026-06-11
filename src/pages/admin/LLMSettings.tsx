import { useState, useEffect } from 'react'
import { useSystemStore } from '../../stores/systemStore'
import { useAuth } from '../../contexts/AuthContext'
import { getLlmSettings, saveLlmSettings, type LlmProvider } from '../../lib/systemConfigService'
import { DEFAULT_MODELS } from '../../lib/llmService'
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

const PROVIDER_LABELS: Record<LlmProvider, string> = {
    anthropic: 'Anthropic Claude',
    minimax: 'MiniMax',
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    deepseek: 'DeepSeek',
}
const PROVIDERS = Object.keys(PROVIDER_LABELS) as LlmProvider[]

export default function LLMSettings() {
    const { settings, updateSettings } = useSystemStore()
    const { user } = useAuth()
    const [formData, setFormData] = useState({
        anthropicApiKey: '',
        anthropicModel: DEFAULT_MODELS.anthropic,
        minimaxApiKey: '',
        minimaxModel: DEFAULT_MODELS.minimax,
        openaiApiKey: settings.openaiApiKey || '',
        openaiModel: DEFAULT_MODELS.openai,
        geminiApiKey: settings.geminiApiKey || '',
        geminiModel: DEFAULT_MODELS.gemini,
        deepseekApiKey: settings.deepseekApiKey || '',
        deepseekModel: DEFAULT_MODELS.deepseek,
        activeLlmProvider: (settings.activeLlmProvider || 'anthropic') as LlmProvider,
    })
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [testStatus, setTestStatus] = useState<{
        [key: string]: { status: 'idle' | 'testing' | 'success' | 'error', message: string }
    }>({
        anthropic: { status: 'idle', message: '' },
        minimax: { status: 'idle', message: '' },
        openai: { status: 'idle', message: '' },
        gemini: { status: 'idle', message: '' },
        deepseek: { status: 'idle', message: '' }
    })

    // Firestore(전역) 설정이 단일 진실 — 페이지 진입 시 로드해 폼에 반영
    useEffect(() => {
        getLlmSettings()
            .then(remote => {
                if (remote) {
                    setFormData(prev => ({
                        ...prev,
                        anthropicApiKey: remote.anthropicApiKey ?? prev.anthropicApiKey,
                        anthropicModel: remote.anthropicModel ?? prev.anthropicModel,
                        minimaxApiKey: remote.minimaxApiKey ?? prev.minimaxApiKey,
                        minimaxModel: remote.minimaxModel ?? prev.minimaxModel,
                        openaiApiKey: remote.openaiApiKey ?? prev.openaiApiKey,
                        openaiModel: remote.openaiModel ?? prev.openaiModel,
                        geminiApiKey: remote.geminiApiKey ?? prev.geminiApiKey,
                        geminiModel: remote.geminiModel ?? prev.geminiModel,
                        deepseekApiKey: remote.deepseekApiKey ?? prev.deepseekApiKey,
                        deepseekModel: remote.deepseekModel ?? prev.deepseekModel,
                        activeLlmProvider: remote.activeLlmProvider ?? prev.activeLlmProvider,
                    }))
                }
            })
            .finally(() => setLoading(false))
    }, [])

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
        if (provider === 'anthropic') result = await llmTestService.testAnthropicConnection(apiKey, formData.anthropicModel)
        else if (provider === 'minimax') result = await llmTestService.testMiniMaxConnection(apiKey, formData.minimaxModel)
        else if (provider === 'openai') result = await llmTestService.testOpenAIConnection(apiKey)
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
            // 1) Firestore 전역 저장 — 모든 관리자/기능에 적용 (단일 진실)
            await saveLlmSettings(formData, user?.id || 'unknown')
            // 2) 로컬 스토어 동기화 (기존 코드 호환)
            updateSettings({
                openaiApiKey: formData.openaiApiKey,
                geminiApiKey: formData.geminiApiKey,
                deepseekApiKey: formData.deepseekApiKey,
                activeLlmProvider: formData.activeLlmProvider as any,
            })
            setMessage({ type: 'success', text: 'LLM 설정이 전역(Firestore)에 저장되었습니다. 모든 관리자·기능에 적용됩니다.' })
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다. (ADMIN 권한 필요)' })
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) return <div className="p-10 text-center text-muted">LLM 설정을 불러오는 중...</div>

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
                        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                            {PROVIDERS.map((provider) => (
                                <label key={provider} className={`provider-radio-card ${formData.activeLlmProvider === provider ? 'active' : ''}`} style={{ minWidth: '180px' }}>
                                    <input
                                        type="radio"
                                        name="activeProvider"
                                        value={provider}
                                        checked={formData.activeLlmProvider === provider}
                                        onChange={() => setFormData({ ...formData, activeLlmProvider: provider })}
                                        className="hidden"
                                    />
                                    <div className="provider-info">
                                        <div className="provider-main">
                                            <span className="provider-name font-bold">{PROVIDER_LABELS[provider]}</span>
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
                        <KeyIcon size={20} className="text-orange-500" />
                        <h2>Anthropic Claude Settings</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Anthropic API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={formData.anthropicApiKey}
                                    onChange={e => setFormData({ ...formData, anthropicApiKey: e.target.value })}
                                    placeholder="sk-ant-..."
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary whitespace-nowrap"
                                    onClick={() => handleTestConnection('anthropic', formData.anthropicApiKey)}
                                    disabled={testStatus.anthropic.status === 'testing'}
                                >
                                    {testStatus.anthropic.status === 'testing' ? <LoaderIcon className="animate-spin" size={16} /> : '연결 테스트'}
                                </button>
                            </div>
                            <label className="mt-3" style={{ display: 'block', marginTop: '12px' }}>모델</label>
                            <input
                                type="text"
                                value={formData.anthropicModel}
                                onChange={e => setFormData({ ...formData, anthropicModel: e.target.value })}
                                placeholder="claude-haiku-4-5"
                            />
                            <p className="help-text">console.anthropic.com에서 발급. 해설/요약 용도는 저가형 claude-haiku-4-5 권장.</p>
                            {testStatus.anthropic.status !== 'idle' && (
                                <p className={`text-sm mt-1 flex items-center gap-1 ${testStatus.anthropic.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {testStatus.anthropic.status === 'success' ? <CheckCircleIcon size={14} /> : <AlertCircleIcon size={14} />}
                                    {testStatus.anthropic.message}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="settings-card glass-card">
                    <div className="card-header">
                        <KeyIcon size={20} className="text-rose-500" />
                        <h2>MiniMax Settings</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>MiniMax API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={formData.minimaxApiKey}
                                    onChange={e => setFormData({ ...formData, minimaxApiKey: e.target.value })}
                                    placeholder="MiniMax API Key"
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary whitespace-nowrap"
                                    onClick={() => handleTestConnection('minimax', formData.minimaxApiKey)}
                                    disabled={testStatus.minimax.status === 'testing'}
                                >
                                    {testStatus.minimax.status === 'testing' ? <LoaderIcon className="animate-spin" size={16} /> : '연결 테스트'}
                                </button>
                            </div>
                            <label className="mt-3" style={{ display: 'block', marginTop: '12px' }}>모델</label>
                            <input
                                type="text"
                                value={formData.minimaxModel}
                                onChange={e => setFormData({ ...formData, minimaxModel: e.target.value })}
                                placeholder="MiniMax-M2"
                            />
                            <p className="help-text">platform.minimax.io에서 발급. MiniMax-M3/M2.7/M2.5/M2.1/M2 지원 (Anthropic 호환 API 사용).</p>
                            {testStatus.minimax.status !== 'idle' && (
                                <p className={`text-sm mt-1 flex items-center gap-1 ${testStatus.minimax.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {testStatus.minimax.status === 'success' ? <CheckCircleIcon size={14} /> : <AlertCircleIcon size={14} />}
                                    {testStatus.minimax.message}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

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
                            <label style={{ display: 'block', marginTop: '12px' }}>모델</label>
                            <input
                                type="text"
                                value={formData.openaiModel}
                                onChange={e => setFormData({ ...formData, openaiModel: e.target.value })}
                                placeholder="gpt-4o-mini"
                            />
                            <p className="help-text">gpt-4o-mini(저가·기본) / gpt-4o 등. platform.openai.com에서 발급.</p>
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
                            <label style={{ display: 'block', marginTop: '12px' }}>모델</label>
                            <input
                                type="text"
                                value={formData.geminiModel}
                                onChange={e => setFormData({ ...formData, geminiModel: e.target.value })}
                                placeholder="gemini-2.0-flash"
                            />
                            <p className="help-text">gemini-2.0-flash(저가·기본) / gemini-2.5-pro 등. Google AI Studio에서 발급.</p>
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
                            <label style={{ display: 'block', marginTop: '12px' }}>모델</label>
                            <input
                                type="text"
                                value={formData.deepseekModel}
                                onChange={e => setFormData({ ...formData, deepseekModel: e.target.value })}
                                placeholder="deepseek-chat"
                            />
                            <p className="help-text">deepseek-chat(범용·기본) / deepseek-reasoner(추론) / deepseek-v4-flash · v4-pro (신규).</p>
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
                        <span>설정은 Firestore에 전역 저장되어 모든 관리자·기능에 적용됩니다. Anthropic/MiniMax 호출은 게이트웨이(Worker)를 경유합니다.</span>
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
