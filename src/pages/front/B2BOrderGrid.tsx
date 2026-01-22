import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ClipboardListIcon } from '../../components/Icons'
import { getOrderSheetByToken, getOrderSheetItems, updateOrderSheet, setOrderSheetItems, type FirestoreOrderSheet } from '../../lib/orderService'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { getUserById } from '../../lib/userService'
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
    const location = useLocation()
    const { user } = useAuth()

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
    const [rows, setRows] = useState<(OrderRow & { checked?: boolean })[]>([])
    const [status, setStatus] = useState<OrderStatus>('DRAFT')
    const [activeRowId, setActiveRowId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [highlightIndex, setHighlightIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [customerComment, setCustomerComment] = useState('')
    const [orderUnit, setOrderUnit] = useState<'kg' | 'box'>('box')

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
                // Secondary Guard: Ensure customer is active before allowing order entry
                const customerData = await getUserById(osData.customerOrgId)
                if (customerData?.status !== 'ACTIVE') {
                    console.warn('Customer not active. Redirecting to landing...')
                    navigate(`/order/${token}`)
                    return
                }

                // Authorization Guard: Only allow the correct user/org
                if (!user) {
                    console.warn('No user. Redirecting to landing...')
                    navigate(`/order/${token}`)
                    return
                }

                if (user.orgId !== osData.customerOrgId) {
                    alert('해당 주문장에 대한 접근 권한이 없습니다. 올바른 파트너 계정으로 로그인해주세요.')
                    navigate('/order/list')
                    return
                }

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
                let currentRows: (OrderRow & { checked?: boolean })[] = []

                if (items && items.length > 0) {
                    // 첫 번째 아이템의 단위를 보고 전체 주문 단위를 추론 (모두 동일하다고 가정)
                    const firstUnit = items[0].unit as 'kg' | 'box'
                    if (firstUnit === 'box') {
                        setOrderUnit('box')
                    }

                    currentRows = items.map(item => ({
                        id: item.id,
                        productId: item.productId,
                        productName: item.productName || '',
                        unitPrice: item.unitPrice,
                        quantity: item.qtyRequested || 0,
                        unit: item.unit as 'kg' | 'box' || 'kg',
                        estimatedWeight: item.estimatedKg || 0,
                        totalAmount: item.amount || 0,
                        checked: false
                    }))
                } else {
                    currentRows = [createEmptyRow()]
                }

                // 2. 카탈로그에서 선택한 품목이 있으면 추가
                const savedSelection = localStorage.getItem('trs_catalog_selection')
                if (savedSelection) {
                    const selection = JSON.parse(savedSelection)
                    const newRowsFromCatalog = selection.filter((sel: any) =>
                        !currentRows.find((row) => row.productId === sel.productId)
                    ).map((sel: any) => ({
                        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        productId: sel.productId,
                        productName: sel.name,
                        unitPrice: sel.wholesalePrice,
                        quantity: 0,
                        unit: sel.unit as 'kg' | 'box' || 'kg',
                        estimatedWeight: 0,
                        totalAmount: 0,
                        checked: false
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
    function createEmptyRow(): OrderRow & { checked?: boolean } {
        return {
            id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId: null,
            productName: '',
            unitPrice: 0,
            quantity: 0,
            unit: orderUnit, // 현재 설정된 단위 사용
            estimatedWeight: 0,
            totalAmount: 0,
            checked: false
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
                    unit: orderUnit, // 현재 설정된 단위 사용
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

    // 주문 단위 변경 핸들러
    const handleUnitChange = (newUnit: 'kg' | 'box') => {
        if (newUnit === orderUnit) return;

        if (newUnit === 'box') {
            // Box 단위로 전환 시 검증
            const filledRows = rows.filter(r => r.productId);
            const rowsWithoutBoxWeight = filledRows.filter(row => {
                const product = products.find(p => p.id === row.productId);
                return !product?.boxWeight || product.boxWeight <= 0;
            });

            if (rowsWithoutBoxWeight.length > 0) {
                const productNames = rowsWithoutBoxWeight.map(r => r.productName).join(', ');
                alert(`⚠️ 박스 단위 전환 불가\n\n다음 상품에 예상중량/Box가 설정되어 있지 않습니다:\n${productNames}\n\n관리자에게 문의해주세요.`);
                return;
            }

            // 전환 확인 모달
            const confirmed = confirm(
                '📦 박스 단위 주문으로 전환\n\n주문 리스트 중 1박스 예상중량보다 적은 Kg으로 주문한 항목이 있는 경우 1박스당 주문수량으로 자동 보정합니다.\n\n확인을 눌러 전환하시겠습니까?'
            );

            if (!confirmed) return;

            // Box 단위로 변환
            setRows(prevRows => prevRows.map(row => {
                if (!row.productId) return { ...row, unit: 'box' };
                const product = products.find(p => p.id === row.productId);
                const weightPerBox = product?.boxWeight || 1;

                // Kg -> Box 변환 (올림 처리하여 최소 1박스)
                let newQuantity = Math.ceil(row.estimatedWeight / weightPerBox);
                if (newQuantity < 1 && row.estimatedWeight > 0) newQuantity = 1;

                const newEstimatedWeight = newQuantity * weightPerBox;
                const newTotalAmount = newEstimatedWeight * row.unitPrice;

                return {
                    ...row,
                    quantity: newQuantity,
                    unit: 'box',
                    estimatedWeight: newEstimatedWeight,
                    totalAmount: newTotalAmount
                };
            }));
            setOrderUnit('box');
        } else {
            // Kg 단위로 전환 (Box -> Kg)
            setRows(prevRows => prevRows.map(row => {
                if (!row.productId) return { ...row, unit: 'kg' };

                // Box에서 Kg로 변환: 예상중량 그대로 유지, quantity = estimatedWeight
                return {
                    ...row,
                    quantity: row.estimatedWeight,
                    unit: 'kg'
                };
            }));
            setOrderUnit('kg');
        }
    };

    // 수량 변경 시 계산
    const updateQuantity = (rowId: string, rawQuantity: number) => {
        const quantity = Math.max(0, rawQuantity)
        setRows(prev => prev.map(row => {
            if (row.id === rowId) {
                const product = products.find(p => p.id === row.productId)
                let estimatedWeight = quantity

                if (orderUnit === 'box') {
                    const weightPerBox = product?.boxWeight || 1
                    estimatedWeight = quantity * weightPerBox
                }

                const totalAmount = row.unitPrice * estimatedWeight

                return {
                    ...row,
                    quantity,
                    estimatedWeight,
                    totalAmount,
                    unit: orderUnit
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

    // 체크박스 토글
    const toggleCheck = (rowId: string) => {
        setRows(prev => prev.map(row =>
            row.id === rowId ? { ...row, checked: !row.checked } : row
        ))
    }

    // 전체 선택 토글
    const toggleAllCheck = (checked: boolean) => {
        setRows(prev => prev.map(row => ({ ...row, checked })))
    }

    // 선택된 행 삭제
    const deleteSelectedRows = () => {
        const count = rows.filter(r => r.checked).length
        if (count === 0) return

        if (confirm(`선택한 ${count}개 항목을 삭제하시겠습니까?`)) {
            setRows(prev => {
                const left = prev.filter(r => !r.checked)
                return left.length > 0 ? left : [createEmptyRow()]
            })
        }
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

        if (!user) {
            if (confirm('주문을 제출하려면 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?')) {
                const currentUrl = location.pathname + location.search
                navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`)
            }
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
    const checkedCount = rows.filter(r => r.checked).length

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
            <div className="grid-guide glass-card flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="guide-icon">💡</span>
                    <span>상품명을 입력하면 자동완성됩니다. 수량 입력 후 Enter를 누르면 다음 품목으로 이동합니다.</span>
                </div>

                <div className="order-unit-toggle flex items-center gap-3">
                    <span className="text-sm text-secondary">주문 단위:</span>
                    <div className="ios-toggle-wrapper flex items-center gap-2">
                        <span className={`text-sm font-medium ${orderUnit === 'box' ? 'text-primary' : 'text-gray-400'}`}>Box 단위</span>
                        <button
                            className={`ios-toggle ${orderUnit === 'kg' ? 'active' : ''}`}
                            onClick={() => handleUnitChange(orderUnit === 'kg' ? 'box' : 'kg')}
                            style={{
                                width: '51px',
                                height: '31px',
                                borderRadius: '31px',
                                backgroundColor: orderUnit === 'kg' ? '#34c759' : '#e5e5ea',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background-color 0.2s ease',
                                padding: 0,
                            }}
                        >
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: orderUnit === 'kg' ? '22px' : '2px',
                                    width: '27px',
                                    height: '27px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    transition: 'left 0.2s ease',
                                }}
                            />
                        </button>
                        <span className={`text-sm font-medium ${orderUnit === 'kg' ? 'text-primary' : 'text-gray-400'}`}>Kg 단위</span>
                    </div>
                </div>

                <div className="left-actions ml-4">
                    <button
                        className="btn btn-xs btn-outline-danger"
                        disabled={checkedCount === 0}
                        onClick={deleteSelectedRows}
                    >
                        🗑 선택 삭제 ({checkedCount})
                    </button>
                </div>
            </div>

            {/* Excel-like Grid */}
            <div className="grid-container glass-card">
                <table className="order-table">
                    <thead>
                        <tr>
                            <th className="col-check" style={{ width: '40px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    onChange={(e) => toggleAllCheck(e.target.checked)}
                                    checked={rows.length > 0 && rows.every(r => r.checked)}
                                />
                            </th>
                            <th className="col-no">No</th>
                            <th className="col-product">품목</th>
                            <th className="col-unit mobile-hidden" style={{ width: '100px', fontSize: '13px' }}>예상중량/Box</th>
                            <th className="col-price">단가(원/kg)</th>
                            <th className="col-qty">수량 ({orderUnit === 'kg' ? 'Kg' : 'Box'})</th>
                            <th className="col-weight">예상중량(kg)</th>
                            <th className="col-amount">금액(원)</th>
                            <th className="col-action"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id} className={`${row.productId ? 'filled' : ''} ${row.checked ? 'bg-blue-50' : ''}`}>
                                <td className="col-check" style={{ textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!row.checked}
                                        onChange={() => toggleCheck(row.id)}
                                    />
                                </td>
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
                                                        <span className="product-category">{product.category1}</span>
                                                        <span className="product-price">₩{formatCurrency(product.unitPrice)}/kg</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="col-unit text-muted mobile-hidden" style={{ fontSize: '13px', textAlign: 'center' }}>
                                    {(() => {
                                        const p = products.find(prod => prod.id === row.productId);
                                        return p ? (p.boxWeight ? `${p.boxWeight}kg/Box` : 'kg') : '-';
                                    })()}
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
                                            min="0"
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
                                    <button
                                        className="remove-row-btn"
                                        style={{ fontSize: '1.2rem', padding: '8px', color: '#ef4444' }}
                                        onClick={() => {
                                            if (confirm("이 줄을 삭제하시겠습니까?")) {
                                                removeRow(row.id)
                                            }
                                        }}
                                        title="행 삭제"
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="add-row-tr">
                            <td colSpan={9}>
                                <button className="add-row-btn" onClick={addRow}>
                                    + 품목 추가
                                </button>
                            </td>
                        </tr>
                        <tr className="total-row">
                            <td colSpan={5} className="total-label">총계</td>
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

                <div className="flex gap-4">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleSubmit}
                        disabled={totalItems === 0 || saving}
                    >
                        {saving ? '제출 중...' : '주문 컨펌 및 승인 요청 📨'}
                    </button>
                </div>
            </footer>
        </div>
    )
}
