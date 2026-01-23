import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPriceListByShareToken, incrementPriceListReach, incrementPriceListConversion, type FirestorePriceList } from '../../lib/priceListService'
import { createOrderSheetWithId, generateOrderSheetId, setOrderSheetItems } from '../../lib/orderService'
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
    const [priceList, setPriceList] = useState<FirestorePriceList | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

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

    const handleStartOrder = async () => {
        if (!priceList) return

        try {
            setSubmitting(true)
            const orderId = await generateOrderSheetId()
            const guestToken = 'gt-' + Math.random().toString(36).substr(2, 9)

            const orderSheet = await createOrderSheetWithId(orderId, {
                customerOrgId: 'GUEST-PL-' + Date.now(),
                customerName: '비회원 고객', // Placeholder - will be updated in next step
                isGuest: true,
                status: 'SENT',
                cutOffAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
                shipTo: '',
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

    const SupplierInfo = () => (
        <div className="max-w-[800px] mx-auto px-10 pb-24">
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <InfoIcon size={14} /> 공급처 정보 (Supplier Information)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">등록번호</p>
                            <p className="text-[15px] font-black text-slate-900 tracking-wider">123-45-67890</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">상호 / 대표자</p>
                            <p className="text-[15px] font-bold text-slate-800">주식회사 믿고 (MEATGO) / 홍길동 <span className="text-slate-300 text-[10px] ml-1 uppercase">(인)</span></p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">주소</p>
                            <p className="text-[14px] font-bold text-slate-800 leading-relaxed">서울특별시 강남구 테헤란로 123, 45층 (믿고타워)</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">연락처</p>
                            <p className="text-[15px] font-black text-slate-900">02-1234-5678</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="price-guest-view min-h-screen bg-[#f8f9fc] text-slate-900 pb-24 font-sans">
            {/* Header Content Wrapper */}
            <div className="max-w-[850px] mx-auto px-6 md:px-10 pt-8 md:pt-12">

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-8 font-medium">
                    <span>MEATGO</span>
                    <ChevronRightIcon size={14} />
                    <span className="text-slate-500">단가표 조회</span>
                </div>

                {/* Main Status Header Card */}
                <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10 mb-6">
                    <div className="flex items-start gap-6 mb-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-800">
                            <ClipboardListIcon size={36} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black mb-2 tracking-tight">상세 단가표</h2>
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-50 text-blue-600 text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">단가표 조회 중</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
                        <div className="flex items-center gap-3 text-slate-500 bg-slate-50/50 p-4 rounded-xl border border-slate-50">
                            <CalendarIcon size={18} className="text-slate-400" />
                            <span className="text-sm font-bold">배송 예정: -</span>
                        </div>
                        <div className={`flex items-center gap-3 p-4 rounded-xl border ${countdown === '만료' ? 'text-red-500 bg-red-50/50 border-red-50' : 'text-slate-500 bg-slate-50/50 border-slate-50'}`}>
                            <ClockIcon size={18} className={countdown === '만료' ? 'text-red-400' : 'text-slate-400'} />
                            <span className="text-sm font-bold">승인 마감: {countdown || '계산중...'}</span>
                        </div>
                    </div>
                </div>

                {/* Admin Message Card */}
                {priceList.adminComment && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4 flex items-start gap-4">
                        <MegaphoneIcon size={20} className="text-slate-400 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1.5 px-2 py-0.5 bg-blue-50 w-fit rounded">관리자 한마디</p>
                            <p className="text-sm font-bold text-slate-600 leading-relaxed">{priceList.adminComment}</p>
                        </div>
                    </div>
                )}

                {/* Recipient Info Card */}
                <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-12 mb-6 text-center">
                    <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        {priceList.title}
                        <span className="text-slate-400 font-medium ml-2 uppercase text-base">귀하</span>
                    </p>
                    <div className="w-12 h-1 bg-blue-500 mx-auto my-6 rounded-full opacity-20"></div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">본 단가표는 귀사를 위해 아래와 같이 정성껏 제안되었습니다. <br />내용을 확인하신 후 하단 버튼을 통해 주문을 진행해 주세요.</p>
                </div>

                {/* Price Table Card */}
                <div className="bg-white rounded-[2.5rem] shadow-[0_15px_50px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden mb-12">
                    <div className="p-8 md:p-10">
                        {/* Search Bar Frame */}
                        <div className="bg-[#f8f9fc] border border-slate-200 rounded-2xl px-6 py-5 flex items-center gap-4 focus-within:ring-8 focus-within:ring-blue-500/5 focus-within:border-blue-300 transition-all mb-10">
                            <SearchIcon size={24} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="어떤 품목을 찾으시나요?"
                                className="bg-transparent outline-none text-lg font-bold text-slate-900 w-full placeholder:text-slate-300"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="overflow-x-auto -mx-2">
                            <table className="w-full text-left min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50/50 rounded-xl overflow-hidden">
                                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">품목명</th>
                                        <th className="px-4 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-24">단위</th>
                                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right w-32 border-l border-white">냉장 단가</th>
                                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right w-32 border-l border-white">냉동 단가</th>
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
                                            <tr key={idx} className="group hover:bg-[#f8f9fc]/80 transition-all cursor-default">
                                                <td className="px-8 py-7">
                                                    <span className="text-[17px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{group.name}</span>
                                                </td>
                                                <td className="px-4 py-7 text-center">
                                                    <span className="text-sm font-bold text-slate-300">kg</span>
                                                </td>
                                                <td className="px-6 py-7 text-right font-black text-blue-600 tabular-nums text-lg">
                                                    {group.refrigerated ? formatCurrency(group.refrigerated) : <span className="text-slate-100">-</span>}
                                                </td>
                                                <td className="px-8 py-7 text-right font-black text-slate-800 tabular-nums text-lg border-l border-slate-50/50">
                                                    {group.frozen ? formatCurrency(group.frozen) : <span className="text-slate-100">-</span>}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-32 text-center">
                                                    <div className="flex flex-col items-center gap-4 text-slate-200">
                                                        <SearchIcon size={48} />
                                                        <p className="text-base font-bold text-slate-400">"{searchQuery}" 에 대한 검색 결과가 없습니다.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-20 text-center border-t border-slate-100 pt-12 pb-8">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-2">
                        Official Price List
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        MEATGO Co., Ltd. All Rights Reserved.
                    </p>
                </div>
            </div>

            {/* Sticky Floating Action Button (FAB) */}
            {!isExpired && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-[800px] px-6 z-[60] pointer-events-none">
                    <button
                        className="w-full h-28 bg-[#FFDB00] border-4 border-slate-900 shadow-[0_30px_60px_-15px_rgba(255,219,0,0.5)] text-slate-900 font-black rounded-[3rem] flex items-center justify-center gap-4 transition-all active:scale-95 pointer-events-auto text-4xl disabled:opacity-50"
                        onClick={handleStartOrder}
                        disabled={submitting}
                    >
                        <span>{submitting ? '생성 중...' : '주문하기'}</span>
                        <SendIcon size={32} className="w-8 h-8" />
                    </button>
                </div>
            )}

            {/* Main View Supplier Info */}
            <SupplierInfo />

        </div>
    )
}
