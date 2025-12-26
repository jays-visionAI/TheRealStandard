import { useState, useMemo } from 'react'
import { PackageIcon, SearchIcon, EditIcon, XIcon, WalletIcon, FileTextIcon } from '../../components/Icons'
import './ProductMaster.css'

// ============================================
// 상품 인터페이스 - 다양한 가격 체계 지원
// ============================================
interface Product {
    id: string
    name: string
    category: '냉장' | '냉동' | '부산물'
    subCategory?: string
    unit: 'kg' | 'box'
    boxWeight?: number       // box당 중량 (kg)
    taxFree: boolean         // 면세 여부

    // 다양한 가격 체계
    costPrice: number        // 매입가 (원/kg)
    wholesalePrice: number   // 도매가/B2B 공급가 (원/kg)
    retailPrice: number      // 소매가/직판장가 (원/kg)

    isActive: boolean        // 활성화 여부
    memo?: string            // 비고
    createdAt: string
    updatedAt: string
}

// ============================================
// Mock 상품 데이터 (실제로는 Firebase/API에서 로드)
// ============================================
const INITIAL_PRODUCTS: Product[] = []

// ============================================
// 메인 컴포넌트
// ============================================
export default function ProductMaster() {
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [showInactive, setShowInactive] = useState(false)

    // 폼 상태
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        category: '냉장',
        unit: 'kg',
        taxFree: true,
        costPrice: 0,
        wholesalePrice: 0,
        retailPrice: 0,
        isActive: true,
        memo: '',
    })

    // 필터링된 상품 목록
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // 검색어 필터
            if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false
            }
            // 카테고리 필터
            if (categoryFilter !== 'all' && p.category !== categoryFilter) {
                return false
            }
            // 비활성 상품 필터
            if (!showInactive && !p.isActive) {
                return false
            }
            return true
        })
    }, [products, searchQuery, categoryFilter, showInactive])

    // 통계
    const stats = useMemo(() => ({
        total: products.length,
        active: products.filter(p => p.isActive).length,
        냉장: products.filter(p => p.category === '냉장').length,
        냉동: products.filter(p => p.category === '냉동').length,
        부산물: products.filter(p => p.category === '부산물').length,
    }), [products])

    // 통화 포맷
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR').format(value)
    }

    // 모달 열기 (신규/수정)
    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product)
            setFormData({ ...product })
        } else {
            setEditingProduct(null)
            setFormData({
                name: '',
                category: '냉장',
                unit: 'kg',
                taxFree: true,
                costPrice: 0,
                wholesalePrice: 0,
                retailPrice: 0,
                isActive: true,
                memo: '',
            })
        }
        setShowModal(true)
    }

    // 모달 닫기
    const closeModal = () => {
        setShowModal(false)
        setEditingProduct(null)
    }

    // 저장
    const handleSave = () => {
        if (!formData.name) {
            alert('품목명을 입력해주세요.')
            return
        }

        const now = new Date().toISOString().split('T')[0]

        if (editingProduct) {
            // 수정
            setProducts(prev => prev.map(p =>
                p.id === editingProduct.id
                    ? { ...p, ...formData, updatedAt: now } as Product
                    : p
            ))
            alert('✅ 상품이 수정되었습니다.')
        } else {
            // 신규
            const newProduct: Product = {
                id: `p${Date.now()}`,
                name: formData.name || '',
                category: formData.category as '냉장' | '냉동' | '부산물',
                unit: formData.unit as 'kg' | 'box',
                boxWeight: formData.boxWeight,
                taxFree: formData.taxFree ?? true,
                costPrice: formData.costPrice || 0,
                wholesalePrice: formData.wholesalePrice || 0,
                retailPrice: formData.retailPrice || 0,
                isActive: formData.isActive ?? true,
                memo: formData.memo,
                createdAt: now,
                updatedAt: now,
            }
            setProducts(prev => [...prev, newProduct])
            alert('✅ 상품이 추가되었습니다.')
        }

        closeModal()
    }

    // 삭제 (비활성화)
    const handleDelete = (product: Product) => {
        if (confirm(`"${product.name}" 상품을 삭제(비활성화)하시겠습니까?`)) {
            setProducts(prev => prev.map(p =>
                p.id === product.id ? { ...p, isActive: false } : p
            ))
            alert('상품이 비활성화되었습니다.')
        }
    }

    // 완전 삭제
    const handlePermanentDelete = (product: Product) => {
        if (confirm(`⚠️ "${product.name}" 상품을 완전히 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
            setProducts(prev => prev.filter(p => p.id !== product.id))
            alert('상품이 완전히 삭제되었습니다.')
        }
    }

    // 복원
    const handleRestore = (product: Product) => {
        setProducts(prev => prev.map(p =>
            p.id === product.id ? { ...p, isActive: true } : p
        ))
        alert('상품이 복원되었습니다.')
    }

    return (
        <div className="product-master">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1><PackageIcon size={24} /> 상품 마스터</h1>
                    <p className="text-secondary">상품 정보 및 가격 관리</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    + 상품 추가
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card glass-card">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">전체 상품</span>
                </div>
                <div className="stat-card glass-card">
                    <span className="stat-value">{stats.active}</span>
                    <span className="stat-label">활성 상품</span>
                </div>
                <div className="stat-card glass-card cold">
                    <span className="stat-value">{stats.냉장}</span>
                    <span className="stat-label">냉장</span>
                </div>
                <div className="stat-card glass-card frozen">
                    <span className="stat-value">{stats.냉동}</span>
                    <span className="stat-label">냉동</span>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <span className="search-icon"><SearchIcon size={18} /></span>
                    <input
                        type="text"
                        className="input"
                        placeholder="품목명 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="input select"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">전체 카테고리</option>
                        <option value="냉장">🧊 냉장</option>
                        <option value="냉동">❄️ 냉동</option>
                        <option value="부산물">🦴 부산물</option>
                    </select>

                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                        />
                        비활성 상품 표시
                    </label>
                </div>
            </div>

            {/* Product Table */}
            <div className="table-container glass-card">
                <table className="product-table">
                    <thead>
                        <tr>
                            <th>품목명</th>
                            <th>카테고리</th>
                            <th>단위</th>
                            <th className="price-col">매입가</th>
                            <th className="price-col">도매가(B2B)</th>
                            <th className="price-col">소매가(직판)</th>
                            <th>상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id} className={!product.isActive ? 'inactive' : ''}>
                                <td className="product-name">
                                    <span className="name">{product.name}</span>
                                    {product.memo && <span className="memo">{product.memo}</span>}
                                </td>
                                <td>
                                    <span className={`category-badge ${product.category}`}>
                                        {product.category === '냉장' ? '🧊' : product.category === '냉동' ? '❄️' : '🦴'} {product.category}
                                    </span>
                                </td>
                                <td>{product.unit.toUpperCase()}</td>
                                <td className="price-col">₩{formatCurrency(product.costPrice)}</td>
                                <td className="price-col">₩{formatCurrency(product.wholesalePrice)}</td>
                                <td className="price-col">₩{formatCurrency(product.retailPrice)}</td>
                                <td>
                                    {product.isActive ? (
                                        <span className="status-badge active">활성</span>
                                    ) : (
                                        <span className="status-badge inactive">비활성</span>
                                    )}
                                </td>
                                <td className="actions">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => openModal(product)}
                                        title="수정"
                                    >
                                        <EditIcon size={16} />
                                    </button>
                                    {product.isActive ? (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleDelete(product)}
                                            title="비활성화"
                                        >
                                            🗑️
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleRestore(product)}
                                                title="복원"
                                            >
                                                ♻️
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm danger"
                                                onClick={() => handlePermanentDelete(product)}
                                                title="완전삭제"
                                            >
                                                <XIcon size={14} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredProducts.length === 0 && (
                    <div className="empty-state">
                        <p>조건에 맞는 상품이 없습니다.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal product-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingProduct ? '상품 수정' : '새 상품 추가'}</h3>
                            <button className="btn btn-ghost" onClick={closeModal}>✕</button>
                        </div>

                        <div className="modal-body">
                            {/* 기본 정보 */}
                            <div className="form-section">
                                <h4>기본 정보</h4>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label className="label">품목명 *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="예: 삼겹살(대패)"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="label">카테고리</label>
                                        <select
                                            className="input select"
                                            value={formData.category || '냉장'}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        >
                                            <option value="냉장">🧊 냉장</option>
                                            <option value="냉동">❄️ 냉동</option>
                                            <option value="부산물">🦴 부산물</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="label">단위</label>
                                        <select
                                            className="input select"
                                            value={formData.unit || 'kg'}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                                        >
                                            <option value="kg">KG (중량)</option>
                                            <option value="box">BOX (박스)</option>
                                        </select>
                                    </div>

                                    {formData.unit === 'box' && (
                                        <div className="form-group">
                                            <label className="label">박스당 중량 (kg)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.boxWeight || ''}
                                                onChange={(e) => setFormData({ ...formData, boxWeight: parseFloat(e.target.value) || undefined })}
                                                placeholder="20"
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.taxFree ?? true}
                                                onChange={(e) => setFormData({ ...formData, taxFree: e.target.checked })}
                                            />
                                            면세 상품
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* 가격 정보 */}
                            <div className="form-section">
                                <h4><WalletIcon size={18} /> 가격 정보 (원/kg)</h4>
                                <div className="form-grid price-grid">
                                    <div className="form-group">
                                        <label className="label">매입가</label>
                                        <div className="input-with-unit">
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.costPrice || ''}
                                                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                                                placeholder="15000"
                                            />
                                            <span className="unit">원</span>
                                        </div>
                                        <span className="help-text">공급업체로부터 매입하는 가격</span>
                                    </div>

                                    <div className="form-group">
                                        <label className="label">도매가 (B2B 공급가)</label>
                                        <div className="input-with-unit">
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.wholesalePrice || ''}
                                                onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                                                placeholder="17500"
                                            />
                                            <span className="unit">원</span>
                                        </div>
                                        <span className="help-text">거래처에 공급하는 가격</span>
                                    </div>

                                    <div className="form-group">
                                        <label className="label">소매가 (직판장/돈우매장)</label>
                                        <div className="input-with-unit">
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.retailPrice || ''}
                                                onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) || 0 })}
                                                placeholder="25000"
                                            />
                                            <span className="unit">원</span>
                                        </div>
                                        <span className="help-text">매장에서 소비자에게 판매하는 가격</span>
                                    </div>
                                </div>

                                {/* 마진 계산 */}
                                {formData.costPrice && formData.wholesalePrice && (
                                    <div className="margin-info">
                                        <span>도매 마진: </span>
                                        <strong className={formData.wholesalePrice - formData.costPrice > 0 ? 'positive' : 'negative'}>
                                            ₩{formatCurrency(formData.wholesalePrice - formData.costPrice)}
                                            ({((formData.wholesalePrice - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%)
                                        </strong>
                                    </div>
                                )}
                            </div>

                            {/* 비고 */}
                            <div className="form-section">
                                <h4><FileTextIcon size={18} /> 비고</h4>
                                <textarea
                                    className="input textarea"
                                    value={formData.memo || ''}
                                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                    placeholder="추가 메모 (예: 특수 부위, 계절 상품 등)"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeModal}>
                                취소
                            </button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {editingProduct ? '수정 완료' : '상품 추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
