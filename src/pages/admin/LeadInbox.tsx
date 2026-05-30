import { useEffect, useMemo, useState } from 'react'
import { getAllLeads, updateLeadStatus, type Lead, type LeadStatus } from '../../lib/leadService'
import { MegaphoneIcon } from '../../components/Icons'

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
    NEW: { label: '신규', color: '#1D4ED8', bg: '#DBEAFE' },
    CONTACTED: { label: '연락함', color: '#B45309', bg: '#FEF3C7' },
    CONVERTED: { label: '거래전환', color: '#047857', bg: '#D1FAE5' },
    CLOSED: { label: '종료', color: '#6B7280', bg: '#F3F4F6' },
}

const SOURCE_LABEL: Record<Lead['source'], string> = {
    PRODUCT_DETAIL: '상품상세',
    CATALOG: '카탈로그',
    LANDING: '랜딩',
}

const STATUS_ORDER: LeadStatus[] = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']

function formatDate(ts: Lead['createdAt']): string {
    try {
        // Firestore Timestamp
        const d = (ts as any)?.toDate ? (ts as any).toDate() : null
        if (!d) return '-'
        return d.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch {
        return '-'
    }
}

export default function LeadInbox() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'ALL' | LeadStatus>('ALL')
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        try {
            setLeads(await getAllLeads())
        } catch (err) {
            console.error('Failed to load leads:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const counts = useMemo(() => {
        const c: Record<string, number> = { ALL: leads.length, NEW: 0, CONTACTED: 0, CONVERTED: 0, CLOSED: 0 }
        leads.forEach(l => { c[l.status] = (c[l.status] || 0) + 1 })
        return c
    }, [leads])

    const filtered = useMemo(() =>
        filter === 'ALL' ? leads : leads.filter(l => l.status === filter),
        [leads, filter])

    const handleStatusChange = async (id: string, status: LeadStatus) => {
        setUpdatingId(id)
        // 낙관적 업데이트
        setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
        try {
            await updateLeadStatus(id, status)
        } catch (err) {
            console.error('Failed to update lead status:', err)
            load() // 실패 시 서버 상태로 복구
        } finally {
            setUpdatingId(null)
        }
    }

    const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }
    const td: React.CSSProperties = { padding: '12px 14px', fontSize: '13px', color: '#1F2937', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: 800, color: '#1F2937', margin: 0 }}>
                    <MegaphoneIcon size={22} /> 거래문의 (Leads)
                </h1>
                <button className="btn btn-ghost" onClick={load}>새로고침</button>
            </div>

            {/* 상태 필터 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {(['ALL', ...STATUS_ORDER] as const).map(f => {
                    const active = filter === f
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                background: active ? '#1F2937' : '#fff',
                                color: active ? '#fff' : '#374151',
                                border: `1px solid ${active ? '#1F2937' : '#E5E7EB'}`,
                                borderRadius: '8px', padding: '8px 14px',
                                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            {f === 'ALL' ? '전체' : STATUS_META[f].label}
                            <span style={{ marginLeft: '6px', opacity: 0.7, fontSize: '12px' }}>({counts[f] || 0})</span>
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>거래문의를 불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                    <p style={{ margin: 0 }}>해당하는 거래문의가 없습니다.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                        <thead>
                            <tr>
                                <th style={th}>접수일시</th>
                                <th style={th}>상호 / 담당자</th>
                                <th style={th}>연락처</th>
                                <th style={th}>인입경로</th>
                                <th style={th}>문의 상품</th>
                                <th style={th}>문의 내용</th>
                                <th style={th}>상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(lead => (
                                <tr key={lead.id} style={{ opacity: updatingId === lead.id ? 0.5 : 1 }}>
                                    <td style={{ ...td, whiteSpace: 'nowrap', color: '#6B7280' }}>{formatDate(lead.createdAt)}</td>
                                    <td style={td}>
                                        <div style={{ fontWeight: 700 }}>{lead.companyName}</div>
                                        <div style={{ color: '#6B7280', fontSize: '12px' }}>{lead.contactName}</div>
                                    </td>
                                    <td style={td}>
                                        <div>{lead.phone}</div>
                                        {lead.email && <div style={{ color: '#6B7280', fontSize: '12px' }}>{lead.email}</div>}
                                    </td>
                                    <td style={td}>
                                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>
                                            {SOURCE_LABEL[lead.source] || lead.source}
                                        </span>
                                    </td>
                                    <td style={{ ...td, color: '#374151' }}>{lead.productName || '-'}</td>
                                    <td style={{ ...td, maxWidth: '280px', whiteSpace: 'pre-wrap', color: '#4B5563', fontSize: '12px' }}>{lead.message || '-'}</td>
                                    <td style={td}>
                                        <select
                                            value={lead.status}
                                            disabled={updatingId === lead.id}
                                            onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                                            style={{
                                                padding: '5px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                                border: 'none', cursor: 'pointer',
                                                color: STATUS_META[lead.status].color, background: STATUS_META[lead.status].bg,
                                            }}
                                        >
                                            {STATUS_ORDER.map(s => (
                                                <option key={s} value={s} style={{ color: '#1F2937', background: '#fff' }}>{STATUS_META[s].label}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
