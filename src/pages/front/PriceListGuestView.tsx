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
            {/* Document Header Section - Simulating an official paper header */}
            <div className="doc-page-container mx-auto">
                <header className="doc-header bg-white shadow-sm border-b-4 border-primary px-6 md:px-12 py-12 mb-8 rounded-b-[40px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <FileTextIcon size={200} />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div className="document-branding">
                            <span className="badge badge-primary px-3 py-1 mb-4 font-black tracking-widest text-[10px]">TRS OFFICIAL DOCUMENT</span>
                            <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tighter leading-none mb-4">
                                {priceList.title}
                            </h1>
                            <div className="h-1.5 w-24 bg-primary rounded-full mb-6"></div>
                        </div>

                        <div className="document-meta bg-secondary/30 p-6 rounded-3xl border border-primary/5 min-w-[200px]">
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-x-8 gap-y-4">
                                <div>
                                    <div className="text-[10px] text-muted mb-1 font-black uppercase tracking-widest">Date of Issue</div>
                                    <div className="text-sm font-bold text-primary flex items-center gap-1.5">
                                        <CalendarIcon size={14} /> {priceList.createdAt?.toDate?.()?.toLocaleDateString()}
                                    </div>
                                </div>
                                {priceList.validUntil && (
                                    <div>
                                        <div className="text-[10px] text-muted mb-1 font-black uppercase tracking-widest">Expiration Date</div>
                                        <div className={`text-sm flex items-center gap-1.5 font-bold ${isExpired ? 'text-error' : 'text-primary'}`}>
                                            <CalendarIcon size={14} /> {priceList.validUntil.toDate().toLocaleDateString()}
                                            {isExpired && <span className="text-[10px] bg-error text-white px-1.5 py-0.5 rounded ml-1">EXPIRED</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-secondary max-w-2xl">
                        <p className="text-secondary text-base leading-relaxed font-medium">
                            본 문서는 <strong className="text-primary">TRS 육류유통 통합 관리 시스템</strong>에서 발행된 정식 단가표입니다.
                            시장 변동성에 따라 단가가 조정될 수 있으며, 상기 유효기간 내 확정된 주문에 한해 해당 공급가가 보장됩니다.
                        </p>
                    </div>
                </header>

                <div className="doc-content-body px-4 md:px-0">
                    {/* Expiry Alert */}
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

                    {/* Controls Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                        <div className="w-full sm:flex-1 relative">
                            <SearchIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="품목명을 입력하여 검색..."
                                className="input pl-14 pr-12 py-5 h-16 bg-white shadow-xl shadow-black/[0.03] border-none focus:ring-4 focus:ring-primary/10 rounded-[24px] text-lg font-medium"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-1"
                                >
                                    <XIcon size={20} />
                                </button>
                            )}
                        </div>
                        <div className="w-full sm:w-auto px-6 py-5 bg-white rounded-[24px] shadow-xl shadow-black/[0.03] flex items-center justify-center gap-3 border border-primary/5">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Current Items</span>
                            <span className="text-xl font-black text-primary leading-none">{filteredItems.length}</span>
                        </div>
                    </div>

                    {/* Main Price Table Document Card */}
                    <div className="bg-white shadow-2xl shadow-black/[0.05] rounded-[40px] overflow-hidden mb-12 border border-primary/5">
                        <div className="bg-primary/5 px-8 py-6 border-b border-primary/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary rounded-xl text-white">
                                    <ClipboardListIcon size={18} />
                                </div>
                                <h2 className="text-sm font-black text-primary tracking-[0.2em] uppercase">
                                    Price Quotation Detail
                                </h2>
                            </div>
                            <div className="hidden md:block text-[10px] text-muted font-bold tracking-widest">TRS SYSTEM v1.0</div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[700px]">
                                <thead>
                                    <tr className="bg-secondary/20 text-muted text-[11px] font-black uppercase tracking-widest border-b border-secondary/50">
                                        <th className="px-8 py-5">Product Information</th>
                                        <th className="px-8 py-5 text-center">Spec (Box)</th>
                                        <th className="px-8 py-5 text-center">Unit</th>
                                        <th className="px-8 py-5 text-right">Unit Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary/40 font-medium">
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-primary/[0.01] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="text-lg font-bold text-primary mb-1 group-hover:translate-x-1 transition-transform">{item.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-muted uppercase tracking-wider">{item.category1}</span>
                                                        <div className="w-1 h-1 rounded-full bg-secondary"></div>
                                                        <span className="text-[10px] text-muted font-bold">TRS Grade A</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="inline-flex items-center justify-center px-3 py-1 bg-secondary/30 rounded-lg text-sm font-bold text-secondary">
                                                        {item.boxWeight ? `${item.boxWeight}kg` : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="text-xs font-black text-muted uppercase tracking-tighter">{item.unit}</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="text-2xl font-black text-primary">
                                                        <span className="text-sm font-bold mr-1">₩</span>
                                                        {formatCurrency(item.supplyPrice)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="p-32 text-center text-muted font-bold italic tracking-wide">
                                                검색 결과와 일치하는 품목이 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 bg-secondary/10 border-t border-secondary/40 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-[10px] text-muted font-bold italic">This list is generated automatically by TRS Cloud. Any tampering voids the document.</div>
                            <div className="flex items-center gap-4">
                                <div className="text-[10px] font-black uppercase text-muted tracking-widest">Certified By</div>
                                <div className="bg-white border-2 border-primary/20 p-2 rounded-full w-12 h-12 flex items-center justify-center font-black text-primary text-xs shadow-inner">TRS</div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Info Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
                        <div className="lg:col-span-7 p-10 bg-white rounded-[40px] shadow-xl shadow-black/[0.02] border border-primary/5">
                            <h4 className="font-black text-xs text-primary mb-6 flex items-center gap-3 uppercase tracking-[0.3em]">
                                <div className="w-2 h-2 rounded-full bg-primary pulse"></div>
                                General Terms & Conditions
                            </h4>
                            <div className="space-y-4">
                                {[
                                    '시장 수급 상황이나 환율 변동에 따라 예고 없이 단가가 조정될 수 있습니다.',
                                    '모든 단가는 주문서 제출 시점의 시장가를 기준으로 최종 확정됩니다.',
                                    '특수 배송이나 대량 주문의 경우 별도의 유통 보조금이 적용될 수 있습니다.',
                                    '본 단가표는 배포된 대상 업체에 한하여 효력이 발생하며 제3자 양도가 금지됩니다.'
                                ].map((text, i) => (
                                    <div key={i} className="flex gap-4 items-start text-secondary text-sm leading-relaxed font-semibold">
                                        <div className="mt-1.5 w-1 h-1 rounded-full bg-primary/30 flex-shrink-0"></div>
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-5 p-10 bg-primary rounded-[40px] shadow-2xl shadow-primary/30 text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <span className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-2 block">Quick Action</span>
                                <h4 className="text-3xl font-black mb-4 leading-tight">실시간 주문 및<br />상담 시작하기</h4>
                                <p className="text-white/80 text-base font-medium mb-8 leading-relaxed">
                                    번거로운 가입 절차 없이 업체 정보 입력만으로<br />
                                    즉시 전문 매입 서비스를 이용하실 수 있습니다.
                                </p>
                                <button
                                    className="w-full bg-white text-primary font-black py-5 rounded-[24px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xl shadow-2xl shadow-black/20"
                                    onClick={() => setShowOrderModal(true)}
                                >
                                    주문서 작성하러 가기 <ChevronRightIcon size={24} />
                                </button>
                            </div>
                            <div className="absolute -right-16 -bottom-16 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                                <ClipboardListIcon size={300} />
                            </div>
                        </div>
                    </div>
                </div>
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
