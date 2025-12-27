import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { XIcon, ClipboardListIcon } from '../../components/Icons'
import { getOrderSheetByToken, type FirestoreOrderSheet } from '../../lib/orderService'

// 로컬 타입
type LocalOrderSheet = Omit<FirestoreOrderSheet, 'createdAt' | 'updatedAt' | 'shipDate' | 'cutOffAt'> & {
  createdAt?: Date
  updatedAt?: Date
  shipDate?: Date
  cutOffAt?: Date
}

export default function InviteLanding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [orderInfo, setOrderInfo] = useState<LocalOrderSheet | null>(null)

  useEffect(() => {
    const loadOrder = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const order = await getOrderSheetByToken(token)
        if (order) {
          setOrderInfo({
            ...order,
            createdAt: order.createdAt?.toDate?.() || new Date(),
            updatedAt: order.updatedAt?.toDate?.() || new Date(),
            shipDate: order.shipDate?.toDate?.() || undefined,
            cutOffAt: order.cutOffAt?.toDate?.() || undefined,
          })
        }
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [token])

  if (loading) {
    return (
      <div className="invite-container">
        <div className="glass-card invite-card">
          <div className="loading-spinner"></div>
          <p>주문장을 확인하고 있습니다...</p>
        </div>
      </div>
    )
  }

  if (!orderInfo) {
    return (
      <div className="invite-container">
        <div className="glass-card invite-card error">
          <div className="icon"><XIcon size={48} /></div>
          <h2>유효하지 않은 링크</h2>
          <p>이 링크는 만료되었거나 유효하지 않습니다.</p>
          <p className="text-sm">담당자에게 문의해주세요.</p>
        </div>
      </div>
    )
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="invite-container">
      <div className="glass-card invite-card">
        <div className="icon"><ClipboardListIcon size={48} /></div>
        <h2 className="gradient-text">주문장 초대</h2>
        <p className="customer-name">{orderInfo.customerName}님</p>

        <div className="order-info">
          <div className="info-row">
            <span className="label">주문번호</span>
            <span className="value">{orderInfo.id}</span>
          </div>
          <div className="info-row">
            <span className="label">배송예정일</span>
            <span className="value">{orderInfo.shipDate ? formatDate(orderInfo.shipDate) : '-'}</span>
          </div>
          <div className="info-row">
            <span className="label">주문마감</span>
            <span className="value highlight">{orderInfo.cutOffAt ? formatDateTime(orderInfo.cutOffAt) : '-'}</span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg w-full"
          onClick={() => navigate(`/order/${token}/edit`)}
        >
          주문하기 →
        </button>
      </div>

      <style>{`
        .invite-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }
        
        .invite-card {
          max-width: 400px;
          width: 100%;
          padding: var(--space-8);
          text-align: center;
        }
        
        .invite-card .icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
          display: flex;
          justify-content: center;
        }
        
        .invite-card h2 {
          margin-bottom: var(--space-2);
        }
        
        .customer-name {
          font-size: var(--text-xl);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-6);
        }
        
        .order-info {
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          margin-bottom: var(--space-6);
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-2) 0;
        }
        
        .info-row .label {
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }
        
        .info-row .value {
          font-weight: var(--font-medium);
        }
        
        .info-row .value.highlight {
          color: var(--color-warning);
        }
        
        .error .icon {
          font-size: 5rem;
          color: var(--color-error);
        }
        
        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-primary);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto var(--space-4);
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
