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
    CheckCircleIcon
} from '../../components/Icons'
import { getAllSuppliers, type FirestoreSupplier } from '../../lib/supplierService'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { createPurchaseOrder, updatePurchaseOrder /* setPurchaseOrderItems pending in service */ } from '../../lib/orderService'
import { Timestamp, collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import './OrderSheetCreate.css' // Reusing the same style

// 로컬 타입
type Supplier = Omit<FirestoreSupplier, 'createdAt' | 'updatedAt'> & {
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
    estimatedWeight: number
    totalAmount: number
}

export default function PurchaseOrderCreate() {
    const navigate = useNavigate()

    // Data states
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [products, setProducts] = useState<Product[]>([])
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

    // Step 3: PO Info
    const [expectedArrivalDate, setExpectedArrivalDate] = useState('')
    const [memo, setMemo] = useState('')

    // Refs
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
    const dropdownRef = useRef<HTMLDivElement>(null)

    const loadData = async () => {
        try {
            setLoading(true)
            const [suppliersData, productsData] = await Promise.all([
                getAllSuppliers(),
                getAllProducts()
            ])

            setSuppliers(suppliersData.map(s => ({
                ...s,
                createdAt: s.createdAt?.toDate?.(),
                updatedAt: s.updatedAt?.toDate?.(),
            })))

            setProducts(productsData.map(p => ({
                ...p,
                unitPrice: p.costPrice, // For Supplier PO, we use costPrice by default
                createdAt: p.createdAt?.toDate?.(),
                updatedAt: p.updatedAt?.toDate?.(),
            })))
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
        estimatedWeight: 0,
        totalAmount: 0
    })

    useEffect(() => {
        if (rows.length === 0) {
            setRows([createEmptyRow()])
        }
    }, [rows])

    const handleRowUpdate = (id: string, updates: Partial<OrderRow>) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                const updated = { ...row, ...updates }
                // Re-calculate amount
                updated.totalAmount = updated.unitPrice * updated.quantity
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
    }, [searchQuery, products])

    const selectProduct = (product: Product, rowId: string) => {
        handleRowUpdate(rowId, {
            productId: product.id,
            productName: product.name,
            unitPrice: product.costPrice, // Default to cost price for PO
            unit: product.unit === 'kg' ? 'kg' : 'box',
            estimatedWeight: (product.unit === 'kg' ? 1 : (product.boxWeight || 0))
        })
        setShowDropdown(false)
        setSearchQuery('')
        setActiveRowId(null)
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
            const totalsKg = validRows.reduce((sum, r) => sum + (r.estimatedWeight * r.quantity), 0)
            const totalsAmount = validRows.reduce((sum, r) => sum + r.totalAmount, 0)

            // Create PO
            const poData = {
                supplierOrgId: selectedSupplier.id,
                supplierName: selectedSupplier.companyName,
                status: 'DRAFT' as const,
                totalsKg,
                totalsAmount,
                expectedArrivalDate: expectedArrivalDate ? Timestamp.fromDate(new Date(expectedArrivalDate)) : undefined,
                memo: memo
            }

            const newPO = await createPurchaseOrder(poData as any)

            // Save Items
            const itemsCollection = collection(db, 'purchaseOrderItems')
            for (const row of validRows) {
                const itemRef = doc(itemsCollection)
                await setDoc(itemRef, {
                    id: itemRef.id,
                    purchaseOrderId: newPO.id,
                    productId: row.productId,
                    productName: row.productName,
                    qtyKg: row.quantity,
                    unitPrice: row.unitPrice,
                    amount: row.totalAmount
                })
            }

            alert('매입 발주서가 생성되었습니다.')
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
            s.bizRegNo.includes(supplierSearch)
        )
    }, [suppliers, supplierSearch])

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
                                            <td>{s.supplyCategory}</td>
                                            <td>{s.ceoName}</td>
                                            <td className="mono">{s.phone}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="step-footer mt-6">
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={!selectedSupplier}
                                onClick={() => setStep(2)}
                            >
                                다음 단계 (품목 설정) →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="step-content">
                    <div className="main-layout-with-sidebar">
                        <div className="main-form-area">
                            <div className="glass-card">
                                <div className="section-header">
                                    <h2 className="section-title"><PackageIcon size={20} /> 발주 품목 설정</h2>
                                    <button className="btn btn-ghost btn-sm" onClick={addRow}>
                                        <PlusIcon size={16} /> 행 추가
                                    </button>
                                </div>

                                <div className="excel-grid">
                                    <table className="excel-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 50 }}>No</th>
                                                <th>품목명</th>
                                                <th style={{ width: 120 }}>단위</th>
                                                <th style={{ width: 150 }}>수량</th>
                                                <th style={{ width: 150 }}>매입단가</th>
                                                <th style={{ width: 150 }}>합계금액</th>
                                                <th style={{ width: 50 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, index) => (
                                                <tr key={row.id}>
                                                    <td className="text-center text-muted">{index + 1}</td>
                                                    <td className="product-cell">
                                                        <div className="input-wrapper relative">
                                                            <input
                                                                type="text"
                                                                className="grid-input"
                                                                placeholder="품목 검색..."
                                                                value={activeRowId === row.id ? searchQuery : row.productName}
                                                                onFocus={() => {
                                                                    setActiveRowId(row.id)
                                                                    setShowDropdown(true)
                                                                }}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                            />
                                                            {showDropdown && activeRowId === row.id && filteredProducts.length > 0 && (
                                                                <div className="product-dropdown" ref={dropdownRef}>
                                                                    {filteredProducts.map(p => (
                                                                        <div
                                                                            key={p.id}
                                                                            className="dropdown-item"
                                                                            onClick={() => selectProduct(p, row.id)}
                                                                        >
                                                                            <span className="p-name">{p.name}</span>
                                                                            <span className="p-price">₩{p.costPrice.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="grid-select"
                                                            value={row.unit}
                                                            onChange={(e) => handleRowUpdate(row.id, { unit: e.target.value as any })}
                                                        >
                                                            <option value="kg">kg</option>
                                                            <option value="box">box</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="grid-input text-right"
                                                            value={row.quantity || ''}
                                                            onChange={(e) => handleRowUpdate(row.id, { quantity: Number(e.target.value) })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="grid-input text-right"
                                                            value={row.unitPrice || ''}
                                                            onChange={(e) => handleRowUpdate(row.id, { unitPrice: Number(e.target.value) })}
                                                        />
                                                    </td>
                                                    <td className="text-right font-semibold">
                                                        ₩{row.totalAmount.toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-ghost danger btn-xs" onClick={() => deleteRow(row.id)}>
                                                            <XIcon size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="step-footer mt-6">
                                    <button className="btn btn-secondary btn-lg" onClick={() => setStep(1)}>
                                        ← 이전 단계
                                    </button>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        disabled={rows.filter(r => r.productId).length === 0}
                                        onClick={() => setStep(3)}
                                    >
                                        다음 단계 (발주 정보) →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="step-content">
                    <div className="glass-card">
                        <h2 className="section-title">최종 발주 정보 확인</h2>
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
                                <span className="label">총 품목</span>
                                <span className="value">{rows.filter(r => r.productId).length}종</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">총 합계금액</span>
                                <span className="value highlight">₩{rows.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="step-footer mt-8">
                            <button className="btn btn-secondary btn-lg" onClick={() => setStep(2)}>
                                ← 이전 단계
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
