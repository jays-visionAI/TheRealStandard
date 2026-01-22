import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { XIcon, ClipboardListIcon, UserIcon, AlertTriangleIcon, ChevronRightIcon, InfoIcon, LogInIcon } from '../../components/Icons'
import { getOrderSheetByToken, getOrderSheetItems, type FirestoreOrderSheet, type FirestoreOrderSheetItem } from '../../lib/orderService'
import { getUserById, updateUser, type FirestoreUser } from '../../lib/userService'
import { useAuth } from '../../contexts/AuthContext'

// 로컬 타입
type LocalOrderSheet = Omit<FirestoreOrderSheet, 'createdAt' | 'updatedAt' | 'shipDate' | 'cutOffAt'> & {
  createdAt?: Date
  updatedAt?: Date
  shipDate?: Date
  cutOffAt?: Date
  items?: FirestoreOrderSheetItem[]
  isGuest?: boolean
}

export default function InviteLanding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orderInfo, setOrderInfo] = useState<LocalOrderSheet | null>(null)
  const [customer, setCustomer] = useState<FirestoreUser | null>(null)

  // Mode and Login/Signup states
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorStatus, setErrorStatus] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Countdown timer state
  const [countdown, setCountdown] = useState('')

  // Countdown timer effect
  useEffect(() => {
    if (!orderInfo?.cutOffAt) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const cutOff = orderInfo.cutOffAt!.getTime()
      const diff = cutOff - now

      if (diff <= 0) {
        setCountdown('마감됨')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setCountdown(`${days}일 ${hours}시간 ${mins}분`)
      } else if (hours > 0) {
        setCountdown(`${hours}시간 ${mins}분 ${secs}초`)
      } else {
        setCountdown(`${mins}분 ${secs}초`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [orderInfo?.cutOffAt])

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
            const customerData = await getUserById(order.customerOrgId)
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

  // Prefill email if customer info is loaded
  useEffect(() => {
    if (customer && customer.email && mode === 'SIGNUP') {
      setEmail(customer.email)
    }
  }, [customer, mode])

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

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorStatus('')
    setIsProcessing(true)

    try {
      await login(email, password)
      // 로그인 성공 시 AuthContext가 변경되면서 자동으로 리렌더링됩니다.
    } catch (err: any) {
      console.error('Login failed:', err)
      setErrorStatus('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleInlineSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorStatus('')

    if (password !== confirmPassword) {
      setErrorStatus('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      setErrorStatus('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    setIsProcessing(true)

    try {
      // 1. Firebase Auth 계정 생성 (이메일 소문자 정규화)
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      const { auth } = await import('../../lib/firebase')

      const normalizedEmail = email.toLowerCase().trim()
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      const firebaseUid = userCredential.user.uid

      // 2. Firestore 고객 데이터 업데이트 (활성화)
      if (customer) {
        await updateUser(customer.id, {
          email: normalizedEmail,
          status: 'ACTIVE',
          firebaseUid: firebaseUid // Link Auth UID
        })
      }

      // 3. 페이지 새로고침 또는 AuthContext 업데이트 대기
      // AuthContext의 onAuthStateChanged가 감지하여 자동으로 user 상태를 업데이트할 것입니다.
      console.log('Signup and Activation successful')
    } catch (err: any) {
      console.error('Signup failed:', err)
      if (err.code === 'auth/email-already-in-use') {
        setErrorStatus('이미 가입된 이메일입니다. 로그인해 주세요.')
      } else {
        setErrorStatus(`회원가입 실패: ${err.message}`)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div className="invite-container flex flex-col items-center">
        {/* 1. Order Summary (Visible to Everyone) */}
        <div className="glass-card invite-card mb-4 min-h-0 bg-white/80 backdrop-blur-md border-white/50 shadow-xl">
          <div className="icon mb-2 opacity-60"><ClipboardListIcon size={40} /></div>
          <h2 className="text-xl font-bold mb-1">발주서</h2>
          <p className="customer-name mb-4 text-primary font-bold">{orderInfo.customerName} 파트너님</p>

          <div className="order-summary-box mb-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <div className="grid grid-cols-2 gap-y-4 text-left">
              <span className="text-secondary text-sm">주문번호</span>
              <span className="font-mono font-medium text-right text-sm">{orderInfo.id}</span>

              <span className="text-secondary text-sm">생성일</span>
              <span className="font-medium text-right text-sm">{orderInfo.createdAt ? formatDate(orderInfo.createdAt) : '-'}</span>

              <span className="text-secondary text-sm">품목</span>
              <span className="font-medium text-right text-sm">
                {orderInfo.items && orderInfo.items.length > 0
                  ? (orderInfo.items.length === 1 ? orderInfo.items[0].productName : `${orderInfo.items[0].productName} 외 ${orderInfo.items.length - 1}개 품목`)
                  : '-'}
              </span>

              <span className="text-secondary text-sm">배송예정일</span>
              <span className="font-bold text-right text-sm">{orderInfo.shipDate ? formatDate(orderInfo.shipDate) : '-'}</span>

              <span className="text-secondary text-sm">주문마감</span>
              <div className="text-right">
                <span className="font-bold text-sm text-red-500">{orderInfo.cutOffAt ? formatDateTime(orderInfo.cutOffAt) : '-'}</span>
                {countdown && (
                  <span className="block text-xs text-red-400 mt-1 font-mono">남은시간: {countdown}</span>
                )}
              </div>

              {orderInfo.items && orderInfo.items.reduce((sum, item) => sum + (item.amount || 0), 0) > 0 && (
                <div className="col-span-2 pt-4 mt-2 border-t border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">예상 발주 합계</span>
                    <span className="text-xl font-black text-blue-600">
                      {orderInfo.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {orderInfo.adminComment ? (
            <div className="admin-memo text-left border-l-4 border-amber-400 pl-4 bg-amber-50/50 py-3 rounded-r-xl mb-6">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">관리자 전달사항</span>
              <p className="text-sm text-amber-900 mt-0.5 leading-relaxed">{orderInfo.adminComment}</p>
            </div>
          ) : null}
        </div>

        {/* 2. Authentication Gate (Conditional) */}
        <div className="glass-card invite-card shadow-2xl border-2 border-blue-500/20">
          {orderInfo.isGuest ? (
            /* Guest User - Directly allow order */
            <div className="auth-success-box text-center py-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardListIcon size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 font-black">비회원 주문 시작</h3>
              <p className="text-sm text-secondary mb-8">
                <strong>{orderInfo.customerName}</strong> 님, 제안받으신 단가표로<br />
                즉시 주문서를 작성하실 수 있습니다.
              </p>

              <button
                className="btn btn-primary btn-lg w-full py-5 text-lg font-bold shadow-xl shadow-blue-500/20 animate-bounce-subtle"
                onClick={() => navigate(`/order/${token}/edit`)}
              >
                주문서 작성 시작하기 →
              </button>
            </div>
          ) : !user || user.orgId !== orderInfo.customerOrgId ? (
            <div className="auth-step-box">
              <div className="flex items-center gap-3 mb-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <LogInIcon size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm text-blue-700">안전한 거래를 위해 로그인 해주세요.</p>
                </div>
              </div>

              {/* Inline Login/Signup Form */}
              <form onSubmit={mode === 'LOGIN' ? handleInlineLogin : handleInlineSignup} className="inline-login-form mb-8">
                <div className="form-group mb-3 text-left">
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">아이디(이메일)</label>
                  <input
                    type="email"
                    className="input w-full py-3 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-sans"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={mode === 'SIGNUP' && !!customer?.email}
                    required
                  />
                </div>
                <div className="form-group mb-3 text-left">
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">비밀번호</label>
                  <input
                    type="password"
                    className="input w-full py-3 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {mode === 'SIGNUP' && (
                  <div className="form-group mb-1 text-left">
                    <label className="text-[11px] font-bold text-gray-500 mb-1 block">비밀번호 확인</label>
                    <input
                      type="password"
                      className="input w-full py-3 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                {errorStatus && (
                  <p className="text-red-500 text-[11px] mt-2 ml-1">
                    {errorStatus}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full py-4 mt-6 text-base font-black shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                  disabled={isProcessing}
                >
                  {isProcessing ? '처리 중...' : (mode === 'LOGIN' ? '로그인 후 주문하기' : '계정 활성화 및 주문하기')}
                </button>
              </form>

              <div className="activation-separator relative h-px bg-gray-100 my-8">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[11px] text-gray-400 font-bold">OR</span>
              </div>

              <div className="activation-link-box text-center">
                {mode === 'LOGIN' ? (
                  <>
                    <p className="text-xs text-secondary mb-3">비회원인 경우 가입하기</p>
                    <button
                      className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-600 font-semibold hover:from-blue-100 hover:to-indigo-100 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        setMode('SIGNUP')
                        setErrorStatus('')
                      }}
                    >
                      파트너 계정 활성화하기 <ChevronRightIcon size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-secondary mb-3">이미 계정이 있으신가요?</p>
                    <button
                      className="w-full py-3 rounded-xl border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      onClick={() => {
                        setMode('LOGIN')
                        setErrorStatus('')
                      }}
                    >
                      기존 계정으로 로그인하기
                    </button>
                  </>
                )}
              </div>
            </div>
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
