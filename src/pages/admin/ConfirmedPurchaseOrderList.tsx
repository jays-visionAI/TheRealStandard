import { useState, useEffect, useMemo } from 'react'
import {
    getDocs,
    collection,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { CheckCircleIcon, SearchIcon, FileTextIcon } from '../../components/Icons'

interface PurchaseOrder {
    id: string
    supplierName: string
    status: string
    totalsKg: number
    totalsAmount: number
    createdAt: Date
    expectedArrivalDate?: Date
    memo?: string
}

export default function ConfirmedPurchaseOrderList() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const loadOrders = async () => {
        try {
            setLoading(true)
            const q = query(
                collection(db, 'purchaseOrders'),
                orderBy('createdAt', 'desc')
            )
            const snapshot = await getDocs(q)
            const data = snapshot.docs.map(doc => {
                const d = doc.data()
                return {
                    id: doc.id,
                    ...d,
                    createdAt: d.createdAt?.toDate?.() || new Date(),
                    expectedArrivalDate: d.expectedArrivalDate?.toDate?.() || undefined
                }
            }) as PurchaseOrder[]

            // For "Confirmed", we might show everything that isn't deleted,
            // or specifically those that are ready/received.
            // For now, mirroring SalesOrderList but for Purchases.
            setOrders(data)
        } catch (err) {
            console.error('Failed to load purchase orders:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [])

    const filteredOrders = useMemo(() => {
        return orders.filter(o =>
            o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [orders, searchTerm])

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)
    }

    const formatDate = (date?: Date) => {
        if (!date) return '-'
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    if (loading) return <div className="loading-state"><div className="spinner"></div><p>데이터 로딩 중...</p></div>

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-left">
                    <h1><CheckCircleIcon size={24} /> 확정주문(매입)</h1>
                    <p className="text-secondary">공급사 발주 후 확정된 매입 내역입니다</p>
                </div>
            </div>

            <div className="filters-bar glass-card mb-6">
                <div className="search-box p-2 flex items-center gap-2">
                    <SearchIcon size={20} className="text-muted" />
                    <input
                        type="text"
                        className="bg-transparent border-none outline-none text-white w-full"
                        placeholder="발주번호 또는 공급사명 검색..."
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
                                <th className="p-4 text-sm font-semibold text-muted uppercase">발주일시</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">PO No</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">공급사</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase text-right">총 중량</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase text-right">총 금액</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((o) => (
                                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm">{formatDate(o.createdAt)}</td>
                                        <td className="p-4 text-sm font-mono text-primary">{o.id}</td>
                                        <td className="p-4 text-sm font-medium">{o.supplierName}</td>
                                        <td className="p-4 text-sm text-right">{o.totalsKg.toFixed(1)} kg</td>
                                        <td className="p-4 text-sm text-right font-medium">{formatCurrency(o.totalsAmount)}</td>
                                        <td className="p-4 text-sm">
                                            <span className={`badge ${o.status === 'DRAFT' ? 'badge-warning' : 'badge-success'}`}>
                                                {o.status === 'DRAFT' ? '임시저장' : '발주확정'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-muted">
                                        조회된 매입 내역이 없습니다.
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
