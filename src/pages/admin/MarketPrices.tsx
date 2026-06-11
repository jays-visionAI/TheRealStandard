import { useState, useEffect } from 'react'
import { ingestEkapeRange } from '../../lib/marketDataService'
import { probeEkapeRaw } from '../../lib/external/ekapeService'
import { getSpeciesPriceTrend, SPECIES_LABEL, type MarketTrend } from '../../lib/marketInsightService'
import { TrendingUpIcon, ChartIcon, LoaderIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon } from '../../components/Icons'

// 관리자 시세 대시보드 (EKAPE 경락가격) — 수집(키 보유) + 추이 표시.
// 고객 대시보드의 "시세 동향" 인사이트가 여기서 적재한 marketPrices를 읽는다.

function won(n: number) { return Math.round(n).toLocaleString('ko-KR') }

function Sparkline({ points }: { points: { date: string; avgPrice: number }[] }) {
    if (points.length < 2) return <div style={{ height: 60, color: '#9CA3AF', fontSize: 12, display: 'flex', alignItems: 'center' }}>데이터 부족</div>
    const w = 280, h = 60, pad = 4
    const vals = points.map(p => p.avgPrice)
    const min = Math.min(...vals), max = Math.max(...vals)
    const range = max - min || 1
    const d = points.map((p, i) => {
        const x = pad + (i / (points.length - 1)) * (w - 2 * pad)
        const y = h - pad - ((p.avgPrice - min) / range) * (h - 2 * pad)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    const last = points[points.length - 1].avgPrice
    const first = points[0].avgPrice
    const up = last >= first
    return (
        <svg width={w} height={h} style={{ display: 'block' }}>
            <path d={d} fill="none" stroke={up ? '#DC2626' : '#2563EB'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function TrendCard({ trend }: { trend: MarketTrend }) {
    const label = SPECIES_LABEL[trend.productType]
    if (!trend.hasData) {
        return (
            <div className="glass-card" style={{ padding: 20, borderRadius: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 8px' }}>{label}</h3>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>수집된 시세 데이터가 없습니다. 위에서 "최근 시세 수집"을 실행하세요.</p>
            </div>
        )
    }
    const up = trend.changePct >= 0
    const tone = Math.abs(trend.changePct) < 1.5 ? '#6B7280' : up ? '#DC2626' : '#2563EB'
    return (
        <div className="glass-card" style={{ padding: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{label} 도매 평균가</h3>
                <span style={{ fontSize: 16, fontWeight: 800, color: tone }}>{up ? '▲' : '▼'} {Math.abs(trend.changePct).toFixed(1)}%</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1F2937', marginBottom: 2 }}>₩{won(trend.latestAvg)}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                기준일 {trend.latestDate} · 지난주 ₩{won(trend.weekAgoAvg)}
            </div>
            <Sparkline points={trend.points} />
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>최근 {trend.points.length}개 영업일 추이</div>
        </div>
    )
}

export default function MarketPrices() {
    const [beef, setBeef] = useState<MarketTrend | null>(null)
    const [pork, setPork] = useState<MarketTrend | null>(null)
    const [loading, setLoading] = useState(true)
    const [ingesting, setIngesting] = useState(false)
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [probing, setProbing] = useState(false)
    const [probeOut, setProbeOut] = useState<string>('')

    // 진단: 후보 operation × 최근 며칠을 직접 호출해 원본 응답을 보여줌 (필드명/구조 확정용)
    const handleProbe = async () => {
        setProbing(true); setProbeOut('진단 중...')
        const ops = ['cattle', 'pigGrade', 'pigJejuGrade']
        const lines: string[] = []
        for (let i = 1; i <= 5; i++) {
            const d = new Date(); d.setDate(d.getDate() - i)
            const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
            for (const op of ops) {
                try {
                    const r = await probeEkapeRaw(op, ymd)
                    lines.push(`[${ymd}] ${op}: HTTP ${r.status} · code=${r.resultCode ?? '-'} · msg=${r.resultMsg ?? '-'} · items=${r.itemCount}`)
                    if (r.itemCount > 0) {
                        lines.push(`   ▶ 필드: ${r.firstItemFields.join(', ')}`)
                        lines.push(`   ▶ 원본: ${r.rawSnippet.replace(/\s+/g, ' ').slice(0, 400)}`)
                        setProbeOut(lines.join('\n'))
                        setProbing(false)
                        return // 첫 성공 응답에서 멈춤
                    }
                } catch (e: any) {
                    lines.push(`[${ymd}] ${op}: ERROR ${e?.message}`)
                }
            }
            setProbeOut(lines.join('\n'))
        }
        lines.push('\n→ 모든 후보에서 item 0건. resultMsg를 확인하세요(키 미등록/파라미터 오류 가능).')
        setProbeOut(lines.join('\n'))
        setProbing(false)
    }

    const reload = async () => {
        setLoading(true)
        const [b, p] = await Promise.all([getSpeciesPriceTrend('BEEF'), getSpeciesPriceTrend('PORK')])
        setBeef(b); setPork(p); setLoading(false)
    }

    useEffect(() => { reload() }, [])

    const handleIngest = async (days: number) => {
        setIngesting(true); setMsg(null)
        try {
            const r = await ingestEkapeRange(days)
            setMsg({ type: 'ok', text: `수집 완료 — 신규 ${r.ingested}건 적재, ${r.skipped}일은 이미 수집됨(${r.days}일 시도).` })
            await reload()
        } catch (e: any) {
            setMsg({ type: 'err', text: `수집 실패: ${e?.message || '오류'} (EKAPE 키/네트워크 확인)` })
        } finally {
            setIngesting(false)
        }
    }

    return (
        <div className="settings-page" style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUpIcon size={28} className="text-primary" /> 축산물 시세 (경락가격)
                </h1>
                <p className="text-muted mt-1">EKAPE 경락가격을 수집해 marketPrices에 적재합니다. 고객 대시보드의 "시세 동향" 인사이트가 이 데이터를 사용합니다.</p>
            </div>

            <div className="glass-card" style={{ padding: 20, borderRadius: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <ChartIcon size={20} className="text-primary" />
                <span style={{ fontWeight: 700 }}>시세 수집</span>
                <span style={{ fontSize: 13, color: '#6B7280', flex: 1 }}>최근 영업일의 소/돼지 도매 경락가를 가져옵니다. (이미 수집된 날짜는 건너뜀)</span>
                <button className="btn btn-secondary" onClick={() => handleIngest(7)} disabled={ingesting}>
                    {ingesting ? <LoaderIcon className="animate-spin" size={16} /> : <RefreshCwIcon size={16} />} 최근 7일
                </button>
                <button className="btn btn-primary" onClick={() => handleIngest(14)} disabled={ingesting}>
                    {ingesting ? <LoaderIcon className="animate-spin" size={16} /> : <RefreshCwIcon size={16} />} 최근 14일 수집
                </button>
                <button className="btn btn-ghost" onClick={handleProbe} disabled={probing} title="EKAPE 원본 응답을 확인합니다">
                    {probing ? <LoaderIcon className="animate-spin" size={16} /> : '🔬'} 원본 응답 진단
                </button>
            </div>

            {probeOut && (
                <pre style={{
                    background: '#0F172A', color: '#A5F3FC', padding: '14px 16px', borderRadius: 12, marginBottom: 20,
                    fontSize: 12, lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>{probeOut}</pre>
            )}

            {msg && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, marginBottom: 20,
                    background: msg.type === 'ok' ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${msg.type === 'ok' ? '#A7F3D0' : '#FECACA'}`,
                    color: msg.type === 'ok' ? '#065F46' : '#991B1B', fontSize: 14,
                }}>
                    {msg.type === 'ok' ? <CheckCircleIcon size={16} /> : <AlertCircleIcon size={16} />}{msg.text}
                </div>
            )}

            {loading ? (
                <div className="text-center text-muted" style={{ padding: 40 }}>시세 불러오는 중...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                    {pork && <TrendCard trend={pork} />}
                    {beef && <TrendCard trend={beef} />}
                </div>
            )}
        </div>
    )
}
