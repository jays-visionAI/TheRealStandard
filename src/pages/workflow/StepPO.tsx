import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardListIcon, FactoryIcon, DashboardIcon, CheckCircleIcon, PackageIcon } from '../../components/Icons'
import { getSalesOrderById, getSalesOrderItems, type FirestoreSalesOrder, type FirestoreSalesOrderItem } from '../../lib/orderService'
import { getAllSuppliers, type FirestoreSupplier } from '../../lib/supplierService'
import './StepPO.css'
import type { ReactNode } from 'react'

const PO_STEPS: { id: number; label: string; icon: ReactNode }[] = [
    { id: 1, label: '주문 확인', icon: <ClipboardListIcon size={20} /> },
    { id: 2, label: '매입처 선택', icon: <FactoryIcon size={20} /> },
    { id: 3, label: '수량 배분', icon: <DashboardIcon size={20} /> },
    { id: 4, label: '발주 완료', icon: <CheckCircleIcon size={20} /> },
]

interface OrderItem {
    id: string
    name: string
    spec: string
    qty: number
    unit: string
    salePrice: number
    allocations: Record<string, number>  // supplierId -> qty
}

// 로컬 타입
type LocalSalesOrder = Omit<FirestoreSalesOrder, 'createdAt' | 'confirmedAt'> & {
    createdAt?: Date
    confirmedAt?: Date
}

type LocalSupplier = Omit<FirestoreSupplier, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
    specialty?: string
    minOrder?: number
}

export default function StepPO() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])

    // Firebase에서 직접 로드되는 데이터
    const [salesOrder, setSalesOrder] = useState<LocalSalesOrder | null>(null)
    const [salesOrderItems, setSalesOrderItems] = useState<FirestoreSalesOrderItem[]>([])
    const [suppliers, setSuppliers] = useState<LocalSupplier[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Firebase에서 데이터 로드
    const loadData = async () => {
        if (!id) return

        try {
            setLoading(true)
            setError(null)

            const [soData, itemsData, suppliersData] = await Promise.all([
                getSalesOrderById(id),
                getSalesOrderItems(id),
                getAllSuppliers()
            ])

            if (soData) {
                setSalesOrder({
                    ...soData,
                    createdAt: soData.createdAt?.toDate?.() || new Date(),
                    confirmedAt: soData.confirmedAt?.toDate?.() || new Date(),
                })
            }
            setSalesOrderItems(itemsData)
            setSuppliers(suppliersData.map(s => ({
                ...s,
                createdAt: s.createdAt?.toDate?.() || new Date(),
                updatedAt: s.updatedAt?.toDate?.() || new Date(),
                specialty: '전품목',
                minOrder: 20,
            })))
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadData()
    }, [id])

    const [items, setItems] = useState<OrderItem[]>([])

    // salesOrderItems가 로드되면 items 초기화
    useEffect(() => {
        if (salesOrderItems.length > 0 && items.length === 0) {
            setItems(salesOrderItems.map(i => ({
                id: i.id,
                name: i.productName || '상품명 없음',
                spec: '-',
                qty: i.qtyKg,
                unit: 'kg',
                salePrice: i.unitPrice,
                allocations: {}
            })))
        }
    }, [salesOrderItems])

    const order = {
        id: salesOrder?.id || 'NO-DATA',
        customerName: salesOrder?.customerName || '알 수 없음',
        confirmedAt: salesOrder?.confirmedAt ? salesOrder.confirmedAt.toLocaleString('ko-KR') : '-',
        shipDate: '-',
        totalAmount: salesOrder?.totalsAmount || 0,
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const toggleSupplier = (supplierId: string) => {
        if (selectedSuppliers.includes(supplierId)) {
            setSelectedSuppliers(selectedSuppliers.filter(s => s !== supplierId))
        } else {
            setSelectedSuppliers([...selectedSuppliers, supplierId])
        }
    }

    const updateAllocation = (itemId: string, supplierId: string, qty: number) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    allocations: { ...item.allocations, [supplierId]: qty }
                }
            }
            return item
        }))
    }

    const getAllocatedQty = (itemId: string) => {
        const item = items.find(i => i.id === itemId)
        if (!item) return 0
        return Object.values(item.allocations).reduce((sum, qty) => sum + qty, 0)
    }

    const handleNext = () => {
        if (currentStep === 2 && selectedSuppliers.length === 0) {
            alert('최소 1개 이상의 매입처를 선택해주세요.')
            return
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleComplete = () => {
        const poList = selectedSuppliers.map(sId => {
            const supplier = suppliers.find(s => s.id === sId)
            return `${supplier?.companyName || '알 수 없음'}: ${items.map(i => i.allocations[sId] ? `${i.name} ${i.allocations[sId]}${i.unit}` : '').filter(Boolean).join(', ')}`
        }).join('\n')

        alert(`✅ 발주가 생성되었습니다!\n\n${poList}`)
        navigate('/admin/workflow')
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="step-po">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>데이터를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="step-po">
                <div className="error-state">
                    <p>❌ {error}</p>
                    <button className="btn btn-primary" onClick={loadData}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="step-po">
            {/* Header */}
            <header className="po-header glass-card">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/admin/workflow')}>
                        ← 워크플로우
                    </button>
                    <span className="badge badge-primary">확정 주문</span>
                </div>

                <div className="header-main">
                    <div className="order-info">
                        <h1><PackageIcon size={24} /> 발주 생성</h1>
                        <div className="order-meta">
                            <span className="customer-name">{order.customerName}</span>
                            <span className="order-id">{order.id}</span>
                            <span className="confirmed-at">확정: {order.confirmedAt}</span>
                        </div>
                    </div>
                    <div className="order-amount">
                        <span className="amount-label">판매금액</span>
                        <span className="amount-value">{formatCurrency(order.totalAmount)}</span>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    {PO_STEPS.map((step, index) => (
                        <div key={step.id} className="step-wrapper">
                            <div className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                                <div className="step-circle">
                                    {currentStep > step.id ? '✓' : step.icon}
                                </div>
                                <span className="step-label">{step.label}</span>
                            </div>
                            {index < PO_STEPS.length - 1 && (
                                <div className={`step-connector ${currentStep > step.id ? 'completed' : ''}`} />
                            )}
                        </div>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="po-content">
                {/* Step 1: 주문 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 확정된 주문 내역</h2>
                        <p className="section-desc">고객 주문이 확정되었습니다. 내역을 확인하고 발주를 진행하세요.</p>

                        <div className="items-table">
                            <div className="table-header">
                                <span>품목</span>
                                <span>규격</span>
                                <span>수량</span>
                                <span>판매단가</span>
                            </div>
                            {items.map(item => (
                                <div key={item.id} className="table-row">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-spec">{item.spec}</span>
                                    <span className="item-qty">{item.qty} {item.unit}</span>
                                    <span className="item-price">{formatCurrency(item.salePrice)}/{item.unit}</span>
                                </div>
                            ))}
                        </div>

                        <div className="info-note">
                            <span className="note-icon">💡</span>
                            <span>이 주문을 처리하기 위해 매입처에 발주서를 생성합니다.</span>
                        </div>
                    </section>
                )}

                {/* Step 2: 매입처 선택 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><FactoryIcon size={20} /> 매입처 선택</h2>
                        <p className="section-desc">발주할 매입처를 선택하세요. (복수 선택 가능)</p>

                        <div className="supplier-list">
                            {suppliers.map(supplier => (
                                <div
                                    key={supplier.id}
                                    className={`supplier-card ${selectedSuppliers.includes(supplier.id) ? 'selected' : ''}`}
                                    onClick={() => toggleSupplier(supplier.id)}
                                >
                                    <div className="supplier-check">
                                        {selectedSuppliers.includes(supplier.id) ? '✓' : ''}
                                    </div>
                                    <div className="supplier-info">
                                        <span className="supplier-name">{supplier.companyName}</span>
                                        <span className="supplier-specialty">{supplier.specialty || '전품목'}</span>
                                        <span className="supplier-min">최소주문: {supplier.minOrder || 20}kg</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="selection-summary">
                            {selectedSuppliers.length}개 매입처 선택됨
                        </div>
                    </section>
                )}

                {/* Step 3: 수량 배분 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><DashboardIcon size={20} /> 수량 배분</h2>
                        <p className="section-desc">각 품목을 매입처별로 수량을 배분하세요.</p>

                        {items.map(item => (
                            <div key={item.id} className="allocation-item">
                                <div className="allocation-header">
                                    <span className="item-title">{item.name} ({item.spec})</span>
                                    <span className="item-total">
                                        필요: {item.qty}{item.unit} | 배분: {getAllocatedQty(item.id)}{item.unit}
                                        {getAllocatedQty(item.id) >= item.qty && <span className="complete-badge">✓</span>}
                                    </span>
                                </div>
                                <div className="allocation-inputs">
                                    {selectedSuppliers.map(sId => {
                                        const supplier = suppliers.find(s => s.id === sId)
                                        return (
                                            <div key={sId} className="allocation-row">
                                                <span className="supplier-label">{supplier?.companyName || '알 수 없음'}</span>
                                                <div className="qty-input-group">
                                                    <input
                                                        type="number"
                                                        className="input qty-input"
                                                        value={item.allocations[sId] || ''}
                                                        onChange={(e) => updateAllocation(item.id, sId, parseInt(e.target.value) || 0)}
                                                        placeholder="0"
                                                    />
                                                    <span className="qty-unit">{item.unit}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Step 4: 발주 완료 */}
                {currentStep === 4 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><CheckCircleIcon size={20} /> 발주 확인</h2>
                        <p className="section-desc">아래 내용으로 발주서를 생성합니다.</p>

                        {selectedSuppliers.map(sId => {
                            const supplier = suppliers.find(s => s.id === sId)
                            const supplierItems = items.filter(item => item.allocations[sId] > 0)

                            if (supplierItems.length === 0) return null

                            return (
                                <div key={sId} className="po-summary-card">
                                    <div className="po-supplier-header">
                                        <span className="supplier-name"><PackageIcon size={16} /> {supplier?.companyName || '알 수 없음'}</span>
                                        <span className="po-number">PO-2024-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</span>
                                    </div>
                                    <div className="po-items">
                                        {supplierItems.map(item => (
                                            <div key={item.id} className="po-item-row">
                                                <span>{item.name} ({item.spec})</span>
                                                <span>{item.allocations[sId]} {item.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}

                        <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleComplete}>
                            <PackageIcon size={18} /> 발주서 생성하기
                        </button>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="po-footer glass-card">
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
