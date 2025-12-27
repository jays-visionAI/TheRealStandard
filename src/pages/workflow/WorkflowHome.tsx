import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileEditIcon, PencilIcon, CheckCircleIcon, TruckDeliveryIcon, FactoryIcon, InboxIcon, PartyPopperIcon, ZapIcon, CalendarIcon } from '../../components/Icons'
import { useOrderStore } from '../../stores/orderStore'
import './WorkflowHome.css'
import type { ReactNode } from 'react'

// 파이프라인 단계 정의 (v1.0 단순화)
const PIPELINE_STEPS: { id: string; label: string; icon: ReactNode; description: string }[] = [
    { id: 'create', label: '주문장 생성', icon: <FileEditIcon size={20} />, description: '고객별 주문장을 생성하고 링크를 발송합니다' },
    { id: 'submit', label: '고객 제출', icon: <InboxIcon size={20} />, description: '고객이 주문을 작성하고 제출합니다' },
    { id: 'finalize', label: '확정 입력', icon: <PencilIcon size={20} />, description: '최종 수량/배차 정보를 입력합니다' },
    { id: 'confirm', label: '고객 컨펌', icon: <CheckCircleIcon size={20} />, description: '고객이 최종안을 확인합니다' },
    { id: 'dispatch', label: '출고 준비', icon: <TruckDeliveryIcon size={20} />, description: '출고 및 배송을 준비합니다' },
    { id: 'complete', label: '배송 완료', icon: <PartyPopperIcon size={20} />, description: '고객에게 배송 완료' },
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
    const { orderSheets, salesOrders, shipments } = useOrderStore()
    const [selectedStep, setSelectedStep] = useState<string | null>(null)
    const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([])

    useEffect(() => {
        // 실시간 스토어 데이터로부터 파이프라인 아이템 생성
        const items: PipelineItem[] = []

        // 1. 주문장 생성 단계 (임시 데이터 대신 스토어 연동)
        // 실제로는 orderSheets 중 상태가 'DRAFT'인 것들
        orderSheets.forEach(os => {
            if (os.status === 'DRAFT') {
                items.push({
                    id: os.id,
                    customerName: os.customerName || '고객사',
                    orderId: os.id,
                    currentStep: 'create',
                    amount: 0,
                    shipDate: os.shipDate ? new Date(os.shipDate).toISOString().split('T')[0] : '-',
                    waitingAction: '주문장 발송'
                })
            } else if (os.status === 'SENT') {
                items.push({
                    id: os.id,
                    customerName: os.customerName || '고객사',
                    orderId: os.id,
                    currentStep: 'submit',
                    amount: 0,
                    shipDate: os.shipDate ? new Date(os.shipDate).toISOString().split('T')[0] : '-',
                    waitingAction: '고객 제출 대기'
                })
            }
        })

        // 2. 확정 입력 및 고객 컨펌 단계 (SalesOrders)
        salesOrders.forEach(so => {
            if (so.status === 'CREATED') {
                items.push({
                    id: so.id,
                    customerName: so.customerName || '고객사',
                    orderId: so.id,
                    currentStep: 'finalize',
                    amount: so.totalsAmount || 0,
                    shipDate: '-',
                    waitingAction: '확정 입력'
                })
            } else if (so.status === 'PO_GENERATED') {
                items.push({
                    id: so.id,
                    customerName: so.customerName || '고객사',
                    orderId: so.id,
                    currentStep: 'confirm',
                    amount: so.totalsAmount || 0,
                    shipDate: '-',
                    waitingAction: '고객 컨펌 대기'
                })
            }
        })

        // 3. 출고 준비 및 완료 단계 (Shipments)
        shipments.forEach(s => {
            const sourceSO = salesOrders.find(so => so.id === s.sourceSalesOrderId);
            const customerName = sourceSO?.customerName || '고객사';

            if (s.status === 'PREPARING' || s.status === 'IN_TRANSIT') {
                items.push({
                    id: s.id,
                    customerName: customerName,
                    orderId: s.id,
                    currentStep: 'dispatch',
                    amount: 0,
                    shipDate: s.etaAt ? new Date(s.etaAt).toISOString().split('T')[0] : '-',
                    waitingAction: '출고 준비'
                })
            } else if (s.status === 'DELIVERED') {
                items.push({
                    id: s.id,
                    customerName: customerName,
                    orderId: s.id,
                    currentStep: 'complete',
                    amount: 0,
                    shipDate: s.updatedAt ? new Date(s.updatedAt).toISOString().split('T')[0] : '-',
                    waitingAction: '완료'
                })
            }
        })

        setPipelineItems(items)
    }, [orderSheets, salesOrders, shipments])

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
                    <h1>TRS 주문-출고 워크플로우</h1>
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
                        <div className="summary-icon urgent"><ZapIcon size={24} /></div>
                        <div className="summary-content">
                            <span className="summary-value">{getStepItems('review').filter(i => i.urgent).length}</span>
                            <span className="summary-label">긴급 검토 필요</span>
                        </div>
                    </div>

                    <div className="summary-card glass-card" onClick={() => setSelectedStep('dispatch')}>
                        <div className="summary-icon warning"><TruckDeliveryIcon size={24} /></div>
                        <div className="summary-content">
                            <span className="summary-value">{getStepCount('dispatch')}</span>
                            <span className="summary-label">배차 대기</span>
                        </div>
                    </div>

                    <div className="summary-card glass-card" onClick={() => setSelectedStep('gate')}>
                        <div className="summary-icon info"><FactoryIcon size={24} /></div>
                        <div className="summary-content">
                            <span className="summary-value">{getStepCount('gate')}</span>
                            <span className="summary-label">출고 검수 대기</span>
                        </div>
                    </div>

                    <div className="summary-card glass-card success">
                        <div className="summary-icon success"><CheckCircleIcon size={24} /></div>
                        <div className="summary-content">
                            <span className="summary-value">
                                {shipments.filter(s => s.status === 'DELIVERED').length}
                            </span>
                            <span className="summary-label">오늘 완료</span>
                        </div>
                    </div>
                </div>
            </section>
            {/* Today's Timeline */}
            <section className="timeline-section glass-card">
                <h3><CalendarIcon size={20} /> 오늘의 출고 일정</h3>
                <div className="timeline">
                    {shipments.filter(s => s.status === 'PREPARING' || s.status === 'IN_TRANSIT').length === 0 ? (
                        <div className="empty-timeline">
                            <p>오늘 예정된 출고 일정이 없습니다.</p>
                        </div>
                    ) : (
                        shipments
                            .filter(s => s.status === 'PREPARING' || s.status === 'IN_TRANSIT')
                            .map(s => {
                                const sourceSO = salesOrders.find(so => so.id === s.sourceSalesOrderId);
                                return (
                                    <div key={s.id} className={`timeline-item ${s.status === 'IN_TRANSIT' ? 'in-progress' : 'pending'}`}>
                                        <div className="timeline-time">
                                            {s.etaAt ? new Date(s.etaAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </div>
                                        <div className="timeline-content">
                                            <span className="timeline-customer">{sourceSO?.customerName || '고객사'}</span>
                                            <span className="timeline-status">
                                                {s.status === 'IN_TRANSIT' ? '배송중' : '출고 대기'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                    )}
                </div>
            </section>
        </div>
    )
}
