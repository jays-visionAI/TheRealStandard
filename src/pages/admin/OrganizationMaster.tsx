import { useState, useMemo } from 'react'
// Firebase 연동 시 사용 예정
// import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
// import { db } from '../../lib/firebase'
import './OrganizationMaster.css'

// 거래처 인터페이스
interface Customer {
    id: string
    // 기본 정보
    companyName: string
    bizRegNo: string           // 사업자등록번호
    ceoName: string            // 대표자명
    // 연락처
    phone: string
    fax?: string
    email: string
    // 주소
    address: string            // 본사 주소
    shipAddress1: string       // 배송지 주소 1
    shipAddress2?: string      // 배송지 주소 2
    // 담당자 정보
    contactPerson?: string     // 담당자명
    contactPhone?: string      // 담당자 연락처
    // 거래 정보
    priceType: 'wholesale' | 'retail'  // 도매가 / 소매가 적용
    paymentTerms?: string      // 결제 조건
    creditLimit?: number       // 신용 한도
    // 메모
    memo?: string
    // 상태
    isActive: boolean
    isKeyAccount: boolean      // ⭐ 주요 거래처 여부
    createdAt: Date
    updatedAt: Date
}

// Mock 데이터
const mockCustomers: Customer[] = [
    {
        id: 'cust-001',
        companyName: '한우명가',
        bizRegNo: '123-45-67890',
        ceoName: '김대표',
        phone: '02-1234-5678',
        fax: '02-1234-5679',
        email: 'order@hanwoo.co.kr',
        address: '서울시 강남구 역삼동 123-45',
        shipAddress1: '서울시 강남구 역삼동 123-45 (본점)',
        shipAddress2: '서울시 서초구 서초동 456-78 (2호점)',
        contactPerson: '이과장',
        contactPhone: '010-1234-5678',
        priceType: 'wholesale',
        paymentTerms: '월말 정산',
        creditLimit: 50000000,
        memo: 'VIP 거래처',
        isActive: true,
        isKeyAccount: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'cust-002',
        companyName: '정육의달인',
        bizRegNo: '234-56-78901',
        ceoName: '박사장',
        phone: '02-2345-6789',
        email: 'master@meat.co.kr',
        address: '서울시 서초구 방배동 234-56',
        shipAddress1: '서울시 서초구 방배동 234-56',
        contactPerson: '최대리',
        contactPhone: '010-2345-6789',
        priceType: 'wholesale',
        paymentTerms: '선결제',
        isActive: true,
        isKeyAccount: true,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
    },
    {
        id: 'cust-003',
        companyName: '고기마을',
        bizRegNo: '345-67-89012',
        ceoName: '최사장',
        phone: '031-345-6789',
        email: 'info@meatvillage.kr',
        address: '경기도 성남시 분당구 정자동 345',
        shipAddress1: '경기도 성남시 분당구 정자동 345',
        priceType: 'retail',
        isActive: false,
        isKeyAccount: false,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-20'),
    },
]

export default function OrganizationMaster() {
    const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
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
                // 수정
                const updatedCustomer: Customer = {
                    ...editingCustomer,
                    ...formData,
                    updatedAt: new Date(),
                } as Customer

                // Firestore 업데이트 (향후)
                // await updateDoc(doc(db, 'customers', editingCustomer.id), formData)

                setCustomers(prev => prev.map(c =>
                    c.id === editingCustomer.id ? updatedCustomer : c
                ))
                alert('✅ 거래처 정보가 수정되었습니다.')
            } else {
                // 신규 등록
                const newCustomer: Customer = {
                    id: `cust-${Date.now()}`,
                    ...formData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as Customer

                // Firestore 저장 (향후)
                // await addDoc(collection(db, 'customers'), newCustomer)

                setCustomers(prev => [...prev, newCustomer])
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
    const handleDelete = async (customer: Customer) => {
        if (!confirm(`"${customer.companyName}" 거래처를 정말 삭제하시겠습니까?`)) return

        try {
            // Firestore 삭제 (향후)
            // await deleteDoc(doc(db, 'customers', customer.id))

            setCustomers(prev => prev.filter(c => c.id !== customer.id))
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('삭제 실패:', error)
            alert('삭제에 실패했습니다.')
        }
    }

    // 활성/비활성 토글
    const toggleActive = async (customer: Customer) => {
        const updated = { ...customer, isActive: !customer.isActive, updatedAt: new Date() }
        setCustomers(prev => prev.map(c => c.id === customer.id ? updated : c))
    }

    // 숫자 포맷 (향후 신용한도 표시에 사용)
    // const formatCurrency = (value?: number) =>
    //     value ? new Intl.NumberFormat('ko-KR').format(value) : '-'

    return (
        <div className="organization-master">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>🏢 거래처 관리</h1>
                    <p className="text-secondary">발주 고객사 정보를 등록하고 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    + 거래처 등록
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">전체 거래처</span>
                    </div>
                </div>
                <div className="stat-card active">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">활성 거래처</span>
                    </div>
                </div>
                <div className="stat-card inactive">
                    <div className="stat-icon">⏸️</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">비활성 거래처</span>
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
                                        {customer.isKeyAccount && <span className="key-account-badge">⭐</span>}
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
                                            onClick={() => toggleActive(customer)}
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
                                <h3>📍 주소</h3>
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
                                            placeholder="010-0000-0000"
                                            value={formData.contactPhone || ''}
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 거래 정보 */}
                            <div className="form-section">
                                <h3>💰 거래 정보</h3>
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
                                <h3>📝 메모</h3>
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
