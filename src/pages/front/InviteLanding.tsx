import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { XIcon, ClipboardListIcon, UserIcon, AlertTriangleIcon, ChevronRightIcon, InfoIcon, LogInIcon } from '../../components/Icons'
import { getOrderSheetByToken, getOrderSheetItems, type FirestoreOrderSheet, type FirestoreOrderSheetItem } from '../../lib/orderService'
import { getCustomerById, type FirestoreCustomer } from '../../lib/customerService'
import { useAuth } from '../../contexts/AuthContext'

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
  const { user } = useAuth()
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
        console.log('InviteLanding: Fetching order with token:', token)
        const order = await getOrderSheetByToken(token)

        if (order) {
          console.log('InviteLanding: Order found:', order.id)
          // Set basic order info first so summary shows up even if other fetches fail
          const initialOrderInfo: LocalOrderSheet = {
            ...order,
            createdAt: order.createdAt?.toDate?.() || new Date(),
            updatedAt: order.updatedAt?.toDate?.() || new Date(),
            shipDate: order.shipDate?.toDate?.() || undefined,
            cutOffAt: order.cutOffAt?.toDate?.() || undefined,
            items: []
          }
          setOrderInfo(initialOrderInfo)

          // Fetch other details in parallel but don't let them block the whole thing
          try {
            console.log('InviteLanding: Fetching customer info for:', order.customerOrgId)
            const customerData = await getCustomerById(order.customerOrgId)
            setCustomer(customerData)
          } catch (custErr) {
            console.error('InviteLanding: Customer fetch failed:', custErr)
          }

          try {
            console.log('InviteLanding: Fetching items for order:', order.id)
            const items = await getOrderSheetItems(order.id)
            setOrderInfo(prev => prev ? { ...prev, items: items || [] } : null)
          } catch (itemErr) {
            console.error('InviteLanding: Items fetch failed:', itemErr)
          }
        } else {
          console.warn('InviteLanding: No order found for token:', token)
        }
      } catch (err) {
        console.error('InviteLanding: CRITICAL Failed to load order:', err)
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

  // Case 2: Link is INVALID or LOADING
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
    <>
      <div className="invite-container flex flex-col items-center">
        {/* 1. Order Summary (Visible to Everyone) */}
        <div className="glass-card invite-card mb-4 min-h-0 bg-white/80 backdrop-blur-md border-white/50 shadow-xl">
          <div className="icon mb-2 opacity-60"><ClipboardListIcon size={40} /></div>
          <h2 className="text-xl font-bold mb-1">발주서 초대 내역</h2>
          <p className="customer-name mb-4 text-primary font-bold">{orderInfo.customerName} 파트너님</p>

          <div className="order-summary-box mb-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <div className="grid grid-cols-2 gap-y-4 text-left">
              <span className="text-secondary text-sm">주문번호</span>
              <span className="font-mono font-medium text-right text-sm">{orderInfo.id}</span>

              <span className="text-secondary text-sm">배송예정일</span>
              <span className="font-bold text-right text-sm">{orderInfo.shipDate ? formatDate(orderInfo.shipDate) : '-'}</span>

              <span className="text-secondary text-sm">주문마감</span>
              <span className="font-bold text-right text-sm text-red-500">{orderInfo.cutOffAt ? formatDateTime(orderInfo.cutOffAt) : '-'}</span>

              <div className="col-span-2 pt-4 mt-2 border-t border-blue-100 flex justify-between items-center">
                <span className="font-bold text-primary">예상 주문 합계</span>
                <span className="text-xl font-black text-blue-600">
                  {orderInfo.items && orderInfo.items.length > 0
                    ? orderInfo.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString() + '원'
                    : '0원'}
                </span>
              </div>
            </div>
          </div>

          {orderInfo.adminComment && (
            <div className="admin-memo text-left border-l-4 border-amber-400 pl-4 bg-amber-50/50 py-3 rounded-r-xl mb-6">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">관리자 전달사항</span>
              <p className="text-sm text-amber-900 mt-0.5 leading-relaxed">{orderInfo.adminComment}</p>
            </div>
          )}
        </div>

        {/* 2. Authentication Gate (Conditional) */}
        <div className="glass-card invite-card shadow-2xl border-2 border-blue-500/20">
          {!user || user.orgId !== orderInfo.customerOrgId ? (
            <>
              {/* Account Status Messages */}
              {(!customer || customer.status !== 'ACTIVE') ? (
                <div className="auth-step-box">
                  <div className="flex items-center gap-3 mb-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                      <AlertTriangleIcon size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-amber-800 text-sm">계정 활성화가 필요합니다</h4>
                      <p className="text-[11px] text-amber-700/80">안전한 거래를 위해 첫 주문 전 가입을 진행해주세요.</p>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-lg w-full py-4 text-base font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all mb-4"
                    onClick={() => navigate(`/invite/${customer?.inviteToken || ''}`)}
                  >
                    파트너 계정 활성화하기
                  </button>
                </div>
              ) : !user ? (
                <div className="auth-step-box">
                  <div className="flex items-center gap-3 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <InfoIcon size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-blue-800 text-sm">기존 파트너 계정 로그인</h4>
                      <p className="text-[11px] text-blue-700/80">이미 가입된 계정이 있습니다. 로그인 후 주문해주세요.</p>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-lg w-full py-4 text-base font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all mb-4"
                    onClick={() => navigate('/login', { state: { from: `/order/${token}` } })}
                  >
                    로그인 후 주문하기
                  </button>
                </div>
              ) : (
                // Mismatched Account
                <div className="auth-step-box">
                  <div className="flex items-center gap-3 mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                      <XIcon size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-red-800 text-sm">접근 권한이 없습니다</h4>
                      <p className="text-[11px] text-red-700/80">현재 로그인된 계정이 발주서 대상과 다릅니다.</p>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary w-full py-3 mb-2"
                    onClick={() => navigate('/login')}
                  >
                    다른 계정으로 로그인
                  </button>
                </div>
              )}

              <p className="text-[11px] text-muted text-center">
                주문장 보안을 위해 <strong>본인 인증된 계정</strong>으로만 접근이 가능합니다.
              </p>
            </>
          ) : (
            /* Authorized User */
            <div className="auth-success-box text-center py-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardListIcon size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 font-black">인증 완료</h3>
              <p className="text-sm text-secondary mb-8">
                {user.name} 님, 주문을 시작할 준비가 되었습니다.<br />
                품목과 수량을 확인하고 주문을 제출해주세요.
              </p>

              <button
                className="btn btn-primary btn-lg w-full py-5 text-lg font-bold shadow-xl shadow-blue-500/20 animate-bounce-subtle"
                onClick={() => navigate(`/order/${token}/edit`)}
              >
                주문서 작성하러 가기 →
              </button>
            </div>
          )}
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
    </>
  )
}
