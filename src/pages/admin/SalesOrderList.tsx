// Placeholder components for admin pages
// These will be fully implemented as development progresses

import { useMemo, useState } from 'react'
import { useOrderStore } from '../../stores/orderStore'
import { SearchIcon, CheckCircleIcon, TruckDeliveryIcon } from '../../components/Icons'

export default function SalesOrderList() {
    const { salesOrders } = useOrderStore()
    const [searchTerm, setSearchTerm] = useState('')

    const filteredOrders = useMemo(() => {
        return salesOrders.filter(so =>
            so.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (so.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }, [salesOrders, searchTerm])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-left">
                    <h1><CheckCircleIcon size={24} /> 확정주문 목록</h1>
                    <p className="text-secondary">최종 승인된 SalesOrder 리스트입니다</p>
                </div>
            </div>

            <div className="filters-bar glass-card mb-6">
                <div className="search-box p-2 flex items-center gap-2">
                    <SearchIcon size={20} className="text-muted" />
                    <input
                        type="text"
                        className="bg-transparent border-none outline-none text-white w-full"
                        placeholder="주문번호 또는 고객사명 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 text-sm font-semibold text-muted uppercase">주문일시</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">SalesOrder No</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">고객사</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase text-right">총 중량</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase text-right">총 금액</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">상태</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((so) => (
                                    <tr key={so.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm">{formatDate(so.createdAt)}</td>
                                        <td className="p-4 text-sm font-mono text-primary">{so.id}</td>
                                        <td className="p-4 text-sm font-medium">{so.customerName}</td>
                                        <td className="p-4 text-sm text-right">{so.totalsKg.toFixed(1)} kg</td>
                                        <td className="p-4 text-sm text-right font-medium">{formatCurrency(so.totalsAmount)}</td>
                                        <td className="p-4 text-sm">
                                            <span className="badge badge-success">승인완료</span>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex gap-2">
                                                <button className="btn btn-sm btn-ghost">상세</button>
                                                <button className="btn btn-sm btn-secondary">
                                                    <TruckDeliveryIcon size={14} /> 출고지시
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-muted">
                                        확정된 주문이 없습니다. 주문서 검토 후 '확정하기'를 눌러주세요.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
