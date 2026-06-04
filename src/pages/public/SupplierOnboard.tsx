import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { createUser, updateUser } from '../../lib/userService'
import { getOnboardingInvite, markOnboardingInviteUsed, type OnboardingInvite } from '../../lib/onboardingInviteService'
import FileUpload from '../../components/FileUpload'
import type { FileType } from '../../lib/fileService'
import { COLOR, FONT, RADIUS, SHADOW, containerStyle, btnPrimary } from '../../styles/design-tokens'

type Step = 'loading' | 'invalid' | 'used' | 'account' | 'docs' | 'done'

interface DocSlot { key: string; label: string; fileType: FileType; required: boolean }
const DOC_SLOTS: DocSlot[] = [
    { key: 'biz', label: '사업자등록증', fileType: 'BIZ_REG', required: true },
    { key: 'meat', label: '축산물 영업 신고/허가증', fileType: 'COMPANY_DOC', required: true },
    { key: 'bank', label: '통장 사본', fileType: 'BANK_BOOK', required: true },
    { key: 'haccp', label: 'HACCP 인증서 (선택)', fileType: 'COMPANY_DOC', required: false },
    { key: 'antibiotic', label: '무항생제/친환경 인증 (선택)', fileType: 'COMPANY_DOC', required: false },
    { key: 'etc', label: '기타 서류 (선택)', fileType: 'OTHER', required: false },
]
const REQUIRED_KEYS = DOC_SLOTS.filter(d => d.required).map(d => d.key)

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: '14px',
    border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.md,
    fontFamily: FONT, color: COLOR.text, background: COLOR.surface, boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: COLOR.text, marginBottom: '6px' }

export default function SupplierOnboard() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const [step, setStep] = useState<Step>('loading')
    const [invite, setInvite] = useState<OnboardingInvite | null>(null)
    const [uid, setUid] = useState<string | null>(null)
    const [uploaded, setUploaded] = useState<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const [acct, setAcct] = useState({ email: '', password: '', confirm: '' })

    useEffect(() => {
        if (!token) { setStep('invalid'); return }
        getOnboardingInvite(token)
            .then(inv => {
                if (!inv) { setStep('invalid'); return }
                if (inv.used) { setStep('used'); return }
                setInvite(inv)
                setAcct(a => ({ ...a, email: inv.contactEmail || '' }))
                setStep('account')
            })
            .catch(err => { console.error(err); setStep('invalid') })
    }, [token])

    const createAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!invite) return
        if (!acct.email.trim() || !acct.password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
        if (acct.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
        if (acct.password !== acct.confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
        setBusy(true); setError(null)
        try {
            const cred = await createUserWithEmailAndPassword(auth, acct.email.toLowerCase().trim(), acct.password)
            const newUid = cred.user.uid
            await createUser({
                email: acct.email.toLowerCase().trim(),
                name: invite.contactName,
                phone: invite.contactPhone,
                role: 'SUPPLIER',
                status: 'PENDING',
                firebaseUid: newUid,
                business: {
                    companyName: invite.companyName,
                    bizRegNo: invite.bizRegNo,
                    ceoName: invite.ceoName,
                    address: '',
                    tel: invite.contactPhone,
                    contactPerson: invite.contactName,
                    contactPhone: invite.contactPhone,
                    productCategories: invite.categories,
                },
            }, newUid)
            setUid(newUid)
            setStep('docs')
        } catch (err: any) {
            console.error('Onboard account creation failed:', err)
            if (err.code === 'auth/email-already-in-use') setError('이미 사용 중인 이메일입니다. 다른 이메일을 쓰거나 로그인해주세요.')
            else setError(`계정 생성 실패: ${err.message || err.code}`)
        } finally {
            setBusy(false)
        }
    }

    const completeOnboarding = async () => {
        if (!uid || !token) return
        const missing = REQUIRED_KEYS.filter(k => !uploaded.has(k))
        if (missing.length > 0) { setError('필수 서류를 모두 업로드해주세요.'); return }
        setBusy(true); setError(null)
        try {
            await updateUser(uid, { status: 'ACTIVE' })
            await markOnboardingInviteUsed(token, uid)
            setStep('done')
        } catch (err: any) {
            console.error('Complete onboarding failed:', err)
            setError(`완료 처리 실패: ${err.message || err.code}`)
        } finally {
            setBusy(false)
        }
    }

    const Shell = ({ children }: { children: React.ReactNode }) => (
        <div style={{ minHeight: '100vh', background: COLOR.bg, color: COLOR.text, fontFamily: FONT, lineHeight: 1.6 }}>
            <header style={{ borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface }}>
                <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', height: '64px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <div style={{ minWidth: '44px', height: '34px', borderRadius: RADIUS.md, background: COLOR.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, padding: '0 8px' }}>믿고</div>
                        <span style={{ fontSize: '19px', fontWeight: 700, color: COLOR.secondary }}>MEATGO</span>
                    </Link>
                </div>
            </header>
            <section style={{ ...containerStyle, maxWidth: '640px', padding: '40px 24px 64px' }}>{children}</section>
        </div>
    )

    if (step === 'loading') return <Shell><div style={{ textAlign: 'center', padding: '60px 0', color: COLOR.textMuted }}>불러오는 중...</div></Shell>
    if (step === 'invalid') return <Shell><div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: '44px' }}>🔗</div><h1 style={{ fontSize: '22px', fontWeight: 800, color: COLOR.secondary, margin: '12px 0 8px' }}>유효하지 않은 링크</h1><p style={{ color: COLOR.textMuted, marginBottom: '24px' }}>온보딩 링크가 올바르지 않습니다. 담당자에게 문의해주세요.</p><button onClick={() => navigate('/')} style={btnPrimary}>홈으로</button></div></Shell>
    if (step === 'used') return <Shell><div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: '44px' }}>✅</div><h1 style={{ fontSize: '22px', fontWeight: 800, color: COLOR.secondary, margin: '12px 0 8px' }}>이미 완료된 온보딩</h1><p style={{ color: COLOR.textMuted, marginBottom: '24px' }}>이 링크는 이미 사용되었습니다. 로그인해주세요.</p><button onClick={() => navigate('/login')} style={btnPrimary}>로그인</button></div></Shell>

    if (step === 'done') return (
        <Shell>
            <div style={{ textAlign: 'center', padding: '40px 28px', background: COLOR.primaryLight, borderRadius: RADIUS.xl, border: `1px solid ${COLOR.primary}` }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎉</div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: COLOR.primaryDark, marginBottom: '8px' }}>입점 온보딩 완료!</h1>
                <p style={{ fontSize: '14px', color: COLOR.primaryDark, opacity: 0.85, marginBottom: '24px' }}>공급사 계정이 활성화되었습니다. 이제 로그인하여 거래를 시작할 수 있습니다.</p>
                <button onClick={() => navigate('/login')} style={btnPrimary}>로그인하기</button>
            </div>
        </Shell>
    )

    return (
        <Shell>
            <div style={{ marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: COLOR.primary, letterSpacing: '1px', textTransform: 'uppercase' }}>Supplier Onboarding</div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: COLOR.secondary, marginBottom: '6px' }}>입점 온보딩</h1>
            {invite && <p style={{ fontSize: '14px', color: COLOR.textMuted, marginBottom: '24px' }}><strong style={{ color: COLOR.text }}>{invite.companyName}</strong> · {invite.ceoName} · {invite.bizRegNo}</p>}

            {/* 단계 표시 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ padding: '4px 10px', borderRadius: RADIUS.pill, background: step === 'account' ? COLOR.primary : COLOR.primaryLight, color: step === 'account' ? '#fff' : COLOR.primaryDark }}>1. 계정 생성</span>
                <span style={{ padding: '4px 10px', borderRadius: RADIUS.pill, background: step === 'docs' ? COLOR.primary : COLOR.surfaceAlt, color: step === 'docs' ? '#fff' : COLOR.textMuted }}>2. 서류 업로드</span>
            </div>

            {step === 'account' && (
                <form onSubmit={createAccount} style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.xl, padding: '24px', boxShadow: SHADOW.sm, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ fontSize: '13px', color: COLOR.textMuted, margin: 0 }}>로그인에 사용할 이메일과 비밀번호를 설정하세요.</p>
                    <div><label style={labelStyle}>이메일 *</label><input style={inputStyle} type="email" value={acct.email} onChange={e => setAcct({ ...acct, email: e.target.value })} placeholder="name@company.com" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={labelStyle}>비밀번호 * (6자+)</label><input style={inputStyle} type="password" value={acct.password} onChange={e => setAcct({ ...acct, password: e.target.value })} /></div>
                        <div><label style={labelStyle}>비밀번호 확인 *</label><input style={inputStyle} type="password" value={acct.confirm} onChange={e => setAcct({ ...acct, confirm: e.target.value })} /></div>
                    </div>
                    {error && <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>{error}</div>}
                    <button type="submit" disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>{busy ? '생성 중...' : '계정 만들고 다음 →'}</button>
                </form>
            )}

            {step === 'docs' && uid && (
                <div style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.xl, padding: '24px', boxShadow: SHADOW.sm }}>
                    <p style={{ fontSize: '13px', color: COLOR.textMuted, marginTop: 0, marginBottom: '18px' }}>
                        <strong style={{ color: '#DC2626' }}>필수 3종</strong>(사업자등록증·축산물 영업증·통장사본)을 업로드하면 온보딩이 완료됩니다. PDF·이미지(최대 10MB).
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {DOC_SLOTS.map(slot => (
                            <div key={slot.key} style={{ border: `1px solid ${uploaded.has(slot.key) ? COLOR.primary : COLOR.border}`, borderRadius: RADIUS.lg, padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: COLOR.text }}>{slot.label}</span>
                                    {slot.required && <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>필수</span>}
                                    {uploaded.has(slot.key) && <span style={{ fontSize: '12px', color: COLOR.primary, fontWeight: 700, marginLeft: 'auto' }}>✓ 업로드됨</span>}
                                </div>
                                <FileUpload
                                    fileType={slot.fileType}
                                    relatedType="SUPPLIER"
                                    relatedId={uid}
                                    label="파일 선택"
                                    onUploaded={() => setUploaded(prev => new Set(prev).add(slot.key))}
                                />
                            </div>
                        ))}
                    </div>
                    {error && <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500, marginTop: '14px' }}>{error}</div>}
                    <button onClick={completeOnboarding} disabled={busy} style={{ ...btnPrimary, width: '100%', marginTop: '20px', opacity: busy ? 0.6 : 1 }}>
                        {busy ? '처리 중...' : `온보딩 완료 (${REQUIRED_KEYS.filter(k => uploaded.has(k)).length}/${REQUIRED_KEYS.length} 필수)`}
                    </button>
                </div>
            )}
        </Shell>
    )
}
