import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllShipments, updateShipment, type FirestoreShipment } from '../../lib/orderService'
import { getAllVehicleTypes, type FirestoreVehicleType } from '../../lib/vehicleService'
import { getAllSuppliers, type FirestoreSupplier } from '../../lib/supplierService'
import { sendDispatchRequestMessage } from '../../lib/kakaoService'
import type { ShipmentStatus } from '../../types'
import { Timestamp } from 'firebase/firestore'

export default function ShipmentList() {
    const [shipments, setShipments] = useState<FirestoreShipment[]>([])
    const [vehicleTypes, setVehicleTypes] = useState<FirestoreVehicleType[]>([])
    const [carriers, setCarriers] = useState<FirestoreSupplier[]>([])

    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'ALL'>('ALL')
    const [showModal, setShowModal] = useState(false)
    const [selectedShipment, setSelectedShipment] = useState<FirestoreShipment | null>(null)
    const [carrierId, setCarrierId] = useState('')
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
            const [shipmentsData, vehicleTypesData, suppliersData] = await Promise.all([
                getAllShipments(),
                getAllVehicleTypes(),
                getAllSuppliers()
            ])
            setShipments(shipmentsData)
            setVehicleTypes(vehicleTypesData)
            setCarriers(suppliersData.filter(s => s.supplyCategory === 'logistics'))
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredShipments = shipments.filter(s => filterStatus === 'ALL' || s.status === filterStatus)

    const getStatusBadge = (status: ShipmentStatus, isModified?: boolean, token?: string) => {
        const cfg: Record<ShipmentStatus, { label: string; cls: string }> = {
            PREPARING: { label: '준비중', cls: 'badge-warning' },
            IN_TRANSIT: { label: '배송중', cls: 'badge-primary' },
            DELIVERED: { label: '완료', cls: 'badge-success' },
        }
        return (
            <div className="flex gap-1 items-center">
                <span className={`badge ${cfg[status]?.cls || 'badge-secondary'}`}>{cfg[status]?.label || status}</span>
                {token && status === 'PREPARING' && <span className="badge badge-info text-xs">배차요청됨</span>}
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
        setCarrierId(s.carrierOrgId || '')
        setVehicleNo(s.vehicleNumber || '')
        setDriverName(s.driverName || '')
        setDriverPhone(s.driverPhone || '')
        setVehicleTypeId(s.vehicleTypeId || '')
        setShowModal(true)
    }

    const requestDispatch = async () => {
        if (!selectedShipment || !carrierId) {
            alert('배송업체를 먼저 선택해주세요.')
            return
        }

        const carrier = carriers.find(c => c.id === carrierId)
        if (!carrier) return

        try {
            const token = 'ds-' + Math.random().toString(36).substr(2, 9)
            await updateShipment(selectedShipment.id, {
                carrierOrgId: carrierId,
                company: carrier.companyName,
                dispatcherToken: token,
                dispatchRequestedAt: Timestamp.now()
            })

            const link = `${window.location.origin}/dispatch/${token}`
            navigator.clipboard.writeText(link)

            alert(`✅ 배차 요청이 완료되었습니다!\n\n${carrier.companyName} 담당자(${carrier.contactPerson})에게 링크를 전달해주세요.\n\n링크: ${link}`)

            await loadData()
            setShowModal(false)
        } catch (err) {
            console.error('Dispatch request failed:', err)
            alert('배차 요청에 실패했습니다.')
        }
    }

    const saveDispatch = async () => {
        if (!selectedShipment) return
        const carrier = carriers.find(c => c.id === carrierId)
        try {
            await updateShipment(selectedShipment.id, {
                carrierOrgId: carrierId,
                company: carrier?.companyName || '',
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
            alert('배차 정보가 직접 저장되었습니다.')
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
                                    <td>{getStatusBadge(s.status as ShipmentStatus, s.isModified, s.dispatcherToken)}</td>
                                    <td className="flex gap-2">
                                        {s.status === 'PREPARING' && <button className="btn btn-primary btn-sm" onClick={() => openModal(s)}>{s.dispatcherToken ? '배차진행' : '배차요청'}</button>}
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
                            <div className="mb-4">
                                <label className="label">배송업체 선택</label>
                                <select className="input select" value={carrierId} onChange={e => setCarrierId(e.target.value)}>
                                    <option value="">배송업체 선택...</option>
                                    {carriers.map(c => <option key={c.id} value={c.id}>{c.companyName} ({c.contactPerson})</option>)}
                                </select>
                            </div>

                            {!selectedShipment?.dispatcherToken ? (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                                    <p className="text-sm text-blue-800">배송업체를 선택하고 <strong>'배차 요청'</strong>을 클릭하면 업체 담당자에게 정보를 입력할 수 있는 링크가 생성됩니다.</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-green-50 border border-green-100 rounded-lg mb-4">
                                    <p className="text-sm text-green-800">담당자에게 이미 배차 요청이 발송되었습니다. (또는 하단에서 직접 정보를 입력할 수 있습니다.)</p>
                                </div>
                            )}

                            <hr className="my-6" />
                            <p className="text-xs font-bold text-gray-400 mb-4 text-center uppercase tracking-widest">직접 배차 정보 입력</p>

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
                            {!selectedShipment?.dispatcherToken && (
                                <button className="btn btn-primary" style={{ background: 'var(--color-info)' }} onClick={requestDispatch}>배차 요청 전송</button>
                            )}
                            <button className="btn btn-primary" onClick={saveDispatch}>직접 배차/저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
