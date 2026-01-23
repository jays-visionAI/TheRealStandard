import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { XIcon, AlertTriangleIcon, ClockIcon, ClipboardListIcon } from '../../components/Icons'
import {
    getOrderSheetById,
    getOrderSheetItems,
    updateOrderSheet,
    deleteOrderSheet,
    createSalesOrderFromSheet,
    type FirestoreOrderSheet,
    type FirestoreOrderSheetItem
} from '../../lib/orderService'

// 로컬 타입
type LocalOrderSheet = Omit<FirestoreOrderSheet, 'createdAt' | 'updatedAt' | 'shipDate' | 'cutOffAt'> & {
    createdAt?: Date
    updatedAt?: Date
    shipDate?: Date
    cutOffAt?: Date
    lastSubmittedAt?: Date
    shipTo?: string
    adminComment?: string
    customerComment?: string
    revisionComment?: string
    discountAmount?: number
}

export default function OrderReview() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [orderSheet, setOrderSheet] = useState<LocalOrderSheet | null>(null)
    const [items, setItems] = useState<FirestoreOrderSheetItem[]>([])
    const [originalItems, setOriginalItems] = useState<FirestoreOrderSheetItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [revisionComment, setRevisionComment] = useState('')
    const [changeReason, setChangeReason] = useState('')
    const [showRevisionModal, setShowRevisionModal] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discountAmount, setDiscountAmount] = useState(0)
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

    const loadData = async () => {
        if (!id) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const [osData, itemsData] = await Promise.all([
                getOrderSheetById(id),
                getOrderSheetItems(id)
            ])
            if (osData) {
                setOrderSheet({
                    ...osData,
                    createdAt: osData.createdAt?.toDate?.() || new Date(),
                    updatedAt: osData.updatedAt?.toDate?.() || new Date(),
                    shipDate: osData.shipDate?.toDate?.() || undefined,
                    cutOffAt: osData.cutOffAt?.toDate?.() || undefined,
                    adminComment: osData.adminComment,
                    customerComment: osData.customerComment,
                    discountAmount: osData.discountAmount || 0,
                })
                setDiscountAmount(osData.discountAmount || 0)
            }
            setItems(itemsData)
            setOriginalItems(JSON.parse(JSON.stringify(itemsData)))
        } catch (err) {
            console.error('Failed to load order:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [id])

    useEffect(() => {
        if (!orderSheet?.cutOffAt) return
        const updateTimer = () => {
            const now = new Date().getTime()
            const cutOff = new Date(orderSheet.cutOffAt!).getTime()
            const distance = cutOff - now
            if (distance < 0) { setTimeLeft('마감됨'); return }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24))
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((distance % (1000 * 60)) / 1000)
            let str = ''
            if (days > 0) str += `${days}일 `
            str += `${hours}시간 ${minutes}분 ${seconds}초`
            setTimeLeft(str)
        }
        updateTimer(); const timer = setInterval(updateTimer, 1000); return () => clearInterval(timer)
    }, [orderSheet?.cutOffAt])

    const totalKg = items.reduce((sum, item) => sum + (item.estimatedKg || 0), 0)
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    const finalTotal = Math.max(0, totalAmount - (discountAmount || 0))

    const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    const formatDateOnly = (date: Date | string | undefined) => date ? new Date(date).toLocaleDateString('ko-KR') : '-'
    const formatDateTime = (date: Date | string | undefined) => date ? new Date(date).toLocaleString('ko-KR') : '-'

    const updateItem = (index: number, field: keyof FirestoreOrderSheetItem, value: any) => {
        const newItems = [...items]
        const item = { ...newItems[index], [field]: value }
        if (field === 'qtyRequested' || field === 'unitPrice') {
            const qty = field === 'qtyRequested' ? value : item.qtyRequested || 0
            const price = field === 'unitPrice' ? value : item.unitPrice || 0
            const weightMultiplier = item.unit === 'box' ? 20 : 1
            item.estimatedKg = qty * weightMultiplier
            item.amount = item.estimatedKg * price
        }
        newItems[index] = item
        setItems(newItems)
    }
    // Enhanced Change Detection & AI Narrative Generation
    const getAISummary = () => {
        const added = items.filter(i => !originalItems.find(oi => oi.productId === i.productId))
        const removed = originalItems.filter(oi => !items.find(i => i.productId === oi.productId))
        const modified = items.filter(i => {
            const oi = originalItems.find(orig => orig.productId === i.productId)
            return oi && (oi.qtyRequested !== i.qtyRequested || oi.unitPrice !== i.unitPrice || oi.estimatedKg !== i.estimatedKg)
        })

        if (added.length === 0 && removed.length === 0 && modified.length === 0) return null

        let summaryRows: string[] = []

        // Narrative construction
        if (added.length > 0) summaryRows.push(`신규 품목 ${added.length}건(${added.map(a => a.productName).join(', ')})이 추가되었습니다.`)
        if (removed.length > 0) summaryRows.push(`기존 품목 ${removed.length}건(${removed.map(r => r.productName).join(', ')})이 삭제되었습니다.`)

        modified.forEach(item => {
            const oi = originalItems.find(orig => orig.productId === item.productId)!
            let detail = `${item.productName}: `
            const changes = []
            if (oi.qtyRequested !== item.qtyRequested) changes.push(`주문수량(${oi.qtyRequested}${oi.unit.toUpperCase()} → ${item.qtyRequested}${item.unit.toUpperCase()})`)
            if (oi.estimatedKg !== item.estimatedKg) changes.push(`중량(${oi.estimatedKg}kg → ${item.estimatedKg}kg)`)
            if (oi.unitPrice !== item.unitPrice) changes.push(`단가(${formatCurrency(oi.unitPrice)} → ${formatCurrency(item.unitPrice)})`)
            summaryRows.push(detail + changes.join(', ') + "로 변경되었습니다.")
        })

        return {
            title: "발주서 변경 내역 AI 분석 결과",
            paragraphs: summaryRows,
            sentence: `총 ${added.length + modified.length}건의 품목이 조정되었으며, ${removed.length}건이 제외되었습니다. 전체 금액은 기존 ${formatCurrency(originalItems.reduce((s, i) => s + (i.amount || 0), 0))}에서 ${formatCurrency(totalAmount)}로 조정되었습니다.`
        }
    }

    const aiSummary = getAISummary()
    const hasChanges = !!aiSummary

    const handleConfirm = async () => {
        if (!orderSheet) return
        if (hasChanges && !changeReason.trim()) { alert('품목 변경 내역이 있습니다. 변경 사유를 입력해주세요.'); return }
        setShowConfirmModal(true)
    }

    const executeConfirm = async () => {
        if (!orderSheet) return
        try {
            setIsSubmitting(true)
            await updateOrderSheet(orderSheet.id, {
                status: 'CONFIRMED',
                discountAmount,
                adminComment: changeReason ? `[품목변경 사유] ${changeReason}\n${orderSheet.adminComment || ''}` : orderSheet.adminComment
            })
            await createSalesOrderFromSheet(orderSheet, items)
            setShowConfirmModal(false)
            alert('주문이 확정되었습니다. 확정주문(SalesOrder)이 생성되었습니다.')
            navigate('/admin/order-sheets')
        } catch (err) { console.error(err); alert('주문 확정에 실패했습니다.') } finally { setIsSubmitting(false) }
    }

    const handleRevisionRequest = async () => {
        if (!orderSheet || !revisionComment.trim()) { alert('수정 요청 사유를 입력해주세요.'); return }
        try {
            setIsSubmitting(true)
            await updateOrderSheet(orderSheet.id, { status: 'REVISION' })
            alert('수정 요청이 전송되었습니다.')
            setShowRevisionModal(false)
            navigate('/admin/order-sheets')
        } catch (err) { console.error(err); alert('수정 요청에 실패했습니다.') } finally { setIsSubmitting(false) }
    }

    const handleDelete = async () => {
        if (!orderSheet || !confirm('정말로 이 발주서를 삭제하시겠습니까?')) return
        try {
            setIsSubmitting(true)
            await deleteOrderSheet(orderSheet.id)
            alert('발주서가 삭제되었습니다.')
            navigate('/admin/order-sheets')
        } catch (err) { console.error(err); alert('발주서 삭제에 실패했습니다.') } finally { setIsSubmitting(false) }
    }

    if (loading) return <div className="p-8 text-center text-white">불러오는 중...</div>
    if (error) return <div className="p-8 text-center text-white"><AlertTriangleIcon size={24} color="#ef4444" /> {error}</div>
    if (!orderSheet) return <div className="p-8 text-center text-white">발주서를 찾을 수 없습니다.</div>

    return (
        <div className="page-container">
            {/* Header */}
            <div className="mb-6">
                <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>
                    ← 뒤로
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">발주서 검토</h1>
                        <p className="text-secondary font-mono">{orderSheet.id}</p>
                    </div>
                    <div className="flex gap-2">
                        {orderSheet.status === 'SUBMITTED' && <div className="badge badge-warning">고객 컨펌</div>}
                        {orderSheet.status === 'CONFIRMED' && <div className="badge badge-success">승인됨</div>}
                        {orderSheet.status === 'SENT' && <div className="badge badge-primary">발송됨</div>}
                        {orderSheet.status === 'REVISION' && <div className="badge badge-error">수정요청</div>}
                    </div>
                </div>
            </div>

            {/* Order Info */}
            <div className="glass-card mb-4">
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">고객사</span>
                        <span className="info-value">{orderSheet.customerName}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">배송일</span>
                        <span className="info-value">{formatDateOnly(orderSheet.shipDate)}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">제출시간</span>
                        <span className="info-value">{formatDateTime(orderSheet.lastSubmittedAt)}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">주문마감시간</span>
                        <span className="info-value">{formatDateTime(orderSheet.cutOffAt)}</span>
                        {timeLeft && (
                            <div className="flex items-center gap-1 mt-1" style={{ color: timeLeft === '마감됨' ? '#ef4444' : '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
                                <ClockIcon size={14} />
                                <span>{timeLeft} {timeLeft !== '마감됨' && '남음'}</span>
                            </div>
                        )}
                    </div>
                    <div className="info-item full-width">
                        <span className="info-label">배송지</span>
                        <span className="info-value">{orderSheet.shipTo || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Comments Display */}
            {(orderSheet.adminComment || orderSheet.customerComment) && (
                <div className="glass-card mb-4 comments-section">
                    <div className="comments-grid">
                        {orderSheet.adminComment && (
                            <div className="comment-block admin">
                                <div className="comment-header">관리자 메모</div>
                                <div className="comment-body">{orderSheet.adminComment}</div>
                            </div>
                        )}
                        {orderSheet.customerComment && (
                            <div className="comment-block customer">
                                <div className="comment-header">고객 요청사항</div>
                                <div className="comment-body">{orderSheet.customerComment}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Items Table */}
            <div className="glass-card mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h3>주문 품목</h3>
                    {checkedItems.size > 0 && (
                        <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                                const newItems = items.filter((_, idx) => !checkedItems.has(idx))
                                setItems(newItems)
                                setCheckedItems(new Set())
                            }}
                        >
                            선택 삭제 ({checkedItems.size})
                        </button>
                    )}
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={items.length > 0 && checkedItems.size === items.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setCheckedItems(new Set(items.map((_, idx) => idx)))
                                            } else {
                                                setCheckedItems(new Set())
                                            }
                                        }}
                                    />
                                </th>
                                <th>품목명</th>
                                <th className="text-right">주문수량</th>
                                <th className="text-right">중량(kg)</th>
                                <th className="text-right">단가</th>
                                <th className="text-right">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index} className={checkedItems.has(index) ? 'bg-blue-50' : ''}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={checkedItems.has(index)}
                                            onChange={(e) => {
                                                const newSet = new Set(checkedItems)
                                                if (e.target.checked) {
                                                    newSet.add(index)
                                                } else {
                                                    newSet.delete(index)
                                                }
                                                setCheckedItems(newSet)
                                            }}
                                        />
                                    </td>
                                    <td className="font-medium">{item.productName}</td>
                                    <td className="text-right" style={{ width: '120px' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <input
                                                type="number"
                                                className="table-input"
                                                value={item.qtyRequested || 0}
                                                onChange={(e) => updateItem(index, 'qtyRequested', parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-muted font-bold ml-1">{item.unit.toUpperCase()}</span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <input
                                            type="number"
                                            className="table-input"
                                            value={item.estimatedKg || 0}
                                            onChange={(e) => updateItem(index, 'estimatedKg', parseFloat(e.target.value) || 0)}
                                            style={{ width: '60px' }}
                                        />
                                    </td>
                                    <td className="text-right" style={{ width: '140px' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-muted">₩</span>
                                            <input
                                                type="number"
                                                className="table-input"
                                                value={item.unitPrice || 0}
                                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                style={{ width: '90px' }}
                                            />
                                        </div>
                                    </td>
                                    <td className="text-right font-semibold">{formatCurrency(item.amount || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="summary-row">
                                <td></td>
                                <td className="font-semibold">소계</td>
                                <td className="text-right font-semibold">{totalKg.toFixed(1)} kg</td>
                                <td></td>
                                <td className="text-right"></td>
                                <td className="text-right font-semibold">
                                    {formatCurrency(totalAmount)}
                                </td>
                            </tr>
                            <tr className="discount-row">
                                <td></td>
                                <td className="font-semibold text-warning">할인금액</td>
                                <td></td>
                                <td></td>
                                <td className="text-right"></td>
                                <td className="text-right">
                                    <div className="discount-input-wrapper">
                                        <span className="minus-sign">-</span>
                                        <input
                                            type="number"
                                            className="discount-input"
                                            value={discountAmount || ''}
                                            onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                            placeholder="0"
                                        />
                                        <span className="unit">원</span>
                                    </div>
                                </td>
                            </tr>
                            <tr className="final-total-row">
                                <td></td>
                                <td colSpan={2} className="font-bold text-lg">최종 결제금액</td>
                                <td></td>
                                <td className="text-right"></td>
                                <td className="text-right font-bold gradient-text text-xl">
                                    {formatCurrency(finalTotal)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* AI Change Tracking & Reason Section */}
            {hasChanges && (
                <div className="glass-card mb-4 overflow-hidden border-blue-200/50 bg-blue-50/10">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-8 border-r border-slate-100">
                            <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">✨</span>
                                {aiSummary.title}
                            </h4>
                            <div className="space-y-4">
                                {aiSummary.paragraphs.map((line, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed font-bold">
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 shrink-0"></span>
                                        {line}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-6 border-t border-blue-100/50 text-sm italic text-blue-500 font-medium">
                                💡 {aiSummary.sentence}
                            </div>
                        </div>
                        <div className="p-8 bg-white/40">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">변경 사유 (필수 기입)</h4>
                            </div>
                            <textarea
                                className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 rounded-[1.5rem] p-6 text-[15px] font-bold outline-none transition-all placeholder:text-slate-300 resize-none"
                                placeholder="고객에게 안내할 품목 변경 또는 단가 조정 사유를 명확히 기입해주세요."
                                rows={6}
                                value={changeReason}
                                onChange={e => setChangeReason(e.target.value)}
                            />
                            <p className="mt-4 text-xs text-slate-400 font-medium ml-2">※ 입력하신 사유는 고객의 발주서 상단 알림에 자동으로 표시됩니다.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="glass-card">
                <div className="action-panel">
                    <button
                        className="btn btn-ghost danger"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                    >
                        삭제하기
                    </button>
                    <button
                        className="btn btn-secondary btn-lg"
                        onClick={() => setShowRevisionModal(true)}
                        disabled={isSubmitting}
                    >
                        <XIcon size={18} /> 수정 요청
                    </button>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleConfirm}
                        disabled={isSubmitting || orderSheet.status !== 'SUBMITTED'}
                        title={orderSheet.status !== 'SUBMITTED' ? '고객이 컨펌한 후에만 확정 가능합니다.' : ''}
                    >
                        {isSubmitting ? '처리 중...' : '✓ 확정하기'}
                    </button>
                </div>
            </div>

            {/* Revision Modal */}
            {showRevisionModal && (
                <div className="modal-backdrop" onClick={() => setShowRevisionModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>수정 요청</h3>
                        </div>
                        <div className="modal-body">
                            <label className="label">수정 요청 사유</label>
                            <textarea
                                className="input textarea"
                                value={revisionComment}
                                onChange={(e) => setRevisionComment(e.target.value)}
                                placeholder="고객에게 전달할 수정 요청 사유를 입력하세요..."
                                rows={4}
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowRevisionModal(false)}
                            >
                                취소
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRevisionRequest}
                                disabled={isSubmitting}
                            >
                                요청 전송
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {showConfirmModal && (
                <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
                    <div className="modal max-w-sm rounded-[2rem] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                                <ClipboardListIcon size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">주문을 확정하시겠습니까?</h3>
                            <p className="text-slate-400 text-sm font-bold leading-relaxed mb-10">
                                확정 후에는 매출전표가 생성되며 품목 수정이 불가합니다. <br />정말 진행하시겠습니까?
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                                    onClick={executeConfirm}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '확정 처리 중...' : '네, 확정하겠습니다'}
                                </button>
                                <button
                                    className="w-full text-slate-400 hover:text-slate-600 py-3 font-bold transition-all"
                                    onClick={() => setShowConfirmModal(false)}
                                >
                                    잠시 더 검토할게요
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          padding: var(--space-4);
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        
        .info-item.full-width {
          grid-column: span 3;
        }
        
        .info-label {
          font-size: var(--text-sm);
          color: var(--text-muted);
        }
        
        .info-value {
          font-size: var(--text-base);
          font-weight: var(--font-medium);
          color: var(--text-primary);
        }
        
        .summary-row td {
          padding-top: var(--space-4);
          border-top: 2px solid var(--border-primary);
        }
        
        .action-panel {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-4);
          padding: var(--space-4);
        }
        
        .text-right {
          text-align: right;
        }
        
        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .info-item.full-width {
            grid-column: span 1;
          }
          
          .action-panel {
            flex-direction: column;
          }
        }

        /* Comments Styling */
        .comments-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .comment-block {
          padding: var(--space-4);
          border-radius: var(--radius-md);
        }

        .comment-block.admin {
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .comment-block.customer {
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .comment-header {
          font-size: var(--text-xs);
          font-weight: var(--font-bold);
          text-transform: uppercase;
          margin-bottom: var(--space-2);
          letter-spacing: 0.05em;
        }

        .comment-block.admin .comment-header { color: var(--color-primary); }
        .comment-block.customer .comment-header { color: var(--color-warning); }

        .comment-body {
          font-size: var(--text-sm);
          line-height: 1.5;
          color: var(--text-primary);
          white-space: pre-wrap;
        }

        /* Discount Input Styling */
        .discount-row td {
          padding: var(--space-2) var(--space-4);
          border-top: 1px dashed var(--border-primary);
        }

        .discount-input-wrapper {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: rgba(245, 158, 11, 0.1);
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .minus-sign {
          color: var(--color-warning);
          font-weight: var(--font-bold);
        }

        .discount-input {
          background: transparent;
          border: none;
          color: var(--color-warning);
          font-weight: var(--font-bold);
          text-align: right;
          width: 80px;
          padding: 0;
          outline: none;
          -moz-appearance: textfield;
        }

        .discount-input::-webkit-outer-spin-button,
        .discount-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .unit {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }

        .final-total-row td {
          padding: var(--space-4);
          border-top: 2px solid var(--border-primary);
        }

        .text-warning {
          color: var(--color-warning);
        }

        @media (max-width: 640px) {
          .comments-grid {
            grid-template-columns: 1fr;
          }
        }

        .table-input {
          background: #f8f9fc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          width: 80px;
          text-align: right;
          outline: none;
          transition: all 0.2s;
        }

        .table-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.05);
          background: white;
        }

        .table-input::-webkit-outer-spin-button,
        .table-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
        </div>
    )
}
