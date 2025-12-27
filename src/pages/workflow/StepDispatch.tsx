import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardListIcon, TruckDeliveryIcon, UserIcon, CheckCircleIcon, MapPinIcon } from '../../components/Icons'
import { useOrderStore } from '../../stores/orderStore'
import './StepDispatch.css'
import type { ReactNode } from 'react'

// 배차 프로세스의 단계
const DISPATCH_STEPS: { id: number; label: string; icon: ReactNode }[] = [
    { id: 1, label: '주문 확인', icon: <ClipboardListIcon size={20} /> },
    { id: 2, label: '차량 선택', icon: <TruckDeliveryIcon size={20} /> },
    { id: 3, label: '기사 배정', icon: <UserIcon size={20} /> },
    { id: 4, label: '배차 완료', icon: <CheckCircleIcon size={20} /> },
]

interface VehicleType {
    id: string
    name: string
    capacityKg: number
    available: number
}

const vehicleTypes: VehicleType[] = [
    { id: 'v1', name: '1.8톤', capacityKg: 1800, available: 3 },
    { id: 'v2', name: '3.5톤', capacityKg: 3500, available: 2 },
    { id: 'v3', name: '5톤', capacityKg: 5000, available: 1 },
    { id: 'v4', name: '11톤', capacityKg: 11000, available: 1 },
]

const drivers = [
    { id: 'd1', name: '김기사', phone: '010-1234-5678', vehicleNo: '서울12가3456' },
    { id: 'd2', name: '이기사', phone: '010-2345-6789', vehicleNo: '경기34나7890' },
    { id: 'd3', name: '박기사', phone: '010-3456-7890', vehicleNo: '서울56다1234' },
]

export default function StepDispatch() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getSalesOrderById, getSalesOrderItems } = useOrderStore()
    const [currentStep, setCurrentStep] = useState(1)
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
    const [carrierName, setCarrierName] = useState('한국물류')
    const [etaTime, setEtaTime] = useState('14:00')

    // 스토어에서 데이터 가져오기
    const salesOrder = getSalesOrderById(id || '')
    const salesOrderItems = getSalesOrderItems(id || '')

    const order = {
        id: salesOrder?.id || 'NO-DATA',
        customerName: salesOrder?.customerName || '알 수 없음',
        shipDate: salesOrder?.confirmedAt ? new Date(salesOrder.confirmedAt).toLocaleDateString('ko-KR') : '-',
        shipTo: '-', // 실제로는 Organization 정보에서 가져와야 함
        totalKg: salesOrder?.totalsKg || 0,
        items: salesOrderItems.map(i => ({
            name: i.productName || '상품명 없음',
            kg: i.qtyKg
        }))
    }

    const recommendedVehicle = vehicleTypes.find(v => v.capacityKg >= order.totalKg) || vehicleTypes[vehicleTypes.length - 1]

    const handleNext = () => {
        if (currentStep === 2 && !selectedVehicle) {
            alert('차량을 선택해주세요.')
            return
        }
        if (currentStep === 3 && !selectedDriver) {
            alert('기사를 배정해주세요.')
            return
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleComplete = () => {
        const driver = drivers.find(d => d.id === selectedDriver)
        const vehicle = vehicleTypes.find(v => v.id === selectedVehicle)

        alert(`✅ 배차가 완료되었습니다!\n\n차량: ${vehicle?.name}\n기사: ${driver?.name}\n차량번호: ${driver?.vehicleNo}\n도착예정: ${etaTime}`)
        navigate('/admin/workflow')
    }

    return (
        <div className="step-dispatch">
            {/* Header */}
            <header className="dispatch-header glass-card">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/admin/workflow')}>
                        ← 워크플로우
                    </button>
                    <span className="badge badge-warning">배차 필요</span>
                </div>

                <div className="header-main">
                    <div className="order-info">
                        <h1><TruckDeliveryIcon size={24} /> 배차 입력</h1>
                        <div className="order-meta">
                            <span className="customer-name">{order.customerName}</span>
                            <span className="order-id">{order.id}</span>
                        </div>
                    </div>
                    <div className="order-weight">
                        <span className="weight-value">{order.totalKg}</span>
                        <span className="weight-unit">kg</span>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    {DISPATCH_STEPS.map((step, index) => (
                        <div key={step.id} className="step-wrapper">
                            <div className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                                <div className="step-circle">
                                    {currentStep > step.id ? '✓' : step.icon}
                                </div>
                                <span className="step-label">{step.label}</span>
                            </div>
                            {index < DISPATCH_STEPS.length - 1 && (
                                <div className={`step-connector ${currentStep > step.id ? 'completed' : ''}`} />
                            )}
                        </div>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="dispatch-content">
                {/* Step 1: 주문 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 주문 내용 확인</h2>
                        <p className="section-desc">배송할 주문의 상세 내용을 확인합니다.</p>

                        <div className="info-cards">
                            <div className="info-card">
                                <span className="info-icon">📅</span>
                                <div className="info-content">
                                    <span className="info-label">배송일</span>
                                    <span className="info-value">{order.shipDate}</span>
                                </div>
                            </div>
                            <div className="info-card">
                                <span className="info-icon"><MapPinIcon size={16} /></span>
                                <div className="info-content">
                                    <span className="info-label">배송지</span>
                                    <span className="info-value">{order.shipTo}</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="mt-6 mb-3">배송 품목</h3>
                        <div className="item-list">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="item-row">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-kg">{item.kg} kg</span>
                                </div>
                            ))}
                            <div className="item-row total">
                                <span className="item-name">총 중량</span>
                                <span className="item-kg">{order.totalKg} kg</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Step 2: 차량 선택 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><TruckDeliveryIcon size={20} /> 차량 선택</h2>
                        <p className="section-desc">
                            총 <strong>{order.totalKg}kg</strong>을 운송할 차량을 선택하세요.
                            <span className="recommend-text">추천: {recommendedVehicle.name}</span>
                        </p>

                        <div className="vehicle-grid">
                            {vehicleTypes.map(vehicle => {
                                const isRecommended = vehicle.id === recommendedVehicle.id
                                const isSelected = selectedVehicle === vehicle.id
                                const isUnderCapacity = vehicle.capacityKg < order.totalKg

                                return (
                                    <div
                                        key={vehicle.id}
                                        className={`vehicle-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''} ${isUnderCapacity ? 'under-capacity' : ''}`}
                                        onClick={() => !isUnderCapacity && setSelectedVehicle(vehicle.id)}
                                    >
                                        {isRecommended && <span className="recommend-badge">추천</span>}
                                        <div className="vehicle-icon"><TruckDeliveryIcon size={32} /></div>
                                        <div className="vehicle-name">{vehicle.name}</div>
                                        <div className="vehicle-capacity">{vehicle.capacityKg.toLocaleString()} kg</div>
                                        <div className="vehicle-available">가용: {vehicle.available}대</div>
                                        {isUnderCapacity && <div className="capacity-warning">용량 부족</div>}
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Step 3: 기사 배정 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><UserIcon size={20} /> 기사 배정</h2>
                        <p className="section-desc">배송을 담당할 기사를 배정합니다.</p>

                        <div className="form-group mb-4">
                            <label className="label">배송업체</label>
                            <input
                                type="text"
                                className="input"
                                value={carrierName}
                                onChange={(e) => setCarrierName(e.target.value)}
                            />
                        </div>

                        <h3 className="mb-3">기사 선택</h3>
                        <div className="driver-list">
                            {drivers.map(driver => (
                                <div
                                    key={driver.id}
                                    className={`driver-card ${selectedDriver === driver.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedDriver(driver.id)}
                                >
                                    <div className="driver-avatar">
                                        {driver.name.charAt(0)}
                                    </div>
                                    <div className="driver-info">
                                        <span className="driver-name">{driver.name}</span>
                                        <span className="driver-phone">{driver.phone}</span>
                                        <span className="driver-vehicle">{driver.vehicleNo}</span>
                                    </div>
                                    {selectedDriver === driver.id && (
                                        <div className="selected-check">✓</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="form-group mt-6">
                            <label className="label">예상 도착 시간</label>
                            <input
                                type="time"
                                className="input"
                                value={etaTime}
                                onChange={(e) => setEtaTime(e.target.value)}
                            />
                        </div>
                    </section>
                )}

                {/* Step 4: 배차 완료 */}
                {currentStep === 4 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><CheckCircleIcon size={20} /> 배차 정보 확인</h2>
                        <p className="section-desc">아래 내용으로 배차를 완료합니다.</p>

                        <div className="summary-card">
                            <div className="summary-row">
                                <span className="summary-label">고객</span>
                                <span className="summary-value">{order.customerName}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">차량</span>
                                <span className="summary-value">{vehicleTypes.find(v => v.id === selectedVehicle)?.name}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">기사</span>
                                <span className="summary-value">{drivers.find(d => d.id === selectedDriver)?.name}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">차량번호</span>
                                <span className="summary-value">{drivers.find(d => d.id === selectedDriver)?.vehicleNo}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">연락처</span>
                                <span className="summary-value">{drivers.find(d => d.id === selectedDriver)?.phone}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">도착예정</span>
                                <span className="summary-value highlight">{etaTime}</span>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleComplete}>
                            <TruckDeliveryIcon size={18} /> 배차 완료하기
                        </button>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="dispatch-footer glass-card">
                <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                >
                    ← 이전
                </button>
                <div className="step-progress">Step {currentStep} / 4</div>
                {currentStep < 4 && (
                    <button className="btn btn-primary" onClick={handleNext}>
                        다음 →
                    </button>
                )}
                {currentStep === 4 && <div style={{ width: 80 }} />}
            </footer>
        </div>
    )
}
