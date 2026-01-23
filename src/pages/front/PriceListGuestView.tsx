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
    const [showOrderModal, setShowOrderModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [orderForm, setOrderForm] = useState({
        companyName: '',
        tel: '',
        address: '',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [countdown, setCountdown] = useState('')

    // Scroll to top when modal opens
    useEffect(() => {
        if (showOrderModal) {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [showOrderModal])

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
        <div className="price-guest-view min-h-screen bg-[#f8f9fc] text-slate-900 pb-24">
            {/* Header Content Wrapper */}
            <div className="max-w-[800px] mx-auto px-4 pt-8 md:pt-12">

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-8 font-medium">
                    <span>MEATGO</span>
                    <ChevronRightIcon size={14} />
                    <span className="text-slate-500">단가표 조회</span>
                </div>

                {/* Main Status Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-4">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-slate-800">
                            <ClipboardListIcon size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black mb-1">상세 단가표</h2>
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-50 text-blue-600 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">단가표 조회 중</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pl-1">
                        <div className="flex items-center gap-3 text-slate-500">
                            <CalendarIcon size={18} className="text-slate-300" />
                            <span className="text-sm font-bold">배송: -</span>
                        </div>
                        <div className={`flex items-center gap-3 ${countdown === '만료' ? 'text-red-500' : 'text-slate-500'}`}>
                            <ClockIcon size={18} className={countdown === '만료' ? 'text-red-300' : 'text-slate-300'} />
                            <span className="text-sm font-bold">마감: {countdown || '계산중...'}</span>
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-4 text-center">
                    <p className="text-xl md:text-2xl font-black text-slate-900">
                        {priceList.title}
                        <span className="text-slate-400 font-medium ml-2 uppercase text-sm">귀하</span>
                    </p>
                    <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">본 단가표는 아래와 같이 제안되었습니다.</p>
                </div>

                {/* Price Table Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
                    <div className="p-6 border-b border-slate-50 flex items-center gap-4">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 transition-all">
                            <SearchIcon size={18} className="text-slate-300" />
                            <input
                                type="text"
                                placeholder="품목명을 검색하세요"
                                className="bg-transparent outline-none text-sm font-bold text-slate-900 w-full placeholder:text-slate-300"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">품목명</th>
                                    <th className="px-4 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center w-20">단위</th>
                                    <th className="px-4 py-4 text-[11px] font-black text-blue-600 uppercase tracking-wider text-right w-28">냉장</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-600 uppercase tracking-wider text-right w-28">냉동</th>
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
                                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-bold text-slate-900">{group.name}</span>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded uppercase">/kg</span>
                                            </td>
                                            <td className="px-4 py-5 text-right font-black text-blue-600 text-sm tabular-nums">
                                                {group.refrigerated ? formatCurrency(group.refrigerated) : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-slate-700 text-sm tabular-nums">
                                                {group.frozen ? formatCurrency(group.frozen) : <span className="text-slate-200">-</span>}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <SearchIcon size={32} />
                                                    <p className="text-[13px] font-bold">검색 결과가 없습니다.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Supplier Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <InfoIcon size={14} /> 공급처 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">등록번호 (Registration No.)</p>
                                <p className="text-sm font-black text-slate-900 tracking-wider">123-45-67890</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">상호 (Company Name)</p>
                                <p className="text-sm font-bold text-slate-800">주식회사 믿고 (MEATGO)</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">대표자 (CEO)</p>
                                <p className="text-sm font-bold text-slate-800 tracking-wide">홍길동 <span className="text-slate-300 text-[10px] ml-1 uppercase">(인)</span></p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">주소 (Address)</p>
                                <p className="text-sm font-bold text-slate-800 leading-relaxed">서울특별시 강남구 테헤란로 123, 45층 (믿고타워)</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">연락처 (Contact Number)</p>
                                <p className="text-sm font-black text-slate-900">02-1234-5678</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        MEATGO Co., Ltd. All Rights Reserved.
                    </p>
                </div>
            </div>

            {/* Sticky Floating Action Button (FAB) for Mobile/All */}
            {!isExpired && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[800px] px-4 pointer-events-none">
                    <button
                        className="w-full bg-[#6366F1] shadow-[0_20px_40px_-10px_rgba(99,102,241,0.5)] text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 pointer-events-auto"
                        onClick={() => setShowOrderModal(true)}
                    >
                        <span>주문 검펌 및 승인 요청</span>
                        <SendIcon size={20} className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Modal */}
            {showOrderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowOrderModal(false)}>
                    <div className="bg-white w-full max-w-[500px] rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-10 md:p-14">
                            <div className="mb-10 text-center">
                                <h3 className="text-3xl font-black text-slate-900">업체 정보 입력</h3>
                                <p className="text-sm text-slate-400 font-bold mt-2 leading-relaxed">주문서 작성을 위해 귀사의 정보를 <br />한 번 더 확인해 주세요.</p>
                            </div>

                            <form onSubmit={handleStartOrder} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">회사명</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#6366F1] focus:ring-[15px] focus:ring-[#6366F1]/5 px-10 py-12 rounded-[2.5rem] outline-none font-black text-2xl text-slate-900 placeholder:text-slate-300 transition-all text-center"
                                        required
                                        placeholder="상호명을 입력하세요"
                                        value={orderForm.companyName}
                                        onChange={e => setOrderForm({ ...orderForm, companyName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">휴대전화번호</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#6366F1] focus:ring-[15px] focus:ring-[#6366F1]/5 px-10 py-12 rounded-[2.5rem] outline-none font-black text-2xl text-slate-900 placeholder:text-slate-300 transition-all text-center"
                                        required
                                        placeholder="010-0000-0000"
                                        value={orderForm.tel}
                                        onChange={e => setOrderForm({ ...orderForm, tel: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">배송주소 (선택)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#6366F1] focus:ring-[15px] focus:ring-[#6366F1]/5 px-10 py-12 rounded-[2.5rem] outline-none font-black text-2xl text-slate-900 placeholder:text-slate-300 transition-all text-center"
                                        placeholder="배송지 주소를 입력해 주세요"
                                        value={orderForm.address}
                                        onChange={e => setOrderForm({ ...orderForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="pt-8 flex gap-4">
                                    <button type="button" className="flex-[3] py-18 rounded-[2rem] font-black text-slate-400 border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all text-center text-xl" onClick={() => setShowOrderModal(false)}>취소</button>
                                    <button
                                        type="submit"
                                        className="flex-[7] bg-[#6366F1] text-white font-black py-18 rounded-[2.5rem] hover:bg-[#4F46E5] shadow-[0_25px_50px_-12px_rgba(99,102,241,0.5)] transition-all active:scale-95 disabled:opacity-50 text-2xl"
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
