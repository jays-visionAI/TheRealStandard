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

export default function PurchaseRecords() {
    const { getPurchaseRecords, uploadInvoice, updatePaymentStatus, addCertificate } = useAccountingStore()
    const records = getPurchaseRecords()

    const [searchQuery, setSearchQuery] = useState('')
    const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
    const [paymentFilter, setPaymentFilter] = useState<string>('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [showCertModal, setShowCertModal] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<AccountingRecord | null>(null)
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [certGrade, setCertGrade] = useState('')
    const [certNumber, setCertNumber] = useState('')

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch = r.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesInvoice = invoiceFilter === 'all' ||
                (invoiceFilter === 'RECEIVED' && r.invoiceStatus === 'RECEIVED') ||
                (invoiceFilter === 'PENDING' && r.invoiceStatus === 'PENDING')
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

    const handleUploadCert = () => {
        if (selectedRecord && certGrade && certNumber) {
            addCertificate({
                purchaseOrderId: selectedRecord.referenceId,
                supplierName: selectedRecord.counterpartyName,
                grade: certGrade,
                productName: selectedRecord.items.split(',')[0] || selectedRecord.items,
                weight: 0,
                certNumber,
                certDate: new Date().toISOString().split('T')[0]
            })
            setShowCertModal(false)
            setSelectedRecord(null)
            setCertGrade('')
            setCertNumber('')
        }
    }

    const handleMarkPaid = (record: AccountingRecord) => {
        if (confirm(`${record.counterpartyName}에 ${record.totalAmount.toLocaleString()}원 지급 완료 처리하시겠습니까?`)) {
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
                    <div className="summary-label">조회 매입 합계</div>
                    <div className="summary-value">{formatCurrency(totalAmount)}</div>
                </div>
                <div className="summary-card warning">
                    <div className="summary-label">세금계산서 미수취</div>
                    <div className="summary-value">{pendingInvoice}건</div>
                </div>
                <div className="summary-card danger">
                    <div className="summary-label">미지급</div>
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
                            placeholder="공급처명 또는 발주번호 검색"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <FilterIcon size={16} />
                        <select value={invoiceFilter} onChange={e => setInvoiceFilter(e.target.value)}>
                            <option value="all">세금계산서 전체</option>
                            <option value="PENDING">미수취</option>
                            <option value="RECEIVED">수취완료</option>
                        </select>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                            <option value="all">지급 전체</option>
                            <option value="PENDING">미지급</option>
                            <option value="COMPLETED">지급완료</option>
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
                            <th>발주번호</th>
                            <th>거래일자</th>
                            <th>공급처</th>
                            <th>품목</th>
                            <th className="text-right">공급가액</th>
                            <th className="text-right">세액</th>
                            <th className="text-right">합계</th>
                            <th>등급</th>
                            <th>세금계산서</th>
                            <th>지급상태</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="empty-row">
                                    조회된 매입 내역이 없습니다
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
                                        {record.certificateGrade ? (
                                            <span className="badge badge-success">{record.certificateGrade}</span>
                                        ) : (
                                            <span className="badge badge-warning">미등록</span>
                                        )}
                                    </td>
                                    <td>
                                        {record.invoiceStatus === 'RECEIVED' ? (
                                            <span className="badge badge-success">
                                                <CheckCircleIcon size={12} /> 수취완료
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning">
                                                <ClockIcon size={12} /> 미수취
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {record.paymentStatus === 'COMPLETED' ? (
                                            <span className="badge badge-success">
                                                <CheckCircleIcon size={12} /> 지급완료
                                            </span>
                                        ) : (
                                            <span className="badge badge-danger">
                                                <ClockIcon size={12} /> 미지급
                                            </span>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        {!record.certificateGrade && (
                                            <button
                                                className="btn btn-xs btn-outline"
                                                onClick={() => {
                                                    setSelectedRecord(record)
                                                    setShowCertModal(true)
                                                }}
                                            >
                                                등급
                                            </button>
                                        )}
                                        {record.invoiceStatus === 'PENDING' && (
                                            <button
                                                className="btn btn-xs btn-outline"
                                                onClick={() => {
                                                    setSelectedRecord(record)
                                                    setShowInvoiceModal(true)
                                                }}
                                            >
                                                <UploadIcon size={14} /> 수취
                                            </button>
                                        )}
                                        {record.paymentStatus === 'PENDING' && (
                                            <button
                                                className="btn btn-xs btn-success"
                                                onClick={() => handleMarkPaid(record)}
                                            >
                                                지급완료
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
                        <h3>세금계산서 수취 등록</h3>
                        <p className="modal-desc">
                            {selectedRecord.counterpartyName} - {formatCurrency(selectedRecord.totalAmount)}
                        </p>
                        <div className="form-group">
                            <label>세금계산서 번호</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={e => setInvoiceNumber(e.target.value)}
                                placeholder="공급처 세금계산서 번호"
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
                                수취 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Certificate Upload Modal */}
            {showCertModal && selectedRecord && (
                <div className="modal-overlay" onClick={() => setShowCertModal(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <h3>등급확인서 등록</h3>
                        <p className="modal-desc">
                            {selectedRecord.counterpartyName} - {selectedRecord.items}
                        </p>
                        <div className="form-group">
                            <label>등급</label>
                            <select value={certGrade} onChange={e => setCertGrade(e.target.value)}>
                                <option value="">등급 선택</option>
                                <option value="1++">1++등급</option>
                                <option value="1+">1+등급</option>
                                <option value="1">1등급</option>
                                <option value="2">2등급</option>
                                <option value="3">3등급</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>확인서 번호</label>
                            <input
                                type="text"
                                value={certNumber}
                                onChange={e => setCertNumber(e.target.value)}
                                placeholder="등급확인서 번호"
                            />
                        </div>
                        <div className="form-group">
                            <label>파일 첨부 (선택)</label>
                            <input type="file" accept=".pdf,.jpg,.png" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowCertModal(false)}>
                                취소
                            </button>
                            <button className="btn btn-primary" onClick={handleUploadCert}>
                                등록 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
