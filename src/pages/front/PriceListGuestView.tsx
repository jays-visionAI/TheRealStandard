import { useState, useEffect } from 'react'
import { compareGroupOrder } from '../../lib/productSortOrder'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getPriceListByShareToken, incrementPriceListReach, incrementPriceListConversion, type FirestorePriceList } from '../../lib/priceListService'
import { getOrderSheetByToken, getOrderSheetItems, incrementOrderSheetReach, setOrderSheetItems, createOrderSheetWithId, generateOrderSheetId, type FirestoreOrderSheet, type FirestoreOrderSheetItem } from '../../lib/orderService'
import {
    ClipboardListIcon,
    ChevronRightIcon,
    InfoIcon,
    SearchIcon,
    XIcon,
    FileTextIcon,
    AlertTriangleIcon,
    CalendarIcon,
    ClockIcon,
    MegaphoneIcon,
    SendIcon
} from '../../components/Icons'
import { Timestamp } from 'firebase/firestore'

export default function PriceListGuestView() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const recipient = searchParams.get('recipient')
    const [priceList, setPriceList] = useState<FirestorePriceList | null>(null)
    const [orderSheet, setOrderSheet] = useState<FirestoreOrderSheet | null>(null)
    const [orderItems, setOrderItems] = useState<FirestoreOrderSheetItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [countdown, setCountdown] = useState('')


    // Countdown timer for validity period (5 days from sharedAt)
    // Countdown timer for validity period
    useEffect(() => {
        const baseDoc = orderSheet || priceList
        if (!baseDoc) return
        const baseDate = (baseDoc as any).sharedAt?.toDate?.() || (baseDoc as any).createdAt?.toDate?.()
        if (!baseDate) return

        const expiryDate = new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days

        const updateCountdown = () => {
            const now = new Date()
            const diff = expiryDate.getTime() - now.getTime()

            if (diff <= 0) {
                setCountdown('만료')
                return
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            if (days > 0) {
                setCountdown(`${days}일 ${hours}시간 ${minutes}분 남음`)
            } else if (hours > 0) {
                setCountdown(`${hours}시간 ${minutes}분 ${seconds}초 남음`)
            } else {
                setCountdown(`${minutes}분 ${seconds}초 남음`)
            }
        }

        updateCountdown()
        const interval = setInterval(updateCountdown, 1000)
        return () => clearInterval(interval)
    }, [priceList, orderSheet])

    useEffect(() => {
        const loadData = async () => {
            if (!token) return
            try {
                setLoading(true)
                // 1. 먼저 발주서(OrderSheet) 토큰인지 확인
                const osData = await getOrderSheetByToken(token)
                if (osData) {
                    setOrderSheet(osData)
                    const items = await getOrderSheetItems(osData.id)
                    setOrderItems(items)
                    await incrementOrderSheetReach(osData.id)
                    setLoading(false)
                    return
                }

                // 2. 발주서가 없으면 기존 방식대로 단가표(PriceList) 직접 공유 토큰인지 확인
                const plData = await getPriceListByShareToken(token)
                if (plData) {
                    setPriceList(plData)
                    await incrementPriceListReach(plData.id)
                } else {
                    setError('유효하지 않은 링크이거나 만료된 문서입니다.')
                }
            } catch (err: any) {
                console.error(err)
                setError('데이터를 불러오는데 실패했습니다.')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [token])

    const handleStartOrder = async () => {
        if (!orderSheet && !priceList) return

        try {
            setSubmitting(true)

            if (orderSheet) {
                // 이미 생성된 예비 발주서가 있는 경우, 해당 발주서 편집 페이지로 이동
                navigate(`/order/${token}/edit`)
                return
            }

            // 구형 방식(단가표 직접 공유) 대응: 새로운 발주서 생성
            const orderId = await generateOrderSheetId()
            const guestToken = 'gt-' + Math.random().toString(36).substr(2, 9)

            const newOS = await createOrderSheetWithId(orderId, {
                customerOrgId: 'GUEST-PL-' + Date.now(),
                customerName: recipient || priceList!.title || '비회원 고객',
                isGuest: true,
                status: 'SENT',
                cutOffAt: Timestamp.fromDate(new Date(Date.now() + 86400000)), // 24시간
                shipTo: '',
                adminComment: `단가표[${priceList!.title}]를 통한 비회원 주문 시작`,
                sourcePriceListId: priceList!.id,
                reachCount: 0
            })

            // Increment conversion count for the price list
            await incrementPriceListConversion(priceList!.id)

            await setOrderSheetItems(newOS.id, priceList!.items.map(item => ({
                productId: item.productId,
                productName: item.name,
                category1: item.category1,
                unit: 'box',
                unitPrice: item.supplyPrice,
                qtyRequested: 0,
                estimatedKg: 0,
                amount: 0
            })))

            navigate(`/order/${guestToken}/edit`)
        } catch (err) {
            console.error('Failed to start order:', err)
            alert('주문서 페이지로 이동하는데 실패했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>견적서를 불러오는 중...</p>
            </div>
        </div>
    )
    if (error || (!priceList && !orderSheet)) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc', padding: 20 }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <AlertTriangleIcon size={56} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '20px 0 8px' }}>문서를 찾을 수 없습니다</h2>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>{error || '유효하지 않은 링크이거나 만료된 문서일 수 있습니다.'}</p>
            </div>
        </div>
    )

    const formatCurrency = (val: number) => '₩' + new Intl.NumberFormat('ko-KR').format(val)

    const itemsToDisplay = orderSheet
        ? orderItems.map(oi => ({
            productId: oi.productId,
            name: oi.productName,
            supplyPrice: oi.unitPrice,
            category1: oi.category1 || '냉동' // Default to '냉동' if missing
        }))
        : priceList?.items || []

    const filteredItems = itemsToDisplay.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const currentDoc = orderSheet || priceList
    const isExpired = currentDoc?.validUntil ? (currentDoc as any).validUntil.toDate() < new Date() : false

    const createdDate = (() => {
        const d = (currentDoc as any)?.sharedAt?.toDate?.() || (currentDoc as any)?.createdAt?.toDate?.() || new Date()
        const pad = (n: number) => n.toString().padStart(2, '0')
        return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
    })()

    // Group items by base name
    const groupedItems = (() => {
        const grouped: Record<string, { name: string, refrigerated?: number, frozen?: number }> = {}
        filteredItems.forEach(item => {
            const baseName = item.name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').replace(/\s*(냉장|냉동|냉장육|냉동육)\s*$/g, '').trim()
            if (!grouped[baseName]) grouped[baseName] = { name: baseName }
            if (item.category1 === '냉장') grouped[baseName].refrigerated = item.supplyPrice
            else if (item.category1 === '냉동') grouped[baseName].frozen = item.supplyPrice
        })
        return Object.values(grouped).sort(compareGroupOrder)
    })()

    const recipientName = recipient || orderSheet?.customerName || (priceList as any)?.title || '고객'

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes stampIn {
                    from { opacity: 0; transform: scale(0.7) rotate(-20deg); }
                    to { opacity: 1; transform: scale(1) rotate(-12deg); }
                }
                .plgv-root {
                    min-height: 100vh;
                    background: #f4f5f9;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    color: #1e293b;
                    padding-bottom: 140px;
                }
                .plgv-document {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: 32px 16px;
                }
                /* Top Bar */
                .plgv-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 0 24px;
                    font-size: 12px;
                    color: #94a3b8;
                    font-weight: 600;
                }
                .plgv-topbar-left {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .plgv-topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                /* Paper */
                .plgv-paper {
                    background: #fff;
                    border-radius: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.03);
                    border: 1px solid #e8eaef;
                    overflow: hidden;
                    animation: fadeInUp 0.5s ease;
                }
                /* Header */
                .plgv-header {
                    padding: 48px 48px 40px;
                    border-bottom: 1px solid #f1f3f8;
                    position: relative;
                }
                .plgv-header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 36px;
                }
                .plgv-header-brand {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .plgv-header-brand-line {
                    width: 36px;
                    height: 4px;
                    background: #3b82f6;
                    border-radius: 2px;
                    margin-bottom: 12px;
                }
                .plgv-header-title {
                    font-size: 32px;
                    font-weight: 900;
                    letter-spacing: -1px;
                    color: #0f172a;
                    margin: 0;
                    line-height: 1.1;
                }
                .plgv-header-subtitle {
                    font-size: 11px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin-top: 6px;
                }
                .plgv-stamp {
                    width: 80px;
                    height: 80px;
                    border: 3px solid #3b82f6;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    transform: rotate(-12deg);
                    opacity: 0.7;
                    animation: stampIn 0.6s ease 0.3s both;
                    flex-shrink: 0;
                }
                .plgv-stamp-text {
                    font-size: 10px;
                    font-weight: 900;
                    color: #3b82f6;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }
                .plgv-stamp-main {
                    font-size: 13px;
                    font-weight: 900;
                    color: #3b82f6;
                    letter-spacing: 1px;
                }
                /* Info Grid */
                .plgv-info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    border-top: 1px solid #f1f3f8;
                    border-bottom: 1px solid #f1f3f8;
                }
                .plgv-info-cell {
                    padding: 20px 48px;
                    border-bottom: 1px solid #f8f9fc;
                }
                .plgv-info-cell:nth-child(odd) {
                    border-right: 1px solid #f1f3f8;
                }
                .plgv-info-label {
                    font-size: 10px;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 6px;
                }
                .plgv-info-value {
                    font-size: 14px;
                    font-weight: 700;
                    color: #334155;
                }
                .plgv-info-value.primary {
                    color: #3b82f6;
                }
                .plgv-info-value.warning {
                    color: #f59e0b;
                }
                .plgv-info-value.danger {
                    color: #ef4444;
                }
                /* Admin Message */
                .plgv-admin-msg {
                    margin: 0;
                    padding: 20px 48px;
                    background: #f8faff;
                    border-bottom: 1px solid #f1f3f8;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                .plgv-admin-msg-icon {
                    width: 28px;
                    height: 28px;
                    background: #eff6ff;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    color: #3b82f6;
                    margin-top: 1px;
                }
                .plgv-admin-msg-label {
                    font-size: 10px;
                    font-weight: 800;
                    color: #3b82f6;
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    margin-bottom: 4px;
                }
                .plgv-admin-msg-text {
                    font-size: 13px;
                    font-weight: 600;
                    color: #475569;
                    line-height: 1.6;
                }
                /* Search */
                .plgv-search-wrap {
                    padding: 24px 48px 0;
                }
                .plgv-search {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: #f8f9fc;
                    border: 1px solid #e8eaef;
                    border-radius: 12px;
                    padding: 12px 16px;
                    transition: all 0.2s;
                }
                .plgv-search:focus-within {
                    border-color: #93b4f5;
                    box-shadow: 0 0 0 4px rgba(59,130,246,0.06);
                }
                .plgv-search input {
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 14px;
                    font-weight: 600;
                    color: #1e293b;
                    width: 100%;
                }
                .plgv-search input::placeholder {
                    color: #cbd5e1;
                }
                /* Table */
                .plgv-table-wrap {
                    padding: 16px 32px 0;
                    overflow-x: auto;
                }
                .plgv-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 14px;
                }
                .plgv-table thead th {
                    padding: 14px 16px;
                    font-size: 11px;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    text-align: left;
                    border-bottom: 2px solid #f1f3f8;
                    white-space: nowrap;
                }
                .plgv-table thead th.col-no {
                    width: 50px;
                    text-align: center;
                }
                .plgv-table thead th.col-unit {
                    width: 64px;
                    text-align: center;
                }
                .plgv-table thead th.col-price {
                    width: 130px;
                    text-align: right;
                }
                .plgv-table tbody tr {
                    transition: background 0.15s;
                }
                .plgv-table tbody tr:hover {
                    background: #f8faff;
                }
                .plgv-table tbody td {
                    padding: 16px 16px;
                    border-bottom: 1px solid #f5f6fa;
                    vertical-align: middle;
                }
                .plgv-table tbody td.col-no {
                    text-align: center;
                    font-size: 12px;
                    font-weight: 600;
                    color: #cbd5e1;
                }
                .plgv-table tbody td.col-name {
                    font-weight: 700;
                    color: #1e293b;
                    font-size: 15px;
                }
                .plgv-table tbody td.col-unit {
                    text-align: center;
                    font-size: 12px;
                    font-weight: 600;
                    color: #94a3b8;
                }
                .plgv-table tbody td.col-price {
                    text-align: right;
                    font-weight: 800;
                    font-variant-numeric: tabular-nums;
                    font-size: 15px;
                }
                .plgv-table tbody td.col-price.chilled {
                    color: #3b82f6;
                }
                .plgv-table tbody td.col-price.frozen {
                    color: #334155;
                }
                .plgv-price-dash {
                    color: #e2e8f0;
                    font-weight: 400;
                }
                .plgv-empty-row td {
                    padding: 64px 16px;
                    text-align: center;
                    color: #cbd5e1;
                }
                /* Footer */
                .plgv-footer {
                    padding: 32px 48px 40px;
                    border-top: 1px solid #f1f3f8;
                    margin-top: 16px;
                }
                .plgv-footer-note {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .plgv-footer-note-title {
                    font-size: 10px;
                    font-weight: 800;
                    color: #cbd5e1;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    margin-bottom: 4px;
                }
                .plgv-footer-note-sub {
                    font-size: 10px;
                    font-weight: 700;
                    color: #e2e8f0;
                    letter-spacing: 1px;
                }
                .plgv-supplier-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    background: #fafbfd;
                    border: 1px solid #f1f3f8;
                    border-radius: 14px;
                    padding: 28px 32px;
                }
                .plgv-supplier-item-label {
                    font-size: 9px;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 5px;
                }
                .plgv-supplier-item-value {
                    font-size: 13px;
                    font-weight: 700;
                    color: #334155;
                }
                /* Sticky CTA */
                .plgv-cta-wrap {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 60;
                    pointer-events: none;
                }
                .plgv-cta-inner {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: 0 16px 24px;
                }
                .plgv-cta-btn {
                    width: 100%;
                    pointer-events: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 22px 32px;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    color: #fff;
                    font-size: 18px;
                    font-weight: 800;
                    border: none;
                    border-radius: 18px;
                    cursor: pointer;
                    box-shadow: 0 20px 40px rgba(15,23,42,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset;
                    transition: all 0.2s;
                    letter-spacing: -0.3px;
                }
                .plgv-cta-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 24px 48px rgba(15,23,42,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset;
                }
                .plgv-cta-btn:active {
                    transform: scale(0.98);
                }
                .plgv-cta-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .plgv-cta-btn svg {
                    opacity: 0.7;
                }
                /* Responsive */
                @media (max-width: 768px) {
                    .plgv-document {
                        padding: 12px 8px;
                    }
                    .plgv-header {
                        padding: 32px 24px 28px;
                    }
                    .plgv-header-title {
                        font-size: 24px;
                    }
                    .plgv-stamp {
                        width: 60px;
                        height: 60px;
                    }
                    .plgv-stamp-text {
                        font-size: 8px;
                    }
                    .plgv-stamp-main {
                        font-size: 10px;
                    }
                    .plgv-info-grid {
                        grid-template-columns: 1fr;
                    }
                    .plgv-info-cell:nth-child(odd) {
                        border-right: none;
                    }
                    .plgv-info-cell {
                        padding: 14px 24px;
                    }
                    .plgv-admin-msg {
                        padding: 16px 24px;
                    }
                    .plgv-search-wrap {
                        padding: 16px 20px 0;
                    }
                    .plgv-table-wrap {
                        padding: 12px 12px 0;
                    }
                    .plgv-table tbody td.col-name {
                        font-size: 13px;
                    }
                    .plgv-table tbody td.col-price {
                        font-size: 13px;
                    }
                    .plgv-footer {
                        padding: 24px 24px 32px;
                    }
                    .plgv-supplier-grid {
                        grid-template-columns: 1fr;
                        padding: 20px 20px;
                    }
                    .plgv-cta-btn {
                        padding: 18px 24px;
                        font-size: 16px;
                        border-radius: 14px;
                    }
                }
            `}</style>

            <div className="plgv-root">
                <div className="plgv-document">
                    {/* Top Bar */}
                    <div className="plgv-topbar">
                        <div className="plgv-topbar-left">
                            <span>MEATGO</span>
                            <ChevronRightIcon size={12} />
                            <span style={{ color: '#64748b' }}>견적서</span>
                        </div>
                        <div className="plgv-topbar-right">
                            <ClockIcon size={13} />
                            <span className={countdown === '만료' ? '' : ''} style={countdown === '만료' ? { color: '#ef4444' } : {}}>
                                {countdown === '만료' ? '견적 만료' : `마감 ${countdown || '...'}`}
                            </span>
                        </div>
                    </div>

                    {/* Paper Document */}
                    <div className="plgv-paper">
                        {/* Header */}
                        <div className="plgv-header">
                            <div className="plgv-header-top">
                                <div className="plgv-header-brand">
                                    <div className="plgv-header-brand-line" />
                                    <h1 className="plgv-header-title">견 적 서</h1>
                                    <p className="plgv-header-subtitle">Quotation</p>
                                </div>
                                <div className="plgv-stamp">
                                    <span className="plgv-stamp-text">MEATGO</span>
                                    <span className="plgv-stamp-main">견적</span>
                                    <span className="plgv-stamp-text">QUOTE</span>
                                </div>
                            </div>

                            {/* Recipient Line */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5 }}>
                                    {recipientName}
                                </span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>귀하</span>
                            </div>
                            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 10, lineHeight: 1.8 }}>
                                아래와 같이 견적을 제출하오니 검토하여 주시기 바랍니다.
                            </p>
                        </div>

                        {/* Info Grid */}
                        <div className="plgv-info-grid">
                            <div className="plgv-info-cell">
                                <div className="plgv-info-label">견적 일자</div>
                                <div className="plgv-info-value">{createdDate}</div>
                            </div>
                            <div className="plgv-info-cell">
                                <div className="plgv-info-label">유효 기간</div>
                                <div className={`plgv-info-value ${countdown === '만료' ? 'danger' : 'warning'}`}>
                                    {countdown === '만료' ? '만료됨' : countdown || '계산중...'}
                                </div>
                            </div>
                            <div className="plgv-info-cell">
                                <div className="plgv-info-label">공급자</div>
                                <div className="plgv-info-value">주식회사 믿고 (MEATGO)</div>
                            </div>
                            <div className="plgv-info-cell">
                                <div className="plgv-info-label">품목 수</div>
                                <div className="plgv-info-value primary">{groupedItems.length}건</div>
                            </div>
                        </div>

                        {/* Admin Message */}
                        {currentDoc?.adminComment && (
                            <div className="plgv-admin-msg">
                                <div className="plgv-admin-msg-icon">
                                    <MegaphoneIcon size={14} />
                                </div>
                                <div>
                                    <div className="plgv-admin-msg-label">관리자 메모</div>
                                    <div className="plgv-admin-msg-text">{currentDoc.adminComment}</div>
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="plgv-search-wrap">
                            <div className="plgv-search">
                                <span style={{ color: '#94a3b8', flexShrink: 0 }}><SearchIcon size={18} /></span>
                                <input
                                    type="text"
                                    placeholder="품목 검색..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: '#94a3b8' }}
                                    >
                                        <XIcon size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Price Table */}
                        <div className="plgv-table-wrap">
                            <table className="plgv-table">
                                <thead>
                                    <tr>
                                        <th className="col-no">NO</th>
                                        <th>품목명</th>
                                        <th className="col-unit">단위</th>
                                        <th className="col-price" style={{ color: '#3b82f6' }}>냉장 단가</th>
                                        <th className="col-price">냉동 단가</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedItems.length > 0 ? groupedItems.map((group, idx) => (
                                        <tr key={idx}>
                                            <td className="col-no">{idx + 1}</td>
                                            <td className="col-name">{group.name}</td>
                                            <td className="col-unit">kg</td>
                                            <td className="col-price chilled">
                                                {group.refrigerated ? formatCurrency(group.refrigerated) : <span className="plgv-price-dash">-</span>}
                                            </td>
                                            <td className="col-price frozen">
                                                {group.frozen ? formatCurrency(group.frozen) : <span className="plgv-price-dash">-</span>}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr className="plgv-empty-row">
                                            <td colSpan={5}>
                                                <span style={{ color: '#e2e8f0', marginBottom: 8, display: 'inline-block' }}><SearchIcon size={32} /></span>
                                                <p style={{ fontWeight: 700, color: '#94a3b8', fontSize: 14 }}>"{searchQuery}" 검색 결과 없음</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="plgv-footer">
                            <div className="plgv-footer-note">
                                <div className="plgv-footer-note-title">Official Quotation</div>
                                <div className="plgv-footer-note-sub">MEATGO Co., Ltd. All Rights Reserved.</div>
                            </div>

                            <div className="plgv-supplier-grid">
                                <div>
                                    <div className="plgv-supplier-item-label">사업자 등록번호</div>
                                    <div className="plgv-supplier-item-value">123-45-67890</div>
                                </div>
                                <div>
                                    <div className="plgv-supplier-item-label">상호 / 대표자</div>
                                    <div className="plgv-supplier-item-value">주식회사 믿고 / 홍길동</div>
                                </div>
                                <div>
                                    <div className="plgv-supplier-item-label">주소</div>
                                    <div className="plgv-supplier-item-value">서울특별시 강남구 테헤란로 123</div>
                                </div>
                                <div>
                                    <div className="plgv-supplier-item-label">대표 연락처</div>
                                    <div className="plgv-supplier-item-value">02-1234-5678</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky CTA */}
                {!isExpired && (
                    <div className="plgv-cta-wrap">
                        <div className="plgv-cta-inner">
                            <button
                                className="plgv-cta-btn"
                                onClick={handleStartOrder}
                                disabled={submitting}
                            >
                                <span>{submitting ? '주문서 생성 중...' : '이 견적으로 주문하기'}</span>
                                <SendIcon size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
