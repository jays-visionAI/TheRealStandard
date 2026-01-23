import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangleIcon, ClipboardListIcon, TruckDeliveryIcon, UserIcon, CheckCircleIcon, MapPinIcon } from '../../components/Icons'
import {
    getSalesOrderById,
    getSalesOrderItems,
    createShipment,
    type FirestoreSalesOrder,
    type FirestoreSalesOrderItem
} from '../../lib/orderService'
import './StepDispatch.css'
import type { ReactNode } from 'react'
import { Timestamp } from 'firebase/firestore'

import { getAll3PLUsers, type FirestoreUser } from '../../lib/userService'

// 배차 프로세스의 단계 (3PL 요청 모드 포함)
const DISPATCH_STEPS: { id: number; label: string; icon: ReactNode }[] = [
    { id: 1, label: '주문 확인', icon: <ClipboardListIcon size={20} /> },
    { id: 2, label: '배차 방식 선택', icon: <TruckDeliveryIcon size={20} /> },
    { id: 3, label: '정보 입력/요청', icon: <UserIcon size={20} /> },
    { id: 4, label: '최종 확인', icon: <CheckCircleIcon size={20} /> },
]

interface VehicleType {
    id: string
    name: string
    capacityKg: number
    available: number
}

// 타입 정의
type LocalSalesOrder = Omit<FirestoreSalesOrder, 'createdAt' | 'confirmedAt'> & {
    createdAt?: Date
    confirmedAt?: Date
}

type LocalSalesOrderItem = FirestoreSalesOrderItem

export default function StepDispatch() {
    const { id } = useParams()
    const navigate = useNavigate()

    // Firebase에서 직접 로드되는 데이터
    const [salesOrder, setSalesOrder] = useState<LocalSalesOrder | null>(null)
    const [salesOrderItems, setSalesOrderItems] = useState<LocalSalesOrderItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [currentStep, setCurrentStep] = useState(1)
    const [dispatchMode, setDispatchMode] = useState<'DIRECT' | '3PL'>('3PL')
    const [carriers, setCarriers] = useState<FirestoreUser[]>([])
    const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null)
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
    const [selectedDriver, setSelectedDriver] = useState<any>(null)
    const [etaTime, setEtaTime] = useState('14:00')
    const [saving, setSaving] = useState(false)
    const [vTypes, setVTypes] = useState<VehicleType[]>([])

    // 모달 통보 전용 상태
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string,
        message: string,
        onConfirm?: () => void,
        onCancel?: () => void,
        isDanger?: boolean,
        confirmText?: string,
        cancelText?: string,
        type: 'alert' | 'confirm'
    } | null>(null)

    // 알림창 헬퍼
    const showAlert = (title: string, message: string, isDanger = false) => {
        setConfirmConfig({
            title,
            message,
            type: 'alert',
            isDanger,
            confirmText: '확인'
        })
    }

    // 확인창 헬퍼
    const showConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
        setConfirmConfig({
            title,
            message,
            type: 'confirm',
            isDanger,
            confirmText: '확인',
            cancelText: '취소',
            onConfirm: () => {
                onConfirm()
                setConfirmConfig(null)
            },
            onCancel: () => setConfirmConfig(null)
        })
    }

    // Firebase에서 데이터 로드
    const loadData = async () => {
        if (!id) return

        try {
            setLoading(true)
            setError(null)

            const [soData, itemsData, carriersData] = await Promise.all([
                getSalesOrderById(id),
                getSalesOrderItems(id),
                getAll3PLUsers()
            ])

            if (soData) {
                setSalesOrder({
                    ...soData,
                    createdAt: soData.createdAt?.toDate?.() || new Date(),
                    confirmedAt: soData.confirmedAt?.toDate?.() || new Date(),
                })
            }
            setSalesOrderItems(itemsData)
            setCarriers(carriersData)

            // Mock vehicle types for now if service not available
            setVTypes([
                { id: 'v1', name: '1.8톤', capacityKg: 1800, available: 3 },
                { id: 'v2', name: '3.5톤', capacityKg: 3500, available: 2 },
                { id: 'v3', name: '5톤', capacityKg: 5000, available: 1 },
                { id: 'v4', name: '11톤', capacityKg: 11000, available: 1 },
            ])
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadData()
    }, [id])

    const order = {
        id: salesOrder?.id || 'NO-DATA',
        customerName: salesOrder?.customerName || '알 수 없음',
        shipDate: salesOrder?.confirmedAt ? salesOrder.confirmedAt.toLocaleDateString('ko-KR') : '-',
        shipTo: '-', // 실제로는 Organization 정보에서 가져와야 함
        totalKg: salesOrder?.totalsKg || 0,
        items: salesOrderItems.map(i => ({
            name: i.productName || '상품명 없음',
            kg: i.qtyKg
        }))
    }

    const recommendedVehicle = vTypes.find(v => v.capacityKg >= order.totalKg) || vTypes[vTypes.length - 1]

    const handleNext = () => {
        if (currentStep === 2 && dispatchMode === '3PL' && !selectedCarrierId) {
            showAlert('선택 오류', '배송업체를 선택해주세요.', true)
            return
        }
        if (currentStep === 3) {
            if (dispatchMode === 'DIRECT' && !selectedVehicle) {
                showAlert('선택 오류', '차량을 선택해주세요.', true)
                return
            }
            if (dispatchMode === 'DIRECT' && !selectedDriver) {
                showAlert('배정 오류', '기사를 배정해주세요.', true)
                return
            }
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleComplete = async () => {
        const vehicle = vTypes.find(v => v.id === selectedVehicle)

        if (!salesOrder) return

        try {
            setSaving(true)

            // 오늘 날짜에 ETA 시간 추가
            const [hours, minutes] = etaTime.split(':').map(Number)
            const etaDate = new Date()
            etaDate.setHours(hours, minutes, 0, 0)

            const carrier = carriers.find(c => c.id === selectedCarrierId)
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

            await createShipment({
                sourceSalesOrderId: salesOrder.id,
                carrierOrgId: carrier?.id,
                company: carrier?.business?.companyName || carrier?.name,
                status: 'PREPARING',
                dispatcherToken: token,
                dispatchRequestedAt: Timestamp.now(),
                etaAt: Timestamp.fromDate(etaDate),
            })

            showAlert('배차 요청 완료', `배송업체에 배차 요청을 성공적으로 보냈습니다.`)
            setTimeout(() => {
                navigate('/admin/workflow')
            }, 1000)
        } catch (err) {
            console.error('Dispatch failed:', err)
            showAlert('오류', '배차 등록에 실패했습니다.', true)
        } finally {
            setSaving(false)
        }
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="step-dispatch">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>데이터를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="step-dispatch">
                <div className="error-state">
                    <p>❌ {error}</p>
                    <button className="btn btn-primary" onClick={loadData}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="step-dispatch">
            {/* Header */}
            <header className="dispatch-header glass-card">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/admin/workflow')}>
                        ← 워크플로우
                    </button>
                    <span className="badge badge-warning">배차 필요</span>
                </div>

                <div className="header-main">
                    <div className="order-info">
                        <h1><TruckDeliveryIcon size={24} /> 배차 입력</h1>
                        <div className="order-meta">
                            <span className="customer-name">{order.customerName}</span>
                            <span className="order-id">{order.id}</span>
                        </div>
                    </div>
                    <div className="order-weight">
                        <span className="weight-label">총 배송 중량:</span>
                        <span className="weight-value">{order.totalKg.toLocaleString()}</span>
                        <span className="weight-unit">kg</span>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    {DISPATCH_STEPS.map((step, index) => (
                        <div key={step.id} className="step-wrapper">
                            <div className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                                <div className="step-circle">
                                    {currentStep > step.id ? '✓' : step.icon}
                                </div>
                                <span className="step-label">{step.label}</span>
                            </div>
                            {index < DISPATCH_STEPS.length - 1 && (
                                <div className={`step-connector ${currentStep > step.id ? 'completed' : ''}`} />
                            )}
                        </div>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="dispatch-content">
                {/* Step 1: 주문 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 주문 내용 확인</h2>
                        <p className="section-desc">배송할 주문의 상세 내용을 확인합니다.</p>

                        <div className="info-cards">
                            <div className="info-card">
                                <span className="info-icon"><ClipboardListIcon size={16} /></span>
                                <div className="info-content">
                                    <span className="info-label">배송일</span>
                                    <span className="info-value">{order.shipDate}</span>
                                </div>
                            </div>
                            <div className="info-card">
                                <span className="info-icon"><MapPinIcon size={16} /></span>
                                <div className="info-content">
                                    <span className="info-label">배송지</span>
                                    <span className="info-value">{order.shipTo}</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="mt-6 mb-3">배송 품목</h3>
                        <div className="item-list">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="item-row">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-kg">{item.kg} kg</span>
                                </div>
                            ))}
                            <div className="item-row total">
                                <span className="item-name">총 중량</span>
                                <span className="item-kg">{order.totalKg} kg</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Step 2: 배차 방식 선택 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>배차 방식 선택</h2>
                        <p className="section-desc">차량 및 기사를 직접 배정하거나, 배송업체(3PL)에 요청합니다.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div
                                className={`mode-card ${dispatchMode === '3PL' ? 'selected' : ''}`}
                                onClick={() => setDispatchMode('3PL')}
                            >
                                <div className="mode-icon"><UserIcon size={32} /></div>
                                <div className="mode-title">배송업체 요청</div>
                                <p className="mode-desc">등록된 3PL 파트너사에게 배차 요청 링크를 보냅니다. 파트너사가 직접 차량/기사를 배정합니다.</p>
                            </div>
                            <div
                                className={`mode-card ${dispatchMode === 'DIRECT' ? 'selected' : ''}`}
                                onClick={() => setDispatchMode('DIRECT')}
                            >
                                <div className="mode-icon"><TruckDeliveryIcon size={32} /></div>
                                <div className="mode-title">직접 배정</div>
                                <p className="mode-desc">관리자가 차량과 기사를 즉시 직접 배정합니다. (회사 직영 또는 긴급 상황)</p>
                            </div>
                        </div>

                        {dispatchMode === '3PL' && (
                            <div className="carrier-selection mt-8 animate-fade-in">
                                <h3 className="mb-4">배송업체 선택</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {carriers.map(carrier => (
                                        <div
                                            key={carrier.id}
                                            className={`carrier-card ${selectedCarrierId === carrier.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedCarrierId(carrier.id)}
                                        >
                                            <div className="carrier-info">
                                                <span className="carrier-name">{carrier.business?.companyName || carrier.name}</span>
                                                <span className="carrier-contact">{carrier.business?.dispatcherName || carrier.business?.ceoName} | {carrier.business?.dispatcherPhone || carrier.business?.tel}</span>
                                            </div>
                                            {selectedCarrierId === carrier.id && <div className="check">✓</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Step 3: 정보 입력/요청 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        {dispatchMode === '3PL' ? (
                            <>
                                <h2>배차 요청 확인</h2>
                                <p className="section-desc">지정된 업체에 배송품목 리스트와 배차 요청이 전달됩니다.</p>
                                <div className="request-preview mt-6 p-6 bg-blue-50 rounded-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-bold text-blue-800">요청 대상 업체</span>
                                        <span className="text-lg font-bold text-blue-600">{carriers.find(c => c.id === selectedCarrierId)?.business?.companyName}</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="form-group">
                                            <label className="label">도착 요청 일시</label>
                                            <input type="time" className="input" value={etaTime} onChange={e => setEtaTime(e.target.value)} />
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">* 요청 시 업체 담당자에게 실시간 알림과 전용 링크가 발송됩니다.</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>직접 배정 정보 입력</h2>
                                <p className="section-desc">차량과 기사 정보를 직접 입력하세요.</p>
                                {/* Legacy direct assignment UI can go here if needed, or simplified for this MVP */}
                                <div className="space-y-4 mt-6">
                                    <div className="form-group">
                                        <label className="label">차량 종류</label>
                                        <select className="input" value={selectedVehicle || ''} onChange={e => setSelectedVehicle(e.target.value)}>
                                            <option value="">선택하세요</option>
                                            {vTypes.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">기사 성함</label>
                                        <input type="text" className="input" onChange={e => setSelectedDriver({ ...selectedDriver, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">기사 연락처</label>
                                        <input type="text" className="input" onChange={e => setSelectedDriver({ ...selectedDriver, phone: e.target.value })} />
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                )}

                {/* Step 4: 배차 완료 */}
                {currentStep === 4 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><CheckCircleIcon size={20} /> 배차 정보 확인</h2>
                        <p className="section-desc">아래 내용으로 배차를 완료합니다.</p>

                        <div className="summary-card">
                            <div className="summary-row">
                                <span className="summary-label">배차 방식</span>
                                <span className="summary-value font-bold">{dispatchMode === '3PL' ? '배송업체(3PL) 요청' : '직접 배정'}</span>
                            </div>
                            {dispatchMode === '3PL' ? (
                                <div className="summary-row">
                                    <span className="summary-label">요청 업체</span>
                                    <span className="summary-value font-bold text-blue-600">{carriers.find(c => c.id === selectedCarrierId)?.business?.companyName}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="summary-row">
                                        <span className="summary-label">차량</span>
                                        <span className="summary-value">{vTypes.find(v => v.id === selectedVehicle)?.name}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">기사</span>
                                        <span className="summary-value">{selectedDriver?.name}</span>
                                    </div>
                                </>
                            )}
                            <div className="summary-row">
                                <span className="summary-label">도착예정 요청</span>
                                <span className="summary-value highlight">{etaTime}</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg w-full mt-6"
                            onClick={handleComplete}
                            disabled={saving}
                        >
                            <TruckDeliveryIcon size={18} /> {saving ? '처리 중...' : '배차 완료하기'}
                        </button>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="dispatch-footer glass-card">
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

            {/* Final Global Confirmation/Alert Modal */}
            {confirmConfig && (
                <div className="modal-backdrop" onClick={() => setConfirmConfig(null)} style={{ zIndex: 10000 }}>
                    <div className="modal notification-modal" style={{ maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body text-center py-8">
                            <div className={`notification-icon-wrapper mb-6 mx-auto ${confirmConfig.isDanger ? 'bg-red-50' : 'bg-blue-50'} rounded-full w-20 h-20 flex items-center justify-center`}>
                                {confirmConfig.isDanger ? (
                                    <AlertTriangleIcon size={40} color="#ef4444" />
                                ) : (
                                    <TruckDeliveryIcon size={40} color="var(--color-primary)" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{confirmConfig.title}</h3>
                            <p className="text-secondary whitespace-pre-wrap">{confirmConfig.message}</p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px', borderTop: 'none', paddingTop: 0 }}>
                            {confirmConfig.type === 'confirm' && (
                                <button className="btn btn-secondary px-8" onClick={confirmConfig.onCancel}>
                                    {confirmConfig.cancelText || '취소'}
                                </button>
                            )}
                            <button
                                className={`btn ${confirmConfig.isDanger ? 'btn-danger' : 'btn-primary'} px-8`}
                                onClick={confirmConfig.onConfirm || (() => setConfirmConfig(null))}
                                style={confirmConfig.isDanger ? { backgroundColor: '#ef4444', color: 'white' } : {}}
                            >
                                {confirmConfig.confirmText || '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
