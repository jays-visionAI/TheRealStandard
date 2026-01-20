import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { XIcon, ClipboardListIcon, UserIcon, AlertTriangleIcon, ChevronRightIcon, InfoIcon } from '../../components/Icons'
import { getOrderSheetByToken, getOrderSheetItems, type FirestoreOrderSheet, type FirestoreOrderSheetItem } from '../../lib/orderService'
import { getCustomerById, type FirestoreCustomer } from '../../lib/customerService'

// 로컬 타입
type LocalOrderSheet = Omit<FirestoreOrderSheet, 'createdAt' | 'updatedAt' | 'shipDate' | 'cutOffAt'> & {
  createdAt?: Date
  updatedAt?: Date
  shipDate?: Date
  cutOffAt?: Date
  items?: FirestoreOrderSheetItem[]
}

export default function InviteLanding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [orderInfo, setOrderInfo] = useState<LocalOrderSheet | null>(null)
  const [customer, setCustomer] = useState<FirestoreCustomer | null>(null)

  useEffect(() => {
    const loadOrder = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const order = await getOrderSheetByToken(token)
        if (order) {
          // Fetch customer info to check activation status
          const customerData = await getCustomerById(order.customerOrgId)
          setCustomer(customerData)

          const items = await getOrderSheetItems(order.id)
          setOrderInfo({
            ...order,
            createdAt: order.createdAt?.toDate?.() || new Date(),
            updatedAt: order.updatedAt?.toDate?.() || new Date(),
            shipDate: order.shipDate?.toDate?.() || undefined,
            cutOffAt: order.cutOffAt?.toDate?.() || undefined,
            items: items || []
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

  // Account Activation Guard
  if (customer && customer.status !== 'ACTIVE') {
    return (
      <div className="invite-container">
        <div className="glass-card invite-card activation-required">
          <div className="icon"><UserIcon size={48} color="#3b82f6" /></div>
          <h2 className="gradient-text">계정 활성화 필요</h2>
          <p className="customer-name">{customer.companyName} 파트너님</p>

          <div className="notice-box glass-card mb-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangleIcon size={20} color="#f59e0b" />
              <h4 className="font-bold text-amber-700">첫 주문 전 계정 생성이 필요합니다</h4>
            </div>
            <p className="text-sm text-secondary text-left leading-relaxed">
              본 주문장은 <strong>{customer.companyName}</strong> 전용으로 발송되었습니다.
              안전한 거래와 주문 이력 관리를 위해 먼저 파트너 계정을 활성화해주세요.
            </p>
          </div>

          <div className="action-guide mb-8">
            <div className="guide-item">
              <span className="step-no">1</span>
              <span>계정 정보 (이메일/비밀번호) 설정</span>
            </div>
            <div className="guide-item">
              <span className="step-no">2</span>
              <span>로그인 후 주문서 작성 및 제출</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
            onClick={() => navigate(`/invite/${customer.inviteToken}`)}
          >
            파트너 계정 활성화하기 <ChevronRightIcon size={20} />
          </button>

          <p className="mt-6 text-xs text-muted">
            이미 계정이 있으신가요? <span className="underline cursor-pointer" onClick={() => navigate('/login')}>로그인하기</span>
          </p>
        </div>

        <style>{`
          .activation-required {
            background: linear-gradient(to bottom, #ffffff, #f8faff);
            border: 1px solid #dbeafe;
          }
          .notice-box {
            background: #fffbeb;
            border: 1px solid #fef3c7;
            padding: var(--space-4);
          }
          .action-guide {
            text-align: left;
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }
          .guide-item {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            font-size: var(--text-sm);
            color: var(--text-primary);
          }
          .step-no {
            width: 24px;
            height: 24px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: bold;
          }
        `}</style>
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
          {orderInfo.items && orderInfo.items.length > 0 && (
            <>
              <div className="info-row">
                <span className="label">주문내역</span>
                <span className="value">
                  {orderInfo.items[0].productName}
                  {orderInfo.items.length > 1 ? ` 외 ${orderInfo.items.length - 1}품목` : ''}
                </span>
              </div>
              <div className="info-row">
                <span className="label">예상주문금액</span>
                <span className="value">
                  {orderInfo.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}원
                </span>
              </div>
            </>
          )}
          <div className="info-row">
            <span className="label">배송예정일</span>
            <span className="value">{orderInfo.shipDate ? formatDate(orderInfo.shipDate) : '-'}</span>
          </div>
          <div className="info-row">
            <span className="label">주문마감</span>
            <span className="value highlight">{orderInfo.cutOffAt ? formatDateTime(orderInfo.cutOffAt) : '-'}</span>
          </div>
        </div>

        {orderInfo.adminComment && (
          <div className="admin-memo">
            <span className="memo-label">관리자 메모</span>
            <p className="memo-text">{orderInfo.adminComment}</p>
          </div>
        )}

        <div className="login-notice mb-4 flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <InfoIcon size={14} />
          <span>주문 제출을 위해 파트너 로그인이 필요합니다.</span>
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

        .admin-memo {
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-radius: var(--radius-md);
          padding: var(--space-4);
          margin-bottom: var(--space-6);
          text-align: left;
        }

        .memo-label {
          display: block;
          font-size: var(--text-xs);
          font-weight: var(--font-bold);
          color: #f57c00;
          margin-bottom: var(--space-1);
          text-transform: uppercase;
        }

        .memo-text {
          font-size: var(--text-sm);
          color: #5d4037;
          line-height: 1.5;
          margin: 0;
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
