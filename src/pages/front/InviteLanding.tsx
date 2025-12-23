import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function InviteLanding() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [valid, setValid] = useState(false)
    const [orderInfo, setOrderInfo] = useState<any>(null)

    useEffect(() => {
        // Simulate token validation
        setTimeout(() => {
            if (token) {
                setValid(true)
                setOrderInfo({
                    id: 'OS-2024-001',
                    customerName: '한우명가',
                    shipDate: '2024-01-16',
                    cutOffAt: '2024-01-15 18:00',
                    status: 'SENT',
                })
            }
            setLoading(false)
        }, 1000)
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

    if (!valid) {
        return (
            <div className="invite-container">
                <div className="glass-card invite-card error">
                    <div className="icon">❌</div>
                    <h2>유효하지 않은 링크</h2>
                    <p>이 링크는 만료되었거나 유효하지 않습니다.</p>
                    <p className="text-sm">담당자에게 문의해주세요.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="invite-container">
            <div className="glass-card invite-card">
                <div className="icon">📋</div>
                <h2 className="gradient-text">주문장 초대</h2>
                <p className="customer-name">{orderInfo.customerName}님</p>

                <div className="order-info">
                    <div className="info-row">
                        <span className="label">주문번호</span>
                        <span className="value">{orderInfo.id}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">배송예정일</span>
                        <span className="value">{orderInfo.shipDate}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">주문마감</span>
                        <span className="value highlight">{orderInfo.cutOffAt}</span>
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
