import { useState, useMemo, useEffect } from 'react'
import {
    PackageIcon,
    PlusIcon,
    SearchIcon,
    EditIcon,
    EyeIcon,
    XIcon,
    FileTextIcon,
    TrashIcon,
    ClipboardListIcon,
    CheckCircleIcon,
    AlertTriangleIcon
} from '../../components/Icons'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import {
    createPriceList,
    updatePriceList,
    getAllPriceLists,
    deletePriceList,
    type FirestorePriceList,
    type PriceListItem
} from '../../lib/priceListService'
import './ProductMaster.css' // Using same styles for consistency

export default function PriceListManager() {
    const [priceLists, setPriceLists] = useState<FirestorePriceList[]>([])
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedList, setSelectedList] = useState<FirestorePriceList | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state for creating/editing
    const [title, setTitle] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
    const [supplyPrices, setSupplyPrices] = useState<Record<string, number>>({})

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)
            const [pLists, pData] = await Promise.all([
                getAllPriceLists(),
                getAllProducts()
            ])
            setPriceLists(pLists)

            // Robustly filter products: default isActive to true and category2 to B2B if missing
            const b2bProducts = pData.map(p => ({
                ...p,
                isActive: p.isActive !== false,
                category2: p.category2 || 'B2B',
                category1: p.category1 || (p as any).category || '냉장'
            })).filter(p => p.isActive && (p.category2 === 'B2B' || p.category2 === 'BOTH'))

            setProducts(b2bProducts)
        } catch (err) {
            console.error('Failed to load PriceListManager data:', err)
            setError('데이터를 불러오는 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleOpenCreateModal = () => {
        setIsEditing(false)
        setSelectedList(null)
        setTitle('')
        setSelectedProductIds(new Set())
        const initialPrices: Record<string, number> = {}
        products.forEach(p => {
            initialPrices[p.id] = p.wholesalePrice
        })
        setSupplyPrices(initialPrices)
        setShowCreateModal(true)
    }

    const handleOpenEditModal = (list: FirestorePriceList) => {
        setIsEditing(true)
        setSelectedList(list)
        setTitle(list.title)

        const newSelectedIds = new Set<string>()
        const newPrices: Record<string, number> = {}

        // Populate with existing items
        list.items.forEach(item => {
            newSelectedIds.add(item.productId)
            newPrices[item.productId] = item.supplyPrice
        })

        // Add default prices for other products not in the list (just in case)
        products.forEach(p => {
            if (!newPrices[p.id]) {
                newPrices[p.id] = p.wholesalePrice
            }
        })

        setSelectedProductIds(newSelectedIds)
        setSupplyPrices(newPrices)
        setShowCreateModal(true)
    }

    const toggleProductSelection = (productId: string) => {
        const newSet = new Set(selectedProductIds)
        if (newSet.has(productId)) {
            newSet.delete(productId)
        } else {
            newSet.add(productId)
        }
        setSelectedProductIds(newSet)
    }

    const handleSupplyPriceChange = (productId: string, value: string) => {
        const num = parseFloat(value) || 0
        setSupplyPrices(prev => ({ ...prev, [productId]: num }))
    }

    const handleSave = async () => {
        if (!title.trim()) {
            alert('단가표 제목을 입력하세요.')
            return
        }
        if (selectedProductIds.size === 0) {
            alert('최소 하나 이상의 품목을 선택하세요.')
            return
        }

        try {
            setSaving(true)
            const items: PriceListItem[] = products
                .filter(p => selectedProductIds.has(p.id))
                .map(p => ({
                    productId: p.id,
                    name: p.name,
                    costPrice: p.costPrice,
                    wholesalePrice: p.wholesalePrice,
                    supplyPrice: supplyPrices[p.id],
                    unit: p.unit,
                    category1: p.category1,
                    boxWeight: p.boxWeight
                }))

            if (isEditing && selectedList) {
                await updatePriceList(selectedList.id, {
                    title,
                    items
                })
                alert('단가표가 수정되었습니다.')
            } else {
                await createPriceList({
                    title,
                    items
                })
                alert('단가표가 생성되었습니다.')
            }

            setShowCreateModal(false)
            loadData()
        } catch (err) {
            console.error(err)
            alert('저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('이 단가표를 삭제하시겠습니까?')) {
            try {
                await deletePriceList(id)
                loadData()
            } catch (err) {
                console.error(err)
            }
        }
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(val)

    if (loading) return (
        <div className="p-20 text-center">
            <div className="spinner mb-4" style={{ margin: '0 auto' }}></div>
            <p>데이터를 불러오는 중...</p>
        </div>
    )

    if (error) return (
        <div className="p-20 text-center text-error">
            <p className="mb-4">
                <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                    <AlertTriangleIcon size={24} color="#ef4444" />
                </span>
                {error}
            </p>
            <button className="btn btn-primary" onClick={loadData}>다시 시도</button>
        </div>
    )

    return (
        <div className="product-master">
            <header className="page-header">
                <div className="header-left">
                    <h2>
                        <ClipboardListIcon size={24} color="var(--color-primary)" className="mr-2" />
                        단가표 관리
                    </h2>
                    <p className="description">고객사별 맞춤 공급가를 관리하는 단가표 리스트입니다.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                        <PlusIcon size={18} /> 단가표 생성하기
                    </button>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card glass-card">
                    <span className="stat-value">{priceLists.length}</span>
                    <span className="stat-label">전체 단가표</span>
                </div>
            </div>

            <div className="table-container glass-card">
                {priceLists.length === 0 ? (
                    <div className="empty-state">
                        <PackageIcon size={48} className="text-muted" />
                        <p>등록된 단가표가 없습니다.</p>
                    </div>
                ) : (
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>제목</th>
                                <th>품목 수</th>
                                <th>생성일</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceLists.map(list => (
                                <tr key={list.id}>
                                    <td><strong>{list.title}</strong></td>
                                    <td>{list.items.length}개 품목</td>
                                    <td>{list.createdAt?.toDate ? list.createdAt.toDate().toLocaleDateString() : '-'}</td>
                                    <td className="actions">
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            title="상세보기"
                                            onClick={() => {
                                                setSelectedList(list)
                                                setShowDetailModal(true)
                                            }}
                                        >
                                            <EyeIcon size={16} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            title="수정"
                                            onClick={() => handleOpenEditModal(list)}
                                        >
                                            <EditIcon size={16} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm danger"
                                            title="삭제"
                                            onClick={() => handleDelete(list.id)}
                                        >
                                            <TrashIcon size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal product-modal" style={{ maxWidth: '1000px', width: '92vw' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FileTextIcon size={20} /> {isEditing ? '단가표 수정' : '새 단가표 생성'}</h3>
                            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="price-list-form-header px-4 py-2">
                                <div className="form-group mb-4">
                                    <label className="label">단가표 제목</label>
                                    <input
                                        className="input"
                                        style={{ fontSize: '1.2rem', padding: '12px 16px' }}
                                        placeholder="단가표 제목을 입력하세요 (예: 거래처명/기간)"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        autoFocus
                                    />
                                    <p className="description" style={{ marginTop: '8px', fontSize: '13px' }}>
                                        단가표를 구분할 수 있는 이름을 입력하세요.
                                    </p>
                                </div>
                            </div>

                            <div className="table-container-scroll" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                <table className="product-table price-selection-table">
                                    <thead>
                                        <tr>
                                            <th className="checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.size === products.length && products.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedProductIds(new Set(products.map(p => p.id)))
                                                        } else {
                                                            setSelectedProductIds(new Set())
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="name-col">품목명</th>
                                            <th className="unit-col" style={{ width: '120px' }}>예상중량/Box</th>
                                            <th className="price-col">매입가</th>
                                            <th className="price-col">도매가 (기준)</th>
                                            <th className="price-col">공급가 (수정가능)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p) => {
                                            const isSelected = selectedProductIds.has(p.id)
                                            const sPrice = supplyPrices[p.id] || 0
                                            const isBelowCost = isSelected && sPrice < p.costPrice
                                            const diff = sPrice - p.costPrice

                                            return (
                                                <tr key={p.id} className={isSelected ? 'selected-row' : ''}>
                                                    <td className="checkbox-col">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleProductSelection(p.id)}
                                                        />
                                                    </td>
                                                    <td className="name-col">
                                                        <div className="name-cell">
                                                            <span className="name">{p.name}</span>
                                                            <span className="category-tag">{p.category1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="unit-col">
                                                        {p.boxWeight ? `${p.boxWeight}kg/Box` : 'kg'}
                                                    </td>
                                                    <td className="price-col">₩{formatCurrency(p.costPrice)}</td>
                                                    <td className="price-col text-muted">₩{formatCurrency(p.wholesalePrice)}</td>
                                                    <td className="price-col">
                                                        <div className="supply-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className={`cell-edit-input ${isBelowCost ? 'is-danger' : isSelected ? 'is-active' : ''}`}
                                                                value={sPrice}
                                                                onChange={e => handleSupplyPriceChange(p.id, e.target.value)}
                                                                disabled={!isSelected}
                                                                placeholder={p.wholesalePrice.toString()}
                                                            />
                                                            {isBelowCost && (
                                                                <div className="loss-warning">
                                                                    손실: {formatCurrency(Math.abs(diff))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '20px' }}>
                            <div className="footer-left">
                                <span className="selection-badge">선택됨: {selectedProductIds.size}개</span>
                            </div>
                            <div className="footer-actions" style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn btn-secondary" style={{ minWidth: '100px' }} onClick={() => setShowCreateModal(false)}>취소</button>
                                <button
                                    className="btn btn-primary"
                                    style={{ minWidth: '140px' }}
                                    onClick={handleSave}
                                    disabled={saving || !title.trim() || selectedProductIds.size === 0}
                                >
                                    {saving ? '저장 중...' : isEditing ? '단가표 수정하기' : '단가표 저장하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedList && (
                <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
                    <div className="modal product-modal" style={{ maxWidth: '1000px', width: '90vw' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>
                                    <FileTextIcon size={20} color="var(--color-primary)" className="mr-2" />
                                    단가표 상세: {selectedList.title}
                                </h3>
                                <p className="text-sm text-secondary">생성일: {selectedList.createdAt?.toDate?.()?.toLocaleDateString()}</p>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="table-container">
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            <th>품목명</th>
                                            <th className="unit-col">예상중량/Box</th>
                                            <th className="price-col">매입가</th>
                                            <th className="price-col">도매가(기준)</th>
                                            <th className="price-col">공급가</th>
                                            <th className="price-col">매출이익</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedList.items.map((item, idx) => {
                                            const profit = item.supplyPrice - item.costPrice
                                            const isBelowCost = profit < 0
                                            return (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className="name-cell">
                                                            <span className="name">{item.name}</span>
                                                            <span className="category-badge plain">{item.category1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="unit-col">
                                                        {item.boxWeight ? `${item.boxWeight}kg/Box` : 'kg'}
                                                    </td>
                                                    <td className="price-col">₩{formatCurrency(item.costPrice)}</td>
                                                    <td className="price-col">₩{formatCurrency(item.wholesalePrice)}</td>
                                                    <td className="price-col">
                                                        <strong className={isBelowCost ? 'text-danger' : 'text-primary'}>
                                                            ₩{formatCurrency(item.supplyPrice)}
                                                        </strong>
                                                    </td>
                                                    <td className="price-col">
                                                        <span className={profit > 0 ? 'margin-positive' : 'margin-negative'}>
                                                            ₩{formatCurrency(profit)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .price-selection-table th, .price-selection-table td {
                    padding: 12px 16px;
                }
                .checkbox-col { width: 40px; text-align: center; }
                .name-col { min-width: 200px; }
                .price-col { width: 150px; text-align: right; }
                
                .name-cell { display: flex; flex-direction: column; gap: 4px; }
                .name-cell .name { font-weight: 600; color: var(--text-primary); }
                .category-tag { 
                    font-size: 10px; 
                    background: var(--bg-tertiary); 
                    color: var(--text-muted); 
                    padding: 2px 6px; 
                    border-radius: 4px; 
                    width: fit-content;
                }

                .supply-input-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 4px;
                }
                
                .cell-edit-input {
                    width: 100%;
                    max-width: 120px;
                    padding: 8px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    text-align: right;
                    font-family: var(--font-mono);
                    font-weight: 600;
                    transition: all 0.2s;
                    background: var(--bg-card-muted);
                }

                .cell-edit-input.is-active {
                    background: white;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .cell-edit-input.is-danger {
                    color: #ef4444;
                    border-color: #fca5a5;
                    background: #fef2f2;
                }

                .loss-warning {
                    font-size: 11px;
                    color: #ef4444;
                    font-weight: 500;
                }

                .selected-row {
                    background-color: rgba(59, 130, 246, 0.03);
                }

                .selection-badge {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--color-primary);
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .margin-positive { color: #10b981; font-weight: 600; }
                .margin-negative { color: #ef4444; font-weight: 600; }
                
                .table-container-scroll {
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    margin: 0 16px;
                }
            `}</style>
        </div>
    )
}
