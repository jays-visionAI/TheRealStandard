import { useState, useMemo, useEffect } from 'react'
import { TruckIcon, CheckCircleIcon, PauseCircleIcon, ClipboardListIcon, PhoneIcon, MapPinIcon, UserIcon, FileTextIcon, SearchIcon, TrashIcon, EditIcon, PlusIcon, XIcon } from '../../components/Icons'
import './OrganizationMaster.css'
import {
    getAll3PLUsers,
    createUser,
    updateUser as updateUserFirebase,
    deleteUser as deleteUserFirebase,
    type FirestoreUser,
    type BusinessProfile
} from '../../lib/userService'
import {
    getDriversByCarrier,
    upsertDriver,
    deleteDriver,
    type RegisteredDriver
} from '../../lib/orderService'
import { getAllVehicleTypes, type FirestoreVehicleType } from '../../lib/vehicleService'

type CarrierVM = Omit<FirestoreUser, 'createdAt' | 'updatedAt'> & {
    id: string
    createdAt?: Date
    updatedAt?: Date
    companyName: string
    bizRegNo: string
    ceoName: string
    phone: string
    email: string
    address: string
}

function toVM(user: FirestoreUser): CarrierVM {
    return {
        ...user,
        createdAt: user.createdAt?.toDate?.() || new Date(),
        updatedAt: user.updatedAt?.toDate?.() || new Date(),
        companyName: user.business?.companyName || '',
        bizRegNo: user.business?.bizRegNo || '',
        ceoName: user.business?.ceoName || '',
        phone: user.business?.tel || user.phone || '',
        email: user.email,
        address: user.business?.address || '',
    }
}

export default function CarrierMaster() {
    const [carriers, setCarriers] = useState<CarrierVM[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCarrierId, setActiveCarrierId] = useState<string | null>(null)

    const [drivers, setDrivers] = useState<RegisteredDriver[]>([])
    const [loadingDrivers, setLoadingDrivers] = useState(false)
    const [vehicleTypes, setVehicleTypes] = useState<FirestoreVehicleType[]>([])

    const [showCarrierModal, setShowCarrierModal] = useState(false)
    const [editingCarrier, setEditingCarrier] = useState<CarrierVM | null>(null)
    const [carrierFormData, setCarrierFormData] = useState<any>({ status: 'ACTIVE' })

    const [showDriverModal, setShowDriverModal] = useState(false)
    const [editingDriver, setEditingDriver] = useState<RegisteredDriver | null>(null)
    const [driverFormData, setDriverFormData] = useState<Partial<RegisteredDriver>>({})

    const [isSubmitting, setIsSubmitting] = useState(false)

    const loadData = async () => {
        try {
            setLoading(true)
            const [usersData, vTypes] = await Promise.all([
                getAll3PLUsers(),
                getAllVehicleTypes()
            ])

            const carrierList = usersData.map(toVM)
            setCarriers(carrierList)
            setVehicleTypes(vTypes)

            if (carrierList.length > 0 && !activeCarrierId) {
                setActiveCarrierId(carrierList[0].id)
            }
        } catch (err) {
            console.error('Failed to load carriers:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadDrivers = async (carrierId: string) => {
        try {
            setLoadingDrivers(true)
            const driverList = await getDriversByCarrier(carrierId)
            const sorted = driverList.sort((a, b) => {
                if (a.driverName !== b.driverName) return a.driverName.localeCompare(b.driverName)
                return a.vehicleNumber.localeCompare(b.vehicleNumber)
            })
            setDrivers(sorted)
        } catch (err) {
            console.error('Failed to load drivers:', err)
        } finally {
            setLoadingDrivers(false)
        }
    }

    useEffect(() => { loadData() }, [])
    useEffect(() => { if (activeCarrierId) loadDrivers(activeCarrierId) }, [activeCarrierId])

    const activeCarrier = useMemo(() => carriers.find(c => c.id === activeCarrierId) || null, [carriers, activeCarrierId])

    const openCreateCarrier = () => {
        setEditingCarrier(null)
        setCarrierFormData({
            companyName: '',
            bizRegNo: '',
            ceoName: '',
            phone: '',
            email: '',
            address: '',
            contactPerson: '',
            contactPhone: '',
            status: 'ACTIVE'
        })
        setShowCarrierModal(true)
    }

    const openEditCarrier = (c: CarrierVM) => {
        setEditingCarrier(c)
        setCarrierFormData({
            companyName: c.companyName,
            bizRegNo: c.bizRegNo,
            ceoName: c.ceoName,
            phone: c.phone,
            email: c.email,
            address: c.address,
            status: c.status,
            contactPerson: c.business?.contactPerson || '',
            contactPhone: c.business?.contactPhone || '',
            memo: '',
        })
        setShowCarrierModal(true)
    }

    const handleCarrierSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const business: BusinessProfile = {
                companyName: carrierFormData.companyName,
                bizRegNo: carrierFormData.bizRegNo,
                ceoName: carrierFormData.ceoName,
                address: carrierFormData.address,
                tel: carrierFormData.phone,
                contactPerson: carrierFormData.contactPerson,
                contactPhone: carrierFormData.contactPhone,
            }

            if (editingCarrier) {
                await updateUserFirebase(editingCarrier.id, {
                    name: carrierFormData.contactPerson || carrierFormData.companyName,
                    email: carrierFormData.email,
                    status: carrierFormData.status,
                    business
                })
            } else {
                await createUser({
                    email: carrierFormData.email,
                    name: carrierFormData.contactPerson || carrierFormData.companyName,
                    role: '3PL',
                    status: carrierFormData.status,
                    business
                })
            }
            await loadData()
            setShowCarrierModal(false)
        } catch (err) {
            alert('저장에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDriverSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeCarrierId) return
        setIsSubmitting(true)
        try {
            await upsertDriver(activeCarrierId, {
                driverName: driverFormData.driverName || '',
                driverPhone: driverFormData.driverPhone || '',
                vehicleNumber: driverFormData.vehicleNumber || '',
                vehicleTypeId: driverFormData.vehicleTypeId || '',
            })
            await loadDrivers(activeCarrierId)
            setShowDriverModal(false)
        } catch (err) {
            alert('기사 정보 저장에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteDriver = async (id: string) => {
        if (!confirm('기사 정보를 삭제하시겠습니까?')) return
        try {
            await deleteDriver(id)
            if (activeCarrierId) await loadDrivers(activeCarrierId)
        } catch (err) {
            alert('삭제 실패')
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-400">데이터를 불러오는 중...</div>

    return (
        <div className="organization-master">
            <div className="page-header">
                <div>
                    <h1><TruckIcon size={24} /> 배송업체 관리</h1>
                    <p className="text-secondary">3PL 배송업체 및 소속 기사/차량 정보를 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateCarrier}>
                    <PlusIcon size={18} /> 배송업체 등록
                </button>
            </div>

            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 border-b border-gray-200">
                {carriers.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setActiveCarrierId(c.id)}
                        className={`px-4 py-2 rounded-t-lg font-bold whitespace-nowrap transition-all ${activeCarrierId === c.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {c.companyName}
                    </button>
                ))}
            </div>

            {activeCarrier ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 border-l-4 border-blue-600">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold">{activeCarrier.companyName}</h2>
                                <button className="btn btn-xs btn-ghost" onClick={() => openEditCarrier(activeCarrier)}>수정</button>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600"><ClipboardListIcon size={14} /> <span>{activeCarrier.bizRegNo}</span></div>
                                <div className="flex items-center gap-2 text-gray-600"><UserIcon size={14} /> <span>{activeCarrier.ceoName} (대표)</span></div>
                                <div className="flex items-center gap-2 text-gray-600"><FileTextIcon size={14} /> <span>{activeCarrier.email}</span></div>
                                <div className="flex items-center gap-2 text-gray-600"><PhoneIcon size={14} /> <span>{activeCarrier.phone}</span></div>
                                <div className="flex items-center gap-2 text-gray-600"><MapPinIcon size={14} /> <span className="line-clamp-1">{activeCarrier.address}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="glass-card p-0 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold">기사 및 차량 리스트</h3>
                                <button className="btn btn-sm btn-primary" onClick={() => { setEditingDriver(null); setDriverFormData({}); setShowDriverModal(true); }}>기사 추가</button>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>기사명</th>
                                        <th>연락처</th>
                                        <th>차량번호</th>
                                        <th>차량타입</th>
                                        <th className="text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.map(d => (
                                        <tr key={d.id}>
                                            <td className="font-bold">{d.driverName}</td>
                                            <td className="mono text-xs">{d.driverPhone}</td>
                                            <td className="font-mono text-blue-600 font-bold">{d.vehicleNumber}</td>
                                            <td>{vehicleTypes.find(v => v.id === d.vehicleTypeId)?.name || '-'}</td>
                                            <td className="text-right">
                                                <button className="btn btn-xs btn-ghost" onClick={() => { setEditingDriver(d); setDriverFormData(d); setShowDriverModal(true); }}><EditIcon size={14} /></button>
                                                <button className="btn btn-xs btn-ghost text-red-500" onClick={() => handleDeleteDriver(d.id)}><TrashIcon size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : <div className="text-center py-20 text-gray-400 font-bold">배송업체를 등록하거나 선택하세요.</div>}

            {showCarrierModal && (
                <div className="modal-overlay" onClick={() => setShowCarrierModal(false)}>
                    <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCarrier ? '배송업체 수정' : '배송업체 등록'}</h2>
                            <button className="close-btn" onClick={() => setShowCarrierModal(false)}><XIcon size={18} /></button>
                        </div>
                        <form onSubmit={handleCarrierSubmit} className="modal-body p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group required"><label>회사명</label><input className="input" value={carrierFormData.companyName || ''} onChange={e => setCarrierFormData({ ...carrierFormData, companyName: e.target.value })} required /></div>
                                <div className="form-group required"><label>사업자번호</label><input className="input" value={carrierFormData.bizRegNo || ''} onChange={e => setCarrierFormData({ ...carrierFormData, bizRegNo: e.target.value })} required /></div>
                                <div className="form-group required"><label>대표자명</label><input className="input" value={carrierFormData.ceoName || ''} onChange={e => setCarrierFormData({ ...carrierFormData, ceoName: e.target.value })} required /></div>
                                <div className="form-group required"><label>이메일</label><input className="input" type="email" value={carrierFormData.email || ''} onChange={e => setCarrierFormData({ ...carrierFormData, email: e.target.value })} required /></div>
                            </div>
                            <div className="form-group required"><label>주소</label><input className="input" value={carrierFormData.address || ''} onChange={e => setCarrierFormData({ ...carrierFormData, address: e.target.value })} required /></div>
                            <div className="modal-footer"><button type="submit" className="btn btn-primary">{isSubmitting ? '저장 중...' : '저장하기'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showDriverModal && (
                <div className="modal-overlay" onClick={() => setShowDriverModal(false)}>
                    <div className="modal-content !max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>기사 정보 등록/수정</h2>
                            <button className="close-btn" onClick={() => setShowDriverModal(false)}><XIcon size={18} /></button>
                        </div>
                        <form onSubmit={handleDriverSubmit} className="modal-body p-6 space-y-4">
                            <div className="form-group required"><label>기사명</label><input className="input" value={driverFormData.driverName || ''} onChange={e => setDriverFormData({ ...driverFormData, driverName: e.target.value })} required /></div>
                            <div className="form-group required"><label>연락처</label><input className="input" value={driverFormData.driverPhone || ''} onChange={e => setDriverFormData({ ...driverFormData, driverPhone: e.target.value })} required /></div>
                            <div className="form-group required"><label>차량번호</label><input className="input" value={driverFormData.vehicleNumber || ''} onChange={e => setDriverFormData({ ...driverFormData, vehicleNumber: e.target.value })} required /></div>
                            <div className="form-group">
                                <label>차량타입</label>
                                <select className="input" value={driverFormData.vehicleTypeId || ''} onChange={e => setDriverFormData({ ...driverFormData, vehicleTypeId: e.target.value })}>
                                    <option value="">타입 선택</option>
                                    {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                                </select>
                            </div>
                            <div className="modal-footer"><button type="submit" className="btn btn-primary">저장하기</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
