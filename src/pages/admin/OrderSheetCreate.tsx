import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomerStore, type Customer } from '../../stores/customerStore'
import { useOrderStore } from '../../stores/orderStore'
import { FileEditIcon, BuildingIcon, SearchIcon, StarIcon, MapPinIcon, PhoneIcon, ClipboardListIcon, PackageIcon } from '../../components/Icons'
import './OrderSheetCreate.css'
import { useProductStore, type Product as StoreProduct } from '../../stores/productStore'

interface Product extends StoreProduct {
    unitPrice: number
}

// PRODUCT_MASTER defined via store

// Mock 이전 주문 데이터
interface PastOrder {
    id: string
    date: string
    items: { productId: string; productName: string; qty: number }[]
    totalAmount: number
}

const mockPastOrders: Record<string, PastOrder[]> = {}

// ============================================
// 주문 행 인터페이스
// ============================================
interface OrderRow {
    id: string
    productId: string | null
    productName: string
    unitPrice: number
    quantity: number
    unit: 'kg' | 'box'
    estimatedWeight: number
    totalAmount: number
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function OrderSheetCreate() {
    const navigate = useNavigate()

    // 공유 스토어에서 고객/상품 데이터 가져오기
    const { customers } = useCustomerStore()
    const { addOrderSheet } = useOrderStore()
    const { products, initializeStore } = useProductStore()

    // 초기화 (저장된 데이터가 없을 경우)
    useEffect(() => {
        initializeStore()
    }, [initializeStore])

    // 로컬에서 사용하기 편하도록 도매가를 unitPrice로 매핑
    const PRODUCT_MASTER = useMemo(() => products.map(p => ({
        ...p,
        unitPrice: p.wholesalePrice
    })), [products])

    // Step 관리
    const [step, setStep] = useState(1)

    // Step 1: 고객 선택
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [customerSearch, setCustomerSearch] = useState('')

    // Step 2: 품목 설정 (엑셀 그리드)
    const [rows, setRows] = useState<OrderRow[]>([])
    const [activeRowId, setActiveRowId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [highlightIndex, setHighlightIndex] = useState(0)

    // Step 3: 배송 정보
    const [shipDate, setShipDate] = useState('')
    const [cutOffAt, setCutOffAt] = useState('')
    const [shipTo, setShipTo] = useState('')

    // 이전 주문 패널
    const [showPastOrders, setShowPastOrders] = useState(true)
    const pastOrders = selectedCustomer ? mockPastOrders[selectedCustomer.id] || [] : []

    // Refs
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
    const dropdownRef = useRef<HTMLDivElement>(null)

    // 빈 행 생성
    function createEmptyRow(): OrderRow {
        return {
            id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId: null,
            productName: '',
            unitPrice: 0,
            quantity: 0,
            unit: 'kg',
            estimatedWeight: 0,
            totalAmount: 0,
        }
    }

    // 초기 행 설정
    useEffect(() => {
        if (rows.length === 0) {
            setRows([createEmptyRow()])
        }
    }, [])

    // 고객 선택 시 배송지 자동 설정
    useEffect(() => {
        if (selectedCustomer) {
            setShipTo(selectedCustomer.address)
        }
    }, [selectedCustomer])

    // 상품 검색 로직
    const searchProducts = useCallback((query: string): Product[] => {
        if (!query.trim()) return []
        const q = query.toLowerCase()
        const startsWithProducts = PRODUCT_MASTER.filter(p => p.name.toLowerCase().startsWith(q))
        const containsProducts = PRODUCT_MASTER.filter(p =>
            p.name.toLowerCase().includes(q) && !p.name.toLowerCase().startsWith(q)
        )
        return [...startsWithProducts, ...containsProducts]
    }, [])

    // 검색어 변경 시 필터링
    useEffect(() => {
        const results = searchProducts(searchQuery)
        setFilteredProducts(results)
        setHighlightIndex(0)
    }, [searchQuery, searchProducts])

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // 상품 선택
    const selectProduct = (rowId: string, product: Product) => {
        setRows(prev => prev.map(row => {
            if (row.id === rowId) {
                return {
                    ...row,
                    productId: product.id,
                    productName: product.name,
                    unitPrice: product.unitPrice,
                    unit: product.unit,
                }
            }
            return row
        }))

        setShowDropdown(false)
        setSearchQuery('')

        // 수량 입력란으로 포커스 이동
        setTimeout(() => {
            const qtyInput = inputRefs.current.get(`qty-${rowId}`)
            if (qtyInput) {
                qtyInput.focus()
                qtyInput.select()
            }
        }, 50)
    }

    // 수량 변경 시 계산
    const updateQuantity = (rowId: string, quantity: number) => {
        setRows(prev => prev.map(row => {
            if (row.id === rowId) {
                const product = PRODUCT_MASTER.find(p => p.id === row.productId)
                let estimatedWeight = quantity

                if (product && product.unit === 'box' && product.boxWeight) {
                    estimatedWeight = quantity * product.boxWeight
                }

                const totalAmount = row.unitPrice * estimatedWeight

                return {
                    ...row,
                    quantity,
                    estimatedWeight,
                    totalAmount,
                }
            }
            return row
        }))
    }

    // 행 추가
    const addRow = () => {
        const newRow = createEmptyRow()
        setRows(prev => [...prev, newRow])

        setTimeout(() => {
            const nameInput = inputRefs.current.get(`name-${newRow.id}`)
            if (nameInput) nameInput.focus()
        }, 50)
    }

    // 행 삭제
    const removeRow = (rowId: string) => {
        if (rows.length <= 1) return
        setRows(prev => prev.filter(row => row.id !== rowId))
    }

    // 이전 주문에서 품목 불러오기
    const loadFromPastOrder = (pastOrder: PastOrder) => {
        const newRows: OrderRow[] = pastOrder.items.map(item => {
            const product = PRODUCT_MASTER.find(p => p.id === item.productId)
            return {
                id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: item.productId,
                productName: item.productName,
                unitPrice: product?.unitPrice || 0,
                quantity: item.qty,
                unit: product?.unit || 'kg',
                estimatedWeight: item.qty,
                totalAmount: (product?.unitPrice || 0) * item.qty,
            }
        })
        setRows(newRows)
    }

    // 키보드 네비게이션
    const handleKeyDown = (e: React.KeyboardEvent, rowId: string, field: 'name' | 'qty') => {
        if (field === 'name' && showDropdown && filteredProducts.length > 0) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setHighlightIndex(prev => Math.min(prev + 1, filteredProducts.length - 1))
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setHighlightIndex(prev => Math.max(prev - 1, 0))
                    break
                case 'Enter':
                    e.preventDefault()
                    selectProduct(rowId, filteredProducts[highlightIndex])
                    break
                case 'Escape':
                    setShowDropdown(false)
                    break
            }
        } else if (field === 'qty' && e.key === 'Enter') {
            e.preventDefault()
            const currentRow = rows.find(r => r.id === rowId)
            if (currentRow && currentRow.productId && currentRow.quantity > 0) {
                const currentIndex = rows.findIndex(r => r.id === rowId)
                if (currentIndex === rows.length - 1) {
                    addRow()
                } else {
                    const nextRow = rows[currentIndex + 1]
                    const nameInput = inputRefs.current.get(`name-${nextRow.id}`)
                    if (nameInput) nameInput.focus()
                }
            }
        } else if (field === 'qty' && e.key === 'Tab' && !e.shiftKey) {
            const currentIndex = rows.findIndex(r => r.id === rowId)
            if (currentIndex === rows.length - 1) {
                e.preventDefault()
                addRow()
            }
        }
    }

    // 통계 계산
    const validRows = useMemo(() => rows.filter(r => r.productId && r.quantity > 0), [rows])
    const totalItems = validRows.length
    const totalWeight = useMemo(() => validRows.reduce((sum, r) => sum + r.estimatedWeight, 0), [validRows])
    const totalAmount = useMemo(() => validRows.reduce((sum, r) => sum + r.totalAmount, 0), [validRows])

    // 통화 포맷
    const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR').format(value)

    // 고객 필터링 - 활성 고객만 표시
    const filteredCustomers = useMemo(() => {
        const activeCustomers = customers.filter((c: Customer) => c.isActive)
        if (!customerSearch) return activeCustomers
        const q = customerSearch.toLowerCase()
        return activeCustomers.filter((c: Customer) =>
            c.companyName.toLowerCase().includes(q) ||
            c.bizRegNo.includes(q)
        )
    }, [customerSearch, customers])

    // 주문장 발송
    const handleSubmit = () => {
        if (!selectedCustomer || validRows.length === 0 || !shipDate || !cutOffAt) {
            alert('모든 필수 정보를 입력해주세요.')
            return
        }

        const orderId = 'OS-' + Date.now()
        const token = 'token-' + Math.random().toString(36).substr(2, 9)
        const link = `${window.location.origin}/order/${token}`

        const newOrder = {
            id: orderId,
            customerOrgId: selectedCustomer.id,
            customerName: selectedCustomer.companyName,
            shipDate: new Date(shipDate),
            cutOffAt: new Date(cutOffAt),
            shipTo: shipTo,
            status: 'SENT' as const,
            inviteTokenId: token,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const items = validRows.map((row, idx) => ({
            id: `item-${orderId}-${idx}`,
            orderSheetId: orderId,
            productId: row.productId || '',
            productName: row.productName,
            inputType: row.unit.toUpperCase() as any,
            qtyKg: row.unit === 'kg' ? row.quantity : undefined,
            qtyBox: row.unit === 'box' ? row.quantity : undefined,
            estimatedKg: row.estimatedWeight,
            unitPrice: row.unitPrice,
            amount: row.totalAmount,
        }))

        addOrderSheet(newOrder, items)

        navigator.clipboard.writeText(link)
        alert(`✅ 주문장이 생성되었습니다!\n\n고객 링크가 클립보드에 복사되었습니다.\n\n${link}`)
        navigate('/admin/order-sheets')
    }

    // 상품 선택 해제
    const clearProduct = (rowId: string, index: number) => {
        setRows(prev => prev.map((r, i) =>
            i === index ? { ...createEmptyRow(), id: rowId } : r
        ))
        const nameInput = inputRefs.current.get(`name-${rowId}`)
        if (nameInput) nameInput.focus()
    }

    return (
        <div className="order-sheet-create">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1><FileEditIcon size={24} /> 주문장 생성</h1>
                    <p className="text-secondary">B2B 거래처 주문장 작성</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="steps-bar glass-card">
                <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                    <div className="step-number">{step > 1 ? '✓' : '1'}</div>
                    <span>고객 선택</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                    <div className="step-number">{step > 2 ? '✓' : '2'}</div>
                    <span>품목 설정</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                    <div className="step-number">3</div>
                    <span>배송 정보</span>
                </div>
            </div>

            {/* Step 1: 고객 선택 */}
            {step === 1 && (
                <div className="step-content">
                    <div className="glass-card">
                        <h2 className="section-title"><BuildingIcon size={20} /> 고객사 선택</h2>

                        <div className="search-box mb-4">
                            <span className="search-icon"><SearchIcon size={18} /></span>
                            <input
                                type="text"
                                className="input"
                                placeholder="거래처명 또는 사업자번호 검색..."
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                        </div>

                        {/* 주요 거래처 카드 */}
                        {filteredCustomers.filter(c => c.isKeyAccount).length > 0 && (
                            <>
                                <h3 className="subsection-title"><StarIcon size={16} /> 주요 거래처</h3>
                                <div className="customer-grid">
                                    {filteredCustomers.filter(c => c.isKeyAccount).map((customer) => (
                                        <div
                                            key={customer.id}
                                            className={`customer-card key-account ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedCustomer(customer)}
                                        >
                                            <div className="customer-name">
                                                {customer.companyName}
                                                <span className="key-badge"><StarIcon size={12} /></span>
                                            </div>
                                            <div className="customer-info">
                                                <span><MapPinIcon size={14} /> {customer.address}</span>
                                                <span><PhoneIcon size={14} /> {customer.phone}</span>
                                            </div>
                                            <div className="customer-biz">사업자: {customer.bizRegNo}</div>
                                            {selectedCustomer?.id === customer.id && (
                                                <div className="selected-badge">✓ 선택됨</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* 일반 거래처 테이블 */}
                        {filteredCustomers.filter(c => !c.isKeyAccount).length > 0 && (
                            <>
                                <h3 className="subsection-title mt-6"><ClipboardListIcon size={16} /> 전체 거래처 목록</h3>
                                <div className="customer-table-container">
                                    <table className="customer-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 40 }}></th>
                                                <th>거래처명</th>
                                                <th>사업자번호</th>
                                                <th>대표자</th>
                                                <th>전화번호</th>
                                                <th>주소</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCustomers.filter(c => !c.isKeyAccount).map((customer) => (
                                                <tr
                                                    key={customer.id}
                                                    className={selectedCustomer?.id === customer.id ? 'selected' : ''}
                                                    onClick={() => setSelectedCustomer(customer)}
                                                >
                                                    <td className="radio-cell">
                                                        <input
                                                            type="radio"
                                                            name="customer"
                                                            checked={selectedCustomer?.id === customer.id}
                                                            onChange={() => setSelectedCustomer(customer)}
                                                        />
                                                    </td>
                                                    <td className="name-cell">
                                                        <strong>{customer.companyName}</strong>
                                                    </td>
                                                    <td className="mono">{customer.bizRegNo}</td>
                                                    <td>{customer.ceoName}</td>
                                                    <td className="mono">{customer.phone}</td>
                                                    <td className="address-cell">{customer.address}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div className="step-actions">
                            <div></div>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={!selectedCustomer}
                                onClick={() => setStep(2)}
                            >
                                품목 설정 →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: 품목 설정 (엑셀 그리드) */}
            {step === 2 && (
                <div className="step-content with-sidebar">
                    {/* 메인 그리드 */}
                    <div className="main-panel">
                        <div className="glass-card">
                            <div className="section-header">
                                <h2 className="section-title"><PackageIcon size={20} /> 품목 입력</h2>
                                <span className="customer-badge">
                                    <BuildingIcon size={14} /> {selectedCustomer?.companyName}
                                </span>
                            </div>

                            <p className="guide-text">
                                💡 품목명 입력 시 자동완성됩니다. 수량 입력 후 Enter를 누르면 다음 행으로 이동합니다.
                            </p>

                            {/* Excel-like Grid */}
                            <div className="grid-container">
                                <table className="order-table">
                                    <thead>
                                        <tr>
                                            <th className="col-no">No</th>
                                            <th className="col-product">품목</th>
                                            <th className="col-price">단가(원/kg)</th>
                                            <th className="col-qty">수량(kg)</th>
                                            <th className="col-amount">금액(원)</th>
                                            <th className="col-action"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, index) => (
                                            <tr key={row.id} className={row.productId ? 'filled' : ''}>
                                                <td className="col-no">{index + 1}</td>
                                                <td className="col-product">
                                                    <div className="product-input-wrapper" ref={activeRowId === row.id ? dropdownRef : null}>
                                                        <input
                                                            ref={el => { if (el) inputRefs.current.set(`name-${row.id}`, el) }}
                                                            type="text"
                                                            className="cell-input product-input"
                                                            value={row.productId ? row.productName : searchQuery}
                                                            onChange={(e) => {
                                                                if (!row.productId) {
                                                                    setSearchQuery(e.target.value)
                                                                    setActiveRowId(row.id)
                                                                    setShowDropdown(true)
                                                                }
                                                            }}
                                                            onFocus={() => {
                                                                setActiveRowId(row.id)
                                                                if (!row.productId && searchQuery) {
                                                                    setShowDropdown(true)
                                                                }
                                                            }}
                                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'name')}
                                                            placeholder="품목명 입력..."
                                                            readOnly={!!row.productId}
                                                        />
                                                        {row.productId && (
                                                            <button
                                                                className="clear-btn"
                                                                onClick={() => clearProduct(row.id, index)}
                                                            >✕</button>
                                                        )}

                                                        {/* Autocomplete Dropdown */}
                                                        {showDropdown && activeRowId === row.id && filteredProducts.length > 0 && (
                                                            <div className="autocomplete-dropdown">
                                                                {filteredProducts.map((product, idx) => (
                                                                    <div
                                                                        key={product.id}
                                                                        className={`dropdown-item ${idx === highlightIndex ? 'highlighted' : ''}`}
                                                                        onClick={() => selectProduct(row.id, product)}
                                                                        onMouseEnter={() => setHighlightIndex(idx)}
                                                                    >
                                                                        <span className="product-name">{product.name}</span>
                                                                        <span className="product-category">{product.category}</span>
                                                                        <span className="product-price">₩{formatCurrency(product.unitPrice)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="col-price">
                                                    {row.unitPrice > 0 ? `₩${formatCurrency(row.unitPrice)}` : '-'}
                                                </td>
                                                <td className="col-qty">
                                                    <input
                                                        ref={el => { if (el) inputRefs.current.set(`qty-${row.id}`, el) }}
                                                        type="number"
                                                        className="cell-input qty-input"
                                                        value={row.quantity || ''}
                                                        onChange={(e) => updateQuantity(row.id, parseFloat(e.target.value) || 0)}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'qty')}
                                                        placeholder="0"
                                                        disabled={!row.productId}
                                                    />
                                                </td>
                                                <td className="col-amount">
                                                    {row.totalAmount > 0 ? `₩${formatCurrency(row.totalAmount)}` : '-'}
                                                </td>
                                                <td className="col-action">
                                                    {rows.length > 1 && (
                                                        <button className="remove-btn" onClick={() => removeRow(row.id)}>🗑</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="add-row-tr">
                                            <td colSpan={6}>
                                                <button className="add-row-btn" onClick={addRow}>+ 품목 추가</button>
                                            </td>
                                        </tr>
                                        <tr className="total-row">
                                            <td colSpan={3} className="total-label">합계</td>
                                            <td className="total-qty">{formatCurrency(totalWeight)} kg</td>
                                            <td className="total-amount">₩{formatCurrency(totalAmount)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="step-actions glass-card">
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>
                                ← 고객 선택
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={validRows.length === 0}
                                onClick={() => setStep(3)}
                            >
                                배송 정보 →
                            </button>
                        </div>
                    </div>

                    {/* 이전 주문 사이드바 */}
                    <div className={`sidebar ${showPastOrders ? 'open' : 'collapsed'}`}>
                        <button
                            className="sidebar-toggle"
                            onClick={() => setShowPastOrders(!showPastOrders)}
                        >
                            {showPastOrders ? '▶' : '◀'}
                        </button>

                        {showPastOrders && (
                            <div className="sidebar-content glass-card">
                                <h3 className="sidebar-title"><ClipboardListIcon size={18} /> 이전 주문</h3>
                                <p className="sidebar-desc">{selectedCustomer?.companyName}의 과거 주문</p>

                                {pastOrders.length === 0 ? (
                                    <div className="empty-orders">
                                        <p>이전 주문 내역이 없습니다.</p>
                                    </div>
                                ) : (
                                    <div className="past-orders-list">
                                        {pastOrders.map(order => (
                                            <div key={order.id} className="past-order-card">
                                                <div className="order-header">
                                                    <span className="order-id">{order.id}</span>
                                                    <span className="order-date">{order.date}</span>
                                                </div>
                                                <div className="order-items-preview">
                                                    {order.items.map((item, i) => (
                                                        <span key={i} className="item-tag">
                                                            {item.productName} {item.qty}kg
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="order-footer">
                                                    <span className="order-total">₩{formatCurrency(order.totalAmount)}</span>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => loadFromPastOrder(order)}
                                                    >
                                                        불러오기
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: 배송 정보 */}
            {step === 3 && (
                <div className="step-content">
                    <div className="glass-card">
                        <h2 className="section-title">🚚 배송 정보</h2>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="label">배송일 *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={shipDate}
                                    onChange={(e) => setShipDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">주문 마감시간 *</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={cutOffAt}
                                    onChange={(e) => setCutOffAt(e.target.value)}
                                />
                            </div>
                            <div className="form-group full-width">
                                <label className="label">배송지 주소</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={shipTo}
                                    onChange={(e) => setShipTo(e.target.value)}
                                    placeholder="배송지 주소를 입력하세요"
                                />
                            </div>
                        </div>

                        {/* 주문 요약 */}
                        <div className="order-summary-box">
                            <h4><PackageIcon size={18} /> 주문 요약</h4>
                            <div className="summary-grid">
                                <div className="summary-item">
                                    <span className="summary-label">고객사</span>
                                    <span className="summary-value">{selectedCustomer?.companyName}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">품목 수</span>
                                    <span className="summary-value">{totalItems}개</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">총 중량</span>
                                    <span className="summary-value">{formatCurrency(totalWeight)} kg</span>
                                </div>
                                <div className="summary-item highlight">
                                    <span className="summary-label">총 금액</span>
                                    <span className="summary-value">₩{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="step-actions">
                            <button className="btn btn-secondary" onClick={() => setStep(2)}>
                                ← 품목 수정
                            </button>
                            <div className="flex gap-3">
                                <button className="btn btn-secondary" onClick={() => {
                                    alert('초안이 저장되었습니다.')
                                }}>
                                    초안 저장
                                </button>
                                <button
                                    className="btn btn-primary btn-lg"
                                    disabled={!shipDate || !cutOffAt}
                                    onClick={handleSubmit}
                                >
                                    주문장 발송 🔗
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
