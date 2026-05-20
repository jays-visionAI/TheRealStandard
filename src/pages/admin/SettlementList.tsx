import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getAllSettlements,
    getSettlementSummary,
    markOverdueSettlements,
    type FirestoreSettlement,
    type SettlementSummary,
} from '../../lib/settlementService'
import { WalletIcon, AlertTriangleIcon, CheckCircleIcon } from '../../components/Icons'
import './SettlementList.css'

export default function SettlementList() {
    const navigate = useNavigate()
    const [settlements, setSettlements] = useState<FirestoreSettlement[]>([])
    const [summary, setSummary] = useState<SettlementSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID'>('ALL')

    const load = async () => {
        try {
            setLoading(true)
            await markOverdueSettlements()
            const [data, sum] = await Promise.all([
                getAllSettlements(),
                getSettlementSummary(),
            ])
            setSettlements(data)
            setSummary(sum)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const filtered = settlements.filter(s =>
        filter === 'ALL' ? true : s.status === filter
    )

    const statusLabel: Record<string, string> = {
        PENDING: '미수',
        PARTIAL: '일부수금',
        PAID: '완납',
        OVERDUE: '연체',
    }
    const statusColor: Record<string, string> = {
        PENDING: '#F59E0B',
        PARTIAL: '#6366F1',
        PAID: '#059669',
        OVERDUE: '#DC2626',
    }

    if (loading) return (
        <div className="settlement-list">
            <div className="loading-state"><div className="spinner" /><p>정산 데이터 로딩 중...</p></div>
        </div>
    )

    return (
        <div className="settlement-list">
            <div className="page-header">
                <h1><WalletIcon size={24} /> 정산 / 미수채권 현황</h1>
                <button className="btn btn-ghost" onClick={load}>새로고침</button>
            </div>

            {summary && (
                <div className="kpi-row">
                    <div className="kpi-card warn">
                        <span className="kpi-label">총 미수금</span>
                        <span className="kpi-value">{summary.totalReceivable.toLocaleString()}원</span>
                        <span className="kpi-sub">{summary.pendingCount}건</span>
                    </div>
                    <div className="kpi-card danger">
                        <span className="kpi-label">연체 금액</span>
                        <span className="kpi-value">{summary.totalOverdue.toLocaleString()}원</span>
                        <span className="kpi-sub">{summary.overdueCount}건</span>
                    </div>
                    <div className="kpi-card good">
                        <span className="kpi-label">이번 달 수금</span>
                        <span className="kpi-value">{summary.totalPaidThisMonth.toLocaleString()}원</span>
                    </div>
                </div>
            )}

            <div className="filter-tabs">
                {(['ALL', 'PENDING', 'PARTIAL', 'OVERDUE', 'PAID'] as const).map(f => (
                    <button
                        key={f}
                        className={`filter-tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'ALL' ? '전체' : statusLabel[f]}
                        {f !== 'ALL' && (
                            <span className="count">
                                {settlements.filter(s => s.status === f).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="table-wrapper">
                <table className="settlement-table">
                    <thead>
                        <tr>
                            <th>고객사</th>
                            <th>예상금액</th>
                            <th>확정금액</th>
                            <th>수금액</th>
                            <th>미수잔액</th>
                            <th>결제기한</th>
                            <th>상태</th>
                            <th>처리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8} className="empty-row">해당하는 정산 내역이 없습니다.</td></tr>
                        ) : (
                            filtered.map(s => {
                                const dueDate = s.paymentDueAt?.toDate()
                                const isNearDue = dueDate && !['PAID'].includes(s.status) &&
                                    (dueDate.getTime() - Date.now()) < 3 * 86400000

                                return (
                                    <tr key={s.id} className={s.status === 'OVERDUE' ? 'row-danger' : isNearDue ? 'row-warn' : ''}>
                                        <td className="customer-name">{s.customerName}</td>
                                        <td>{s.estimatedAmount.toLocaleString()}원</td>
                                        <td className="final-amount">{s.finalAmount.toLocaleString()}원</td>
                                        <td>{s.paidAmount.toLocaleString()}원</td>
                                        <td className={s.remainingAmount > 0 ? 'text-danger' : ''}>
                                            {s.remainingAmount.toLocaleString()}원
                                        </td>
                                        <td>
                                            {dueDate?.toLocaleDateString('ko-KR')}
                                            {isNearDue && <span className="due-badge"><AlertTriangleIcon size={12} /> 임박</span>}
                                        </td>
                                        <td>
                                            <span className="status-badge" style={{ color: statusColor[s.status] }}>
                                                {statusLabel[s.status]}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/settlement/${s.id}`)}>
                                                상세
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
