import { useState, useMemo } from 'react'
import './OrganizationMaster.css'  // 같은 스타일 공유

// 공급업체 인터페이스
interface Supplier {
    id: string
    // 기본 정보
    companyName: string
    bizRegNo: string
    ceoName: string
    // 연락처
    phone: string
    fax?: string
    email: string
    // 주소
    address: string
    // 담당자 정보
    contactPerson?: string
    contactPhone?: string
    // 공급 정보
    supplyCategory: 'meat' | 'byproduct' | 'packaging' | 'other'  // 공급 품목 카테고리
    paymentTerms?: string
    bankName?: string
    bankAccount?: string
    // 메모
    memo?: string
    // 상태
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// Mock 데이터
const mockSuppliers: Supplier[] = [
    {
        id: 'supp-001',
        companyName: '돈우농장',
        bizRegNo: '111-22-33333',
        ceoName: '박농장',
        phone: '031-111-2222',
        email: 'donwoo@farm.co.kr',
        address: '경기도 이천시 모가면 농장로 123',
        contactPerson: '김과장',
        contactPhone: '010-1111-2222',
        supplyCategory: 'meat',
        paymentTerms: '익월 10일',
        bankName: '농협은행',
        bankAccount: '123-4567-8901-23',
        memo: '한돈 주요 공급처',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-01'),
    },
    {
        id: 'supp-002',
        companyName: '한우목장',
        bizRegNo: '222-33-44444',
        ceoName: '이목장',
        phone: '033-222-3333',
        email: 'hanwoo@ranch.co.kr',
        address: '강원도 횡성군 안흥면 목장길 456',
        contactPerson: '최대리',
        contactPhone: '010-2222-3333',
        supplyCategory: 'meat',
        paymentTerms: '선결제',
        isActive: true,
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date('2023-12-15'),
    },
    {
        id: 'supp-003',
        companyName: '부산물유통',
        bizRegNo: '333-44-55555',
        ceoName: '최부산',
        phone: '02-333-4444',
        email: 'byproduct@trade.co.kr',
        address: '서울시 마포구 도화동 789',
        supplyCategory: 'byproduct',
        isActive: false,
        createdAt: new Date('2022-03-01'),
        updatedAt: new Date('2023-06-30'),
    },
]

const CATEGORY_LABELS: Record<Supplier['supplyCategory'], string> = {
    meat: '육류',
    byproduct: '부산물',
    packaging: '포장재',
    other: '기타',
}

export default function SupplierMaster() {
    const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [formData, setFormData] = useState<Partial<Supplier>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 필터링된 공급업체 목록
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const q = searchQuery.toLowerCase()
            const matchesSearch = !searchQuery ||
                supplier.companyName.toLowerCase().includes(q) ||
                supplier.bizRegNo.includes(q) ||
                supplier.ceoName.toLowerCase().includes(q)

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
                const updatedSupplier: Supplier = {
                    ...editingSupplier,
                    ...formData,
                    updatedAt: new Date(),
                } as Supplier

                setSuppliers(prev => prev.map(s =>
                    s.id === editingSupplier.id ? updatedSupplier : s
                ))
                alert('✅ 공급업체 정보가 수정되었습니다.')
            } else {
                const newSupplier: Supplier = {
                    id: `supp-${Date.now()}`,
                    ...formData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as Supplier

                setSuppliers(prev => [...prev, newSupplier])
                alert('✅ 새 공급업체가 등록되었습니다.')
            }

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

        setSuppliers(prev => prev.filter(s => s.id !== supplier.id))
        alert('삭제되었습니다.')
    }

    // 활성/비활성 토글
    const toggleActive = (supplier: Supplier) => {
        const updated = { ...supplier, isActive: !supplier.isActive, updatedAt: new Date() }
        setSuppliers(prev => prev.map(s => s.id === supplier.id ? updated : s))
    }

    return (
        <div className="organization-master">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>🏭 공급거래처 관리</h1>
                    <p className="text-secondary">제품을 공급받는 업체(공급사) 정보를 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    + 공급업체 등록
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🏭</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">전체 공급업체</span>
                    </div>
                </div>
                <div className="stat-card active">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">활성 업체</span>
                    </div>
                </div>
                <div className="stat-card inactive">
                    <div className="stat-icon">⏸️</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">비활성 업체</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
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
                                <h3>📋 기본 정보</h3>
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
                                <h3>📞 연락처</h3>
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
                                <h3>📍 주소</h3>
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
                                <h3>👤 담당자 정보</h3>
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
                                <h3>💰 공급 및 결제 정보</h3>
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
                                <h3>📝 메모</h3>
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
