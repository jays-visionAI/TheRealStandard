import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface OrderItem {
    productName: string
    qtyKg: number
    unitPrice: number
    amount: number
}

export default function OrderReview() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [revisionComment, setRevisionComment] = useState('')
    const [showRevisionModal, setShowRevisionModal] = useState(false)

    // Mock data
    const orderSheet = {
        id: id || 'OS-2024-001',
        customerName: '한우명가',
        shipDate: '2024-01-16',
        shipTo: '서울시 강남구 역삼동 123-45',
        submittedAt: '2024-01-15 14:30',
        items: [
            { productName: '한우 등심 1++', qtyKg: 50, unitPrice: 85000, amount: 4250000 },
            { productName: '한우 안심 1++', qtyKg: 30, unitPrice: 95000, amount: 2850000 },
            { productName: '한우 채끝 1+', qtyKg: 25, unitPrice: 72000, amount: 1800000 },
            { productName: '수입 부채살', qtyKg: 100, unitPrice: 35000, amount: 3500000 },
        ] as OrderItem[],
    }

    const totalKg = orderSheet.items.reduce((sum, item) => sum + item.qtyKg, 0)
    const totalAmount = orderSheet.items.reduce((sum, item) => sum + item.amount, 0)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const handleConfirm = () => {
        if (confirm('주문을 확정하시겠습니까? 확정 후에는 수정이 불가합니다.')) {
            alert('주문이 확정되었습니다. SalesOrder가 생성됩니다.')
            navigate('/admin/sales-orders')
        }
    }

    const handleRevisionRequest = () => {
        if (!revisionComment.trim()) {
            alert('수정 요청 사유를 입력해주세요.')
            return
        }
        alert('수정 요청이 전송되었습니다.')
        setShowRevisionModal(false)
        navigate('/admin/order-sheets')
    }

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
                <div className="badge badge-warning">제출됨</div>
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
                        <span className="info-value">{orderSheet.shipDate}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">제출시간</span>
                        <span className="info-value">{orderSheet.submittedAt}</span>
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
                            {orderSheet.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="font-medium">{item.productName}</td>
                                    <td className="text-right">{item.qtyKg.toFixed(1)}</td>
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
                        className="btn btn-secondary btn-lg"
                        onClick={() => setShowRevisionModal(true)}
                    >
                        ❌ 수정 요청
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
