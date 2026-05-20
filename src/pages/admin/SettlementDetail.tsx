import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    getSettlementById,
    recordPayment,
    type FirestoreSettlement,
    type PaymentMethod,
} from '../../lib/settlementService'
import { ChevronLeftIcon, WalletIcon, CheckCircleIcon, AlertTriangleIcon, FileTextIcon } from '../../components/Icons'
import { generateOutboundStatementPDF, triggerPdfDownload } from '../../lib/pdfService'
import { getSalesOrderById, getSalesOrderItems } from '../../lib/orderService'
import './SettlementDetail.css'

export default function SettlementDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [settlement, setSettlement] = useState<FirestoreSettlement | null>(null)
    const [loading, setLoading] = useState(true)

    const [payAmount, setPayAmount] = useState('')
    const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER')
    const [payMemo, setPayMemo] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const load = async () => {
        if (!id) return
        try {
            setLoading(true)
            const data = await getSettlementById(id)
            setSettlement(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [id])

    const handlePaymentSubmit = async () => {
        if (!settlement || !user) return
        const amount = parseInt(payAmount.replace(/,/g, ''))
        if (!amount || amount <= 0) {
            setMessage('올바른 금액을 입력해주세요.')
            return
        }
        try {
            setSubmitting(true)
            await recordPayment(settlement.id, {
                amount,
                method: payMethod,
                memo: payMemo || undefined,
                recordedBy: user.id,
            })
            setMessage(`${amount.toLocaleString()}원 수금 처리 완료`)
            setPayAmount('')
            setPayMemo('')
            await load()
        } catch (err) {
            setMessage('수금 처리 중 오류가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDownloadStatement = async () => {
        if (!settlement || !user) return
        try {
            const so = await getSalesOrderById(settlement.salesOrderId)
            if (!so) return
            const soItems = await getSalesOrderItems(settlement.salesOrderId)

            const { blob } = await generateOutboundStatementPDF({
                salesOrder: so,
                items: soItems,
                settlement,
                uploadedBy: user.id,
                uploadToStorage: true,
            })
            triggerPdfDownload(blob, `outbound_${so.id}.pdf`)
        } catch (err) {
            console.error(err)
            alert('명세서 생성 중 오류가 발생했습니다.')
        }
    }

    if (loading) return <div className="settlement-detail"><div className="loading-state"><div className="spinner" /></div></div>
    if (!settlement) return <div className="settlement-detail"><p>정산 정보를 찾을 수 없습니다.</p></div>

    const diff = settlement.estimatedAmount - settlement.finalAmount
    const methodLabel: Record<string, string> = { BANK_TRANSFER: '계좌이체', CASH: '현금', CARD: '카드', OTHER: '기타' }

    return (
        <div className="settlement-detail">
            <div className="page-header">
                <button className="btn btn-ghost" onClick={() => navigate('/admin/settlement')}>
                    <ChevronLeftIcon size={16} /> 정산 목록
                </button>
                <h1><WalletIcon size={20} /> 정산 상세</h1>
            </div>

            <div className="detail-card">
                <h2>정산 정보</h2>
                <div className="info-grid">
                    <div className="info-row"><span className="label">고객사</span><span className="value">{settlement.customerName}</span></div>
                    <div className="info-row"><span className="label">SalesOrder ID</span><span className="value mono">{settlement.salesOrderId}</span></div>
                    <div className="info-row"><span className="label">출고일</span><span className="value">{settlement.shippedAt?.toDate().toLocaleDateString('ko-KR')}</span></div>
                    <div className="info-row"><span className="label">결제기한</span><span className="value">{settlement.paymentDueAt?.toDate().toLocaleDateString('ko-KR')}</span></div>
                </div>
                <button className="btn btn-secondary" onClick={handleDownloadStatement} style={{ marginTop: '12px' }}>
                    <FileTextIcon size={14} /> 출고 명세서 PDF 다운로드
                </button>
            </div>

            <div className="detail-card">
                <h2>금액 비교</h2>
                <div className="amount-compare">
                    <div className="amount-box"><span className="amount-label">예상 중량</span><span className="amount-value">{settlement.estimatedWeightKg.toFixed(1)} kg</span></div>
                    <div className="amount-box highlight"><span className="amount-label">확정 중량</span><span className="amount-value">{settlement.finalWeightKg.toFixed(1)} kg</span></div>
                    <div className="amount-box"><span className="amount-label">예상 금액</span><span className="amount-value">{settlement.estimatedAmount.toLocaleString()} 원</span></div>
                    <div className="amount-box highlight"><span className="amount-label">확정 금액</span><span className="amount-value">{settlement.finalAmount.toLocaleString()} 원</span></div>
                </div>
                {diff > 0 && (
                    <div className="refund-notice">
                        <p><CheckCircleIcon size={14} /> 선정산 초과: {diff.toLocaleString()}원</p>
                        <p>마일리지 {(settlement.milestonePoints || 0).toLocaleString()}P 적립 ({settlement.milestoneMultiplier || 1}배 적용)</p>
                    </div>
                )}
                {diff < 0 && (
                    <div className="additional-notice">
                        <p><AlertTriangleIcon size={14} /> 추가 청구 금액: {Math.abs(diff).toLocaleString()}원</p>
                    </div>
                )}
            </div>

            <div className="detail-card">
                <h2>수금 현황</h2>
                <div className="payment-summary">
                    <div className="pay-row"><span>확정 금액</span><span>{settlement.finalAmount.toLocaleString()}원</span></div>
                    <div className="pay-row"><span>수금액</span><span className="text-success">{settlement.paidAmount.toLocaleString()}원</span></div>
                    <div className="pay-row total">
                        <span>미수 잔액</span>
                        <span className={settlement.remainingAmount > 0 ? 'text-danger' : 'text-success'}>{settlement.remainingAmount.toLocaleString()}원</span>
                    </div>
                </div>

                {settlement.paymentHistory?.length > 0 && (
                    <div className="payment-history">
                        <h3>수금 이력</h3>
                        {settlement.paymentHistory.map((p, i) => (
                            <div key={i} className="history-row">
                                <span>{p.paidAt?.toDate().toLocaleDateString('ko-KR')}</span>
                                <span>{methodLabel[p.method] || p.method}</span>
                                <span className="text-success">+{p.amount.toLocaleString()}원</span>
                                {p.memo && <span className="memo">{p.memo}</span>}
                            </div>
                        ))}
                    </div>
                )}

                {settlement.status !== 'PAID' && (
                    <div className="payment-form">
                        <h3>수금 입력</h3>
                        <div className="form-row">
                            <input type="text" className="input" placeholder="수금액 (원)" value={payAmount}
                                onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setPayAmount(v ? parseInt(v).toLocaleString() : '') }} />
                            <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)}>
                                <option value="BANK_TRANSFER">계좌이체</option>
                                <option value="CASH">현금</option>
                                <option value="CARD">카드</option>
                                <option value="OTHER">기타</option>
                            </select>
                        </div>
                        <input type="text" className="input" placeholder="메모 (선택)" value={payMemo} onChange={e => setPayMemo(e.target.value)} style={{ marginBottom: '8px' }} />
                        {message && <p className="form-message">{message}</p>}
                        <button className="btn btn-primary" onClick={handlePaymentSubmit} disabled={submitting}>
                            {submitting ? '처리 중...' : '수금 처리'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
