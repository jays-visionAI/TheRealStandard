import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TruckDeliveryIcon, SearchIcon, CheckCircleIcon, ClipboardListIcon, AlertTriangleIcon, FilesIcon } from '../../components/Icons'
import {
    getPurchaseOrderById,
    getPurchaseOrderItems,
    updatePurchaseOrder,
    type FirestorePurchaseOrder
} from '../../lib/orderService'
import { recordInbound } from '../../lib/inventoryService'
import { useAuth } from '../../contexts/AuthContext'
import './WarehouseReceive.css'

interface ReceiveItem {
    productName: string
    spec: string
    expectedKg: number
    actualKg: number
    boxCount: number
    status: 'PENDING' | 'CHECKED' | 'ISSUE'
    note: string
}

export default function WarehouseReceive() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [poData, setPoData] = useState<FirestorePurchaseOrder | null>(null)
    const [items, setItems] = useState<ReceiveItem[]>([])

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

            const po = await getPurchaseOrderById(id)
            if (!po) {
                setError('발주 정보를 찾을 수 없습니다.')
                return
            }

            const itemsData = await getPurchaseOrderItems(id)
            setPoData(po)

            // UI용 아이템 상태 초기화
            setItems(itemsData.map(item => ({
                productName: item.productName || '알 수 없는 상품',
                spec: '기본규격',
                expectedKg: item.qtyKg,
                actualKg: item.qtyKg,
                boxCount: Math.ceil(item.qtyKg / 10),
                status: 'PENDING',
                note: ''
            })))
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [id])

    const receiveInfo = useMemo(() => ({
        id: id || '',
        orderId: poData?.id || '',
        customerName: 'Internal',
        supplier: poData?.supplierName || '공급사 확인 중',
        vehicleNo: '배정대기',
        driverName: poData?.supplierName ? '직배송기사' : '',
        driverPhone: '010-0000-0000',
        expectedTime: '미정',
    }), [poData, id])

    const [docsVerified, setDocsVerified] = useState({
        statement: false,
        gradeCert: false
    })

    const updateItem = (index: number, field: keyof ReceiveItem, value: any) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: value }
        setItems(updated)
    }

    const markItemChecked = (index: number) => {
        const updated = [...items]
        updated[index].status = 'CHECKED'
        setItems(updated)
    }

    const markItemIssue = (index: number) => {
        const updated = [...items]
        updated[index].status = 'ISSUE'
        setItems(updated)
    }

    const allItemsChecked = items.length === 0 || items.every(item => item.status !== 'PENDING')
    const hasIssues = items.some(item => item.status === 'ISSUE')

    const handleComplete = async () => {
        if (!poData) return

        if (hasIssues) {
            showConfirm('이상 항목 확인', '이상 항목이 포함되어 있습니다. 그래도 반입 처리를 완료하시겠습니까?', () => proceedWithComplete(), true)
        } else {
            proceedWithComplete()
        }
    }

    const proceedWithComplete = async () => {
        if (!poData) return
        try {
            setLoading(true)

            const totalActualKg = items.reduce((sum, i) => sum + i.actualKg, 0)

            // 1. 발주 상태를 RECEIVED로 업데이트 (기존 코드 유지)
            await updatePurchaseOrder(poData.id, {
                status: 'RECEIVED',
                totalsKg: totalActualKg
            })

            // 2. 각 품목별로 inventory INBOUND 이벤트 저장 (신규)
            const inboundPromises = items.map(item =>
                recordInbound({
                    sourceId: poData.id,
                    productId: item.productName, // TODO: productId가 생기면 교체
                    productName: item.productName,
                    supplierName: poData.supplierName || '',
                    tempZone: 'CHILLED',         // TODO: 상품 마스터에서 가져오도록 교체
                    boxCount: item.boxCount,
                    weightKg: item.actualKg,     // 검수 후 실중량
                    memo: item.note || undefined,
                    createdBy: user?.id || 'unknown',
                })
            )
            await Promise.all(inboundPromises)

            showAlert('반입 완료', '반입 처리가 완료되었습니다!\n재고에 반영되었습니다.')
            setTimeout(() => {
                navigate('/warehouse')
            }, 1200)
        } catch (err) {
            console.error('Failed to complete receive:', err)
            showAlert('오류', '반입 처리 중 오류가 발생했습니다.', true)
        } finally {
            setLoading(false)
        }
    }

    if (loading && !poData) {
        return (
            <div className="warehouse-receive">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>데이터를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="warehouse-receive">
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
        <div className="warehouse-receive">
            {/* Header */}
            <header className="receive-header">
                <div className="header-top">
                    <button className="btn btn-ghost" onClick={() => navigate('/warehouse')}>
                        ← 대시보드
                    </button>
                    <span className="badge badge-primary">📥 반입 처리</span>
                </div>

                <div className="header-main">
                    <div className="receive-info">
                        <h1>{receiveInfo.supplier}</h1>
                        <p className="order-id">발주번호: {receiveInfo.orderId}</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                        <span className="step-num">1</span>
                        <span className="step-label">서류 확인</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                        <span className="step-num">2</span>
                        <span className="step-label">차량 확인</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                        <span className="step-num">3</span>
                        <span className="step-label">품목 검수</span>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
                        <span className="step-num">4</span>
                        <span className="step-label">반입 완료</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="receive-content">
                {currentStep === 1 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 서류 일치 확인</h2>
                        <p className="section-desc">공급사가 제출한 거래명세서와 등급확인서를 대조해주세요.</p>

                        <div className="doc-verification-grid">
                            <div className={`doc-card ${docsVerified.statement ? 'verified' : ''}`}>
                                <div className="doc-preview-placeholder">
                                    <FilesIcon size={40} />
                                    <span>공급사 거래명세서</span>
                                    <button className="btn btn-sm btn-ghost">미리보기</button>
                                </div>
                                <label className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        checked={docsVerified.statement}
                                        onChange={(e) => setDocsVerified({ ...docsVerified, statement: e.target.checked })}
                                    />
                                    <span>명세서 내용 일치 확인</span>
                                </label>
                            </div>

                            <div className={`doc-card ${docsVerified.gradeCert ? 'verified' : ''}`}>
                                <div className="doc-preview-placeholder">
                                    <CheckCircleIcon size={40} />
                                    <span>등급확인서</span>
                                    <button className="btn btn-sm btn-ghost">미리보기</button>
                                </div>
                                <label className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        checked={docsVerified.gradeCert}
                                        onChange={(e) => setDocsVerified({ ...docsVerified, gradeCert: e.target.checked })}
                                    />
                                    <span>등급/이력번호 일치 확인</span>
                                </label>
                            </div>
                        </div>

                        <div className="confirm-actions">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => setCurrentStep(2)}
                                disabled={!docsVerified.statement || !docsVerified.gradeCert}
                            >
                                서류 확인 완료 → 차량 확인
                            </button>
                        </div>
                    </section>
                )}

                {currentStep === 2 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><TruckDeliveryIcon size={20} /> 차량 확인</h2>
                        <p className="section-desc">입고 차량 정보를 확인해주세요.</p>

                        <div className="vehicle-confirm-card">
                            <div className="confirm-row">
                                <span className="label">차량번호</span>
                                <span className="value">{receiveInfo.vehicleNo}</span>
                            </div>
                            <div className="confirm-row">
                                <span className="label">기사명</span>
                                <span className="value">{receiveInfo.driverName}</span>
                            </div>
                            <div className="confirm-row">
                                <span className="label">연락처</span>
                                <span className="value">{receiveInfo.driverPhone}</span>
                            </div>
                            <div className="confirm-row">
                                <span className="label">공급사</span>
                                <span className="value">{receiveInfo.supplier}</span>
                            </div>
                        </div>

                        <div className="confirm-actions">
                            <div className="flex gap-4">
                                <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                                    이전
                                </button>
                                <button className="btn btn-primary btn-lg flex-1" onClick={() => setCurrentStep(3)}>
                                    <CheckCircleIcon size={18} /> 차량 확인 완료 → 품목 검수
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {currentStep === 3 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><SearchIcon size={20} /> 품목 검수</h2>
                        <p className="section-desc">각 품목을 확인하고 실제 수량을 입력해주세요.</p>

                        <div className="items-checklist">
                            {items.length === 0 ? (
                                <div className="empty-items">
                                    <p>검수할 품목이 없습니다.</p>
                                </div>
                            ) : (
                                items.map((item, idx) => (
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
                                                {item.status === 'CHECKED' && <><CheckCircleIcon size={14} /> 확인</>}
                                                {item.status === 'ISSUE' && '⚠️ 이상'}
                                            </div>
                                        </div>

                                        <div className="item-body">
                                            <div className="qty-row">
                                                <div className="qty-field">
                                                    <label>예상 수량</label>
                                                    <span className="expected">{item.expectedKg}kg</span>
                                                </div>
                                                <div className="qty-field">
                                                    <label>실제 수량</label>
                                                    <div className="input-group">
                                                        <input
                                                            type="number"
                                                            className="input"
                                                            value={item.actualKg}
                                                            onChange={(e) => updateItem(idx, 'actualKg', parseInt(e.target.value) || 0)}
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
                                                    onClick={() => markItemChecked(idx)}
                                                >
                                                    <CheckCircleIcon size={16} /> 정상
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
                                ))
                            )}
                        </div>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                                ← 이전
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setCurrentStep(4)}
                                disabled={!allItemsChecked}
                            >
                                다음 → 반입 완료
                            </button>
                        </div>
                    </section>
                )}

                {currentStep === 4 && (
                    <section className="step-section glass-card animate-fade-in">
                        <h2><ClipboardListIcon size={20} /> 반입 완료 확인</h2>
                        <p className="section-desc">검수 내역을 확인하고 반입을 완료해주세요.</p>

                        <div className="summary-card">
                            <div className="summary-header">
                                <span>{receiveInfo.supplier}</span>
                                <span className="order-id">{receiveInfo.orderId}</span>
                            </div>

                            <div className="summary-items">
                                {items.map((item, idx) => (
                                    <div key={idx} className={`summary-item ${item.status.toLowerCase()}`}>
                                        <div className="item-info">
                                            <span className="name">{item.productName}</span>
                                            <span className={`status ${item.status.toLowerCase()}`}>
                                                {item.status === 'CHECKED' ? <CheckCircleIcon size={14} /> : <AlertTriangleIcon size={14} />}
                                            </span>
                                        </div>
                                        <div className="item-qty">
                                            <span>{item.actualKg}kg</span>
                                            {item.expectedKg !== item.actualKg && (
                                                <span className="diff">
                                                    ({item.actualKg - item.expectedKg > 0 ? '+' : ''}{item.actualKg - item.expectedKg})
                                                </span>
                                            )}
                                        </div>
                                        {item.note && <p className="item-note">{item.note}</p>}
                                    </div>
                                ))}
                            </div>

                            <div className="summary-total">
                                <span>총 반입 수량</span>
                                <span className="total-kg">
                                    {items.reduce((sum, i) => sum + i.actualKg, 0)}kg
                                </span>
                            </div>
                        </div>

                        <div className="step-footer">
                            <button className="btn btn-secondary" onClick={() => setCurrentStep(3)}>
                                ← 이전
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={handleComplete}>
                                <CheckCircleIcon size={18} /> 반입 완료
                            </button>
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
