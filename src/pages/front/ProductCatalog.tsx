import { useState, useMemo, useEffect } from 'react'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { PackageIcon, SearchIcon, PlusIcon } from '../../components/Icons'
import './ProductCatalog.css'

export default function ProductCatalog() {
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

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
            if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
            return true
        })
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
                category: product.category,
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
                <h2>🍖 상품 카탈로그</h2>
                <p>TRS에서 제공하는 최상급 육류 라인업입니다.</p>
            </header>

            <div className="catalog-controls glass-card animate-slide-up">
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
                        { id: '냉장', label: '🧊 냉장' },
                        { id: '냉동', label: '❄️ 냉동' },
                        { id: '부산물', label: '🦴 부산물' }
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

            <div className="product-grid">
                {filtered.map((product, idx) => (
                    <div
                        key={product.id}
                        className="product-card glass-card animate-fade-in"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                        <div className={`product-visual ${product.category}`}>
                            <PackageIcon size={40} className="icon" />
                        </div>
                        <div className="product-details">
                            <div className="top">
                                <span className={`category-tag ${product.category}`}>{product.category}</span>
                                <h4 className="product-name">{product.name}</h4>
                            </div>
                            <div className="middle">
                                <p className="product-memo">{product.memo || '-'}</p>
                                <p className="product-unit">판매단위: {product.unit.toUpperCase()}</p>
                                {product.boxWeight && (
                                    <p className="product-box">📦 중량: {product.boxWeight}kg/Box (예상)</p>
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

            {filtered.length === 0 && (
                <div className="empty-catalog glass-card">
                    <p>검색 결과가 없습니다.</p>
                </div>
            )}
        </div>
    )
}
