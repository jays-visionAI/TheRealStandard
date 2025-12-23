import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './WorkflowHome.css'

// 파이프라인 단계 정의 (v1.0 단순화)
const PIPELINE_STEPS = [
    { id: 'create', label: '주문장 생성', icon: '📝', description: '고객별 주문장을 생성하고 링크를 발송합니다' },
    { id: 'submit', label: '고객 제출', icon: '📬', description: '고객이 주문을 작성하고 제출합니다' },
    { id: 'finalize', label: '확정 입력', icon: '✏️', description: '최종 수량/배차 정보를 입력합니다' },
    { id: 'confirm', label: '고객 컨펌', icon: '✅', description: '고객이 최종안을 확인합니다' },
    { id: 'dispatch', label: '출고 준비', icon: '🚛', description: '출고 및 배송을 준비합니다' },
    { id: 'complete', label: '배송 완료', icon: '🎉', description: '고객에게 배송 완료' },
]

interface PipelineItem {
    id: string
    customerName: string
    orderId: string
    currentStep: string
    amount: number
    shipDate: string
    urgent?: boolean
    waitingAction?: string
}

export default function WorkflowHome() {
    const navigate = useNavigate()
    const [selectedStep, setSelectedStep] = useState<string | null>(null)
    const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([])

    useEffect(() => {
        // Mock 데이터 - 각 단계별 주문 현황 (v1.0 상태 플로우)
        setPipelineItems([
            // Step: create (주문장 발송 대기)
            { id: 'OS-007', customerName: '미트박스', orderId: 'OS-2024-007', currentStep: 'create', amount: 0, shipDate: '2024-01-18', waitingAction: '주문장 발송' },
            { id: 'OS-008', customerName: '프리미엄정육', orderId: 'OS-2024-008', currentStep: 'create', amount: 0, shipDate: '2024-01-18', waitingAction: '주문장 발송' },

            // Step: submit (고객 제출 대기)
            { id: 'OS-005', customerName: '고기나라', orderId: 'OS-2024-005', currentStep: 'submit', amount: 0, shipDate: '2024-01-17', waitingAction: '고객 제출 대기' },
            { id: 'OS-006', customerName: '한우천국', orderId: 'OS-2024-006', currentStep: 'submit', amount: 0, shipDate: '2024-01-17', waitingAction: '고객 제출 대기' },

            // Step: finalize (관리자 확정 입력 필요)
            { id: 'OS-003', customerName: '태윤유통', orderId: 'OS-2024-003', currentStep: 'finalize', amount: 4250000, shipDate: '2024-01-16', urgent: true, waitingAction: '확정 입력' },
            { id: 'OS-004', customerName: '한우명가', orderId: 'OS-2024-004', currentStep: 'finalize', amount: 2850000, shipDate: '2024-01-16', waitingAction: '확정 입력' },

            // Step: confirm (고객 컨펌 대기)
            { id: 'OS-009', customerName: '정육왕', orderId: 'OS-2024-009', currentStep: 'confirm', amount: 3200000, shipDate: '2024-01-16', waitingAction: '고객 컨펌 대기' },

            // Step: dispatch (출고 준비)
            { id: 'OS-002', customerName: '고기마을', orderId: 'OS-2024-002', currentStep: 'dispatch', amount: 5100000, shipDate: '2024-01-16', urgent: true, waitingAction: '출고 준비' },

            // Step: complete (배송 완료)
            { id: 'OS-001', customerName: '프라임미트', orderId: 'OS-2024-001', currentStep: 'complete', amount: 3500000, shipDate: '2024-01-16', waitingAction: '완료' },
        ])
    }, [])

    const getStepItems = (stepId: string) => {
        return pipelineItems.filter(item => item.currentStep === stepId)
    }

    const getStepCount = (stepId: string) => {
        return getStepItems(stepId).length
    }

    const formatCurrency = (value: number) => {
        if (value === 0) return '-'
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const handleStepAction = (item: PipelineItem) => {
        switch (item.currentStep) {
            case 'create':
                navigate('/admin/workflow/order-create')
                break
            case 'finalize':
                navigate(`/admin/workflow/finalize/${item.id}`)
                break
            case 'dispatch':
                navigate(`/admin/workflow/dispatch/${item.id}`)
                break
        }
    }

    const getActionButton = (item: PipelineItem) => {
        switch (item.currentStep) {
            case 'create':
                return { label: '발송하기', variant: 'primary' }
            case 'submit':
                return { label: '대기중...', variant: 'secondary', disabled: true }
            case 'finalize':
                return { label: '확정입력', variant: 'primary' }
            case 'confirm':
                return { label: '대기중...', variant: 'secondary', disabled: true }
            case 'dispatch':
                return { label: '출고처리', variant: 'primary' }
            case 'complete':
                return { label: '완료', variant: 'success', disabled: true }
            default:
                return { label: '상세', variant: 'secondary' }
        }
    }

    return (
        <div className="workflow-home">
            {/* Header */}
            <header className="workflow-header">
                <div className="header-content">
                    <h1>🥩 TRS 주문-출고 워크플로우</h1>
                    <p className="header-date">
                        {new Date().toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
                        })}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/admin/workflow/order-create')}>
                    + 새 주문장 생성
                </button>
            </header>

            {/* Pipeline Visualization */}
            <section className="pipeline-section">
                <div className="pipeline-track">
                    {PIPELINE_STEPS.map((step, index) => {
                        const count = getStepCount(step.id)
                        const isActive = selectedStep === step.id
                        const hasUrgent = getStepItems(step.id).some(item => item.urgent)

                        return (
                            <div key={step.id} className="pipeline-step-wrapper">
                                <div
                                    className={`pipeline-step ${isActive ? 'active' : ''} ${count > 0 ? 'has-items' : ''} ${hasUrgent ? 'urgent' : ''}`}
                                    onClick={() => setSelectedStep(isActive ? null : step.id)}
                                >
                                    <div className="step-icon">{step.icon}</div>
                                    <div className="step-info">
                                        <span className="step-label">{step.label}</span>
                                        {count > 0 && (
                                            <span className="step-count">{count}건</span>
                                        )}
                                    </div>
                                    {hasUrgent && <span className="urgent-dot" />}
                                </div>
                                {index < PIPELINE_STEPS.length - 1 && (
                                    <div className="pipeline-connector">
                                        <div className="connector-line" />
                                        <div className="connector-arrow">→</div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Step Detail Panel */}
            {selectedStep && (
                <section className="step-detail-panel glass-card animate-slide-up">
                    <div className="panel-header">
                        <div className="panel-title">
                            <span className="panel-icon">
                                {PIPELINE_STEPS.find(s => s.id === selectedStep)?.icon}
                            </span>
                            <div>
                                <h2>{PIPELINE_STEPS.find(s => s.id === selectedStep)?.label}</h2>
                                <p>{PIPELINE_STEPS.find(s => s.id === selectedStep)?.description}</p>
                            </div>
                        </div>
                        <button className="btn btn-ghost" onClick={() => setSelectedStep(null)}>
                            닫기 ✕
                        </button>
                    </div>

                    <div className="panel-items">
                        {getStepItems(selectedStep).length === 0 ? (
                            <div className="empty-panel">
                                <p>이 단계에 대기 중인 항목이 없습니다</p>
                            </div>
                        ) : (
                            getStepItems(selectedStep).map(item => {
                                const action = getActionButton(item)
                                return (
                                    <div key={item.id} className={`pipeline-item ${item.urgent ? 'urgent' : ''}`}>
                                        <div className="item-main">
                                            <div className="item-customer">
                                                {item.urgent && <span className="urgent-badge">긴급</span>}
                                                <span className="customer-name">{item.customerName}</span>
                                            </div>
                                            <div className="item-meta">
                                                <span className="order-id">{item.orderId}</span>
                                                <span className="ship-date">배송: {item.shipDate}</span>
                                                {item.amount > 0 && (
                                                    <span className="amount">{formatCurrency(item.amount)}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="item-action">
                                            <span className="waiting-action">{item.waitingAction}</span>
                                            <button
                                                className={`btn btn-${action.variant} btn-sm`}
                                                disabled={action.disabled}
                                                onClick={() => handleStepAction(item)}
                                            >
                                                {action.label}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </section>
            )}

            {/* Quick Summary Cards */}
            <section className="summary-section">
                <div className="summary-grid">
                    <div className="summary-card glass-card" onClick={() => setSelectedStep('review')}>
                        <div className="summary-icon urgent">⚡</div>
                        <div className="summary-content">
                            <span className="summary-value">{getStepItems('review').filter(i => i.urgent).length}</span>
                            <span className="summary-label">긴급 검토 필요</span>
                        </div>
                    </div>

                    <div className="summary-card glass-card" onClick={() => setSelectedStep('dispatch')}>
                        <div className="summary-icon warning">🚛</div>
                        <div className="summary-content">
                            <span className="summary-value">{getStepCount('dispatch')}</span>
                            <span className="summary-label">배차 대기</span>
                        </div>
                    </div>

                    <div className="summary-card glass-card" onClick={() => setSelectedStep('gate')}>
                        <div className="summary-icon info">🏭</div>
                        <div className="summary-content">
                            <span className="summary-value">{getStepCount('gate')}</span>
                            <span className="summary-label">출고 검수 대기</span>
                        </div>
                    </div>

                    <div className="summary-card glass-card success">
                        <div className="summary-icon success">✅</div>
                        <div className="summary-content">
                            <span className="summary-value">12</span>
                            <span className="summary-label">오늘 완료</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Today's Timeline */}
            <section className="timeline-section glass-card">
                <h3>📅 오늘의 출고 일정</h3>
                <div className="timeline">
                    <div className="timeline-item completed">
                        <div className="timeline-time">09:00</div>
                        <div className="timeline-content">
                            <span className="timeline-customer">한우명가</span>
                            <span className="timeline-status">배송완료</span>
                        </div>
                    </div>
                    <div className="timeline-item in-progress">
                        <div className="timeline-time">11:00</div>
                        <div className="timeline-content">
                            <span className="timeline-customer">정육왕</span>
                            <span className="timeline-status">배송중</span>
                        </div>
                    </div>
                    <div className="timeline-item pending">
                        <div className="timeline-time">14:00</div>
                        <div className="timeline-content">
                            <span className="timeline-customer">고기마을</span>
                            <span className="timeline-status">출고 대기</span>
                        </div>
                    </div>
                    <div className="timeline-item pending">
                        <div className="timeline-time">16:00</div>
                        <div className="timeline-content">
                            <span className="timeline-customer">프라임미트</span>
                            <span className="timeline-status">검수 예정</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
