import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getAllOrderTemplates, createOrderTemplate, updateOrderTemplate, deleteOrderTemplate,
    generateOrderSheetFromTemplate, computeNextGenerateDate,
    type OrderTemplate, type OrderTemplateItem, type Cadence,
} from '../../lib/orderTemplateService'
import { getAllCustomerUsers } from '../../lib/userService'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { ClipboardListIcon, TrashIcon, RefreshCwIcon } from '../../components/Icons'

const CADENCE_LABEL: Record<Cadence, string> = { WEEKLY: '주간', BIWEEKLY: '격주', MONTHLY: '월간' }
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface CustomerOpt { id: string; name: string }

function tsDate(ts: any): string {
    try {
        const d = ts?.toDate ? ts.toDate() : null
        return d ? d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : '-'
    } catch { return '-' }
}

const inputStyle: React.CSSProperties = { padding: '8px 10px', fontSize: '13px', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#fff', color: '#1F2937' }

export default function OrderTemplates() {
    const navigate = useNavigate()
    const [templates, setTemplates] = useState<OrderTemplate[]>([])
    const [customers, setCustomers] = useState<CustomerOpt[]>([])
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState<string | null>(null)

    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<OrderTemplate | null>(null)
    const [form, setForm] = useState<{ customerOrgId: string; cadence: Cadence; weekday: number; autoGenerate: boolean; items: OrderTemplateItem[] }>(
        { customerOrgId: '', cadence: 'WEEKLY', weekday: 1, autoGenerate: false, items: [] }
    )

    const load = async () => {
        setLoading(true)
        try {
            const [tpls, custs, prods] = await Promise.all([getAllOrderTemplates(), getAllCustomerUsers(), getAllProducts()])
            setTemplates(tpls)
            setCustomers(custs.map(c => ({ id: c.id, name: c.business?.companyName || c.name || '(이름없음)' })))
            setProducts(prods)
        } catch (err) {
            console.error('Failed to load order templates:', err)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => { load() }, [])

    const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products])

    const openCreate = () => {
        setEditing(null)
        setForm({ customerOrgId: customers[0]?.id || '', cadence: 'WEEKLY', weekday: 1, autoGenerate: false, items: [] })
        setModalOpen(true)
    }
    const openEdit = (t: OrderTemplate) => {
        setEditing(t)
        setForm({ customerOrgId: t.customerOrgId, cadence: t.cadence, weekday: t.weekday ?? 1, autoGenerate: t.autoGenerate, items: t.items || [] })
        setModalOpen(true)
    }

    const addItem = () => {
        const p = products[0]
        if (!p) return
        setForm(f => ({ ...f, items: [...f.items, { productId: p.id, productName: p.name, qty: 1, unit: p.unit }] }))
    }
    const updateItem = (idx: number, patch: Partial<OrderTemplateItem>) => {
        setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }))
    }
    const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

    const handleSave = async () => {
        const cust = customers.find(c => c.id === form.customerOrgId)
        if (!cust) { alert('거래처를 선택하세요.'); return }
        if (form.items.length === 0) { alert('품목을 1개 이상 추가하세요.'); return }
        const payload = {
            customerOrgId: cust.id,
            customerName: cust.name,
            cadence: form.cadence,
            weekday: form.cadence === 'WEEKLY' ? form.weekday : undefined,
            items: form.items,
            autoGenerate: form.autoGenerate,
            detectionConfidence: 1,
            nextGenerateAt: undefined as any,
        }
        try {
            if (editing) {
                await updateOrderTemplate(editing.id, payload)
            } else {
                const { Timestamp } = await import('firebase/firestore')
                await createOrderTemplate({ ...payload, nextGenerateAt: Timestamp.fromDate(computeNextGenerateDate(form.cadence, form.weekday)) })
            }
            setModalOpen(false)
            await load()
        } catch (err) {
            console.error('Failed to save template:', err)
            alert('저장에 실패했습니다.')
        }
    }

    const handleDelete = async (t: OrderTemplate) => {
        if (!confirm(`'${t.customerName}' 정기발주 템플릿을 삭제할까요?`)) return
        await deleteOrderTemplate(t.id)
        await load()
    }

    const handleGenerate = async (t: OrderTemplate) => {
        setBusyId(t.id)
        try {
            const sheetId = await generateOrderSheetFromTemplate(t)
            alert('정기 발주서(DRAFT)가 생성되었습니다. 검토 화면으로 이동합니다.')
            navigate(`/admin/order-sheets/${sheetId}/review`)
        } catch (err) {
            console.error('Failed to generate order sheet:', err)
            alert('발주서 생성에 실패했습니다.')
            setBusyId(null)
        }
    }

    const th: React.CSSProperties = { textAlign: 'left', padding: '11px 12px', fontSize: '12px', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }
    const td: React.CSSProperties = { padding: '11px 12px', fontSize: '13px', color: '#1F2937', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' }

    return (
        <div style={{ padding: '24px', maxWidth: '1100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: 800, color: '#1F2937', margin: 0 }}>
                    <ClipboardListIcon size={22} /> 자동발주 템플릿
                </h1>
                <button className="btn btn-primary" onClick={openCreate}>+ 템플릿 추가</button>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: 0, marginBottom: '20px' }}>
                단골 거래처의 정기 발주를 템플릿으로 저장하고 "발주서 생성" 한 번으로 DRAFT 주문장을 만듭니다.
                (주간 자동 생성 배치는 Cloud Functions 도입 후 활성화됩니다.)
            </p>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>불러오는 중...</div>
            ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗓️</div>
                    <p style={{ margin: 0 }}>등록된 정기발주 템플릿이 없습니다.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                        <thead>
                            <tr>
                                <th style={th}>거래처</th>
                                <th style={th}>주기</th>
                                <th style={th}>품목</th>
                                <th style={th}>자동</th>
                                <th style={th}>최근 생성</th>
                                <th style={th}>다음 예정</th>
                                <th style={{ ...th, textAlign: 'right' }}>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map(t => (
                                <tr key={t.id}>
                                    <td style={{ ...td, fontWeight: 700 }}>{t.customerName}</td>
                                    <td style={td}>{CADENCE_LABEL[t.cadence]}{t.cadence === 'WEEKLY' && t.weekday != null ? ` · ${WEEKDAYS[t.weekday]}요일` : ''}</td>
                                    <td style={td}>{t.items?.length || 0}개 ({(t.items || []).slice(0, 2).map(i => i.productName).join(', ')}{(t.items?.length || 0) > 2 ? ' 외' : ''})</td>
                                    <td style={td}>
                                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: t.autoGenerate ? '#D1FAE5' : '#F3F4F6', color: t.autoGenerate ? '#047857' : '#6B7280' }}>
                                            {t.autoGenerate ? 'ON' : 'OFF'}
                                        </span>
                                    </td>
                                    <td style={{ ...td, color: '#6B7280' }}>{tsDate(t.lastGeneratedAt)}</td>
                                    <td style={{ ...td, color: '#6B7280' }}>{tsDate(t.nextGenerateAt)}</td>
                                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px' }} disabled={busyId === t.id} onClick={() => handleGenerate(t)}>
                                            <RefreshCwIcon size={13} /> {busyId === t.id ? '생성 중...' : '발주서 생성'}
                                        </button>
                                        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px', marginLeft: '6px' }} onClick={() => openEdit(t)}>수정</button>
                                        <button className="btn btn-ghost" style={{ padding: '6px 8px', fontSize: '12px', color: '#DC2626' }} onClick={() => handleDelete(t)}><TrashIcon size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 생성/수정 모달 */}
            {modalOpen && (
                <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(31,41,55,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1F2937' }}>{editing ? '템플릿 수정' : '정기발주 템플릿 추가'}</h2>
                        </div>
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>거래처</label>
                                    <select style={{ ...inputStyle, width: '100%' }} value={form.customerOrgId} onChange={e => setForm(f => ({ ...f, customerOrgId: e.target.value }))}>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>발주 주기</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select style={{ ...inputStyle, flex: 1 }} value={form.cadence} onChange={e => setForm(f => ({ ...f, cadence: e.target.value as Cadence }))}>
                                            {(Object.keys(CADENCE_LABEL) as Cadence[]).map(c => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}
                                        </select>
                                        {form.cadence === 'WEEKLY' && (
                                            <select style={{ ...inputStyle, width: '80px' }} value={form.weekday} onChange={e => setForm(f => ({ ...f, weekday: Number(e.target.value) }))}>
                                                {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}요일</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600 }}>품목</label>
                                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={addItem}>+ 품목 추가</button>
                                </div>
                                {form.items.length === 0 ? (
                                    <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '12px', textAlign: 'center', background: '#F9FAFB', borderRadius: '8px' }}>품목을 추가하세요.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {form.items.map((it, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <select style={{ ...inputStyle, flex: 1 }} value={it.productId} onChange={e => {
                                                    const p = productById.get(e.target.value)
                                                    updateItem(idx, { productId: e.target.value, productName: p?.name || '', unit: p?.unit || it.unit })
                                                }}>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <input type="number" min="0" style={{ ...inputStyle, width: '80px' }} value={it.qty} onChange={e => updateItem(idx, { qty: Number(e.target.value) || 0 })} />
                                                <select style={{ ...inputStyle, width: '72px' }} value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })}>
                                                    <option value="kg">kg</option>
                                                    <option value="box">box</option>
                                                </select>
                                                <button className="btn btn-ghost" style={{ padding: '6px', color: '#DC2626' }} onClick={() => removeItem(idx)}><TrashIcon size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                <input type="checkbox" checked={form.autoGenerate} onChange={e => setForm(f => ({ ...f, autoGenerate: e.target.checked }))} />
                                자동 생성 활성화 (Cloud Functions 도입 후 주기마다 자동 발주서 생성)
                            </label>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>취소</button>
                            <button className="btn btn-primary" onClick={handleSave}>{editing ? '수정 저장' : '추가'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
