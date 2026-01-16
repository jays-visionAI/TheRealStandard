import { useState, useMemo, useEffect } from 'react'
import { TruckIcon, SearchIcon, CheckCircleIcon, PauseCircleIcon, ClipboardListIcon, PhoneIcon, MapPinIcon, UserIcon, WalletIcon, FileTextIcon, AlertTriangleIcon } from '../../components/Icons'
import './OrganizationMaster.css'  // 같은 스타일 공유
import {
    getAllSuppliers,
    createSupplier,
    updateSupplier as updateSupplierFirebase,
    deleteSupplier as deleteSupplierFirebase,
    type FirestoreSupplier
} from '../../lib/supplierService'

// Supplier 타입 정의 (배송업체용으로 재사용)
type Carrier = Omit<FirestoreSupplier, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
}

const CATEGORY_LABELS: Record<NonNullable<Carrier['supplyCategory']>, string> = {
    meat: '육류',
    byproduct: '부산물',
    packaging: '포장재',
    logistics: '배송/물류',
    other: '기타',
}

export default function CarrierMaster() {
    const [carriers, setCarriers] = useState<Carrier[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null)
    const [formData, setFormData] = useState<Partial<Carrier>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Firebase에서 배송업체 목록 로드 (logistics 카테고리만 필터링하거나 전체 로드 후 필터링)
    const loadCarriers = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getAllSuppliers()
            // 배송업체 전용이므로 logistics 카테고리인 것만 필터링하여 표시
            setCarriers(data
                .filter(s => s.supplyCategory === 'logistics')
                .map(s => ({
                    ...s,
                    createdAt: s.createdAt?.toDate?.() || new Date(),
                    updatedAt: s.updatedAt?.toDate?.() || new Date(),
                })))
        } catch (err) {
            console.error('Failed to load carriers:', err)
            setError('배송업체 목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCarriers()
    }, [])

    const filteredCarriers = useMemo(() => {
        return carriers.filter(carrier => {
            const q = searchQuery.toLowerCase()
            const name = carrier.companyName || ''
            const ceo = carrier.ceoName || ''
            const matchesSearch = !searchQuery ||
                name.toLowerCase().includes(q) ||
                (carrier.bizRegNo || '').includes(q) ||
                ceo.toLowerCase().includes(q)

            const matchesActive = filterActive === 'all' ||
                (filterActive === 'active' && carrier.isActive) ||
                (filterActive === 'inactive' && !carrier.isActive)

            return matchesSearch && matchesActive
        })
    }, [carriers, searchQuery, filterActive])

    const stats = useMemo(() => ({
        total: carriers.length,
        active: carriers.filter(c => c.isActive).length,
        inactive: carriers.filter(c => !c.isActive).length,
    }), [carriers])

    const openCreateModal = () => {
        setEditingCarrier(null)
        setFormData({
            companyName: '',
            bizRegNo: '',
            ceoName: '',
            phone: '',
            email: '',
            address: '',
            supplyCategory: 'logistics',
            isActive: true,
        })
        setShowModal(true)
    }

    const openEditModal = (carrier: Carrier) => {
        setEditingCarrier(carrier)
        setFormData({ ...carrier })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (editingCarrier) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { createdAt, updatedAt, id, ...updateData } = formData;
                await updateSupplierFirebase(editingCarrier.id, {
                    ...updateData,
                    supplyCategory: 'logistics'
                })
                alert('배송업체 정보가 수정되었습니다.')
            } else {
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
                    supplyCategory: 'logistics',
                    paymentTerms: formData.paymentTerms,
                    bankName: formData.bankName,
                    bankAccount: formData.bankAccount,
                    memo: formData.memo,
                    isActive: formData.isActive ?? true,
                })
                alert('새 배송업체가 등록되었습니다.')
            }

            await loadCarriers()
            setShowModal(false)
            setFormData({})
        } catch (error) {
            console.error('저장 실패:', error)
            alert('저장에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (carrier: Carrier) => {
        if (!confirm(`"${carrier.companyName}" 배송업체를 정말 삭제하시겠습니까?`)) return
        try {
            await deleteSupplierFirebase(carrier.id)
            await loadCarriers()
            alert('삭제되었습니다.')
        } catch (err) {
            console.error('Delete failed:', err)
            alert('삭제에 실패했습니다.')
        }
    }

    const toggleActive = async (carrier: Carrier) => {
        try {
            await updateSupplierFirebase(carrier.id, { isActive: !carrier.isActive })
            await loadCarriers()
        } catch (err) {
            console.error('Toggle failed:', err)
            alert('상태 변경에 실패했습니다.')
        }
    }

    if (loading) {
        return (
            <div className="organization-master">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>배송업체 목록을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="organization-master">
            <div className="page-header">
                <div>
                    <h1><TruckIcon size={24} /> 배송업체 관리</h1>
                    <p className="text-secondary">3PL 배송업체 및 물류 협력사 정보를 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    + 배송업체 등록
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><TruckIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">전체 배송업체</span>
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

            <div className="glass-card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>상태</th>
                            <th>회사명</th>
                            <th>사업자번호</th>
                            <th>대표자</th>
                            <th>연락처</th>
                            <th>담당자</th>
                            <th>담당자 연락처</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCarriers.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="empty-row">
                                    등록된 배송업체가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredCarriers.map(carrier => (
                                <tr key={carrier.id} className={!carrier.isActive ? 'inactive' : ''}>
                                    <td>
                                        <span className={`status-badge ${carrier.isActive ? 'active' : 'inactive'}`}>
                                            {carrier.isActive ? '활성' : '비활성'}
                                        </span>
                                    </td>
                                    <td className="company-name">
                                        <strong>{carrier.companyName}</strong>
                                        {carrier.memo && <span className="memo-tag">메모</span>}
                                    </td>
                                    <td className="mono">{carrier.bizRegNo}</td>
                                    <td>{carrier.ceoName}</td>
                                    <td className="mono">{carrier.phone}</td>
                                    <td>{carrier.contactPerson || '-'}</td>
                                    <td className="mono">{carrier.contactPhone || '-'}</td>
                                    <td className="actions">
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => openEditModal(carrier)}
                                        >
                                            수정
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => toggleActive(carrier)}
                                        >
                                            {carrier.isActive ? '비활성화' : '활성화'}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-ghost danger"
                                            onClick={() => handleDelete(carrier)}
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

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCarrier ? '배송업체 수정' : '새 배송업체 등록'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
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

                            <div className="form-section">
                                <h3><MapPinIcon size={18} /> 주소</h3>
                                <div className="form-group required full-width">
                                    <label>주소</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h3><UserIcon size={18} /> 배차담당자 정보</h3>
                                <div className="form-grid">
                                    <div className="form-group required">
                                        <label>배차담당자명</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.contactPerson || ''}
                                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group required">
                                        <label>배차담당자 연락처</label>
                                        <input
                                            type="tel"
                                            className="input"
                                            value={formData.contactPhone || ''}
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3><FileTextIcon size={18} /> 메모</h3>
                                <div className="form-group full-width">
                                    <textarea
                                        className="input textarea"
                                        rows={3}
                                        placeholder="배송업체 관련 메모..."
                                        value={formData.memo || ''}
                                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive ?? true}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span>활성 배송업체</span>
                                </label>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    취소
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? '저장 중...' : editingCarrier ? '수정 완료' : '등록하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
    )
}
