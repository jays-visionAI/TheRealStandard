import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileEditIcon, BuildingIcon, SearchIcon, StarIcon, MapPinIcon, PhoneIcon, ClipboardListIcon, PackageIcon, CheckIcon, XIcon, AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
import { getAllCustomers, type FirestoreCustomer } from '../../lib/customerService'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { createOrderSheet, setOrderSheetItems, getAllOrderSheets, getOrderSheetItems, type FirestoreOrderSheet } from '../../lib/orderService'
import { getAllPriceLists, type FirestorePriceList } from '../../lib/priceListService'
import './OrderSheetCreate.css'
import { Timestamp } from 'firebase/firestore'

// 로컬 타입
type Customer = Omit<FirestoreCustomer, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
}

interface Product extends Omit<FirestoreProduct, 'createdAt' | 'updatedAt'> {
    unitPrice: number
    createdAt?: Date
    updatedAt?: Date
}

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

    // Firebase에서 직접 로드되는 데이터
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Step 관리
    const [step, setStep] = useState(1)
    const [orderUnit, setOrderUnit] = useState<'kg' | 'box'>('kg')

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
    const [adminComment, setAdminComment] = useState('')

    const [skipShippingInfo, setSkipShippingInfo] = useState(false)

    // Preview Modal State
    const [previewModalOpen, setPreviewModalOpen] = useState(false)
    const [previewTitle, setPreviewTitle] = useState('')
    const [previewData, setPreviewData] = useState<{ name: string, price: number, unit: string }[]>([])

    // 사이드바 패널 (단가표 / 이전 발주서)
    const [showSidebar, setShowSidebar] = useState(true)
    const [sidebarTab, setSidebarTab] = useState<'priceList' | 'pastOrders'>('priceList')
    const [pastPriceLists, setPastPriceLists] = useState<FirestorePriceList[]>([])
    const [pastOrderSheets, setPastOrderSheets] = useState<FirestoreOrderSheet[]>([])

    // Refs
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Firebase에서 데이터 로드
    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [customersData, productsData, priceListsData, orderSheetsData] = await Promise.all([
                getAllCustomers(),
                getAllProducts(),
                getAllPriceLists(),
                getAllOrderSheets()
            ])

            setCustomers(customersData.map(c => ({
                ...c,
                createdAt: c.createdAt?.toDate?.(),
                updatedAt: c.updatedAt?.toDate?.(),
            })))

            setProducts(productsData.map(p => ({
                ...p,
                unitPrice: p.wholesalePrice,
                createdAt: p.createdAt?.toDate?.(),
                updatedAt: p.updatedAt?.toDate?.(),
            })))

            setPastPriceLists(priceListsData)
            setPastOrderSheets(orderSheetsData)
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
    }, [])

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

    // 초기 행 설정 및 마감시간 기본값 (현재시간 + 48시간)
    useEffect(() => {
        if (rows.length === 0) {
            setRows([createEmptyRow()])
        }

        // 주문 마감시간 기본값 설정 (48시간 뒤)
        const now = new Date()
        now.setHours(now.getHours() + 48)
        // input type="datetime-local" 형식: YYYY-MM-DDTHH:mm
        const formatted = now.toISOString().slice(0, 16)
        setCutOffAt(formatted)
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

    // 주문 단위 변경 핸들러 (Box 전환 시 확인 모달)
    const handleUnitChange = (newUnit: 'kg' | 'box') => {
        if (newUnit === orderUnit) return;

        if (newUnit === 'box') {
            // Box 단위로 전환 시 검증
            const filledRows = rows.filter(r => r.productId);

            // boxWeight가 없는 상품이 있는지 확인
            const rowsWithoutBoxWeight = filledRows.filter(row => {
                const product = products.find(p => p.id === row.productId);
                return !product?.boxWeight || product.boxWeight <= 0;
            });

            if (rowsWithoutBoxWeight.length > 0) {
                const productNames = rowsWithoutBoxWeight.map(r => r.productName).join(', ');
                alert(`⚠️ 박스 단위 전환 불가\n\n다음 상품에 예상중량/Box가 설정되어 있지 않습니다:\n${productNames}\n\n상품리스트 데이터베이스에서 예상중량/Box를 설정한 뒤에 사용 가능합니다.`);
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
                    unit: orderUnit,
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

    // 단가표 복사
    const copyPriceList = (list: FirestorePriceList) => {
        if (!confirm(`'${list.title}' 단가표의 품목과 단가를 가져오시겠습니까?`)) return

        const newRows: OrderRow[] = list.items.map(item => {
            const p = products.find(p => p.id === item.productId)
            return {
                id: Math.random().toString(36).substr(2, 9),
                productId: item.productId,
                productName: item.name,
                unitPrice: item.supplyPrice,
                quantity: 0,
                unit: orderUnit,
                estimatedWeight: 0,
                totalAmount: 0
            }
        })
        setRows(newRows)
        alert('단가표 항목이 복사되었습니다. 수량을 입력해주세요.')
    }

    // 이전 발주서 복사
    const copyPastOrder = async (order: FirestoreOrderSheet) => {
        if (!confirm('해당 발주서의 품목을 가져오시겠습니까?')) return

        try {
            setLoading(true)
            const items = await getOrderSheetItems(order.id)

            if (!items || items.length === 0) {
                alert('복사할 항목이 없습니다.')
                return
            }

            const newRows: OrderRow[] = items.map(item => {
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    productId: item.productId,
                    productName: item.productName,
                    unitPrice: item.unitPrice,
                    quantity: item.qtyRequested || 0,
                    unit: orderUnit,
                    estimatedWeight: item.estimatedKg || 0,
                    totalAmount: item.amount || 0
                }
            })
            setRows(newRows)
            alert('발주서 항목이 복사되었습니다.')
        } catch (err) {
            console.error(err)
            alert('발주서 항목을 가져오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 수량 변경 시 계산
    const updateQuantity = (rowId: string, quantity: number) => {
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

    // 이전 주문에서 품목 불러오기
    const loadFromPastOrder = (pastOrder: PastOrder) => {
        const newRows: OrderRow[] = pastOrder.items.map(item => {
            const product = products.find(p => p.id === item.productId)
            return {
                id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: item.productId,
                productName: item.productName,
                unitPrice: product?.unitPrice || 0,
                quantity: item.qty,
                unit: product?.unit as 'kg' | 'box' || 'kg',
                estimatedWeight: item.qty,
                totalAmount: (product?.unitPrice || 0) * item.qty,
            }
        })
        setRows(newRows)
    }

    // 키보드 네비게이션
    const handleKeyDown = (e: React.KeyboardEvent, rowId: string, field: 'name' | 'qty') => {
        if (field === 'name') {
            if (showDropdown && filteredProducts.length > 0) {
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
            } else if (e.key === 'Enter') {
                e.preventDefault()
                // 이미 품목이 선택된 상태거나 드롭다운이 없을 때 Enter 입력 시 수량 입력으로 이동
                const qtyInput = inputRefs.current.get(`qty-${rowId}`)
                if (qtyInput) {
                    qtyInput.focus()
                    qtyInput.select()
                }
            }
        } else if (field === 'qty' && e.key === 'Enter') {
            e.preventDefault()
            const currentIndex = rows.findIndex(r => r.id === rowId)
            if (currentIndex === rows.length - 1) {
                addRow()
            } else {
                const nextRow = rows[currentIndex + 1]
                const nameInput = inputRefs.current.get(`name-${nextRow.id}`)
                if (nameInput) nameInput.focus()
            }
        } else if (field === 'qty' && e.key === 'Tab' && !e.shiftKey) {
            const currentIndex = rows.findIndex(r => r.id === rowId)
            if (currentIndex === rows.length - 1) {
                e.preventDefault()
                addRow()
            }
        }
    }

    // 통계 계산 (수량이 0인 품목도 포함하여 생성 가능)
    const validRows = useMemo(() => rows.filter(r => r.productId), [rows])
    const totalItems = validRows.length
    const totalWeight = useMemo(() => validRows.reduce((sum, r) => sum + r.estimatedWeight, 0), [validRows])
    const totalAmount = useMemo(() => validRows.reduce((sum, r) => sum + r.totalAmount, 0), [validRows])

    // 통화 포맷
    const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR').format(value)

    // 고객 필터링 - 활성 고객만 표시
    const filteredCustomers = useMemo(() => {
        const activeCustomers = customers.filter(c => c.isActive)
        if (!customerSearch) return activeCustomers
        const q = customerSearch.toLowerCase()
        return activeCustomers.filter(c =>
            c.companyName.toLowerCase().includes(q) ||
            c.bizRegNo.includes(q)
        )
    }, [customerSearch, customers])

    // Preview Handlers
    const handlePreviewPriceList = (list: FirestorePriceList) => {
        setPreviewTitle(`단가표: ${list.title}`)
        setPreviewData(list.items.map((item) => ({
            name: item.name,
            price: item.wholesalePrice, // Using wholesalePrice as the display price for preview
            unit: item.unit || 'kg'
        })))
        setPreviewModalOpen(true)
    }

    const handlePreviewOrderSheet = async (orderSheet: FirestoreOrderSheet) => {
        try {
            setLoading(true)
            const items = await getOrderSheetItems(orderSheet.id)
            setPreviewTitle(`발주서 #${orderSheet.id.slice(-6)}`)
            setPreviewData(items.map(item => ({
                name: item.productName,
                price: item.unitPrice,
                unit: item.unit
            })))
            setPreviewModalOpen(true)
        } catch (err) {
            console.error('Failed to load items for preview:', err)
            alert('미리보기 데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 주문장 발송
    const handleSubmit = async () => {
        if (!selectedCustomer || validRows.length === 0 || !cutOffAt || (!skipShippingInfo && !shipDate)) {
            alert('필수 정보를 입력해주세요 (주문 마감시간 등).')
            return
        }

        try {
            setSaving(true)

            const token = 'token-' + Math.random().toString(36).substr(2, 9)

            // Firebase에 발주서 생성
            const newOrderSheet = await createOrderSheet({
                customerOrgId: selectedCustomer.id,
                customerName: selectedCustomer.companyName,
                shipDate: shipDate ? Timestamp.fromDate(new Date(shipDate)) : undefined,
                cutOffAt: Timestamp.fromDate(new Date(cutOffAt)),
                shipTo: shipTo || selectedCustomer.address,
                adminComment: adminComment,
                status: 'SENT',
                inviteTokenId: token,
            })

            // 주문 아이템 저장
            const items = validRows.map(row => ({
                productId: row.productId || '',
                productName: row.productName,
                unit: row.unit,
                unitPrice: row.unitPrice,
                qtyRequested: row.quantity,
                estimatedKg: row.estimatedWeight,
                amount: row.totalAmount,
            }))

            await setOrderSheetItems(newOrderSheet.id, items)

            const link = `${window.location.origin}/order/${token}`
            navigator.clipboard.writeText(link)
            alert(`✅ 발주서가 생성되었습니다!\n\n고객 링크가 클립보드에 복사되었습니다.\n\n${link}`)
            navigate('/admin/order-sheets')
        } catch (err) {
            console.error('Failed to create purchase order:', err)
            alert('발주서 생성에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // 상품 선택 해제
    const clearProduct = (rowId: string, index: number) => {
        setRows(prev => prev.map((r, i) =>
            i === index ? { ...createEmptyRow(), id: rowId } : r
        ))
        const nameInput = inputRefs.current.get(`name-${rowId}`)
        if (nameInput) nameInput.focus()
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="order-sheet-create">
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
            <div className="order-sheet-create">
                <div className="error-state text-center p-20">
                    <p>
                        <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <AlertTriangleIcon size={24} color="#ef4444" />
                        </span>
                        {error}
                    </p>
                    <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="order-sheet-create">
            {/* Header */}
            <header className="page-header">
                <div className="header-left">
                    <h1>신규 매출발주서 생성</h1>
                    <p className="text-secondary">고객사를 선택하고 발주 품목 및 배송 정보를 설정합니다</p>
                </div>
            </header>

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

                            <div className="order-unit-toggle-bar">
                                <div className="toggle-label">주문 단위 설정</div>
                                <div className="toggle-group">
                                    <button
                                        className={`toggle-btn ${orderUnit === 'kg' ? 'active' : ''}`}
                                        onClick={() => handleUnitChange('kg')}
                                    >
                                        Kg 단위 주문
                                    </button>
                                    <button
                                        className={`toggle-btn ${orderUnit === 'box' ? 'active' : ''}`}
                                        onClick={() => handleUnitChange('box')}
                                    >
                                        박스 단위 주문
                                    </button>
                                </div>
                            </div>

                            {/* Excel-like Grid */}
                            <div className="grid-container">
                                <table className="order-table">
                                    <thead>
                                        <tr>
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
                                                                        <span className="product-category">{product.category1}</span>
                                                                        <span className="product-price">₩{formatCurrency(product.unitPrice)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="col-unit text-muted" style={{ fontSize: '13px' }}>
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
                                                            disabled={!row.productId}
                                                        />
                                                        {row.productId && (
                                                            <span className="qty-unit">{row.unit.toUpperCase()}</span>
                                                        )}
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
                                                        <button className="remove-btn" onClick={() => removeRow(row.id)}>🗑</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="add-row-tr">
                                            <td colSpan={8}>
                                                <button className="add-row-btn" onClick={addRow}>+ 품목 추가</button>
                                            </td>
                                        </tr>
                                        <tr className="total-row">
                                            <td className="total-label" colSpan={4}>합계</td>
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
                                ← 고객 선택
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={validRows.length === 0}
                                onClick={() => setStep(3)}
                            >
                                다음 →
                            </button>
                        </div>
                    </div>

                    {/* 발주서 템플릿 사이드바 (단가표 / 이전 발주서) */}
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
                                <h3 className="sidebar-title"><ClipboardListIcon size={18} /> 발주서 템플릿</h3>

                                <div className="sidebar-tabs">
                                    <button
                                        className={`tab-btn ${sidebarTab === 'priceList' ? 'active' : ''}`}
                                        onClick={() => setSidebarTab('priceList')}
                                    >
                                        단가표
                                    </button>
                                    <button
                                        className={`tab-btn ${sidebarTab === 'pastOrders' ? 'active' : ''}`}
                                        onClick={() => setSidebarTab('pastOrders')}
                                    >
                                        이전 매출발주서
                                    </button>
                                </div>

                                <div className="tab-content">
                                    {sidebarTab === 'priceList' ? (
                                        <div className="template-list">
                                            {pastPriceLists.length === 0 ? (
                                                <p className="empty-msg">등록된 단가표가 없습니다.</p>
                                            ) : (
                                                pastPriceLists.map(list => (
                                                    <div key={list.id} className="template-card-v2">
                                                        <div className="card-left">
                                                            <div className="card-row-1">
                                                                <span className="card-title">{list.title}</span>
                                                                <span className="card-count">{list.items.length}개 품목</span>
                                                            </div>
                                                            <div className="card-row-2">
                                                                <span className="card-date">
                                                                    {list.createdAt?.toDate?.().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '') || '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="card-right">
                                                            <button
                                                                className="btn btn-xs btn-ghost"
                                                                onClick={() => handlePreviewPriceList(list)}
                                                            >
                                                                미리보기
                                                            </button>
                                                            <button
                                                                className="btn btn-xs btn-outline"
                                                                onClick={() => copyPriceList(list)}
                                                            >
                                                                복사하기
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    ) : (
                                        <div className="template-list">
                                            {pastOrderSheets.filter(o => o.customerOrgId === selectedCustomer?.id).length === 0 ? (
                                                <p className="empty-msg">이전 발주 내역이 없습니다.</p>
                                            ) : (
                                                pastOrderSheets
                                                    .filter(o => o.customerOrgId === selectedCustomer?.id)
                                                    .map(order => (
                                                        <div key={order.id} className="template-card-v2">
                                                            <div className="card-left">
                                                                <div className="card-row-1">
                                                                    <span className="card-title">발주 #{order.id.slice(-6)}</span>
                                                                </div>
                                                                <div className="card-row-2">
                                                                    <span className="card-date">
                                                                        {order.createdAt?.toDate?.().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '') || '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="card-right">
                                                                <button
                                                                    className="btn btn-xs btn-ghost"
                                                                    onClick={() => handlePreviewOrderSheet(order)}
                                                                >
                                                                    미리보기
                                                                </button>
                                                                <button
                                                                    className="btn btn-xs btn-outline"
                                                                    onClick={() => copyPastOrder(order)}
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

            {/* Step 3: 배송 정보 */}
            {step === 3 && (
                <div className="step-content">
                    <div className="glass-card">
                        <div className="section-header flex justify-between items-center mb-6">
                            <h2 className="section-title mb-0">🚚 배송 정보</h2>
                            <button
                                className={`btn btn-sm ${skipShippingInfo ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setSkipShippingInfo(!skipShippingInfo)}
                            >
                                {skipShippingInfo ? '✓ 배송정보 생략됨' : '배송정보 생략'}
                            </button>
                        </div>

                        <div className="form-grid">
                            {!skipShippingInfo && (
                                <div className="form-group">
                                    <label className="label">배송일 *</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={shipDate}
                                        onChange={(e) => setShipDate(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="label">주문 마감시간 *</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={cutOffAt}
                                    onChange={(e) => setCutOffAt(e.target.value)}
                                />
                            </div>
                            {!skipShippingInfo && (
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
                            )}
                            <div className="form-group full-width">
                                <label className="label">관리자 메모/요청사항</label>
                                <textarea
                                    className="input textarea"
                                    value={adminComment}
                                    onChange={(e) => setAdminComment(e.target.value)}
                                    placeholder="고객에게 전달할 메모나 요청사항을 입력하세요 (예: 명절 선물 세트 주문 건입니다.)"
                                    rows={3}
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
                                    disabled={(!skipShippingInfo && !shipDate) || !cutOffAt || saving}
                                    onClick={handleSubmit}
                                >
                                    {saving ? '생성 중...' : '주문장 발송 🔗'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Preview Modal */}
            {previewModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">{previewTitle}</h3>
                            <button
                                onClick={() => setPreviewModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 text-left">품목명</th>
                                        <th className="p-2 text-right">단가</th>
                                        <th className="p-2 text-center">단위</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-4 text-center text-gray-500">품목이 없습니다.</td>
                                        </tr>
                                    ) : (
                                        previewData.map((item, idx) => (
                                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="p-2">{item.name}</td>
                                                <td className="p-2 text-right">₩{formatCurrency(item.price)}</td>
                                                <td className="p-2 text-center text-gray-500">{item.unit}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setPreviewModalOpen(false)}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
