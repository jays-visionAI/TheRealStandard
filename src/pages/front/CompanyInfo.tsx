import { useEffect, useState } from 'react'
import { getCompanyDocuments, type FirestoreFileAttachment, formatFileSize, isImageFile, isPdfFile } from '../../lib/fileService'
import { FileTextIcon, DownloadIcon } from '../../components/Icons'

/**
 * 거래처 포털 — MeatGo 회사 서류 read-only 다운로드.
 * 관리자가 /admin/company-documents 에 업로드한 사업자등록증·통장사본 등을
 * 거래처가 본인 발주 검토용으로 다운로드할 수 있다.
 */
export default function CompanyInfo() {
    const [docs, setDocs] = useState<FirestoreFileAttachment[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getCompanyDocuments()
            .then(setDocs)
            .catch(err => console.error('Failed to load company docs:', err))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileTextIcon size={24} /> MeatGo 회사 서류
                </h1>
                <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>
                    거래에 필요한 MeatGo의 사업자등록증·통장사본 등을 다운로드하실 수 있습니다.
                </p>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>로딩 중...</div>
            ) : docs.length === 0 ? (
                <div style={{
                    padding: 60, textAlign: 'center',
                    background: '#F9FAFB', border: '1px dashed #E5E7EB',
                    borderRadius: 12, color: '#6B7280',
                }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                    <p style={{ fontSize: 15, color: '#374151', marginBottom: 4 }}>등록된 서류가 없습니다</p>
                    <p style={{ fontSize: 13 }}>필요한 서류가 있으시면 영업담당에게 문의해주세요.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {docs.map(doc => (
                        <div key={doc.id} style={{
                            background: '#fff', border: '1px solid #E5E7EB',
                            borderRadius: 12, padding: 16,
                            display: 'flex', alignItems: 'center', gap: 16,
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#047857'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '' }}
                        >
                            <div style={{
                                width: 48, height: 48, borderRadius: 8,
                                background: isImageFile(doc.mimeType) ? '#FEF3C7' : isPdfFile(doc.mimeType) ? '#FEE2E2' : '#E5E7EB',
                                color: isImageFile(doc.mimeType) ? '#92400E' : isPdfFile(doc.mimeType) ? '#991B1B' : '#374151',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 22, flexShrink: 0,
                            }}>
                                {isImageFile(doc.mimeType) ? '🖼️' : isPdfFile(doc.mimeType) ? '📄' : '📎'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.fileName}
                                </div>
                                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                                    {formatFileSize(doc.fileSizeBytes)}
                                    {doc.uploadedAt && ` · ${doc.uploadedAt.toDate?.().toLocaleDateString('ko-KR')}`}
                                </div>
                            </div>
                            <a
                                href={doc.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={doc.fileName}
                                style={{
                                    background: '#047857', color: '#fff',
                                    borderRadius: 8, padding: '10px 18px',
                                    fontSize: 14, fontWeight: 600,
                                    textDecoration: 'none',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <DownloadIcon size={16} /> 다운로드
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
