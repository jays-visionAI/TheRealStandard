import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { XIcon } from '../../components/Icons'
import { useOrderStore } from '../../stores/orderStore'
import { OrderSheet, OrderSheetItem } from '../../types'

export default function OrderReview() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getOrderSheetById, getOrderItems, updateOrderSheet, deleteOrderSheet } = useOrderStore()

    const [orderSheet, setOrderSheet] = useState<OrderSheet | null>(null)
    const [items, setItems] = useState<OrderSheetItem[]>([])
    const [loading, setLoading] = useState(true)
    const [revisionComment, setRevisionComment] = useState('')
    const [showRevisionModal, setShowRevisionModal] = useState(false)

    useEffect(() => {
        if (id) {
            const order = getOrderSheetById(id)
            if (order) {
                setOrderSheet(order)
                setItems(getOrderItems(order.id))
            }
            setLoading(false)
        }
    }, [id, getOrderSheetById, getOrderItems])

    const totalKg = items.reduce((sum, item) => sum + (item.estimatedKg || 0), 0)
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const formatDateOnly = (date: Date | string) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('ko-KR')
    }

    const formatDateTime = (date: Date | string) => {
        if (!date) return '-'
        return new Date(date).toLocaleString('ko-KR')
    }

    const handleConfirm = () => {
        if (!orderSheet) return
        if (confirm('주문을 확정하시겠습니까? 확정 후에는 수정이 불가합니다.')) {
            updateOrderSheet(orderSheet.id, {
                status: 'CONFIRMED',
                updatedAt: new Date()
            })
            alert('주문이 확정되었습니다. SalesOrder가 생성됩니다.')
            navigate('/admin/order-sheets')
        }
    }

    const handleRevisionRequest = () => {
        if (!orderSheet) return
        if (!revisionComment.trim()) {
            alert('수정 요청 사유를 입력해주세요.')
            return
        }
        updateOrderSheet(orderSheet.id, {
            status: 'REVISION',
            revisionComment: revisionComment,
            updatedAt: new Date()
        })
        alert('수정 요청이 전송되었습니다.')
        setShowRevisionModal(false)
        navigate('/admin/order-sheets')
    }

    const handleDelete = () => {
        if (!orderSheet) return
        if (confirm('정말로 이 주문장을 삭제하시겠습니까? 삭제된 주문장은 복구할 수 없습니다.')) {
            deleteOrderSheet(orderSheet.id)
            alert('주문장이 삭제되었습니다.')
            navigate('/admin/order-sheets')
        }
    }

    if (loading) return <div className="p-8 text-center text-white">불러오는 중...</div>
    if (!orderSheet) return <div className="p-8 text-center text-white">주문을 찾을 수 없습니다.</div>

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="btn btn-ghost" onClick={() => navigate(-1)}>
                        ← 뒤로
                    </button>
                    <div>
                        <h1>주문 검토</h1>
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
                        <span className="info-value">{formatDateTime(orderSheet.lastSubmittedAt || '')}</span>
                    </div>
                    <div className="info-item full-width">
                        <span className="info-label">배송지</span>
                        <span className="info-value">{orderSheet.shipTo}</span>
                    </div>
                </div>
            </div>

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
                                    <td className="text-right">{item.estimatedKg.toFixed(1)}</td>
                                    <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="text-right font-semibold">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="summary-row">
                                <td className="font-semibold">합계</td>
                                <td className="text-right font-semibold">{totalKg.toFixed(1)} kg</td>
                                <td></td>
                                <td className="text-right font-bold gradient-text text-lg">
                                    {formatCurrency(totalAmount)}
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
                    >
                        삭제하기
                    </button>
                    <button
                        className="btn btn-secondary btn-lg"
                        onClick={() => setShowRevisionModal(true)}
                    >
                        <XIcon size={18} /> 수정 요청
                    </button>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleConfirm}
                    >
                        ✓ 확정하기
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
      `}</style>
        </div>
    )
}
