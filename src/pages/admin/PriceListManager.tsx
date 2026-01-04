import { useState, useMemo, useEffect } from 'react'
import {
    PackageIcon,
    PlusIcon,
    SearchIcon,
    EditIcon,
    EyeIcon,
    XIcon,
    FileTextIcon,
    TrashIcon
} from '../../components/Icons'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import {
    createPriceList,
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
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedList, setSelectedList] = useState<FirestorePriceList | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state for creating
    const [title, setTitle] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
    const [supplyPrices, setSupplyPrices] = useState<Record<string, number>>({})

    const loadData = async () => {
        try {
            setLoading(true)
            const [pLists, pData] = await Promise.all([
                getAllPriceLists(),
                getAllProducts()
            ])
            setPriceLists(pLists)
            // Filter only B2B products for price list creation
            setProducts(pData.filter(p => p.isActive && (p.category2 === 'B2B' || p.category2 === 'BOTH')))
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleOpenCreateModal = () => {
        setTitle('')
        setSelectedProductIds(new Set())
        const initialPrices: Record<string, number> = {}
        products.forEach(p => {
            initialPrices[p.id] = p.wholesalePrice
        })
        setSupplyPrices(initialPrices)
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

            await createPriceList({
                title,
                items
            })

            alert('✅ 단가표가 생성되었습니다.')
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

    if (loading) return <div className="p-10 text-center">불러오는 중...</div>

    return (
        <div className="product-master">
            <header className="page-header">
                <div className="header-left">
                    <h2>📋 단가표 관리</h2>
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

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal product-modal" style={{ maxWidth: '1000px', width: '90vw' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📝 새 단가표 생성</h3>
                            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-4">
                                <label className="label">단가표 제목</label>
                                <input
                                    className="input"
                                    placeholder="예: (주)식품유통 2024년 1월 단가표"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                                <span className="help-text">단가표를 구분할 수 있는 이름을 입력하세요. (생성일: {new Date().toLocaleDateString()})</span>
                            </div>

                            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <table className="product-table">
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>
                                        <tr>
                                            <th style={{ width: '40px' }}>
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
                                            <th>품목명</th>
                                            <th className="price-col">매입가</th>
                                            <th className="price-col">도매가(기준)</th>
                                            <th className="price-col" style={{ width: '150px' }}>공급가 (수정가능)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => {
                                            const isSelected = selectedProductIds.has(p.id)
                                            const sPrice = supplyPrices[p.id] || 0
                                            const isBelowCost = sPrice < p.costPrice
                                            const diff = sPrice - p.costPrice

                                            return (
                                                <tr key={p.id} className={isSelected ? 'selected-row' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleProductSelection(p.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="name-cell">
                                                            <span className="name">{p.name}</span>
                                                            <span className="category-badge plain">{p.category1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="price-col">₩{formatCurrency(p.costPrice)}</td>
                                                    <td className="price-col">₩{formatCurrency(p.wholesalePrice)}</td>
                                                    <td className="price-col">
                                                        <div className="supply-price-input">
                                                            <input
                                                                type="number"
                                                                className={`input input-sm ${isBelowCost ? 'text-danger' : ''}`}
                                                                value={sPrice}
                                                                onChange={e => handleSupplyPriceChange(p.id, e.target.value)}
                                                                disabled={!isSelected}
                                                            />
                                                            {isBelowCost && isSelected && (
                                                                <div className="price-diff">({formatCurrency(diff)})</div>
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
                        <div className="modal-footer">
                            <span className="selected-count">선택됨: {selectedProductIds.size}개</span>
                            <div className="actions">
                                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>취소</button>
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? '저장 중...' : '단가표 저장하기'}
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
                                <h3>📜 단가표 상세: {selectedList.title}</h3>
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
                                            <th>기준</th>
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
                                                    <td>{item.boxWeight ? `${item.boxWeight}kg/Box` : '-'}</td>
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
                .text-danger { color: #ef4444 !important; }
                .text-primary { color: #3b82f6 !important; }
                .price-diff { font-size: 11px; color: #ef4444; margin-top: 2px; }
                .selected-row { background-color: rgba(59, 130, 246, 0.05); }
                .selected-count { font-size: 14px; color: var(--text-secondary); }
                .name-cell { display: flex; flex-direction: column; gap: 2px; }
                .category-badge.plain { 
                    font-size: 10px; 
                    padding: 1px 4px; 
                    background: var(--bg-card-muted);
                    border-radius: 4px;
                    width: fit-content;
                }
            `}</style>
        </div>
    )
}
