import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { XIcon, AlertTriangleIcon, ClockIcon } from '../../components/Icons'
import {
    getOrderSheetById,
    getOrderSheetItems,
    updateOrderSheet,
    deleteOrderSheet,
    createSalesOrderFromSheet,
    type FirestoreOrderSheet,
    type FirestoreOrderSheetItem
} from '../../lib/orderService'

// 로컬 타입
type LocalOrderSheet = Omit<FirestoreOrderSheet, 'createdAt' | 'updatedAt' | 'shipDate' | 'cutOffAt'> & {
    createdAt?: Date
    updatedAt?: Date
    shipDate?: Date
    cutOffAt?: Date
    lastSubmittedAt?: Date
    shipTo?: string
    adminComment?: string
    customerComment?: string
    revisionComment?: string
    discountAmount?: number
}

export default function OrderReview() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [orderSheet, setOrderSheet] = useState<LocalOrderSheet | null>(null)
    const [items, setItems] = useState<FirestoreOrderSheetItem[]>([])
    const [originalItems, setOriginalItems] = useState<FirestoreOrderSheetItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [revisionComment, setRevisionComment] = useState('')
    const [showRevisionModal, setShowRevisionModal] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [generatedLink, setGeneratedLink] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discountAmount, setDiscountAmount] = useState(0)
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
    const [changeReason, setChangeReason] = useState('')

    // Firebase에서 데이터 로드
    const loadData = async () => {
        if (!id) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const [osData, itemsData] = await Promise.all([
                getOrderSheetById(id),
                getOrderSheetItems(id)
            ])

            if (osData) {
                setOrderSheet({
                    ...osData,
                    createdAt: osData.createdAt?.toDate?.() || new Date(),
                    updatedAt: osData.updatedAt?.toDate?.() || new Date(),
                    shipDate: osData.shipDate?.toDate?.() || undefined,
                    cutOffAt: osData.cutOffAt?.toDate?.() || undefined,
                    adminComment: osData.adminComment,
                    customerComment: osData.customerComment,
                    discountAmount: osData.discountAmount || 0,
                })
                setDiscountAmount(osData.discountAmount || 0)
            }
            setItems(itemsData)
            setOriginalItems(JSON.parse(JSON.stringify(itemsData)))
        } catch (err) {
            console.error('Failed to load order:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [id])

    // Countdown Timer
    useEffect(() => {
        if (!orderSheet?.cutOffAt) return

        const updateTimer = () => {
            const now = new Date().getTime()
            const cutOff = new Date(orderSheet.cutOffAt!).getTime()
            const distance = cutOff - now

            if (distance < 0) {
                setTimeLeft('마감됨')
                return
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24))
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((distance % (1000 * 60)) / 1000)

            let str = ''
            if (days > 0) str += `${days}일 `
            str += `${hours}시간 ${minutes}분 ${seconds}초`
            setTimeLeft(str)
        }

        updateTimer()
        const timer = setInterval(updateTimer, 1000)
        return () => clearInterval(timer)
    }, [orderSheet?.cutOffAt])

    const totalKg = items.reduce((sum, item) => sum + (item.estimatedKg || 0), 0)
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    const finalTotal = Math.max(0, totalAmount - (discountAmount || 0))

    // Detect if admin made changes
    const hasChanges = JSON.stringify(items) !== JSON.stringify(originalItems)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    // Generate AI change summary
    const generateChangeSummary = () => {
        if (!hasChanges) return null

        const changes: string[] = []
        const originalMap = new Map(originalItems.map(item => [item.productId, item]))
        const currentMap = new Map(items.map(item => [item.productId, item]))

        // Check for removed items
        originalItems.forEach(origItem => {
            if (!currentMap.has(origItem.productId)) {
                changes.push(`[삭제] ${origItem.productName}`)
            }
        })

        // Check for added items
        items.forEach(item => {
            if (!originalMap.has(item.productId)) {
                changes.push(`[추가] ${item.productName} (${item.qtyRequested || 0}${item.unit === 'box' ? 'Box' : 'Kg'})`)
            }
        })

        // Check for modified items
        items.forEach(item => {
            const origItem = originalMap.get(item.productId)
            if (origItem) {
                const qtyChanged = (item.qtyRequested || 0) !== (origItem.qtyRequested || 0)
                const priceChanged = item.unitPrice !== origItem.unitPrice

                if (qtyChanged) {
                    changes.push(`[수량 변경] ${item.productName}: ${origItem.qtyRequested || 0} → ${item.qtyRequested || 0}${item.unit === 'box' ? 'Box' : 'Kg'}`)
                }
                if (priceChanged) {
                    changes.push(`[단가 조정] ${item.productName}: ${formatCurrency(origItem.unitPrice)} → ${formatCurrency(item.unitPrice)}`)
                }
            }
        })

        if (changes.length === 0) return null

        // Calculate amount difference
        const originalTotal = originalItems.reduce((sum, item) => sum + (item.amount || 0), 0)
        const currentTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
        const diff = currentTotal - originalTotal

        return {
            changes,
            summary: `총 ${changes.length}건의 변경사항이 발견되었습니다. 최종 금액이 ${diff >= 0 ? '+' : ''}${formatCurrency(diff)} ${diff >= 0 ? '증가' : '감소'}하였습니다.`
        }
    }

    const changeSummary = generateChangeSummary()

    const formatDateOnly = (date: Date | string | undefined) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('ko-KR')
    }

    const formatDateTime = (date: Date | string | undefined) => {
        if (!date) return '-'
        return new Date(date).toLocaleString('ko-KR')
    }

    const handleConfirm = async () => {
        if (!orderSheet) return

        // If there are changes, require change reason
        if (hasChanges && !changeReason.trim()) {
            alert('변경사항이 있습니다. 변경 사유를 입력해주세요.')
            return
        }

        if (!confirm('주문을 확정하시겠습니까? 확정 후에는 수정이 불가합니다.')) return

        try {
            setIsSubmitting(true)

            // Build admin comment with change summary if there are changes
            let adminComment = orderSheet.adminComment || ''
            if (hasChanges && changeSummary) {
                const changeLog = `[변경 사유] ${changeReason}\n[변경 내역]\n${changeSummary.changes.join('\n')}\n${changeSummary.summary}\n\n`
                adminComment = changeLog + adminComment
            }

            await updateOrderSheet(orderSheet.id, {
                status: 'CONFIRMED',
                discountAmount: discountAmount,
                adminComment: adminComment
            })

            // SalesOrder 생성
            await createSalesOrderFromSheet(orderSheet, items)

            alert('주문이 확정되었습니다. 확정주문(SalesOrder)이 생성되었습니다.')
            navigate('/admin/order-sheets')
        } catch (err) {
            console.error('Failed to confirm order:', err)
            alert('주문 확정에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRevisionRequest = async () => {
        if (!orderSheet) return
        if (!revisionComment.trim()) {
            alert('수정 요청 사유를 입력해주세요.')
            return
        }

        try {
            setIsSubmitting(true)

            await updateOrderSheet(orderSheet.id, {
                status: 'REVISION',
                adminComment: `[반려 사유] ${revisionComment}\n${orderSheet.adminComment || ''}`
            })

            // For guest customers, generate and show link
            if (orderSheet.isGuest && orderSheet.inviteTokenId) {
                const link = `${window.location.origin}/order/${orderSheet.inviteTokenId}`
                setGeneratedLink(link)
                setShowRevisionModal(false)
                setShowLinkModal(true)
            } else {
                alert('수정 요청이 전송되었습니다.')
                setShowRevisionModal(false)
                navigate('/admin/order-sheets')
            }
        } catch (err) {
            console.error('Failed to request revision:', err)
            alert('수정 요청에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Save changes and require customer re-confirmation
    const handleSaveChangesForReview = async () => {
        if (!orderSheet) return
        if (!hasChanges) {
            alert('변경된 내용이 없습니다.')
            return
        }
        if (!changeReason.trim()) {
            alert('변경 사유를 입력해주세요.')
            return
        }

        try {
            setIsSubmitting(true)

            // Build admin comment with change summary
            let adminComment = orderSheet.adminComment || ''
            if (changeSummary) {
                const changeLog = `[품목 수정 후 반려] ${changeReason}\n[변경 내역]\n${changeSummary.changes.join('\n')}\n${changeSummary.summary}\n\n`
                adminComment = changeLog + adminComment
            }

            // Update items in Firestore
            // Note: You may need to implement setOrderSheetItems in orderService

            await updateOrderSheet(orderSheet.id, {
                status: 'REVISION',
                adminComment: adminComment
            })

            // For guest customers, generate and show link
            if (orderSheet.isGuest && orderSheet.inviteTokenId) {
                const link = `${window.location.origin}/order/${orderSheet.inviteTokenId}`
                setGeneratedLink(link)
                setShowLinkModal(true)
            } else {
                alert('변경 사항이 저장되었습니다. 고객이 다시 확인해야 합니다.')
                navigate('/admin/order-sheets')
            }
        } catch (err) {
            console.error('Failed to save changes:', err)
            alert('변경 사항 저장에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(generatedLink)
        alert('링크가 클립보드에 복사되었습니다!')
    }

    const handleDelete = async () => {
        if (!orderSheet) return
        if (!confirm('정말로 이 발주서를 삭제하시겠습니까? 삭제된 발주서는 복구할 수 없습니다.')) return

        try {
            setIsSubmitting(true)

            await deleteOrderSheet(orderSheet.id)

            alert('발주서가 삭제되었습니다.')
            navigate('/admin/order-sheets')
        } catch (err) {
            console.error('Failed to delete order:', err)
            alert('발주서 삭제에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-white">불러오는 중...</div>
    if (error) return (
        <div className="p-8 text-center text-white">
            <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                <AlertTriangleIcon size={24} color="#ef4444" />
            </span>
            {error}
        </div>
    )
    if (!orderSheet) return <div className="p-8 text-center text-white">발주서를 찾을 수 없습니다.</div>

    return (
        <div className="page-container">
            {/* Header */}
            <div className="mb-6">
                <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>
                    ← 뒤로
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">발주서 검토</h1>
                        <p className="text-secondary font-mono">{orderSheet.id}</p>
                    </div>
                    <div className="flex gap-2">
                        {orderSheet.status === 'SUBMITTED' && <div className="badge badge-warning">고객 컨펌</div>}
                        {orderSheet.status === 'CONFIRMED' && <div className="badge badge-success">승인됨</div>}
                        {orderSheet.status === 'SENT' && <div className="badge badge-primary">발송됨</div>}
                        {orderSheet.status === 'REVISION' && <div className="badge badge-error">반려중</div>}
                        {orderSheet.isGuest && <div className="badge badge-info">비회원</div>}
                    </div>
                </div>
            </div>

            {/* Order Info */}
            <div className="glass-card mb-4">
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">고객사</span>
                        <span className="info-value">{orderSheet.customerName}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">배송일</span>
                        <span className="info-value">{formatDateOnly(orderSheet.shipDate)}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">제출시간</span>
                        <span className="info-value">{formatDateTime(orderSheet.lastSubmittedAt)}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">주문마감시간</span>
                        <span className="info-value">{formatDateTime(orderSheet.cutOffAt)}</span>
                        {timeLeft && (
                            <div className="flex items-center gap-1 mt-1" style={{ color: timeLeft === '마감됨' ? '#ef4444' : '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
                                <ClockIcon size={14} />
                                <span>{timeLeft} {timeLeft !== '마감됨' && '남음'}</span>
                            </div>
                        )}
                    </div>
                    <div className="info-item full-width">
                        <span className="info-label">배송지</span>
                        <span className="info-value">{orderSheet.shipTo || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Comments Display */}
            {(orderSheet.adminComment || orderSheet.customerComment) && (
                <div className="glass-card mb-4 comments-section">
                    <div className="comments-grid">
                        {orderSheet.adminComment && (
                            <div className="comment-block admin">
                                <div className="comment-header">관리자 메모</div>
                                <div className="comment-body">{orderSheet.adminComment}</div>
                            </div>
                        )}
                        {orderSheet.customerComment && (
                            <div className="comment-block customer">
                                <div className="comment-header">고객 요청사항</div>
                                <div className="comment-body">{orderSheet.customerComment}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Items Table */}
            <div className="glass-card mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h3>주문 품목</h3>
                    {checkedItems.size > 0 && (
                        <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                                const newItems = items.filter((_, idx) => !checkedItems.has(idx))
                                setItems(newItems)
                                setCheckedItems(new Set())
                            }}
                        >
                            선택 삭제 ({checkedItems.size})
                        </button>
                    )}
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={items.length > 0 && checkedItems.size === items.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setCheckedItems(new Set(items.map((_, idx) => idx)))
                                            } else {
                                                setCheckedItems(new Set())
                                            }
                                        }}
                                    />
                                </th>
                                <th>품목명</th>
                                <th className="text-right">주문수량</th>
                                <th className="text-right">중량(kg)</th>
                                <th className="text-right">단가</th>
                                <th className="text-right">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index} className={checkedItems.has(index) ? 'bg-blue-50' : ''}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={checkedItems.has(index)}
                                            onChange={(e) => {
                                                const newSet = new Set(checkedItems)
                                                if (e.target.checked) {
                                                    newSet.add(index)
                                                } else {
                                                    newSet.delete(index)
                                                }
                                                setCheckedItems(newSet)
                                            }}
                                        />
                                    </td>
                                    <td className="font-medium">{item.productName}</td>
                                    <td className="text-right">
                                        <div className="qty-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-outline"
                                                style={{ width: '28px', height: '28px', padding: 0, minWidth: 'unset' }}
                                                onClick={() => {
                                                    const currentQty = item.qtyRequested || 1
                                                    if (currentQty <= 1) return
                                                    const newItems = [...items]
                                                    const newQty = currentQty - 1
                                                    const kgPerUnit = currentQty > 0 && item.estimatedKg ? item.estimatedKg / currentQty : 1
                                                    newItems[index] = {
                                                        ...item,
                                                        qtyRequested: newQty,
                                                        estimatedKg: newQty * kgPerUnit,
                                                        amount: newQty * kgPerUnit * item.unitPrice
                                                    }
                                                    setItems(newItems)
                                                }}
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                className="input"
                                                style={{ width: '60px', textAlign: 'center', padding: '4px 8px' }}
                                                value={item.qtyRequested || 1}
                                                min={1}
                                                onChange={(e) => {
                                                    const currentQty = item.qtyRequested || 1
                                                    const newQty = Math.max(1, parseInt(e.target.value) || 1)
                                                    const newItems = [...items]
                                                    const kgPerUnit = currentQty > 0 && item.estimatedKg ? item.estimatedKg / currentQty : 1
                                                    newItems[index] = {
                                                        ...item,
                                                        qtyRequested: newQty,
                                                        estimatedKg: newQty * kgPerUnit,
                                                        amount: newQty * kgPerUnit * item.unitPrice
                                                    }
                                                    setItems(newItems)
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-outline"
                                                style={{ width: '28px', height: '28px', padding: 0, minWidth: 'unset' }}
                                                onClick={() => {
                                                    const currentQty = item.qtyRequested || 1
                                                    const newItems = [...items]
                                                    const newQty = currentQty + 1
                                                    const kgPerUnit = currentQty > 0 && item.estimatedKg ? item.estimatedKg / currentQty : 1
                                                    newItems[index] = {
                                                        ...item,
                                                        qtyRequested: newQty,
                                                        estimatedKg: newQty * kgPerUnit,
                                                        amount: newQty * kgPerUnit * item.unitPrice
                                                    }
                                                    setItems(newItems)
                                                }}
                                            >
                                                +
                                            </button>
                                            <span style={{ marginLeft: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                                {item.unit === 'box' ? 'Box' : 'Kg'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">{(item.estimatedKg || 0).toFixed(1)}</td>
                                    <td className="text-right">
                                        <input
                                            type="number"
                                            className="input"
                                            style={{ width: '100px', textAlign: 'right', padding: '4px 8px' }}
                                            value={item.unitPrice}
                                            min={0}
                                            onChange={(e) => {
                                                const newPrice = Math.max(0, parseInt(e.target.value) || 0)
                                                const newItems = [...items]
                                                newItems[index] = {
                                                    ...item,
                                                    unitPrice: newPrice,
                                                    amount: (item.estimatedKg || 0) * newPrice
                                                }
                                                setItems(newItems)
                                            }}
                                        />
                                    </td>
                                    <td className="text-right font-semibold">{formatCurrency(item.amount || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="summary-row">
                                <td></td>
                                <td className="font-semibold">소계</td>
                                <td className="text-right font-semibold">{totalKg.toFixed(1)} kg</td>
                                <td></td>
                                <td className="text-right font-semibold">
                                    {formatCurrency(totalAmount)}
                                </td>
                            </tr>
                            <tr className="discount-row">
                                <td></td>
                                <td className="font-semibold text-warning">할인금액</td>
                                <td></td>
                                <td></td>
                                <td className="text-right">
                                    <div className="discount-input-wrapper">
                                        <span className="minus-sign">-</span>
                                        <input
                                            type="number"
                                            className="discount-input"
                                            value={discountAmount || ''}
                                            onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                            placeholder="0"
                                        />
                                        <span className="unit">원</span>
                                    </div>
                                </td>
                            </tr>
                            <tr className="final-total-row">
                                <td></td>
                                <td colSpan={2} className="font-bold text-lg">최종 결제금액</td>
                                <td></td>
                                <td className="text-right font-bold gradient-text text-xl">
                                    {formatCurrency(finalTotal)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* AI Change Summary & Change Reason */}
            {hasChanges && changeSummary && (
                <div className="glass-card mb-4" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <AlertTriangleIcon size={20} color="#f59e0b" />
                        <h3 style={{ margin: 0, color: '#f59e0b' }}>AI 자동 분석: 품목 변경내역</h3>
                    </div>

                    <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                            {changeSummary.changes.map((change, idx) => (
                                <li key={idx} style={{
                                    color: change.startsWith('[삭제]') ? '#ef4444' :
                                        change.startsWith('[추가]') ? '#10b981' :
                                            '#3b82f6'
                                }}>
                                    {change}
                                </li>
                            ))}
                        </ul>
                        <p style={{
                            marginTop: '12px',
                            marginBottom: 0,
                            padding: '8px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: 'var(--text-secondary)'
                        }}>
                            {changeSummary.summary}
                        </p>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#ef4444' }}>*</span>
                            변경 사유 (필수 기입)
                        </label>
                        <textarea
                            className="input textarea"
                            value={changeReason}
                            onChange={(e) => setChangeReason(e.target.value)}
                            placeholder="변경 사유를 입력해주세요. (예: 고객 요청으로 수량 조정, 재고 부족으로 품목 제외 등)"
                            rows={3}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="glass-card">
                <div className="action-panel">
                    <button
                        className="btn btn-ghost danger"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                    >
                        삭제하기
                    </button>

                    {hasChanges && (
                        <button
                            className="btn btn-warning btn-lg"
                            onClick={handleSaveChangesForReview}
                            disabled={isSubmitting}
                        >
                            변경 후 재확인 요청
                        </button>
                    )}

                    {!hasChanges && (
                        <button
                            className="btn btn-secondary btn-lg"
                            onClick={() => setShowRevisionModal(true)}
                            disabled={isSubmitting}
                        >
                            <XIcon size={18} /> 반려 요청
                        </button>
                    )}
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleConfirm}
                        disabled={isSubmitting || orderSheet.status !== 'SUBMITTED' || hasChanges}
                        title={hasChanges ? '변경사항이 있습니다. 먼저 저장해주세요.' : (orderSheet.status !== 'SUBMITTED' ? '고객이 컨펌한 후에만 확정 가능합니다.' : '')}
                    >
                        {isSubmitting ? '처리 중...' : '✓ 확정하기'}
                    </button>
                </div>

                {hasChanges && (
                    <div className="change-warning">
                        <AlertTriangleIcon size={16} />
                        <span>품목이 수정되었습니다. 확정하려면 먼저 변경사항을 저장하고 고객 재확인을 받아야 합니다.</span>
                    </div>
                )}
            </div>

            {/* Revision Modal */}
            {showRevisionModal && (
                <div className="modal-backdrop" onClick={() => setShowRevisionModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>반려 요청</h3>
                        </div>
                        <div className="modal-body">
                            <label className="label">반려 사유</label>
                            <textarea
                                className="input textarea"
                                value={revisionComment}
                                onChange={(e) => setRevisionComment(e.target.value)}
                                placeholder="고객에게 전달할 반려 사유를 입력하세요..."
                                rows={4}
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowRevisionModal(false)}
                            >
                                취소
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRevisionRequest}
                                disabled={isSubmitting}
                            >
                                요청 전송
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link Modal for Guest Customers */}
            {showLinkModal && (
                <div className="modal-backdrop" onClick={() => { setShowLinkModal(false); navigate('/admin/order-sheets') }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>비회원 고객 링크 생성됨</h3>
                        </div>
                        <div className="modal-body">
                            <p className="mb-4">비회원 고객에게 아래 링크를 전달하여 수정된 발주서를 확인하도록 안내해주세요.</p>
                            <div className="link-box">
                                <input
                                    type="text"
                                    className="input"
                                    value={generatedLink}
                                    readOnly
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                />
                                <button className="btn btn-primary" onClick={copyLinkToClipboard}>
                                    복사
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary"
                                onClick={() => { setShowLinkModal(false); navigate('/admin/order-sheets') }}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          padding: var(--space-4);
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        
        .info-item.full-width {
          grid-column: span 3;
        }
        
        .info-label {
          font-size: var(--text-sm);
          color: var(--text-muted);
        }
        
        .info-value {
          font-size: var(--text-base);
          font-weight: var(--font-medium);
          color: var(--text-primary);
        }
        
        .summary-row td {
          padding-top: var(--space-4);
          border-top: 2px solid var(--border-primary);
        }
        
        .action-panel {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-4);
          padding: var(--space-4);
        }
        
        .change-warning {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: rgba(245, 158, 11, 0.1);
          border-top: 1px solid rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
        }
        
        .link-box {
          display: flex;
          gap: var(--space-2);
        }
        
        .link-box .input {
          flex: 1;
          font-family: monospace;
          font-size: var(--text-sm);
        }
        
        .text-right {
          text-align: right;
        }
        
        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .info-item.full-width {
            grid-column: span 1;
          }
          
          .action-panel {
            flex-direction: column;
          }
        }

        /* Comments Styling */
        .comments-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .comment-block {
          padding: var(--space-4);
          border-radius: var(--radius-md);
        }

        .comment-block.admin {
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .comment-block.customer {
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .comment-header {
          font-size: var(--text-xs);
          font-weight: var(--font-bold);
          text-transform: uppercase;
          margin-bottom: var(--space-2);
          letter-spacing: 0.05em;
        }

        .comment-block.admin .comment-header { color: var(--color-primary); }
        .comment-block.customer .comment-header { color: var(--color-warning); }

        .comment-body {
          font-size: var(--text-sm);
          line-height: 1.5;
          color: var(--text-primary);
          white-space: pre-wrap;
        }

        /* Discount Input Styling */
        .discount-row td {
          padding: var(--space-2) var(--space-4);
          border-top: 1px dashed var(--border-primary);
        }

        .discount-input-wrapper {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: rgba(245, 158, 11, 0.1);
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .minus-sign {
          color: var(--color-warning);
          font-weight: var(--font-bold);
        }

        .discount-input {
          background: transparent;
          border: none;
          color: var(--color-warning);
          font-weight: var(--font-bold);
          text-align: right;
          width: 80px;
          padding: 0;
          outline: none;
          -moz-appearance: textfield;
        }

        .discount-input::-webkit-outer-spin-button,
        .discount-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .unit {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }

        .final-total-row td {
          padding: var(--space-4);
          border-top: 2px solid var(--border-primary);
        }

        .text-warning {
          color: var(--color-warning);
        }

        @media (max-width: 640px) {
          .comments-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div >
    )
}
