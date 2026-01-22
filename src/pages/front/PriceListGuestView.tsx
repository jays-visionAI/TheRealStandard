import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPriceListByShareToken, type FirestorePriceList } from '../../lib/priceListService'
import { createOrderSheetWithId, generateOrderSheetId, setOrderSheetItems } from '../../lib/orderService'
import { ClipboardListIcon, BuildingIcon, PackageIcon, ChevronRightIcon, InfoIcon } from '../../components/Icons'
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

    if (loading) return <div className="p-20 text-center text-white">불러오는 중...</div>
    if (error || !priceList) return (
        <div className="p-20 text-center">
            <div className="glass-card p-10 inline-block">
                <InfoIcon size={48} color="#ef4444" className="mx-auto mb-4" />
                <p className="text-white text-xl">{error || '단가표를 찾을 수 없습니다.'}</p>
            </div>
        </div>
    )

    const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(val)

    return (
        <div className="price-guest-view max-w-4xl mx-auto p-4 py-8">
            <header className="text-center mb-10">
                <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-4">
                    <ClipboardListIcon size={40} color="var(--color-primary)" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">{priceList.title}</h1>
                <p className="text-secondary">TRS에서 제안드리는 실시간 단가표입니다.</p>
            </header>

            <div className="glass-card overflow-hidden mb-8">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <PackageIcon size={20} /> 품목 및 제안 단가
                    </h2>
                    <span className="badge badge-primary">{priceList.items.length}개 품목</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-muted text-sm uppercase">
                                <th className="p-4">품목명</th>
                                <th className="p-4">단위</th>
                                <th className="p-4 text-right">제안 단가</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {priceList.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-white/5">
                                    <td className="p-4 text-white font-medium">{item.name}</td>
                                    <td className="p-4 text-secondary">{item.unit}</td>
                                    <td className="p-4 text-right text-primary font-bold">{formatCurrency(item.supplyPrice)}원</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-center">
                <button
                    className="btn btn-primary btn-lg px-12 py-4 text-lg shadow-xl"
                    onClick={() => setShowOrderModal(true)}
                >
                    이 품목들로 주문 시작하기 <ChevronRightIcon size={20} />
                </button>
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
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                }
                .price-guest-view .text-secondary { color: rgba(255, 255, 255, 0.6); }
                .price-guest-view .text-muted { color: rgba(255, 255, 255, 0.4); }
                .price-guest-view .badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .price-guest-view .badge-primary {
                    background: rgba(37, 99, 235, 0.1);
                    color: var(--color-primary);
                    border: 1px solid rgba(37, 99, 235, 0.2);
                }
            `}</style>
        </div>
    )
}
