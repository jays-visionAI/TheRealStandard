import { useState, useMemo, useEffect } from 'react'
import { TruckIcon, CheckCircleIcon, PauseCircleIcon, ClipboardListIcon, PhoneIcon, MapPinIcon, UserIcon, FileTextIcon, SearchIcon, TrashIcon, EditIcon, PlusIcon } from '../../components/Icons'
import './OrganizationMaster.css'
import {
    getAllSuppliers,
    createSupplier,
    updateSupplier as updateSupplierFirebase,
    deleteSupplier as deleteSupplierFirebase,
    type FirestoreSupplier
} from '../../lib/supplierService'
import {
    getDriversByCarrier,
    upsertDriver,
    deleteDriver,
    type RegisteredDriver
} from '../../lib/orderService'
import { getAllVehicleTypes, type FirestoreVehicleType } from '../../lib/vehicleService'
import { Timestamp } from 'firebase/firestore'

type Carrier = Omit<FirestoreSupplier, 'createdAt' | 'updatedAt'> & {
    id: string
    createdAt?: Date
    updatedAt?: Date
}

export default function CarrierMaster() {
    const [carriers, setCarriers] = useState<Carrier[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCarrierId, setActiveCarrierId] = useState<string | null>(null)

    // Drivers state
    const [drivers, setDrivers] = useState<RegisteredDriver[]>([])
    const [loadingDrivers, setLoadingDrivers] = useState(false)
    const [vehicleTypes, setVehicleTypes] = useState<FirestoreVehicleType[]>([])

    // Modals
    const [showCarrierModal, setShowCarrierModal] = useState(false)
    const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null)
    const [carrierFormData, setCarrierFormData] = useState<Partial<Carrier>>({})

    const [showDriverModal, setShowDriverModal] = useState(false)
    const [editingDriver, setEditingDriver] = useState<RegisteredDriver | null>(null)
    const [driverFormData, setDriverFormData] = useState<Partial<RegisteredDriver>>({})

    const [isSubmitting, setIsSubmitting] = useState(false)

    const loadData = async () => {
        try {
            setLoading(true)
            const [supplierData, vTypes] = await Promise.all([
                getAllSuppliers(),
                getAllVehicleTypes()
            ])

            const carrierList = supplierData
                .filter(s => s.supplyCategory === 'logistics')
                .map(s => ({
                    ...s,
                    id: s.id,
                    createdAt: s.createdAt?.toDate?.() || new Date(),
                    updatedAt: s.updatedAt?.toDate?.() || new Date(),
                }))

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
            // Sort by driver name then vehicle number
            const sorted = driverList.sort((a, b) => {
                if (a.driverName !== b.driverName) {
                    return a.driverName.localeCompare(b.driverName)
                }
                return a.vehicleNumber.localeCompare(b.vehicleNumber)
            })
            setDrivers(sorted)
        } catch (err) {
            console.error('Failed to load drivers:', err)
        } finally {
            setLoadingDrivers(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (activeCarrierId) {
            loadDrivers(activeCarrierId)
        }
    }, [activeCarrierId])

    const activeCarrier = useMemo(() =>
        carriers.find(c => c.id === activeCarrierId) || null
        , [carriers, activeCarrierId])

    // Carrier CRUD
    const openCreateCarrier = () => {
        setEditingCarrier(null)
        setCarrierFormData({
            companyName: '',
            bizRegNo: '',
            ceoName: '',
            phone: '',
            email: '',
            address: '',
            supplyCategory: 'logistics',
            isActive: true,
            isJoined: false,
        })
        setShowCarrierModal(true)
    }

    const openEditCarrier = (c: Carrier) => {
        setEditingCarrier(c)
        setCarrierFormData({ ...c })
        setShowCarrierModal(true)
    }

    const handleCarrierSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            if (editingCarrier) {
                const { id, createdAt, updatedAt, ...updateData } = carrierFormData as any
                await updateSupplierFirebase(editingCarrier.id, { ...updateData, supplyCategory: 'logistics' })
            } else {
                await createSupplier({ ...carrierFormData as any, supplyCategory: 'logistics', isJoined: false })
            }
            await loadData()
            setShowCarrierModal(false)
        } catch (err) {
            alert('저장에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Driver CRUD
    const openCreateDriver = () => {
        setEditingDriver(null)
        setDriverFormData({
            driverName: '',
            driverPhone: '',
            vehicleNumber: '',
            vehicleTypeId: '',
        })
        setShowDriverModal(true)
    }

    const openEditDriver = (d: RegisteredDriver) => {
        setEditingDriver(d)
        setDriverFormData({ ...d })
        setShowDriverModal(true)
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

    if (loading) return <div className="p-8 text-center">로딩 중...</div>

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

            {/* Carrier Tabs */}
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
                    {/* Carrier Simple Info */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 border-l-4 border-blue-600">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-bold">{activeCarrier.companyName}</h2>
                                    <span className={`status-badge ${activeCarrier.isJoined ? 'active' : 'inactive'}`} style={{ width: 'fit-content', opacity: 0.8, fontSize: '10px' }}>
                                        {activeCarrier.isJoined ? '회원가입' : '회원미가입'}
                                    </span>
                                </div>
                                <button className="btn btn-xs btn-ghost" onClick={() => openEditCarrier(activeCarrier)}>수정</button>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <ClipboardListIcon size={14} /> <span>{activeCarrier.bizRegNo}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <UserIcon size={14} /> <span>{activeCarrier.ceoName} (대표)</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FileTextIcon size={14} />
                                    {activeCarrier.isJoined ? (
                                        <span>{activeCarrier.email}</span>
                                    ) : (
                                        <span className="text-gray-400 italic">미가입 (이메일 비공개)</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <PhoneIcon size={14} /> <span>{activeCarrier.phone} / {activeCarrier.contactPhone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <MapPinIcon size={14} /> <span className="line-clamp-1">{activeCarrier.address}</span>
                                </div>
                                {activeCarrier.memo && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded text-gray-500 italic">
                                        "{activeCarrier.memo}"
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Driver List */}
                    <div className="lg:col-span-2">
                        <div className="glass-card p-0 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold flex items-center gap-2">
                                    <UserIcon size={18} className="text-blue-500" /> 소속 기사 및 차량 리스트
                                </h3>
                                <button className="btn btn-sm btn-primary" onClick={openCreateDriver}>
                                    <PlusIcon size={16} /> 기사 추가
                                </button>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="data-table">
                                    <thead className="sticky top-0 bg-white shadow-sm">
                                        <tr>
                                            <th>기사명</th>
                                            <th>연락처</th>
                                            <th>차량번호</th>
                                            <th>차량타입</th>
                                            <th>최근배차</th>
                                            <th className="text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingDrivers ? (
                                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">로딩 중...</td></tr>
                                        ) : drivers.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">등록된 기사가 없습니다.</td></tr>
                                        ) : (
                                            drivers.map(d => (
                                                <tr key={d.id}>
                                                    <td className="font-bold">{d.driverName}</td>
                                                    <td className="mono text-xs">{d.driverPhone}</td>
                                                    <td className="font-mono text-blue-600 font-bold">{d.vehicleNumber}</td>
                                                    <td>
                                                        {vehicleTypes.find(v => v.id === d.vehicleTypeId)?.name || '-'}
                                                    </td>
                                                    <td className="text-xs text-gray-500">
                                                        {d.lastUsedAt?.toDate?.().toLocaleDateString()}
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button className="btn btn-xs btn-ghost" onClick={() => openEditDriver(d)}>
                                                                <EditIcon size={14} />
                                                            </button>
                                                            <button className="btn btn-xs btn-ghost text-red-500" onClick={() => handleDeleteDriver(d.id)}>
                                                                <TrashIcon size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold">등록된 배송업체가 없습니다. 상단의 '배송업체 등록' 버튼을 눌러주세요.</p>
                </div>
            )}

            {/* Carrier Modal */}
            {showCarrierModal && (
                <div className="modal-overlay" onClick={() => setShowCarrierModal(false)}>
                    <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCarrier ? '배송업체 수정' : '배송업체 등록'}</h2>
                            <button className="close-btn" onClick={() => setShowCarrierModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCarrierSubmit} className="modal-body p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group required">
                                    <label>회사명</label>
                                    <input className="input" value={carrierFormData.companyName || ''} onChange={e => setCarrierFormData({ ...carrierFormData, companyName: e.target.value })} required />
                                </div>
                                <div className="form-group required">
                                    <label>사업자번호</label>
                                    <input className="input" value={carrierFormData.bizRegNo || ''} onChange={e => setCarrierFormData({ ...carrierFormData, bizRegNo: e.target.value })} required />
                                </div>
                                <div className="form-group required">
                                    <label>대표자명</label>
                                    <input className="input" value={carrierFormData.ceoName || ''} onChange={e => setCarrierFormData({ ...carrierFormData, ceoName: e.target.value })} required />
                                </div>
                                <div className="form-group required">
                                    <label>이메일</label>
                                    <input className="input" type="email" value={carrierFormData.email || ''} onChange={e => setCarrierFormData({ ...carrierFormData, email: e.target.value })} required />
                                </div>
                                <div className="form-group required">
                                    <label>배차담당자</label>
                                    <input className="input" value={carrierFormData.contactPerson || ''} onChange={e => setCarrierFormData({ ...carrierFormData, contactPerson: e.target.value })} required />
                                </div>
                                <div className="form-group required">
                                    <label>담당자 연락처</label>
                                    <input className="input" value={carrierFormData.contactPhone || ''} onChange={e => setCarrierFormData({ ...carrierFormData, contactPhone: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-group required">
                                <label>주소</label>
                                <input className="input" value={carrierFormData.address || ''} onChange={e => setCarrierFormData({ ...carrierFormData, address: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>메모</label>
                                <textarea className="input" value={carrierFormData.memo || ''} onChange={e => setCarrierFormData({ ...carrierFormData, memo: e.target.value })} rows={3} />
                            </div>
                            <div className="modal-footer pt-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCarrierModal(false)}>취소</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장하기'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Driver Modal */}
            {showDriverModal && (
                <div className="modal-overlay" onClick={() => setShowDriverModal(false)}>
                    <div className="modal-content !max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDriver ? '기사 정보 수정' : '신규 기사 등록'}</h2>
                            <button className="close-btn" onClick={() => setShowDriverModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleDriverSubmit} className="modal-body p-6 space-y-4">
                            <div className="form-group required">
                                <label>기사명</label>
                                <input className="input" value={driverFormData.driverName || ''} onChange={e => setDriverFormData({ ...driverFormData, driverName: e.target.value })} required />
                            </div>
                            <div className="form-group required">
                                <label>연락처</label>
                                <input className="input" type="tel" value={driverFormData.driverPhone || ''} onChange={e => setDriverFormData({ ...driverFormData, driverPhone: e.target.value })} placeholder="010-0000-0000" required />
                            </div>
                            <div className="form-group required">
                                <label>차량번호</label>
                                <input className="input" value={driverFormData.vehicleNumber || ''} onChange={e => setDriverFormData({ ...driverFormData, vehicleNumber: e.target.value })} placeholder="서울12가3456" required />
                            </div>
                            <div className="form-group">
                                <label>차량타입</label>
                                <select className="input" value={driverFormData.vehicleTypeId || ''} onChange={e => setDriverFormData({ ...driverFormData, vehicleTypeId: e.target.value })}>
                                    <option value="">타입 선택</option>
                                    {vehicleTypes.map(vt => (
                                        <option key={vt.id} value={vt.id}>{vt.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-footer pt-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDriverModal(false)}>취소</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장하기'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
