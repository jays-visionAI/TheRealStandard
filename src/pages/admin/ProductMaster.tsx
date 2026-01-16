import { useState, useMemo, useEffect } from 'react'
import { PackageIcon, SearchIcon, EditIcon, XIcon, WalletIcon, FileTextIcon } from '../../components/Icons'
import {
    getAllProducts,
    createProduct,
    updateProduct as updateProductFirebase,
    deleteProduct as deleteProductFirebase,
    type FirestoreProduct
} from '../../lib/productService'
import { AlertTriangleIcon } from '../../components/Icons'
import './ProductMaster.css'

// Product 타입 정의 (Firebase 타입에서 파생)
type Product = Omit<FirestoreProduct, 'createdAt' | 'updatedAt'> & {
    createdAt?: string
    updatedAt?: string
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function ProductMaster({ channel }: { channel?: 'B2B' | 'B2C' }) {
    // Firebase에서 직접 로드되는 상품 목록
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [showModal, setShowModal] = useState(false)
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [showInactive, setShowInactive] = useState(false)
    const [saving, setSaving] = useState(false)
    const [bulkRows, setBulkRows] = useState<Record<string, number | null | undefined>>({})

    // 폼 상태
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        category1: '냉장',
        category2: 'B2B',
        unit: 'kg',
        taxFree: true,
        costPrice: 0,
        wholesalePrice: 0,
        retailPrice: 0,
        isActive: true,
        memo: '',
    })

    // Firebase에서 상품 목록 로드
    const loadProducts = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getAllProducts()
            setProducts(data.map(p => {
                // 기존 데이터(category)가 있는 경우 category1으로 매핑
                const cat1 = p.category1 || (p as any).category || '냉장'
                const cat2 = p.category2 || 'B2B'

                return {
                    ...p,
                    category1: cat1,
                    category2: cat2,
                    createdAt: p.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                    updatedAt: p.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                }
            }))
        } catch (err) {
            console.error('Failed to load products:', err)
            setError('상품 목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadProducts()
    }, [])

    // 필터링된 상품 목록
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // 채널 필터 (B2B / B2C)
            if (channel === 'B2B') {
                if (p.category2 !== 'B2B' && p.category2 !== 'BOTH') return false
            } else if (channel === 'B2C') {
                if (p.category2 !== 'B2C' && p.category2 !== 'BOTH') return false
            }

            // 검색어 필터
            if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false
            }
            // 카테고리 필터
            if (categoryFilter !== 'all' && p.category1 !== categoryFilter) {
                return false
            }
            // 비활성 상품 필터
            if (!showInactive && !p.isActive) {
                return false
            }
            return true
        }).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }, [products, searchQuery, categoryFilter, showInactive, channel])

    // 통계
    const stats = useMemo(() => {
        const baseProducts = products.filter(p => {
            if (channel === 'B2B') return p.category2 === 'B2B' || p.category2 === 'BOTH'
            if (channel === 'B2C') return p.category2 === 'B2C' || p.category2 === 'BOTH'
            return true
        })

        return {
            total: baseProducts.length,
            active: baseProducts.filter(p => p.isActive).length,
            냉장: baseProducts.filter(p => p.category1 === '냉장').length,
            냉동: baseProducts.filter(p => p.category1 === '냉동').length,
            부산물: baseProducts.filter(p => p.category1 === '부산물').length,
        }
    }, [products, channel])

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
                category1: '냉장',
                category2: channel === 'B2C' ? 'B2C' : 'B2B',
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

    // 저장 (Firebase에 직접)
    const handleSave = async () => {
        if (!formData.name) {
            alert('품목명을 입력해주세요.')
            return
        }

        try {
            setSaving(true)

            // 데이터 정제 (undefined 방지)
            const cost = Number(formData.costPrice) || 0
            const wholesale = Number(formData.wholesalePrice) || 0
            const profit = wholesale - cost
            const margin = wholesale > 0 ? (profit / wholesale) * 100 : 0

            const cleanData = {
                name: formData.name,
                category1: formData.category1 as '냉장' | '냉동' | '부산물',
                category2: formData.category2 as 'B2B' | 'B2C' | 'BOTH',
                unit: formData.unit as 'kg' | 'box',
                boxWeight: formData.boxWeight || null,
                taxFree: !!formData.taxFree,
                costPrice: cost,
                wholesalePrice: wholesale,
                retailPrice: Number(formData.retailPrice) || 0,
                wholesaleProfit: profit,
                wholesaleMargin: margin,
                isActive: formData.isActive !== false,
                memo: formData.memo || '',
            }

            if (editingProduct) {
                // 수정
                await updateProductFirebase(editingProduct.id, cleanData)
                alert('상품이 수정되었습니다.')
            } else {
                // 신규 생성
                await createProduct(cleanData)
                alert('상품이 추가되었습니다.')
            }

            // 목록 새로고침
            await loadProducts()
            closeModal()
        } catch (err: any) {
            console.error('Save failed details:', err)
            alert(`저장에 실패했습니다. (${err.message || '알 수 없는 오류'})\n다시 시도해주세요.`)
        } finally {
            setSaving(false)
        }
    }

    // 일괄 수정 열기
    const openBulkModal = () => {
        const initialBulkData: Record<string, number | null | undefined> = {}
        products.forEach(p => {
            initialBulkData[p.id] = p.boxWeight
        })
        setBulkRows(initialBulkData)
        setShowBulkModal(true)
    }

    // 일괄 수정 저장
    const handleBulkSave = async () => {
        try {
            setSaving(true)
            let updateCount = 0

            // 변경된 항목만 추출하여 업데이트
            for (const product of products) {
                const newValue = bulkRows[product.id]
                if (newValue !== product.boxWeight) {
                    await updateProductFirebase(product.id, {
                        boxWeight: newValue || null
                    })
                    updateCount++
                }
            }

            if (updateCount > 0) {
                alert(`${updateCount}개의 상품 정보가 일괄 업데이트되었습니다.`)
                await loadProducts()
            }
            setShowBulkModal(false)
        } catch (err: any) {
            console.error('Bulk save failed:', err)
            alert(`일괄 저장 중 오류가 발생했습니다: ${err.message}`)
        } finally {
            setSaving(false)
        }
    }

    // 삭제 (비활성화)
    const handleDelete = async (product: Product) => {
        if (confirm(`"${product.name}" 상품을 삭제(비활성화)하시겠습니까?`)) {
            try {
                await updateProductFirebase(product.id, { isActive: false })
                await loadProducts()
                alert('상품이 비활성화되었습니다.')
            } catch (err) {
                console.error('Delete failed:', err)
                alert('비활성화에 실패했습니다.')
            }
        }
    }

    // 완전 삭제
    const handlePermanentDelete = async (product: Product) => {
        if (confirm(`⚠️ "${product.name}" 상품을 완전히 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
            try {
                await deleteProductFirebase(product.id)
                await loadProducts()
                alert('상품이 완전히 삭제되었습니다.')
            } catch (err) {
                console.error('Permanent delete failed:', err)
                alert('삭제에 실패했습니다.')
            }
        }
    }

    // 복원
    const handleRestore = async (product: Product) => {
        try {
            await updateProductFirebase(product.id, { isActive: true })
            await loadProducts()
            alert('상품이 복원되었습니다.')
        } catch (err) {
            console.error('Restore failed:', err)
            alert('복원에 실패했습니다.')
        }
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="product-master">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>상품 목록을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="product-master">
                <div className="error-state">
                    <p>
                        <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <AlertTriangleIcon size={24} color="#ef4444" />
                        </span>
                        {error}
                    </p>
                    <button className="btn btn-primary" onClick={loadProducts}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="product-master">
            {/* Header */}
            <header className="page-header">
                <div className="header-left">
                    <h2>
                        <PackageIcon size={24} /> {channel === 'B2B' ? 'B2B 상품 관리' : channel === 'B2C' ? 'B2C 상품 관리' : '상품 관리'}
                    </h2>
                    <p className="description">
                        {channel === 'B2B' ? 'B2B 및 공용 거래 품목을 관리합니다.' : channel === 'B2C' ? 'B2C 및 공용 거래 품목을 관리합니다.' : '전체 상품 리스트를 관리하고 단가를 설정합니다.'}
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={openBulkModal}>
                        <FileTextIcon size={18} /> 일괄 수정
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        + 상품 추가
                    </button>
                </div>
            </header>

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

            {/* Filters bar */}
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
                            <th>카테고리1(냉장/냉동)</th>
                            <th>단위</th>
                            <th>예상중량/Box</th>
                            <th className="price-col">매입가</th>
                            <th className="price-col">도매가(B2B)</th>
                            <th className="price-col">이익(도매)</th>
                            <th className="price-col">이익률(도매)</th>
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
                                    <span className={`category-badge ${product.category1}`}>
                                        {product.category1 === '냉장' ? '🧊' : product.category1 === '냉동' ? '❄️' : '🦴'} {product.category1}
                                    </span>
                                </td>
                                <td>{product.unit.toUpperCase()}</td>
                                <td>{product.boxWeight ? `${product.boxWeight} kg` : '-'}</td>
                                <td className="price-col">₩{formatCurrency(product.costPrice)}</td>
                                <td className="price-col">₩{formatCurrency(product.wholesalePrice)}</td>
                                <td className="price-col">
                                    <span className={(product.wholesaleProfit || 0) > 0 ? 'margin-positive' : 'margin-negative'}>
                                        ₩{formatCurrency(product.wholesaleProfit || 0)}
                                    </span>
                                </td>
                                <td className="price-col">
                                    <span className={(product.wholesaleMargin || 0) > 0 ? 'margin-positive' : 'margin-negative'}>
                                        {(product.wholesaleMargin || 0).toFixed(1)}%
                                    </span>
                                </td>
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
                                        <label className="label">카테고리1 (냉장/냉동)</label>
                                        <select
                                            className="input select"
                                            value={formData.category1 || '냉장'}
                                            onChange={(e) => setFormData({ ...formData, category1: e.target.value as '냉장' | '냉동' | '부산물' })}
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
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'kg' | 'box' })}
                                        >
                                            <option value="kg">KG (중량)</option>
                                            <option value="box">BOX (박스)</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="label">예상중량/Box (kg)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={formData.boxWeight || ''}
                                            onChange={(e) => setFormData({ ...formData, boxWeight: parseFloat(e.target.value) || undefined })}
                                            placeholder="예: 20"
                                        />
                                        <span className="help-text">단위가 BOX일 경우 환산 기준으로 사용됩니다.</span>
                                    </div>

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
                                {(formData.costPrice !== undefined && formData.wholesalePrice !== undefined) && (
                                    <div className="margin-info">
                                        <span>도매 마진: </span>
                                        <strong className={formData.wholesalePrice - formData.costPrice > 0 ? 'positive' : 'negative'}>
                                            ₩{formatCurrency(formData.wholesalePrice - formData.costPrice)}
                                            ({formData.costPrice > 0 ? ((formData.wholesalePrice - formData.costPrice) / formData.costPrice * 100).toFixed(1) : 0}%)
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
                            <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                                취소
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? '저장 중...' : (editingProduct ? '수정 완료' : '상품 추가')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Edit Modal */}
            {showBulkModal && (
                <div className="modal-backdrop" onClick={() => setShowBulkModal(false)}>
                    <div className="modal bulk-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📦 예상중량 일괄 수정</h3>
                            <button className="btn btn-ghost" onClick={() => setShowBulkModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p className="bulk-guide">모든 품목의 예상중량(kg/Box)을 한 화면에서 빠르게 수정할 수 있습니다.</p>
                            <div className="bulk-table-container">
                                <table className="bulk-table">
                                    <thead>
                                        <tr>
                                            <th>카테고리1</th>
                                            <th>품목명</th>
                                            <th>현재 단위</th>
                                            <th>예상중량 (kg/Box)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <span className={`category-badge ${p.category1}`}>{p.category1}</span>
                                                </td>
                                                <td><strong>{p.name}</strong></td>
                                                <td>{p.unit.toUpperCase()}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="input input-sm"
                                                        value={bulkRows[p.id] ?? ''}
                                                        onChange={(e) => setBulkRows({
                                                            ...bulkRows,
                                                            [p.id]: parseFloat(e.target.value) || undefined
                                                        })}
                                                        placeholder="예: 20"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)} disabled={saving}>
                                취소
                            </button>
                            <button className="btn btn-primary" onClick={handleBulkSave} disabled={saving}>
                                {saving ? '저장 중...' : '전체 저장 (변경된 항목만)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
