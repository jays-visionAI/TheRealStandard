import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FilesIcon, TruckDeliveryIcon, FactoryIcon, CheckCircleIcon } from '../../components/Icons'
import './StepGate.css'
import type { ReactNode } from 'react'

const GATE_STEPS: { id: number; label: string; icon: ReactNode }[] = [
    { id: 1, label: '문서 확인', icon: <FilesIcon size={20} /> },
    { id: 2, label: '품목 검수', icon: '✓' },
    { id: 3, label: '서명', icon: '✍️' },
    { id: 4, label: '출고 완료', icon: <TruckDeliveryIcon size={20} /> },
]

const checklistItems = [
    { id: 'c1', label: '거래내역서 확인', required: true },
    { id: 'c2', label: '검수확인서 확인', required: true },
    { id: 'c3', label: '품목/수량 일치 확인', required: true },
    { id: 'c4', label: '포장 상태 확인', required: true },
    { id: 'c5', label: '냉장/냉동 온도 확인', required: true },
]

export default function StepGate() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [checklist, setChecklist] = useState<Record<string, boolean>>({})
    const [signatureData, setSignatureData] = useState('')

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)

    const shipment = {
        id: id || 'SH-2024-001',
        customerName: '프라임미트',
        orderId: 'OS-2024-001',
        vehicleNo: '서울12가3456',
        driverName: '김기사',
        totalKg: 205,
        items: [
            { name: '한우 등심 1++', kg: 80, boxes: 4 },
            { name: '한우 안심 1++', kg: 50, boxes: 2 },
            { name: '한우 갈비 1+', kg: 75, boxes: 3 },
        ],
        documents: [
            { name: '거래내역서_20240116.xlsx', status: 'matched' },
            { name: '검수확인서_20240116.xlsx', status: 'matched' },
        ],
    }

    const allChecklistDone = checklistItems.every(item => checklist[item.id])

    // Canvas handlers
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
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
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

    const handleNext = () => {
        if (currentStep === 2 && !allChecklistDone) {
            alert('모든 체크리스트 항목을 완료해주세요.')
            return
        }
        if (currentStep === 3 && !signatureData) {
            alert('서명을 입력해주세요.')
            return
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleComplete = () => {
        alert(`✅ 출고가 완료되었습니다!\n\n${shipment.customerName} - ${shipment.totalKg}kg\n차량: ${shipment.vehicleNo}`)
        navigate('/admin/workflow')
    }

    return (
        <div className="step-gate">
            {/* Header */}
            <header className="gate-header glass-card">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/admin/workflow')}>
                        ← 워크플로우
                    </button>
                    <span className="badge badge-primary">출고 검수</span>
                </div>

                <div className="header-main">
                    <div className="shipment-info">
                        <h1><FactoryIcon size={24} /> 출고 검수</h1>
                        <div className="shipment-meta">
                            <span className="customer">{shipment.customerName}</span>
                            <span className="shipment-id">{shipment.id}</span>
                        </div>
                    </div>
                    <div className="vehicle-badge">
                        <span className="vehicle-icon"><TruckDeliveryIcon size={20} /></span>
                        <span className="vehicle-no">{shipment.vehicleNo}</span>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    {GATE_STEPS.map((step, index) => (
                        <div key={step.id} className="step-wrapper">
                            <div className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                                <div className="step-circle">
                                    {currentStep > step.id ? '✓' : step.icon}
                                </div>
                                <span className="step-label">{step.label}</span>
                            </div>
                            {index < GATE_STEPS.length - 1 && (
                                <div className={`step-connector ${currentStep > step.id ? 'completed' : ''}`} />
                            )}
                        </div>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="gate-content">
                {/* Step 1: 문서 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><FilesIcon size={20} /> 문서 확인</h2>
                        <p className="section-desc">출고에 필요한 문서가 모두 매칭되었는지 확인합니다.</p>

                        <div className="document-list">
                            {shipment.documents.map((doc, idx) => (
                                <div key={idx} className="document-item">
                                    <div className="doc-icon"><FilesIcon size={24} /></div>
                                    <div className="doc-info">
                                        <span className="doc-name">{doc.name}</span>
                                        <span className="doc-status matched">✓ 매칭됨</span>
                                    </div>
                                    <button className="btn btn-ghost btn-sm">미리보기</button>
                                </div>
                            ))}
                        </div>

                        <div className="doc-status-summary">
                            <span className="status-icon"><CheckCircleIcon size={20} /></span>
                            <span className="status-text">모든 필수 문서가 매칭되었습니다</span>
                        </div>
                    </section>
                )}

                {/* Step 2: 품목 검수 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>✓ 품목 검수</h2>
                        <p className="section-desc">아래 항목을 모두 확인해주세요.</p>

                        <div className="items-summary mb-6">
                            <h3>출고 품목</h3>
                            <div className="items-table">
                                {shipment.items.map((item, idx) => (
                                    <div key={idx} className="item-row">
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-detail">{item.kg}kg / {item.boxes}박스</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <h3 className="mb-3">체크리스트</h3>
                        <div className="checklist">
                            {checklistItems.map(item => (
                                <label key={item.id} className={`checklist-item ${checklist[item.id] ? 'checked' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={checklist[item.id] || false}
                                        onChange={() => setChecklist({ ...checklist, [item.id]: !checklist[item.id] })}
                                    />
                                    <span className="check-box">
                                        {checklist[item.id] ? '✓' : ''}
                                    </span>
                                    <span className="check-label">{item.label}</span>
                                    {item.required && <span className="required">필수</span>}
                                </label>
                            ))}
                        </div>

                        <div className="checklist-progress">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${(Object.values(checklist).filter(Boolean).length / checklistItems.length) * 100}%` }}
                                />
                            </div>
                            <span className="progress-text">
                                {Object.values(checklist).filter(Boolean).length} / {checklistItems.length} 완료
                            </span>
                        </div>
                    </section>
                )}

                {/* Step 3: 서명 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>✍️ 서명</h2>
                        <p className="section-desc">검수 완료 확인을 위해 서명해주세요.</p>

                        <div className="signature-area">
                            <div className="signature-header">
                                <span>서명란</span>
                                <button className="btn btn-ghost btn-sm" onClick={clearSignature}>지우기</button>
                            </div>
                            <canvas
                                ref={canvasRef}
                                width={500}
                                height={200}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                            />
                        </div>

                        {signatureData && (
                            <div className="signature-preview">
                                <span className="preview-label">✓ 서명이 입력되었습니다</span>
                            </div>
                        )}
                    </section>
                )}

                {/* Step 4: 출고 완료 */}
                {currentStep === 4 && (
                    <section className="step-section glass-card animate-fade-in">
                        <div className="complete-animation">
                            <div className="complete-icon">🎉</div>
                            <h2>출고 준비 완료!</h2>
                            <p className="section-desc">모든 검수가 완료되었습니다. 출고를 진행해주세요.</p>
                        </div>

                        <div className="final-summary">
                            <div className="summary-row">
                                <span>고객</span>
                                <span>{shipment.customerName}</span>
                            </div>
                            <div className="summary-row">
                                <span>총 중량</span>
                                <span>{shipment.totalKg} kg</span>
                            </div>
                            <div className="summary-row">
                                <span>차량</span>
                                <span>{shipment.vehicleNo}</span>
                            </div>
                            <div className="summary-row">
                                <span>기사</span>
                                <span>{shipment.driverName}</span>
                            </div>
                            <div className="summary-row">
                                <span>문서</span>
                                <span>{shipment.documents.length}건 확인완료</span>
                            </div>
                            <div className="summary-row">
                                <span>검수</span>
                                <span className="text-accent">✓ 체크리스트 완료</span>
                            </div>
                            <div className="summary-row">
                                <span>서명</span>
                                <span className="text-accent">✓ 완료</span>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleComplete}>
                            <TruckDeliveryIcon size={18} /> 출고 완료하기
                        </button>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="gate-footer glass-card">
                <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                >
                    ← 이전
                </button>
                <div className="step-progress">Step {currentStep} / 4</div>
                {currentStep < 4 && (
                    <button className="btn btn-primary" onClick={handleNext}>
                        다음 →
                    </button>
                )}
                {currentStep === 4 && <div style={{ width: 80 }} />}
            </footer>
        </div>
    )
}
