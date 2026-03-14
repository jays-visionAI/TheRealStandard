import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSalesOrderById, getSalesOrderItems, type FirestoreSalesOrder, type FirestoreSalesOrderItem } from '../../lib/orderService'
import { getUserById, type FirestoreUser } from '../../lib/userService'
import {
    CheckCircleIcon,
    ArrowLeftIcon,
    BuildingIcon,
    CalendarIcon,
    WalletIcon,
    PackageIcon,
    TruckDeliveryIcon,
    PlusIcon,
    AlertTriangleIcon
} from '../../components/Icons'

// 로컬 타입
type LocalSalesOrder = Omit<FirestoreSalesOrder, 'createdAt' | 'confirmedAt'> & {
    createdAt?: Date
    confirmedAt?: Date
}

export default function SalesOrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()

    // Firebase에서 직접 로드되는 데이터
    const [order, setOrder] = useState<LocalSalesOrder | null>(null)
    const [items, setItems] = useState<FirestoreSalesOrderItem[]>([])
    const [customer, setCustomer] = useState<FirestoreUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Firebase에서 데이터 로드
    const loadData = async () => {
        if (!id) return

        try {
            setLoading(true)
            setError(null)

            const [soData, itemsData] = await Promise.all([
                getSalesOrderById(id),
                getSalesOrderItems(id)
            ])

            if (soData) {
                setOrder({
                    ...soData,
                    createdAt: soData.createdAt?.toDate?.() || new Date(),
                    confirmedAt: soData.confirmedAt?.toDate?.() || new Date(),
                })
            }
            setItems(itemsData)

            // 고객사 정보 로드
            if (soData?.customerOrgId) {
                const customerData = await getUserById(soData.customerOrgId)
                setCustomer(customerData)
            }
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // 초기 로드
    useEffect(() => {
        loadData()
    }, [id])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="page-container">
                <div className="glass-card p-12 text-center">
                    <div className="spinner"></div>
                    <p className="mt-4">데이터를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="page-container">
                <div className="glass-card p-12 text-center">
                    <p className="text-danger mb-4">
                        <span style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <AlertTriangleIcon size={24} color="#ef4444" />
                        </span>
                        {error}
                    </p>
                    <button className="btn btn-primary" onClick={loadData}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="page-container">
                <div className="glass-card p-12 text-center">
                    <h2 className="text-xl font-bold mb-4">주문을 찾을 수 없습니다</h2>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/sales-orders')}>
                        목록으로 돌아가기
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-left">
                    <button className="icon-btn mb-4" onClick={() => navigate('/admin/sales-orders')}>
                        <ArrowLeftIcon size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <h1><CheckCircleIcon size={24} className="text-success" /> 확정주문 상세</h1>
                        <span className="badge badge-success">승인완료</span>
                    </div>
                    <p className="text-secondary mt-1">SalesOrder No: <span className="font-mono text-primary">{order.id}</span></p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary">
                        <PlusIcon size={18} /> 발주(PO) 생성
                    </button>
                    <button className="btn btn-primary">
                        <TruckDeliveryIcon size={18} /> 출고(Shipment) 생성
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <PackageIcon size={18} /> 주문 품목
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5">
                                        <th className="p-3 text-xs font-semibold text-muted uppercase">품명</th>
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">확정중량/BOX</th>
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">단가(원/Kg)</th>
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">주문수량(BOX)</th>
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">확정중량(Kg)</th>
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">금액(원)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-3 text-sm font-medium">{item.productName}</td>
                                            <td className="p-3 text-sm text-right">
                                                {item.boxWeight ? `${item.boxWeight} kg` : item.qtyBox && item.qtyBox > 0 && item.qtyKg > 0 ? `${Math.round(item.qtyKg / item.qtyBox * 10) / 10} kg` : '-'}
                                            </td>
                                            <td className="p-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="p-3 text-sm text-right">
                                                {item.qtyBox ? `${item.qtyBox} BOX` : item.unit === 'kg' ? '-' : '-'}
                                            </td>
                                            <td className="p-3 text-sm text-right">{item.qtyKg.toFixed(1)}</td>
                                            <td className="p-3 text-sm text-right font-semibold">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-white/5 font-bold">
                                        <td className="p-3 text-sm">합계</td>
                                        <td className="p-3 text-sm"></td>
                                        <td className="p-3 text-sm"></td>
                                        <td className="p-3 text-sm text-right text-primary">
                                            {(order as any).totalsBoxes ? `${(order as any).totalsBoxes} BOX` : '-'}
                                        </td>
                                        <td className="p-3 text-sm text-right text-primary">{order.totalsKg.toFixed(1)} kg</td>
                                        <td className="p-3 text-sm text-right text-primary">{formatCurrency(order.totalsAmount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <h3 className="text-lg font-bold mb-4">배뉴 및 정산 정보</h3>

                        <div className="info-row">
                            <div className="flex items-center gap-2 text-muted text-sm border-b border-white/5 pb-2 mb-2">
                                <BuildingIcon size={14} /> 고객사 정보
                            </div>
                            <div className="font-medium text-lg text-white mb-2">{order.customerName}</div>
                            {customer?.business && (
                                <div className="space-y-2 text-sm">
                                    {customer.business.bizRegNo && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">사업자번호</span>
                                            <span className="text-white">{customer.business.bizRegNo}</span>
                                        </div>
                                    )}
                                    {customer.business.ceoName && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">대표자</span>
                                            <span className="text-white">{customer.business.ceoName}</span>
                                        </div>
                                    )}
                                    {customer.business.address && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">주소</span>
                                            <span className="text-white" style={{ textAlign: 'right', maxWidth: '60%' }}>{customer.business.address}</span>
                                        </div>
                                    )}
                                    {customer.business.tel && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">연락처</span>
                                            <span className="text-white">{customer.business.tel}</span>
                                        </div>
                                    )}
                                    {customer.business.shipAddress1 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">배송지</span>
                                            <span className="text-white" style={{ textAlign: 'right', maxWidth: '60%' }}>{customer.business.shipAddress1}</span>
                                        </div>
                                    )}
                                    {customer.business.contactPerson && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">담당자</span>
                                            <span className="text-white">{customer.business.contactPerson}{customer.business.contactPhone ? ` (${customer.business.contactPhone})` : ''}</span>
                                        </div>
                                    )}
                                    {customer.business.paymentTerms && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">결제조건</span>
                                            <span className="text-white">{customer.business.paymentTerms}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="info-row">
                            <div className="flex items-center gap-2 text-muted text-sm border-b border-white/5 pb-2 mb-2">
                                <CalendarIcon size={14} /> 확정 일시
                            </div>
                            <div className="text-white">{order.confirmedAt ? formatDate(order.confirmedAt) : '-'}</div>
                        </div>

                        <div className="info-row">
                            <div className="flex items-center gap-2 text-muted text-sm border-b border-white/5 pb-2 mb-2">
                                <WalletIcon size={14} /> 총 주문 금액
                            </div>
                            <div className="text-2xl font-bold text-primary">{formatCurrency(order.totalsAmount)}</div>
                            <div className="text-xs text-muted mt-1">(VAT 포함/별도 기준에 따라 상이할 수 있음)</div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">진행 이력</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3 relative before:content-[''] before:absolute before:left-2.5 before:top-6 before:bottom-0 before:w-px before:bg-white/10 last:before:hidden">
                                <div className="z-10 bg-success rounded-full p-1 h-fit"><CheckCircleIcon size={12} className="text-white" /></div>
                                <div>
                                    <div className="text-sm font-medium">SalesOrder 생성 (확정)</div>
                                    <div className="text-xs text-muted">{order.confirmedAt ? formatDate(order.confirmedAt) : '-'}</div>
                                </div>
                            </div>
                            <div className="flex gap-3 opacity-50">
                                <div className="bg-white/10 rounded-full p-1 h-fit"><PlusIcon size={12} className="text-white" /></div>
                                <div>
                                    <div className="text-sm font-medium">발주(PO) 생성 대기</div>
                                </div>
                            </div>
                            <div className="flex gap-3 opacity-50">
                                <div className="bg-white/10 rounded-full p-1 h-fit"><TruckDeliveryIcon size={12} className="text-white" /></div>
                                <div>
                                    <div className="text-sm font-medium">출고 완료 대기</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
