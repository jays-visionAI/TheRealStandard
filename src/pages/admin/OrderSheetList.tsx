import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useOrderStore } from '../../stores/orderStore'
import type { OrderSheetStatus } from '../../types'

export default function OrderSheetList() {
    const { orderSheets } = useOrderStore()
    const [filterStatus, setFilterStatus] = useState<OrderSheetStatus | 'ALL'>('ALL')
    const [searchTerm, setSearchTerm] = useState('')

    const filteredOrders = useMemo(() => {
        return orderSheets.filter((order) => {
            const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus
            const matchesSearch =
                order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
            return matchesStatus && matchesSearch
        })
    }, [orderSheets, filterStatus, searchTerm])

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

    const formatDate = (date: Date | string) => {
        if (!date) return '-'
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
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
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
                                                {(order.status === 'SENT' || order.status === 'REVISION') && (
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-400">
                                        기록이 없습니다. 주문장을 생성해주세요.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
