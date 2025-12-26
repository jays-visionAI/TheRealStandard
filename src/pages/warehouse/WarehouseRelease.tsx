import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useOrderStore } from '../../stores/orderStore'
import { MapPinIcon, TruckDeliveryIcon, PackageIcon, CheckCircleIcon, ClipboardListIcon } from '../../components/Icons'
import './WarehouseRelease.css'

interface ReleaseItem {
    productName: string
    spec: string
    orderedKg: number
    loadedKg: number
    boxCount: number
    status: 'PENDING' | 'LOADED' | 'ISSUE'
    note: string
}

export default function WarehouseRelease() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getSalesOrderById, getSalesOrderItems } = useOrderStore()

    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

    // 실데이터 연동
    const so = useMemo(() => getSalesOrderById(id || ''), [id, getSalesOrderById])
    const soItems = useMemo(() => getSalesOrderItems(id || ''), [id, getSalesOrderItems])

    const releaseInfo = useMemo(() => ({
        id: id || '',
        orderId: so?.sourceOrderSheetId || '',
        customerName: so?.customerName || '',
        shipTo: '배송지 정보 확인 필요',
        vehicleNo: '배차대기',
        driverName: '',
        driverPhone: '010-0000-0000',
        expectedTime: '미정',
        adminMemo: '특별 요청사항 없음',
    }), [so, id])

    const [items, setItems] = useState<ReleaseItem[]>(() => {
        if (soItems.length > 0) {
            return soItems.map(item => ({
                productName: item.productName || '알 수 없는 상품',
                spec: '기본규격',
                orderedKg: item.qtyKg,
                loadedKg: item.qtyKg,
                boxCount: Math.ceil(item.qtyKg / 10),
                status: 'PENDING',
                note: ''
            }))
        }
        return []
    })

    const [requestConfirmed, setRequestConfirmed] = useState(false)

    const [driverConfirmation, setDriverConfirmation] = useState({
        confirmed: false,
        signature: '',
    })

    const updateItem = (index: number, field: keyof ReleaseItem, value: any) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: value }
        setItems(updated)
    }

    const markItemLoaded = (index: number) => {
        const updated = [...items]
        updated[index].status = 'LOADED'
        setItems(updated)
    }

    const markItemIssue = (index: number) => {
        const updated = [...items]
        updated[index].status = 'ISSUE'
        setItems(updated)
    }

    const allItemsLoaded = items.every(item => item.status !== 'PENDING')
    const hasIssues = items.some(item => item.status === 'ISSUE')

    const handleComplete = () => {
        if (!driverConfirmation.confirmed) {
            alert('기사님 확인이 필요합니다.')
            return
        }
        alert('✅ 출고 처리가 완료되었습니다!\n\n배송이 시작됩니다.')
        navigate('/warehouse')
    }

    return (
        <div className="warehouse-release">
            {/* Header */}
            <header className="release-header">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/warehouse')}>
                        ← 대시보드
                    </button>
                    <span className="badge badge-warning">📤 출고 처리</span>
                </div>

                <div className="header-main">
                    <div className="release-info">
                        <h1>{releaseInfo.customerName}</h1>
                        <p className="order-id">주문: {releaseInfo.orderId}</p>
                        <p className="ship-to"><MapPinIcon size={14} /> {releaseInfo.shipTo}</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                        <span className="step-num">1</span>
                        <span className="step-label">요청 확인</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                        <span className="step-num">2</span>
                        <span className="step-label">상품 적재</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                        <span className="step-num">3</span>
                        <span className="step-label">기사 확인</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
                        <span className="step-num">4</span>
                        <span className="step-label">출고 완료</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="release-content">
                {/* Step 1: 요청 및 서류 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>📝 관리자 반출 요청 확인</h2>
                        <p className="section-desc">관리자의 특별 요청사항과 거래명세서를 확인해주세요.</p>

                        <div className="admin-request-card">
                            <div className="memo-section">
                                <h3>💡 개별 요청사항</h3>
                                <div className="memo-content">
                                    {releaseInfo.adminMemo}
                                </div>
                            </div>

                            <div className="doc-section">
                                <h3>📑 출고 거래명세서</h3>
                                <div className="doc-preview-placeholder">
                                    <ClipboardListIcon size={40} />
                                    <span>출고용 거래명세서.pdf</span>
                                    <button className="btn btn-sm btn-secondary">내용 확인</button>
                                </div>
                            </div>

                            <div className="confirm-check mt-6">
                                <label className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        checked={requestConfirmed}
                                        onChange={(e) => setRequestConfirmed(e.target.checked)}
                                    />
                                    <span>요청사항 및 서류 확인 완료</span>
                                </label>
                            </div>
                        </div>

                        <div className="step-footer mt-6">
                            <div />
                            <button
                                className="btn btn-primary btn-lg flex-1"
                                onClick={() => setCurrentStep(2)}
                                disabled={!requestConfirmed}
                            >
                                다음 → 상품 적재 시작
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 2: 상품 적재 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><PackageIcon size={20} /> 상품 적재</h2>
                        <p className="section-desc">각 품목을 차량에 적재하고 확인해주세요.</p>

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
                                            {item.status === 'LOADED' && <><CheckCircleIcon size={14} /> 적재완료</>}
                                            {item.status === 'ISSUE' && '⚠️ 이상'}
                                        </div>
                                    </div>

                                    <div className="item-body">
                                        <div className="qty-row">
                                            <div className="qty-field">
                                                <label>주문 수량</label>
                                                <span className="ordered">{item.orderedKg}kg</span>
                                            </div>
                                            <div className="qty-field">
                                                <label>적재 수량</label>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        value={item.loadedKg}
                                                        onChange={(e) => updateItem(idx, 'loadedKg', parseInt(e.target.value) || 0)}
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
                                                onClick={() => markItemLoaded(idx)}
                                            >
                                                <CheckCircleIcon size={16} /> 적재 완료
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
                                disabled={!allItemsLoaded}
                            >
                                다음 → 기사 확인
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 3: 기사 확인 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>✍️ 기사 확인</h2>
                        <p className="section-desc">기사님께 적재 내역을 확인받으세요.</p>

                        <div className="driver-confirm-card">
                            <div className="driver-info">
                                <span className="driver-name"><TruckDeliveryIcon size={16} /> {releaseInfo.driverName}</span>
                                <span className="vehicle-no">{releaseInfo.vehicleNo}</span>
                            </div>

                            <div className="loaded-summary">
                                <h4>적재 내역</h4>
                                {items.map((item, idx) => (
                                    <div key={idx} className="summary-row">
                                        <span>{item.productName}</span>
                                        <span>{item.loadedKg}kg ({item.boxCount}박스)</span>
                                    </div>
                                ))}
                                <div className="summary-total">
                                    <span>총 적재량</span>
                                    <span>{items.reduce((sum, i) => sum + i.loadedKg, 0)}kg</span>
                                </div>
                            </div>

                            <div className="confirm-checkbox">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={driverConfirmation.confirmed}
                                        onChange={(e) => setDriverConfirmation({
                                            ...driverConfirmation,
                                            confirmed: e.target.checked
                                        })}
                                    />
                                    <span>위 적재 내역을 확인했습니다.</span>
                                </label>
                            </div>

                            {hasIssues && (
                                <div className="issues-notice">
                                    ⚠️ {items.filter(i => i.status === 'ISSUE').length}건의 이상 항목이 있습니다.
                                </div>
                            )}
                        </div>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                                ← 이전
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setCurrentStep(3)}
                                disabled={!driverConfirmation.confirmed}
                            >
                                다음 → 출고 완료
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 3: 출고 완료 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 출고 완료 확인</h2>
                        <p className="section-desc">최종 내역을 확인하고 출고를 완료해주세요.</p>

                        <div className="final-summary-card">
                            <div className="summary-header">
                                <span>{releaseInfo.customerName}</span>
                                <span className="order-id">{releaseInfo.orderId}</span>
                            </div>

                            <div className="summary-section">
                                <h4>배송 정보</h4>
                                <div className="info-row">
                                    <span className="label">배송지</span>
                                    <span className="value">{releaseInfo.shipTo}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">차량</span>
                                    <span className="value">{releaseInfo.vehicleNo}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">기사</span>
                                    <span className="value">{releaseInfo.driverName} ({releaseInfo.driverPhone})</span>
                                </div>
                            </div>

                            <div className="summary-section">
                                <h4>적재 품목</h4>
                                {items.map((item, idx) => (
                                    <div key={idx} className="item-row">
                                        <span>{item.productName}</span>
                                        <span>{item.loadedKg}kg</span>
                                    </div>
                                ))}
                            </div>

                            <div className="summary-total-row">
                                <span>총 출고량</span>
                                <span className="total-kg">{items.reduce((sum, i) => sum + i.loadedKg, 0)}kg</span>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg w-full" onClick={handleComplete}>
                            <CheckCircleIcon size={18} /> 출고 완료
                        </button>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                                ← 이전
                            </button>
                            <div />
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
