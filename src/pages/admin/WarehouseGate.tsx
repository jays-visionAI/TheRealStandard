import { useState, useRef } from 'react'
import type { GateStage } from '../../types'

interface GateItem {
    id: string
    shipmentId: string
    customerName: string
    stage: GateStage
    documentsRequired: number
    documentsMatched: number
    checklistCompleted: boolean
    signatureCompleted: boolean
    status: 'PENDING' | 'READY' | 'COMPLETED'
}

const mockGateItems: GateItem[] = [
    { id: 'G-001', shipmentId: 'SH-2024-001', customerName: '한우명가', stage: 'OUTBOUND', documentsRequired: 2, documentsMatched: 2, checklistCompleted: false, signatureCompleted: false, status: 'READY' },
    { id: 'G-002', shipmentId: 'SH-2024-002', customerName: '정육왕', stage: 'OUTBOUND', documentsRequired: 2, documentsMatched: 1, checklistCompleted: false, signatureCompleted: false, status: 'PENDING' },
    { id: 'G-003', shipmentId: 'SH-2024-003', customerName: '고기마을', stage: 'OUTBOUND', documentsRequired: 2, documentsMatched: 2, checklistCompleted: true, signatureCompleted: true, status: 'COMPLETED' },
]

const checklistItems = [
    '거래내역서 확인',
    '검수확인서 확인',
    '품목/수량 일치 확인',
    '포장상태 확인',
    '냉장/냉동 온도 확인',
]

export default function WarehouseGate() {
    const [gateItems, setGateItems] = useState(mockGateItems)
    const [filterStage, setFilterStage] = useState<GateStage | 'ALL'>('ALL')
    const [selectedItem, setSelectedItem] = useState<GateItem | null>(null)
    const [showGateModal, setShowGateModal] = useState(false)
    const [checklist, setChecklist] = useState<Record<string, boolean>>({})
    const [signatureData, setSignatureData] = useState('')

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)

    const filteredItems = gateItems.filter(
        item => filterStage === 'ALL' || item.stage === filterStage
    )

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; class: string }> = {
            PENDING: { label: '문서대기', class: 'badge-warning' },
            READY: { label: '검수가능', class: 'badge-primary' },
            COMPLETED: { label: '완료', class: 'badge-success' },
        }
        const { label, class: className } = config[status]
        return <span className={`badge ${className}`}>{label}</span>
    }

    const openGateModal = (item: GateItem) => {
        setSelectedItem(item)
        const initialChecklist: Record<string, boolean> = {}
        checklistItems.forEach(ci => { initialChecklist[ci] = false })
        setChecklist(initialChecklist)
        setSignatureData('')
        setShowGateModal(true)
    }

    const handleChecklistChange = (item: string) => {
        setChecklist({ ...checklist, [item]: !checklist[item] })
    }

    const allChecklistCompleted = Object.values(checklist).every(v => v)

    // Canvas signature handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isDrawing.current = true
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const rect = canvas.getBoundingClientRect()
        ctx.beginPath()
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const rect = canvas.getBoundingClientRect()
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
        ctx.strokeStyle = '#6366F1'
        ctx.lineWidth = 2
        ctx.stroke()
    }

    const stopDrawing = () => {
        isDrawing.current = false
        if (canvasRef.current) {
            setSignatureData(canvasRef.current.toDataURL())
        }
    }

    const clearSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setSignatureData('')
    }

    const handleCompleteGate = () => {
        if (!selectedItem) return
        if (!allChecklistCompleted) {
            alert('모든 체크리스트 항목을 완료해주세요.')
            return
        }
        if (!signatureData) {
            alert('서명을 입력해주세요.')
            return
        }

        setGateItems(gateItems.map(item => {
            if (item.id === selectedItem.id) {
                return { ...item, checklistCompleted: true, signatureCompleted: true, status: 'COMPLETED' as const }
            }
            return item
        }))

        setShowGateModal(false)
        alert('출고 검수가 완료되었습니다.')
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>물류 게이트</h1>
                    <p className="text-secondary">입고/출고 검수 및 서명 관리</p>
                </div>
            </div>

            {/* Status Summary */}
            <div className="stats-row mb-4">
                <div className="stat-mini glass-card">
                    <span className="stat-mini-value">{gateItems.filter(i => i.status === 'PENDING').length}</span>
                    <span className="stat-mini-label">문서대기</span>
                </div>
                <div className="stat-mini glass-card">
                    <span className="stat-mini-value gradient-text">{gateItems.filter(i => i.status === 'READY').length}</span>
                    <span className="stat-mini-label">검수가능</span>
                </div>
                <div className="stat-mini glass-card">
                    <span className="stat-mini-value" style={{ color: 'var(--color-accent)' }}>{gateItems.filter(i => i.status === 'COMPLETED').length}</span>
                    <span className="stat-mini-label">완료</span>
                </div>
            </div>

            {/* Filter */}
            <div className="filters-bar glass-card mb-4">
                <select
                    className="input select"
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value as GateStage | 'ALL')}
                    style={{ maxWidth: '200px' }}
                >
                    <option value="ALL">전체</option>
                    <option value="INBOUND">입고</option>
                    <option value="OUTBOUND">출고</option>
                </select>
            </div>

            {/* Gate Items */}
            <div className="gate-grid">
                {filteredItems.map(item => (
                    <div key={item.id} className={`gate-card glass-card ${item.status}`}>
                        <div className="gate-header">
                            <span className="gate-id">{item.shipmentId}</span>
                            {getStatusBadge(item.status)}
                        </div>
                        <div className="gate-customer">{item.customerName}</div>
                        <div className="gate-stage badge badge-secondary">{item.stage === 'OUTBOUND' ? '출고' : '입고'}</div>

                        <div className="gate-progress">
                            <div className="progress-item">
                                <span className={item.documentsMatched >= item.documentsRequired ? 'done' : 'pending'}>📄</span>
                                <span>문서 {item.documentsMatched}/{item.documentsRequired}</span>
                            </div>
                            <div className="progress-item">
                                <span className={item.checklistCompleted ? 'done' : 'pending'}>✓</span>
                                <span>체크리스트</span>
                            </div>
                            <div className="progress-item">
                                <span className={item.signatureCompleted ? 'done' : 'pending'}>✍️</span>
                                <span>서명</span>
                            </div>
                        </div>

                        {item.status === 'READY' && (
                            <button className="btn btn-primary w-full mt-4" onClick={() => openGateModal(item)}>
                                검수 진행
                            </button>
                        )}
                        {item.status === 'COMPLETED' && (
                            <div className="completed-badge mt-4">✓ 완료됨</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Gate Modal */}
            {showGateModal && selectedItem && (
                <div className="modal-backdrop" onClick={() => setShowGateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3>출고 검수 - {selectedItem.shipmentId}</h3>
                            <p className="text-sm text-secondary mt-1">{selectedItem.customerName}</p>
                        </div>
                        <div className="modal-body">
                            {/* Checklist */}
                            <div className="section mb-6">
                                <h4 className="section-title">체크리스트</h4>
                                <div className="checklist">
                                    {checklistItems.map(item => (
                                        <label key={item} className="checklist-item">
                                            <input
                                                type="checkbox"
                                                checked={checklist[item] || false}
                                                onChange={() => handleChecklistChange(item)}
                                            />
                                            <span>{item}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Signature */}
                            <div className="section">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="section-title mb-0">서명</h4>
                                    <button className="btn btn-ghost btn-sm" onClick={clearSignature}>지우기</button>
                                </div>
                                <div className="signature-area">
                                    <canvas
                                        ref={canvasRef}
                                        width={520}
                                        height={150}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowGateModal(false)}>취소</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCompleteGate}
                                disabled={!allChecklistCompleted || !signatureData}
                            >
                                검수 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .stats-row {
          display: flex;
          gap: var(--space-4);
        }
        
        .stat-mini {
          padding: var(--space-4) var(--space-6);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .stat-mini-value {
          font-size: var(--text-3xl);
          font-weight: var(--font-bold);
        }
        
        .stat-mini-label {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        
        .gate-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        
        .gate-card {
          padding: var(--space-5);
        }
        
        .gate-card.COMPLETED {
          opacity: 0.7;
        }
        
        .gate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }
        
        .gate-id {
          font-weight: var(--font-semibold);
          color: var(--color-primary-light);
        }
        
        .gate-customer {
          font-size: var(--text-lg);
          font-weight: var(--font-medium);
          margin-bottom: var(--space-2);
        }
        
        .gate-progress {
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .progress-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-sm);
        }
        
        .progress-item .done {
          color: var(--color-accent);
        }
        
        .progress-item .pending {
          opacity: 0.5;
        }
        
        .completed-badge {
          text-align: center;
          padding: var(--space-2);
          background: rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-md);
          color: var(--color-accent);
          font-weight: var(--font-medium);
        }
        
        .section-title {
          font-size: var(--text-base);
          font-weight: var(--font-semibold);
          margin-bottom: var(--space-3);
        }
        
        .checklist {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .checklist-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          cursor: pointer;
        }
        
        .checklist-item input {
          width: 18px;
          height: 18px;
          accent-color: var(--color-primary);
        }
        
        .signature-area {
          border: 2px dashed var(--border-primary);
          border-radius: var(--radius-md);
          background: var(--bg-tertiary);
        }
        
        .signature-area canvas {
          display: block;
          cursor: crosshair;
        }
        
        .filters-bar {
          padding: var(--space-4);
        }
        
        @media (max-width: 1024px) {
          .gate-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .gate-grid {
            grid-template-columns: 1fr;
          }
          
          .stats-row {
            flex-direction: column;
          }
        }
      `}</style>
        </div>
    )
}
