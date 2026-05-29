import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FileEditIcon,
    BuildingIcon,
    SearchIcon,
    StarIcon,
    MapPinIcon,
    PhoneIcon,
    ClipboardListIcon,
    PackageIcon,
    XIcon,
    PlusIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '../../components/Icons'
import { getAllSupplierUsers, type FirestoreUser } from '../../lib/userService'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { compareProductOrder } from '../../lib/productSortOrder'
import {
    createPurchaseOrder,
    getAllPurchaseOrders,
    getAllOrderSheets,
    getOrderSheetItems,
    type FirestorePurchaseOrder,
    type FirestoreOrderSheet
} from '../../lib/orderService'
import { runAllDetections } from '../../lib/notificationService'
import { Timestamp, collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import './OrderSheetCreate.css'

// 로컬 타입
type Supplier = Omit<FirestoreUser, 'createdAt' | 'updatedAt'> & {
    companyName: string
    createdAt?: Date
    updatedAt?: Date
}

interface Product extends Omit<FirestoreProduct, 'createdAt' | 'updatedAt'> {
    unitPrice: number
    createdAt?: Date
    updatedAt?: Date
}

interface OrderRow {
    id: string
    productId: string | null
    productName: string
    unitPrice: number
    quantity: number
    unit: 'kg' | 'box'
    boxWeight: number
    estimatedWeight: number
    totalAmount: number
    checked?: boolean
}

// 숫자 포맷
const formatCurrency = (num: number) => num.toLocaleString()

export default function PurchaseOrderCreate() {
    const navigate = useNavigate()

    // Data states
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [pastPurchaseOrders, setPastPurchaseOrders] = useState<FirestorePurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Step management
    const [step, setStep] = useState(1)

    // Step 1: Supplier selection
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
    const [supplierSearch, setSupplierSearch] = useState('')

    // Step 2: Items
    const [rows, setRows] = useState<OrderRow[]>([])
    const [activeRowId, setActiveRowId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [highlightIndex, setHighlightIndex] = useState(0)

    // Kg/Box 단위 전환
    const [orderUnit, setOrderUnit] = useState<'kg' | 'box'>('kg')

    // Sidebar
    const [showSidebar, setShowSidebar] = useState(true)
    const [sidebarTab, setSidebarTab] = useState<'customerOrders' | 'pastPO'>('customerOrders')
    const [customerOrders, setCustomerOrders] = useState<FirestoreOrderSheet[]>([])

    // Step 3: PO Info
    const [expectedArrivalDate, setExpectedArrivalDate] = useState('')
    const [memo, setMemo] = useState('')

    // Refs
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
    const dropdownRef = useRef<HTMLDivElement>(null)

    const loadData = async () => {
        try {
            setLoading(true)
            const [suppliersData, productsData, poData, orderSheetsData] = await Promise.all([
                getAllSupplierUsers(),
                getAllProducts(),
                getAllPurchaseOrders(),
                getAllOrderSheets()
            ])

            setSuppliers(suppliersData.map(s => ({
                ...s,
                companyName: s.business?.companyName || s.name || '',
                createdAt: s.createdAt?.toDate?.(),
                updatedAt: s.updatedAt?.toDate?.(),
            })))

            setProducts(productsData.map(p => ({
                ...p,
                unitPrice: p.costPrice,
                createdAt: p.createdAt?.toDate?.(),
                updatedAt: p.updatedAt?.toDate?.(),
            })).sort(compareProductOrder))

            setPastPurchaseOrders(poData)
            setCustomerOrders(orderSheetsData)
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Logic for rows
    const createEmptyRow = (): OrderRow => ({
        id: Math.random().toString(36).substr(2, 9),
        productId: null,
        productName: '',
        unitPrice: 0,
        quantity: 0,
        unit: 'kg',
        boxWeight: 0,
        estimatedWeight: 0,
        totalAmount: 0,
        checked: false
    })

    useEffect(() => {
        if (rows.length === 0) {
            setRows([createEmptyRow()])
        }
    }, [rows])

    // 수량 업데이트 로직 (Kg/Box 단위 반영)
    const updateQuantity = (rowId: string, rawQty: number) => {
        const qty = Math.max(0, rawQty)
        setRows(prev => prev.map(row => {
            if (row.id !== rowId) return row

            let estimatedWeight = 0
            let totalAmount = 0

            if (orderUnit === 'kg') {
                estimatedWeight = qty
                totalAmount = qty * row.unitPrice
            } else {
                estimatedWeight = qty * (row.boxWeight || 0)
                totalAmount = estimatedWeight * row.unitPrice
            }

            return {
                ...row,
                quantity: qty,
                estimatedWeight,
                totalAmount
            }
        }))
    }

    const handleRowUpdate = (id: string, updates: Partial<OrderRow>) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                const updated = { ...row, ...updates }
                if (orderUnit === 'kg') {
                    updated.estimatedWeight = updated.quantity
                    updated.totalAmount = updated.quantity * updated.unitPrice
                } else {
                    updated.estimatedWeight = updated.quantity * (updated.boxWeight || 0)
                    updated.totalAmount = updated.estimatedWeight * updated.unitPrice
                }
                return updated
            }
            return row
        }))
    }

    const addRow = () => {
        setRows(prev => [...prev, createEmptyRow()])
    }

    const deleteRow = (id: string) => {
        if (rows.length === 1) {
            setRows([createEmptyRow()])
            return
        }
        setRows(prev => prev.filter(r => r.id !== id))
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
        const checkedCount = rows.filter(r => r.checked).length
        if (checkedCount === 0) return

        if (confirm(`선택한 ${checkedCount}개 품목을 삭제하시겠습니까?`)) {
            setRows(prev => {
                const remaining = prev.filter(r => !r.checked)
                return remaining.length > 0 ? remaining : [createEmptyRow()]
            })
        }
    }

    const clearProduct = (rowId: string) => {
        setRows(prev => prev.map(row => {
            if (row.id === rowId) {
                return createEmptyRow()
            }
            return row
        }))
    }

    // Product search logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProducts([])
            return
        }
        const q = searchQuery.toLowerCase()
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.category1.toLowerCase().includes(q)
        ).slice(0, 10)
        setFilteredProducts(filtered)
        setHighlightIndex(0)
    }, [searchQuery, products])

    const selectProduct = (rowId: string, product: Product) => {
        const boxWeight = product.boxWeight || 0
        handleRowUpdate(rowId, {
            productId: product.id,
            productName: product.name,
            unitPrice: product.costPrice,
            boxWeight: boxWeight
        })
        setShowDropdown(false)
        setSearchQuery('')
        setActiveRowId(null)
    }

    // 키보드 핸들러
    const handleKeyDown = (e: React.KeyboardEvent, rowId: string, field: string) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex(prev => Math.min(prev + 1, filteredProducts.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (showDropdown && filteredProducts.length > 0) {
                selectProduct(rowId, filteredProducts[highlightIndex])
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false)
        }
    }

    // 이전 발주서 복사
    const copyPastOrder = async (po: FirestorePurchaseOrder) => {
        if (!confirm(`발주 #${po.id.slice(-6)} 품목을 가져오시겠습니까?`)) return

        try {
            const itemsQuery = query(
                collection(db, 'purchaseOrderItems'),
                where('purchaseOrderId', '==', po.id)
            )
            const itemsSnap = await getDocs(itemsQuery)

            const newRows: OrderRow[] = itemsSnap.docs.map((doc, idx) => {
                const item = doc.data()
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    productId: item.productId || null,
                    productName: item.productName || '',
                    unitPrice: item.unitPrice || 0,
                    quantity: 0,
                    unit: 'kg',
                    boxWeight: 0,
                    estimatedWeight: 0,
                    totalAmount: 0
                }
            })

            if (newRows.length > 0) {
                setRows(newRows)
                alert('이전 발주서 품목이 복사되었습니다. 수량을 입력해주세요.')
            } else {
                alert('복사할 품목이 없습니다.')
            }
        } catch (err) {
            console.error('Failed to copy past order:', err)
            alert('복사에 실패했습니다.')
        }
    }

    // 고객 주문서 복사 (매입 발주로 변환)
    const copyCustomerOrder = async (orderSheet: FirestoreOrderSheet) => {
        if (!confirm(`'${orderSheet.customerName}'의 주문 품목을 가져오시겠습니까?`)) return

        try {
            setLoading(true)
            const items = await getOrderSheetItems(orderSheet.id)

            if (!items || items.length === 0) {
                alert('가져올 품목이 없습니다.')
                return
            }

            // 전체 주문 단위를 'box'로 강제 설정 (사용자 요청: 박스 단위로 가져오기)
            setOrderUnit('box')

            const newRows: OrderRow[] = items.map(item => {
                const product = products.find(p => p.id === item.productId)
                const boxWeight = product?.boxWeight || 0

                let qty = 0
                if (item.unit === 'box') {
                    qty = item.qtyRequested || 0
                } else {
                    // 원래 Kg 주문이었다면 박스로 환산
                    qty = boxWeight > 0 ? Math.ceil((item.estimatedKg || 0) / boxWeight) : (item.estimatedKg || 0)
                }

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    productId: item.productId,
                    productName: product?.name || item.productName,
                    unitPrice: product?.costPrice || 0, // 기본 매입단가(costPrice) 세팅
                    quantity: qty,
                    unit: 'box',
                    boxWeight: boxWeight,
                    estimatedWeight: qty * boxWeight,
                    totalAmount: (product?.costPrice || 0) * (qty * boxWeight)
                }
            })

            setRows(newRows)
            alert('고객 주문 품목이 반영되었습니다. 수량과 단가를 확인해주세요.')
        } catch (err) {
            console.error('Failed to copy customer order:', err)
            alert('주문 정보를 가져오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // Submit PO
    const handleSubmit = async () => {
        if (!selectedSupplier || rows.filter(r => r.productId).length === 0) {
            alert('공급사와 품목을 확인해주세요.')
            return
        }

        try {
            setSaving(true)
            const validRows = rows.filter(r => r.productId)
            const totalsKg = validRows.reduce((sum, r) => sum + r.estimatedWeight, 0)
            const totalsAmount = validRows.reduce((sum, r) => sum + r.totalAmount, 0)
            const token = 'po-' + Math.random().toString(36).substr(2, 9)

            const poData = {
                supplierOrgId: selectedSupplier.id,
                supplierName: selectedSupplier.companyName,
                status: 'SENT' as const, // Automatically set to SENT as per request
                inviteTokenId: token,
                totalsKg,
                totalsAmount,
                expectedArrivalDate: expectedArrivalDate ? Timestamp.fromDate(new Date(expectedArrivalDate)) : null,
                memo: memo
            }

            const newPO = await createPurchaseOrder(poData as any)

            const itemsCollection = collection(db, 'purchaseOrderItems')
            for (const row of validRows) {
                const itemRef = doc(itemsCollection)
                await setDoc(itemRef, {
                    id: itemRef.id,
                    purchaseOrderId: newPO.id,
                    productId: row.productId,
                    productName: row.productName,
                    qtyKg: row.estimatedWeight,
                    unitPrice: row.unitPrice,
                    amount: row.totalAmount
                })
            }


            // 매입 발주 생성 후 재고/결품/단가표/정산 감지 트리거 — 백그라운드 실행
            runAllDetections().catch(err => {
                console.warn('Background detection after PO creation failed:', err)
            })

            const link = `${window.location.origin}/purchase-order/${token}`
            navigator.clipboard.writeText(link)
            alert(`✅ 매입 발주서가 생성되었습니다!\n\n공급사 링크가 클립보드에 복사되었습니다.\n\n${link}`)
            navigate('/admin/purchase-orders')
        } catch (err) {
            console.error('PO creation failed:', err)
            alert('발주서 생성에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // Filtered suppliers
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.companyName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
            (s.business?.bizRegNo || '').includes(supplierSearch)
        )
    }, [suppliers, supplierSearch])

    // Totals
    const validRows = rows.filter(r => r.productId)
    const totalItems = validRows.length
    const totalWeight = rows.reduce((sum, r) => sum + r.estimatedWeight, 0)
    const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0)

    if (loading) return <div className="loading-state"><div className="spinner"></div><p>데이터 로딩 중...</p></div>

    return (
        <div className="order-sheet-create">
            <header className="page-header">
                <div className="header-left">
                    <h1>신규 매입 발주서 생성</h1>
                    <p className="text-secondary">공급사에 보낼 발주 품목을 설정합니다</p>
                </div>
            </header>

            <div className="steps-bar glass-card">
                <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                    <div className="step-number">{step > 1 ? '✓' : '1'}</div>
                    <span>공급사 선택</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                    <div className="step-number">{step > 2 ? '✓' : '2'}</div>
                    <span>품목 설정</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                    <div className="step-number">3</div>
                    <span>발주 정보</span>
                </div>
            </div>

            {step === 1 && (
                <div className="step-content">
                    <div className="glass-card">
                        <h2 className="section-title"><BuildingIcon size={20} /> 공급사 선택</h2>
                        <div className="search-box mb-4">
                            <span className="search-icon"><SearchIcon size={18} /></span>
                            <input
                                type="text"
                                className="input"
                                placeholder="공급사명 또는 사업자번호 검색..."
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
                            />
                        </div>
                        <div className="customer-table-container">
                            <table className="customer-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}></th>
                                        <th>공급사명</th>
                                        <th>분류</th>
                                        <th>대표자</th>
                                        <th>전화번호</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSuppliers.map(s => (
                                        <tr
                                            key={s.id}
                                            className={selectedSupplier?.id === s.id ? 'selected' : ''}
                                            onClick={() => setSelectedSupplier(s)}
                                        >
                                            <td className="radio-cell">
                                                <input
                                                    type="radio"
                                                    checked={selectedSupplier?.id === s.id}
                                                    onChange={() => setSelectedSupplier(s)}
                                                />
                                            </td>
                                            <td><strong>{s.companyName}</strong></td>
                                            <td>{s.business?.productCategories?.[0] || '기타'}</td>
                                            <td>{s.business?.ceoName || '-'}</td>
                                            <td className="mono">{s.business?.tel || s.phone || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="step-actions">
                            <div></div>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={!selectedSupplier}
                                onClick={() => setStep(2)}
                            >
                                품목 설정 →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: 품목 설정 */}
            {step === 2 && (
                <div className="step-content with-sidebar">
                    {/* 메인 그리드 */}
                    <div className="main-panel">
                        <div className="glass-card">
                            <div className="section-header">
                                <h2 className="section-title"><PackageIcon size={20} /> 품목 입력</h2>
                                <span className="customer-badge">
                                    <BuildingIcon size={14} /> {selectedSupplier?.companyName}
                                </span>
                            </div>

                            <p className="guide-text">
                                💡 품목명 입력 시 자동완성됩니다. 수량 입력 후 Enter를 누르면 다음 행으로 이동합니다.
                            </p>

                            <div className="grid-toolbar mb-3 flex justify-between items-center">
                                <div className="left-actions">
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={!rows.some(r => r.checked)}
                                        onClick={deleteSelectedRows}
                                    >
                                        🗑 선택 삭제 ({rows.filter(r => r.checked).length})
                                    </button>
                                </div>
                                <div className="order-unit-toggle-bar" style={{ margin: 0, padding: 0, background: 'none' }}>
                                    <div className="toggle-group">
                                        <button
                                            className={`toggle-btn ${orderUnit === 'kg' ? 'active' : ''}`}
                                            onClick={() => setOrderUnit('kg')}
                                        >
                                            Kg 단위
                                        </button>
                                        <button
                                            className={`toggle-btn ${orderUnit === 'box' ? 'active' : ''}`}
                                            onClick={() => setOrderUnit('box')}
                                        >
                                            Box 단위
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Excel-like Grid */}
                            <div className="grid-container">
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
                                            <th className="col-unit" style={{ width: '100px', fontSize: '13px' }}>예상중량/Box</th>
                                            <th className="col-price">단가(원/kg)</th>
                                            <th className="col-qty">주문수량 ({orderUnit === 'kg' ? 'Kg' : 'Box'})</th>
                                            <th className="col-weight">예상중량(kg)</th>
                                            <th className="col-amount">금액(원)</th>
                                            <th className="col-action"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, index) => (
                                            <tr key={row.id} className={`${row.productId ? 'filled' : ''} ${row.checked ? 'selected-row' : ''}`}>
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
                                                        {/* Redundant clear button removed by user request */}

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
                                                                        <span className="product-price">₩{formatCurrency(product.costPrice)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="col-unit">
                                                    {row.boxWeight ? `${row.boxWeight}kg` : '-'}
                                                </td>
                                                <td className="col-price">
                                                    {row.productId ? (
                                                        <input
                                                            type="number"
                                                            className="cell-input price-input"
                                                            value={row.unitPrice || ''}
                                                            onChange={(e) => handleRowUpdate(row.id, { unitPrice: Number(e.target.value) })}
                                                            placeholder="0"
                                                        />
                                                    ) : '-'}
                                                </td>
                                                <td className="col-qty">
                                                    <input
                                                        ref={el => { if (el) inputRefs.current.set(`qty-${row.id}`, el) }}
                                                        type="number"
                                                        className="cell-input qty-input"
                                                        value={row.quantity || ''}
                                                        onChange={(e) => updateQuantity(row.id, Number(e.target.value))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                if (index === rows.length - 1) {
                                                                    addRow()
                                                                }
                                                            }
                                                        }}
                                                        placeholder="0"
                                                        min="0"
                                                        disabled={!row.productId}
                                                    />
                                                </td>
                                                <td className="col-weight">
                                                    {row.estimatedWeight > 0 ? formatCurrency(row.estimatedWeight) : '-'}
                                                </td>
                                                <td className="col-amount">
                                                    {row.totalAmount > 0 ? `₩${formatCurrency(row.totalAmount)}` : '-'}
                                                </td>
                                                <td className="col-action">
                                                    <button
                                                        className="delete-row-btn"
                                                        onClick={() => deleteRow(row.id)}
                                                        title="행 삭제"
                                                        style={{ color: '#ef4444', opacity: 1, fontSize: '1.2rem' }}
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
                                                <button className="add-row-btn" onClick={addRow}>+ 품목 추가</button>
                                            </td>
                                        </tr>
                                        <tr className="total-row">
                                            <td className="total-label" colSpan={5}>합계</td>
                                            <td className="total-qty">{totalItems} 품목</td>
                                            <td className="total-weight">{formatCurrency(totalWeight)} kg</td>
                                            <td className="total-amount">₩{formatCurrency(totalAmount)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="step-actions glass-card">
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>
                                ← 공급사 선택
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={validRows.length === 0}
                                onClick={() => setStep(3)}
                            >
                                발주 정보 →
                            </button>
                        </div>
                    </div>

                    {/* 매입발주서 템플릿 사이드바 */}
                    <div className={`sidebar ${showSidebar ? 'open' : 'collapsed'}`}>
                        <button
                            className="sidebar-toggle"
                            onClick={() => setShowSidebar(!showSidebar)}
                            title={showSidebar ? "접기" : "템플릿 보기"}
                        >
                            {showSidebar ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
                        </button>

                        {showSidebar && (
                            <div className="sidebar-content glass-card">
                                <h3 className="sidebar-title"><ClipboardListIcon size={18} /> 템플릿 및 주문현황</h3>

                                <div className="sidebar-tabs">
                                    <button
                                        className={`tab-btn ${sidebarTab === 'customerOrders' ? 'active' : ''}`}
                                        onClick={() => setSidebarTab('customerOrders')}
                                    >
                                        고객 주문 현황
                                    </button>
                                    <button
                                        className={`tab-btn ${sidebarTab === 'pastPO' ? 'active' : ''}`}
                                        onClick={() => setSidebarTab('pastPO')}
                                    >
                                        이전 매입발주
                                    </button>
                                </div>

                                <div className="tab-content">
                                    {sidebarTab === 'customerOrders' ? (
                                        <div className="template-list">
                                            {customerOrders.filter(o => o.status === 'CONFIRMED').length === 0 ? (
                                                <p className="empty-msg">주문 확정된 고객 주문이 없습니다.</p>
                                            ) : (
                                                customerOrders
                                                    .filter(o => o.status === 'CONFIRMED')
                                                    .map(order => (
                                                        <div key={order.id} className="template-card-v2">
                                                            <div className="card-left">
                                                                <div className="card-row-1">
                                                                    <span className="card-title">{order.customerName}</span>
                                                                </div>
                                                                <div className="card-row-2">
                                                                    <span className="card-date">
                                                                        주문일: {order.createdAt?.toDate?.().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '')}
                                                                        {order.cutOffAt && ` (마감: ${order.cutOffAt.toDate().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })})`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="card-right">
                                                                <button
                                                                    className="btn btn-xs btn-outline"
                                                                    onClick={() => copyCustomerOrder(order)}
                                                                >
                                                                    반영하기
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    ) : (
                                        <div className="template-list">
                                            {pastPurchaseOrders.filter(po => po.supplierOrgId === selectedSupplier?.id).length === 0 ? (
                                                <p className="empty-msg">이전 매입 발주 내역이 없습니다.</p>
                                            ) : (
                                                pastPurchaseOrders
                                                    .filter(po => po.supplierOrgId === selectedSupplier?.id)
                                                    .map(po => (
                                                        <div key={po.id} className="template-card-v2">
                                                            <div className="card-left">
                                                                <div className="card-row-1">
                                                                    <span className="card-title">발주 #{po.id.slice(-6)}</span>
                                                                </div>
                                                                <div className="card-row-2">
                                                                    <span className="card-date">
                                                                        {po.createdAt?.toDate?.().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '') || '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="card-right">
                                                                <button
                                                                    className="btn btn-xs btn-outline"
                                                                    onClick={() => copyPastOrder(po)}
                                                                >
                                                                    복사하기
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="step-content">
                    <div className="glass-card">
                        <h2 className="section-title">🚚 최종 발주 정보 확인</h2>
                        <div className="form-grid mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label className="label">입고 예정일</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={expectedArrivalDate}
                                    onChange={(e) => setExpectedArrivalDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">메모 (선택사항)</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="공급사에 전달할 특이사항을 입력하세요"
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="summary-banner mt-6">
                            <div className="summary-item">
                                <span className="label">공급사</span>
                                <span className="value">{selectedSupplier?.companyName}</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">총 품목</span>
                                <span className="value">{totalItems}종</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">총 중량</span>
                                <span className="value">{formatCurrency(totalWeight)} kg</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">총 합계금액</span>
                                <span className="value highlight">₩{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                        <div className="step-actions mt-8">
                            <button className="btn btn-secondary" onClick={() => setStep(2)}>
                                ← 품목 설정
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={saving}
                                onClick={handleSubmit}
                            >
                                {saving ? '발주서 저장 중...' : '매입 발주서 생성 완료'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
