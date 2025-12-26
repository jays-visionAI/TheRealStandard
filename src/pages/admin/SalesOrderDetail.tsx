import { useParams, useNavigate } from 'react-router-dom'
import { useOrderStore } from '../../stores/orderStore'
import {
    CheckCircleIcon,
    ArrowLeftIcon,
    BuildingIcon,
    CalendarIcon,
    WalletIcon,
    PackageIcon,
    TruckDeliveryIcon,
    PlusIcon
} from '../../components/Icons'

export default function SalesOrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getSalesOrderById, getSalesOrderItems } = useOrderStore()

    const order = getSalesOrderById(id || '')
    const items = getSalesOrderItems(id || '')

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
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">중량</th>
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">단가</th>
                                        <th className="p-3 text-xs font-semibold text-muted uppercase text-right">금액</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-3 text-sm font-medium">{item.productName}</td>
                                            <td className="p-3 text-sm text-right">{item.qtyKg.toFixed(1)} kg</td>
                                            <td className="p-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="p-3 text-sm text-right font-semibold">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-white/5 font-bold">
                                        <td className="p-3 text-sm">합계</td>
                                        <td className="p-3 text-sm text-right text-primary">{order.totalsKg.toFixed(1)} kg</td>
                                        <td className="p-3 text-sm"></td>
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
                            <div className="font-medium text-lg text-white">{order.customerName}</div>
                        </div>

                        <div className="info-row">
                            <div className="flex items-center gap-2 text-muted text-sm border-b border-white/5 pb-2 mb-2">
                                <CalendarIcon size={14} /> 확정 일시
                            </div>
                            <div className="text-white">{formatDate(order.confirmedAt)}</div>
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
                                    <div className="text-xs text-muted">{formatDate(order.confirmedAt)}</div>
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
