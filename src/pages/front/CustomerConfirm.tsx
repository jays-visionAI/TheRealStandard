import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircleIcon, PackageIcon, TruckDeliveryIcon, FileTextIcon } from '../../components/Icons'
import './CustomerConfirm.css'

export default function CustomerConfirm() {
    // token은 향후 API 연동 시 사용 예정
    useParams()
    const [revisionComment, setRevisionComment] = useState('')
    const [showRevisionForm, setShowRevisionForm] = useState(false)

    // Mock 최종안 데이터 (관리자가 확정한 내용)
    const finalizedOrder = {
        id: 'OS-2024-003',
        customerName: '태윤유통',
        shipDate: '2024-01-16',
        shipTo: '서울시 강남구 역삼동 123-45',
        finalizedAt: '2024-01-15 16:30',
        items: [
            { name: '한우 등심 1++', originalQty: 50, finalQty: 50, unit: 'kg' },
            { name: '한우 안심 1++', originalQty: 30, finalQty: 28, unit: 'kg', note: '재고 부족으로 2kg 조정' },
            { name: '한우 채끝 1+', originalQty: 25, finalQty: 25, unit: 'kg' },
        ],
        finalEstimatedTotalKg: 103,
        vehicleType: '3.5톤',
        dispatchInfo: {
            carrierName: '한국물류',
            driverName: '김기사',
            driverPhone: '010-1234-5678',
            etaAt: '14:00',
        },
        adminNote: '안심 2kg 재고 부족으로 조정되었습니다. 양해 부탁드립니다.',
        status: 'ADMIN_FINALIZED', // ADMIN_FINALIZED, CUSTOMER_CONFIRMED, REVISION_REQUESTED
    }

    const handleConfirm = () => {
        if (confirm('위 내용으로 확정하시겠습니까?\n\n확정 후 배송이 진행됩니다.')) {
            alert('✅ 주문이 확정되었습니다!\n\n배송 준비가 시작됩니다.')
            // 실제로는 Firestore 업데이트
        }
    }

    const handleRevisionRequest = () => {
        if (!revisionComment.trim()) {
            alert('수정 요청 내용을 입력해주세요.')
            return
        }
        if (confirm(`수정 요청을 전송하시겠습니까?\n\n내용: ${revisionComment}`)) {
            alert('📝 수정 요청이 전송되었습니다.\n\n담당자가 확인 후 연락드리겠습니다.')
            setShowRevisionForm(false)
            setRevisionComment('')
        }
    }

    const isConfirmed = finalizedOrder.status === 'CUSTOMER_CONFIRMED'

    return (
        <div className="customer-confirm">
            {/* Header */}
            <header className="confirm-header">
                <div className="header-logo">TRS 주문시스템</div>
                <div className="header-info">
                    <h1>{finalizedOrder.customerName}님</h1>
                    <p>최종 확정안을 확인해주세요</p>
                </div>
            </header>

            {/* Status Banner */}
            {isConfirmed ? (
                <div className="status-banner confirmed">
                    <span className="status-icon"><CheckCircleIcon size={24} /></span>
                    <span>이미 확정되었습니다</span>
                </div>
            ) : (
                <div className="status-banner pending">
                    <span className="status-icon">⏳</span>
                    <span>확인 대기 중</span>
                </div>
            )}

            {/* Main Content */}
            <main className="confirm-content">
                {/* Order Summary Card */}
                <section className="order-card glass-card">
                    <div className="card-header">
                        <span className="order-id">{finalizedOrder.id}</span>
                        <span className="finalized-at">확정: {finalizedOrder.finalizedAt}</span>
                    </div>

                    {/* Items */}
                    <div className="card-section">
                        <h3><PackageIcon size={20} /> 확정 품목</h3>
                        <div className="items-list">
                            {finalizedOrder.items.map((item, idx) => (
                                <div key={idx} className="item-row">
                                    <div className="item-name">{item.name}</div>
                                    <div className="item-qty">
                                        <span className="final-qty">{item.finalQty}{item.unit}</span>
                                        {item.originalQty !== item.finalQty && (
                                            <span className="original-qty">(요청: {item.originalQty})</span>
                                        )}
                                    </div>
                                    {item.note && <div className="item-note">{item.note}</div>}
                                </div>
                            ))}
                        </div>
                        <div className="items-total">
                            <span>총 예상 중량</span>
                            <span className="total-kg">{finalizedOrder.finalEstimatedTotalKg}kg</span>
                        </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="card-section">
                        <h3><TruckDeliveryIcon size={20} /> 배송 정보</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">배송일</span>
                                <span className="info-value">{finalizedOrder.shipDate}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">배송지</span>
                                <span className="info-value">{finalizedOrder.shipTo}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">차량</span>
                                <span className="info-value">{finalizedOrder.vehicleType}</span>
                            </div>
                        </div>
                    </div>

                    {/* Dispatch Info (배송중일 때 표시) */}
                    {finalizedOrder.dispatchInfo.carrierName && (
                        <div className="card-section dispatch-section">
                            <h3>🚚 배차 정보</h3>
                            <div className="dispatch-info">
                                <div className="dispatch-row">
                                    <span>배송업체</span>
                                    <span>{finalizedOrder.dispatchInfo.carrierName}</span>
                                </div>
                                <div className="dispatch-row">
                                    <span>기사</span>
                                    <span>{finalizedOrder.dispatchInfo.driverName}</span>
                                </div>
                                <div className="dispatch-row">
                                    <span>연락처</span>
                                    <a href={`tel:${finalizedOrder.dispatchInfo.driverPhone}`} className="phone-link">
                                        {finalizedOrder.dispatchInfo.driverPhone}
                                    </a>
                                </div>
                                {finalizedOrder.dispatchInfo.etaAt && (
                                    <div className="dispatch-row">
                                        <span>도착예정</span>
                                        <span className="eta">{finalizedOrder.dispatchInfo.etaAt}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Admin Note */}
                    {finalizedOrder.adminNote && (
                        <div className="card-section note-section">
                            <h3>💬 담당자 메모</h3>
                            <p className="admin-note">{finalizedOrder.adminNote}</p>
                        </div>
                    )}
                </section>

                {/* Action Buttons */}
                {!isConfirmed && (
                    <section className="action-section">
                        {!showRevisionForm ? (
                            <>
                                <button className="btn btn-primary btn-lg w-full" onClick={handleConfirm}>
                                    <CheckCircleIcon size={18} /> 확정하기
                                </button>
                                <button
                                    className="btn btn-ghost w-full mt-3"
                                    onClick={() => setShowRevisionForm(true)}
                                >
                                    <FileTextIcon size={18} /> 수정 요청하기
                                </button>
                            </>
                        ) : (
                            <div className="revision-form glass-card">
                                <h3><FileTextIcon size={18} /> 수정 요청</h3>
                                <p>수정이 필요한 내용을 입력해주세요.</p>
                                <textarea
                                    className="input textarea"
                                    placeholder="예: 한우 안심 30kg으로 유지 부탁드립니다."
                                    value={revisionComment}
                                    onChange={(e) => setRevisionComment(e.target.value)}
                                    rows={4}
                                />
                                <div className="revision-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setShowRevisionForm(false)}
                                    >
                                        취소
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleRevisionRequest}
                                    >
                                        수정 요청 전송
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="confirm-footer">
                <p>문의: 02-1234-5678 | help@trs.co.kr</p>
                <p className="copyright">© 2024 TRS Solution</p>
            </footer>
        </div>
    )
}
