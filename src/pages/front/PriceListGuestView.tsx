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
        <div className="price-guest-view min-h-screen bg-secondary pb-20">
            {/* Header / Document Info */}
            <div className="bg-white border-b border-primary/10 shadow-sm mb-8">
                <div className="max-w-4xl mx-auto px-6 py-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="document-branding">
                            <span className="badge badge-primary px-3 py-1 mb-3">OFFICIAL DOCUMENT</span>
                            <h1 className="text-4xl font-black text-primary tracking-tight">{priceList.title}</h1>
                        </div>
                        <div className="document-meta text-right">
                            <div className="text-xs text-muted mb-1 font-bold">ISSUED DATE</div>
                            <div className="text-sm text-primary flex items-center justify-end gap-1 mb-3">
                                <CalendarIcon size={14} /> {priceList.createdAt?.toDate?.()?.toLocaleDateString()}
                            </div>
                            {priceList.validUntil && (
                                <>
                                    <div className="text-xs text-muted mb-1 font-bold">VALID UNTIL</div>
                                    <div className={`text-sm flex items-center justify-end gap-1 font-bold ${isExpired ? 'text-error' : 'text-primary'}`}>
                                        <CalendarIcon size={14} /> {priceList.validUntil.toDate().toLocaleDateString()}
                                        {isExpired && <span className="text-xs font-black ml-1">[EXPIRED]</span>}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <p className="text-secondary max-w-2xl leading-relaxed">
                        본 문서는 TRS 육류유통 통합 관리 시스템에서 발행된 정식 단가표입니다.
                        제시된 단가는 시장 상황에 따라 변동될 수 있으며, 명시된 유효기간 내 계약 시 적용됩니다.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6">
                {isExpired && (
                    <div className="glass-card bg-error-light/5 border-error/20 p-4 mb-6 flex items-center gap-3">
                        <AlertTriangleIcon size={20} className="text-error" />
                        <span className="text-error font-bold">본 단가표는 유효기간이 만료되었습니다. 현재 시점의 정확한 단가는 별도 문의 바랍니다.</span>
                    </div>
                )}

                {/* Search / Filter */}
                <div className="flex justify-between items-center mb-6 gap-4">
                    <div className="flex-1 relative search-bar-container">
                        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="찾고 있는 품목명을 입력하세요..."
                            className="input pl-12 pr-10 py-4 h-14 bg-white shadow-sm border-none focus:ring-2 focus:ring-primary/20"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                            >
                                <XIcon size={18} />
                            </button>
                        )}
                    </div>
                    <div className="text-sm font-bold text-secondary bg-white px-4 py-4 rounded-xl shadow-sm h-14 flex items-center">
                        TOTAL {filteredItems.length} ITEMS
                    </div>
                </div>

                {/* Price Table */}
                <div className="glass-card document-table-card overflow-hidden mb-12 shadow-xl border-none">
                    <div className="bg-primary/5 p-4 border-b border-primary/10 flex justify-between items-center">
                        <h2 className="text-sm font-black text-primary flex items-center gap-2 tracking-widest uppercase">
                            <FileTextIcon size={16} /> Product Price List
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-secondary/50 text-muted text-[11px] font-black uppercase tracking-wider">
                                    <th className="p-5">품목 리스트</th>
                                    <th className="p-5 text-center">예상중량/Box</th>
                                    <th className="p-5 text-center">단위</th>
                                    <th className="p-5 text-right">제안 단가</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary/50">
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <div className="font-bold text-primary group-hover:text-primary-dark transition-colors">{item.name}</div>
                                                <div className="text-[10px] text-muted font-bold mt-1 uppercase">{item.category1}</div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="text-sm font-medium text-secondary">
                                                    {item.boxWeight ? `${item.boxWeight}kg` : '-'}
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="text-xs font-bold text-muted bg-secondary px-2 py-1 rounded uppercase tracking-tighter">{item.unit}</span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="text-lg font-black text-primary">₩{formatCurrency(item.supplyPrice)}</div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-20 text-center text-muted font-medium italic">
                                            검색 결과와 일치하는 품목이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    <div className="p-8 bg-white rounded-3xl shadow-sm">
                        <h4 className="font-black text-sm text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
                            <InfoIcon size={16} /> Terms & Notice
                        </h4>
                        <ul className="space-y-3 text-sm text-secondary leading-relaxed font-medium">
                            <li className="flex gap-2">
                                <span className="text-primary">•</span> 상기 단가는 공급사 사정에 따라 고지 없이 변경될 수 있습니다.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary">•</span> 최종 단가는 주문서 작성 단계에서 확정됩니다.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary">•</span> 배송 비용 및 부가세 포함 여부는 상담을 통해 조율됩니다.
                            </li>
                        </ul>
                    </div>
                    <div className="p-8 bg-primary rounded-3xl shadow-lg shadow-primary/20 flex flex-col justify-between items-start text-white relative overflow-hidden group">
                        <div className="relative z-10 w-full">
                            <h4 className="font-black text-xl mb-2">파트너십 주문 상담</h4>
                            <p className="text-white/80 text-sm mb-6 leading-relaxed">
                                TRS 파트너로 등록하시면 더 낮은 최저가와<br />
                                체계적인 매입 관리를 받으실 수 있습니다.
                            </p>
                            <button
                                className="w-full bg-white text-primary font-black py-4 rounded-2xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 text-lg shadow-xl shadow-black/10"
                                onClick={() => setShowOrderModal(true)}
                            >
                                지금 주문 시작하기 <ChevronRightIcon size={20} />
                            </button>
                        </div>
                        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <ClipboardListIcon size={200} />
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
                .price-guest-view .glass-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-primary);
                    border-radius: 32px;
                }
                .document-table-card {
                    border-radius: 32px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
                }
                .search-bar-container input {
                    border-radius: 20px;
                }
                @media print {
                    .price-guest-view { background: white; padding: 0; }
                    .bg-primary, .btn-primary { -webkit-print-color-adjust: exact; }
                    .header, .footer, .search-bar-container { display: none; }
                }
            `}</style>
        </div>
    )
}
