import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPriceListByShareToken, type FirestorePriceList } from '../../lib/priceListService'
import { createOrderSheetWithId, generateOrderSheetId, setOrderSheetItems } from '../../lib/orderService'
import { ClipboardListIcon, BuildingIcon, PackageIcon, ChevronRightIcon, InfoIcon, SearchIcon, XIcon, CalendarIcon, FileTextIcon, AlertTriangleIcon } from '../../components/Icons'
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
                if (err.code === 'permission-denied') {
                    setError('데이터 읽기 권한이 없습니다 (보안 규칙 확인 필요).')
                } else {
                    setError('데이터를 불러오는데 실패했습니다: ' + (err.message || '알 수 없는 오류'))
                }
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

            // 1. Create OrderSheet for Guest
            const orderSheet = await createOrderSheetWithId(orderId, {
                customerOrgId: 'GUEST-PL-' + Date.now(),
                customerName: orderForm.companyName,
                isGuest: true,
                status: 'SENT',
                cutOffAt: Timestamp.fromDate(new Date(Date.now() + 86400000)), // Default 24h later
                shipTo: orderForm.address,
                adminComment: `단가표[${priceList.title}]를 통한 비회원 주문 시작`,
                inviteTokenId: guestToken
            })

            // 2. Set Items from PriceList
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

            // 3. Redirect to Order View
            navigate(`/order/${guestToken}`)
        } catch (err) {
            console.error('Failed to create guest order:', err)
            alert('주문서 생성에 실패했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-20 text-center text-secondary">불러오는 중...</div>
    if (error || !priceList) return (
        <div className="p-20 text-center">
            <div className="glass-card p-10 inline-block">
                <InfoIcon size={48} color="#ef4444" className="mx-auto mb-4" />
                <p className="text-primary text-xl font-bold">{error || '단가표를 찾을 수 없습니다.'}</p>
            </div>
        </div>
    )

    const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(val)

    const filteredItems = priceList?.items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    const isExpired = priceList?.validUntil ? priceList.validUntil.toDate() < new Date() : false

    return (
        <div className="price-guest-view min-h-screen bg-[#F8F9FA] py-12 px-4 md:py-24 font-sans text-[#1A1C1E]">
            <div className="doc-page-container mx-auto bg-white shadow-[0_30px_100px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden flex flex-col border border-gray-100">
                <header className="doc-header px-10 md:px-20 py-20 relative">
                    {/* Header Branding */}
                    <div className="flex flex-col items-center mb-16 space-y-8">
                        <div className="flex flex-col items-center text-center">
                            <h1 className="text-7xl font-black tracking-[0.4em] text-black border-b-[6px] border-black pb-4 mb-4">견 적 서</h1>
                            <p className="text-sm font-bold tracking-widest text-[#6C757D]">
                                충청남도 아산시 배방읍 구령길52번길 29
                            </p>
                        </div>

                        <div className="absolute top-10 right-10">
                            <div className="w-20 h-20 border-2 border-primary rounded-full flex flex-col items-center justify-center font-black text-[10px] text-primary bg-primary/5 transition-colors hover:bg-primary/10">
                                <span className="text-[8px] opacity-70 mb-0.5">NATIONAL</span>
                                <span>HACCP</span>
                                <span className="text-[8px] opacity-70 mt-0.5 tracking-tighter">식품안전관리인증</span>
                            </div>
                        </div>
                    </div>

                    {/* Document Meta Information Table */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-16 text-left">
                        <div className="w-full md:w-[480px]">
                            <div className="border border-[#1A1C1E]">
                                <table className="w-full text-sm text-left align-middle border-collapse">
                                    <tbody>
                                        <tr className="border-b border-[#1A1C1E]">
                                            <th className="w-28 bg-[#F8F9FA] px-4 py-3 font-black text-center border-r border-[#1A1C1E]">작성일자</th>
                                            <td className="px-5 py-3 font-bold">
                                                {priceList.createdAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-[#1A1C1E]">
                                            <th className="w-28 bg-[#F8F9FA] px-4 py-3 font-black text-center border-r border-[#1A1C1E]">수      신</th>
                                            <td className="px-5 py-3 font-black text-lg">협력사 대표이사 귀하</td>
                                        </tr>
                                        <tr className="border-b border-[#1A1C1E]">
                                            <th className="w-28 bg-[#F8F9FA] px-4 py-3 font-black text-center border-r border-[#1A1C1E]">참      조</th>
                                            <td className="px-5 py-3 font-medium text-gray-600">각 사업소 담당자</td>
                                        </tr>
                                        <tr>
                                            <th className="w-28 bg-[#F8F9FA] px-4 py-3 font-black text-center border-r border-[#1A1C1E]">제      목</th>
                                            <td className="px-5 py-3 font-black text-lg underline decoration-2 underline-offset-4 text-left">{priceList.title}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col items-end text-sm font-bold text-gray-400">
                            <p>공문번호 : TRS-{priceList.id.substring(0, 8).toUpperCase()}</p>
                            <p>발행부서 : 영업본부 전략팀</p>
                        </div>
                    </div>

                    <div className="space-y-3 text-xl font-bold text-black border-l-[6px] border-primary pl-10 py-4 bg-[#F8F9FA] text-left">
                        <p>1. 귀사의 무궁한 발전을 기원합니다.</p>
                        <p>2. 당사의 정기 공급단가를 아래와 같이 확정하여 안내드립니다.</p>
                    </div>

                    {/* Validity Period Highlight */}
                    <div className="mt-12 flex items-center justify-center p-8 border-2 border-dashed border-gray-100 rounded-2xl bg-white">
                        <div className="text-center">
                            <span className="block text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-2">VALIDITY PERIOD</span>
                            <span className="text-4xl font-black bg-gradient-to-r from-yellow-200 to-yellow-100 px-6 py-1 rounded-sm">
                                {priceList.createdAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 부터 ~ 미정
                            </span>
                        </div>
                    </div>
                </header>

                <main className="doc-content-body px-10 md:px-20 pb-40 flex-1">
                    {/* Search Section - Made prominent */}
                    <div className="mb-16">
                        <div className="relative group max-w-2xl mx-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative flex items-center bg-white border-2 border-gray-100 rounded-2xl p-2 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                                <SearchIcon size={24} className="ml-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="공급 품목명으로 빠르게 검색해보세요..."
                                    className="w-full px-6 py-4 outline-none text-lg font-bold placeholder:text-gray-300 bg-transparent border-none"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <XIcon size={20} className="text-gray-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {isExpired && (
                        <div className="bg-red-50 border border-red-100 p-8 rounded-3xl flex items-center gap-6 mb-12 text-left">
                            <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-200">
                                <AlertTriangleIcon size={28} className="text-white" />
                            </div>
                            <div>
                                <h4 className="text-red-900 font-black text-lg mb-1">문서 유효기간 만료</h4>
                                <p className="text-red-700 font-medium">현재 보고 계신 단가표는 기간이 만료되었습니다. 최신 단가는 본사 승인이 필요합니다.</p>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="bg-white rounded-[2px] border-2 border-black overflow-hidden shadow-sm">
                        <div className="bg-black py-4 px-10 flex justify-between items-center text-left">
                            <div className="flex items-center gap-4 text-white hover:text-primary transition-colors cursor-default">
                                <PackageIcon size={18} />
                                <h2 className="font-black tracking-widest text-base uppercase">ITEMIZED PRICE SCHEDULE</h2>
                            </div>
                            <span className="text-[11px] font-black text-gray-400 tracking-tighter">(UNIT: KRW / KG)</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-[#F8F9FA] border-b-2 border-black">
                                        <th className="px-8 py-5 font-black text-[#1A1C1E] border-r border-[#1A1C1E] w-1/4 tracking-widest text-sm uppercase">품 명 (Item Name)</th>
                                        <th className="px-8 py-5 text-center font-black text-[#1A1C1E] border-r border-[#1A1C1E] bg-blue-50/30 text-sm uppercase">냉 장 (Refrigerated)</th>
                                        <th className="px-8 py-5 text-center font-black text-[#1A1C1E] border-r border-[#1A1C1E] bg-cyan-50/30 text-sm uppercase">냉 동 (Frozen)</th>
                                        <th className="px-8 py-5 font-black text-[#1A1C1E] text-sm uppercase">비 고 (Remarks)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {(() => {
                                        const grouped: Record<string, { name: string, refrigerated?: number, frozen?: number, others: string[] }> = {};
                                        filteredItems.forEach(item => {
                                            const baseName = item.name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').replace(/\s*(냉장|냉동|냉장육|냉동육)\s*$/g, '').trim();
                                            if (!grouped[baseName]) grouped[baseName] = { name: baseName, others: [] };
                                            if (item.category1 === '냉장') grouped[baseName].refrigerated = item.supplyPrice;
                                            else if (item.category1 === '냉동') grouped[baseName].frozen = item.supplyPrice;
                                            else grouped[baseName].others.push(`${item.category1}: ${formatCurrency(item.supplyPrice)}`);
                                        });
                                        const sortedGroups = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

                                        return sortedGroups.length > 0 ? (
                                            sortedGroups.map((group, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="px-8 py-6 border-r border-gray-200 font-black text-lg bg-[#FAFBFD]/50 text-left">{group.name}</td>
                                                    <td className="px-8 py-6 border-r border-gray-200 text-center">
                                                        {group.refrigerated ? (
                                                            <span className="text-2xl font-black text-[#1A1C1E]">{formatCurrency(group.refrigerated)}</span>
                                                        ) : (
                                                            <span className="text-gray-200 font-light">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 border-r border-gray-200 text-center">
                                                        {group.frozen ? (
                                                            <span className="text-2xl font-black text-[#1A1C1E]">{formatCurrency(group.frozen)}</span>
                                                        ) : (
                                                            <span className="text-gray-200 font-light">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-sm text-gray-500 font-medium italic text-left">
                                                        {group.others.join(', ')}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-32 text-center text-gray-300 font-medium italic text-xl">
                                                    찾으시는 품목 정보가 존재하지 않습니다.
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Official Stamp Decoration */}
                    <div className="mt-32 border-t-[3px] border-black pt-16 flex flex-col items-center">
                        <p className="text-2xl font-black tracking-[0.8em] text-black mb-8">주식회사 남부미트</p>
                        <div className="flex gap-16 text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                            <span>STRATEGIC SALES GROUP</span>
                            <span>OFFICIAL QUOTATION DOCUMENT</span>
                        </div>
                    </div>
                </main>
            </div>

            {/* Premium Sticky Action Button */}
            {!isExpired && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-6">
                    <button
                        className="group relative w-full overflow-hidden rounded-3xl bg-black px-10 py-6 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)]"
                        onClick={() => setShowOrderModal(true)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center justify-between pointer-events-none">
                            <div className="flex flex-col items-start text-left">
                                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">DIRECT ORDER START</span>
                                <span className="text-white text-2xl font-black tracking-tight flex items-center gap-2">
                                    해당 단가로 즉시 주문하기 <ChevronRightIcon size={24} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </div>
                            <div className="hidden md:flex bg-white/10 p-3 rounded-2xl">
                                <CalendarIcon size={28} className="text-white" />
                            </div>
                        </div>
                    </button>
                    <p className="text-center mt-4 text-[11px] font-bold text-gray-400 tracking-tighter">본 버튼을 클릭하시면 주문서 작성 페이지로 이동합니다.</p>
                </div>
            )}

            {/* Modal - Modernized */}
            {showOrderModal && (
                <div className="modal-backdrop backdrop-blur-xl bg-black/40" onClick={() => setShowOrderModal(false)}>
                    <div className="modal p-0 rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.3)] bg-white overflow-hidden" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="bg-[#1A1C1E] p-10 text-white relative">
                            <div className="absolute top-8 right-8 cursor-pointer hover:rotate-90 transition-transform" onClick={() => setShowOrderModal(false)}>
                                <XIcon size={24} className="text-gray-500" />
                            </div>
                            <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-[10px] font-black tracking-widest rounded-full mb-4 text-left">GUEST ACCESS</span>
                            <h3 className="text-3xl font-black mb-2 flex items-center gap-3 text-left">
                                <BuildingIcon size={32} /> 업체 정보 입력
                            </h3>
                            <p className="text-gray-400 font-medium text-left">단가표를 기반으로 주문서를 생성합니다.</p>
                        </div>

                        <div className="p-12 space-y-8">
                            <form onSubmit={handleStartOrder} className="space-y-6 text-left">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Company Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#F8F9FA] border-2 border-transparent focus:border-primary px-6 py-4 rounded-2xl outline-none font-bold text-lg transition-all"
                                        required
                                        placeholder="사업자 상호를 입력하세요"
                                        value={orderForm.companyName}
                                        onChange={e => setOrderForm({ ...orderForm, companyName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-[#F8F9FA] border-2 border-transparent focus:border-primary px-6 py-4 rounded-2xl outline-none font-bold text-lg transition-all"
                                        required
                                        placeholder="010-0000-0000"
                                        value={orderForm.tel}
                                        onChange={e => setOrderForm({ ...orderForm, tel: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Business Address (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#F8F9FA] border-2 border-transparent focus:border-primary px-6 py-4 rounded-2xl outline-none font-bold text-lg transition-all"
                                        placeholder="정확한 배송지를 입력해주세요"
                                        value={orderForm.address}
                                        onChange={e => setOrderForm({ ...orderForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <button type="button" className="flex-1 px-8 py-5 rounded-3xl font-black border-2 border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setShowOrderModal(false)}>닫기</button>
                                    <button type="submit" className="flex-[2] bg-primary text-white font-black py-5 rounded-3xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer" disabled={submitting}>
                                        {submitting ? '데이터 처리 중...' : '주문서 생성 및 이동'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .doc-page-container {
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                @media (max-width: 1024px) {
                    .doc-page-container {
                        max-width: 96%;
                    }
                }
                
                @media (max-width: 768px) {
                    .doc-header {
                        padding: 40px 20px;
                    }
                    .doc-content-body {
                        padding: 0 20px 100px !important;
                    }
                    .text-7xl { font-size: 3rem; }
                    .px-10, .px-20 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
                }

                @media print {
                    .price-guest-view { background: white; padding: 0 !important; }
                    .doc-page-container { max-width: 100%; margin: 0; box-shadow: none; border: none; }
                    .fixed, .search-bar-container, .modal-backdrop { display: none !important; }
                    .px-10, .px-20 { padding-left: 0 !important; padding-right: 0 !important; }
                    .border-black { border-color: #000 !important; }
                }
            `}</style>
        </div>
    )
}
