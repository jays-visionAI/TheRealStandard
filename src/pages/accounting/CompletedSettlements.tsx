import { useState, useMemo } from 'react'
import { useAccountingStore } from '../../stores/accountingStore'
import {
    SearchIcon,
    CheckCircleIcon,
    FilterIcon
} from '../../components/Icons'
import './SalesRecords.css'

export default function CompletedSettlements() {
    const { getCompletedRecords } = useAccountingStore()
    const completedRecords = getCompletedRecords()

    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const filteredRecords = useMemo(() => {
        return completedRecords.filter(r => {
            const matchesSearch = r.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = typeFilter === 'all' || r.type === typeFilter
            const matchesDateFrom = !dateFrom || r.transactionDate >= dateFrom
            const matchesDateTo = !dateTo || r.transactionDate <= dateTo
            return matchesSearch && matchesType && matchesDateFrom && matchesDateTo
        })
    }, [completedRecords, searchQuery, typeFilter, dateFrom, dateTo])

    const stats = useMemo(() => {
        const totalSales = filteredRecords
            .filter(r => r.type === 'SALES')
            .reduce((sum, r) => sum + r.totalAmount, 0)
        const totalPurchases = filteredRecords
            .filter(r => r.type === 'PURCHASE')
            .reduce((sum, r) => sum + r.totalAmount, 0)
        const salesCount = filteredRecords.filter(r => r.type === 'SALES').length
        const purchaseCount = filteredRecords.filter(r => r.type === 'PURCHASE').length
        return { totalSales, totalPurchases, salesCount, purchaseCount, profit: totalSales - totalPurchases }
    }, [filteredRecords])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원'
    }

    return (
        <div className="sales-records">
            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card" style={{ borderLeft: '4px solid #22c55e' }}>
                    <div className="summary-label">정산 완료 매출</div>
                    <div className="summary-value">{formatCurrency(stats.totalSales)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{stats.salesCount}건</div>
                </div>
                <div className="summary-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="summary-label">정산 완료 매입</div>
                    <div className="summary-value">{formatCurrency(stats.totalPurchases)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{stats.purchaseCount}건</div>
                </div>
                <div className="summary-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="summary-label">순이익</div>
                    <div className="summary-value" style={{ color: stats.profit >= 0 ? '#22c55e' : '#ef4444' }}>
                        {formatCurrency(stats.profit)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section glass-card">
                <div className="filter-row">
                    <div className="search-box">
                        <SearchIcon size={18} />
                        <input
                            type="text"
                            placeholder="거래처명 또는 주문번호 검색"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <FilterIcon size={16} />
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            <option value="all">전체 (매출/매입)</option>
                            <option value="SALES">매출만</option>
                            <option value="PURCHASE">매입만</option>
                        </select>
                    </div>
                    <div className="date-range">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span>~</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Records Table */}
            <div className="records-table glass-card">
                <table>
                    <thead>
                        <tr>
                            <th>구분</th>
                            <th>주문번호</th>
                            <th>거래일자</th>
                            <th>거래처</th>
                            <th className="text-right">금액</th>
                            <th>세금계산서</th>
                            <th>결제일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty-row">
                                    정산 완료 내역이 없습니다
                                </td>
                            </tr>
                        ) : (
                            filteredRecords.map(record => (
                                <tr key={record.id}>
                                    <td>
                                        <span className={`badge ${record.type === 'SALES' ? 'badge-success' : 'badge-info'}`}>
                                            {record.type === 'SALES' ? '매출' : '매입'}
                                        </span>
                                    </td>
                                    <td className="mono">{record.referenceNumber}</td>
                                    <td>{record.transactionDate}</td>
                                    <td className="bold">{record.counterpartyName}</td>
                                    <td className="text-right mono bold">{formatCurrency(record.totalAmount)}</td>
                                    <td>
                                        <span className="badge badge-success">
                                            <CheckCircleIcon size={12} /> {record.invoiceNumber || '완료'}
                                        </span>
                                    </td>
                                    <td>{record.paymentDate || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
