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
        <div className="price-guest-view min-h-screen bg-[#F0F2F5] pb-20 font-sans">
            <div className="doc-page-container mx-auto">
                <header className="doc-header bg-white shadow-2xl px-8 md:px-16 py-16 mb-8 rounded-b-[40px] relative">
                    {/* Official Branding Top Bar */}
                    <div className="flex justify-between items-start mb-12 border-b-2 border-black pb-8">
                        <div>
                            <h1 className="text-6xl font-black tracking-[0.3em] text-black">견 적 서</h1>
                            <div className="text-xs text-muted mt-4 font-bold">
                                우편번호 350-904 충남 홍성군 광천읍 상정리 539번지  TEL:041)642-7341~5  FAX:041)642-7346
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {/* Placeholder for logos in image */}
                            <div className="w-16 h-16 border-2 border-black rounded-xl flex items-center justify-center font-black text-[10px] text-center p-1 uppercase">내포원</div>
                            <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center font-black text-[8px] text-center p-1 uppercase">우리도나</div>
                            <div className="w-16 h-16 border-2 border-primary rounded-full flex items-center justify-center font-black text-[10px] text-primary text-center p-1">HACCP</div>
                        </div>
                    </div>

                    {/* Document Info Box (Grid Style) */}
                    <div className="w-full md:w-1/2 border-2 border-black mb-10 overflow-hidden rounded-sm">
                        <div className="grid grid-cols-4 border-b border-black">
                            <div className="col-span-1 bg-secondary/20 p-3 text-sm font-black border-r border-black text-center">작성일자 :</div>
                            <div className="col-span-3 p-3 text-sm font-bold pl-4">
                                {priceList.createdAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 border-b border-black">
                            <div className="col-span-1 bg-secondary/20 p-3 text-sm font-black border-r border-black text-center">수      신 :</div>
                            <div className="col-span-3 p-3 text-sm font-bold pl-4">협력사 대표이사 귀하</div>
                        </div>
                        <div className="grid grid-cols-4 border-b border-black">
                            <div className="col-span-1 bg-secondary/20 p-3 text-sm font-black border-r border-black text-center">참      조 :</div>
                            <div className="col-span-3 p-3 text-sm font-bold pl-4">각 사업소 담당자</div>
                        </div>
                        <div className="grid grid-cols-4">
                            <div className="col-span-1 bg-secondary/20 p-3 text-sm font-black border-r border-black text-center">제      목 :</div>
                            <div className="col-span-3 p-3 text-sm font-bold pl-4">{priceList.title}</div>
                        </div>
                    </div>

                    <div className="mb-10 text-lg leading-relaxed font-bold border-l-4 border-primary pl-6">
                        <p>1. 귀사의 일익 번창하심을 기원합니다.</p>
                        <p>2. 당사의 공급단가를 아래와 같이 안내하오니 업무에 참고하시기 바랍니다.</p>
                    </div>

                    {/* Highlighted Applicability Date */}
                    <div className="flex items-baseline gap-6 mb-8 py-4 border-y border-dashed border-gray-300">
                        <span className="text-xl font-black min-w-[120px]">1. 적용기간 :</span>
                        <div className="relative">
                            <span className="text-3xl font-black bg-yellow-200/60 px-4 py-1 rounded-sm relative z-10">
                                {priceList.createdAt?.toDate?.()?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 부터 ~ 미정
                            </span>
                        </div>
                    </div>
                </header>

                <main className="doc-content-body px-4 md:px-0">
                    {isExpired && (
                        <div className="glass-card bg-error/5 border-2 border-error/20 p-5 mb-8 flex items-center gap-4 rounded-3xl">
                            <div className="bg-error p-2 rounded-xl">
                                <AlertTriangleIcon size={24} className="text-white" />
                            </div>
                            <div>
                                <h4 className="text-error font-black text-sm uppercase mb-0.5">Validity Expired</h4>
                                <p className="text-error/80 text-sm font-bold">본 문서는 만료되었습니다. 최신 단가 확인을 위해 담당자에게 문의해 주세요.</p>
                            </div>
                        </div>
                    )}

                    {/* Search - Keep for utility but style modestly */}
                    <div className="mb-8 relative max-w-md">
                        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="찾으시는 품목명 검색..."
                            className="input pl-12 pr-10 py-3 bg-white/50 border-gray-200 focus:bg-white transition-all rounded-xl text-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Formal Quotation Table */}
                    <div className="bg-white shadow-2xl rounded-sm overflow-hidden mb-12 border-2 border-black">
                        <div className="bg-black text-white px-8 py-4 flex justify-between items-center">
                            <h2 className="text-sm font-black tracking-widest uppercase flex items-center gap-2">
                                <PackageIcon size={16} /> 2. 공급단가 내역
                            </h2>
                            <span className="text-[10px] font-bold">(단위: 원/kg)</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-secondary/10 text-black text-sm font-black text-center border-b-2 border-black">
                                        <th className="px-6 py-4 border-r border-gray-300 w-1/3">품  명</th>
                                        <th className="px-6 py-4 border-r border-gray-300">구  분</th>
                                        <th className="px-6 py-4 border-r border-gray-300 text-right">공급단가</th>
                                        <th className="px-6 py-4">비  고</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-primary/[0.02]">
                                                <td className="px-6 py-4 border-r border-gray-300 font-bold bg-secondary/[0.02]">{item.name}</td>
                                                <td className="px-6 py-4 border-r border-gray-300 text-center font-bold text-muted">{item.category1}</td>
                                                <td className="px-6 py-4 border-r border-gray-300 text-right font-black text-xl">
                                                    {formatCurrency(item.supplyPrice)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted font-medium italic">
                                                    {item.boxWeight ? `${item.boxWeight}kg/Box` : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center text-muted font-bold italic">데이터가 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Official Stamp Footer */}
                    <div className="bg-white p-12 md:p-20 rounded-sm shadow-xl border-x-2 border-b-2 border-black text-center relative mb-16">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] scale-150 pointer-events-none">
                            <ClipboardListIcon size={300} />
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black text-black tracking-widest relative z-10 mb-8">
                            (주) 남부미트 대표이사 이재우
                        </h3>
                        <div className="flex justify-center gap-12 text-sm font-bold text-muted relative z-10 uppercase tracking-widest">
                            <span>Main Office: Chungcheongnam-do</span>
                            <span>Direct: 041)642-7341</span>
                        </div>
                    </div>

                    {/* Sticky Action Button for Guest Order */}
                    {!isExpired && (
                        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
                            <button
                                className="w-full bg-primary text-white font-black py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-xl shadow-[0_20px_50px_rgba(37,99,235,0.4)]"
                                onClick={() => setShowOrderModal(true)}
                            >
                                이 단가로 주문 시작하기 <ChevronRightIcon size={24} />
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {showOrderModal && (
                <div className="modal-backdrop" onClick={() => setShowOrderModal(false)}>
                    <div className="modal p-0" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="p-8">
                            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                <BuildingIcon size={24} color="var(--color-primary)" /> 간단 정보 입력
                            </h3>
                            <p className="text-secondary mb-6">주문서 작성을 위해 업체 정보를 입력해주세요.</p>

                            <form onSubmit={handleStartOrder} className="space-y-4">
                                <div>
                                    <label className="label">업체명 (상호)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        required
                                        placeholder="예: 대한정육점"
                                        value={orderForm.companyName}
                                        onChange={e => setOrderForm({ ...orderForm, companyName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">연락처</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        required
                                        placeholder="010-0000-0000"
                                        value={orderForm.tel}
                                        onChange={e => setOrderForm({ ...orderForm, tel: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">배송 주소 (선택)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="상세 주소를 입력해주세요"
                                        value={orderForm.address}
                                        onChange={e => setOrderForm({ ...orderForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowOrderModal(false)}>취소</button>
                                    <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
                                        {submitting ? '생성 중...' : '주문서 이동'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .doc-page-container {
                    max-width: 1000px;
                    transition: all 0.4s ease;
                }
                
                @media (max-width: 1024px) {
                    .doc-page-container {
                        max-width: 90%;
                    }
                }
                
                @media (max-width: 768px) {
                    .doc-page-container {
                        max-width: 100%;
                    }
                    .doc-header {
                        border-radius: 0;
                        padding-top: 60px;
                        padding-bottom: 40px;
                    }
                }

                .pulse {
                    animation: pulse-animation 2s infinite;
                }

                @keyframes pulse-animation {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }

                @media print {
                    .price-guest-view { background: white; }
                    .doc-page-container { max-width: 100%; margin: 0; }
                    .btn, .search-bar-container { display: none !important; }
                    .doc-header { border-radius: 0; box-shadow: none; border: none; border-bottom: 2px solid #000; }
                }
            `}</style>
        </div>
    )
}
