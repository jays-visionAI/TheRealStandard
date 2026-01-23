import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPriceListByShareToken, incrementPriceListReach, incrementPriceListConversion, type FirestorePriceList } from '../../lib/priceListService'
import { createOrderSheetWithId, generateOrderSheetId, setOrderSheetItems } from '../../lib/orderService'
import { ClipboardListIcon, ChevronRightIcon, InfoIcon, SearchIcon, XIcon, FileTextIcon, AlertTriangleIcon } from '../../components/Icons'
import { Timestamp } from 'firebase/firestore'

export default function PriceListGuestView() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [priceList, setPriceList] = useState<FirestorePriceList | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showOrderModal, setShowOrderModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [orderForm, setOrderForm] = useState({
        companyName: '',
        tel: '',
        address: '',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [countdown, setCountdown] = useState('')

    // Countdown timer for validity period (5 days from sharedAt)
    useEffect(() => {
        if (!priceList) return
        const baseDate = priceList.sharedAt?.toDate?.() || priceList.createdAt?.toDate?.()
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
    }, [priceList])

    useEffect(() => {
        const loadPriceList = async () => {
            if (!token) return
            try {
                const data = await getPriceListByShareToken(token)
                if (data) {
                    setPriceList(data)
                    // Increment reach count
                    await incrementPriceListReach(data.id)
                } else {
                    setError('유효하지 않은 링크이거나 삭제된 단가표입니다.')
                }
            } catch (err: any) {
                console.error(err)
                setError('데이터를 불러오는데 실패했습니다.')
            } finally {
                setLoading(false)
            }
        }
        loadPriceList()
    }, [token])

    const handleStartOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!priceList || !orderForm.companyName || !orderForm.tel) {
            alert('필수 정보를 입력해주세요.')
            return
        }

        try {
            setSubmitting(true)
            const orderId = await generateOrderSheetId()
            const guestToken = 'gt-' + Math.random().toString(36).substr(2, 9)

            const orderSheet = await createOrderSheetWithId(orderId, {
                customerOrgId: 'GUEST-PL-' + Date.now(),
                customerName: orderForm.companyName,
                isGuest: true,
                status: 'SENT',
                cutOffAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
                shipTo: orderForm.address,
                adminComment: `단가표[${priceList.title}]를 통한 비회원 주문 시작`,
                inviteTokenId: guestToken,
                sourcePriceListId: priceList.id
            })

            // Increment conversion count
            await incrementPriceListConversion(priceList.id)

            const items = priceList.items.map(item => ({
                productId: item.productId,
                productName: item.name,
                unit: item.unit || 'kg',
                unitPrice: item.supplyPrice,
                qtyRequested: 0,
                estimatedKg: 0,
                amount: 0
            }))
            await setOrderSheetItems(orderSheet.id, items)
            navigate(`/order/${guestToken}/edit`)
        } catch (err) {
            console.error('Failed to create guest order:', err)
            alert('주문서 생성에 실패했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-20 text-center text-gray-400">데이터를 불러오는 중입니다...</div>
    if (error || !priceList) return (
        <div className="p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
            <InfoIcon size={64} className="text-red-400 mb-6" />
            <p className="text-gray-900 text-2xl font-bold">{error || '단가표를 찾을 수 없습니다.'}</p>
            <p className="text-gray-400 mt-2">유효하지 않은 링크이거나 만료된 문서일 수 있습니다.</p>
        </div>
    )

    const formatCurrency = (val: number) => '₩' + new Intl.NumberFormat('ko-KR').format(val)

    const filteredItems = priceList?.items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    const isExpired = priceList?.validUntil ? priceList.validUntil.toDate() < new Date() : false

    return (
        <div className="price-guest-view min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 font-sans text-slate-800 p-4 md:p-10 lg:p-16">
            {/* Subtle top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 max-w-[900px] mx-auto" />

            {/* Main Document Container with Frame */}
            <div className="max-w-[940px] mx-auto p-1.5 md:p-3 bg-slate-300 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-400/50">
                {/* Document Card - Premium Paper Effect */}
                <div className="bg-white rounded-[1.8rem] md:rounded-[2.8rem] shadow-inner overflow-hidden border border-white">

                    {/* Document Header */}
                    <div className="px-8 pt-12 pb-8 md:px-12 md:pt-16 md:pb-10 border-b-2 border-slate-900">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                            {/* Title Section */}
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-[0.2em] text-slate-900 mb-3">견 적 서</h1>
                                <p className="text-sm text-slate-400 font-medium tracking-wide">QUOTATION</p>
                            </div>

                            {/* Date Info - Right Aligned */}
                            <div className="text-right space-y-2 pt-2">
                                <div className="inline-flex flex-col items-end gap-1.5 text-[13px]">
                                    <p className="text-slate-600">
                                        <span className="text-slate-400 mr-2">적용일자</span>
                                        <span className="font-bold text-slate-900">
                                            {priceList.sharedAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '년 ').replace('.', '월 ').replace('.', '일') ||
                                                priceList.createdAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '년 ').replace('.', '월 ').replace('.', '일')}
                                        </span>
                                    </p>
                                    <p className="text-slate-600 flex items-center justify-end gap-2">
                                        <span className="text-slate-400">유효기간</span>
                                        <span className={`font-black ${countdown === '만료' ? 'text-red-500' : 'text-blue-600'}`}>
                                            {countdown || '계산중...'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recipient Section */}
                    <div className="px-8 py-8 md:px-12 md:py-10 bg-slate-50/50 border-b border-slate-200">
                        <p className="text-2xl md:text-3xl font-bold text-slate-900">
                            {priceList.title}
                            <span className="ml-2 text-slate-500 font-medium"> 귀하</span>
                        </p>
                        <p className="text-sm text-slate-400 mt-2">아래와 같이 견적합니다.</p>
                    </div>

                    {/* Supplier Info Table */}
                    <div className="px-8 py-8 md:px-12 md:py-10">
                        <div className="max-w-[480px]">
                            <table className="w-full border-collapse text-[13px]">
                                <tbody>
                                    <tr>
                                        <th rowSpan={5} className="w-9 bg-slate-800 text-white font-bold [writing-mode:vertical-lr] text-center tracking-[0.3em] text-[11px] border border-slate-800">공급자</th>
                                        <th className="w-20 bg-slate-100 border border-slate-300 px-3 py-2.5 text-slate-600 text-center font-semibold">등록번호</th>
                                        <td colSpan={3} className="border border-slate-300 px-4 py-2.5 font-bold text-slate-900 tracking-wide">123-45-67890</td>
                                    </tr>
                                    <tr>
                                        <th className="bg-slate-100 border border-slate-300 px-3 py-2.5 text-slate-600 text-center font-semibold">상호</th>
                                        <td className="w-32 border border-slate-300 px-4 py-2.5 font-semibold text-slate-800">주식회사 믿고 (MEATGO)</td>
                                        <th className="w-12 bg-slate-100 border border-slate-300 px-2 py-2.5 text-slate-600 text-center font-semibold">성명</th>
                                        <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-800 text-center whitespace-nowrap">홍길동 (인)</td>
                                    </tr>
                                    <tr>
                                        <th className="bg-slate-100 border border-slate-300 px-3 py-2.5 text-slate-600 text-center font-semibold">주소</th>
                                        <td colSpan={3} className="border border-slate-300 px-4 py-2.5 text-[12px] text-slate-700">서울특별시 강남구 테헤란로 123, 45층 (믿고타워)</td>
                                    </tr>
                                    <tr>
                                        <th className="bg-slate-100 border border-slate-300 px-3 py-2.5 text-slate-600 text-center font-semibold">업태</th>
                                        <td className="border border-slate-300 px-4 py-2.5 text-slate-700">도매 및 소매업</td>
                                        <th className="bg-slate-100 border border-slate-300 px-2 py-2.5 text-slate-600 text-center font-semibold">종목</th>
                                        <td className="border border-slate-300 px-4 py-2.5 text-slate-700 text-center">식육유통</td>
                                    </tr>
                                    <tr>
                                        <th className="bg-slate-100 border border-slate-300 px-3 py-2.5 text-slate-600 text-center font-semibold">연락처</th>
                                        <td colSpan={3} className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">02-1234-5678</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Search and Action Bar */}
                    <div className="px-8 py-6 md:px-12 bg-slate-100/50 border-y border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-5 py-4 w-full md:w-96 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
                            <SearchIcon size={20} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="품목명을 검색하세요"
                                className="flex-1 bg-transparent outline-none text-base font-medium text-slate-800 placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {!isExpired && (
                            <button
                                className="hidden md:flex bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-slate-900 px-6 py-3 rounded-lg shadow-lg shadow-blue-500/20 items-center gap-2.5 transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] font-bold"
                                onClick={() => setShowOrderModal(true)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                <span>즉시 주문하기</span>
                            </button>
                        )}
                    </div>

                    {/* Price Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-900 border-b-2 border-slate-950">
                                    <th className="px-8 py-5 text-[12px] font-black tracking-[0.1em] text-slate-400 uppercase">Product Name / 품목명</th>
                                    <th className="px-4 py-5 text-[12px] font-black tracking-[0.1em] text-slate-400 uppercase text-center w-24">Unit / 단위</th>
                                    <th className="px-6 py-5 text-[12px] font-black tracking-[0.1em] text-blue-400 uppercase text-right w-36">Chilled / 냉장</th>
                                    <th className="px-8 py-5 text-[12px] font-black tracking-[0.1em] text-slate-400 uppercase text-right w-36">Frozen / 냉동</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(() => {
                                    const grouped: Record<string, { name: string, refrigerated?: number, frozen?: number }> = {};
                                    filteredItems.forEach(item => {
                                        const baseName = item.name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').replace(/\s*(냉장|냉동|냉장육|냉동육)\s*$/g, '').trim();
                                        if (!grouped[baseName]) grouped[baseName] = { name: baseName };
                                        if (item.category1 === '냉장') grouped[baseName].refrigerated = item.supplyPrice;
                                        else if (item.category1 === '냉동') grouped[baseName].frozen = item.supplyPrice;
                                    });
                                    const sortedGroups = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

                                    return sortedGroups.length > 0 ? sortedGroups.map((group, idx) => (
                                        <tr key={idx} className={`group transition-colors border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                                        {group.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <span className="text-[12px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">/kg</span>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                {group.refrigerated !== undefined ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[17px] font-black text-blue-600 tabular-nums">
                                                            {formatCurrency(group.refrigerated)}
                                                        </span>
                                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tight">Refrigerated</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200">-</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {group.frozen !== undefined ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[17px] font-black text-slate-700 tabular-nums">
                                                            {formatCurrency(group.frozen)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Frozen</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-32 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <SearchIcon size={32} className="text-slate-200" />
                                                    <p className="text-slate-400 font-bold">검색 결과가 없습니다.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {isExpired && (
                        <div className="mx-8 my-8 md:mx-12 p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-4">
                            <AlertTriangleIcon size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-800">견적 유효기간 만료</p>
                                <p className="text-sm text-red-600 mt-1">본 견적서는 유효기간이 만료되었습니다. 최신 견적을 요청해 주세요.</p>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-8 py-10 md:px-12 bg-slate-50 border-t border-slate-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-400">본 견적서는 전자문서로서 법적 효력을 갖습니다.</p>
                                <p className="text-xs text-slate-400">문의사항은 위 연락처로 연락 바랍니다.</p>
                            </div>
                            <p className="text-[11px] text-slate-400 tracking-wider uppercase">MEATGO Co., Ltd.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile-only Sticky Button */}
            {!isExpired && (
                <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-sm">
                    <button
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-slate-900 py-4 px-6 rounded-lg shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] font-bold"
                        onClick={() => setShowOrderModal(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        <span>즉시 주문하기</span>
                    </button>
                </div>
            )}

            {/* Modal - Modern & Simple Admin Style */}
            {showOrderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowOrderModal(false)}>
                    <div className="bg-white w-full max-w-[500px] rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-10 md:p-14">
                            <div className="flex items-center justify-between mb-10">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-slate-900">업체 정보 입력</h3>
                                    <p className="text-sm text-slate-400 font-bold">주문서 작성을 위한 기본 정보를 입력해 주세요.</p>
                                </div>
                                <button onClick={() => setShowOrderModal(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all group">
                                    <XIcon size={24} className="text-slate-400 group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>

                            <form onSubmit={handleStartOrder} className="space-y-8 text-left">
                                <div className="space-y-3">
                                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#2563EB] focus:ring-[10px] focus:ring-blue-500/5 px-6 py-4 rounded-2xl outline-none font-bold text-[15px] text-slate-900 placeholder:text-slate-300 transition-all"
                                        required
                                        placeholder="상호명을 입력하세요"
                                        value={orderForm.companyName}
                                        onChange={e => setOrderForm({ ...orderForm, companyName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#2563EB] focus:ring-[10px] focus:ring-blue-500/5 px-6 py-4 rounded-2xl outline-none font-bold text-[15px] text-slate-900 placeholder:text-slate-300 transition-all"
                                        required
                                        placeholder="010-0000-0000"
                                        value={orderForm.tel}
                                        onChange={e => setOrderForm({ ...orderForm, tel: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">Address (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#2563EB] focus:ring-[10px] focus:ring-blue-500/5 px-6 py-4 rounded-2xl outline-none font-bold text-[15px] text-slate-900 placeholder:text-slate-300 transition-all"
                                        placeholder="정확한 배송지를 입력해주세요"
                                        value={orderForm.address}
                                        onChange={e => setOrderForm({ ...orderForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="pt-8 flex gap-4">
                                    <button type="button" className="flex-[3] py-10 rounded-2xl font-black text-slate-400 border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all" onClick={() => setShowOrderModal(false)}>취소</button>
                                    <button
                                        type="submit"
                                        className="flex-[7] bg-[#2563EB] text-white font-black py-10 rounded-2xl hover:bg-[#1D4ED8] shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50"
                                        disabled={submitting}
                                    >
                                        {submitting ? '생성 중...' : '다음 단계로'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
