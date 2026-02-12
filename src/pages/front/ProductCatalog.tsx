import { useState, useMemo, useEffect } from 'react'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { compareProductOrder } from '../../lib/productSortOrder'
import { PackageIcon, SearchIcon, PlusIcon, ListIcon, GridIcon, ThermometerIcon, SnowflakeIcon, BoneIcon } from '../../components/Icons'
import './ProductCatalog.css'

export default function ProductCatalog() {
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAllProducts()
                setProducts(data.filter(p => p.isActive))
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filtered = useMemo(() => {
        return products.filter(p => {
            if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
            if (categoryFilter !== 'all' && p.category1 !== categoryFilter) return false
            return true
        }).sort(compareProductOrder)
    }, [products, searchQuery, categoryFilter])

    const handleAddToOrder = (product: FirestoreProduct) => {
        // Get existing selections
        const saved = localStorage.getItem('trs_catalog_selection')
        const selection = saved ? JSON.parse(saved) : []

        // Add if not exists
        if (!selection.find((p: any) => p.id === product.id)) {
            selection.push({
                productId: product.id,
                name: product.name,
                category: product.category1,
                unit: product.unit,
                wholesalePrice: product.wholesalePrice
            })
            localStorage.setItem('trs_catalog_selection', JSON.stringify(selection))
            alert(`"${product.name}" 품목이 주문서 버퍼에 추가되었습니다.\n주문서 작성 시 자동으로 포함됩니다.`)
        } else {
            alert('이미 추가된 품목입니다.')
        }
    }

    if (loading) return <div className="p-10 text-center">상품 정보를 불러오는 중...</div>

    return (
        <div className="product-catalog">
            <header className="catalog-header">
                <h2 className="flex items-center justify-center gap-2"><PackageIcon size={28} /> 상품 카탈로그</h2>
                <p>TRS에서 제공하는 최상급 육류 라인업입니다.</p>
            </header>

            <div className="catalog-controls glass-card animate-slide-up">
                <div className="controls-top">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                            onClick={() => setViewMode('card')}
                        >
                            <GridIcon size={18} /> 카드뷰
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon size={18} /> 리스트뷰
                        </button>
                    </div>
                </div>

                <div className="search-box">
                    <SearchIcon size={18} className="icon" />
                    <input
                        placeholder="찾으시는 품목을 입력하세요"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="categories">
                    {[
                        { id: 'all', label: '전체' },
                        { id: '냉장', label: <span className="flex items-center gap-1"><ThermometerIcon size={14} /> 냉장</span> },
                        { id: '냉동', label: <span className="flex items-center gap-1"><SnowflakeIcon size={14} /> 냉동</span> },
                        { id: '부산물', label: <span className="flex items-center gap-1"><BoneIcon size={14} /> 부산물</span> }
                    ].map(cat => (
                        <button
                            key={cat.id}
                            className={`category-chip ${categoryFilter === cat.id ? 'active' : ''}`}
                            onClick={() => setCategoryFilter(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {viewMode === 'card' ? (
                <div className="product-grid">
                    {filtered.map((product, idx) => (
                        <div
                            key={product.id}
                            className="product-card glass-card animate-fade-in"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            <div className={`product-visual ${product.category1}`}>
                                <PackageIcon size={40} className="icon" />
                            </div>
                            <div className="product-details">
                                <div className="top">
                                    <span className={`category-tag ${product.category1}`}>{product.category1}</span>
                                    <h4 className="product-name">{product.name}</h4>
                                </div>
                                <div className="middle">
                                    <p className="product-memo">{product.memo || '-'}</p>
                                    <p className="product-unit">판매단위: {product.unit.toUpperCase()}</p>
                                    {product.boxWeight && (
                                        <p className="product-box"><PackageIcon size={14} className="inline mr-1" /> 중량: {product.boxWeight}kg/Box (예상)</p>
                                    )}
                                </div>
                                <div className="bottom">
                                    <div className="price-info">
                                        <span className="price-label">공급단가</span>
                                        <span className="price-value">₩{product.wholesalePrice.toLocaleString()}<small>/kg</small></span>
                                    </div>
                                    <button
                                        className="add-btn"
                                        title="주문에 추가"
                                        onClick={() => handleAddToOrder(product)}
                                    >
                                        <PlusIcon size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="product-list-container glass-card">
                    <table className="product-list-table">
                        <thead>
                            <tr>
                                <th style={{ width: '100px' }}>구분</th>
                                <th>품목명</th>
                                <th style={{ width: '100px' }}>단위</th>
                                <th>단가(kg)</th>
                                <th style={{ width: '80px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        <span className={`category-badge ${product.category1}`}>{product.category1}</span>
                                    </td>
                                    <td>
                                        <div className="cell-name">{product.name}</div>
                                        {product.boxWeight && <div className="cell-sub text-muted">예상 {product.boxWeight}kg/Box</div>}
                                    </td>
                                    <td>{product.unit.toUpperCase()}</td>
                                    <td className="font-semibold">₩{product.wholesalePrice.toLocaleString()}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-primary btn-icon-only"
                                            onClick={() => handleAddToOrder(product)}
                                            title="주문 추가"
                                        >
                                            <PlusIcon size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filtered.length === 0 && (
                <div className="empty-catalog glass-card">
                    <p>검색 결과가 없습니다.</p>
                </div>
            )}
        </div>
    )
}
