import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TruckDeliveryIcon, PhoneIcon, SearchIcon, CheckCircleIcon, ClipboardListIcon, AlertTriangleIcon } from '../../components/Icons'
import './WarehouseReceive.css'

interface ReceiveItem {
    productName: string
    spec: string
    expectedKg: number
    actualKg: number
    boxCount: number
    status: 'PENDING' | 'CHECKED' | 'ISSUE'
    note: string
}

export default function WarehouseReceive() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

    // Mock 데이터
    const receiveInfo = {
        id: id || 'R-001',
        orderId: 'OS-2024-003',
        customerName: '태윤유통',
        supplier: '우경인터내셔널',
        vehicleNo: '서울12가3456',
        driverName: '김기사',
        driverPhone: '010-1234-5678',
        expectedTime: '09:30',
    }

    const [items, setItems] = useState<ReceiveItem[]>([
        { productName: '한우 등심 1++', spec: '냉장/1kg', expectedKg: 50, actualKg: 50, boxCount: 5, status: 'PENDING', note: '' },
        { productName: '한우 안심 1++', spec: '냉장/1kg', expectedKg: 30, actualKg: 30, boxCount: 3, status: 'PENDING', note: '' },
        { productName: '한우 채끝 1+', spec: '냉장/1kg', expectedKg: 25, actualKg: 25, boxCount: 3, status: 'PENDING', note: '' },
    ])

    const updateItem = (index: number, field: keyof ReceiveItem, value: any) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: value }
        setItems(updated)
    }

    const markItemChecked = (index: number) => {
        const updated = [...items]
        updated[index].status = 'CHECKED'
        setItems(updated)
    }

    const markItemIssue = (index: number) => {
        const updated = [...items]
        updated[index].status = 'ISSUE'
        setItems(updated)
    }

    const allItemsChecked = items.every(item => item.status !== 'PENDING')
    const hasIssues = items.some(item => item.status === 'ISSUE')

    const handleComplete = () => {
        if (hasIssues) {
            if (!confirm('이상 항목이 있습니다. 그래도 반입 처리를 완료하시겠습니까?')) {
                return
            }
        }
        alert('✅ 반입 처리가 완료되었습니다!')
        navigate('/warehouse')
    }

    return (
        <div className="warehouse-receive">
            {/* Header */}
            <header className="receive-header">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/warehouse')}>
                        ← 대시보드
                    </button>
                    <span className="badge badge-primary">📥 반입 처리</span>
                </div>

                <div className="header-main">
                    <div className="receive-info">
                        <h1>{receiveInfo.supplier}</h1>
                        <p className="order-id">주문: {receiveInfo.orderId} · 고객: {receiveInfo.customerName}</p>
                    </div>
                    <div className="vehicle-info">
                        <span className="vehicle-no"><TruckDeliveryIcon size={16} /> {receiveInfo.vehicleNo}</span>
                        <span className="driver">{receiveInfo.driverName}</span>
                        <a href={`tel:${receiveInfo.driverPhone}`} className="phone-link">
                            <PhoneIcon size={14} /> {receiveInfo.driverPhone}
                        </a>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                        <span className="step-num">1</span>
                        <span className="step-label">차량 확인</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                        <span className="step-num">2</span>
                        <span className="step-label">품목 검수</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                        <span className="step-num">3</span>
                        <span className="step-label">반입 완료</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="receive-content">
                {/* Step 1: 차량 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><TruckDeliveryIcon size={20} /> 차량 확인</h2>
                        <p className="section-desc">입고 차량 정보를 확인해주세요.</p>

                        <div className="vehicle-confirm-card">
                            <div className="confirm-row">
                                <span className="label">차량번호</span>
                                <span className="value">{receiveInfo.vehicleNo}</span>
                            </div>
                            <div className="confirm-row">
                                <span className="label">기사명</span>
                                <span className="value">{receiveInfo.driverName}</span>
                            </div>
                            <div className="confirm-row">
                                <span className="label">연락처</span>
                                <span className="value">{receiveInfo.driverPhone}</span>
                            </div>
                            <div className="confirm-row">
                                <span className="label">공급사</span>
                                <span className="value">{receiveInfo.supplier}</span>
                            </div>
                            <div className="confirm-row">
                                <span className="label">예상 도착</span>
                                <span className="value">{receiveInfo.expectedTime}</span>
                            </div>
                        </div>

                        <div className="confirm-actions">
                            <button className="btn btn-primary btn-lg" onClick={() => setCurrentStep(2)}>
                                <CheckCircleIcon size={18} /> 차량 확인 완료 → 품목 검수
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 2: 품목 검수 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><SearchIcon size={20} /> 품목 검수</h2>
                        <p className="section-desc">각 품목을 확인하고 실제 수량을 입력해주세요.</p>

                        <div className="items-checklist">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`check-item ${item.status.toLowerCase()}`}
                                >
                                    <div className="item-header">
                                        <div className="item-info">
                                            <h4>{item.productName}</h4>
                                            <span className="spec">{item.spec}</span>
                                        </div>
                                        <div className={`status-badge ${item.status.toLowerCase()}`}>
                                            {item.status === 'PENDING' && '⏳ 대기'}
                                            {item.status === 'CHECKED' && <><CheckCircleIcon size={14} /> 확인</>}
                                            {item.status === 'ISSUE' && '⚠️ 이상'}
                                        </div>
                                    </div>

                                    <div className="item-body">
                                        <div className="qty-row">
                                            <div className="qty-field">
                                                <label>예상 수량</label>
                                                <span className="expected">{item.expectedKg}kg</span>
                                            </div>
                                            <div className="qty-field">
                                                <label>실제 수량</label>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        value={item.actualKg}
                                                        onChange={(e) => updateItem(idx, 'actualKg', parseInt(e.target.value) || 0)}
                                                    />
                                                    <span className="unit">kg</span>
                                                </div>
                                            </div>
                                            <div className="qty-field">
                                                <label>박스 수</label>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        value={item.boxCount}
                                                        onChange={(e) => updateItem(idx, 'boxCount', parseInt(e.target.value) || 0)}
                                                    />
                                                    <span className="unit">박스</span>
                                                </div>
                                            </div>
                                        </div>

                                        {item.status === 'ISSUE' && (
                                            <div className="issue-note">
                                                <label>이상 내용</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="이상 내용을 입력해주세요"
                                                    value={item.note}
                                                    onChange={(e) => updateItem(idx, 'note', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {item.status === 'PENDING' && (
                                        <div className="item-actions">
                                            <button
                                                className="btn btn-success"
                                                onClick={() => markItemChecked(idx)}
                                            >
                                                <CheckCircleIcon size={16} /> 정상
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => markItemIssue(idx)}
                                            >
                                                ⚠️ 이상
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                                ← 이전
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setCurrentStep(3)}
                                disabled={!allItemsChecked}
                            >
                                다음 → 반입 완료
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 3: 반입 완료 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 반입 완료 확인</h2>
                        <p className="section-desc">검수 내역을 확인하고 반입을 완료해주세요.</p>

                        <div className="summary-card">
                            <div className="summary-header">
                                <span>{receiveInfo.supplier}</span>
                                <span className="order-id">{receiveInfo.orderId}</span>
                            </div>

                            <div className="summary-items">
                                {items.map((item, idx) => (
                                    <div key={idx} className={`summary-item ${item.status.toLowerCase()}`}>
                                        <div className="item-info">
                                            <span className="name">{item.productName}</span>
                                            <span className={`status ${item.status.toLowerCase()}`}>
                                                {item.status === 'CHECKED' ? <CheckCircleIcon size={14} /> : <AlertTriangleIcon size={14} />}
                                            </span>
                                        </div>
                                        <div className="item-qty">
                                            <span>{item.actualKg}kg</span>
                                            {item.expectedKg !== item.actualKg && (
                                                <span className="diff">
                                                    ({item.actualKg - item.expectedKg > 0 ? '+' : ''}{item.actualKg - item.expectedKg})
                                                </span>
                                            )}
                                        </div>
                                        {item.note && <p className="item-note">{item.note}</p>}
                                    </div>
                                ))}
                            </div>

                            <div className="summary-total">
                                <span>총 반입 수량</span>
                                <span className="total-kg">
                                    {items.reduce((sum, i) => sum + i.actualKg, 0)}kg
                                </span>
                            </div>

                            {hasIssues && (
                                <div className="issues-warning">
                                    ⚠️ {items.filter(i => i.status === 'ISSUE').length}건의 이상 항목이 있습니다.
                                </div>
                            )}
                        </div>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                                ← 이전
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={handleComplete}>
                                <CheckCircleIcon size={18} /> 반입 완료
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
