import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
    getDriversByCarrier,
    upsertDriver,
    deleteDriver,
    type RegisteredDriver
} from '../../lib/orderService'
import { getAllVehicleTypes, type FirestoreVehicleType } from '../../lib/vehicleService'
import {
    TruckIcon,
    UserIcon,
    PhoneIcon,
    EditIcon,
    TrashIcon,
    PlusIcon,
    XIcon,
    AlertTriangleIcon,
    CheckCircleIcon
} from '../../components/Icons'

export default function FleetManagement() {
    const { user } = useAuth()
    const [drivers, setDrivers] = useState<RegisteredDriver[]>([])
    const [vehicleTypes, setVehicleTypes] = useState<FirestoreVehicleType[]>([])
    const [loading, setLoading] = useState(true)

    const [showModal, setShowModal] = useState(false)
    const [editingDriver, setEditingDriver] = useState<RegisteredDriver | null>(null)
    const [formData, setFormData] = useState<Partial<RegisteredDriver>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (user) {
            loadData()
        }
    }, [user])

    const loadData = async () => {
        if (!user) return
        try {
            setLoading(true)
            const [driverList, vTypes] = await Promise.all([
                getDriversByCarrier(user.id),
                getAllVehicleTypes()
            ])
            setDrivers(driverList.sort((a, b) => b.lastUsedAt.toMillis() - a.lastUsedAt.toMillis()))
            setVehicleTypes(vTypes.filter(v => v.enabled))
        } catch (err) {
            console.error('Failed to load fleet data:', err)
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setEditingDriver(null)
        setFormData({
            driverName: '',
            driverPhone: '',
            vehicleNumber: '',
            vehicleTypeId: ''
        })
        setShowModal(true)
    }

    const openEditModal = (d: RegisteredDriver) => {
        setEditingDriver(d)
        setFormData(d)
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setIsSubmitting(true)
        try {
            await upsertDriver(user.id, {
                driverName: formData.driverName || '',
                driverPhone: formData.driverPhone || '',
                vehicleNumber: formData.vehicleNumber || '',
                vehicleTypeId: formData.vehicleTypeId || ''
            })
            await loadData()
            setShowModal(false)
        } catch (err) {
            console.error('Save failed:', err)
            alert('정보 저장에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        try {
            await deleteDriver(id)
            await loadData()
        } catch (err) {
            alert('삭제 실패')
        }
    }

    if (loading) return <div className="p-12 text-center text-gray-400">데이터를 불러오는 중...</div>

    return (
        <div className="fleet-management max-w-5xl mx-auto p-4 md:p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TruckIcon className="text-blue-600" /> 차량 및 기사 관리
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">배차 요청 시 신속한 할당을 위해 자사 운행 정보를 사전 등록하세요.</p>
                </div>
                <button
                    className="btn btn-primary flex items-center gap-2 justify-center"
                    onClick={openCreateModal}
                >
                    <PlusIcon size={18} /> 새 정보 등록
                </button>
            </header>

            {!drivers.length ? (
                <div className="glass-card p-12 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                    <UserIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-700">기사 정보가 없습니다</h3>
                    <p className="text-gray-500 mb-6 font-medium">관리자에게 전달할 배차 리스트를 미리 만들어보세요.</p>
                    <button className="btn btn-primary" onClick={openCreateModal}>첫 번째 정보 등록하기</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {drivers.map(driver => (
                        <div key={driver.id} className="glass-card overflow-hidden group hover:shadow-xl transition-all border border-gray-100 rounded-2xl bg-white">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                        {driver.driverName.charAt(0)}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" onClick={() => openEditModal(driver)}><EditIcon size={16} /></button>
                                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" onClick={() => handleDelete(driver.id)}><TrashIcon size={16} /></button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold mb-1">{driver.driverName}</h3>
                                <p className="text-blue-600 font-mono text-sm font-bold mb-4">{driver.vehicleNumber}</p>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <PhoneIcon size={14} className="text-gray-400" />
                                        <span>{driver.driverPhone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TruckIcon size={14} className="text-gray-400" />
                                        <span>{vehicleTypes.find(v => v.id === driver.vehicleTypeId)?.name || '타입 미정'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-50 text-[10px] text-gray-400 flex justify-between">
                                <span>마지막 배송 기록</span>
                                <span>{driver.lastUsedAt.toDate().toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content !max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-header border-b p-4">
                            <h2 className="font-bold flex items-center gap-2">
                                {editingDriver ? <EditIcon size={20} className="text-blue-600" /> : <PlusIcon size={20} className="text-blue-600" />}
                                {editingDriver ? '정보 수정' : '새 기사/차량 등록'}
                            </h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><XIcon size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body p-6 space-y-4">
                            <div className="form-group required">
                                <label className="block text-sm font-bold text-gray-700 mb-1">기사 성함</label>
                                <input
                                    className="input w-full"
                                    value={formData.driverName || ''}
                                    onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                                    placeholder="이름을 입력하세요"
                                    required
                                />
                            </div>
                            <div className="form-group required">
                                <label className="block text-sm font-bold text-gray-700 mb-1">연락처</label>
                                <input
                                    className="input w-full"
                                    value={formData.driverPhone || ''}
                                    onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                                    placeholder="010-0000-0000"
                                    required
                                />
                            </div>
                            <div className="form-group required">
                                <label className="block text-sm font-bold text-gray-700 mb-1">차량 번호</label>
                                <input
                                    className="input w-full font-mono"
                                    value={formData.vehicleNumber || ''}
                                    onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                    placeholder="예: 서울 12가 3456"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-gray-700 mb-1">차량 타입</label>
                                <select
                                    className="input w-full"
                                    value={formData.vehicleTypeId || ''}
                                    onChange={e => setFormData({ ...formData, vehicleTypeId: e.target.value })}
                                >
                                    <option value="">차량 타입 선택</option>
                                    {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name} ({vt.capacityKg.toLocaleString()}kg)</option>)}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>취소</button>
                                <button type="submit" className="btn btn-primary flex-1 font-bold" disabled={isSubmitting}>
                                    {isSubmitting ? '처리 중...' : '저장하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Guide Banner */}
            <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md">
                    <CheckCircleIcon size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-blue-900 mb-1">미리 등록하면 무엇이 좋나요?</h3>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside opacity-80">
                        <li>관리자가 보낸 배차 요청 링크에서 정보를 일일이 입력할 필요 없이 클릭 한 번으로 끝납니다.</li>
                        <li>소속 기사님들의 운송 현황과 최종 배차 기록을 한눈에 관리할 수 있습니다.</li>
                        <li>부정확한 차량 번호나 연락처 기입으로 인한 배송 사고를 예방합니다.</li>
                    </ul>
                </div>
            </div>

            <style>{`
                .fleet-management .glass-card {
                    background: white;
                    border-radius: 1rem;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
                }
                .fleet-management .input {
                    padding: 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    background-color: #f8fafc;
                    transition: all 0.2s;
                }
                .fleet-management .input:focus {
                    border-color: #3b82f6;
                    background-color: white;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                    outline: none;
                }
            `}</style>
        </div>
    )
}
