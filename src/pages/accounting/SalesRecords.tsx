import { useState, useMemo } from 'react'
import { useAccountingStore, AccountingRecord } from '../../stores/accountingStore'
import {
    SearchIcon,
    CheckCircleIcon,
    ClockIcon,
    UploadIcon,
    FilterIcon
} from '../../components/Icons'
import './SalesRecords.css'

export default function SalesRecords() {
    const { getSalesRecords, uploadInvoice, updatePaymentStatus } = useAccountingStore()
    const records = getSalesRecords()

    const [searchQuery, setSearchQuery] = useState('')
    const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
    const [paymentFilter, setPaymentFilter] = useState<string>('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<AccountingRecord | null>(null)
    const [invoiceNumber, setInvoiceNumber] = useState('')

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch = r.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesInvoice = invoiceFilter === 'all' || r.invoiceStatus === invoiceFilter
            const matchesPayment = paymentFilter === 'all' || r.paymentStatus === paymentFilter
            const matchesDateFrom = !dateFrom || r.transactionDate >= dateFrom
            const matchesDateTo = !dateTo || r.transactionDate <= dateTo
            return matchesSearch && matchesInvoice && matchesPayment && matchesDateFrom && matchesDateTo
        })
    }, [records, searchQuery, invoiceFilter, paymentFilter, dateFrom, dateTo])

    const totalAmount = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0)
    const pendingInvoice = filteredRecords.filter(r => r.invoiceStatus === 'PENDING').length
    const pendingPayment = filteredRecords.filter(r => r.paymentStatus === 'PENDING').length

    const handleUploadInvoice = () => {
        if (selectedRecord && invoiceNumber) {
            uploadInvoice(selectedRecord.id, invoiceNumber)
            setShowInvoiceModal(false)
            setSelectedRecord(null)
            setInvoiceNumber('')
        }
    }

    const handleMarkPaid = (record: AccountingRecord) => {
        if (confirm(`${record.counterpartyName}의 ${record.totalAmount.toLocaleString()}원 수금 완료 처리하시겠습니까?`)) {
            updatePaymentStatus(record.id, 'COMPLETED', record.totalAmount)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원'
    }

    return (
        <div className="sales-records">
            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-label">조회 매출 합계</div>
                    <div className="summary-value">{formatCurrency(totalAmount)}</div>
                </div>
                <div className="summary-card warning">
                    <div className="summary-label">세금계산서 미발행</div>
                    <div className="summary-value">{pendingInvoice}건</div>
                </div>
                <div className="summary-card danger">
                    <div className="summary-label">미수금</div>
                    <div className="summary-value">{pendingPayment}건</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section glass-card">
                <div className="filter-row">
                    <div className="search-box">
                        <SearchIcon size={18} />
                        <input
                            type="text"
                            placeholder="고객사명 또는 주문번호 검색"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <FilterIcon size={16} />
                        <select value={invoiceFilter} onChange={e => setInvoiceFilter(e.target.value)}>
                            <option value="all">세금계산서 전체</option>
                            <option value="PENDING">미발행</option>
                            <option value="ISSUED">발행완료</option>
                        </select>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                            <option value="all">수금 전체</option>
                            <option value="PENDING">미수금</option>
                            <option value="COMPLETED">수금완료</option>
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
                            <th>주문번호</th>
                            <th>거래일자</th>
                            <th>고객사</th>
                            <th>품목</th>
                            <th className="text-right">공급가액</th>
                            <th className="text-right">세액</th>
                            <th className="text-right">합계</th>
                            <th>세금계산서</th>
                            <th>수금상태</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="empty-row">
                                    조회된 매출 내역이 없습니다
                                </td>
                            </tr>
                        ) : (
                            filteredRecords.map(record => (
                                <tr key={record.id}>
                                    <td className="mono">{record.referenceNumber}</td>
                                    <td>{record.transactionDate}</td>
                                    <td className="bold">{record.counterpartyName}</td>
                                    <td className="items-cell">{record.items}</td>
                                    <td className="text-right mono">{formatCurrency(record.amount)}</td>
                                    <td className="text-right mono">{formatCurrency(record.tax)}</td>
                                    <td className="text-right mono bold">{formatCurrency(record.totalAmount)}</td>
                                    <td>
                                        {record.invoiceStatus === 'ISSUED' ? (
                                            <span className="badge badge-success">
                                                <CheckCircleIcon size={12} /> 발행완료
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning">
                                                <ClockIcon size={12} /> 미발행
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {record.paymentStatus === 'COMPLETED' ? (
                                            <span className="badge badge-success">
                                                <CheckCircleIcon size={12} /> 수금완료
                                            </span>
                                        ) : (
                                            <span className="badge badge-danger">
                                                <ClockIcon size={12} /> 미수금
                                            </span>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        {record.invoiceStatus === 'PENDING' && (
                                            <button
                                                className="btn btn-xs btn-outline"
                                                onClick={() => {
                                                    setSelectedRecord(record)
                                                    setShowInvoiceModal(true)
                                                }}
                                            >
                                                <UploadIcon size={14} /> 발행
                                            </button>
                                        )}
                                        {record.paymentStatus === 'PENDING' && (
                                            <button
                                                className="btn btn-xs btn-success"
                                                onClick={() => handleMarkPaid(record)}
                                            >
                                                수금완료
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invoice Upload Modal */}
            {showInvoiceModal && selectedRecord && (
                <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <h3>세금계산서 발행</h3>
                        <p className="modal-desc">
                            {selectedRecord.counterpartyName} - {formatCurrency(selectedRecord.totalAmount)}
                        </p>
                        <div className="form-group">
                            <label>세금계산서 번호</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={e => setInvoiceNumber(e.target.value)}
                                placeholder="예: TAX-2025-001"
                            />
                        </div>
                        <div className="form-group">
                            <label>파일 첨부 (선택)</label>
                            <input type="file" accept=".pdf,.jpg,.png" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>
                                취소
                            </button>
                            <button className="btn btn-primary" onClick={handleUploadInvoice}>
                                발행 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
