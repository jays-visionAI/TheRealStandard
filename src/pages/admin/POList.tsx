import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
    getDocs,
    collection,
    query,
    orderBy,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PlusIcon, SearchIcon } from '../../components/Icons'
import ListPagination from '../../components/ListPagination'
import { useListFilters } from '../../hooks/useListFilters'

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

export default function POList() {
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

    const searchFiltered = useMemo(() => {
        return orders.filter(o =>
            o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [orders, searchTerm])

    const dateExtractor = useCallback((o: PurchaseOrder) => o.createdAt, [])
    const listFilters = useListFilters(searchFiltered, { dateExtractor, defaultSort: 'date' })

    const sortedOrders = useMemo(() => {
        const items = [...listFilters.filteredItems]
        const { sortField, sortDir } = listFilters
        const dir = sortDir === 'asc' ? 1 : -1
        if (sortField === 'supplier') items.sort((a, b) => dir * a.supplierName.localeCompare(b.supplierName))
        else if (sortField === 'amount') items.sort((a, b) => dir * (a.totalsAmount - b.totalsAmount))
        else items.sort((a, b) => dir * ((a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)))
        return items
    }, [listFilters.filteredItems, listFilters.sortField, listFilters.sortDir])

    const paginatedOrders = useMemo(() => {
        const start = (listFilters.page - 1) * listFilters.pageSize
        return sortedOrders.slice(start, start + listFilters.pageSize)
    }, [sortedOrders, listFilters.page, listFilters.pageSize])

    const totalPages = Math.max(1, Math.ceil(sortedOrders.length / listFilters.pageSize))

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)

    const formatDate = (date?: Date) => {
        if (!date) return '-'
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    const sortIndicator = (field: string) =>
        listFilters.sortField === field ? (listFilters.sortDir === 'asc' ? ' ↑' : ' ↓') : ''

    if (loading) return <div className="loading-state"><div className="spinner"></div><p>데이터 로딩 중...</p></div>

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-left">
                    <h1>매입발주(공급사용) 목록</h1>
                    <p className="text-secondary">공급사에게 직접 주문하는 매입 발주 리스트입니다</p>
                </div>
                <Link to="/admin/purchase-orders/create" className="btn btn-primary">
                    <PlusIcon size={18} /> + 매입 발주서 생성
                </Link>
            </div>

            <div className="filters-bar glass-card mb-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '8px' }}>
                    <div className="search-box p-2 flex items-center gap-2" style={{ flex: '1', minWidth: '200px' }}>
                        <SearchIcon size={20} className="text-muted" />
                        <input
                            type="text"
                            className="bg-transparent border-none outline-none text-white w-full"
                            placeholder="발주번호 또는 공급사명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="date" value={listFilters.startDate} onChange={e => listFilters.setStartDate(e.target.value)}
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px' }} />
                        <span style={{ color: 'var(--text-muted)' }}>~</span>
                        <input type="date" value={listFilters.endDate} onChange={e => listFilters.setEndDate(e.target.value)}
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px' }} />
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 text-sm font-semibold text-muted uppercase" style={{ cursor: 'pointer' }} onClick={() => listFilters.toggleSort('date')}>발주일시{sortIndicator('date')}</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">PO No</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase" style={{ cursor: 'pointer' }} onClick={() => listFilters.toggleSort('supplier')}>공급사{sortIndicator('supplier')}</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase text-right">총 중량</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase text-right" style={{ cursor: 'pointer' }} onClick={() => listFilters.toggleSort('amount')}>총 금액{sortIndicator('amount')}</th>
                                <th className="p-4 text-sm font-semibold text-muted uppercase">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paginatedOrders.length > 0 ? (
                                paginatedOrders.map((o) => (
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
                                        매입 발주 내역이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <ListPagination
                    page={listFilters.page}
                    totalPages={totalPages}
                    pageSize={listFilters.pageSize}
                    totalItems={sortedOrders.length}
                    onPageChange={listFilters.setPage}
                    onPageSizeChange={listFilters.setPageSize}
                />
            </div>
        </div>
    )
}
