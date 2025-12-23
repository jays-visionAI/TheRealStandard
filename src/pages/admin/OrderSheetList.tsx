import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { OrderSheet, OrderSheetStatus } from '../../types'

const mockOrderSheets: (OrderSheet & { customerName: string })[] = [
    {
        id: 'OS-2024-001',
        customerOrgId: 'org-001',
        customerName: '한우명가',
        shipDate: new Date('2024-01-16'),
        cutOffAt: new Date('2024-01-15T18:00:00'),
        shipTo: '서울시 강남구 역삼동 123-45',
        status: 'SUBMITTED',
        inviteTokenId: 'token-001',
        lastSubmittedAt: new Date('2024-01-15T14:30:00'),
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'OS-2024-002',
        customerOrgId: 'org-002',
        customerName: '정육왕',
        shipDate: new Date('2024-01-16'),
        cutOffAt: new Date('2024-01-15T18:00:00'),
        shipTo: '서울시 서초구 서초동 456-78',
        status: 'REVISION',
        inviteTokenId: 'token-002',
        revisionComment: '수량 확인 필요',
        lastSubmittedAt: new Date('2024-01-15T10:00:00'),
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'OS-2024-003',
        customerOrgId: 'org-003',
        customerName: '고기마을',
        shipDate: new Date('2024-01-15'),
        cutOffAt: new Date('2024-01-14T18:00:00'),
        shipTo: '경기도 성남시 분당구 정자동',
        status: 'CONFIRMED',
        inviteTokenId: 'token-003',
        lastSubmittedAt: new Date('2024-01-14T16:00:00'),
        createdAt: new Date('2024-01-13'),
        updatedAt: new Date('2024-01-14'),
    },
    {
        id: 'OS-2024-004',
        customerOrgId: 'org-004',
        customerName: '미트박스',
        shipDate: new Date('2024-01-17'),
        cutOffAt: new Date('2024-01-16T18:00:00'),
        shipTo: '서울시 송파구 잠실동',
        status: 'SENT',
        inviteTokenId: 'token-004',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'OS-2024-005',
        customerOrgId: 'org-005',
        customerName: '프리미엄정육',
        shipDate: new Date('2024-01-17'),
        cutOffAt: new Date('2024-01-16T18:00:00'),
        shipTo: '경기도 용인시 수지구',
        status: 'DRAFT',
        inviteTokenId: 'token-005',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
    },
]

export default function OrderSheetList() {
    const [orderSheets, setOrderSheets] = useState<typeof mockOrderSheets>([])
    const [filterStatus, setFilterStatus] = useState<OrderSheetStatus | 'ALL'>('ALL')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        setOrderSheets(mockOrderSheets)
    }, [])

    const filteredOrders = orderSheets.filter((order) => {
        const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus
        const matchesSearch =
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesStatus && matchesSearch
    })

    const getStatusBadge = (status: OrderSheetStatus) => {
        const statusConfig: Record<OrderSheetStatus, { label: string; class: string }> = {
            DRAFT: { label: '초안', class: 'badge-secondary' },
            SENT: { label: '발송됨', class: 'badge-primary' },
            SUBMITTED: { label: '제출됨', class: 'badge-warning' },
            REVISION: { label: '수정요청', class: 'badge-error' },
            CONFIRMED: { label: '확정', class: 'badge-success' },
        }
        const { label, class: className } = statusConfig[status]
        return <span className={`badge ${className}`}>{label}</span>
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const copyInviteLink = async (token: string) => {
        const link = `${window.location.origin}/order/${token}`
        await navigator.clipboard.writeText(link)
        alert('주문 링크가 복사되었습니다!')
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <h1>주문장 목록</h1>
                    <p className="text-secondary">고객별 주문장을 관리합니다</p>
                </div>
                <Link to="/admin/order-sheets/create" className="btn btn-primary btn-lg">
                    + 주문장 생성
                </Link>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="filter-group">
                    <input
                        type="text"
                        className="input"
                        placeholder="주문번호 또는 고객명 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <select
                        className="input select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as OrderSheetStatus | 'ALL')}
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="DRAFT">초안</option>
                        <option value="SENT">발송됨</option>
                        <option value="SUBMITTED">제출됨</option>
                        <option value="REVISION">수정요청</option>
                        <option value="CONFIRMED">확정</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>주문번호</th>
                                <th>고객사</th>
                                <th>배송일</th>
                                <th>마감시간</th>
                                <th>상태</th>
                                <th>최종제출</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => (
                                <tr key={order.id}>
                                    <td className="font-semibold text-primary">{order.id}</td>
                                    <td>{order.customerName}</td>
                                    <td>{new Date(order.shipDate).toLocaleDateString('ko-KR')}</td>
                                    <td>{formatDate(order.cutOffAt)}</td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td>
                                        {order.lastSubmittedAt
                                            ? formatDate(order.lastSubmittedAt)
                                            : '-'
                                        }
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {order.status === 'SUBMITTED' && (
                                                <Link
                                                    to={`/admin/order-sheets/${order.id}/review`}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    검토
                                                </Link>
                                            )}
                                            {order.status === 'SENT' && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => copyInviteLink(order.inviteTokenId)}
                                                >
                                                    링크복사
                                                </button>
                                            )}
                                            {order.status === 'DRAFT' && (
                                                <Link
                                                    to={`/admin/order-sheets/${order.id}/edit`}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    편집
                                                </Link>
                                            )}
                                            <button className="btn btn-ghost btn-sm">
                                                상세
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredOrders.length === 0 && (
                    <div className="empty-state">
                        <p>조건에 맞는 주문장이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
