import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PackageIcon, SearchIcon, EditIcon, XIcon, WalletIcon, FileTextIcon, UploadIcon, DownloadIcon, ChartIcon } from '../../components/Icons'
import {
    getAllProducts,
    createProduct,
    updateProduct as updateProductFirebase,
    deleteProduct as deleteProductFirebase,
    type FirestoreProduct
} from '../../lib/productService'
import { checkAndRecordPriceChange, getPriceHistoryByProduct, type PriceHistoryEntry } from '../../lib/priceHistoryService'
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
    const { user } = useAuth()
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
    const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null)
    const csvInputRef = useRef<HTMLInputElement>(null)

    // 모달 통보 전용 상태
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string,
        message: string,
        onConfirm?: () => void,
        onCancel?: () => void,
        isDanger?: boolean,
        confirmText?: string,
        cancelText?: string,
        type: 'alert' | 'confirm'
    } | null>(null)

    // 알림창 헬퍼
    const showAlert = (title: string, message: string, isDanger = false) => {
        setConfirmConfig({
            title,
            message,
            type: 'alert',
            isDanger,
            confirmText: '확인'
        })
    }

    // 확인창 헬퍼
    const showConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
        setConfirmConfig({
            title,
            message,
            type: 'confirm',
            isDanger,
            confirmText: '확인',
            cancelText: '취소',
            onConfirm: () => {
                onConfirm()
                setConfirmConfig(null)
            },
            onCancel: () => setConfirmConfig(null)
        })
    }

    // 폼 상태
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        category1: '냉장',
        category2: 'B2B',
        unit: 'kg',
        taxFree: true,
        costPrice: 0,
        wholesalePrice: 0,
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
            showAlert('입력 오류', '품목명을 입력해주세요.', true)
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
                wholesaleProfit: profit,
                wholesaleMargin: margin,
                isActive: formData.isActive !== false,
                memo: formData.memo || '',
            }

            if (editingProduct) {
                // 수정
                await updateProductFirebase(editingProduct.id, cleanData)

                // 가격 변동 기록 확인
                await checkAndRecordPriceChange(
                    editingProduct.id,
                    cleanData.name,
                    cleanData.costPrice,
                    cleanData.wholesalePrice,
                    user?.name || '시스템'
                )
            } else {
                // 신규 생성
                const newProduct = await createProduct(cleanData)

                // 최초 가격 기록
                await checkAndRecordPriceChange(
                    newProduct.id,
                    cleanData.name,
                    cleanData.costPrice,
                    cleanData.wholesalePrice,
                    user?.name || '시스템'
                )
            }

            // 목록 새로고침
            await loadProducts()
            closeModal()
            showAlert('저장 완료', editingProduct ? '상품이 수정되었습니다.' : '상품이 추가되었습니다.')
        } catch (err: any) {
            console.error('Save failed details:', err)
            showAlert('저장 실패', `저장에 실패했습니다. (${err.message || '알 수 없는 오류'})\n다시 시도해주세요.`, true)
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
                showAlert('저장 완료', `${updateCount}개의 상품 정보가 일괄 업데이트되었습니다.`)
                await loadProducts()
            }
            setShowBulkModal(false)
        } catch (err: any) {
            console.error('Bulk save failed:', err)
            showAlert('일괄 저장 실패', `일괄 저장 중 오류가 발생했습니다: ${err.message}`, true)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (product: Product) => {
        showConfirm('비활성화 확인', `"${product.name}" 상품을 삭제(비활성화)하시겠습니까?`, async () => {
            try {
                await updateProductFirebase(product.id, { isActive: false })
                await loadProducts()
                showAlert('완료', '상품이 비활성화되었습니다.')
            } catch (err) {
                console.error('Delete failed:', err)
                showAlert('오류', '비활성화에 실패했습니다.', true)
            }
        })
    }

    const handlePermanentDelete = (product: Product) => {
        showConfirm('완전 삭제 확인', `⚠️ "${product.name}" 상품을 완전히 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`, async () => {
            try {
                await deleteProductFirebase(product.id)
                await loadProducts()
                showAlert('삭제 완료', '상품이 완전히 삭제되었습니다.')
            } catch (err) {
                console.error('Permanent delete failed:', err)
                showAlert('삭제 실패', '삭제에 실패했습니다.', true)
            }
        }, true)
    }

    const handleRestore = async (product: Product) => {
        try {
            await updateProductFirebase(product.id, { isActive: true })
            await loadProducts()
            showAlert('복원 완료', '상품이 복원되었습니다.')
        } catch (err) {
            console.error('Restore failed:', err)
            showAlert('복원 실패', '복원에 실패했습니다.', true)
        }
    }

    // 가격 히스토리 조회
    const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([])
    const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear())

    const openPriceHistory = async (product: Product) => {
        try {
            setSelectedProductForHistory(product)
            setShowPriceHistoryModal(true)
            const history = await getPriceHistoryByProduct(product.id)
            setPriceHistory(history)
        } catch (err) {
            console.error('Failed to load price history:', err)
            showAlert('로드 실패', '가격 변동 이력을 불러오는데 실패했습니다.', true)
        }
    }

    // CSV 내보내기
    const handleCsvExport = () => {
        const headers = ['품목명', '카테고리1', '카테고리2', '단위', '예상중량/Box', '매입가', '도매가', '상태', '비고']
        const rows = products.map(p => [
            p.name,
            p.category1,
            p.category2,
            p.unit,
            p.boxWeight || '',
            p.costPrice,
            p.wholesalePrice,
            p.isActive ? '활성' : '비활성',
            p.memo || ''
        ])

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n')

        // BOM for Korean encoding
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `상품목록_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    // CSV 업로드 핸들러
    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setShowUploadModal(true)
        }
    }

    // 드래그 앤 드롭 핸들러
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file && file.name.endsWith('.csv')) {
            setSelectedFile(file)
        } else {
            showAlert('형식 오류', 'CSV 파일만 업로드 가능합니다.', true)
        }
    }

    // 실제 CSV 처리 로직
    const processCsvUpload = async () => {
        if (!selectedFile) return

        try {
            setSaving(true)
            const text = await selectedFile.text()
            const lines = text.split('\n').filter(line => line.trim())

            if (lines.length < 2) {
                showAlert('데이터 오류', '유효한 CSV 파일이 아닙니다.', true)
                return
            }

            // Parse header
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
            const nameIdx = headers.findIndex(h => h.includes('품목명'))
            const cat1Idx = headers.findIndex(h => h.includes('카테고리1'))
            const cat2Idx = headers.findIndex(h => h.includes('카테고리2'))
            const unitIdx = headers.findIndex(h => h.includes('단위'))
            const boxWeightIdx = headers.findIndex(h => h.includes('예상중량'))
            const costIdx = headers.findIndex(h => h.includes('매입가'))
            const wholesaleIdx = headers.findIndex(h => h.includes('도매가'))
            const memoIdx = headers.findIndex(h => h.includes('비고'))

            if (nameIdx === -1) {
                showAlert('형식 오류', '품목명 컬럼을 찾을 수 없습니다.', true)
                return
            }

            let createCount = 0
            let updateCount = 0

            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim())
                const name = cells[nameIdx]
                if (!name) continue

                const existingProduct = products.find(p => p.name === name)
                const productData = {
                    name,
                    category1: (cells[cat1Idx] || '냉장') as '냉장' | '냉동' | '부산물',
                    category2: (cells[cat2Idx] || 'B2B') as 'B2B' | 'B2C' | 'BOTH',
                    unit: (cells[unitIdx]?.toLowerCase() || 'kg') as 'kg' | 'box',
                    boxWeight: parseFloat(cells[boxWeightIdx]) || undefined,
                    costPrice: parseFloat(cells[costIdx]) || 0,
                    wholesalePrice: parseFloat(cells[wholesaleIdx]) || 0,
                    taxFree: true,
                    memo: cells[memoIdx] || '',
                    isActive: true,
                }

                if (existingProduct) {
                    await updateProductFirebase(existingProduct.id, productData)
                    await checkAndRecordPriceChange(
                        existingProduct.id,
                        productData.name,
                        productData.costPrice,
                        productData.wholesalePrice,
                        user?.name || '시스템'
                    )
                    updateCount++
                } else {
                    const newProduct = await createProduct(productData)
                    await checkAndRecordPriceChange(
                        newProduct.id,
                        productData.name,
                        productData.costPrice,
                        productData.wholesalePrice,
                        user?.name || '시스템'
                    )
                    createCount++
                }
            }

            await loadProducts()
            showAlert('업로드 완료', `CSV 업로드 완료!\n- 신규 추가: ${createCount}건\n- 업데이트: ${updateCount}건`)
            setShowUploadModal(false)
            setSelectedFile(null)
        } catch (err: any) {
            console.error('CSV upload failed:', err)
            showAlert('업로드 실패', `CSV 업로드에 실패했습니다. (${err.message || '권한 부족'})`, true)
        } finally {
            setSaving(false)
            if (csvInputRef.current) csvInputRef.current.value = ''
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
                        <PackageIcon size={24} /> {channel === 'B2B' ? '상품 데이터 베이스 관리' : channel === 'B2C' ? 'B2C 상품 관리' : '상품 관리'}
                    </h2>
                    <p className="description">
                        {channel === 'B2B' ? 'B2B 및 공용 거래 품목을 관리합니다.' : channel === 'B2C' ? 'B2C 및 공용 거래 품목을 관리합니다.' : '전체 상품 리스트를 관리하고 단가를 설정합니다.'}
                    </p>
                </div>
                <div className="header-actions">
                    <input
                        type="file"
                        ref={csvInputRef}
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleCsvUpload}
                    />
                    <button className="btn btn-ghost" onClick={handleCsvExport} title="CSV 내보내기">
                        <DownloadIcon size={18} /> CSV
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowUploadModal(true)} title="CSV 업로드">
                        <UploadIcon size={18} /> 업로드
                    </button>
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
            </div >

            {/* Filters bar */}
            < div className="filters-bar glass-card" >
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
            </div >

            {/* Product Table */}
            < div className="table-container glass-card" >
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
                                        onClick={() => openPriceHistory(product)}
                                        title="가격 변동 추이"
                                    >
                                        <ChartIcon size={16} color="#3b82f6" />
                                    </button>
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

                {
                    filteredProducts.length === 0 && (
                        <div className="empty-state">
                            <p>조건에 맞는 상품이 없습니다.</p>
                        </div>
                    )
                }
            </div >

            {/* Add/Edit Modal */}
            {
                showModal && (
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
                )
            }

            {/* Bulk Edit Modal */}
            {
                showBulkModal && (
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
                )
            }

            {/* Price History Modal */}
            {showPriceHistoryModal && selectedProductForHistory && (
                <div className="modal-backdrop" onClick={() => setShowPriceHistoryModal(false)}>
                    <div className="modal price-history-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex items-center gap-2">
                                <ChartIcon size={24} color="#3b82f6" />
                                <div>
                                    <h3 className="text-xl font-bold">{selectedProductForHistory.name} 가격 변동 추이</h3>
                                    <p className="text-xs text-slate-500">품목코드: {selectedProductForHistory.id}</p>
                                </div>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setShowPriceHistoryModal(false)}>✕</button>
                        </div>

                        <div className="modal-body overflow-visible">
                            <div className="history-summary">
                                <div className="stat-card glass-card">
                                    <span className="stat-label">현재 매입가</span>
                                    <span className="stat-value">₩{formatCurrency(selectedProductForHistory.costPrice)}</span>
                                </div>
                                <div className="stat-card glass-card">
                                    <span className="stat-label">현재 도매가</span>
                                    <span className="stat-value">₩{formatCurrency(selectedProductForHistory.wholesalePrice)}</span>
                                </div>
                                <div className="stat-card glass-card">
                                    <span className="stat-label">조회 연도</span>
                                    <select
                                        className="input select sm mt-1"
                                        value={historyYear}
                                        onChange={(e) => setHistoryYear(Number(e.target.value))}
                                    >
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Custom SVG Chart */}
                            <div className="chart-container">
                                <div className="chart-title">
                                    <span>연간 가격 변동 추이 ({historyYear}년)</span>
                                    <div className="chart-legend">
                                        <div className="legend-item">
                                            <span className="legend-color" style={{ background: '#94a3b8', border: '1px dashed #475569' }}></span>
                                            <span>매입가</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-color" style={{ background: '#3b82f6' }}></span>
                                            <span>도매가</span>
                                        </div>
                                    </div>
                                </div>

                                {priceHistory.length > 0 ? (
                                    <div className="relative">
                                        <svg className="chart-svg" viewBox="0 0 800 300">
                                            {/* Grid Lines */}
                                            {[0, 1, 2, 3, 4, 5].map(i => {
                                                const y = 20 + i * 50;
                                                return (
                                                    <g key={i}>
                                                        <line x1="50" y1={y} x2="780" y2={y} className="chart-axis" strokeDasharray="2,2" />
                                                    </g>
                                                )
                                            })}

                                            {/* Months x-axis labels */}
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const x = 50 + i * (730 / 11);
                                                return <text key={i} x={x} y="290" className="chart-label" textAnchor="middle">{i + 1}월</text>
                                            })}

                                            {/* Draw Price Lines */}
                                            {(() => {
                                                const yearHistory = priceHistory.filter(h => h.changedAt.toDate().getFullYear() === historyYear);
                                                if (yearHistory.length === 0) return null;

                                                const allPrices = yearHistory.flatMap(h => [h.costPrice, h.wholesalePrice]);
                                                const minPrice = Math.min(...allPrices) * 0.9;
                                                const maxPrice = Math.max(...allPrices) * 1.1;
                                                const range = maxPrice - minPrice || 1000;

                                                const getY = (price: number) => 270 - ((price - minPrice) / range) * 250;
                                                const getX = (date: Date) => {
                                                    const start = new Date(historyYear, 0, 1).getTime();
                                                    const end = new Date(historyYear, 11, 31).getTime();
                                                    const total = end - start;
                                                    const current = date.getTime() - start;
                                                    return 50 + (current / total) * 730;
                                                };

                                                const costPoints = yearHistory.map(h => `${getX(h.changedAt.toDate())},${getY(h.costPrice)}`).join(' ');
                                                const wholesalePoints = yearHistory.map(h => `${getX(h.changedAt.toDate())},${getY(h.wholesalePrice)}`).join(' ');

                                                return (
                                                    <>
                                                        {/* Y-axis price labels */}
                                                        {[0, 1, 2, 3, 4, 5].map(i => {
                                                            const price = maxPrice - (i * range / 5);
                                                            return <text key={i} x="45" y={20 + i * 50 + 5} className="chart-label" textAnchor="end">₩{formatCurrency(Math.floor(price / 100) * 100)}</text>
                                                        })}
                                                        <polyline points={costPoints} className="chart-line-cost" />
                                                        <polyline points={wholesalePoints} className="chart-line-wholesale" />
                                                        {yearHistory.map((h, i) => (
                                                            <g key={i}>
                                                                <circle
                                                                    cx={getX(h.changedAt.toDate())}
                                                                    cy={getY(h.wholesalePrice)}
                                                                    r="4"
                                                                    fill="#3b82f6"
                                                                    className="chart-point"
                                                                >
                                                                    <title>{h.changedAt.toDate().toLocaleDateString()}: ₩{formatCurrency(h.wholesalePrice)}</title>
                                                                </circle>
                                                                <circle
                                                                    cx={getX(h.changedAt.toDate())}
                                                                    cy={getY(h.costPrice)}
                                                                    r="3"
                                                                    fill="#94a3b8"
                                                                    className="chart-point"
                                                                >
                                                                    <title>{h.changedAt.toDate().toLocaleDateString()}: ₩{formatCurrency(h.costPrice)}</title>
                                                                </circle>
                                                            </g>
                                                        ))}
                                                    </>
                                                )
                                            })()}
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                        <ChartIcon size={48} className="mb-4 opacity-20" />
                                        <p>변동 이력이 아직 기록되지 않았습니다.</p>
                                        <p className="text-xs mt-2">가격 정보가 수정될 때마다 자동으로 기록됩니다.</p>
                                    </div>
                                )}
                            </div>

                            {/* Price History Table */}
                            <div className="price-history-table-container">
                                <table className="product-table compact">
                                    <thead>
                                        <tr>
                                            <th>변경 일시</th>
                                            <th className="price-col">매입가</th>
                                            <th className="price-col">도매가</th>
                                            <th>변동폭 (도매)</th>
                                            <th>담당자</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceHistory.slice().reverse().map((h, i, arr) => {
                                            const prev = arr[i + 1];
                                            const diff = prev ? h.wholesalePrice - prev.wholesalePrice : 0;
                                            return (
                                                <tr key={h.id || i}>
                                                    <td>{h.changedAt.toDate().toLocaleString()}</td>
                                                    <td className="price-col">₩{formatCurrency(h.costPrice)}</td>
                                                    <td className="price-col font-bold">₩{formatCurrency(h.wholesalePrice)}</td>
                                                    <td>
                                                        {diff > 0 ? (
                                                            <span className="history-trend-up">▲ ₩{formatCurrency(diff)}</span>
                                                        ) : diff < 0 ? (
                                                            <span className="history-trend-down">▼ ₩{formatCurrency(Math.abs(diff))}</span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td>{h.changedBy || '시스템'}</td>
                                                </tr>
                                            )
                                        })}
                                        {priceHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8">이력이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPriceHistoryModal(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Upload Modal */}
            {showUploadModal && (
                <div className="modal-backdrop" onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFile(null)
                }}>
                    <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex items-center gap-2">
                                <UploadIcon size={24} color="#3b82f6" />
                                <h3>상품 데이터 일괄 업로드</h3>
                            </div>
                            <button className="btn btn-ghost" onClick={() => {
                                setShowUploadModal(false)
                                setSelectedFile(null)
                            }}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div
                                className={`drag-drop-area ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => csvInputRef.current?.click()}
                            >
                                <div className="upload-icon-wrapper">
                                    <UploadIcon size={48} className="upload-icon" />
                                </div>
                                {selectedFile ? (
                                    <div className="file-info-preview">
                                        <p className="file-name">{selectedFile.name}</p>
                                        <p className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                        <span className="change-link">다른 파일 선택하기</span>
                                    </div>
                                ) : (
                                    <div className="upload-prompt">
                                        <p className="main-prompt">CSV 파일을 이 곳에 드래그하거나 클릭하여 선택하세요</p>
                                        <p className="sub-prompt">품목명, 카테고리, 단가 정보를 일괄 업데이트할 수 있습니다.</p>
                                    </div>
                                )}
                            </div>

                            <div className="upload-guide-box">
                                <h4>💡 업로드 안내</h4>
                                <ul>
                                    <li>파일 확장자는 <strong>.csv</strong>여야 합니다.</li>
                                    <li>헤더(첫 줄)에 <strong>'품목명'</strong> 컬럼이 반드시 포함되어야 합니다.</li>
                                    <li>기존에 등록된 품목명은 정보가 업데이트되고, 새로운 품목명은 신규 등록됩니다.</li>
                                    <li>단가 변경 시 가격 히스토리에 자동으로 기록됩니다.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => {
                                setShowUploadModal(false)
                                setSelectedFile(null)
                            }}>취소</button>
                            <button
                                className="btn btn-primary"
                                disabled={!selectedFile || saving}
                                onClick={processCsvUpload}
                            >
                                {saving ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="spinner-sm"></div> 처리 중...
                                    </span>
                                ) : '업로드 시작'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Final Global Confirmation/Alert Modal */}
            {confirmConfig && (
                <div className="modal-backdrop" onClick={() => setConfirmConfig(null)} style={{ zIndex: 3000 }}>
                    <div className="modal notification-modal" style={{ maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body text-center py-8">
                            <div className={`notification-icon-wrapper mb-6 mx-auto ${confirmConfig.isDanger ? 'bg-red-50' : 'bg-blue-50'} rounded-full w-20 h-20 flex items-center justify-center`}>
                                {confirmConfig.isDanger ? (
                                    <AlertTriangleIcon size={40} color="#ef4444" />
                                ) : (
                                    <PackageIcon size={40} color="var(--color-primary)" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{confirmConfig.title}</h3>
                            <p className="text-secondary whitespace-pre-wrap">{confirmConfig.message}</p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
                            {confirmConfig.type === 'confirm' && (
                                <button className="btn btn-secondary px-8" onClick={confirmConfig.onCancel}>
                                    {confirmConfig.cancelText || '취소'}
                                </button>
                            )}
                            <button
                                className={`btn ${confirmConfig.isDanger ? 'btn-danger' : 'btn-primary'} px-8`}
                                onClick={confirmConfig.onConfirm || (() => setConfirmConfig(null))}
                                style={confirmConfig.isDanger ? { backgroundColor: '#ef4444', color: 'white' } : {}}
                            >
                                {confirmConfig.confirmText || '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
