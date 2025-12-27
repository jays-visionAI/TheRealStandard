import { useState, useMemo } from 'react'
import { useAccountingStore } from '../../stores/accountingStore'
import {
    SearchIcon,
    FilterIcon,
    PlusIcon,
    FileTextIcon,
    DownloadIcon,
    EyeIcon,
    TrashIcon
} from '../../components/Icons'
import './SalesRecords.css'

const GRADE_OPTIONS = ['1++', '1+', '1', '2', '3']

export default function CertificateList() {
    const { certificates, addCertificate, deleteCertificate, getPurchaseRecords } = useAccountingStore()
    const purchaseRecords = getPurchaseRecords()

    const [searchQuery, setSearchQuery] = useState('')
    const [gradeFilter, setGradeFilter] = useState<string>('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const [showAddModal, setShowAddModal] = useState(false)
    const [newCert, setNewCert] = useState({
        purchaseOrderId: '',
        supplierName: '',
        grade: '',
        productName: '',
        weight: 0,
        certNumber: '',
        certDate: new Date().toISOString().split('T')[0]
    })

    // 매입 기록의 등급 정보도 포함
    const allCertificates = useMemo(() => {
        const fromRecords = purchaseRecords
            .filter(r => r.certificateGrade)
            .map(r => ({
                id: `record-${r.id}`,
                purchaseOrderId: r.referenceId,
                supplierName: r.counterpartyName,
                grade: r.certificateGrade || '',
                productName: r.items.split(',')[0] || r.items,
                weight: 0,
                certNumber: '',
                certDate: r.transactionDate,
                createdAt: r.createdAt,
                fileUrl: undefined
            }))
        return [...certificates, ...fromRecords]
    }, [certificates, purchaseRecords])

    const filteredCerts = useMemo(() => {
        return allCertificates.filter(c => {
            const matchesSearch = c.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.certNumber.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesGrade = gradeFilter === 'all' || c.grade === gradeFilter
            const matchesDateFrom = !dateFrom || c.certDate >= dateFrom
            const matchesDateTo = !dateTo || c.certDate <= dateTo
            return matchesSearch && matchesGrade && matchesDateFrom && matchesDateTo
        })
    }, [allCertificates, searchQuery, gradeFilter, dateFrom, dateTo])

    const gradeStats = useMemo(() => {
        const stats: Record<string, number> = {}
        GRADE_OPTIONS.forEach(g => { stats[g] = 0 })
        allCertificates.forEach(c => {
            if (stats[c.grade] !== undefined) stats[c.grade]++
        })
        return stats
    }, [allCertificates])

    const handleAddCert = () => {
        if (newCert.grade && newCert.productName && newCert.supplierName) {
            addCertificate(newCert)
            setShowAddModal(false)
            setNewCert({
                purchaseOrderId: '',
                supplierName: '',
                grade: '',
                productName: '',
                weight: 0,
                certNumber: '',
                certDate: new Date().toISOString().split('T')[0]
            })
        }
    }

    const handleDelete = (id: string) => {
        if (id.startsWith('record-')) {
            alert('매입 내역에서 등록된 등급입니다. 매입 내역에서 수정해주세요.')
            return
        }
        if (confirm('등급확인서를 삭제하시겠습니까?')) {
            deleteCertificate(id)
        }
    }

    return (
        <div className="sales-records">
            {/* Summary Cards */}
            <div className="summary-cards">
                {GRADE_OPTIONS.map(grade => (
                    <div key={grade} className="summary-card">
                        <div className="summary-label">{grade} 등급</div>
                        <div className="summary-value">{gradeStats[grade]}건</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="filters-section glass-card">
                <div className="filter-row">
                    <div className="search-box">
                        <SearchIcon size={18} />
                        <input
                            type="text"
                            placeholder="공급처명, 품목명, 확인서번호 검색"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <FilterIcon size={16} />
                        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
                            <option value="all">전체 등급</option>
                            {GRADE_OPTIONS.map(g => (
                                <option key={g} value={g}>{g} 등급</option>
                            ))}
                        </select>
                    </div>
                    <div className="date-range">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span>~</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <PlusIcon size={16} /> 등급확인서 등록
                    </button>
                </div>
            </div>

            {/* Records Table */}
            <div className="records-table glass-card">
                <table>
                    <thead>
                        <tr>
                            <th>등급</th>
                            <th>확인서번호</th>
                            <th>확인일자</th>
                            <th>공급처</th>
                            <th>품목</th>
                            <th>중량(kg)</th>
                            <th>첨부</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCerts.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="empty-row">
                                    조회된 등급확인서가 없습니다
                                </td>
                            </tr>
                        ) : (
                            filteredCerts.map(cert => (
                                <tr key={cert.id}>
                                    <td>
                                        <span className={`badge ${cert.grade === '1++' || cert.grade === '1+' ? 'badge-success' : cert.grade === '1' ? 'badge-info' : 'badge-warning'}`}>
                                            {cert.grade}
                                        </span>
                                    </td>
                                    <td className="mono">{cert.certNumber || '-'}</td>
                                    <td>{cert.certDate}</td>
                                    <td className="bold">{cert.supplierName}</td>
                                    <td>{cert.productName}</td>
                                    <td className="text-right">{cert.weight > 0 ? `${cert.weight}kg` : '-'}</td>
                                    <td>
                                        {cert.fileUrl ? (
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
                                        {cert.fileUrl && (
                                            <button className="btn btn-xs btn-outline" title="다운로드">
                                                <DownloadIcon size={14} />
                                            </button>
                                        )}
                                        {!cert.id.startsWith('record-') && (
                                            <button
                                                className="btn btn-xs btn-outline btn-danger-outline"
                                                title="삭제"
                                                onClick={() => handleDelete(cert.id)}
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Certificate Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <h3>등급확인서 등록</h3>
                        <div className="form-group">
                            <label>공급처명 *</label>
                            <input
                                type="text"
                                value={newCert.supplierName}
                                onChange={e => setNewCert({ ...newCert, supplierName: e.target.value })}
                                placeholder="공급처명 입력"
                            />
                        </div>
                        <div className="form-group">
                            <label>품목명 *</label>
                            <input
                                type="text"
                                value={newCert.productName}
                                onChange={e => setNewCert({ ...newCert, productName: e.target.value })}
                                placeholder="예: 한우 등심"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>등급 *</label>
                                <select
                                    value={newCert.grade}
                                    onChange={e => setNewCert({ ...newCert, grade: e.target.value })}
                                >
                                    <option value="">등급 선택</option>
                                    {GRADE_OPTIONS.map(g => (
                                        <option key={g} value={g}>{g} 등급</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>중량 (kg)</label>
                                <input
                                    type="number"
                                    value={newCert.weight || ''}
                                    onChange={e => setNewCert({ ...newCert, weight: Number(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>확인서번호</label>
                                <input
                                    type="text"
                                    value={newCert.certNumber}
                                    onChange={e => setNewCert({ ...newCert, certNumber: e.target.value })}
                                    placeholder="확인서 번호"
                                />
                            </div>
                            <div className="form-group">
                                <label>확인일자</label>
                                <input
                                    type="date"
                                    value={newCert.certDate}
                                    onChange={e => setNewCert({ ...newCert, certDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>파일 첨부 (선택)</label>
                            <input type="file" accept=".pdf,.jpg,.png" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                취소
                            </button>
                            <button className="btn btn-primary" onClick={handleAddCert}>
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
