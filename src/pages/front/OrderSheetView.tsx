import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircleIcon } from '../../components/Icons'

interface OrderItem {
  id: string
  productName: string
  unitPrice: number
  qtyKg: number
  qtyBox: number
  estimatedKg: number
  amount: number
  boxToKg?: number
}

export default function OrderSheetView() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'SENT' | 'REVISION' | 'SUBMITTED' | 'CONFIRMED'>('SENT')
  const [revisionComment, setRevisionComment] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    // Load order data
    setItems([
      { id: '1', productName: '한우 등심 1++', unitPrice: 85000, qtyKg: 0, qtyBox: 0, estimatedKg: 0, amount: 0 },
      { id: '2', productName: '한우 안심 1++', unitPrice: 95000, qtyKg: 0, qtyBox: 0, estimatedKg: 0, amount: 0 },
      { id: '3', productName: '한우 채끝 1+', unitPrice: 72000, qtyKg: 0, qtyBox: 0, estimatedKg: 0, amount: 0 },
      { id: '4', productName: '한우 갈비 1+', unitPrice: 68000, qtyKg: 0, qtyBox: 0, estimatedKg: 0, amount: 0 },
      { id: '5', productName: '수입 부채살', unitPrice: 35000, qtyKg: 0, qtyBox: 0, estimatedKg: 0, amount: 0, boxToKg: 20 },
    ])

    // Demo: Show revision state
    if (token?.includes('revision')) {
      setStatus('REVISION')
      setRevisionComment('안심 수량이 너무 많습니다. 재고 확인 후 조정 부탁드립니다.')
    }
  }, [token])

  const updateItem = (id: string, field: 'qtyKg' | 'qtyBox', rawValue: number) => {
    const value = Math.max(0, rawValue)
    setItems(items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value }

        if (field === 'qtyKg' && value > 0) {
          newItem.estimatedKg = value
        } else if (field === 'qtyBox' && value > 0 && item.boxToKg) {
          newItem.estimatedKg = value * item.boxToKg
        } else if (field === 'qtyKg') {
          newItem.estimatedKg = newItem.qtyBox * (item.boxToKg || 0)
        }

        newItem.amount = newItem.estimatedKg * item.unitPrice
        return newItem
      }
      return item
    }))
  }

  const totalKg = items.reduce((sum, item) => sum + item.estimatedKg, 0)
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
  }

  const handleSubmit = () => {
    if (totalKg === 0) {
      alert('최소 1개 이상의 품목을 주문해주세요.')
      return
    }

    setStatus('SUBMITTED')
    alert('주문이 제출되었습니다. 운영자 검토 후 확정됩니다.')
  }

  const handleConfirm = () => {
    setShowConfirmModal(true)
  }

  const confirmOrder = () => {
    setStatus('CONFIRMED')
    setShowConfirmModal(false)
    alert('주문이 최종 확정되었습니다!')
    navigate(`/order/${token}/tracking`)
  }

  return (
    <div className="order-view-container">
      {/* Header */}
      <div className="order-header glass-card mb-4">
        <div>
          <h1>주문서 작성</h1>
          <p className="text-secondary">한우명가</p>
        </div>
        <div className="order-meta">
          <div className="meta-item">
            <span className="label">배송일</span>
            <span className="value">2024-01-16</span>
          </div>
          <div className="meta-item">
            <span className="label">마감</span>
            <span className="value warning">18:00까지</span>
          </div>
        </div>
      </div>

      {/* Revision Notice */}
      {status === 'REVISION' && (
        <div className="revision-notice glass-card mb-4">
          <div className="notice-icon">⚠️</div>
          <div className="notice-content">
            <h3>수정 요청</h3>
            <p>{revisionComment}</p>
          </div>
        </div>
      )}

      {/* Confirmed Notice */}
      {status === 'CONFIRMED' && (
        <div className="confirmed-notice glass-card mb-4">
          <div className="notice-icon"><CheckCircleIcon size={48} /></div>
          <div className="notice-content">
            <h3>주문 확정 완료</h3>
            <p>주문이 확정되었습니다. 배송 현황을 확인하세요.</p>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="glass-card mb-4">
        <h3 className="section-title">주문 품목</h3>

        <div className="items-list">
          {items.map(item => (
            <div key={item.id} className="order-item">
              <div className="item-header">
                <span className="item-name">{item.productName}</span>
                <span className="item-price">{formatCurrency(item.unitPrice)}/kg</span>
              </div>

              <div className="item-inputs">
                <div className="input-group">
                  <label>중량(kg)</label>
                  <input
                    type="number"
                    className="input"
                    value={item.qtyKg || ''}
                    onChange={(e) => updateItem(item.id, 'qtyKg', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    disabled={status === 'CONFIRMED'}
                  />
                </div>
                {item.boxToKg && (
                  <div className="input-group">
                    <label>박스 ({item.boxToKg}kg)</label>
                    <input
                      type="number"
                      className="input"
                      value={item.qtyBox || ''}
                      onChange={(e) => updateItem(item.id, 'qtyBox', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      disabled={status === 'CONFIRMED'}
                    />
                  </div>
                )}
              </div>

              {item.estimatedKg > 0 && (
                <div className="item-summary">
                  <span className="qty">{item.estimatedKg}kg</span>
                  <span className="amount gradient-text">{formatCurrency(item.amount)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="glass-card total-card mb-4">
        <div className="total-row">
          <span>총 주문량</span>
          <span className="font-semibold">{totalKg.toFixed(1)} kg</span>
        </div>
        <div className="total-row main">
          <span>총 금액</span>
          <span className="gradient-text text-2xl font-bold">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Actions */}
      {status !== 'CONFIRMED' && (
        <div className="actions-bar">
          {status === 'SENT' || status === 'REVISION' ? (
            <button className="btn btn-primary btn-lg w-full" onClick={handleSubmit}>
              주문 제출하기
            </button>
          ) : status === 'SUBMITTED' ? (
            <button className="btn btn-primary btn-lg w-full" onClick={handleConfirm}>
              최종 확정하기
            </button>
          ) : null}
        </div>
      )}

      {status === 'CONFIRMED' && (
        <div className="actions-bar">
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={() => navigate(`/order/${token}/tracking`)}
          >
            배송 현황 보기 →
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>주문 최종 확정</h3>
            </div>
            <div className="modal-body">
              <p>주문을 최종 확정하시겠습니까?</p>
              <p className="text-warning mt-2">⚠️ 확정 후에는 수정이 불가합니다.</p>

              <div className="confirm-summary mt-4">
                <div className="summary-row">
                  <span>총 주문량</span>
                  <span>{totalKg.toFixed(1)} kg</span>
                </div>
                <div className="summary-row">
                  <span>총 금액</span>
                  <span className="gradient-text font-bold">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={confirmOrder}>확정하기</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .order-view-container {
          max-width: 600px;
          width: 100%;
        }
        
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: var(--space-5);
        }
        
        .order-header h1 {
          font-size: var(--text-xl);
        }
        
        .order-meta {
          display: flex;
          gap: var(--space-4);
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .meta-item .label {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        .meta-item .value {
          font-weight: var(--font-medium);
        }
        
        .meta-item .value.warning {
          color: var(--color-warning);
        }
        
        .revision-notice {
          display: flex;
          gap: var(--space-4);
          padding: var(--space-4);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid var(--color-warning);
        }
        
        .revision-notice .notice-icon {
          font-size: 2rem;
        }
        
        .revision-notice h3 {
          color: var(--color-warning);
          margin-bottom: var(--space-1);
        }
        
        .confirmed-notice {
          display: flex;
          gap: var(--space-4);
          padding: var(--space-4);
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid var(--color-accent);
        }
        
        .confirmed-notice .notice-icon {
          font-size: 2rem;
        }
        
        .confirmed-notice h3 {
          color: var(--color-accent);
          margin-bottom: var(--space-1);
        }
        
        .section-title {
          font-size: var(--text-lg);
          margin-bottom: var(--space-4);
          padding: var(--space-4);
          border-bottom: 1px solid var(--border-secondary);
        }
        
        .items-list {
          padding: 0 var(--space-4) var(--space-4);
        }
        
        .order-item {
          padding: var(--space-4);
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-3);
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }
        
        .item-name {
          font-weight: var(--font-medium);
        }
        
        .item-price {
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }
        
        .item-inputs {
          display: flex;
          gap: var(--space-3);
        }
        
        .input-group {
          flex: 1;
        }
        
        .input-group label {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin-bottom: var(--space-1);
        }
        
        .item-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--border-secondary);
        }
        
        .item-summary .qty {
          color: var(--text-secondary);
        }
        
        .item-summary .amount {
          font-weight: var(--font-semibold);
        }
        
        .total-card {
          padding: var(--space-5);
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-2) 0;
        }
        
        .total-row.main {
          padding-top: var(--space-4);
          margin-top: var(--space-2);
          border-top: 1px solid var(--border-primary);
        }
        
        .actions-bar {
          padding: var(--space-4);
        }
        
        .confirm-summary {
          background: var(--bg-tertiary);
          padding: var(--space-4);
          border-radius: var(--radius-md);
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-2) 0;
        }
        
        .text-warning {
          color: var(--color-warning);
        }
      `}</style>
    </div>
  )
}
