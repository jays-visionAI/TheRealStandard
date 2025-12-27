import { useState, useMemo } from 'react'
import { useAccountingStore, AccountingRecord } from '../../stores/accountingStore'
import {
    SearchIcon,
    ClockIcon,
    FilterIcon,
    AlertTriangleIcon
} from '../../components/Icons'
import './SalesRecords.css'

export default function PendingSettlements() {
    const { getPendingRecords, uploadInvoice, updatePaymentStatus } = useAccountingStore()
    const pendingRecords = getPendingRecords()

    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [issueFilter, setIssueFilter] = useState<string>('all')

    const filteredRecords = useMemo(() => {
        return pendingRecords.filter(r => {
            const matchesSearch = r.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = typeFilter === 'all' || r.type === typeFilter
            const matchesIssue = issueFilter === 'all' ||
                (issueFilter === 'invoice' && r.invoiceStatus === 'PENDING') ||
                (issueFilter === 'payment' && r.paymentStatus === 'PENDING')
            return matchesSearch && matchesType && matchesIssue
        })
    }, [pendingRecords, searchQuery, typeFilter, issueFilter])

    const stats = useMemo(() => {
        const invoicePending = pendingRecords.filter(r => r.invoiceStatus === 'PENDING').length
        const paymentPending = pendingRecords.filter(r => r.paymentStatus === 'PENDING').length
        const salesPending = pendingRecords.filter(r => r.type === 'SALES').length
        const purchasePending = pendingRecords.filter(r => r.type === 'PURCHASE').length
        return { invoicePending, paymentPending, salesPending, purchasePending }
    }, [pendingRecords])

    const handleMarkPaid = (record: AccountingRecord) => {
        const action = record.type === 'SALES' ? '수금' : '지급'
        if (confirm(`${record.counterpartyName}의 ${record.totalAmount.toLocaleString()}원 ${action} 완료 처리하시겠습니까?`)) {
            updatePaymentStatus(record.id, 'COMPLETED', record.totalAmount)
        }
    }

    const handleIssueInvoice = (record: AccountingRecord) => {
        const invoiceNumber = prompt('세금계산서 번호를 입력하세요:')
        if (invoiceNumber) {
            uploadInvoice(record.id, invoiceNumber)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원'
    }

    return (
        <div className="sales-records">
            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card warning">
                    <div className="summary-label">세금계산서 미처리</div>
                    <div className="summary-value">{stats.invoicePending}건</div>
                </div>
                <div className="summary-card danger">
                    <div className="summary-label">수금/지급 미완료</div>
                    <div className="summary-value">{stats.paymentPending}건</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">매출 미정산</div>
                    <div className="summary-value">{stats.salesPending}건</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">매입 미정산</div>
                    <div className="summary-value">{stats.purchasePending}건</div>
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
                        <select value={issueFilter} onChange={e => setIssueFilter(e.target.value)}>
                            <option value="all">전체 미정산</option>
                            <option value="invoice">세금계산서 미처리</option>
                            <option value="payment">수금/지급 미완료</option>
                        </select>
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
                            <th>미처리 항목</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty-row">
                                    미정산 내역이 없습니다
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
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {record.invoiceStatus === 'PENDING' && (
                                                <span className="badge badge-warning">
                                                    <AlertTriangleIcon size={12} /> 세금계산서
                                                </span>
                                            )}
                                            {record.paymentStatus === 'PENDING' && (
                                                <span className="badge badge-danger">
                                                    <ClockIcon size={12} /> {record.type === 'SALES' ? '미수금' : '미지급'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="actions-cell">
                                        {record.invoiceStatus === 'PENDING' && (
                                            <button
                                                className="btn btn-xs btn-outline"
                                                onClick={() => handleIssueInvoice(record)}
                                            >
                                                {record.type === 'SALES' ? '발행' : '수취'}
                                            </button>
                                        )}
                                        {record.paymentStatus === 'PENDING' && (
                                            <button
                                                className="btn btn-xs btn-success"
                                                onClick={() => handleMarkPaid(record)}
                                            >
                                                {record.type === 'SALES' ? '수금완료' : '지급완료'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
