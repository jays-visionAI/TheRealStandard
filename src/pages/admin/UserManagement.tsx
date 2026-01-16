import { useState, useMemo, useEffect } from 'react'
import {
    getAllUsers,
    updateUser as updateUserFirebase,
    deleteUser as deleteUserFirebase,
    type FirestoreUser
} from '../../lib/userService'
import {
    UsersIcon,
    SearchIcon,
    EditIcon,
    TrashIcon as Trash2Icon,
    AlertTriangleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    UserIcon,
    BuildingIcon
} from '../../components/Icons'
import { getAllCustomers, type FirestoreCustomer } from '../../lib/customerService'
import { getAllSuppliers, type FirestoreSupplier } from '../../lib/supplierService'
import './UserList.css' // Reusing existing styles or adding new ones

// UserAccount 타입 정의
type UserAccount = Omit<FirestoreUser, 'createdAt' | 'updatedAt' | 'lastLogin'> & {
    createdAt?: Date
    updatedAt?: Date
    lastLogin?: Date
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: '관리자',
    OPS: '영업/운영',
    WAREHOUSE: '물류/물류센터',
    ACCOUNTING: '회계/경리',
    CUSTOMER: '고객사',
    SUPPLIER: '공급사',
    '3PL': '3PL'
}

export default function UserManagement() {
    const [users, setUsers] = useState<UserAccount[]>([])
    const [customers, setCustomers] = useState<FirestoreCustomer[]>([])
    const [suppliers, setSuppliers] = useState<FirestoreSupplier[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState<UserAccount | null>(null)
    const [formData, setFormData] = useState<Partial<UserAccount>>({})
    const [saving, setSaving] = useState(false)

    // Firebase에서 데이터 로드
    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [usersData, customersData, suppliersData] = await Promise.all([
                getAllUsers(),
                getAllCustomers(),
                getAllSuppliers()
            ])

            setUsers(usersData.map(u => ({
                ...u,
                createdAt: u.createdAt?.toDate?.() || new Date(),
                updatedAt: u.updatedAt?.toDate?.() || new Date(),
                lastLogin: u.lastLogin?.toDate?.() || undefined,
            })))

            setCustomers(customersData)
            setSuppliers(suppliersData)
        } catch (err) {
            console.error('Failed to load users:', err)
            setError('사용자 목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const name = user.name || ''
            const email = user.email || ''
            const role = user.role || ''
            const query = searchQuery.toLowerCase()
            return name.toLowerCase().includes(query) ||
                email.toLowerCase().includes(query) ||
                role.toLowerCase().includes(query)
        })
    }, [users, searchQuery])

    // 페이징 처리
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredUsers.slice(start, start + itemsPerPage)
    }, [filteredUsers, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    const handleOpenEdit = (user: UserAccount) => {
        setEditingUser(user)
        setFormData({ ...user })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser) return
        setSaving(true)

        try {
            await updateUserFirebase(editingUser.id, {
                email: formData.email,
                name: formData.name,
                role: formData.role as any,
                status: formData.status as any,
                password: formData.password,
                orgId: formData.orgId || undefined, // Ensure orgId is updated or cleared
            })
            await loadData()
            setShowModal(false)
        } catch (err) {
            console.error('Save failed:', err)
            alert('저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('이 사용자를 삭제하시겠습니까? 데이터베이스에서 영구히 삭제됩니다.')) {
            try {
                await deleteUserFirebase(id)
                await loadData()
            } catch (err) {
                console.error('Delete failed:', err)
                alert('삭제에 실패했습니다.')
            }
        }
    }

    if (loading && users.length === 0) {
        return (
            <div className="user-list-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>사용자 데이터를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="user-list-page">
            <div className="page-header">
                <div className="header-left">
                    <h1><UsersIcon size={24} /> 전체 유저 리스트</h1>
                    <p className="text-secondary">시스템에 등록된 모든 사용자 계정(고객/직원 등)을 한눈에 관리합니다.</p>
                    <p className="text-primary font-bold mt-2" style={{ color: 'var(--color-primary)' }}>이름은 실명을 사용해주세요.</p>
                </div>
            </div>

            <div className="filters-bar glass-card">
                <div className="search-box">
                    <SearchIcon size={18} />
                    <input
                        type="text"
                        placeholder="이름, 이메일, 역할 검색..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="user-list-container glass-card">
                <table className="user-list-table">
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>이메일</th>
                            <th>소속</th>
                            <th>역할 (Role)</th>
                            <th>상태</th>
                            <th className="text-center">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-info-cell">
                                        <div className="avatar-sm">
                                            {(user.name || 'U').charAt(0)}
                                        </div>
                                        <div className="name">{user.name || '이름 없음'}</div>
                                    </div>
                                </td>
                                <td>{user.email}</td>
                                <td>
                                    {user.orgId ? (
                                        <div className="org-info-cell">
                                            <BuildingIcon size={14} className="text-secondary" />
                                            <span>
                                                {customers.find(c => c.id === user.orgId)?.companyName ||
                                                    suppliers.find(s => s.id === user.orgId)?.companyName || '-'}
                                            </span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td>
                                    <span className={`role-badge-sm ${(user.role || 'OPS').toLowerCase()}`}>
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-pill-sm ${user.status?.toLowerCase() || 'active'}`}>
                                        {user.status === 'ACTIVE' ? '활성' : user.status === 'PENDING' ? '대기' : '비활성'}
                                    </span>
                                </td>
                                <td>
                                    <div className="user-actions-cell">
                                        <button className="icon-btn" onClick={() => handleOpenEdit(user)} title="수정">
                                            <EditIcon size={16} />
                                        </button>
                                        <button className="icon-btn danger" onClick={() => handleDelete(user.id)} title="삭제">
                                            <Trash2Icon size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="empty-row">
                                    사용자가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="page-btn"
                        >
                            <ChevronLeftIcon size={18} />
                        </button>
                        <span className="page-info">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="page-btn"
                        >
                            <ChevronRightIcon size={18} />
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>사용자 정보 수정</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>이메일</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>역할 (Role)</label>
                                <select
                                    value={formData.role || 'OPS'}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="ADMIN">관리자</option>
                                    <option value="OPS">영업/운영</option>
                                    <option value="WAREHOUSE">물류/창고</option>
                                    <option value="ACCOUNTING">회계/경리</option>
                                    <option value="CUSTOMER">고객사 담당자</option>
                                    <option value="SUPPLIER">공급사 담당자</option>
                                    <option value="3PL">3PL</option>
                                </select>
                            </div>

                            {formData.role === 'CUSTOMER' && (
                                <div className="form-group">
                                    <label>소속 고객사</label>
                                    <select
                                        required
                                        value={formData.orgId || ''}
                                        onChange={e => setFormData({ ...formData, orgId: e.target.value })}
                                    >
                                        <option value="">고객사 선택...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.companyName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(formData.role === 'SUPPLIER') && (
                                <div className="form-group">
                                    <label>소속 공급사</label>
                                    <select
                                        required
                                        value={formData.orgId || ''}
                                        onChange={e => setFormData({ ...formData, orgId: e.target.value })}
                                    >
                                        <option value="">공급사 선택...</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.companyName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(formData.role === '3PL') && (
                                <div className="form-group">
                                    <label>소속 3PL (공급사 리스트에서 선택)</label>
                                    <select
                                        required
                                        value={formData.orgId || ''}
                                        onChange={e => setFormData({ ...formData, orgId: e.target.value })}
                                    >
                                        <option value="">3PL 업체 선택...</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.companyName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label>비밀번호</label>
                                <input
                                    type="password"
                                    placeholder="변경 시에만 입력"
                                    value={formData.password || ''}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>상태</label>
                                <select
                                    value={formData.status || 'ACTIVE'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="ACTIVE">활성</option>
                                    <option value="PENDING">대기</option>
                                    <option value="INACTIVE">비활성</option>
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>취소</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? '저장 중...' : '저장하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
