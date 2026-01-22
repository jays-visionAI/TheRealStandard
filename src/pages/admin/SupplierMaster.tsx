import { useState, useMemo, useEffect } from 'react'
import { FactoryIcon, SearchIcon, CheckCircleIcon, PauseCircleIcon, ClipboardListIcon, PhoneIcon, MapPinIcon, UserIcon, WalletIcon, FileTextIcon, AlertTriangleIcon, XIcon } from '../../components/Icons'
import './OrganizationMaster.css'  // 같은 스타일 공유
import {
    getAllSupplierUsers,
    createUser,
    updateUser as updateUserFirebase,
    deleteUser as deleteUserFirebase,
    type FirestoreUser,
    type BusinessProfile
} from '../../lib/userService'

// Supplier 타입 정의 (UI용)
interface SupplierVM extends Omit<FirestoreUser, 'createdAt' | 'updatedAt'> {
    createdAt?: Date
    updatedAt?: Date
    // 편의 필드
    companyName: string
    bizRegNo: string
    ceoName: string
    phone: string
    email: string
    address: string
    supplyCategory: string
    isActive: boolean
    isJoined: boolean
}

function toVM(user: FirestoreUser): SupplierVM {
    return {
        ...user,
        createdAt: user.createdAt?.toDate?.() || new Date(),
        updatedAt: user.updatedAt?.toDate?.() || new Date(),
        companyName: user.business?.companyName || '',
        bizRegNo: user.business?.bizRegNo || '',
        ceoName: user.business?.ceoName || '',
        phone: user.business?.tel || user.phone || '',
        email: user.email,
        address: user.business?.address || '',
        supplyCategory: user.business?.productCategories?.[0] || 'meat',
        isActive: user.status === 'ACTIVE',
        isJoined: user.status === 'ACTIVE', // 통합 유저는 가입된 상태로 간주
    }
}

const CATEGORY_LABELS: Record<string, string> = {
    meat: '육류',
    byproduct: '부산물',
    packaging: '포장재',
    logistics: '배송/물류',
    other: '기타',
}

export default function SupplierMaster() {
    const [suppliers, setSuppliers] = useState<SupplierVM[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<SupplierVM | null>(null)
    const [formData, setFormData] = useState<any>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    const loadSuppliers = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getAllSupplierUsers()
            setSuppliers(data.map(toVM))
        } catch (err) {
            console.error('Failed to load suppliers:', err)
            setError('공급업체 목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSuppliers()
    }, [])

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const q = searchQuery.toLowerCase()
            const name = supplier.companyName || supplier.name || ''
            const matchesSearch = !searchQuery ||
                name.toLowerCase().includes(q) ||
                supplier.bizRegNo.includes(q) ||
                supplier.ceoName.toLowerCase().includes(q)

            const matchesActive = filterActive === 'all' ||
                (filterActive === 'active' && supplier.isActive) ||
                (filterActive === 'inactive' && !supplier.isActive)

            return matchesSearch && matchesActive
        })
    }, [suppliers, searchQuery, filterActive])

    const stats = useMemo(() => ({
        total: suppliers.length,
        active: suppliers.filter(s => s.isActive).length,
        inactive: suppliers.filter(s => !s.isActive).length,
    }), [suppliers])

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
            status: 'ACTIVE',
            bankName: '',
            bankAccount: '',
            contactPerson: '',
            contactPhone: '',
            paymentTerms: '',
        })
        setShowModal(true)
    }

    const openEditModal = (supplier: SupplierVM) => {
        setEditingSupplier(supplier)
        setFormData({
            companyName: supplier.companyName,
            bizRegNo: supplier.bizRegNo,
            ceoName: supplier.ceoName,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            supplyCategory: supplier.supplyCategory,
            status: supplier.status,
            fax: supplier.business?.fax || '',
            contactPerson: supplier.business?.contactPerson || '',
            contactPhone: supplier.business?.contactPhone || '',
            paymentTerms: supplier.business?.paymentTerms || '',
            bankName: supplier.business?.bankInfo?.bankName || '',
            bankAccount: supplier.business?.bankInfo?.accountNo || '',
            memo: '',
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const business: BusinessProfile = {
                companyName: formData.companyName,
                bizRegNo: formData.bizRegNo,
                ceoName: formData.ceoName,
                address: formData.address,
                tel: formData.phone,
                fax: formData.fax,
                contactPerson: formData.contactPerson,
                contactPhone: formData.contactPhone,
                productCategories: [formData.supplyCategory],
                paymentTerms: formData.paymentTerms,
                bankInfo: formData.bankName ? {
                    bankName: formData.bankName,
                    accountNo: formData.bankAccount,
                    accountHolder: formData.ceoName
                } : undefined
            }

            if (editingSupplier) {
                await updateUserFirebase(editingSupplier.id, {
                    name: formData.contactPerson || formData.ceoName || formData.companyName,
                    email: formData.email,
                    status: formData.status,
                    business
                })
                showAlert('공급사 수정', '수정되었습니다.')
            } else {
                await createUser({
                    email: formData.email,
                    name: formData.contactPerson || formData.ceoName || formData.companyName,
                    role: 'SUPPLIER',
                    status: formData.status,
                    business
                })
                showAlert('공급사 등록', '등록되었습니다.')
            }

            await loadSuppliers()
            setShowModal(false)
        } catch (error) {
            console.error('Save failed:', error)
            showAlert('저장 실패', '저장에 실패했습니다.', true)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = (supplier: SupplierVM) => {
        showConfirm('공급사 삭제', `"${supplier.companyName}" 공급업체를 삭제하시겠습니까?`, async () => {
            try {
                await deleteUserFirebase(supplier.id)
                await loadSuppliers()
                showAlert('삭제 완료', '공급사가 삭제되었습니다.')
            } catch (err) {
                showAlert('삭제 실패', '삭제 중 오류가 발생했습니다.', true)
            }
        }, true)
    }

    const toggleActive = async (supplier: SupplierVM) => {
        try {
            await updateUserFirebase(supplier.id, { status: supplier.isActive ? 'INACTIVE' : 'ACTIVE' })
            await loadSuppliers()
        } catch (err) {
            showAlert('오류', '상태 변경에 실패했습니다.', true)
        }
    }

    if (loading) return <div className="p-8 text-center"><div className="spinner"></div></div>

    return (
        <div className="organization-master">
            <div className="page-header">
                <div>
                    <h1><FactoryIcon size={24} /> 공급거래처 관리</h1>
                    <p className="text-secondary">제품을 공급받는 업체(공급사) 정보를 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    + 공급업체 등록
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">전체 공급업체</span>
                    </div>
                </div>
                <div className="stat-card active">
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">활성 업체</span>
                    </div>
                </div>
                <div className="stat-card inactive">
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">비활성 업체</span>
                    </div>
                </div>
            </div>

            <div className="filters-bar glass-card">
                <div className="search-box">
                    <SearchIcon size={18} />
                    <input
                        type="text"
                        placeholder="회사명, 사업자번호, 대표자 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button className={filterActive === 'all' ? 'active' : ''} onClick={() => setFilterActive('all')}>전체</button>
                    <button className={filterActive === 'active' ? 'active' : ''} onClick={() => setFilterActive('active')}>활성</button>
                    <button className={filterActive === 'inactive' ? 'active' : ''} onClick={() => setFilterActive('inactive')}>비활성</button>
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
                            <th>이메일</th>
                            <th>공급품목</th>
                            <th>결제조건</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.map(supplier => (
                            <tr key={supplier.id}>
                                <td>
                                    <span className={`status-badge ${supplier.isActive ? 'active' : 'inactive'}`}>
                                        {supplier.isActive ? '활성' : '비활성'}
                                    </span>
                                </td>
                                <td><strong>{supplier.companyName}</strong></td>
                                <td className="mono">{supplier.bizRegNo}</td>
                                <td>{supplier.ceoName}</td>
                                <td className="mono">{supplier.phone}</td>
                                <td>{supplier.email}</td>
                                <td>
                                    <span className={`price-badge ${supplier.supplyCategory}`}>
                                        {CATEGORY_LABELS[supplier.supplyCategory]}
                                    </span>
                                </td>
                                <td>{supplier.business?.paymentTerms || '-'}</td>
                                <td className="actions">
                                    <button className="btn btn-sm btn-ghost" onClick={() => openEditModal(supplier)}>수정</button>
                                    <button className="btn btn-sm btn-ghost" onClick={() => toggleActive(supplier)}>{supplier.isActive ? '비활성화' : '활성화'}</button>
                                    <button className="btn btn-sm btn-ghost danger" onClick={() => handleDelete(supplier)}>삭제</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingSupplier ? '공급업체 수정' : '새 공급업체 등록'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><XIcon size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-section">
                                <h3>기본 정보</h3>
                                <div className="form-grid">
                                    <div className="form-group required">
                                        <label>회사명</label>
                                        <input className="input" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} required />
                                    </div>
                                    <div className="form-group required">
                                        <label>사업자번호</label>
                                        <input className="input" value={formData.bizRegNo} onChange={e => setFormData({ ...formData, bizRegNo: e.target.value })} required />
                                    </div>
                                    <div className="form-group required">
                                        <label>대표자명</label>
                                        <input className="input" value={formData.ceoName} onChange={e => setFormData({ ...formData, ceoName: e.target.value })} required />
                                    </div>
                                </div>
                            </div>
                            <div className="form-section">
                                <h3>연락처 및 주소</h3>
                                <div className="form-grid">
                                    <div className="form-group required"><label>전화번호</label><input className="input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required /></div>
                                    <div className="form-group"><label>팩스</label><input className="input" value={formData.fax} onChange={e => setFormData({ ...formData, fax: e.target.value })} /></div>
                                    <div className="form-group required"><label>이메일</label><input className="input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
                                </div>
                                <div className="form-group required full-width"><label>주소</label><input className="input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required /></div>
                            </div>
                            <div className="form-section">
                                <h3>공급 및 결제 정보</h3>
                                <div className="form-grid">
                                    <div className="form-group required">
                                        <label>공급 품목</label>
                                        <select className="input" value={formData.supplyCategory} onChange={e => setFormData({ ...formData, supplyCategory: e.target.value })}>
                                            <option value="meat">육류</option>
                                            <option value="byproduct">부산물</option>
                                            <option value="packaging">포장재</option>
                                            <option value="other">기타</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label>결제 조건</label><input className="input" value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} /></div>
                                    <div className="form-group"><label>은행명</label><input className="input" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} /></div>
                                    <div className="form-group"><label>계좌번호</label><input className="input" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>취소</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장하기'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Final Global Confirmation/Alert Modal */}
            {confirmConfig && (
                <div className="modal-backdrop" style={{ zIndex: 3000 }}>
                    <div className="modal notification-modal" style={{ maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body text-center py-8">
                            <div className={`notification-icon-wrapper mb-6 mx-auto ${confirmConfig.isDanger ? 'bg-red-50' : 'bg-blue-50'} rounded-full w-20 h-20 flex items-center justify-center`}>
                                {confirmConfig.isDanger ? (
                                    <AlertTriangleIcon size={40} color="#ef4444" />
                                ) : (
                                    <FactoryIcon size={40} color="var(--color-primary)" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{confirmConfig.title}</h3>
                            <p className="text-secondary whitespace-pre-wrap">{confirmConfig.message}</p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px', borderTop: 'none', paddingTop: 0 }}>
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
