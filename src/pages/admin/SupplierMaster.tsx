import { useState, useMemo, useEffect } from 'react'
import { FactoryIcon, SearchIcon, CheckCircleIcon, PauseCircleIcon, ClipboardListIcon, PhoneIcon, MapPinIcon, UserIcon, WalletIcon, FileTextIcon, AlertTriangleIcon } from '../../components/Icons'
import './OrganizationMaster.css'  // 같은 스타일 공유
import {
    getAllSuppliers,
    createSupplier,
    updateSupplier as updateSupplierFirebase,
    deleteSupplier as deleteSupplierFirebase,
    type FirestoreSupplier
} from '../../lib/supplierService'

// Supplier 타입 정의
type Supplier = Omit<FirestoreSupplier, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
}

const CATEGORY_LABELS: Record<Supplier['supplyCategory'], string> = {
    meat: '육류',
    byproduct: '부산물',
    packaging: '포장재',
    logistics: '배송/물류',
    other: '기타',
}

export default function SupplierMaster() {
    // Firebase에서 직접 로드되는 공급업체 목록
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [formData, setFormData] = useState<Partial<Supplier>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Firebase에서 공급업체 목록 로드
    const loadSuppliers = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getAllSuppliers()
            setSuppliers(data.map(s => ({
                ...s,
                createdAt: s.createdAt?.toDate?.() || new Date(),
                updatedAt: s.updatedAt?.toDate?.() || new Date(),
            })))
        } catch (err) {
            console.error('Failed to load suppliers:', err)
            setError('공급업체 목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadSuppliers()
    }, [])

    // 필터링된 공급업체 목록
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const q = searchQuery.toLowerCase()
            const name = supplier.companyName || ''
            const ceo = supplier.ceoName || ''
            const matchesSearch = !searchQuery ||
                name.toLowerCase().includes(q) ||
                (supplier.bizRegNo || '').includes(q) ||
                ceo.toLowerCase().includes(q)

            const matchesActive = filterActive === 'all' ||
                (filterActive === 'active' && supplier.isActive) ||
                (filterActive === 'inactive' && !supplier.isActive)

            return matchesSearch && matchesActive
        })
    }, [suppliers, searchQuery, filterActive])

    // 통계
    const stats = useMemo(() => ({
        total: suppliers.length,
        active: suppliers.filter(s => s.isActive).length,
        inactive: suppliers.filter(s => !s.isActive).length,
    }), [suppliers])

    // 모달 열기 - 신규 등록
    const openCreateModal = () => {
        setEditingSupplier(null)
        setFormData({
            companyName: '',
            bizRegNo: '',
            ceoName: '',
            phone: '',
            email: '',
            address: '',
            supplyCategory: 'meat',
            isActive: true,
        })
        setShowModal(true)
    }

    // 모달 열기 - 수정
    const openEditModal = (supplier: Supplier) => {
        setEditingSupplier(supplier)
        setFormData({ ...supplier })
        setShowModal(true)
    }

    // 폼 제출
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (editingSupplier) {
                // 수정 - Firebase에 직접
                await updateSupplierFirebase(editingSupplier.id, {
                    companyName: formData.companyName,
                    bizRegNo: formData.bizRegNo,
                    ceoName: formData.ceoName,
                    phone: formData.phone,
                    fax: formData.fax,
                    email: formData.email,
                    address: formData.address,
                    contactPerson: formData.contactPerson,
                    contactPhone: formData.contactPhone,
                    supplyCategory: formData.supplyCategory,
                    paymentTerms: formData.paymentTerms,
                    bankName: formData.bankName,
                    bankAccount: formData.bankAccount,
                    memo: formData.memo,
                    isActive: formData.isActive,
                })
                alert('공급업체 정보가 수정되었습니다.')
            } else {
                // 신규 등록 - Firebase에 직접
                await createSupplier({
                    companyName: formData.companyName || '',
                    bizRegNo: formData.bizRegNo || '',
                    ceoName: formData.ceoName || '',
                    phone: formData.phone || '',
                    email: formData.email || '',
                    address: formData.address || '',
                    fax: formData.fax,
                    contactPerson: formData.contactPerson,
                    contactPhone: formData.contactPhone,
                    supplyCategory: formData.supplyCategory || 'meat',
                    paymentTerms: formData.paymentTerms,
                    bankName: formData.bankName,
                    bankAccount: formData.bankAccount,
                    memo: formData.memo,
                    isActive: formData.isActive ?? true,
                })
                alert('새 공급업체가 등록되었습니다.')
            }

            await loadSuppliers()
            setShowModal(false)
            setFormData({})
        } catch (error) {
            console.error('저장 실패:', error)
            alert('저장에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // 삭제
    const handleDelete = async (supplier: Supplier) => {
        if (!confirm(`"${supplier.companyName}" 공급업체를 정말 삭제하시겠습니까?`)) return
        try {
            await deleteSupplierFirebase(supplier.id)
            await loadSuppliers()
            alert('삭제되었습니다.')
        } catch (err) {
            console.error('Delete failed:', err)
            alert('삭제에 실패했습니다.')
        }
    }

    // 활성/비활성 토글
    const toggleActive = async (supplier: Supplier) => {
        try {
            await updateSupplierFirebase(supplier.id, { isActive: !supplier.isActive })
            await loadSuppliers()
        } catch (err) {
            console.error('Toggle failed:', err)
            alert('상태 변경에 실패했습니다.')
        }
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="organization-master">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>공급업체 목록을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="organization-master">
                <div className="error-state">
                    <p>
                        <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <AlertTriangleIcon size={24} color="#ef4444" />
                        </span>
                        {error}
                    </p>
                    <button className="btn btn-primary" onClick={loadSuppliers}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="organization-master">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1><FactoryIcon size={24} /> 공급거래처 관리</h1>
                    <p className="text-secondary">제품을 공급받는 업체(공급사) 정보를 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    + 공급업체 등록
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><FactoryIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">전체 공급업체</span>
                    </div>
                </div>
                <div className="stat-card active">
                    <div className="stat-icon"><CheckCircleIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">활성 업체</span>
                    </div>
                </div>
                <div className="stat-card inactive">
                    <div className="stat-icon"><PauseCircleIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">비활성 업체</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <span className="search-icon"><SearchIcon size={18} /></span>
                    <input
                        type="text"
                        className="input"
                        placeholder="회사명, 사업자번호, 대표자 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filterActive === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterActive('all')}
                    >
                        전체
                    </button>
                    <button
                        className={`filter-tab ${filterActive === 'active' ? 'active' : ''}`}
                        onClick={() => setFilterActive('active')}
                    >
                        활성
                    </button>
                    <button
                        className={`filter-tab ${filterActive === 'inactive' ? 'active' : ''}`}
                        onClick={() => setFilterActive('inactive')}
                    >
                        비활성
                    </button>
                </div>
            </div>

            {/* Supplier Table */}
            <div className="glass-card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>상태</th>
                            <th>회사명</th>
                            <th>사업자번호</th>
                            <th>대표자</th>
                            <th>연락처</th>
                            <th>공급품목</th>
                            <th>결제조건</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="empty-row">
                                    검색 결과가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredSuppliers.map(supplier => (
                                <tr key={supplier.id} className={!supplier.isActive ? 'inactive' : ''}>
                                    <td>
                                        <span className={`status-badge ${supplier.isActive ? 'active' : 'inactive'}`}>
                                            {supplier.isActive ? '활성' : '비활성'}
                                        </span>
                                    </td>
                                    <td className="company-name">
                                        <strong>{supplier.companyName}</strong>
                                        {supplier.memo && <span className="memo-tag">메모</span>}
                                    </td>
                                    <td className="mono">{supplier.bizRegNo}</td>
                                    <td>{supplier.ceoName}</td>
                                    <td className="mono">{supplier.phone}</td>
                                    <td>
                                        <span className={`price-badge ${supplier.supplyCategory}`}>
                                            {CATEGORY_LABELS[supplier.supplyCategory]}
                                        </span>
                                    </td>
                                    <td>{supplier.paymentTerms || '-'}</td>
                                    <td className="actions">
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => openEditModal(supplier)}
                                        >
                                            수정
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => toggleActive(supplier)}
                                        >
                                            {supplier.isActive ? '비활성화' : '활성화'}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost danger"
                                            onClick={() => handleDelete(supplier)}
                                        >
                                            삭제
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingSupplier ? '공급업체 수정' : '새 공급업체 등록'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            {/* 기본 정보 */}
                            <div className="form-section">
                                <h3><ClipboardListIcon size={18} /> 기본 정보</h3>
                                <div className="form-grid">
                                    <div className="form-group required">
                                        <label>회사명</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.companyName || ''}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group required">
                                        <label>사업자등록번호</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="000-00-00000"
                                            value={formData.bizRegNo || ''}
                                            onChange={(e) => setFormData({ ...formData, bizRegNo: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group required">
                                        <label>대표자명</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.ceoName || ''}
                                            onChange={(e) => setFormData({ ...formData, ceoName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 연락처 */}
                            <div className="form-section">
                                <h3><PhoneIcon size={18} /> 연락처</h3>
                                <div className="form-grid">
                                    <div className="form-group required">
                                        <label>전화번호</label>
                                        <input
                                            type="tel"
                                            className="input"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>팩스</label>
                                        <input
                                            type="tel"
                                            className="input"
                                            value={formData.fax || ''}
                                            onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group required">
                                        <label>이메일</label>
                                        <input
                                            type="email"
                                            className="input"
                                            value={formData.email || ''}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 주소 */}
                            <div className="form-section">
                                <h3><MapPinIcon size={18} /> 주소</h3>
                                <div className="form-group required full-width">
                                    <label>본사/공장 주소</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* 담당자 정보 */}
                            <div className="form-section">
                                <h3><UserIcon size={18} /> 담당자 정보</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>담당자명</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.contactPerson || ''}
                                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>담당자 연락처</label>
                                        <input
                                            type="tel"
                                            className="input"
                                            value={formData.contactPhone || ''}
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 공급/결제 정보 */}
                            <div className="form-section">
                                <h3><WalletIcon size={18} /> 공급 및 결제 정보</h3>
                                <div className="form-grid">
                                    <div className="form-group required">
                                        <label>공급 품목</label>
                                        <select
                                            className="input"
                                            value={formData.supplyCategory || 'meat'}
                                            onChange={(e) => setFormData({ ...formData, supplyCategory: e.target.value as Supplier['supplyCategory'] })}
                                        >
                                            <option value="meat">육류</option>
                                            <option value="byproduct">부산물</option>
                                            <option value="packaging">포장재</option>
                                            <option value="other">기타</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>결제 조건</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="예: 익월 10일, 선결제"
                                            value={formData.paymentTerms || ''}
                                            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>은행명</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.bankName || ''}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>계좌번호</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.bankAccount || ''}
                                            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 메모 */}
                            <div className="form-section">
                                <h3><FileTextIcon size={18} /> 메모</h3>
                                <div className="form-group full-width">
                                    <textarea
                                        className="input textarea"
                                        rows={3}
                                        placeholder="공급업체 관련 메모를 입력하세요..."
                                        value={formData.memo || ''}
                                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* 상태 */}
                            <div className="form-section">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive ?? true}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span>활성 공급업체</span>
                                </label>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    취소
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? '저장 중...' : editingSupplier ? '수정 완료' : '등록하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
