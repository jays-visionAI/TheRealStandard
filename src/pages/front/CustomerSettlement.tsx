import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getSettlementsByCustomer, type FirestoreSettlement } from '../../lib/settlementService'
import { WalletIcon, AlertTriangleIcon, CheckCircleIcon } from '../../components/Icons'
import './CustomerSettlement.css'

export default function CustomerSettlement() {
    const { user } = useAuth()
    const [settlements, setSettlements] = useState<FirestoreSettlement[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            if (!user?.id) return
            try {
                const data = await getSettlementsByCustomer(user.id)
                setSettlements(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    const statusLabel: Record<string, string> = {
        PENDING: '결제 대기', PARTIAL: '일부 납부', PAID: '납부 완료', OVERDUE: '기한 초과',
    }
    const statusColor: Record<string, string> = {
        PENDING: '#F59E0B', PARTIAL: '#6366F1', PAID: '#059669', OVERDUE: '#DC2626',
    }

    const totalRemaining = settlements
        .filter(s => s.status !== 'PAID')
        .reduce((sum, s) => sum + s.remainingAmount, 0)

    if (loading) return (
        <div className="customer-settlement">
            <div className="loading-state"><div className="spinner" /><p>정산 내역 로딩 중...</p></div>
        </div>
    )

    return (
        <div className="customer-settlement">
            <h1><WalletIcon size={20} /> 정산 내역</h1>

            {totalRemaining > 0 && (
                <div className="remaining-banner">
                    <span><AlertTriangleIcon size={16} /> 미납 잔액</span>
                    <span className="remaining-amount">{totalRemaining.toLocaleString()}원</span>
                </div>
            )}

            {settlements.length === 0 ? (
                <div className="empty-state"><p>정산 내역이 없습니다.</p></div>
            ) : (
                <div className="settlement-cards">
                    {settlements.map(s => (
                        <div key={s.id} className={`settlement-card ${s.status.toLowerCase()}`}>
                            <div className="card-header">
                                <span className="order-id">주문 #{s.salesOrderId.slice(-6)}</span>
                                <span className="status-tag" style={{ color: statusColor[s.status] }}>{statusLabel[s.status]}</span>
                            </div>
                            <div className="card-body">
                                <div className="amount-row">
                                    <span className="amount-label">확정 금액</span>
                                    <span className="amount-value">{s.finalAmount.toLocaleString()}원</span>
                                </div>
                                <div className="amount-row">
                                    <span className="amount-label">납부액</span>
                                    <span>{s.paidAmount.toLocaleString()}원</span>
                                </div>
                                {s.remainingAmount > 0 && (
                                    <div className="amount-row remaining">
                                        <span className="amount-label">미납 잔액</span>
                                        <span className="text-danger">{s.remainingAmount.toLocaleString()}원</span>
                                    </div>
                                )}
                                {s.refundAmount && s.refundAmount > 0 && (
                                    <div className="refund-info">
                                        <CheckCircleIcon size={12} /> 선정산 초과 {s.refundAmount.toLocaleString()}원 -
                                        마일리지 {(s.milestonePoints || 0).toLocaleString()}P 적립
                                    </div>
                                )}
                            </div>
                            <div className="card-footer">
                                <span>결제 기한: {s.paymentDueAt?.toDate().toLocaleDateString('ko-KR')}</span>
                                <span>출고일: {s.shippedAt?.toDate().toLocaleDateString('ko-KR')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
