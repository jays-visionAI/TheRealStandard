import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createSupplierApplication } from '../../lib/supplierApplicationService'
import { useAuth } from '../../contexts/AuthContext'
import { COLOR, FONT, RADIUS, SHADOW, containerStyle, btnPrimary, btnGhost } from '../../styles/design-tokens'

const CATEGORIES = ['돈육(돼지)', '우육(소)', '계육(닭)', '수산', '기타']
const CAPACITY_OPTIONS = ['~5톤', '5~20톤', '20~50톤', '50톤 이상']

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: '14px',
    border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.md,
    fontFamily: FONT, color: COLOR.text, background: COLOR.surface, boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: COLOR.text, marginBottom: '6px',
}

export default function SupplierApply() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({
        companyName: '', bizRegNo: '', ceoName: '',
        contactName: '', contactPhone: '', contactEmail: '',
        mainItems: '', monthlyCapacity: '', origin: '', message: '',
    })
    const [categories, setCategories] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }))

    const toggleCategory = (c: string) =>
        setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.companyName.trim() || !form.bizRegNo.trim() || !form.ceoName.trim() || !form.contactName.trim() || !form.contactPhone.trim()) {
            setError('상호 · 사업자등록번호 · 대표자 · 담당자 · 연락처는 필수입니다.')
            return
        }
        if (categories.length === 0) {
            setError('취급 카테고리를 1개 이상 선택해주세요.')
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            await createSupplierApplication({
                companyName: form.companyName.trim(),
                bizRegNo: form.bizRegNo.trim(),
                ceoName: form.ceoName.trim(),
                contactName: form.contactName.trim(),
                contactPhone: form.contactPhone.trim(),
                contactEmail: form.contactEmail.trim() || undefined,
                categories,
                mainItems: form.mainItems.trim() || undefined,
                monthlyCapacity: form.monthlyCapacity || undefined,
                origin: form.origin.trim() || undefined,
                message: form.message.trim() || undefined,
            })
            setDone(true)
        } catch (err) {
            console.error('Failed to submit supplier application:', err)
            setError('신청 전송에 실패했습니다. 잠시 후 다시 시도해주세요.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: COLOR.bg, color: COLOR.text, fontFamily: FONT, lineHeight: 1.6 }}>
            {/* Header */}
            <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(254,252,248,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${COLOR.border}` }}>
                <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <div style={{ minWidth: '44px', height: '36px', borderRadius: RADIUS.md, background: COLOR.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, padding: '0 8px' }}>믿고</div>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: COLOR.secondary }}>MEATGO</span>
                    </Link>
                    <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <Link to="/products" style={{ color: COLOR.text, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>카탈로그</Link>
                        {user ? (
                            <button onClick={() => navigate('/admin')} style={{ ...btnPrimary, padding: '8px 18px', fontSize: '14px', boxShadow: 'none' }}>대시보드</button>
                        ) : (
                            <button onClick={() => navigate('/login')} style={btnGhost}>로그인</button>
                        )}
                    </nav>
                </div>
            </header>

            <section style={{ ...containerStyle, maxWidth: '720px', padding: '48px 24px 64px' }}>
                <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: COLOR.primary, letterSpacing: '1px', textTransform: 'uppercase' }}>For Suppliers</div>
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: COLOR.secondary, letterSpacing: '-0.5px', marginBottom: '10px' }}>공급사 입점 신청</h1>
                <p style={{ fontSize: '15px', color: COLOR.textMuted, marginBottom: '28px', lineHeight: 1.7 }}>
                    안정적인 판로와 빠른 결제(D+7), 디지털 출고·이력 관리를 제공합니다.<br />
                    아래 정보를 남겨주시면 구매 담당이 검토 후 연락드립니다. (서류는 승인 후 온보딩 단계에서 받습니다.)
                </p>

                {done ? (
                    <div style={{ padding: '40px 28px', textAlign: 'center', background: COLOR.primaryLight, borderRadius: RADIUS.xl, border: `1px solid ${COLOR.primary}` }}>
                        <div style={{ fontSize: '44px', marginBottom: '14px' }}>✅</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: COLOR.primaryDark, marginBottom: '8px' }}>입점 신청이 접수되었습니다</h2>
                        <p style={{ fontSize: '14px', color: COLOR.primaryDark, opacity: 0.85, marginBottom: '24px' }}>구매 담당이 검토 후 연락드리겠습니다. 감사합니다.</p>
                        <button onClick={() => navigate('/')} style={btnPrimary}>홈으로</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.xl, padding: '28px', boxShadow: SHADOW.sm, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={labelStyle}>상호 *</label><input style={inputStyle} value={form.companyName} onChange={set('companyName')} placeholder="(주)○○미트" /></div>
                            <div><label style={labelStyle}>사업자등록번호 *</label><input style={inputStyle} value={form.bizRegNo} onChange={set('bizRegNo')} placeholder="000-00-00000" /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={labelStyle}>대표자 *</label><input style={inputStyle} value={form.ceoName} onChange={set('ceoName')} placeholder="홍길동" /></div>
                            <div><label style={labelStyle}>담당자 *</label><input style={inputStyle} value={form.contactName} onChange={set('contactName')} placeholder="담당자명" /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={labelStyle}>연락처 *</label><input style={inputStyle} value={form.contactPhone} onChange={set('contactPhone')} placeholder="010-0000-0000" /></div>
                            <div><label style={labelStyle}>이메일</label><input style={inputStyle} type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="name@company.com" /></div>
                        </div>

                        <div>
                            <label style={labelStyle}>취급 카테고리 * <span style={{ fontWeight: 400, color: COLOR.textMuted }}>(복수 선택)</span></label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {CATEGORIES.map(c => {
                                    const active = categories.includes(c)
                                    return (
                                        <button type="button" key={c} onClick={() => toggleCategory(c)} style={{
                                            padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: RADIUS.md,
                                            border: `1px solid ${active ? COLOR.primary : COLOR.border}`,
                                            background: active ? COLOR.primary : COLOR.surface,
                                            color: active ? '#fff' : COLOR.text,
                                        }}>{c}</button>
                                    )
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={labelStyle}>주요 품목</label><input style={inputStyle} value={form.mainItems} onChange={set('mainItems')} placeholder="예: 삼겹살, 목심, 등심" /></div>
                            <div>
                                <label style={labelStyle}>월 공급능력</label>
                                <select style={inputStyle} value={form.monthlyCapacity} onChange={set('monthlyCapacity')}>
                                    <option value="">선택 안 함</option>
                                    {CAPACITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>
                        <div><label style={labelStyle}>산지 / 도축장</label><input style={inputStyle} value={form.origin} onChange={set('origin')} placeholder="예: 충남 / ○○도축장" /></div>
                        <div>
                            <label style={labelStyle}>제안 내용</label>
                            <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={form.message} onChange={set('message')} placeholder="공급 조건, 단가 수준, 강점 등을 자유롭게 적어주세요." />
                        </div>

                        {error && <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>{error}</div>}
                        <button type="submit" disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'default' : 'pointer' }}>
                            {submitting ? '전송 중...' : '입점 신청 보내기'}
                        </button>
                    </form>
                )}
            </section>

            <footer style={{ background: COLOR.surfaceAlt, borderTop: `1px solid ${COLOR.border}`, padding: '24px', textAlign: 'center', color: COLOR.textFaint, fontSize: '13px' }}>
                © {new Date().getFullYear()} MEATGO. 프리미엄 육류 B2B 유통.
            </footer>
        </div>
    )
}
