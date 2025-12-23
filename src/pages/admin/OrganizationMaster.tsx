import { useState, useMemo } from 'react'
import { useCustomerStore, type Customer } from '../../stores/customerStore'
import { BuildingIcon, SearchIcon, CheckCircleIcon, UsersIcon, StarIcon, ClipboardListIcon, PhoneIcon, MapPinIcon, UserIcon, WalletIcon, FileTextIcon, PauseCircleIcon } from '../../components/Icons'
import './OrganizationMaster.css'

export default function OrganizationMaster() {
    // 공유 스토어에서 데이터 가져오기
    const { customers, addCustomer, updateCustomer, deleteCustomer, toggleActive } = useCustomerStore()

    const [searchQuery, setSearchQuery] = useState('')
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [formData, setFormData] = useState<Partial<Customer>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 필터링된 거래처 목록
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            // 검색 필터
            const q = searchQuery.toLowerCase()
            const matchesSearch = !searchQuery ||
                customer.companyName.toLowerCase().includes(q) ||
                customer.bizRegNo.includes(q) ||
                customer.ceoName.toLowerCase().includes(q) ||
                customer.email.toLowerCase().includes(q)

            // 활성 상태 필터
            const matchesActive = filterActive === 'all' ||
                (filterActive === 'active' && customer.isActive) ||
                (filterActive === 'inactive' && !customer.isActive)

            return matchesSearch && matchesActive
        })
    }, [customers, searchQuery, filterActive])

    // 통계
    const stats = useMemo(() => ({
        total: customers.length,
        active: customers.filter(c => c.isActive).length,
        inactive: customers.filter(c => !c.isActive).length,
    }), [customers])

    // 모달 열기 - 신규 등록
    const openCreateModal = () => {
        setEditingCustomer(null)
        setFormData({
            companyName: '',
            bizRegNo: '',
            ceoName: '',
            phone: '',
            email: '',
            address: '',
            shipAddress1: '',
            priceType: 'wholesale',
            isActive: true,
            isKeyAccount: false,
        })
        setShowModal(true)
    }

    // 모달 열기 - 수정
    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer)
        setFormData({ ...customer })
        setShowModal(true)
    }

    // 폼 제출
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (editingCustomer) {
                // 수정 - 스토어 메서드 사용
                updateCustomer(editingCustomer.id, formData)
                alert('✅ 거래처 정보가 수정되었습니다.')
            } else {
                // 신규 등록
                const newCustomer: Customer = {
                    id: `cust-${Date.now()}`,
                    companyName: formData.companyName || '',
                    bizRegNo: formData.bizRegNo || '',
                    ceoName: formData.ceoName || '',
                    phone: formData.phone || '',
                    email: formData.email || '',
                    address: formData.address || '',
                    shipAddress1: formData.shipAddress1 || '',
                    shipAddress2: formData.shipAddress2,
                    fax: formData.fax,
                    contactPerson: formData.contactPerson,
                    contactPhone: formData.contactPhone,
                    priceType: formData.priceType || 'wholesale',
                    paymentTerms: formData.paymentTerms,
                    creditLimit: formData.creditLimit,
                    memo: formData.memo,
                    isActive: formData.isActive ?? true,
                    isKeyAccount: formData.isKeyAccount ?? false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
                addCustomer(newCustomer)
                alert('✅ 새 거래처가 등록되었습니다.')
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
    const handleDelete = (customer: Customer) => {
        if (!confirm(`"${customer.companyName}" 거래처를 정말 삭제하시겠습니까?`)) return
        deleteCustomer(customer.id)
        alert('삭제되었습니다.')
    }

    // 활성/비활성 토글
    const handleToggleActive = (customer: Customer) => {
        toggleActive(customer.id)
    }

    // 숫자 포맷 (향후 신용한도 표시에 사용)
    // const formatCurrency = (value?: number) =>
    //     value ? new Intl.NumberFormat('ko-KR').format(value) : '-'

    return (
        <div className="organization-master">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1><BuildingIcon size={24} /> 거래처 관리</h1>
                    <p className="text-secondary">발주 고객사 정보를 등록하고 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    + 거래처 등록
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><UsersIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">전체 거래처</span>
                    </div>
                </div>
                <div className="stat-card active">
                    <div className="stat-icon"><CheckCircleIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">활성 거래처</span>
                    </div>
                </div>
                <div className="stat-card inactive">
                    <div className="stat-icon"><PauseCircleIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">비활성 거래처</span>
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
                        placeholder="회사명, 사업자번호, 대표자, 이메일 검색..."
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

            {/* Customer Table */}
            <div className="glass-card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>상태</th>
                            <th>회사명</th>
                            <th>사업자번호</th>
                            <th>대표자</th>
                            <th>연락처</th>
                            <th>이메일</th>
                            <th>가격타입</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="empty-row">
                                    검색 결과가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredCustomers.map(customer => (
                                <tr key={customer.id} className={!customer.isActive ? 'inactive' : ''}>
                                    <td>
                                        <span className={`status-badge ${customer.isActive ? 'active' : 'inactive'}`}>
                                            {customer.isActive ? '활성' : '비활성'}
                                        </span>
                                    </td>
                                    <td className="company-name">
                                        {customer.isKeyAccount && <span className="key-account-badge"><StarIcon size={14} /></span>}
                                        <strong>{customer.companyName}</strong>
                                        {customer.memo && <span className="memo-tag">메모</span>}
                                    </td>
                                    <td className="mono">{customer.bizRegNo}</td>
                                    <td>{customer.ceoName}</td>
                                    <td className="mono">{customer.phone}</td>
                                    <td>{customer.email}</td>
                                    <td>
                                        <span className={`price-badge ${customer.priceType}`}>
                                            {customer.priceType === 'wholesale' ? '도매' : '소매'}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => openEditModal(customer)}
                                        >
                                            수정
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => handleToggleActive(customer)}
                                        >
                                            {customer.isActive ? '비활성화' : '활성화'}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost danger"
                                            onClick={() => handleDelete(customer)}
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
                            <h2>{editingCustomer ? '거래처 수정' : '새 거래처 등록'}</h2>
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
                                            placeholder="02-0000-0000"
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
                                    <label>본사 주소</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group required full-width">
                                    <label>배송지 주소 1</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.shipAddress1 || ''}
                                        onChange={(e) => setFormData({ ...formData, shipAddress1: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>배송지 주소 2 (선택)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.shipAddress2 || ''}
                                        onChange={(e) => setFormData({ ...formData, shipAddress2: e.target.value })}
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
                                            placeholder="010-0000-0000"
                                            value={formData.contactPhone || ''}
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 거래 정보 */}
                            <div className="form-section">
                                <h3><WalletIcon size={18} /> 거래 정보</h3>
                                <div className="form-grid">
                                    <div className="form-group required">
                                        <label>가격 타입</label>
                                        <select
                                            className="input"
                                            value={formData.priceType || 'wholesale'}
                                            onChange={(e) => setFormData({ ...formData, priceType: e.target.value as 'wholesale' | 'retail' })}
                                        >
                                            <option value="wholesale">도매가 적용</option>
                                            <option value="retail">소매가 적용</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>결제 조건</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="예: 월말 정산, 선결제"
                                            value={formData.paymentTerms || ''}
                                            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>신용 한도 (원)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={formData.creditLimit || ''}
                                            onChange={(e) => setFormData({ ...formData, creditLimit: parseInt(e.target.value) || undefined })}
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
                                        placeholder="거래처 관련 메모를 입력하세요..."
                                        value={formData.memo || ''}
                                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* 상태 */}
                            <div className="form-section checkbox-section">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.isKeyAccount ?? false}
                                        onChange={(e) => setFormData({ ...formData, isKeyAccount: e.target.checked })}
                                    />
                                    <span>⭐ 주요 거래처 (주문장 생성 시 상단에 노출)</span>
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive ?? true}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span>활성 거래처</span>
                                </label>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    취소
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? '저장 중...' : editingCustomer ? '수정 완료' : '등록하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
