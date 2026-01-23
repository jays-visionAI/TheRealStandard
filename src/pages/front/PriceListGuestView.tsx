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

    const SupplierInfo = () => (
        <div className="max-w-[800px] mx-auto px-4 pb-24">
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <div className="flex-1 bg-[#f8f9fc] border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 transition-all">
                            <SearchIcon size={20} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="품목명을 검색하세요"
                                className="bg-transparent outline-none text-base font-bold text-slate-900 w-full placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#f8f9fc] border-b border-slate-200/60">
                                    <th className="px-8 py-5 text-sm font-medium text-slate-500">품목명</th>
                                    <th className="px-4 py-5 text-sm font-medium text-slate-500 text-center w-24">단위</th>
                                    <th className="px-6 py-5 text-sm font-medium text-slate-500 text-right w-32">냉장 단가</th>
                                    <th className="px-8 py-5 text-sm font-medium text-slate-500 text-right w-32">냉동 단가</th>
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
                                        <tr key={idx} className="group hover:bg-[#f8f9fc]/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <span className="text-[15px] font-bold text-slate-900">{group.name}</span>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <span className="text-sm font-medium text-slate-500">/kg</span>
                                            </td>
                                            <td className="px-6 py-6 text-right font-black text-blue-600 tabular-nums">
                                                {group.refrigerated ? formatCurrency(group.refrigerated) : <span className="text-slate-200"> - </span>}
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-slate-700 tabular-nums">
                                                {group.frozen ? formatCurrency(group.frozen) : <span className="text-slate-200"> - </span>}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-24 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <SearchIcon size={40} />
                                                    <p className="text-sm font-bold text-slate-400">검색 결과가 없습니다.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
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
                        className="w-full h-28 bg-[#FFDB00] border-4 border-slate-900 shadow-[0_30px_60px_-15px_rgba(255,219,0,0.5)] text-slate-900 font-black rounded-[3rem] flex items-center justify-center gap-4 transition-all active:scale-95 pointer-events-auto text-4xl"
                        onClick={() => setShowOrderModal(true)}
                    >
                        <span>주문하기</span>
                        <SendIcon size={32} className="w-8 h-8" />
                    </button>
                </div>
            )}

            {/* Main View Supplier Info (Only show when modal is closed) */}
            {!showOrderModal && <SupplierInfo />}

            {/* Modal - Full Screen Scrollable Style */}
            {showOrderModal && (
                <div className="fixed inset-0 z-[100] bg-[#f8f9fc] animate-in fade-in duration-300 overflow-y-auto">
                    <div className="min-h-screen py-12 px-6">
                        <div className="max-w-[600px] mx-auto">
                            <div className="bg-white rounded-[50px] shadow-2xl border border-slate-100 overflow-hidden mb-12 animate-in zoom-in duration-300">
                                <div className="p-10 md:p-14">
                                    <div className="mb-12 text-center">
                                        <h3 className="text-4xl font-black text-slate-900">업체 정보 입력</h3>
                                        <p className="text-base text-slate-400 font-bold mt-4 leading-relaxed">주문서 작성을 위해 귀사의 정보를 <br />한 번 더 확인해 주세요.</p>
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

                                        <div className="pt-12 flex flex-col gap-6">
                                            <button
                                                type="submit"
                                                className="w-full h-28 bg-[#6366F1] text-white font-black rounded-[3rem] hover:bg-[#4F46E5] shadow-[0_25px_50px_-12px_rgba(99,102,241,0.5)] transition-all active:scale-95 disabled:opacity-50 text-3xl"
                                                disabled={submitting}
                                            >
                                                {submitting ? '생성 중...' : '다음 단계로'}
                                            </button>
                                            <button type="button" className="w-full h-24 rounded-[2.5rem] font-black text-slate-400 border-2 border-slate-100 hover:bg-slate-50 active:scale-95 transition-all text-center text-2xl" onClick={() => setShowOrderModal(false)}>취소</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Info at the absolute bottom of the scrollable modal */}
                        <div className="mt-20">
                            <SupplierInfo />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
