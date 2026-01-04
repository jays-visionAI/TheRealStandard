import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { XIcon } from '../../components/Icons'
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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [revisionComment, setRevisionComment] = useState('')
    const [showRevisionModal, setShowRevisionModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discountAmount, setDiscountAmount] = useState(0)

    // Firebase에서 데이터 로드
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
        } catch (err) {
            console.error('Failed to load order:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [id])

    const totalKg = items.reduce((sum, item) => sum + (item.estimatedKg || 0), 0)
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    const finalTotal = Math.max(0, totalAmount - (discountAmount || 0))

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const formatDateOnly = (date: Date | string | undefined) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('ko-KR')
    }

    const formatDateTime = (date: Date | string | undefined) => {
        if (!date) return '-'
        return new Date(date).toLocaleString('ko-KR')
    }

    const handleConfirm = async () => {
        if (!orderSheet) return
        if (!confirm('주문을 확정하시겠습니까? 확정 후에는 수정이 불가합니다.')) return

        try {
            setIsSubmitting(true)

            await updateOrderSheet(orderSheet.id, {
                status: 'CONFIRMED',
                discountAmount: discountAmount
            })

            // SalesOrder 생성
            await createSalesOrderFromSheet(orderSheet, items)

            alert('주문이 확정되었습니다. 확정주문(SalesOrder)이 생성되었습니다.')
            navigate('/admin/order-sheets')
        } catch (err) {
            console.error('Failed to confirm order:', err)
            alert('주문 확정에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRevisionRequest = async () => {
        if (!orderSheet) return
        if (!revisionComment.trim()) {
            alert('수정 요청 사유를 입력해주세요.')
            return
        }

        try {
            setIsSubmitting(true)

            await updateOrderSheet(orderSheet.id, {
                status: 'REVISION',
            })

            alert('수정 요청이 전송되었습니다.')
            setShowRevisionModal(false)
            navigate('/admin/order-sheets')
        } catch (err) {
            console.error('Failed to request revision:', err)
            alert('수정 요청에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!orderSheet) return
        if (!confirm('정말로 이 발주서를 삭제하시겠습니까? 삭제된 발주서는 복구할 수 없습니다.')) return

        try {
            setIsSubmitting(true)

            await deleteOrderSheet(orderSheet.id)

            alert('발주서가 삭제되었습니다.')
            navigate('/admin/order-sheets')
        } catch (err) {
            console.error('Failed to delete order:', err)
            alert('발주서 삭제에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-white">불러오는 중...</div>
    if (error) return <div className="p-8 text-center text-white">❌ {error}</div>
    if (!orderSheet) return <div className="p-8 text-center text-white">발주서를 찾을 수 없습니다.</div>

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="btn btn-ghost" onClick={() => navigate(-1)}>
                        ← 뒤로
                    </button>
                    <div>
                        <h1>발주서 검토</h1>
                        <p className="text-secondary">{orderSheet.id}</p>
                    </div>
                </div>
                {orderSheet.status === 'SUBMITTED' && <div className="badge badge-warning">고객 컨펌</div>}
                {orderSheet.status === 'CONFIRMED' && <div className="badge badge-success">승인됨</div>}
                {orderSheet.status === 'SENT' && <div className="badge badge-primary">발송됨</div>}
                {orderSheet.status === 'REVISION' && <div className="badge badge-error">수정요청</div>}
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
                <h3 className="mb-4">주문 품목</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>품목명</th>
                                <th className="text-right">중량(kg)</th>
                                <th className="text-right">단가</th>
                                <th className="text-right">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="font-medium">{item.productName}</td>
                                    <td className="text-right">{(item.estimatedKg || 0).toFixed(1)}</td>
                                    <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="text-right font-semibold">{formatCurrency(item.amount || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="summary-row">
                                <td className="font-semibold">소계</td>
                                <td className="text-right font-semibold">{totalKg.toFixed(1)} kg</td>
                                <td></td>
                                <td className="text-right font-semibold">
                                    {formatCurrency(totalAmount)}
                                </td>
                            </tr>
                            <tr className="discount-row">
                                <td className="font-semibold text-warning">할인금액</td>
                                <td></td>
                                <td></td>
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
                                <td colSpan={2} className="font-bold text-lg">최종 결제금액</td>
                                <td></td>
                                <td className="text-right font-bold gradient-text text-xl">
                                    {formatCurrency(finalTotal)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

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
      `}</style>
        </div>
    )
}
