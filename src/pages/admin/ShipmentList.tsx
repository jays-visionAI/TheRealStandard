import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ShipmentStatus, VehicleType } from '../../types'

const mockVehicleTypes: VehicleType[] = [
    { id: 'vt-1', name: '1.8톤', capacityKg: 1800, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-2', name: '3.5톤', capacityKg: 3500, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-3', name: '5톤', capacityKg: 5000, enabled: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'vt-4', name: '11톤', capacityKg: 11000, enabled: true, createdAt: new Date(), updatedAt: new Date() },
]

interface ShipmentData {
    id: string
    status: ShipmentStatus
    carrierName?: string
    vehicleTypeName?: string
    vehicleNo?: string
    driverName?: string
    driverPhone?: string
    totalsKg: number
}

const mockShipments: ShipmentData[] = [
    { id: 'SH-2024-001', status: 'IN_TRANSIT', carrierName: '한국물류', vehicleTypeName: '3.5톤', vehicleNo: '서울12가3456', driverName: '김기사', driverPhone: '010-1234-5678', totalsKg: 205 },
    { id: 'SH-2024-002', status: 'PREPARING', totalsKg: 150 },
    { id: 'SH-2024-003', status: 'DELIVERED', carrierName: '한우익스프레스', vehicleTypeName: '1.8톤', vehicleNo: '경기34나7890', driverName: '이기사', totalsKg: 85 },
]

export default function ShipmentList() {
    const [shipments, setShipments] = useState(mockShipments)
    const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'ALL'>('ALL')
    const [showModal, setShowModal] = useState(false)
    const [selectedId, setSelectedId] = useState('')
    const [carrierName, setCarrierName] = useState('')
    const [vehicleTypeId, setVehicleTypeId] = useState('')
    const [vehicleNo, setVehicleNo] = useState('')
    const [driverName, setDriverName] = useState('')
    const [driverPhone, setDriverPhone] = useState('')

    const filteredShipments = shipments.filter(s => filterStatus === 'ALL' || s.status === filterStatus)

    const getStatusBadge = (status: ShipmentStatus) => {
        const cfg: Record<ShipmentStatus, { label: string; cls: string }> = {
            PREPARING: { label: '준비중', cls: 'badge-warning' },
            IN_TRANSIT: { label: '배송중', cls: 'badge-primary' },
            DELIVERED: { label: '완료', cls: 'badge-success' },
        }
        return <span className={`badge ${cfg[status].cls}`}>{cfg[status].label}</span>
    }

    const getRecommended = (kg: number) => mockVehicleTypes.find(v => v.capacityKg >= kg && v.enabled)

    const openModal = (s: ShipmentData) => {
        setSelectedId(s.id)
        setCarrierName(s.carrierName || '')
        setVehicleNo(s.vehicleNo || '')
        setDriverName(s.driverName || '')
        setDriverPhone(s.driverPhone || '')
        setVehicleTypeId(getRecommended(s.totalsKg)?.id || '')
        setShowModal(true)
    }

    const saveDispatch = () => {
        setShipments(shipments.map(s => s.id === selectedId ? {
            ...s, carrierName, vehicleTypeName: mockVehicleTypes.find(v => v.id === vehicleTypeId)?.name,
            vehicleNo, driverName, driverPhone, status: 'IN_TRANSIT' as ShipmentStatus
        } : s))
        setShowModal(false)
        alert('배차 정보가 저장되었습니다.')
    }

    const complete = (id: string) => setShipments(shipments.map(s => s.id === id ? { ...s, status: 'DELIVERED' as ShipmentStatus } : s))

    return (
        <div className="page-container">
            <div className="page-header"><div><h1>배송/배차 관리</h1></div></div>
            <div className="glass-card p-4 mb-4">
                <select className="input select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={{ maxWidth: 200 }}>
                    <option value="ALL">전체</option>
                    <option value="PREPARING">준비중</option>
                    <option value="IN_TRANSIT">배송중</option>
                    <option value="DELIVERED">완료</option>
                </select>
            </div>
            <div className="glass-card">
                <table className="table">
                    <thead><tr><th>ID</th><th>중량</th><th>차량</th><th>기사</th><th>상태</th><th>작업</th></tr></thead>
                    <tbody>
                        {filteredShipments.map(s => (
                            <tr key={s.id}>
                                <td><Link to={`/admin/shipments/${s.id}`} className="font-semibold">{s.id}</Link></td>
                                <td>{s.totalsKg}kg</td>
                                <td>{s.vehicleTypeName || <span className="text-muted">추천: {getRecommended(s.totalsKg)?.name}</span>}</td>
                                <td>{s.driverName || '-'}</td>
                                <td>{getStatusBadge(s.status)}</td>
                                <td className="flex gap-2">
                                    {s.status === 'PREPARING' && <button className="btn btn-primary btn-sm" onClick={() => openModal(s)}>배차</button>}
                                    {s.status === 'IN_TRANSIT' && <button className="btn btn-sm" style={{ background: 'var(--color-accent)', color: '#fff' }} onClick={() => complete(s.id)}>완료</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>배차 정보</h3></div>
                        <div className="modal-body">
                            <div className="mb-4"><label className="label">배송업체</label><input className="input" value={carrierName} onChange={e => setCarrierName(e.target.value)} /></div>
                            <div className="mb-4"><label className="label">차량타입</label><select className="input select" value={vehicleTypeId} onChange={e => setVehicleTypeId(e.target.value)}><option value="">선택</option>{mockVehicleTypes.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
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
