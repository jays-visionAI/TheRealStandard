import { Fragment, useEffect, useMemo, useState } from 'react'
import {
    getAllSupplierApplications, updateSupplierApplicationStatus,
    type SupplierApplication, type SupplierApplicationStatus,
} from '../../lib/supplierApplicationService'
import {
    createOnboardingInvite, getOnboardingInviteByApplication, type OnboardingInvite,
} from '../../lib/onboardingInviteService'
import { useAuth } from '../../contexts/AuthContext'
import { FactoryIcon } from '../../components/Icons'

const STATUS_META: Record<SupplierApplicationStatus, { label: string; color: string; bg: string }> = {
    SUBMITTED: { label: '신청접수', color: '#1D4ED8', bg: '#DBEAFE' },
    REVIEWING: { label: '검토중', color: '#B45309', bg: '#FEF3C7' },
    APPROVED: { label: '승인', color: '#047857', bg: '#D1FAE5' },
    REJECTED: { label: '반려', color: '#DC2626', bg: '#FEE2E2' },
    ON_HOLD: { label: '보류', color: '#6B7280', bg: '#F3F4F6' },
    ONBOARDED: { label: '온보딩완료', color: '#7C3AED', bg: '#EDE9FE' },
}
const STATUS_ORDER: SupplierApplicationStatus[] = ['SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'ON_HOLD', 'ONBOARDED']

function formatDate(ts: any): string {
    try {
        const d = ts?.toDate ? ts.toDate() : null
        if (!d) return '-'
        return d.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch { return '-' }
}

export default function SupplierApplicationInbox() {
    const { user } = useAuth()
    const [apps, setApps] = useState<SupplierApplication[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'ALL' | SupplierApplicationStatus>('ALL')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [inviteByApp, setInviteByApp] = useState<Record<string, OnboardingInvite | null>>({})
    const [genId, setGenId] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)

    const onboardUrl = (token: string) => `${window.location.origin}/supplier/onboard/${token}`

    const handleExpand = async (a: SupplierApplication) => {
        const open = expanded === a.id ? null : a.id
        setExpanded(open)
        // 승인/온보딩 단계면 온보딩 초대 조회 (미로딩 시)
        if (open && (a.status === 'APPROVED' || a.status === 'ONBOARDED') && inviteByApp[a.id] === undefined) {
            const inv = await getOnboardingInviteByApplication(a.id)
            setInviteByApp(prev => ({ ...prev, [a.id]: inv }))
        }
    }

    const generateInvite = async (a: SupplierApplication) => {
        setGenId(a.id)
        try {
            const token = await createOnboardingInvite({
                applicationId: a.id,
                companyName: a.companyName,
                bizRegNo: a.bizRegNo,
                ceoName: a.ceoName,
                contactName: a.contactName,
                contactPhone: a.contactPhone,
                contactEmail: a.contactEmail,
                categories: a.categories || [],
            })
            const inv = await getOnboardingInviteByApplication(a.id)
            setInviteByApp(prev => ({ ...prev, [a.id]: inv }))
            try { await navigator.clipboard.writeText(onboardUrl(token)); setCopied(a.id) } catch { /* 클립보드 미지원 */ }
        } catch (err) {
            console.error('Failed to create onboarding invite:', err)
        } finally {
            setGenId(null)
        }
    }

    const load = async () => {
        setLoading(true)
        try { setApps(await getAllSupplierApplications()) }
        catch (err) { console.error('Failed to load supplier applications:', err) }
        finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    const counts = useMemo(() => {
        const c: Record<string, number> = { ALL: apps.length }
        STATUS_ORDER.forEach(s => c[s] = 0)
        apps.forEach(a => { c[a.status] = (c[a.status] || 0) + 1 })
        return c
    }, [apps])

    const filtered = useMemo(() => filter === 'ALL' ? apps : apps.filter(a => a.status === filter), [apps, filter])

    const changeStatus = async (a: SupplierApplication, status: SupplierApplicationStatus) => {
        setUpdatingId(a.id)
        setApps(prev => prev.map(x => x.id === a.id ? { ...x, status } : x))
        try {
            await updateSupplierApplicationStatus(a.id, status, { reviewedBy: user?.id })
        } catch (err) {
            console.error('Failed to update status:', err)
            load()
        } finally {
            setUpdatingId(null)
        }
    }

    const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }
    const td: React.CSSProperties = { padding: '12px 14px', fontSize: '13px', color: '#1F2937', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: 800, color: '#1F2937', margin: 0 }}>
                    <FactoryIcon size={22} /> 공급사 입점 신청
                </h1>
                <button className="btn btn-ghost" onClick={load}>새로고침</button>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: 0, marginBottom: '16px' }}>
                입점 신청을 검토하고 상태를 변경하세요. 승인 후 계정 발급(초대링크)은 다음 단계(Phase B)에서 연결됩니다.
            </p>

            {/* 상태 필터 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {(['ALL', ...STATUS_ORDER] as const).map(f => {
                    const active = filter === f
                    return (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            background: active ? '#1F2937' : '#fff', color: active ? '#fff' : '#374151',
                            border: `1px solid ${active ? '#1F2937' : '#E5E7EB'}`, borderRadius: '8px',
                            padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}>
                            {f === 'ALL' ? '전체' : STATUS_META[f].label}
                            <span style={{ marginLeft: '6px', opacity: 0.7, fontSize: '12px' }}>({counts[f] || 0})</span>
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏭</div>
                    <p style={{ margin: 0 }}>해당하는 입점 신청이 없습니다.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
                        <thead>
                            <tr>
                                <th style={th}>접수일시</th>
                                <th style={th}>상호 / 대표</th>
                                <th style={th}>담당자 / 연락처</th>
                                <th style={th}>취급 카테고리</th>
                                <th style={th}>월 공급</th>
                                <th style={th}>상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(a => {
                                const isOpen = expanded === a.id
                                return (
                                    <Fragment key={a.id}>
                                        <tr onClick={() => handleExpand(a)} style={{ cursor: 'pointer', background: isOpen ? '#F9FAFB' : undefined, opacity: updatingId === a.id ? 0.5 : 1 }}>
                                            <td style={{ ...td, whiteSpace: 'nowrap', color: '#6B7280' }}>{formatDate(a.createdAt)}</td>
                                            <td style={td}>
                                                <div style={{ fontWeight: 700 }}>{a.companyName}</div>
                                                <div style={{ color: '#6B7280', fontSize: '12px' }}>{a.ceoName} · {a.bizRegNo}</div>
                                            </td>
                                            <td style={td}>
                                                <div>{a.contactName}</div>
                                                <div style={{ color: '#6B7280', fontSize: '12px' }}>{a.contactPhone}</div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {(a.categories || []).map(c => (
                                                        <span key={c} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '6px', background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>{c}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ ...td, color: '#374151' }}>{a.monthlyCapacity || '-'}</td>
                                            <td style={td} onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={a.status}
                                                    disabled={updatingId === a.id}
                                                    onChange={(e) => changeStatus(a, e.target.value as SupplierApplicationStatus)}
                                                    style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', color: STATUS_META[a.status].color, background: STATUS_META[a.status].bg }}
                                                >
                                                    {STATUS_ORDER.map(s => (
                                                        <option key={s} value={s} style={{ color: '#1F2937', background: '#fff' }}>{STATUS_META[s].label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '16px 20px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
                                                        <div><span style={{ color: '#6B7280' }}>이메일</span><div style={{ fontWeight: 600 }}>{a.contactEmail || '-'}</div></div>
                                                        <div><span style={{ color: '#6B7280' }}>주요 품목</span><div style={{ fontWeight: 600 }}>{a.mainItems || '-'}</div></div>
                                                        <div><span style={{ color: '#6B7280' }}>산지/도축장</span><div style={{ fontWeight: 600 }}>{a.origin || '-'}</div></div>
                                                    </div>
                                                    {a.message && (
                                                        <div style={{ marginTop: '12px' }}>
                                                            <span style={{ color: '#6B7280', fontSize: '13px' }}>제안 내용</span>
                                                            <div style={{ marginTop: '4px', fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 12px' }}>{a.message}</div>
                                                        </div>
                                                    )}
                                                    {a.reviewNote && (
                                                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#B45309' }}>심사 메모: {a.reviewNote}</div>
                                                    )}

                                                    {/* 온보딩 (승인/온보딩 단계) */}
                                                    {(a.status === 'APPROVED' || a.status === 'ONBOARDED') && (
                                                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #E5E7EB' }} onClick={(e) => e.stopPropagation()}>
                                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>🚪 온보딩 (계정 발급)</div>
                                                            {(() => {
                                                                const inv = inviteByApp[a.id]
                                                                if (inv === undefined) return <div style={{ fontSize: '12px', color: '#9CA3AF' }}>불러오는 중...</div>
                                                                if (!inv) {
                                                                    return (
                                                                        <button onClick={() => generateInvite(a)} disabled={genId === a.id} className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '13px' }}>
                                                                            {genId === a.id ? '생성 중...' : '온보딩 링크 생성'}
                                                                        </button>
                                                                    )
                                                                }
                                                                return (
                                                                    <div>
                                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                            <input readOnly value={onboardUrl(inv.token)} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: '260px', padding: '8px 10px', fontSize: '12px', border: '1px solid #E5E7EB', borderRadius: '6px', color: '#374151' }} />
                                                                            <button onClick={() => { navigator.clipboard?.writeText(onboardUrl(inv.token)); setCopied(a.id) }} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: '12px' }}>{copied === a.id ? '복사됨 ✓' : '링크 복사'}</button>
                                                                        </div>
                                                                        <div style={{ marginTop: '8px', fontSize: '12px', color: inv.used ? '#047857' : '#B45309', fontWeight: 600 }}>
                                                                            {inv.used ? '✅ 공급사가 온보딩을 완료해 계정이 발급되었습니다.' : '⏳ 공급사에게 이 링크를 전달하세요. (계정 미발급)'}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
