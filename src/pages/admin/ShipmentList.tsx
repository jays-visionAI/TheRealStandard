import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllShipments, updateShipment, type FirestoreShipment } from '../../lib/orderService'
import { getAllVehicleTypes, type FirestoreVehicleType } from '../../lib/vehicleService'
import type { ShipmentStatus } from '../../types'
import { Timestamp } from 'firebase/firestore'

export default function ShipmentList() {
    const [shipments, setShipments] = useState<FirestoreShipment[]>([])
    const [vehicleTypes, setVehicleTypes] = useState<FirestoreVehicleType[]>([])

    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'ALL'>('ALL')
    const [showModal, setShowModal] = useState(false)
    const [selectedShipment, setSelectedShipment] = useState<FirestoreShipment | null>(null)
    const [carrierName, setCarrierName] = useState('')
    const [vehicleTypeId, setVehicleTypeId] = useState('')
    const [vehicleNo, setVehicleNo] = useState('')
    const [driverName, setDriverName] = useState('')
    const [driverPhone, setDriverPhone] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [shipmentsData, vehicleTypesData] = await Promise.all([
                getAllShipments(),
                getAllVehicleTypes()
            ])
            setShipments(shipmentsData)
            setVehicleTypes(vehicleTypesData)
        } catch (err) {
            console.error('Failed to load shipments:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredShipments = shipments.filter(s => filterStatus === 'ALL' || s.status === filterStatus)

    const getStatusBadge = (status: ShipmentStatus, isModified?: boolean) => {
        const cfg: Record<ShipmentStatus, { label: string; cls: string }> = {
            PREPARING: { label: '준비중', cls: 'badge-warning' },
            IN_TRANSIT: { label: '배송중', cls: 'badge-primary' },
            DELIVERED: { label: '완료', cls: 'badge-success' },
        }
        return (
            <div className="flex gap-1 items-center">
                <span className={`badge ${cfg[status]?.cls || 'badge-secondary'}`}>{cfg[status]?.label || status}</span>
                {isModified && <span className="badge badge-outline text-xs">수정됨</span>}
            </div>
        )
    }

    const formatEta = (eta?: Timestamp) => {
        if (!eta) return '-'
        const date = eta.toDate()
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const openModal = (s: FirestoreShipment) => {
        setSelectedShipment(s)
        setCarrierName(s.company || '')
        setVehicleNo(s.vehicleNumber || '')
        setDriverName(s.driverName || '')
        setDriverPhone(s.driverPhone || '')
        setVehicleTypeId(s.vehicleTypeId || '')
        setShowModal(true)
    }

    const saveDispatch = async () => {
        if (!selectedShipment) return
        try {
            await updateShipment(selectedShipment.id, {
                company: carrierName,
                vehicleTypeId,
                vehicleNumber: vehicleNo,
                driverName,
                driverPhone,
                status: 'IN_TRANSIT',
                isModified: true,
                modifiedAt: Timestamp.now()
            })
            await loadData()
            setShowModal(false)
            alert('배차 정보가 저장되었습니다.')
        } catch (err) {
            console.error('Failed to save dispatch:', err)
            alert('배차 저장에 실패했습니다.')
        }
    }

    const completeDelivery = async (id: string) => {
        try {
            await updateShipment(id, { status: 'DELIVERED' })
            await loadData()
        } catch (err) {
            console.error('Failed to complete delivery:', err)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>배송 목록을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header"><div><h1>배송/배차 관리</h1></div></div>
            <div className="glass-card p-4 mb-4">
                <select className="input select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={{ maxWidth: 200 }}>
                    <option value="ALL">전체 ({shipments.length})</option>
                    <option value="PREPARING">준비중</option>
                    <option value="IN_TRANSIT">배송중</option>
                    <option value="DELIVERED">완료</option>
                </select>
            </div>
            <div className="glass-card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>배송ID</th>
                            <th>물류사</th>
                            <th>차량</th>
                            <th>기사</th>
                            <th>도착예정</th>
                            <th>상태</th>
                            <th>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShipments.length === 0 ? (
                            <tr><td colSpan={7} className="text-center text-muted py-8">배송 데이터가 없습니다.</td></tr>
                        ) : (
                            filteredShipments.map(s => (
                                <tr key={s.id}>
                                    <td><Link to={`/admin/shipments/${s.id}`} className="font-semibold">{s.id.slice(0, 8)}...</Link></td>
                                    <td>{s.company || '-'}</td>
                                    <td>{s.vehicleNumber || '-'}</td>
                                    <td>{s.driverName || '-'}</td>
                                    <td>{formatEta(s.etaAt || s.eta)}</td>
                                    <td>{getStatusBadge(s.status as ShipmentStatus, s.isModified)}</td>
                                    <td className="flex gap-2">
                                        {s.status === 'PREPARING' && <button className="btn btn-primary btn-sm" onClick={() => openModal(s)}>배차</button>}
                                        {s.status === 'IN_TRANSIT' && (
                                            <>
                                                <button className="btn btn-sm btn-ghost" onClick={() => openModal(s)}>수정</button>
                                                <button className="btn btn-sm" style={{ background: 'var(--color-accent)', color: '#fff' }} onClick={() => completeDelivery(s.id)}>완료</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>배차 정보</h3></div>
                        <div className="modal-body">
                            <div className="mb-4"><label className="label">배송업체</label><input className="input" value={carrierName} onChange={e => setCarrierName(e.target.value)} /></div>
                            <div className="mb-4">
                                <label className="label">차량타입</label>
                                <select className="input select" value={vehicleTypeId} onChange={e => setVehicleTypeId(e.target.value)}>
                                    <option value="">선택</option>
                                    {vehicleTypes.filter(v => v.enabled).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div className="mb-4"><label className="label">차량번호</label><input className="input" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} /></div>
                            <div className="mb-4"><label className="label">기사명</label><input className="input" value={driverName} onChange={e => setDriverName(e.target.value)} /></div>
                            <div className="mb-4"><label className="label">연락처</label><input className="input" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>취소</button>
                            <button className="btn btn-primary" onClick={saveDispatch}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
