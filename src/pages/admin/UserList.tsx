import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    getAllUsers,
    createUser,
    updateUser as updateUserFirebase,
    deleteUser as deleteUserFirebase,
    type FirestoreUser
} from '../../lib/userService'
import { getAllCustomers, type FirestoreCustomer } from '../../lib/customerService'
import { getAllSuppliers, type FirestoreSupplier } from '../../lib/supplierService'
import { UsersIcon, SearchIcon, MailIcon, BuildingIcon, PlusIcon, TrashIcon as Trash2Icon, GridIcon, ListIcon, EditIcon, AlertTriangleIcon } from '../../components/Icons'
import './UserList.css'

// UserAccount 타입 정의
type UserAccount = Omit<FirestoreUser, 'createdAt' | 'updatedAt' | 'lastLogin'> & {
    createdAt?: Date
    updatedAt?: Date
    lastLogin?: Date
}

type Customer = Omit<FirestoreCustomer, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
}

type Supplier = Omit<FirestoreSupplier, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: '관리자',
    OPS: '영업/운영',
    WAREHOUSE: '물류/물류센터',
    ACCOUNTING: '회계/경리',
    CUSTOMER: '고객사',
    SUPPLIER: '공급사'
}

export default function UserList() {
    // Firebase에서 직접 로드되는 데이터
    const [users, setUsers] = useState<UserAccount[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [searchParams, setSearchParams] = useSearchParams()
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState<string>(searchParams.get('role') || 'ALL')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

            setCustomers(customersData.map(c => ({
                ...c,
                createdAt: c.createdAt?.toDate?.() || new Date(),
                updatedAt: c.updatedAt?.toDate?.() || new Date(),
            })))

            setSuppliers(suppliersData.map(s => ({
                ...s,
                createdAt: s.createdAt?.toDate?.() || new Date(),
                updatedAt: s.updatedAt?.toDate?.() || new Date(),
            })))
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadData()
    }, [])

    // URL 파라미터 변경 시 필터 업데이트
    useEffect(() => {
        const role = searchParams.get('role') || 'ALL'
        setFilterRole(role)
    }, [searchParams])

    const handleRoleChange = (role: string) => {
        const newParams = new URLSearchParams(searchParams)
        if (role === 'ALL') {
            newParams.delete('role')
        } else {
            newParams.set('role', role)
        }
        setSearchParams(newParams)
    }

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const name = user.name || ''
            const email = user.email || ''
            const matchesSearch = !searchQuery ||
                name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                email.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesRole = filterRole === 'ALL' || user.role === filterRole
            return matchesSearch && matchesRole
        })
    }, [users, searchQuery, filterRole])

    const handleOpenCreate = () => {
        setEditingUser(null)
        setFormData({ role: 'OPS' as any, status: 'ACTIVE' })
        setShowModal(true)
    }

    const handleOpenEdit = (user: UserAccount) => {
        setEditingUser(user)
        setFormData({ ...user })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingUser) {
                await updateUserFirebase(editingUser.id, {
                    email: formData.email,
                    name: formData.name,
                    role: formData.role as any,
                    orgId: formData.orgId,
                    status: formData.status as any,
                    password: formData.password,
                })
            } else {
                await createUser({
                    email: formData.email || '',
                    name: formData.name || '',
                    role: (formData.role as any) || 'OPS',
                    orgId: formData.orgId,
                    status: (formData.status as any) || 'ACTIVE',
                    password: formData.password || '1234',
                })
            }
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
        if (confirm('이 계정을 삭제하시겠습니까?')) {
            try {
                await deleteUserFirebase(id)
                await loadData()
            } catch (err) {
                console.error('Delete failed:', err)
                alert('삭제에 실패했습니다.')
            }
        }
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="user-list-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>사용자 목록을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="user-list-page">
                <div className="error-state">
                    <p>
                        <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <AlertTriangleIcon size={24} color="#ef4444" />
                        </span>
                        {error}
                    </p>
                    <button className="btn btn-primary" onClick={loadData}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="user-list-page">
            <div className="page-header">
                <div className="header-left">
                    <h1><UsersIcon size={24} /> Staff Setting (임직원 설정)</h1>
                    <p className="text-secondary">사내 임직원의 계정 권한 및 카카오 연동 상태를 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenCreate}>
                    <PlusIcon size={18} /> 신규 계정 추가
                </button>
            </div>

            <div className="filters-bar glass-card">
                <div className="search-box">
                    <SearchIcon size={18} />
                    <input
                        type="text"
                        placeholder="이름 또는 이메일 검색..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="role-filters">
                    <button className={`filter-chip ${filterRole === 'ALL' ? 'active' : ''}`} onClick={() => handleRoleChange('ALL')}>전체</button>
                    <button className={`filter-chip ${filterRole === 'ADMIN' ? 'active' : ''}`} onClick={() => handleRoleChange('ADMIN')}>관리자</button>
                    <button className={`filter-chip ${filterRole === 'OPS' ? 'active' : ''}`} onClick={() => handleRoleChange('OPS')}>영업/운영</button>
                    <button className={`filter-chip ${filterRole === 'ACCOUNTING' ? 'active' : ''}`} onClick={() => handleRoleChange('ACCOUNTING')}>회계</button>
                    <button className={`filter-chip ${filterRole === 'WAREHOUSE' ? 'active' : ''}`} onClick={() => handleRoleChange('WAREHOUSE')}>물류</button>
                    <button className={`filter-chip ${filterRole === 'CUSTOMER' ? 'active' : ''}`} onClick={() => handleRoleChange('CUSTOMER')}>고객</button>
                </div>

                <div className="view-toggle-group">
                    <button
                        className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="그리드 뷰"
                    >
                        <GridIcon size={20} />
                    </button>
                    <button
                        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="리스트 뷰"
                    >
                        <ListIcon size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="user-grid">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="user-card glass-card">
                            <div className="user-card-header">
                                <div className={`role-badge ${(user.role || 'OPS').toLowerCase()}`}>
                                    {ROLE_LABELS[user.role]}
                                </div>
                                <div className="user-actions">
                                    <button className="icon-btn" onClick={() => handleOpenEdit(user)}><EditIcon size={16} /></button>
                                    <button className="icon-btn danger" onClick={() => handleDelete(user.id)}><Trash2Icon size={16} /></button>
                                </div>
                            </div>
                            <div className="user-card-body">
                                <div className="avatar">
                                    {(user.name || 'U').charAt(0)}
                                </div>
                                <h3 className="user-name">{user.name || '이름 없음'}</h3>
                                <p className="user-email"><MailIcon size={14} /> {user.email || '이메일 없음'}</p>

                                {user.orgId && (
                                    <p className="user-org">
                                        <BuildingIcon size={14} />
                                        {customers.find(c => c.id === user.orgId)?.companyName ||
                                            suppliers.find(s => s.id === user.orgId)?.companyName || '소속 정보 없음'}
                                    </p>
                                )}
                            </div>
                            <div className="user-card-footer">
                                <span className={`status-pill ${user.status.toLowerCase()}`}>
                                    {user.status === 'ACTIVE' ? '활성' : '비활성'}
                                </span>
                                <span className="last-login">최근 접속: 2일 전</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="user-list-container glass-card">
                    <table className="user-list-table">
                        <thead>
                            <tr>
                                <th>이름 / 이메일</th>
                                <th>역할</th>
                                <th>소속</th>
                                <th>상태</th>
                                <th>최근 접속</th>
                                <th className="text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="avatar-sm">
                                                {(user.name || 'U').charAt(0)}
                                            </div>
                                            <div className="user-details">
                                                <div className="name">{user.name || '이름 없음'}</div>
                                                <div className="email">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`role-badge-sm ${(user.role || 'OPS').toLowerCase()}`}>
                                            {ROLE_LABELS[user.role]}
                                        </span>
                                    </td>
                                    <td>
                                        {user.orgId ? (
                                            <span className="org-name">
                                                {customers.find(c => c.id === user.orgId)?.companyName ||
                                                    suppliers.find(s => s.id === user.orgId)?.companyName || '-'}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <span className={`status-pill-sm ${user.status.toLowerCase()}`}>
                                            {user.status === 'ACTIVE' ? '활성' : '비활성'}
                                        </span>
                                    </td>
                                    <td className="last-login-cell">2일 전</td>
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
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="empty-row">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUser ? '계정 정보 수정' : '신규 계정 생성'}</h2>
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
                                <label>이메일 (ID)</label>
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
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any, orgId: undefined })}
                                >
                                    <option value="ADMIN">관리자</option>
                                    <option value="OPS">영업/운영</option>
                                    <option value="WAREHOUSE">물류/창고</option>
                                    <option value="ACCOUNTING">회계/경리</option>
                                    <option value="CUSTOMER">고객사 담당자</option>
                                    <option value="SUPPLIER">공급사 담당자</option>
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

                            {formData.role === 'SUPPLIER' && (
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
                            <div className="form-group">
                                <label>비밀번호</label>
                                <input
                                    type="password"
                                    placeholder={editingUser ? '변경 시에만 입력' : '초기 비밀번호 (기본 1234)'}
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
                                    <option value="PENDING">승인 대기</option>
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
