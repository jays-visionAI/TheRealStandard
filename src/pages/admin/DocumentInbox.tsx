import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { FilesIcon } from '../../components/Icons'
import type { DocumentType, ParsedTransactionLine, ParsedInspectionPackage } from '../../types'

export default function DocumentInbox() {
    const [documents, setDocuments] = useState<any[]>([
        { id: 'DOC-001', fileName: '거래내역서_20240115.xlsx', docType: 'TRANSACTION_STATEMENT', status: 'MATCHED', uploadedAt: '2024-01-15 10:30' },
        { id: 'DOC-002', fileName: '검수확인서_20240115.xlsx', docType: 'INSPECTION_REPORT', status: 'PARSED', uploadedAt: '2024-01-15 11:00' },
    ])

    const [showUploadModal, setShowUploadModal] = useState(false)
    const [selectedDocType, setSelectedDocType] = useState<DocumentType>('TRANSACTION_STATEMENT')
    const [parsedData, setParsedData] = useState<ParsedTransactionLine[] | ParsedInspectionPackage[] | null>(null)
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [showPreview, setShowPreview] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadedFile(file)

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

            if (selectedDocType === 'TRANSACTION_STATEMENT') {
                const parsed = parseTransactionStatement(jsonData)
                setParsedData(parsed)
            } else {
                const parsed = parseInspectionReport(jsonData)
                setParsedData(parsed)
            }

            setShowPreview(true)
        } catch (error) {
            console.error('파싱 오류:', error)
            alert('엑셀 파일 파싱 중 오류가 발생했습니다.')
        }
    }

    const parseTransactionStatement = (rows: any[][]): ParsedTransactionLine[] => {
        // 헤더 행 찾기
        let headerRowIndex = rows.findIndex(row =>
            row.some(cell => String(cell).includes('품') && String(cell).includes('목'))
        )

        if (headerRowIndex === -1) headerRowIndex = 0

        const dataRows = rows.slice(headerRowIndex + 1)
        const parsed: ParsedTransactionLine[] = []

        for (const row of dataRows) {
            if (!row[0] || String(row[0]).includes('합계')) continue

            parsed.push({
                productName: String(row[0] || ''),
                origin: String(row[4] || ''),
                qty: parseFloat(row[6]) || 0,
                weight: parseFloat(row[7]) || 0,
                unitPrice: parseFloat(row[10]) || 0,
                amount: parseFloat(row[13]) || 0,
                traceNo: String(row[15] || ''),
                slaughterhouse: String(row[20] || ''),
            })
        }

        return parsed.filter(p => p.productName && p.weight > 0)
    }

    const parseInspectionReport = (rows: any[][]): ParsedInspectionPackage[] => {
        let headerRowIndex = rows.findIndex(row =>
            row.some(cell => String(cell).includes('바코드'))
        )

        if (headerRowIndex === -1) headerRowIndex = 0

        const dataRows = rows.slice(headerRowIndex + 1)
        const parsed: ParsedInspectionPackage[] = []

        for (const row of dataRows) {
            if (!row[1]) continue

            parsed.push({
                barcode: String(row[1] || ''),
                productName: String(row[2] || ''),
                qty: parseFloat(row[3]) || 0,
                weight: parseFloat(row[4]) || 0,
                unitPrice: parseFloat(row[5]) || 0,
                amount: parseFloat(row[6]) || 0,
                traceNo: String(row[7] || ''),
                animalId: String(row[8] || ''),
                slaughterhouse: String(row[9] || ''),
                remark: String(row[10] || ''),
                producedAt: String(row[11] || ''),
                expiresAt: String(row[12] || ''),
            })
        }

        return parsed.filter(p => p.barcode)
    }

    const handleConfirmUpload = () => {
        const newDoc = {
            id: 'DOC-' + Date.now(),
            fileName: uploadedFile?.name || 'unknown.xlsx',
            docType: selectedDocType,
            status: 'PARSED',
            uploadedAt: new Date().toLocaleString('ko-KR'),
        }

        setDocuments([newDoc, ...documents])
        setShowUploadModal(false)
        setShowPreview(false)
        setParsedData(null)
        setUploadedFile(null)
        alert('문서가 업로드되었습니다. 매칭을 진행해주세요.')
    }

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; class: string }> = {
            UPLOADED: { label: '업로드됨', class: 'badge-secondary' },
            PARSED: { label: '파싱완료', class: 'badge-warning' },
            MATCHED: { label: '매칭됨', class: 'badge-primary' },
            VERIFIED: { label: '검증완료', class: 'badge-success' },
        }
        const { label, class: className } = config[status] || { label: status, class: 'badge-secondary' }
        return <span className={`badge ${className}`}>{label}</span>
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>문서 관리</h1>
                    <p className="text-secondary">거래내역서/검수확인서 업로드 및 파싱</p>
                </div>
                <button className="btn btn-primary btn-lg" onClick={() => setShowUploadModal(true)}>
                    + 문서 업로드
                </button>
            </div>

            {/* Documents List */}
            <div className="glass-card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>문서ID</th>
                                <th>파일명</th>
                                <th>문서유형</th>
                                <th>상태</th>
                                <th>업로드일시</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr key={doc.id}>
                                    <td className="font-semibold">{doc.id}</td>
                                    <td>{doc.fileName}</td>
                                    <td>
                                        {doc.docType === 'TRANSACTION_STATEMENT' ? '거래내역서' : '검수확인서'}
                                    </td>
                                    <td>{getStatusBadge(doc.status)}</td>
                                    <td>{doc.uploadedAt}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            {doc.status === 'PARSED' && (
                                                <button className="btn btn-primary btn-sm">매칭</button>
                                            )}
                                            <button className="btn btn-ghost btn-sm">상세</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: showPreview ? '900px' : '500px' }}>
                        <div className="modal-header">
                            <h3>문서 업로드</h3>
                        </div>
                        <div className="modal-body">
                            {!showPreview ? (
                                <>
                                    <div className="form-group mb-4">
                                        <label className="label">문서 유형</label>
                                        <select
                                            className="input select"
                                            value={selectedDocType}
                                            onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                                        >
                                            <option value="TRANSACTION_STATEMENT">거래내역서</option>
                                            <option value="INSPECTION_REPORT">검수확인서</option>
                                        </select>
                                    </div>

                                    <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />
                                        <div className="upload-icon"><FilesIcon size={48} /></div>
                                        <p>클릭하여 엑셀 파일 선택</p>
                                        <p className="text-sm text-muted">.xlsx, .xls 파일만 지원</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h4>파싱 결과 미리보기</h4>
                                            <p className="text-sm text-secondary">
                                                {uploadedFile?.name} - {parsedData?.length}개 항목
                                            </p>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowPreview(false); setParsedData(null); }}>
                                            다시 선택
                                        </button>
                                    </div>

                                    <div className="preview-table-container">
                                        {selectedDocType === 'TRANSACTION_STATEMENT' ? (
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>품목명</th>
                                                        <th>원산지</th>
                                                        <th>중량</th>
                                                        <th>단가</th>
                                                        <th>금액</th>
                                                        <th>이력번호</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(parsedData as ParsedTransactionLine[])?.slice(0, 10).map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{item.productName}</td>
                                                            <td>{item.origin}</td>
                                                            <td>{item.weight}</td>
                                                            <td>{item.unitPrice.toLocaleString()}</td>
                                                            <td>{item.amount.toLocaleString()}</td>
                                                            <td>{item.traceNo}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>바코드</th>
                                                        <th>제품명</th>
                                                        <th>중량</th>
                                                        <th>금액</th>
                                                        <th>이력번호</th>
                                                        <th>유통기한</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(parsedData as ParsedInspectionPackage[])?.slice(0, 10).map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{item.barcode}</td>
                                                            <td>{item.productName}</td>
                                                            <td>{item.weight}</td>
                                                            <td>{item.amount.toLocaleString()}</td>
                                                            <td>{item.traceNo}</td>
                                                            <td>{item.expiresAt}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    {parsedData && parsedData.length > 10 && (
                                        <p className="text-sm text-muted text-center mt-2">
                                            ... 외 {parsedData.length - 10}개 항목
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => { setShowUploadModal(false); setShowPreview(false); setParsedData(null); }}>
                                취소
                            </button>
                            {showPreview && (
                                <button className="btn btn-primary" onClick={handleConfirmUpload}>
                                    업로드 확인
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .upload-zone {
          border: 2px dashed var(--border-primary);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-base);
        }
        
        .upload-zone:hover {
          border-color: var(--color-primary);
          background: rgba(99, 102, 241, 0.05);
        }
        
        .upload-icon {
          font-size: 3rem;
          margin-bottom: var(--space-4);
        }
        
        .preview-table-container {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-md);
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
      `}</style>
        </div>
    )
}
