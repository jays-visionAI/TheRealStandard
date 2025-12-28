import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  PackageIcon,
  TruckDeliveryIcon,
  CheckCircleIcon,
  BuildingIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  SearchIcon
} from '../../components/Icons'
import {
  getOrderSheetByToken,
  getShipmentsBySalesOrder,
  getAllSalesOrders,
  type FirestoreOrderSheet,
  type FirestoreSalesOrder,
  type FirestoreShipment
} from '../../lib/orderService'
import type { ShipmentStatus } from '../../types'
import type { ReactNode } from 'react'
import { Timestamp } from 'firebase/firestore'

interface TrackingState {
  orderSheet: FirestoreOrderSheet | null
  salesOrder: FirestoreSalesOrder | null
  shipment: FirestoreShipment | null
}

export default function DeliveryTracking() {
  const { token } = useParams()
  const [state, setState] = useState<TrackingState>({
    orderSheet: null,
    salesOrder: null,
    shipment: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadTrackingData(token)
    }
  }, [token])

  const loadTrackingData = async (token: string) => {
    try {
      setLoading(true)
      setError(null)

      // 1. Get OrderSheet by token
      const orderSheet = await getOrderSheetByToken(token)
      if (!orderSheet) {
        setError('주문 정보를 찾을 수 없습니다. (유효하지 않은 토큰)')
        return
      }

      // 2. Get SalesOrder by sourceOrderSheetId
      // Note: We might need a more efficient query, but for now we search all sales orders
      const allSalesOrders = await getAllSalesOrders()
      const salesOrder = allSalesOrders.find(so => so.sourceOrderSheetId === orderSheet.id)

      if (!salesOrder) {
        // SalesOrder not yet created (Order still in DRAFT/SENT/SUBMITTED etc)
        setState({ orderSheet, salesOrder: null, shipment: null })
        return
      }

      // 3. Get Shipment by sourceSalesOrderId
      const shipments = await getShipmentsBySalesOrder(salesOrder.id)
      const shipment = shipments && shipments.length > 0 ? shipments[0] : null

      setState({
        orderSheet,
        salesOrder,
        shipment
      })
    } catch (err) {
      console.error('Failed to load tracking data:', err)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: ShipmentStatus | 'UNAUTHORIZED' | 'PENDING_DISPATCH'): { label: string; icon: ReactNode; color: string; step: number } => {
    const config: Record<string, { label: string; icon: ReactNode; color: string; step: number }> = {
      PENDING_DISPATCH: { label: '배송 준비중', icon: <PackageIcon size={48} />, color: '#94a3b8', step: 1 },
      PREPARING: { label: '출고 준비중', icon: <PackageIcon size={48} />, color: 'var(--color-warning)', step: 1 },
      IN_TRANSIT: { label: '배송중', icon: <TruckDeliveryIcon size={48} />, color: 'var(--color-primary)', step: 2 },
      DELIVERED: { label: '배송 완료', icon: <CheckCircleIcon size={48} />, color: 'var(--color-accent)', step: 3 },
    }
    return config[status] || config.PENDING_DISPATCH
  }

  const formatTimestamp = (ts?: Timestamp) => {
    if (!ts) return '-'
    const date = ts.toDate()
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatTimeOnly = (ts?: Timestamp) => {
    if (!ts) return '-'
    const date = ts.toDate()
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit', hour12: false
    })
  }

  if (loading) {
    return (
      <div className="tracking-container">
        <div className="glass-card tracking-card text-center p-12">
          <div className="loading-spinner mb-4"></div>
          <p>배송 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !state.orderSheet) {
    return (
      <div className="tracking-container">
        <div className="glass-card tracking-card text-center p-12">
          <div className="error-icon text-error mb-4">⚠️</div>
          <p>{error || '배송 정보를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    )
  }

  const { orderSheet, salesOrder, shipment } = state
  const currentStatus = shipment ? shipment.status : 'PENDING_DISPATCH'
  const statusConfig = getStatusConfig(currentStatus as ShipmentStatus)

  return (
    <div className="tracking-container p-4">
      {/* Top Banner Status */}
      <div className="glass-card status-card mb-4 text-center p-8 bg-white/5 border-white/10">
        <div className="status-icon-wrapper mb-4" style={{ color: statusConfig.color }}>
          {statusConfig.icon}
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: statusConfig.color }}>{statusConfig.label}</h2>
        <p className="text-muted text-sm">주문번호: {salesOrder?.id || orderSheet.id}</p>

        {/* Progress Tracker */}
        <div className="progress-steps mt-8 flex items-center justify-between max-w-sm mx-auto">
          <div className={`step flex flex-col items-center gap-2 ${statusConfig.step >= 1 ? 'active' : ''}`}>
            <div className="step-dot w-4 h-4 rounded-full bg-white/10 border-2 border-white/20 transition-all duration-300"></div>
            <span className="text-xs text-muted">준비중</span>
          </div>
          <div className="step-line flex-1 h-[2px] bg-white/10 mx-2 -mt-6"></div>
          <div className={`step flex flex-col items-center gap-2 ${statusConfig.step >= 2 ? 'active' : ''}`}>
            <div className="step-dot w-4 h-4 rounded-full bg-white/10 border-2 border-white/20 transition-all duration-300"></div>
            <span className="text-xs text-muted">배송중</span>
          </div>
          <div className="step-line flex-1 h-[2px] bg-white/10 mx-2 -mt-6"></div>
          <div className={`step flex flex-col items-center gap-2 ${statusConfig.step >= 3 ? 'active' : ''}`}>
            <div className="step-dot w-4 h-4 rounded-full bg-white/10 border-2 border-white/20 transition-all duration-300"></div>
            <span className="text-xs text-muted">완료</span>
          </div>
        </div>
      </div>

      {/* Main Delivery Info Display */}
      {shipment ? (
        <div className="glass-card delivery-info-card mb-4 p-6 bg-white/5 border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TruckDeliveryIcon size={20} className="text-primary" /> 배송 정보
            </h3>
            {shipment.isModified && <span className="badge badge-outline text-[10px] py-0">정보수정됨</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="info-box bg-white/5 p-4 rounded-xl flex items-start gap-3">
              <BuildingIcon size={24} className="text-muted mt-1" />
              <div>
                <span className="block text-[10px] text-muted uppercase tracking-wider mb-1">배송업체</span>
                <span className="font-medium">{shipment.company || '-'}</span>
              </div>
            </div>

            <div className="info-box bg-white/5 p-4 rounded-xl flex items-start gap-3">
              <span className="text-2xl mt-1">🚗</span>
              <div>
                <span className="block text-[10px] text-muted uppercase tracking-wider mb-1">차량번호</span>
                <span className="font-medium">{shipment.vehicleNumber || '-'}</span>
              </div>
            </div>

            <div className="info-box bg-white/5 p-4 rounded-xl flex items-start gap-3">
              <UserIcon size={24} className="text-muted mt-1" />
              <div>
                <span className="block text-[10px] text-muted uppercase tracking-wider mb-1">기사님</span>
                <span className="font-medium">{shipment.driverName || '-'}</span>
              </div>
            </div>

            <div className="info-box bg-white/5 p-4 rounded-xl flex items-start gap-3">
              <PhoneIcon size={24} className="text-muted mt-1" />
              <div>
                <span className="block text-[10px] text-muted uppercase tracking-wider mb-1">연락처</span>
                {shipment.driverPhone ? (
                  <a href={`tel:${shipment.driverPhone}`} className="text-primary font-medium hover:underline">
                    {shipment.driverPhone}
                  </a>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </div>
            </div>
          </div>

          <div className="eta-container mt-6 p-5 bg-primary/10 border border-primary/30 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CalendarIcon size={24} className="text-primary" />
              <span className="text-sm font-medium text-primary-light">예상 도착시간</span>
            </div>
            <div className="text-3xl font-bold gradient-text">
              {formatTimeOnly(shipment.etaAt || shipment.eta)}
            </div>
          </div>

          <p className="text-[11px] text-muted mt-4 text-center px-4">
            * 도로 상황에 따라 도착 예정 시간이 변경될 수 있는 점 양해 부탁드립니다.
          </p>
        </div>
      ) : (
        <div className="glass-card mb-4 p-12 text-center bg-white/5 border-white/10 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <SearchIcon size={32} className="text-muted opacity-50" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">배차 대기 중</h3>
            <p className="text-sm text-muted mt-1">곧 배차가 완료되면 실시간 정보를 확인하실 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* Order Summary Section */}
      <div className="glass-card order-summary-card p-6 bg-white/5 border-white/10">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <PackageIcon size={20} className="text-muted" /> 주문 정보
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-muted">고객명</span>
            <span className="font-medium">{orderSheet.customerName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-muted">배송예정일</span>
            <span className="font-medium">
              {orderSheet.shipDate instanceof Timestamp
                ? orderSheet.shipDate.toDate().toLocaleDateString('ko-KR')
                : orderSheet.shipDate?.toLocaleString() || '-'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted">배송지</span>
            <span className="text-sm font-medium text-right max-w-[200px] leading-tight">
              {orderSheet.shipTo}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .tracking-container {
          max-width: 540px;
          margin: 0 auto;
          color: white;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        .step.active .step-dot {
          background: var(--color-primary);
          border-color: var(--color-primary);
          box-shadow: 0 0 10px var(--color-primary-glow);
        }

        .step.active span {
          color: white;
          font-weight: 500;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  )
}
