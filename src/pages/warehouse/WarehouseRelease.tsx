import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    getSalesOrderById,
    getSalesOrderItems,
    updateSalesOrder,
    type FirestoreSalesOrder,
    type FirestoreSalesOrderItem
} from '../../lib/orderService'
import { recordOutbound } from '../../lib/inventoryService'
import { createSettlement } from '../../lib/settlementService'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { MapPinIcon, TruckDeliveryIcon, PackageIcon, CheckCircleIcon, ClipboardListIcon, AlertTriangleIcon } from '../../components/Icons'
import './WarehouseRelease.css'

interface ReleaseItem {
    productName: string
    spec: string
    orderedKg: number
    loadedKg: number
    boxCount: number
    status: 'PENDING' | 'LOADED' | 'ISSUE'
    note: string
}

// 타입 정의
type LocalSalesOrder = Omit<FirestoreSalesOrder, 'createdAt' | 'confirmedAt'> & {
    createdAt?: Date
    confirmedAt?: Date
}

type LocalSalesOrderItem = FirestoreSalesOrderItem

export default function WarehouseRelease() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    // Firebase에서 직접 로드되는 데이터
    const [so, setSo] = useState<LocalSalesOrder | null>(null)
    const [soItems, setSoItems] = useState<LocalSalesOrderItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

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

            const [soData, itemsData] = await Promise.all([
                getSalesOrderById(id),
                getSalesOrderItems(id)
            ])

            if (soData) {
                setSo({
                    ...soData,
                    createdAt: soData.createdAt?.toDate?.() || new Date(),
                    confirmedAt: soData.confirmedAt?.toDate?.() || new Date(),
                })
            }
            setSoItems(itemsData)
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

    const releaseInfo = useMemo(() => ({
        id: id || '',
        orderId: so?.sourceOrderSheetId || '',
        customerName: so?.customerName || '',
        shipTo: '배송지 정보 확인 필요',
        vehicleNo: '배차대기',
        driverName: '',
        driverPhone: '010-0000-0000',
        expectedTime: '미정',
        adminMemo: '특별 요청사항 없음',
    }), [so, id])

    const [items, setItems] = useState<ReleaseItem[]>([])

    // soItems가 로드되면 items 초기화
    useEffect(() => {
        if (soItems.length > 0) {
            setItems(soItems.map(item => ({
                productName: item.productName || '알 수 없는 상품',
                spec: '기본규격',
                orderedKg: item.qtyKg,
                loadedKg: item.qtyKg,
                boxCount: Math.ceil(item.qtyKg / 10),
                status: 'PENDING',
                note: ''
            })))
        }
    }, [soItems])

    const [requestConfirmed, setRequestConfirmed] = useState(false)

    const [driverConfirmation, setDriverConfirmation] = useState({
        confirmed: false,
        signature: '',
    })

    const updateItem = (index: number, field: keyof ReleaseItem, value: any) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: value }
        setItems(updated)
    }

    const markItemLoaded = (index: number) => {
        const updated = [...items]
        updated[index].status = 'LOADED'
        setItems(updated)
    }

    const markItemIssue = (index: number) => {
        const updated = [...items]
        updated[index].status = 'ISSUE'
        setItems(updated)
    }

    const allItemsLoaded = items.every(item => item.status !== 'PENDING')
    const hasIssues = items.some(item => item.status === 'ISSUE')

    const handleComplete = async () => {
        if (!driverConfirmation.confirmed) {
            showAlert('확인 필요', '기사님 확인이 필요합니다.', true)
            return
        }
        if (!so) return

        try {
            setLoading(true)

            const totalLoadedKg = items.reduce((sum, i) => sum + i.loadedKg, 0)

            // 1. SalesOrder 상태 SHIPPED로 업데이트
            await updateSalesOrder(so.id, {
                status: 'SHIPPED',
                totalsKg: totalLoadedKg,
            })

            // 2. 각 품목별로 inventory OUTBOUND 이벤트 저장
            const outboundPromises = items.map(item =>
                recordOutbound({
                    sourceId: so.id,
                    productId: item.productName, // TODO: productId 교체
                    productName: item.productName,
                    customerId: so.customerOrgId || '',
                    customerName: so.customerName || '',
                    tempZone: 'CHILLED',         // TODO: 상품 마스터 연동 시 교체
                    boxCount: item.boxCount,
                    weightKg: item.loadedKg,     // 실적재 중량
                    memo: item.note || undefined,
                    createdBy: user?.id || 'unknown',
                })
            )
            await Promise.all(outboundPromises)

            // 3. Settlement 자동 생성
            const estimatedUnitPrice =
                so.totalsAmount > 0 && so.totalsKg > 0
                    ? so.totalsAmount / so.totalsKg
                    : 0

            const settlement = await createSettlement({
                salesOrderId: so.id,
                customerOrgId: so.customerOrgId || '',
                customerName: so.customerName || '',
                estimatedAmount: so.totalsAmount,
                estimatedWeightKg: so.totalsKg,
                finalWeightKg: totalLoadedKg,
                unitPrice: estimatedUnitPrice,
                paymentTermDays: 30,            // TODO: 고객사별 결제조건으로 교체
                shippedAt: Timestamp.now(),
                createdBy: user?.id || 'unknown',
            })

            // 4. SalesOrder에 실중량/실금액/정산ID 기록
            await updateSalesOrder(so.id, {
                finalWeightKg: totalLoadedKg,
                finalAmount: settlement.finalAmount,
                settlementId: settlement.id,
            })

            showAlert('출고 완료', '출고 처리가 완료되었습니다!\n재고 차감 및 정산이 생성되었습니다.')
            setTimeout(() => {
                navigate('/warehouse')
            }, 1500)
        } catch (err) {
            console.error('Failed to complete release:', err)
            showAlert('오류', '출고 처리 중 오류가 발생했습니다.', true)
        } finally {
            setLoading(false)
        }
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="warehouse-release">
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
            <div className="warehouse-release">
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
        <div className="warehouse-release">
            {/* Header */}
            <header className="release-header">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/warehouse')}>
                        ← 대시보드
                    </button>
                    <span className="badge badge-warning">📤 출고 처리</span>
                </div>

                <div className="header-main">
                    <div className="release-info">
                        <h1>{releaseInfo.customerName}</h1>
                        <p className="order-id">주문: {releaseInfo.orderId}</p>
                        <p className="ship-to"><MapPinIcon size={14} /> {releaseInfo.shipTo}</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                        <span className="step-num">1</span>
                        <span className="step-label">요청 확인</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                        <span className="step-num">2</span>
                        <span className="step-label">상품 적재</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                        <span className="step-num">3</span>
                        <span className="step-label">기사 확인</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
                        <span className="step-num">4</span>
                        <span className="step-label">출고 완료</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="release-content">
                {/* Step 1: 요청 및 서류 확인 */}
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>📝 관리자 반출 요청 확인</h2>
                        <p className="section-desc">관리자의 특별 요청사항과 거래명세서를 확인해주세요.</p>

                        <div className="admin-request-card">
                            <div className="memo-section">
                                <h3>💡 개별 요청사항</h3>
                                <div className="memo-content">
                                    {releaseInfo.adminMemo}
                                </div>
                            </div>

                            <div className="doc-section">
                                <h3>📑 출고 거래명세서</h3>
                                <div className="doc-preview-placeholder">
                                    <ClipboardListIcon size={40} />
                                    <span>출고용 거래명세서.pdf</span>
                                    <button className="btn btn-sm btn-secondary">내용 확인</button>
                                </div>
                            </div>

                            <div className="confirm-check mt-6">
                                <label className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        checked={requestConfirmed}
                                        onChange={(e) => setRequestConfirmed(e.target.checked)}
                                    />
                                    <span>요청사항 및 서류 확인 완료</span>
                                </label>
                            </div>
                        </div>

                        <div className="step-footer mt-6">
                            <div />
                            <button
                                className="btn btn-primary btn-lg flex-1"
                                onClick={() => setCurrentStep(2)}
                                disabled={!requestConfirmed}
                            >
                                다음 → 상품 적재 시작
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 2: 상품 적재 */}
                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><PackageIcon size={20} /> 상품 적재</h2>
                        <p className="section-desc">각 품목을 차량에 적재하고 확인해주세요.</p>

                        <div className="items-checklist">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`check-item ${item.status.toLowerCase()}`}
                                >
                                    <div className="item-header">
                                        <div className="item-info">
                                            <h4>{item.productName}</h4>
                                            <span className="spec">{item.spec}</span>
                                        </div>
                                        <div className={`status-badge ${item.status.toLowerCase()}`}>
                                            {item.status === 'PENDING' && '⏳ 대기'}
                                            {item.status === 'LOADED' && <><CheckCircleIcon size={14} /> 적재완료</>}
                                            {item.status === 'ISSUE' && '⚠️ 이상'}
                                        </div>
                                    </div>

                                    <div className="item-body">
                                        <div className="qty-row">
                                            <div className="qty-field">
                                                <label>주문 수량</label>
                                                <span className="ordered">{item.orderedKg}kg</span>
                                            </div>
                                            <div className="qty-field">
                                                <label>적재 수량</label>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        value={item.loadedKg}
                                                        onChange={(e) => updateItem(idx, 'loadedKg', parseInt(e.target.value) || 0)}
                                                    />
                                                    <span className="unit">kg</span>
                                                </div>
                                            </div>
                                            <div className="qty-field">
                                                <label>박스 수</label>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        value={item.boxCount}
                                                        onChange={(e) => updateItem(idx, 'boxCount', parseInt(e.target.value) || 0)}
                                                    />
                                                    <span className="unit">박스</span>
                                                </div>
                                            </div>
                                        </div>

                                        {item.status === 'ISSUE' && (
                                            <div className="issue-note">
                                                <label>이상 내용</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="이상 내용을 입력해주세요"
                                                    value={item.note}
                                                    onChange={(e) => updateItem(idx, 'note', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {item.status === 'PENDING' && (
                                        <div className="item-actions">
                                            <button
                                                className="btn btn-success"
                                                onClick={() => markItemLoaded(idx)}
                                            >
                                                <CheckCircleIcon size={16} /> 적재 완료
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => markItemIssue(idx)}
                                            >
                                                ⚠️ 이상
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                                ← 이전
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setCurrentStep(3)}
                                disabled={!allItemsLoaded}
                            >
                                다음 → 기사 확인
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 3: 기사 확인 */}
                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2>✍️ 기사 확인</h2>
                        <p className="section-desc">기사님께 적재 내역을 확인받으세요.</p>

                        <div className="driver-confirm-card">
                            <div className="driver-info">
                                <span className="driver-name"><TruckDeliveryIcon size={16} /> {releaseInfo.driverName || '미배정'}</span>
                                <span className="vehicle-no">{releaseInfo.vehicleNo}</span>
                            </div>

                            <div className="loaded-summary">
                                <h4>적재 내역</h4>
                                {items.map((item, idx) => (
                                    <div key={idx} className="summary-row">
                                        <span>{item.productName}</span>
                                        <span>{item.loadedKg}kg ({item.boxCount}박스)</span>
                                    </div>
                                ))}
                                <div className="summary-total">
                                    <span>총 적재량</span>
                                    <span>{items.reduce((sum, i) => sum + i.loadedKg, 0)}kg</span>
                                </div>
                            </div>

                            <div className="confirm-checkbox">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={driverConfirmation.confirmed}
                                        onChange={(e) => setDriverConfirmation({
                                            ...driverConfirmation,
                                            confirmed: e.target.checked
                                        })}
                                    />
                                    <span>위 적재 내역을 확인했습니다.</span>
                                </label>
                            </div>

                            {hasIssues && (
                                <div className="issues-notice">
                                    ⚠️ {items.filter(i => i.status === 'ISSUE').length}건의 이상 항목이 있습니다.
                                </div>
                            )}
                        </div>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                                ← 이전
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setCurrentStep(4)}
                                disabled={!driverConfirmation.confirmed}
                            >
                                다음 → 출고 완료
                            </button>
                        </div>
                    </section>
                )}

                {/* Step 4: 출고 완료 */}
                {currentStep === 4 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 출고 완료 확인</h2>
                        <p className="section-desc">최종 내역을 확인하고 출고를 완료해주세요.</p>

                        <div className="final-summary-card">
                            <div className="summary-header">
                                <span>{releaseInfo.customerName}</span>
                                <span className="order-id">{releaseInfo.orderId}</span>
                            </div>

                            <div className="summary-section">
                                <h4>배송 정보</h4>
                                <div className="info-row">
                                    <span className="label">배송지</span>
                                    <span className="value">{releaseInfo.shipTo}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">차량</span>
                                    <span className="value">{releaseInfo.vehicleNo}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">기사</span>
                                    <span className="value">{releaseInfo.driverName || '미배정'} ({releaseInfo.driverPhone})</span>
                                </div>
                            </div>

                            <div className="summary-section">
                                <h4>적재 품목</h4>
                                {items.map((item, idx) => (
                                    <div key={idx} className="item-row">
                                        <span>{item.productName}</span>
                                        <span>{item.loadedKg}kg</span>
                                    </div>
                                ))}
                            </div>

                            <div className="summary-total-row">
                                <span>총 출고량</span>
                                <span className="total-kg">{items.reduce((sum, i) => sum + i.loadedKg, 0)}kg</span>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg w-full" onClick={handleComplete}>
                            <CheckCircleIcon size={18} /> 출고 완료
                        </button>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(3)}>
                                ← 이전
                            </button>
                            <div />
                        </div>
                    </section>
                )}
            </main>

            {/* Final Global Confirmation/Alert Modal */}
            {confirmConfig && (
                <div className="modal-backdrop" onClick={() => setConfirmConfig(null)} style={{ zIndex: 10000 }}>
                    <div className="modal notification-modal" style={{ maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body text-center py-8">
                            <div className={`notification-icon-wrapper mb-6 mx-auto ${confirmConfig.isDanger ? 'bg-red-50' : 'bg-blue-50'} rounded-full w-20 h-20 flex items-center justify-center`}>
                                {confirmConfig.isDanger ? (
                                    <AlertTriangleIcon size={40} color="#ef4444" />
                                ) : (
                                    <CheckCircleIcon size={40} color="var(--color-primary)" />
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
