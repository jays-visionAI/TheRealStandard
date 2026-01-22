import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPriceListByShareToken, type FirestorePriceList } from '../../lib/priceListService'
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

    useEffect(() => {
        const loadPriceList = async () => {
            if (!token) return
            try {
                const data = await getPriceListByShareToken(token)
                if (data) {
                    setPriceList(data)
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
                inviteTokenId: guestToken
            })

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
            navigate(`/order/${guestToken}`)
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
        <div className="price-guest-view min-h-screen bg-[#F1F5F9] font-sans text-slate-800 p-4 md:p-12 lg:p-20">
            {/* Main Content Card - Matching Admin UI style with clear floating margins */}
            <div className="max-w-[1000px] mx-auto bg-white rounded-[32px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] border border-slate-200/50 overflow-hidden">

                {/* Header Section */}
                <div className="px-8 py-10 md:px-14 md:py-16 bg-white">
                    {/* Top Row: Title Left, Date Info Right */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <span className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm border border-blue-100">
                                <FileTextIcon size={32} />
                            </span>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">견 적 서</h1>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[14px] text-slate-500 font-medium">
                                <span className="text-slate-400">발행일자:</span> {priceList.createdAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-[14px] text-slate-500 font-medium">
                                <span className="text-slate-400">적용일자:</span> {priceList.createdAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-[14px] text-slate-500 font-medium">
                                <span className="text-slate-400">유효기간:</span> 발행일로부터 5일
                            </p>
                        </div>
                    </div>

                    {/* Customer Name with 귀하 */}
                    <div className="mb-10 pl-1 md:pl-[68px]">
                        <p className="text-2xl md:text-3xl font-black text-slate-900">{priceList.title} <span className="font-bold text-slate-500">귀하</span></p>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">

                        {/* Supplier Info Box - Refined Alignment */}
                        <div className="w-full lg:w-auto min-w-[360px]">
                            <table className="w-full border-collapse border border-slate-900 border-x-0 border-b-0 text-[13px] table-fixed">
                                <tbody>
                                    <tr>
                                        <th rowSpan={5} className="w-10 bg-slate-100 border border-slate-200 font-bold text-slate-500 [writing-mode:vertical-lr] py-4 text-center tracking-[0.5em] text-[10px]">공급자</th>
                                        <th className="w-[80px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-500 text-center font-bold">등록번호</th>
                                        <td colSpan={3} className="border border-slate-200 px-4 py-2.5 font-black text-slate-900 tracking-wider text-[14px]">123-45-67890</td>
                                    </tr>
                                    <tr>
                                        <th className="w-[80px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-500 text-center font-bold">상호</th>
                                        <td className="w-[140px] border border-slate-200 px-4 py-2.5 font-bold text-slate-800">TRS 주식회사</td>
                                        <th className="w-14 bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-500 text-center font-bold">성명</th>
                                        <td className="border border-slate-200 px-4 py-2.5 font-bold text-slate-800 text-center whitespace-nowrap">홍길동 (인)</td>
                                    </tr>
                                    <tr>
                                        <th className="w-[80px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-500 text-center font-bold">사업장 주소</th>
                                        <td colSpan={3} className="border border-slate-200 px-4 py-2.5 text-[12px] font-medium leading-[1.4] text-slate-700">서울특별시 강남구 테헤란로 123, 45층 (TRS타워)</td>
                                    </tr>
                                    <tr>
                                        <th className="w-[80px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-500 text-center font-bold">업태</th>
                                        <td className="border border-slate-200 px-4 py-2.5 font-medium text-slate-700">도매 및 소매업</td>
                                        <th className="w-14 bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-500 text-center font-bold">종목</th>
                                        <td className="border border-slate-200 px-4 py-2.5 font-medium text-slate-700 text-center">식육유통외</td>
                                    </tr>
                                    <tr>
                                        <th className="w-[80px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-500 text-center font-bold">연락처</th>
                                        <td colSpan={3} className="border border-slate-200 px-4 py-2.5 font-bold text-slate-900">02-1234-5678</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Desktop "즉시 주문하기" Action Section */}
                <div className="px-10 md:px-14 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <p className="text-sm font-bold text-slate-600">현재 단가로 즉시 발주가 가능합니다.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-0.5 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 transition-all shadow-sm w-full md:w-[400px]">
                            <SearchIcon size={20} className="text-slate-300 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="상세 품목명을 검색하세요"
                                className="w-full py-3.5 bg-transparent outline-none text-[15px] font-semibold text-slate-700 placeholder:text-slate-300"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {!isExpired && (
                            <button
                                className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl shadow-xl shadow-blue-500/30 items-center gap-3 transition-all hover:translate-y-[-2px] active:scale-95 group font-black"
                                onClick={() => setShowOrderModal(true)}
                            >
                                <ClipboardListIcon size={20} />
                                <span className="whitespace-nowrap tracking-tight">즉시 주문하기</span>
                                <ChevronRightIcon size={18} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table matching the provided Admin design exactly */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-[#F8FAFC] border-y border-slate-100">
                                <th className="px-10 py-5 text-[14px] font-bold text-slate-500 uppercase tracking-tight">품목명</th>
                                <th className="px-10 py-5 text-[14px] font-bold text-slate-500 uppercase tracking-tight text-right w-[200px]">냉장 공급가</th>
                                <th className="px-10 py-5 text-[14px] font-bold text-slate-500 uppercase tracking-tight text-right w-[200px]">냉동 공급가</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
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
                                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-10 py-6">
                                            <span className="text-[17px] font-bold text-slate-900 leading-none">{group.name}</span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            {group.refrigerated !== undefined ? (
                                                <span className="text-[18px] font-extrabold text-slate-900 tracking-tight">{formatCurrency(group.refrigerated)}</span>
                                            ) : (
                                                <span className="text-slate-200 font-medium">₩0</span>
                                            )}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            {group.frozen !== undefined ? (
                                                <span className="text-[18px] font-extrabold text-slate-900 tracking-tight">{formatCurrency(group.frozen)}</span>
                                            ) : (
                                                <span className="text-slate-200 font-medium">₩0</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-10 py-32 text-center text-slate-300 font-bold italic text-lg">
                                            검색 조건에 맞는 상품이 없습니다.
                                        </td>
                                    </tr>
                                )
                            })()}
                        </tbody>
                    </table>
                </div>

                {isExpired && (
                    <div className="m-10 p-8 bg-red-50/50 rounded-3xl border border-red-100/50 flex items-center gap-5">
                        <AlertTriangleIcon size={32} className="text-red-400" />
                        <div className="space-y-1">
                            <p className="text-[16px] font-extrabold text-red-900 underline decoration-red-200 decoration-4 underline-offset-4">단가표 유효기간 만료</p>
                            <p className="text-sm text-red-600 font-medium">본 단가표는 현재 유효하지 않습니다. 최신 단가표를 담당자에게 요청해주세요.</p>
                        </div>
                    </div>
                )}

                <div className="py-16 text-center bg-slate-50/30 flex flex-col items-center gap-3">
                    <div className="w-12 h-px bg-slate-200"></div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">The Real Standard Official Price List</p>
                </div>
            </div>

            {/* Mobile-only Sticky Blue Button */}
            {!isExpired && (
                <div className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-sm px-6">
                    <button
                        className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-5 rounded-2xl shadow-[0_15px_40px_-5px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 transition-all active:scale-95"
                        onClick={() => setShowOrderModal(true)}
                    >
                        <ClipboardListIcon size={24} />
                        <span className="text-xl font-black tracking-tight tracking-widest">즉시 주문하기</span>
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
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#2563EB] focus:ring-[10px] focus:ring-blue-500/5 px-6 py-5 rounded-3xl outline-none font-bold text-xl text-slate-900 placeholder:text-slate-200 transition-all"
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
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#2563EB] focus:ring-[10px] focus:ring-blue-500/5 px-6 py-5 rounded-3xl outline-none font-bold text-xl text-slate-900 placeholder:text-slate-200 transition-all"
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
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#2563EB] focus:ring-[10px] focus:ring-blue-500/5 px-6 py-5 rounded-3xl outline-none font-bold text-xl text-slate-900 placeholder:text-slate-200 transition-all"
                                        placeholder="정확한 배송지를 입력해주세요"
                                        value={orderForm.address}
                                        onChange={e => setOrderForm({ ...orderForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="pt-8 flex gap-4">
                                    <button type="button" className="flex-1 py-5 rounded-3xl font-black text-slate-400 border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all" onClick={() => setShowOrderModal(false)}>취소</button>
                                    <button
                                        type="submit"
                                        className="flex-[2] bg-[#2563EB] text-white font-black py-5 rounded-3xl hover:bg-[#1D4ED8] shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50"
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
