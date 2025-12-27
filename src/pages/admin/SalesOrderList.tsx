import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getAllSalesOrders,
    getAllShipments,
    createShipment,
    type FirestoreSalesOrder,
    type FirestoreShipment
} from '../../lib/orderService'
import { getAllVehicleTypes, type FirestoreVehicleType } from '../../lib/vehicleService'

import { SearchIcon, CheckCircleIcon, TruckDeliveryIcon, KakaoIcon } from '../../components/Icons'
import { sendOrderMessage } from '../../lib/kakaoService'
import ShippingCard from '../../components/ShippingCard'
import './SalesOrderList.css'
import { Timestamp } from 'firebase/firestore'

// 타입 정의
type LocalSalesOrder = Omit<FirestoreSalesOrder, 'createdAt' | 'confirmedAt'> & {
    createdAt?: Date
    confirmedAt?: Date
}

type LocalShipment = Omit<FirestoreShipment, 'createdAt' | 'updatedAt' | 'etaAt'> & {
    createdAt?: Date
    updatedAt?: Date
    etaAt?: Date
}

type LocalVehicleType = Omit<FirestoreVehicleType, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
}

export default function SalesOrderList() {
    // Firebase에서 직접 로드되는 데이터
    const [salesOrders, setSalesOrders] = useState<LocalSalesOrder[]>([])
    const [shipments, setShipments] = useState<LocalShipment[]>([])
    const [vehicleTypes, setVehicleTypes] = useState<LocalVehicleType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [searchTerm, setSearchTerm] = useState('')
    const [showDispatchModal, setShowDispatchModal] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<LocalSalesOrder | null>(null)

    const navigate = useNavigate()

    // Firebase에서 데이터 로드
    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [soData, shipData, vtData] = await Promise.all([
                getAllSalesOrders(),
                getAllShipments(),
                getAllVehicleTypes()
            ])

            setSalesOrders(soData.map(so => ({
                ...so,
                createdAt: so.createdAt?.toDate?.() || new Date(),
                confirmedAt: so.confirmedAt?.toDate?.() || new Date(),
            })))

            setShipments(shipData.map(s => ({
                ...s,
                createdAt: s.createdAt?.toDate?.() || new Date(),
                updatedAt: s.updatedAt?.toDate?.() || new Date(),
                etaAt: s.etaAt?.toDate?.() || undefined,
            })))

            setVehicleTypes(vtData.map(v => ({
                ...v,
                createdAt: v.createdAt?.toDate?.() || new Date(),
                updatedAt: v.updatedAt?.toDate?.() || new Date(),
            })))
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
    }, [])

    const getShipmentByOrderId = (orderId: string) => {
        return shipments.find(s => s.sourceSalesOrderId === orderId)
    }

    const filteredOrders = useMemo(() => {
        return salesOrders.filter(so =>
            so.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (so.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    }, [salesOrders, searchTerm])

    // --- Dispatch Logic ---
    const [dispatchForm, setDispatchForm] = useState({
        company: '',
        driverName: '',
        driverPhone: '',
        vehicleNumber: '',
        vehicleType: '',
        eta: ''
    })

    const handleOpenDispatch = (so: LocalSalesOrder) => {
        const existing = getShipmentByOrderId(so.id)
        if (existing) {
            alert('이미 배차 정보가 등록된 주문입니다.')
            return
        }
        setSelectedOrder(so)
        setDispatchForm({
            company: '대한통운',
            driverName: '',
            driverPhone: '',
            vehicleNumber: '',
            vehicleType: vehicleTypes.find(v => v.enabled)?.name || '',
            eta: new Date(Date.now() + 86400000).toISOString().slice(0, 16) // Tomorrow
        })
        setShowDispatchModal(true)
    }

    const handleDispatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedOrder) return

        try {
            await createShipment({
                sourceSalesOrderId: selectedOrder.id,
                vehicleTypeId: vehicleTypes.find(v => v.name === dispatchForm.vehicleType)?.id,
                driverName: dispatchForm.driverName,
                driverPhone: dispatchForm.driverPhone,
                status: 'PREPARING',
                etaAt: Timestamp.fromDate(new Date(dispatchForm.eta)),
            })

            await loadData()
            setShowDispatchModal(false)
            alert('배송 지시가 완료되었습니다.')
        } catch (err) {
            console.error('Dispatch failed:', err)
            alert('배송 지시에 실패했습니다.')
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const formatDate = (date?: Date | string) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    // 로딩 상태
    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>확정주문 목록을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="page-container">
                <div className="error-state">
                    <p>❌ {error}</p>
                    <button className="btn btn-primary" onClick={loadData}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
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
                                filteredOrders.map((so) => {
                                    const shipment = getShipmentByOrderId(so.id)
                                    return (
                                        <tr key={so.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-sm">{formatDate(so.createdAt)}</td>
                                            <td className="p-4 text-sm font-mono text-primary">{so.id}</td>
                                            <td className="p-4 text-sm font-medium">{so.customerName}</td>
                                            <td className="p-4 text-sm text-right">{so.totalsKg.toFixed(1)} kg</td>
                                            <td className="p-4 text-sm text-right font-medium">{formatCurrency(so.totalsAmount)}</td>
                                            <td className="p-4 text-sm">
                                                {shipment ? (
                                                    <span className="badge badge-primary">배차완료</span>
                                                ) : (
                                                    <span className="badge badge-success">승인완료</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        onClick={() => navigate(`/admin/sales-orders/${so.id}`)}
                                                    >
                                                        상세
                                                    </button>
                                                    {!shipment ? (
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => handleOpenDispatch(so)}
                                                        >
                                                            <TruckDeliveryIcon size={14} /> 출고지시
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn btn-sm btn-kakao"
                                                            onClick={() => sendOrderMessage(so.customerName || '고객', so.id, '', shipment.etaAt?.toISOString() || '')}
                                                        >
                                                            <KakaoIcon size={14} /> 주문서 전송
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
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

            {/* Dispatch Modal */}
            {showDispatchModal && selectedOrder && (
                <div className="modal-overlay" onClick={() => setShowDispatchModal(false)}>
                    <div className="modal-content glass-card dispatch-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-form-side">
                            <div className="modal-header">
                                <h2><TruckDeliveryIcon size={24} /> 출고 및 차량 배정</h2>
                                <p className="text-secondary">주문 [{selectedOrder.id}] 에 대한 배송 정보를 입력하세요</p>
                            </div>
                            <form onSubmit={handleDispatchSubmit} className="modal-body">
                                <div className="form-group mb-4">
                                    <label>배송업체</label>
                                    <input type="text" value={dispatchForm.company} onChange={e => setDispatchForm({ ...dispatchForm, company: e.target.value })} required className="input" />
                                </div>
                                <div className="form-row flex gap-4 mb-4">
                                    <div className="form-group flex-1">
                                        <label>기사명</label>
                                        <input type="text" value={dispatchForm.driverName} onChange={e => setDispatchForm({ ...dispatchForm, driverName: e.target.value })} required className="input" />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>연락처</label>
                                        <input type="text" value={dispatchForm.driverPhone} onChange={e => setDispatchForm({ ...dispatchForm, driverPhone: e.target.value })} required className="input" placeholder="010-0000-0000" />
                                    </div>
                                </div>
                                <div className="form-row flex gap-4 mb-4">
                                    <div className="form-group flex-1">
                                        <label>차량번호</label>
                                        <input type="text" value={dispatchForm.vehicleNumber} onChange={e => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })} required className="input" placeholder="12가 3456" />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>차량 타입</label>
                                        <select value={dispatchForm.vehicleType} onChange={e => setDispatchForm({ ...dispatchForm, vehicleType: e.target.value })} className="input">
                                            {vehicleTypes.filter(v => v.enabled).map(v => (
                                                <option key={v.id} value={v.name}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group mb-6">
                                    <label>도착 예정 시간 (ETA)</label>
                                    <input type="datetime-local" value={dispatchForm.eta} onChange={e => setDispatchForm({ ...dispatchForm, eta: e.target.value })} required className="input" />
                                </div>
                                <div className="modal-footer flex gap-2">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowDispatchModal(false)}>취소</button>
                                    <button type="submit" className="btn btn-primary">출고 지시 완료</button>
                                </div>
                            </form>
                        </div>

                        <div className="modal-preview-side">
                            <h3 className="mb-4 text-secondary text-sm font-bold">배송 정보 카드 미리보기</h3>
                            <ShippingCard shipment={{
                                id: 'SH-AUTO-GENERATED',
                                customerName: selectedOrder.customerName || '알 수 없는 고객',
                                ...dispatchForm,
                                status: 'READY',
                            }} />
                            <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <p className="text-xs text-primary leading-relaxed">
                                    * 지시 완료 시 물류팀 대시보드에 즉시 반영되며,<br />
                                    고객사에게 카카오 알림톡(시뮬레이션)과 트래킹 링크가 전송됩니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
