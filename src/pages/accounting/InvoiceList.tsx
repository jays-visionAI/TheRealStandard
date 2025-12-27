import { useState, useMemo } from 'react'
import { useAccountingStore } from '../../stores/accountingStore'
import {
    SearchIcon,
    FilterIcon,
    FileTextIcon,
    DownloadIcon,
    EyeIcon
} from '../../components/Icons'
import './SalesRecords.css'

export default function InvoiceList() {
    const { records } = useAccountingStore()

    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // 세금계산서 발행/수취된 기록만 필터링
    const invoiceRecords = useMemo(() => {
        return records.filter(r => r.invoiceStatus !== 'PENDING')
    }, [records])

    const filteredRecords = useMemo(() => {
        return invoiceRecords.filter(r => {
            const matchesSearch = r.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = typeFilter === 'all' ||
                (typeFilter === 'ISSUED' && r.type === 'SALES') ||
                (typeFilter === 'RECEIVED' && r.type === 'PURCHASE')
            const matchesDateFrom = !dateFrom || (r.invoiceDate && r.invoiceDate >= dateFrom)
            const matchesDateTo = !dateTo || (r.invoiceDate && r.invoiceDate <= dateTo)
            return matchesSearch && matchesType && matchesDateFrom && matchesDateTo
        })
    }, [invoiceRecords, searchQuery, typeFilter, dateFrom, dateTo])

    const totalIssued = invoiceRecords.filter(r => r.type === 'SALES').length
    const totalReceived = invoiceRecords.filter(r => r.type === 'PURCHASE').length
    const totalAmount = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원'
    }

    return (
        <div className="sales-records">
            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-label">발행 세금계산서 (매출)</div>
                    <div className="summary-value">{totalIssued}건</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">수취 세금계산서 (매입)</div>
                    <div className="summary-value">{totalReceived}건</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">조회 합계</div>
                    <div className="summary-value">{formatCurrency(totalAmount)}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section glass-card">
                <div className="filter-row">
                    <div className="search-box">
                        <SearchIcon size={18} />
                        <input
                            type="text"
                            placeholder="거래처명, 계산서번호, 주문번호 검색"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <FilterIcon size={16} />
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            <option value="all">전체</option>
                            <option value="ISSUED">발행 (매출)</option>
                            <option value="RECEIVED">수취 (매입)</option>
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
                            <th>계산서번호</th>
                            <th>발행/수취일</th>
                            <th>거래처</th>
                            <th>주문/발주번호</th>
                            <th className="text-right">공급가액</th>
                            <th className="text-right">세액</th>
                            <th className="text-right">합계</th>
                            <th>첨부</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="empty-row">
                                    조회된 세금계산서가 없습니다
                                </td>
                            </tr>
                        ) : (
                            filteredRecords.map(record => (
                                <tr key={record.id}>
                                    <td>
                                        {record.type === 'SALES' ? (
                                            <span className="badge badge-success">발행</span>
                                        ) : (
                                            <span className="badge badge-info">수취</span>
                                        )}
                                    </td>
                                    <td className="mono">{record.invoiceNumber || '-'}</td>
                                    <td>{record.invoiceDate || '-'}</td>
                                    <td className="bold">{record.counterpartyName}</td>
                                    <td className="mono">{record.referenceNumber}</td>
                                    <td className="text-right mono">{formatCurrency(record.amount)}</td>
                                    <td className="text-right mono">{formatCurrency(record.tax)}</td>
                                    <td className="text-right mono bold">{formatCurrency(record.totalAmount)}</td>
                                    <td>
                                        {record.invoiceFile ? (
                                            <span className="badge badge-success">
                                                <FileTextIcon size={12} /> 있음
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning">없음</span>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <button className="btn btn-xs btn-outline" title="상세보기">
                                            <EyeIcon size={14} />
                                        </button>
                                        {record.invoiceFile && (
                                            <button className="btn btn-xs btn-outline" title="다운로드">
                                                <DownloadIcon size={14} />
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
