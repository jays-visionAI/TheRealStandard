import { useState } from 'react'
import { planSalesImport, executeSalesImport, type ImportPlan } from '../../lib/salesImportService'
import { UploadIcon, CheckCircleIcon, AlertCircleIcon, LoaderIcon, ClipboardListIcon } from '../../components/Icons'

// 관리자 매출(출하내역) 엑셀 일괄입력 — 업로드 → 미리보기 → 실행.
// 기존 입력분은 자동 제외(거래처+날짜 dedup). 원가는 import하지 않음(부정확).

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

export default function SalesImport() {
    const [fileName, setFileName] = useState('')
    const [plan, setPlan] = useState<ImportPlan | null>(null)
    const [parsing, setParsing] = useState(false)
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState<{ orders: number; items: number } | null>(null)
    const [error, setError] = useState('')

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name); setPlan(null); setResult(null); setError(''); setParsing(true)
        try {
            const buf = await file.arrayBuffer()
            setPlan(await planSalesImport(buf))
        } catch (err: any) {
            setError(`파싱 실패: ${err?.message || err}`)
        } finally {
            setParsing(false)
        }
    }

    const onExecute = async () => {
        if (!plan) return
        if (!confirm(`신규 ${plan.newCount}건(${plan.newLines}라인)을 입력합니다. 진행할까요?\n(이미 입력된 ${plan.dupCount}건은 자동 제외됩니다)`)) return
        setRunning(true); setError('')
        try {
            setResult(await executeSalesImport(plan))
        } catch (err: any) {
            setError(`입력 실패: ${err?.message || err} (ADMIN/OPS/SALES 권한 필요)`)
        } finally {
            setRunning(false)
        }
    }

    const newGroups = plan?.groups.filter(g => g.isNew) || []

    return (
        <div className="settings-page" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ClipboardListIcon size={28} className="text-primary" /> 매출 일괄입력 (출하내역 엑셀)
                </h1>
                <p className="text-muted mt-1">출하내역 엑셀을 올리면 거래처+날짜로 묶어 매출(salesOrders)로 입력합니다. 이미 입력된 건은 자동 제외되고, 같은 파일을 다시 올려도 중복이 생기지 않습니다.</p>
            </div>

            {/* 업로드 */}
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, marginBottom: 20 }}>
                <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    background: '#EEF2FF', color: '#4338CA', border: '1px dashed #A5B4FC',
                    padding: '12px 20px', borderRadius: 12, fontWeight: 700,
                }}>
                    <UploadIcon size={18} /> 엑셀 파일 선택 (.xlsx)
                    <input type="file" accept=".xlsx,.xls" onChange={onFile} style={{ display: 'none' }} />
                </label>
                {fileName && <span style={{ marginLeft: 14, fontSize: 14, color: '#374151' }}>{fileName}</span>}
                {parsing && <span style={{ marginLeft: 14, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6B7280' }}><LoaderIcon className="animate-spin" size={16} /> 분석 중...</span>}
                <p className="help-text" style={{ marginTop: 12 }}>형식: 출고일자·거래처명·제품명·수량·중량·매출단가·매출가 컬럼. 원가는 입력하지 않습니다.</p>
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: 14 }}>
                    <AlertCircleIcon size={16} /> {error}
                </div>
            )}

            {/* 미리보기 */}
            {plan && !result && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                        <Stat label="신규 (입력 대상)" value={`${plan.newCount}건`} sub={`${plan.newLines} 라인`} tone="#047857" />
                        <Stat label="이미 입력됨 (제외)" value={`${plan.dupCount}건`} tone="#6B7280" />
                        <Stat label="신규 매출 합계" value={`₩${won(plan.newAmount)}`} tone="#1D4ED8" />
                        <Stat label="거래처 매칭" value={`${plan.matchedCusts}곳`} sub={`+ 신규 ${plan.syntheticCusts}곳`} tone="#7C3AED" />
                    </div>

                    {plan.syntheticCusts > 0 && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', fontSize: 13 }}>
                            계정이 없는 거래처 {plan.syntheticCusts}곳은 임시 ID(excel:상호명)로 저장됩니다. 나중에 실제 가입 시 연결할 수 있습니다.
                        </div>
                    )}

                    <div className="glass-card" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                        <div style={{ padding: '12px 18px', fontWeight: 700, borderBottom: '1px solid #E5E7EB', fontSize: 14 }}>
                            신규 입력 목록 ({newGroups.length}건)
                        </div>
                        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB' }}>
                                    <tr style={{ textAlign: 'left', color: '#6B7280' }}>
                                        <th style={{ padding: '8px 18px' }}>날짜</th>
                                        <th style={{ padding: '8px' }}>거래처</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>라인</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>중량</th>
                                        <th style={{ padding: '8px 18px', textAlign: 'right' }}>매출가</th>
                                        <th style={{ padding: '8px' }}>매칭</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {newGroups.map(g => (
                                        <tr key={g.key} style={{ borderTop: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '8px 18px', color: '#374151' }}>{g.date}</td>
                                            <td style={{ padding: '8px', fontWeight: 600 }}>{g.custName}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{g.lines.length}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{won(g.totalKg)}kg</td>
                                            <td style={{ padding: '8px 18px', textAlign: 'right', fontWeight: 700 }}>₩{won(g.totalAmount)}</td>
                                            <td style={{ padding: '8px' }}>
                                                {g.matched
                                                    ? <span style={{ fontSize: 11, color: '#047857' }}>✓ 기존</span>
                                                    : <span style={{ fontSize: 11, color: '#B45309' }}>신규</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <button className="btn btn-primary btn-lg" onClick={onExecute} disabled={running || plan.newCount === 0}>
                        {running ? <LoaderIcon className="animate-spin" size={18} /> : <CheckCircleIcon size={18} />}
                        {plan.newCount === 0 ? '입력할 신규 건이 없습니다' : `신규 ${plan.newCount}건 입력 실행`}
                    </button>
                </>
            )}

            {/* 결과 */}
            {result && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderRadius: 14, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 15, fontWeight: 600 }}>
                    <CheckCircleIcon size={20} />
                    입력 완료 — 주문 {result.orders}건, 품목 {result.items}건이 매출에 반영되었습니다. (대시보드·수익성·인사이트에서 확인 가능)
                </div>
            )}
        </div>
    )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
    return (
        <div className="glass-card" style={{ padding: '14px 16px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: tone }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
        </div>
    )
}
