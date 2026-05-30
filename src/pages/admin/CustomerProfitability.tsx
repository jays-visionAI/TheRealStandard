import { Fragment, useEffect, useMemo, useState } from 'react'
import { computeCustomerProfitability, type ProfitabilityResult } from '../../lib/profitabilityService'
import { WalletIcon, AlertTriangleIcon, InfoIcon } from '../../components/Icons'

const RATE_OPTIONS = [0.05, 0.08, 0.10]
const LOW_MARGIN_THRESHOLD = 0.05  // 5% 미만 경고

function won(n: number): string {
    return Math.round(n).toLocaleString('ko-KR')
}
function pct(n: number): string {
    return `${(n * 100).toFixed(1)}%`
}

export default function CustomerProfitability() {
    const [rate, setRate] = useState(0.08)
    const [data, setData] = useState<ProfitabilityResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)

    const load = async (r: number) => {
        setLoading(true)
        try {
            setData(await computeCustomerProfitability(r))
        } catch (err) {
            console.error('Failed to compute profitability:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load(rate) }, [rate])

    const maxMonthlyRevenue = useMemo(() => {
        if (!data) return 0
        let m = 0
        data.rows.forEach(r => r.monthly.forEach(x => { if (x.revenue > m) m = x.revenue }))
        return m
    }, [data])

    const th: React.CSSProperties = { textAlign: 'right', padding: '11px 12px', fontSize: '12px', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }
    const thL: React.CSSProperties = { ...th, textAlign: 'left' }
    const td: React.CSSProperties = { padding: '11px 12px', fontSize: '13px', color: '#1F2937', borderBottom: '1px solid #F3F4F6', textAlign: 'right', whiteSpace: 'nowrap' }
    const tdL: React.CSSProperties = { ...td, textAlign: 'left' }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: 800, color: '#1F2937', margin: 0 }}>
                    <WalletIcon size={22} /> 거래처 수익성 분석
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>회수기간 기회비용율(연)</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {RATE_OPTIONS.map(r => (
                            <button
                                key={r}
                                onClick={() => setRate(r)}
                                style={{
                                    padding: '6px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                    borderRadius: '6px',
                                    border: `1px solid ${rate === r ? '#1F2937' : '#E5E7EB'}`,
                                    background: rate === r ? '#1F2937' : '#fff',
                                    color: rate === r ? '#fff' : '#374151',
                                }}
                            >{(r * 100).toFixed(0)}%</button>
                        ))}
                    </div>
                    <button className="btn btn-ghost" onClick={() => load(rate)}>새로고침</button>
                </div>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: 0, marginBottom: '20px' }}>
                공헌이익 = 매출 − 매입원가 − 운송비 − 회수기간 비용. 공헌이익 순으로 정렬됩니다.
            </p>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>수익성을 계산하는 중...</div>
            ) : !data || data.rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
                    <p style={{ margin: 0 }}>분석할 매출 데이터가 없습니다.</p>
                </div>
            ) : (
                <>
                    {/* 요약 KPI */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        {[
                            { label: '총 매출', value: `₩${won(data.totals.revenue)}` },
                            { label: '총 공헌이익', value: `₩${won(data.totals.contributionMargin)}`, sub: pct(data.totals.cmPercent) },
                            { label: '총 미수 잔액', value: `₩${won(data.totals.outstanding)}` },
                            { label: '분석 거래처', value: `${data.totals.customerCount}곳` },
                        ].map(k => (
                            <div key={k.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>{k.label}</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937' }}>{k.value}</div>
                                {k.sub && <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '2px' }}>{k.sub}</div>}
                            </div>
                        ))}
                    </div>

                    {/* 랭킹 테이블 */}
                    <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thL, width: '36px' }}>#</th>
                                    <th style={thL}>거래처</th>
                                    <th style={th}>매출</th>
                                    <th style={th}>매입원가</th>
                                    <th style={th}>회수기간비</th>
                                    <th style={th}>공헌이익</th>
                                    <th style={th}>CM%</th>
                                    <th style={th}>미수잔액</th>
                                    <th style={th}>평균결제일</th>
                                    <th style={th}>주문</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.map((r, idx) => {
                                    const low = r.cmPercent < LOW_MARGIN_THRESHOLD
                                    const isOpen = expanded === r.customerOrgId
                                    return (
                                        <Fragment key={r.customerOrgId}>
                                            <tr
                                                onClick={() => setExpanded(isOpen ? null : r.customerOrgId)}
                                                style={{ cursor: 'pointer', background: isOpen ? '#F9FAFB' : undefined }}
                                            >
                                                <td style={tdL}>{idx + 1}</td>
                                                <td style={tdL}>
                                                    <span style={{ fontWeight: 700 }}>{r.customerName}</span>
                                                    {low && (
                                                        <span title="공헌이익률 5% 미만 — 단가 인상 협상 검토" style={{ marginLeft: '6px', color: '#DC2626', display: 'inline-flex', verticalAlign: 'middle' }}>
                                                            <AlertTriangleIcon size={14} />
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={td}>{won(r.revenue)}</td>
                                                <td style={td}>{won(r.cost)}</td>
                                                <td style={td}>{won(r.carryingCost)}</td>
                                                <td style={{ ...td, fontWeight: 700 }}>{won(r.contributionMargin)}</td>
                                                <td style={{ ...td, color: low ? '#DC2626' : '#047857', fontWeight: 700 }}>{pct(r.cmPercent)}</td>
                                                <td style={{ ...td, color: r.outstanding > 0 ? '#B45309' : '#9CA3AF' }}>{won(r.outstanding)}</td>
                                                <td style={td}>{r.avgPaymentDays}일</td>
                                                <td style={td}>{r.orderCount}</td>
                                            </tr>
                                            {isOpen && (
                                                <tr>
                                                    <td colSpan={10} style={{ padding: '16px 20px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>월별 매출 추이</div>
                                                        {r.monthly.length === 0 ? (
                                                            <div style={{ fontSize: '13px', color: '#9CA3AF' }}>월별 데이터가 없습니다.</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
                                                                {r.monthly.map(m => (
                                                                    <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: '0 0 auto' }}>
                                                                        <div style={{ fontSize: '10px', color: '#6B7280' }}>{won(m.revenue / 10000)}만</div>
                                                                        <div style={{
                                                                            width: '28px',
                                                                            height: `${maxMonthlyRevenue > 0 ? Math.max(4, (m.revenue / maxMonthlyRevenue) * 90) : 4}px`,
                                                                            background: low ? '#FCA5A5' : '#6EE7B7', borderRadius: '4px 4px 0 0',
                                                                        }} />
                                                                        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{m.month.slice(2)}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {low && (
                                                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#B45309', background: '#FEF3C7', padding: '8px 12px', borderRadius: '8px', display: 'inline-block' }}>
                                                                ⚠ 공헌이익률 {pct(r.cmPercent)} — 단가 인상 협상 또는 운송/회수조건 재검토가 필요합니다.
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

                    {/* 데이터 한계 메모 */}
                    <div style={{ marginTop: '16px', fontSize: '12px', color: '#6B7280' }}>
                        {data.notes.map((n, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                                <InfoIcon size={13} /> <span>{n}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
