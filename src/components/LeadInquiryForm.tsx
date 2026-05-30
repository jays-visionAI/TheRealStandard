import { useState } from 'react'
import { createLead, type Lead } from '../lib/leadService'
import { COLOR, FONT, RADIUS, btnPrimary } from '../styles/design-tokens'

interface LeadInquiryFormProps {
    source: Lead['source']
    productId?: string
    productName?: string
    onSuccess?: () => void
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: '14px',
    border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.md,
    fontFamily: FONT, color: COLOR.text, background: COLOR.surface,
    boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: COLOR.text, marginBottom: '6px',
}

/**
 * 비회원 거래문의 폼 — leads 컬렉션으로 인입.
 * 공개 카탈로그 / 상품 상세 / 랜딩 등에서 재사용 (source로 인입 경로 구분).
 */
export default function LeadInquiryForm({ source, productId, productName, onSuccess }: LeadInquiryFormProps) {
    const [form, setForm] = useState({ companyName: '', contactName: '', phone: '', email: '', message: '' })
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()) {
            setError('상호 · 담당자명 · 연락처는 필수입니다.')
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            await createLead({
                companyName: form.companyName.trim(),
                contactName: form.contactName.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || undefined,
                message: form.message.trim() || undefined,
                productId,
                productName,
                source,
            })
            setDone(true)
            onSuccess?.()
        } catch (err) {
            console.error('Failed to submit lead:', err)
            setError('문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.')
        } finally {
            setSubmitting(false)
        }
    }

    if (done) {
        return (
            <div style={{
                padding: '32px 24px', textAlign: 'center',
                background: COLOR.primaryLight, borderRadius: RADIUS.lg,
                border: `1px solid ${COLOR.primary}`,
            }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: COLOR.primaryDark, marginBottom: '6px' }}>
                    거래문의가 접수되었습니다
                </p>
                <p style={{ fontSize: '13px', color: COLOR.primaryDark, opacity: 0.85 }}>
                    담당자가 빠르게 회신드리겠습니다. 감사합니다.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {productName && (
                <div style={{ fontSize: '13px', color: COLOR.textMuted }}>
                    문의 상품: <strong style={{ color: COLOR.text }}>{productName}</strong>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={labelStyle}>상호 *</label>
                    <input style={inputStyle} value={form.companyName} onChange={set('companyName')} placeholder="(주)거래처" />
                </div>
                <div>
                    <label style={labelStyle}>담당자명 *</label>
                    <input style={inputStyle} value={form.contactName} onChange={set('contactName')} placeholder="홍길동" />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={labelStyle}>연락처 *</label>
                    <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" />
                </div>
                <div>
                    <label style={labelStyle}>이메일</label>
                    <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="name@company.com" />
                </div>
            </div>
            <div>
                <label style={labelStyle}>문의 내용</label>
                <textarea
                    style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
                    value={form.message}
                    onChange={set('message')}
                    placeholder="필요 품목, 예상 수량, 납품 주기 등을 적어주시면 빠른 상담이 가능합니다."
                />
            </div>
            {error && (
                <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>{error}</div>
            )}
            <button
                type="submit"
                disabled={submitting}
                style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'default' : 'pointer' }}
            >
                {submitting ? '전송 중...' : '거래문의 보내기'}
            </button>
        </form>
    )
}
