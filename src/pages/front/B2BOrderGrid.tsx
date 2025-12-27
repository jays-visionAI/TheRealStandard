import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardListIcon } from '../../components/Icons'
import {
    getOrderSheetByToken,
    getOrderSheetItems,
    updateOrderSheet,
    setOrderSheetItems,
    type FirestoreOrderSheet,

} from '../../lib/orderService'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import './B2BOrderGrid.css'

// ============================================
// 상품 인터페이스
// ============================================
interface Product extends Omit<FirestoreProduct, 'createdAt' | 'updatedAt'> {
    unitPrice: number
    createdAt?: Date
    updatedAt?: Date
}

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
// 주문 상태
// ============================================
type OrderStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

// ============================================
// 메인 컴포넌트
// ============================================
export default function B2BOrderGrid() {
    const { token } = useParams()
    const navigate = useNavigate()

    // Firebase에서 직접 로드되는 데이터
    const [orderInfo, setOrderInfo] = useState<(Omit<FirestoreOrderSheet, 'createdAt' | 'updatedAt' | 'shipDate' | 'cutOffAt'> & {
        createdAt?: Date
        updatedAt?: Date
        shipDate?: Date
        cutOffAt?: Date
        lastSubmittedAt?: Date
    }) | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // 상태
    const [rows, setRows] = useState<OrderRow[]>([])
    const [status, setStatus] = useState<OrderStatus>('DRAFT')
    const [activeRowId, setActiveRowId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [highlightIndex, setHighlightIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [customerComment, setCustomerComment] = useState('')

    // Refs
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Firebase에서 데이터 로드
    const loadData = async () => {
        if (!token) return

        try {
            setLoading(true)
            setError(null)

            const [osData, productsData] = await Promise.all([
                getOrderSheetByToken(token),
                getAllProducts()
            ])

            if (osData) {
                const orderSheet = {
                    ...osData,
                    createdAt: osData.createdAt?.toDate?.() || new Date(),
                    updatedAt: osData.updatedAt?.toDate?.() || new Date(),
                    shipDate: osData.shipDate?.toDate?.() || undefined,
                    cutOffAt: osData.cutOffAt?.toDate?.() || undefined,
                }
                setOrderInfo(orderSheet)

                // 주문 상태 설정
                if (osData.status === 'SUBMITTED') {
                    setStatus('PENDING_APPROVAL')
                } else if (osData.status === 'CONFIRMED') {
                    setStatus('APPROVED')
                }

                // 기존 아이템 로드
                const items = await getOrderSheetItems(osData.id)
                let currentRows: OrderRow[] = []

                if (items && items.length > 0) {
                    currentRows = items.map(item => ({
                        id: item.id,
                        productId: item.productId,
                        productName: item.productName || '',
                        unitPrice: item.unitPrice,
                        quantity: item.qtyRequested || 0,
                        unit: item.unit as 'kg' | 'box' || 'kg',
                        estimatedWeight: item.estimatedKg || 0,
                        totalAmount: item.amount || 0
                    }))
                } else {
                    currentRows = [createEmptyRow()]
                }

                // 2. 카탈로그에서 선택한 품목이 있으면 추가
                const savedSelection = localStorage.getItem('trs_catalog_selection')
                if (savedSelection) {
                    const selection = JSON.parse(savedSelection)
                    const newRowsFromCatalog: OrderRow[] = selection.filter((sel: any) =>
                        !currentRows.find((row: OrderRow) => row.productId === sel.productId)
                    ).map((sel: any) => ({
                        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        productId: sel.productId,
                        productName: sel.name,
                        unitPrice: sel.wholesalePrice,
                        quantity: 0,
                        unit: sel.unit as 'kg' | 'box' || 'kg',
                        estimatedWeight: 0,
                        totalAmount: 0,
                    }))

                    if (newRowsFromCatalog.length > 0) {
                        currentRows = [...currentRows, ...newRowsFromCatalog]
                    }
                    localStorage.removeItem('trs_catalog_selection')
                }
                setRows(currentRows)


                if (osData.customerComment) {
                    setCustomerComment(osData.customerComment)
                }
            }

            // 상품 마스터 로드
            setProducts(productsData.map(p => ({
                ...p,
                unitPrice: p.wholesalePrice,
                createdAt: p.createdAt?.toDate?.() || new Date(),
                updatedAt: p.updatedAt?.toDate?.() || new Date(),
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
    }, [token])

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

    // 상품 검색 로직
    const searchProducts = useCallback((query: string): Product[] => {
        if (!query.trim()) return []
        const q = query.toLowerCase()
        const startsWithProducts = products.filter(p => p.name.toLowerCase().startsWith(q))
        const containsProducts = products.filter(p =>
            p.name.toLowerCase().includes(q) && !p.name.toLowerCase().startsWith(q)
        )
        return [...startsWithProducts, ...containsProducts]
    }, [products])

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
                    unit: product.unit as 'kg' | 'box',
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
                const product = products.find(p => p.id === row.productId)
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

    // 주문 제출
    const handleSubmit = async () => {
        const validRows = rows.filter(r => r.productId && r.quantity > 0)
        if (validRows.length === 0) {
            alert('최소 1개 이상의 품목을 주문해주세요.')
            return
        }

        if (!orderInfo) return

        try {
            setSaving(true)

            // 주문장 상태 업데이트
            await updateOrderSheet(orderInfo.id, {
                status: 'SUBMITTED',
                customerComment: customerComment,
            })

            // 주문 아이템 업데이트
            const updatedItems = validRows.map(row => ({
                productId: row.productId || '',
                productName: row.productName,
                unit: row.unit,
                unitPrice: row.unitPrice,
                qtyRequested: row.quantity,
                estimatedKg: row.estimatedWeight,
                amount: row.totalAmount
            }))

            await setOrderSheetItems(orderInfo.id, updatedItems)

            setStatus('PENDING_APPROVAL')
            alert('✅ 주문이 제출되었습니다.\n\n관리자 승인을 대기합니다.')
        } catch (err) {
            console.error('Submit failed:', err)
            alert('주문 제출에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // 통계 계산
    const vRows = rows.filter(r => r.productId && r.quantity > 0)
    const totalItems = vRows.length
    const totalWeight = vRows.reduce((sum, r) => sum + r.estimatedWeight, 0)
    const totalAmount = vRows.reduce((sum, r) => sum + r.totalAmount, 0)

    // 통화 포맷
    const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR').format(value)

    if (loading) {
        return (
            <div className="b2b-order-grid">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>주문서를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="b2b-order-grid">
                <div className="error-state">
                    <p>❌ {error}</p>
                    <button className="btn btn-primary" onClick={loadData}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    if (!orderInfo) {
        return <div className="p-10 text-center">주문 정보를 찾을 수 없습니다.</div>
    }

    // 상태별 렌더링
    if (status === 'PENDING_APPROVAL') {
        return (
            <div className="b2b-order-grid">
                <div className="pending-approval-view glass-card">
                    <div className="pending-icon">⏳</div>
                    <h2>고객 컨펌 완료</h2>
                    <p>주문이 제출되었습니다. 관리자 승인을 대기합니다.</p>

                    <div className="order-summary-card">
                        <div className="summary-row">
                            <span>주문 품목</span>
                            <span>{totalItems}개</span>
                        </div>
                        <div className="summary-row">
                            <span>예상 총 중량</span>
                            <span>{formatCurrency(totalWeight)} kg</span>
                        </div>
                        <div className="summary-row total">
                            <span>예상 총 금액</span>
                            <span className="total-amount">₩{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>

                    <div className="submitted-items">
                        <h4>주문 내역</h4>
                        <table className="mini-table">
                            <thead>
                                <tr>
                                    <th>품목</th>
                                    <th>수량</th>
                                    <th>예상중량</th>
                                    <th>금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vRows.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.productName}</td>
                                        <td>{row.quantity} {row.unit.toUpperCase()}</td>
                                        <td>{formatCurrency(row.estimatedWeight)} kg</td>
                                        <td>₩{formatCurrency(row.totalAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        className="btn btn-secondary mt-6"
                        onClick={() => navigate(`/order/${token}/tracking`)}
                    >
                        배송 현황 보기 →
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="b2b-order-grid">
            {/* Header */}
            <header className="order-header glass-card">
                <div className="header-left">
                    <h1><ClipboardListIcon size={24} /> {orderInfo.customerName} 주문서</h1>
                    <div className="order-meta">
                        <span className="meta-item">
                            <span className="meta-icon">📅</span>
                            배송: {orderInfo.shipDate?.toLocaleDateString() || '-'}
                        </span>
                        <span className="meta-item warning">
                            <span className="meta-icon">⏰</span>
                            마감: {orderInfo.cutOffAt?.toLocaleString() || '-'}
                        </span>
                    </div>
                </div>
                <div className="header-right">
                    <div className="status-badge draft">주문 작성 중</div>
                </div>
            </header>

            {/* Admin Comment Section */}
            {orderInfo.adminComment && (
                <div className="admin-comment-box glass-card animate-fade-in">
                    <div className="comment-label">📢 관리자 한마디</div>
                    <div className="comment-text">{orderInfo.adminComment}</div>
                </div>
            )}

            {/* Grid 안내 */}
            <div className="grid-guide glass-card">
                <span className="guide-icon">💡</span>
                <span>상품명을 입력하면 자동완성됩니다. 수량 입력 후 Enter를 누르면 다음 품목으로 이동합니다.</span>
            </div>

            {/* Excel-like Grid */}
            <div className="grid-container glass-card">
                <table className="order-table">
                    <thead>
                        <tr>
                            <th className="col-no">No</th>
                            <th className="col-product">품목</th>
                            <th className="col-price">단가(원/kg)</th>
                            <th className="col-qty">수량</th>
                            <th className="col-weight">예상중량(kg)</th>
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
                                                className="clear-product-btn"
                                                onClick={() => {
                                                    setRows(prev => prev.map((r) =>
                                                        r.id === row.id ? { ...createEmptyRow(), id: row.id } : r
                                                    ))
                                                    const nameInput = inputRefs.current.get(`name-${row.id}`)
                                                    if (nameInput) nameInput.focus()
                                                }}
                                            >
                                                ✕
                                            </button>
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
                                                        <span className="product-price">₩{formatCurrency(product.unitPrice)}/kg</span>
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
                                    <div className="qty-input-wrapper">
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
                                        <span className="qty-unit">
                                            {row.unit.toUpperCase()}
                                        </span>
                                    </div>
                                </td>
                                <td className="col-weight">
                                    {row.estimatedWeight > 0 ? formatCurrency(row.estimatedWeight) : '-'}
                                </td>
                                <td className="col-amount">
                                    {row.totalAmount > 0 ? `₩${formatCurrency(row.totalAmount)}` : '-'}
                                </td>
                                <td className="col-action">
                                    {rows.length > 1 && (
                                        <button
                                            className="remove-row-btn"
                                            onClick={() => removeRow(row.id)}
                                            title="행 삭제"
                                        >
                                            🗑
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="add-row-tr">
                            <td colSpan={7}>
                                <button className="add-row-btn" onClick={addRow}>
                                    + 품목 추가
                                </button>
                            </td>
                        </tr>
                        <tr className="total-row">
                            <td colSpan={3} className="total-label">총계</td>
                            <td className="total-items">{totalItems} 품목</td>
                            <td className="total-weight">{formatCurrency(totalWeight)} kg</td>
                            <td className="total-amount">₩{formatCurrency(totalAmount)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Customer Comment Section */}
            <div className="customer-comment-container glass-card mb-4">
                <div className="section-title-sm">💬 고객 요청사항 / 댓글</div>
                <textarea
                    className="input textarea"
                    value={customerComment}
                    onChange={(e) => setCustomerComment(e.target.value)}
                    placeholder="관리자에게 전달할 추가 요청사항이나 문의사항이 있다면 입력해주세요."
                    rows={3}
                />
            </div>

            {/* Footer Actions */}
            <footer className="order-footer glass-card">
                <div className="footer-summary">
                    <span className="summary-item">
                        <strong>{totalItems}</strong> 품목
                    </span>
                    <span className="summary-item">
                        총 <strong>{formatCurrency(totalWeight)}</strong> kg
                    </span>
                    <span className="summary-item total">
                        합계 <strong>₩{formatCurrency(totalAmount)}</strong>
                    </span>
                </div>
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleSubmit}
                    disabled={totalItems === 0 || saving}
                >
                    {saving ? '제출 중...' : '주문 컨펌 및 승인 요청 📨'}
                </button>
            </footer>
        </div>
    )
}
