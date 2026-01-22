import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircleIcon, UserIcon, ChevronRightIcon } from '../../components/Icons'
import { getOrderSheetByToken, updateOrderSheet, setOrderSheetItems, createSalesOrderFromSheet, getOrderSheetItems } from '../../lib/orderService'
import { getUserById, type FirestoreUser } from '../../lib/userService'

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
  const [customer, setCustomer] = useState<FirestoreUser | null>(null)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const orderData = await getOrderSheetByToken(token)
        if (orderData) {
          setOrder(orderData)
          setStatus(orderData.status as any)

          if (!orderData.isGuest) {
            const customerData = await getUserById(orderData.customerOrgId)
            setCustomer(customerData)
          }

          // Load items from Firestore instead of mock
          const firestoreItems = await getOrderSheetItems(orderData.id)
          if (firestoreItems && firestoreItems.length > 0) {
            setItems(firestoreItems.map(item => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              qtyKg: item.unit === 'kg' ? item.qtyRequested || 0 : 0,
              qtyBox: item.unit === 'box' ? item.qtyRequested || 0 : 0,
              estimatedKg: item.estimatedKg || 0,
              amount: item.amount || 0,
              boxToKg: 20 // Default or from product service
            })))
          }
        }
      } catch (err) {
        console.error('Failed to load order data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()



    if (token?.includes('revision')) {
      setStatus('REVISION')
      setRevisionComment('안심 수량이 너무 많습니다. 재고 확인 후 조정 부탁드립니다.')
    }
  }, [token])

  if (loading) return <div className="p-20 text-center">불러오는 중...</div>

  // Account Activation Guard (Skip for Guest Customers)
  if (order && !order.isGuest && customer && customer.status !== 'ACTIVE') {
    return (
      <div className="order-view-container p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="glass-card p-10 text-center max-w-md shadow-2xl">
          <UserIcon size={64} color="#3b82f6" className="mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">계정 활성화 필요</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            주문서를 확인하고 주문을 진행하시려면 먼저 <strong>{customer.business?.companyName || customer.name}</strong>의 파트너 계정을 활성화해주세요.
          </p>
          <button
            className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 rounded-xl transition-all active:scale-95"
            onClick={() => navigate(`/invite/${customer.inviteToken}`)}
          >
            파트너 계정 활성화하기 <ChevronRightIcon size={20} />
          </button>
          <p className="mt-8 text-sm text-gray-400">
            이미 계정이 있으신가요? <span className="text-blue-500 font-semibold underline cursor-pointer" onClick={() => navigate('/login')}>로그인하기</span>
          </p>
        </div>
      </div>
    )
  }

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

  const handleSubmit = async () => {
    if (totalKg === 0) {
      alert('최소 1개 이상의 품목을 주문해주세요.')
      return
    }

    if (!order || !token) return

    try {
      setLoading(true)
      // 1. Update items in Firestore
      const updateItems = items.map(item => ({
        productId: (item as any).productId || '',
        productName: item.productName,
        unit: item.qtyBox > 0 ? 'box' : 'kg',
        unitPrice: item.unitPrice,
        qtyRequested: item.qtyBox > 0 ? item.qtyBox : item.qtyKg,
        estimatedKg: item.estimatedKg,
        amount: item.amount,
      }))
      await setOrderSheetItems(order.id, updateItems)

      // 2. Update status
      await updateOrderSheet(order.id, { status: 'SUBMITTED' })

      setStatus('SUBMITTED')
      alert('주문이 제출되었습니다. 운영자 검토 후 확정됩니다.')
    } catch (err) {
      console.error(err)
      alert('주문 제출에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    setShowConfirmModal(true)
  }

  const confirmOrder = async () => {
    if (!order || !token) return

    try {
      setLoading(true)
      // 1. Create Sales Order from Sheet
      await createSalesOrderFromSheet(
        { id: order.id, customerOrgId: order.customerOrgId, customerName: order.customerName },
        items.map(i => ({
          productId: (i as any).productId,
          productName: i.productName,
          estimatedKg: i.estimatedKg,
          unitPrice: i.unitPrice,
          amount: i.amount
        }))
      )

      // 2. Update Sheet status
      await updateOrderSheet(order.id, { status: 'CONFIRMED' })

      setStatus('CONFIRMED')
      setShowConfirmModal(false)
      alert('주문이 최종 확정되었습니다!')
      navigate(`/order/${token}/tracking`)
    } catch (err) {
      console.error(err)
      alert('주문 확정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="order-view-container">
      {/* Header */}
      <div className="order-header glass-card mb-4">
        <div>
          <h1>주문서 작성</h1>
          <p className="text-secondary">{order?.customerName || '알 수 없음'}</p>
        </div>
        <div className="order-meta">
          <div className="meta-item">
            <span className="label">배송일</span>
            <span className="value">{order?.shipDate ? order.shipDate.toDate().toLocaleDateString() : '미지정'}</span>
          </div>
          <div className="meta-item">
            <span className="label">마감</span>
            <span className="value warning">{order?.cutOffAt ? order.cutOffAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}까지</span>
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
