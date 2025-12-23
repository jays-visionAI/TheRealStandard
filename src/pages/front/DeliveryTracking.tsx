import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { ShipmentStatus } from '../../types'

interface TrackingInfo {
  status: ShipmentStatus
  carrierName: string
  vehicleNo: string
  driverName: string
  driverPhone: string
  etaAt: string
  orderId: string
  customerName: string
  shipDate: string
}

export default function DeliveryTracking() {
  const { token } = useParams()
  const [tracking, setTracking] = useState<TrackingInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setTracking({
        status: 'IN_TRANSIT',
        carrierName: '한국물류',
        vehicleNo: '서울12가3456',
        driverName: '김기사',
        driverPhone: '010-1234-5678',
        etaAt: '14:00',
        orderId: 'OS-2024-001',
        customerName: '한우명가',
        shipDate: '2024-01-16',
      })
      setLoading(false)
    }, 500)
  }, [token])

  const getStatusConfig = (status: ShipmentStatus) => {
    const config = {
      PREPARING: { label: '배송 준비중', icon: '📦', color: 'var(--color-warning)', step: 1 },
      IN_TRANSIT: { label: '배송중', icon: '🚛', color: 'var(--color-primary)', step: 2 },
      DELIVERED: { label: '배송 완료', icon: '✅', color: 'var(--color-accent)', step: 3 },
    }
    return config[status]
  }

  if (loading) {
    return (
      <div className="tracking-container">
        <div className="glass-card tracking-card">
          <div className="loading-spinner"></div>
          <p>배송 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!tracking) {
    return (
      <div className="tracking-container">
        <div className="glass-card tracking-card">
          <p>배송 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(tracking.status)

  return (
    <div className="tracking-container">
      {/* Status Card */}
      <div className="glass-card status-card mb-4">
        <div className="status-icon" style={{ color: statusConfig.color }}>
          {statusConfig.icon}
        </div>
        <h2 style={{ color: statusConfig.color }}>{statusConfig.label}</h2>
        <p className="text-secondary">주문번호: {tracking.orderId}</p>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`step ${statusConfig.step >= 1 ? 'active' : ''}`}>
            <div className="step-dot"></div>
            <span>준비중</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${statusConfig.step >= 2 ? 'active' : ''}`}>
            <div className="step-dot"></div>
            <span>배송중</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${statusConfig.step >= 3 ? 'active' : ''}`}>
            <div className="step-dot"></div>
            <span>완료</span>
          </div>
        </div>
      </div>

      {/* Delivery Info - Only shown when IN_TRANSIT */}
      {tracking.status === 'IN_TRANSIT' && (
        <div className="glass-card delivery-info mb-4">
          <h3>배송 정보</h3>

          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon">🏢</span>
              <div className="info-content">
                <span className="label">배송업체</span>
                <span className="value">{tracking.carrierName}</span>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">🚗</span>
              <div className="info-content">
                <span className="label">차량번호</span>
                <span className="value">{tracking.vehicleNo}</span>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">👤</span>
              <div className="info-content">
                <span className="label">기사님</span>
                <span className="value">{tracking.driverName}</span>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">📞</span>
              <div className="info-content">
                <span className="label">연락처</span>
                <a href={`tel:${tracking.driverPhone}`} className="value phone">
                  {tracking.driverPhone}
                </a>
              </div>
            </div>
          </div>

          <div className="eta-box">
            <span className="eta-label">예상 도착시간</span>
            <span className="eta-time gradient-text">{tracking.etaAt}</span>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="glass-card order-summary">
        <h3>주문 정보</h3>
        <div className="summary-row">
          <span>고객명</span>
          <span>{tracking.customerName}</span>
        </div>
        <div className="summary-row">
          <span>배송일</span>
          <span>{tracking.shipDate}</span>
        </div>
      </div>

      <style>{`
        .tracking-container {
          max-width: 500px;
          width: 100%;
        }
        
        .tracking-card {
          padding: var(--space-8);
          text-align: center;
        }
        
        .status-card {
          padding: var(--space-6);
          text-align: center;
        }
        
        .status-icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
        }
        
        .status-card h2 {
          margin-bottom: var(--space-2);
        }
        
        .progress-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: var(--space-6);
        }
        
        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }
        
        .step-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-primary);
        }
        
        .step.active .step-dot {
          background: var(--color-primary);
          border-color: var(--color-primary);
          box-shadow: 0 0 10px var(--color-primary-glow);
        }
        
        .step span {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        .step.active span {
          color: var(--color-primary-light);
        }
        
        .step-line {
          width: 60px;
          height: 2px;
          background: var(--border-primary);
          margin: 0 var(--space-2);
          margin-bottom: var(--space-6);
        }
        
        .delivery-info {
          padding: var(--space-5);
        }
        
        .delivery-info h3 {
          margin-bottom: var(--space-4);
          font-size: var(--text-base);
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        
        .info-item {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        
        .info-icon {
          font-size: 1.5rem;
        }
        
        .info-content {
          display: flex;
          flex-direction: column;
        }
        
        .info-content .label {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        .info-content .value {
          font-weight: var(--font-medium);
        }
        
        .info-content .value.phone {
          color: var(--color-primary-light);
          text-decoration: none;
        }
        
        .eta-box {
          margin-top: var(--space-4);
          padding: var(--space-4);
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .eta-label {
          color: var(--text-secondary);
        }
        
        .eta-time {
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
        }
        
        .order-summary {
          padding: var(--space-5);
        }
        
        .order-summary h3 {
          margin-bottom: var(--space-4);
          font-size: var(--text-base);
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--border-secondary);
        }
        
        .summary-row:last-child {
          border-bottom: none;
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

        @media (max-width: 480px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
