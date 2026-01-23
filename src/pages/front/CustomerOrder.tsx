import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardListIcon, PackageIcon, CheckCircleIcon } from '../../components/Icons'
import './CustomerOrder.css'
import type { ReactNode } from 'react'

const ORDER_STEPS: { id: number; label: string; icon: ReactNode }[] = [
    { id: 1, label: '주문 정보', icon: <ClipboardListIcon size={20} /> },
    { id: 2, label: '품목 선택', icon: <PackageIcon size={20} /> },
    { id: 3, label: '수량 입력', icon: <PackageIcon size={20} /> },
    { id: 4, label: '주문 확인', icon: <CheckCircleIcon size={20} /> },
]

interface OrderItem {
    id: string
    name: string
    unitPrice: number
    qtyKg: number
}

export default function CustomerOrder() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [quantities, setQuantities] = useState<Record<string, number>>({})
    const [orderSubmitted, setOrderSubmitted] = useState(false)

    const orderInfo = {
        customerName: '한우명가',
        shipDate: '2024-01-16',
        cutOff: '2024-01-15 18:00',
    }

    const availableItems: OrderItem[] = [
        { id: 'p1', name: '한우 등심 1++', unitPrice: 85000, qtyKg: 0 },
        { id: 'p2', name: '한우 안심 1++', unitPrice: 95000, qtyKg: 0 },
        { id: 'p3', name: '한우 채끝 1+', unitPrice: 72000, qtyKg: 0 },
        { id: 'p4', name: '한우 갈비 1+', unitPrice: 68000, qtyKg: 0 },
        { id: 'p5', name: '한우 목심 1+', unitPrice: 52000, qtyKg: 0 },
        { id: 'p6', name: '수입 부채살', unitPrice: 35000, qtyKg: 0 },
    ]

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const toggleItem = (id: string) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(i => i !== id))
            setQuantities({ ...quantities, [id]: 0 })
        } else {
            setSelectedItems([...selectedItems, id])
        }
    }

    const updateQuantity = (id: string, value: number) => {
        setQuantities({ ...quantities, [id]: value })
    }

    const getSelectedProducts = () => {
        return availableItems.filter(item => selectedItems.includes(item.id))
    }

    const getTotalKg = () => {
        return selectedItems.reduce((sum, id) => sum + (quantities[id] || 0), 0)
    }

    const getTotalAmount = () => {
        return selectedItems.reduce((sum, id) => {
            const item = availableItems.find(p => p.id === id)
            return sum + (item ? item.unitPrice * (quantities[id] || 0) : 0)
        }, 0)
    }

    const handleNext = () => {
        if (currentStep === 2 && selectedItems.length === 0) {
            alert('최소 1개 이상의 품목을 선택해주세요.')
            return
        }
        if (currentStep === 3 && getTotalKg() === 0) {
            alert('수량을 입력해주세요.')
            return
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleSubmit = () => {
        setOrderSubmitted(true)
        setTimeout(() => {
            navigate(`/order/${token}/tracking`)
        }, 2000)
    }

    if (orderSubmitted) {
        return (
            <div className="customer-order">
                <div className="submit-success glass-card animate-fade-in">
                    <div className="success-icon">🎉</div>
                    <h2>주문이 제출되었습니다!</h2>
                    <p>운영팀 검토 후 확정됩니다.</p>
                    <p className="redirect-text">배송 현황 페이지로 이동합니다...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="customer-order">
            {/* Header */}
            <header className="order-header glass-card">
                <div className="header-logo">TRS 주문시스템</div>

                <div className="header-info">
                    <h1>{orderInfo.customerName}님의 주문서</h1>
                    <div className="order-meta">
                        <span className="meta-item">
                            <span className="meta-icon">📅</span>
                            배송: {orderInfo.shipDate}
                        </span>
                        <span className="meta-item warning">
                            <span className="meta-icon">⏰</span>
                            마감: {orderInfo.cutOff}
                        </span>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator-mobile">
                    {ORDER_STEPS.map((step) => (
                        <div
                            key={step.id}
                            className={`step-dot ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                        >
                            {currentStep > step.id ? '✓' : step.id}
                        </div>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="order-content">
                {/* Step 1: 주문 정보 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-slide-up">
                        <div className="section-icon"><ClipboardListIcon size={32} /></div>
                        <h2>주문 정보 확인</h2>
                        <p className="section-desc">아래 정보를 확인하고 주문을 시작하세요.</p>

                        <div className="info-list">
                            <div className="info-item">
                                <span className="info-label">고객명</span>
                                <span className="info-value">{orderInfo.customerName}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">배송예정일</span>
                                <span className="info-value">{orderInfo.shipDate}</span>
                            </div>
                            <div className="info-item highlight">
                                <span className="info-label">주문마감</span>
                                <span className="info-value">{orderInfo.cutOff}</span>
                            </div>
                        </div>

                        <div className="start-guide">
                            <p>👉 주문을 시작하려면 아래 버튼을 눌러주세요</p>
                        </div>

                        <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleNext}>
                            <PackageIcon size={18} /> 주문 품목 선택하기 →
                        </button>
                    </section>
                )}

                {/* Step 2: 품목 선택 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-slide-up">
                        <div className="section-icon"><PackageIcon size={32} /></div>
                        <h2>품목 선택</h2>
                        <p className="section-desc">주문할 품목을 선택하세요. (복수 선택 가능)</p>

                        <div className="product-grid">
                            {availableItems.map(item => (
                                <div
                                    key={item.id}
                                    className={`product-card ${selectedItems.includes(item.id) ? 'selected' : ''}`}
                                    onClick={() => toggleItem(item.id)}
                                >
                                    <div className="product-check">
                                        {selectedItems.includes(item.id) ? '✓' : ''}
                                    </div>
                                    <div className="product-name">{item.name}</div>
                                    <div className="product-price">{formatCurrency(item.unitPrice)}/kg</div>
                                </div>
                            ))}
                        </div>

                        <div className="selection-summary">
                            {selectedItems.length}개 품목 선택됨
                        </div>
                    </section>
                )}

                {/* Step 3: 수량 입력 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-slide-up">
                        <div className="section-icon">🔢</div>
                        <h2>수량 입력</h2>
                        <p className="section-desc">각 품목의 수량을 입력하세요.</p>

                        <div className="quantity-list">
                            {getSelectedProducts().map(item => (
                                <div key={item.id} className="quantity-item">
                                    <div className="qty-info">
                                        <span className="qty-name">{item.name}</span>
                                        <span className="qty-price">{formatCurrency(item.unitPrice)}/kg</span>
                                    </div>
                                    <div className="qty-input-group">
                                        <button
                                            className="qty-btn"
                                            onClick={() => updateQuantity(item.id, Math.max(0, (quantities[item.id] || 0) - 10))}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            className="qty-input"
                                            value={quantities[item.id] || ''}
                                            onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                        />
                                        <span className="qty-unit">kg</span>
                                        <button
                                            className="qty-btn"
                                            onClick={() => updateQuantity(item.id, (quantities[item.id] || 0) + 10)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    {quantities[item.id] > 0 && (
                                        <div className="qty-subtotal">
                                            {formatCurrency(item.unitPrice * quantities[item.id])}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Step 4: 주문 확인 */}
                {currentStep === 4 && (
                    <section className="step-section glass-card animate-slide-up">
                        <div className="section-icon"><CheckCircleIcon size={32} /></div>
                        <h2>주문 확인</h2>
                        <p className="section-desc">주문 내용을 확인하고 제출하세요.</p>

                        <div className="order-summary">
                            {getSelectedProducts().map(item => (
                                <div key={item.id} className="summary-item">
                                    <span className="summary-name">{item.name}</span>
                                    <span className="summary-qty">{quantities[item.id]} kg</span>
                                    <span className="summary-amount">
                                        {formatCurrency(item.unitPrice * (quantities[item.id] || 0))}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="order-total">
                            <div className="total-row">
                                <span>총 주문량</span>
                                <span>{getTotalKg()} kg</span>
                            </div>
                            <div className="total-row main">
                                <span>총 금액</span>
                                <span className="total-amount">{formatCurrency(getTotalAmount())}</span>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="order-footer glass-card">
                {currentStep > 1 && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentStep(currentStep - 1)}
                    >
                        ← 이전
                    </button>
                )}
                {currentStep === 1 && <div />}

                {currentStep < 4 ? (
                    <button className="btn btn-primary btn-lg" onClick={handleNext}>
                        다음 →
                    </button>
                ) : (
                    <button className="btn btn-primary btn-lg" onClick={handleSubmit}>
                        주문 제출하기 🎉
                    </button>
                )}
            </footer>
        </div>
    )
}
