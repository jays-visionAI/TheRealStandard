import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardListIcon, PencilIcon, FilePlusIcon, MapPinIcon, PhoneIcon, PackageIcon, TruckDeliveryIcon, FileTextIcon } from '../../components/Icons'
import { useOrderStore } from '../../stores/orderStore'
import './StepReview.css'
import type { ReactNode } from 'react'

// 단순화된 검토 스텝 (v1.0)
const REVIEW_STEPS: { id: number; label: string; icon: ReactNode }[] = [
    { id: 1, label: '주문 확인', icon: <ClipboardListIcon size={20} /> },
    { id: 2, label: '최종 확정 입력', icon: <PencilIcon size={20} /> },
    { id: 3, label: '고객 발송', icon: <FilePlusIcon size={20} /> },
]

// 차량 타입 목록 (선택만 - 추천 없음)
const vehicleTypes = [
    { id: 'v1', name: '1.8톤', capacity: 800 },
    { id: 'v2', name: '3.5톤', capacity: 1500 },
    { id: 'v3', name: '5톤', capacity: 2500 },
    { id: 'v4', name: '11톤', capacity: 5000 },
]

interface FinalizedItem {
    productName: string
    originalQty: number
    finalQty: number
    unit: string
    note: string
}

export default function StepReview() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getOrderSheetById, getOrderItems } = useOrderStore()
    const [currentStep, setCurrentStep] = useState(1)

    // 스토어에서 주문 데이터 가져오기
    const orderRecord = getOrderSheetById(id || '')
    const itemsRecord = getOrderItems(id || '')

    // 원본 주문 데이터 매핑
    const order = {
        id: orderRecord?.id || 'NO-DATA',
        customerName: orderRecord?.customerName || '알 수 없음',
        customerContact: '-', // 현재 Organization 정보가 필요함
        shipDate: orderRecord?.shipDate ? new Date(orderRecord.shipDate).toLocaleDateString('ko-KR') : '-',
        shipTo: orderRecord?.shipTo || '-',
        submittedAt: orderRecord?.lastSubmittedAt ? new Date(orderRecord.lastSubmittedAt).toLocaleString('ko-KR') : '-',
        items: itemsRecord.map(i => ({
            name: i.productName || '상품명 없음',
            qtyKg: i.estimatedKg,
            unitPrice: i.unitPrice
        })),
        totalKg: itemsRecord.reduce((sum, i) => sum + i.estimatedKg, 0),
    }

    // 최종 확정 입력 상태
    const [finalizedItems, setFinalizedItems] = useState<FinalizedItem[]>(
        order.items.map(item => ({
            productName: item.name,
            originalQty: item.qtyKg,
            finalQty: item.qtyKg,
            unit: 'kg',
            note: '',
        }))
    )
    const [finalEstimatedTotalKg, setFinalEstimatedTotalKg] = useState(order.totalKg)
    const [selectedVehicleType, setSelectedVehicleType] = useState('')
    const [dispatchInfo, setDispatchInfo] = useState({
        carrierName: '',
        vehicleNo: '',
        driverName: '',
        driverPhone: '',
        etaAt: '',
    })
    const [adminNote, setAdminNote] = useState('')

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const updateFinalQty = (index: number, qty: number) => {
        const updated = [...finalizedItems]
        updated[index].finalQty = qty
        setFinalizedItems(updated)
        // 총 중량 자동 계산 (참고값, 관리자가 수정 가능)
        const totalKg = updated.reduce((sum, item) => sum + item.finalQty, 0)
        setFinalEstimatedTotalKg(totalKg)
    }

    const updateItemNote = (index: number, note: string) => {
        const updated = [...finalizedItems]
        updated[index].note = note
        setFinalizedItems(updated)
    }

    const handleNext = () => {
        if (currentStep === 2) {
            // 필수 입력 검증
            if (!selectedVehicleType) {
                alert('차량 타입을 선택해주세요.')
                return
            }
        }
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleSendToCustomer = () => {
        const vehicleName = vehicleTypes.find(v => v.id === selectedVehicleType)?.name || ''

        const summary = `
📦 최종 확정 내용
━━━━━━━━━━━━━━━━━━
고객: ${order.customerName}
배송일: ${order.shipDate}

[품목]
${finalizedItems.map(item => `• ${item.productName}: ${item.finalQty}${item.unit}`).join('\n')}

[배송 정보]
총 예상 중량: ${finalEstimatedTotalKg}kg
차량: ${vehicleName}
${dispatchInfo.carrierName ? `배송업체: ${dispatchInfo.carrierName}` : ''}
${dispatchInfo.driverName ? `기사: ${dispatchInfo.driverName} (${dispatchInfo.driverPhone})` : ''}
${dispatchInfo.etaAt ? `도착예정: ${dispatchInfo.etaAt}` : ''}

${adminNote ? `[관리자 메모]\n${adminNote}` : ''}
    `.trim()

        if (confirm(`아래 내용으로 고객에게 최종안을 발송하시겠습니까?\n\n${summary}`)) {
            alert('✅ 최종안이 고객에게 발송되었습니다!\n\n고객 확인 대기 상태로 변경됩니다.')
            navigate('/admin/workflow')
        }
    }

    return (
        <div className="step-review">
            {/* Header */}
            <header className="review-header glass-card">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/admin/workflow')}>
                        ← 워크플로우
                    </button>
                    <span className="badge badge-warning">검토/확정</span>
                </div>

                <div className="header-main">
                    <div className="order-info">
                        <h1>{order.customerName}</h1>
                        <span className="order-id">{order.id} · 제출: {order.submittedAt}</span>
                    </div>
                    <div className="order-summary">
                        <div className="summary-item">
                            <span className="label">요청 중량</span>
                            <span className="value">{order.totalKg}kg</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">배송일</span>
                            <span className="value">{order.shipDate}</span>
                        </div>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    {REVIEW_STEPS.map((step, index) => (
                        <div key={step.id} className="step-wrapper">
                            <div
                                className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                                onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                            >
                                <div className="step-circle">
                                    {currentStep > step.id ? '✓' : step.icon}
                                </div>
                                <span className="step-label">{step.label}</span>
                            </div>
                            {index < REVIEW_STEPS.length - 1 && (
                                <div className={`step-connector ${currentStep > step.id ? 'completed' : ''}`} />
                            )}
                        </div>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="review-content">
                {/* Step 1: 주문 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 고객 주문 확인</h2>
                        <p className="section-desc">고객이 제출한 주문 내용을 확인합니다.</p>

                        <div className="items-table">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>품목명</th>
                                        <th className="text-right">요청 중량</th>
                                        <th className="text-right">단가</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="font-medium">{item.name}</td>
                                            <td className="text-right">{item.qtyKg} kg</td>
                                            <td className="text-right">{formatCurrency(item.unitPrice)}/kg</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td className="font-bold">합계</td>
                                        <td className="text-right font-bold">{order.totalKg} kg</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="delivery-info">
                            <div className="info-row">
                                <span className="info-label"><MapPinIcon size={16} /> 배송지</span>
                                <span className="info-value">{order.shipTo}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label"><PhoneIcon size={16} /> 연락처</span>
                                <span className="info-value">{order.customerContact}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Step 2: 최종 확정 입력 (Manual Finalization) */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><PencilIcon size={20} /> 최종 확정 입력</h2>
                        <p className="section-desc">고객과 협의한 최종 수량과 배송 정보를 입력합니다.</p>

                        {/* 품목별 최종 수량 */}
                        <div className="finalization-section">
                            <h3><PackageIcon size={18} /> 품목별 최종 수량</h3>
                            <div className="final-items-list">
                                {finalizedItems.map((item, idx) => (
                                    <div key={idx} className="final-item-row">
                                        <div className="item-info">
                                            <span className="item-name">{item.productName}</span>
                                            <span className="original-qty">요청: {item.originalQty}{item.unit}</span>
                                        </div>
                                        <div className="item-inputs">
                                            <div className="qty-input-group">
                                                <label>최종 수량</label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    value={item.finalQty}
                                                    onChange={(e) => updateFinalQty(idx, parseInt(e.target.value) || 0)}
                                                />
                                                <span className="unit">{item.unit}</span>
                                            </div>
                                            <input
                                                type="text"
                                                className="input note-input"
                                                placeholder="비고 (선택)"
                                                value={item.note}
                                                onChange={(e) => updateItemNote(idx, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 최종 예상 총중량 */}
                        <div className="finalization-section">
                            <h3>⚖️ 최종 예상 총중량</h3>
                            <div className="weight-input-group">
                                <input
                                    type="number"
                                    className="input weight-input"
                                    value={finalEstimatedTotalKg}
                                    onChange={(e) => setFinalEstimatedTotalKg(parseInt(e.target.value) || 0)}
                                />
                                <span className="unit">kg</span>
                                <span className="calc-note">
                                    (자동 계산: {finalizedItems.reduce((sum, i) => sum + i.finalQty, 0)}kg)
                                </span>
                            </div>
                        </div>

                        {/* 차량 선택 (추천 없음, 선택만) */}
                        <div className="finalization-section">
                            <h3><TruckDeliveryIcon size={18} /> 차량 타입 선택</h3>
                            <div className="vehicle-select-grid">
                                {vehicleTypes.map(vt => (
                                    <div
                                        key={vt.id}
                                        className={`vehicle-option ${selectedVehicleType === vt.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedVehicleType(vt.id)}
                                    >
                                        <span className="vehicle-name">{vt.name}</span>
                                        <span className="vehicle-capacity">최대 {vt.capacity}kg</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 배차 정보 */}
                        <div className="finalization-section">
                            <h3><FileTextIcon size={18} /> 배차 정보 (선택)</h3>
                            <p className="section-hint">배차가 확정되지 않았으면 비워둬도 됩니다.</p>
                            <div className="dispatch-inputs">
                                <div className="input-group">
                                    <label>배송업체명</label>
                                    <input
                                        className="input"
                                        placeholder="예: 한국물류"
                                        value={dispatchInfo.carrierName}
                                        onChange={(e) => setDispatchInfo({ ...dispatchInfo, carrierName: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>차량번호</label>
                                    <input
                                        className="input"
                                        placeholder="예: 서울12가3456"
                                        value={dispatchInfo.vehicleNo}
                                        onChange={(e) => setDispatchInfo({ ...dispatchInfo, vehicleNo: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>기사명</label>
                                    <input
                                        className="input"
                                        placeholder="예: 김기사"
                                        value={dispatchInfo.driverName}
                                        onChange={(e) => setDispatchInfo({ ...dispatchInfo, driverName: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>기사 휴대폰</label>
                                    <input
                                        className="input"
                                        placeholder="예: 010-1234-5678"
                                        value={dispatchInfo.driverPhone}
                                        onChange={(e) => setDispatchInfo({ ...dispatchInfo, driverPhone: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>도착예정시간 (ETA)</label>
                                    <input
                                        className="input"
                                        type="time"
                                        value={dispatchInfo.etaAt}
                                        onChange={(e) => setDispatchInfo({ ...dispatchInfo, etaAt: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 고객 전달 메모 */}
                        <div className="finalization-section">
                            <h3>💬 고객 전달 메모</h3>
                            <textarea
                                className="input textarea"
                                placeholder="협의사항, 변경사유, 특이사항 등을 입력하세요..."
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </section>
                )}

                {/* Step 3: 고객 발송 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>📤 최종안 발송</h2>
                        <p className="section-desc">아래 내용으로 고객에게 최종안을 발송합니다.</p>

                        <div className="final-summary-card">
                            <div className="summary-header">
                                <span className="customer-name">{order.customerName}</span>
                                <span className="order-id">{order.id}</span>
                            </div>

                            <div className="summary-section">
                                <h4><PackageIcon size={16} /> 확정 품목</h4>
                                {finalizedItems.map((item, idx) => (
                                    <div key={idx} className="summary-item-row">
                                        <span>{item.productName}</span>
                                        <span className="qty">
                                            {item.finalQty}{item.unit}
                                            {item.originalQty !== item.finalQty && (
                                                <span className="changed">(요청: {item.originalQty})</span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="summary-section">
                                <h4><TruckDeliveryIcon size={16} /> 배송 정보</h4>
                                <div className="summary-row">
                                    <span>총 예상 중량</span>
                                    <span className="value-highlight">{finalEstimatedTotalKg}kg</span>
                                </div>
                                <div className="summary-row">
                                    <span>차량</span>
                                    <span>{vehicleTypes.find(v => v.id === selectedVehicleType)?.name || '-'}</span>
                                </div>
                                {dispatchInfo.carrierName && (
                                    <div className="summary-row">
                                        <span>배송업체</span>
                                        <span>{dispatchInfo.carrierName}</span>
                                    </div>
                                )}
                                {dispatchInfo.driverName && (
                                    <div className="summary-row">
                                        <span>기사</span>
                                        <span>{dispatchInfo.driverName} ({dispatchInfo.driverPhone})</span>
                                    </div>
                                )}
                                {dispatchInfo.etaAt && (
                                    <div className="summary-row">
                                        <span>도착예정</span>
                                        <span>{dispatchInfo.etaAt}</span>
                                    </div>
                                )}
                            </div>

                            {adminNote && (
                                <div className="summary-section">
                                    <h4>💬 전달 메모</h4>
                                    <p className="admin-note">{adminNote}</p>
                                </div>
                            )}
                        </div>

                        <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleSendToCustomer}>
                            <FilePlusIcon size={18} /> 고객에게 최종안 발송하기
                        </button>
                        <p className="send-hint">고객은 링크를 통해 확인 후 컨펌 또는 수정 요청을 할 수 있습니다.</p>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="review-footer glass-card">
                <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                >
                    ← 이전
                </button>
                <div className="step-progress">Step {currentStep} / 3</div>
                {currentStep < 3 && (
                    <button className="btn btn-primary" onClick={handleNext}>
                        다음 →
                    </button>
                )}
                {currentStep === 3 && <div style={{ width: 80 }} />}
            </footer>
        </div>
    )
}
