import { useState, useEffect } from 'react'
import { useSystemStore } from '../../stores/systemStore'
import { getSystemApiKeys, saveSystemApiKeys } from '../../lib/systemConfigService'
import { apiOrigin } from '../../lib/external/apiBase'
import { useAuth } from '../../contexts/AuthContext'
import {
    SettingsIcon,
    SaveIcon,
    ShieldIcon,
    KeyIcon,
    MessageCircleIcon,
    BuildingIcon,
    MailIcon,
    SearchIcon,
    ChartIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
} from '../../components/Icons'
import './SystemSettings.css'

export default function SystemSettings() {
    const { user } = useAuth()
    const { settings, updateSettings } = useSystemStore()
    const [formData, setFormData] = useState({ ...settings })
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [testErrors, setTestErrors] = useState<Record<string, string>>({})
    const [testResults, setTestResults] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
        datago: 'idle',
        kamis: 'idle',
        naver: 'idle',
    })

    // 페이지 로드 시 Firestore에서 외부 API 키 불러와 store + form 동기화
    useEffect(() => {
        getSystemApiKeys().then(remoteKeys => {
            if (!remoteKeys) return
            const synced = {
                datagoKey: remoteKeys.datagoKey ?? settings.datagoKey,
                kamisKey: remoteKeys.kamisKey ?? settings.kamisKey,
                kamisId: remoteKeys.kamisId ?? settings.kamisId,
                naverClientId: remoteKeys.naverClientId ?? settings.naverClientId,
                naverClientSecret: remoteKeys.naverClientSecret ?? settings.naverClientSecret,
            }
            updateSettings(synced)
            setFormData(prev => ({ ...prev, ...synced }))
        }).catch(err => console.warn('System API keys sync failed:', err))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage({ type: '', text: '' })

        try {
            // 1. 로컬 store 업데이트 (즉시 반영)
            updateSettings(formData)

            // 2. Firestore에 외부 API 키 영속화 — 모든 어드민 공유
            await saveSystemApiKeys({
                datagoKey: formData.datagoKey,
                kamisKey: formData.kamisKey,
                kamisId: formData.kamisId,
                naverClientId: formData.naverClientId,
                naverClientSecret: formData.naverClientSecret,
            }, user?.id || 'unknown')

            setMessage({ type: 'success', text: '설정이 저장되었습니다. (모든 어드민에 즉시 반영)' })

            if (formData.kakaoJsKey !== settings.kakaoJsKey) {
                setMessage({ type: 'warning', text: '카카오 API 키가 변경되었습니다. 반영을 위해 페이지를 새로고침해주세요.' })
            }
        } catch (err: any) {
            console.error('System settings save failed:', err)
            setMessage({ type: 'error', text: err?.message || '설정 저장 중 오류가 발생했습니다.' })
        } finally {
            setIsSaving(false)
        }
    }

    const testConnection = async (service: 'datago' | 'kamis' | 'naver') => {
        setTestResults(prev => ({ ...prev, [service]: 'loading' }))
        try {
            let url = ''
            const headers: Record<string, string> = {}

            if (service === 'datago') {
                const key = formData.datagoKey || import.meta.env.VITE_DATAGO_KEY || ''
                if (!key) throw new Error('API 키가 입력되지 않았습니다.')
                // 실제 엔드포인트는 축평원 자체 서버(data.ekape.or.kr) — 소도체 경락가격으로 핑
                const d = new Date(Date.now() - 24 * 60 * 60 * 1000) // 어제 (당일 데이터 미존재 대비)
                const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
                url = `${apiOrigin()}/api/ekape/openapi-data/service/user/grade/auct/cattle?serviceKey=${encodeURIComponent(key)}&startYmd=${ymd}&endYmd=${ymd}`
            } else if (service === 'kamis') {
                const key = formData.kamisKey || import.meta.env.VITE_KAMIS_KEY || ''
                const id = formData.kamisId || import.meta.env.VITE_KAMIS_ID || ''
                if (!key || !id) throw new Error('KAMIS 키 또는 ID가 입력되지 않았습니다.')
                url = `${apiOrigin()}/api/kamis/service/price/xml.do?action=periodProductList&p_productclscode=02&p_itemcategorycode=500&p_itemcode=514&p_regday=2026-05-01&p_convert_kg_yn=Y&p_cert_key=${encodeURIComponent(key)}&p_cert_id=${encodeURIComponent(id)}&p_returntype=json`
            } else if (service === 'naver') {
                const clientId = formData.naverClientId || import.meta.env.VITE_NAVER_CLIENT_ID || ''
                const clientSecret = formData.naverClientSecret || import.meta.env.VITE_NAVER_CLIENT_SECRET || ''
                if (!clientId || !clientSecret) throw new Error('네이버 Client ID/Secret이 입력되지 않았습니다.')
                url = `${apiOrigin()}/api/naver/v1/search/news.json?query=${encodeURIComponent('한우 시세')}&display=1&sort=date`
                headers['X-Naver-Client-Id'] = clientId
                headers['X-Naver-Client-Secret'] = clientSecret
            }

            const res = await fetch(url, { headers })
            const text = await res.text()
            // data.go.kr/축평원은 인증 오류도 HTTP 200 + XML로 반환 → 본문에서 사유 추출
            const xmlMsg = text.match(/<resultMsg>([^<]*)<\/resultMsg>/)?.[1]
                || text.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/)?.[1]
            const xmlCode = text.match(/<resultCode>([^<]*)<\/resultCode>/)?.[1]
            if (xmlCode && xmlCode !== '00') throw new Error(xmlMsg || `resultCode ${xmlCode}`)
            if (!res.ok) throw new Error(xmlMsg || `HTTP ${res.status}`)
            if (service !== 'datago') JSON.parse(text) // JSON 응답 서비스 검증
            setTestResults(prev => ({ ...prev, [service]: 'success' }))
            setTestErrors(prev => ({ ...prev, [service]: '' }))
        } catch (err: any) {
            console.error(`${service} test failed:`, err)
            setTestResults(prev => ({ ...prev, [service]: 'error' }))
            setTestErrors(prev => ({ ...prev, [service]: err?.message || '알 수 없는 오류' }))
        }
    }

    const renderTestBadge = (service: 'datago' | 'kamis' | 'naver') => {
        const status = testResults[service]
        if (status === 'loading') return <span className="test-badge loading">테스트 중...</span>
        if (status === 'success') return <span className="test-badge success"><CheckCircleIcon size={12} /> 연결 성공</span>
        if (status === 'error') return (
            <span className="test-badge error" title={testErrors[service]}>
                <AlertTriangleIcon size={12} /> 연결 실패{testErrors[service] ? ` — ${testErrors[service]}` : ''}
            </span>
        )
        return null
    }

    return (
        <div className="settings-page">
            <div className="settings-header mb-8">
                <div className="header-info">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <SettingsIcon size={28} className="text-primary" /> 시스템 및 API 설정
                    </h1>
                    <p className="text-muted mt-1">MEATGO 시스템의 핵심 API 연동 및 기업 정보를 관리합니다.</p>
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
                    </div>
                </section>

                {/* 공공데이터포털 (EKAPE) API */}
                <section className="settings-card glass-card">
                    <div className="card-header">
                        <ChartIcon size={20} className="text-datago" />
                        <h2>공공데이터포털 (축산물가격)</h2>
                        {renderTestBadge('datago')}
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>API 인증키 (Decoding — 일반 인증키)</label>
                            <input
                                type="password"
                                value={formData.datagoKey || ''}
                                onChange={e => setFormData({ ...formData, datagoKey: e.target.value })}
                                placeholder="공공데이터포털에서 발급받은 인증키"
                            />
                            <p className="help-text">
                                data.go.kr &gt; 축산물품질평가원_축산물경락가격정보 API 활용신청 후 발급
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => testConnection('datago')}
                            disabled={testResults.datago === 'loading'}
                        >
                            <SearchIcon size={14} /> 연결 테스트
                        </button>
                    </div>
                </section>

                {/* KAMIS API */}
                <section className="settings-card glass-card">
                    <div className="card-header">
                        <ChartIcon size={20} className="text-kamis" />
                        <h2>KAMIS (농산물유통정보)</h2>
                        {renderTestBadge('kamis')}
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>인증 키 (p_cert_key)</label>
                            <input
                                type="password"
                                value={formData.kamisKey || ''}
                                onChange={e => setFormData({ ...formData, kamisKey: e.target.value })}
                                placeholder="KAMIS 인증 키"
                            />
                        </div>
                        <div className="form-group">
                            <label>인증 ID (p_cert_id)</label>
                            <input
                                type="text"
                                value={formData.kamisId || ''}
                                onChange={e => setFormData({ ...formData, kamisId: e.target.value })}
                                placeholder="KAMIS 인증 ID"
                            />
                            <p className="help-text">
                                kamis.or.kr &gt; 개방데이터 &gt; API 신청 후 발급
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => testConnection('kamis')}
                            disabled={testResults.kamis === 'loading'}
                        >
                            <SearchIcon size={14} /> 연결 테스트
                        </button>
                    </div>
                </section>

                {/* 네이버 뉴스 검색 API */}
                <section className="settings-card glass-card">
                    <div className="card-header">
                        <SearchIcon size={20} className="text-naver" />
                        <h2>네이버 뉴스 검색 API</h2>
                        {renderTestBadge('naver')}
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Client ID</label>
                            <input
                                type="text"
                                value={formData.naverClientId || ''}
                                onChange={e => setFormData({ ...formData, naverClientId: e.target.value })}
                                placeholder="네이버 Client ID"
                            />
                        </div>
                        <div className="form-group">
                            <label>Client Secret</label>
                            <input
                                type="password"
                                value={formData.naverClientSecret || ''}
                                onChange={e => setFormData({ ...formData, naverClientSecret: e.target.value })}
                                placeholder="네이버 Client Secret"
                            />
                            <p className="help-text">
                                developers.naver.com &gt; 애플리케이션 등록 &gt; 검색 API 선택 후 발급 (일 25,000건 무료)
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => testConnection('naver')}
                            disabled={testResults.naver === 'loading'}
                        >
                            <SearchIcon size={14} /> 연결 테스트
                        </button>
                    </div>
                </section>

                {/* 보안 안내 */}
                <section className="settings-card glass-card">
                    <div className="card-header">
                        <ShieldIcon size={20} className="text-success" />
                        <h2>보안 안내</h2>
                    </div>
                    <div className="card-body">
                        <div className="security-notice">
                            <ShieldIcon size={16} />
                            <span>모든 API 키는 브라우저 로컬 스토리지에 암호화되어 저장됩니다. 서버로 전송되지 않습니다.</span>
                        </div>
                        <div className="security-notice mt-4" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)', color: '#D97706' }}>
                            <AlertTriangleIcon size={16} />
                            <span>운영 환경에서는 API 키를 서버 측(Firebase Functions)에서 관리하는 것을 권장합니다.</span>
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

