import { useState } from 'react'
import Modal from '../../components/Modal'
import './AccountingDashboard.css'

interface DocumentItem {
    id: string
    orderId: string
    customerName: string
    shipDate: string
    totalAmount: number
    invoiceUploaded: boolean
    gradeCertUploaded: boolean
    status: 'PENDING' | 'PARTIAL' | 'COMPLETED'
}

export default function AccountingDashboard() {
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

    // Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [currentDoc, setCurrentDoc] = useState<{ id: string, type: 'invoice' | 'gradeCert', name: string } | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Mock 데이터
    const [documents, setDocuments] = useState<DocumentItem[]>([
        {
            id: 'D-001',
            orderId: 'OS-2024-001',
            customerName: '프라임미트',
            shipDate: '2024-01-16',
            totalAmount: 3500000,
            invoiceUploaded: false,
            gradeCertUploaded: false,
            status: 'PENDING',
        },
        {
            id: 'D-002',
            orderId: 'OS-2024-002',
            customerName: '고기마을',
            shipDate: '2024-01-16',
            totalAmount: 5100000,
            invoiceUploaded: true,
            gradeCertUploaded: false,
            status: 'PARTIAL',
        },
        {
            id: 'D-003',
            orderId: 'OS-2024-003',
            customerName: '태윤유통',
            shipDate: '2024-01-15',
            totalAmount: 4250000,
            invoiceUploaded: true,
            gradeCertUploaded: true,
            status: 'COMPLETED',
        },
    ])

    const pendingDocs = documents.filter(d => d.status !== 'COMPLETED')
    const completedDocs = documents.filter(d => d.status === 'COMPLETED')
    const currentDocs = activeTab === 'pending' ? pendingDocs : completedDocs

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const openUploadModal = (doc: DocumentItem, type: 'invoice' | 'gradeCert') => {
        const typeName = type === 'invoice' ? '거래명세서' : '등급확인서'
        setCurrentDoc({ id: doc.id, type, name: typeName })
        setSelectedFile(null)
        setIsUploadModalOpen(true)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleUploadConfirm = () => {
        if (!currentDoc || !selectedFile) return

        setIsUploading(true)

        // Simulate API call
        setTimeout(() => {
            setDocuments(prev => prev.map(doc => {
                if (doc.id === currentDoc.id) {
                    const updated = {
                        ...doc,
                        [currentDoc.type === 'invoice' ? 'invoiceUploaded' : 'gradeCertUploaded']: true
                    }
                    // Update status if needed
                    if (updated.invoiceUploaded && updated.gradeCertUploaded) {
                        updated.status = 'COMPLETED'
                    } else if (updated.invoiceUploaded || updated.gradeCertUploaded) {
                        updated.status = 'PARTIAL'
                    }
                    return updated
                }
                return doc
            }))

            setIsUploading(false)
            setIsUploadModalOpen(false)
            // Show success toast (mock)
            alert('✅ 업로드 완료되었습니다.')
        }, 1500)
    }

    return (
        <div className="accounting-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>📄 정산 관리</h1>
                    <p className="header-date">{new Date().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    })}</p>
                </div>
                <div className="header-right">
                    <span className="user-info">경리담당: 김경리</span>
                </div>
            </header>

            {/* Summary Cards */}
            <section className="summary-section">
                <div className="summary-grid">
                    <div className="summary-card pending">
                        <div className="summary-icon">⏳</div>
                        <div className="summary-content">
                            <span className="summary-value">{pendingDocs.length}</span>
                            <span className="summary-label">업로드 대기</span>
                        </div>
                    </div>
                    <div className="summary-card partial">
                        <div className="summary-icon">📝</div>
                        <div className="summary-content">
                            <span className="summary-value">{documents.filter(d => d.status === 'PARTIAL').length}</span>
                            <span className="summary-label">부분 완료</span>
                        </div>
                    </div>
                    <div className="summary-card completed">
                        <div className="summary-icon">✅</div>
                        <div className="summary-content">
                            <span className="summary-value">{completedDocs.length}</span>
                            <span className="summary-label">오늘 완료</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    ⏳ 업로드 대기 ({pendingDocs.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    ✅ 완료 ({completedDocs.length})
                </button>
            </div>

            {/* Documents List */}
            <section className="documents-section">
                {currentDocs.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📄</span>
                        <p>해당 항목이 없습니다</p>
                    </div>
                ) : (
                    <div className="documents-list">
                        {currentDocs.map(doc => (
                            <div key={doc.id} className="document-card glass-card">
                                <div className="doc-header">
                                    <div className="doc-info">
                                        <h3>{doc.customerName}</h3>
                                        <span className="order-id">{doc.orderId}</span>
                                    </div>
                                    <div className="doc-meta">
                                        <span className="ship-date">배송일: {doc.shipDate}</span>
                                        <span className="amount">{formatCurrency(doc.totalAmount)}</span>
                                    </div>
                                </div>

                                <div className="doc-body">
                                    {/* 거래명세서 */}
                                    <div className={`upload-item ${doc.invoiceUploaded ? 'uploaded' : ''}`}>
                                        <div className="upload-info">
                                            <span className="upload-icon">📋</span>
                                            <span className="upload-name">거래명세서</span>
                                        </div>
                                        {doc.invoiceUploaded ? (
                                            <span className="upload-status uploaded">✅ 업로드됨</span>
                                        ) : (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => openUploadModal(doc, 'invoice')}
                                            >
                                                📤 업로드
                                            </button>
                                        )}
                                    </div>

                                    {/* 등급확인서 */}
                                    <div className={`upload-item ${doc.gradeCertUploaded ? 'uploaded' : ''}`}>
                                        <div className="upload-info">
                                            <span className="upload-icon">🏷️</span>
                                            <span className="upload-name">등급확인서</span>
                                        </div>
                                        {doc.gradeCertUploaded ? (
                                            <span className="upload-status uploaded">✅ 업로드됨</span>
                                        ) : (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => openUploadModal(doc, 'gradeCert')}
                                            >
                                                📤 업로드
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {doc.status === 'COMPLETED' && (
                                    <div className="doc-footer completed">
                                        ✅ 모든 서류가 업로드되었습니다.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title={`${currentDoc?.name} 업로드`}
                footer={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsUploadModalOpen(false)}
                            disabled={isUploading}
                        >
                            취소
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleUploadConfirm}
                            disabled={!selectedFile || isUploading}
                        >
                            {isUploading ? '업로드 중...' : '업로드'}
                        </button>
                    </>
                }
            >
                <div className="upload-modal-content">
                    <p className="mb-4 text-secondary">
                        {currentDoc?.name} 파일을 선택해주세요. (PDF, JPG, PNG)
                    </p>

                    <div className="file-upload-area">
                        <input
                            type="file"
                            className="file-input-hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileSelect}
                        />
                        <div className="pointer-events-none">
                            <span className="upload-placeholder-icon">📁</span>
                            {selectedFile ? (
                                <div className="text-primary font-medium">
                                    {selectedFile.name}
                                    <span className="text-xs text-secondary block mt-1">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            ) : (
                                <div className="text-secondary">
                                    <span className="text-primary font-medium">클릭하여 파일 선택</span>
                                    <br />
                                    <span className="text-xs">또는 파일을 여기로 드래그하세요</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="upload-info-box">
                        ℹ️ 실제 파일은 서버로 전송되며, 보안 연결을 통해 안전하게 저장됩니다.
                    </div>
                </div>
            </Modal>
        </div>
    )
}
