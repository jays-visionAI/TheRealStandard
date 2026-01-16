import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
    getShipmentByToken,
    getSalesOrderById,
    getSalesOrderItems,
    updateShipment,
    getDriversByCarrier,
    upsertDriver,
    type FirestoreShipment,
    type FirestoreSalesOrderItem,
    type RegisteredDriver
} from '../../lib/orderService'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { getAllVehicleTypes, type FirestoreVehicleType } from '../../lib/vehicleService'
import { TruckIcon, CheckCircleIcon, PhoneIcon, UserIcon, PackageIcon, AlertTriangleIcon, SearchIcon } from '../../components/Icons'
import { Timestamp } from 'firebase/firestore'

interface DispatchItem extends FirestoreSalesOrderItem {
    boxWeight?: number;
    totalBoxes?: number;
}

export default function DispatchView() {
    const { token } = useParams<{ token: string }>()
    const [loading, setLoading] = useState(true)
    const [shipment, setShipment] = useState<FirestoreShipment | null>(null)
    const [items, setItems] = useState<DispatchItem[]>([])
    const [vehicleTypes, setVehicleTypes] = useState<FirestoreVehicleType[]>([])
    const [registeredDrivers, setRegisteredDrivers] = useState<RegisteredDriver[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // Form states
    const [vehicleTypeId, setVehicleTypeId] = useState('')
    const [vehicleNo, setVehicleNo] = useState('')
    const [driverName, setDriverName] = useState('')
    const [driverPhone, setDriverPhone] = useState('')
    const [showDriverSearch, setShowDriverSearch] = useState(false)

    useEffect(() => {
        if (token) {
            loadData()
        }
    }, [token])

    const loadData = async () => {
        try {
            setLoading(true)
            const s = await getShipmentByToken(token!)
            if (!s) {
                setError('유효하지 않은 링크이거나 만료되었습니다.')
                return
            }
            setShipment(s)

            setVehicleTypeId(s.vehicleTypeId || '')
            setVehicleNo(s.vehicleNumber || '')
            setDriverName(s.driverName || '')
            setDriverPhone(s.driverPhone || '')

            if (s.status !== 'PREPARING') {
                setSubmitted(true)
            }

            const [soItems, products, vTypes, drivers] = await Promise.all([
                getSalesOrderItems(s.sourceSalesOrderId),
                getAllProducts(),
                getAllVehicleTypes(),
                s.carrierOrgId ? getDriversByCarrier(s.carrierOrgId) : Promise.resolve([])
            ])

            const enrichedItems = soItems.map(item => {
                const product = products.find(p => p.id === item.productId)
                const boxWeight = product?.boxWeight || 0
                return {
                    ...item,
                    boxWeight,
                    totalBoxes: boxWeight > 0 ? Math.ceil(item.qtyKg / boxWeight) : 0
                }
            })

            setItems(enrichedItems)
            setVehicleTypes(vTypes.filter(v => v.enabled))
            setRegisteredDrivers(drivers.sort((a, b) => b.lastUsedAt.toMillis() - a.lastUsedAt.toMillis()))

        } catch (err) {
            console.error('Failed to load dispatch info:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const selectRegisteredDriver = (driver: RegisteredDriver) => {
        setVehicleNo(driver.vehicleNumber)
        setDriverName(driver.driverName)
        setDriverPhone(driver.driverPhone)
        setVehicleTypeId(driver.vehicleTypeId || '')
        setShowDriverSearch(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!vehicleTypeId || !vehicleNo || !driverName || !driverPhone) {
            alert('모든 필수 정보를 입력해주세요.')
            return
        }

        try {
            setIsSubmitting(true)

            // Update Shipment
            await updateShipment(shipment!.id, {
                vehicleTypeId,
                vehicleNumber: vehicleNo,
                driverName,
                driverPhone,
                status: 'IN_TRANSIT',
                isModified: true,
                modifiedAt: Timestamp.now()
            })

            // Save driver info for reuse
            if (shipment?.carrierOrgId) {
                await upsertDriver(shipment.carrierOrgId, {
                    driverName,
                    driverPhone,
                    vehicleNumber: vehicleNo,
                    vehicleTypeId: vehicleTypeId || undefined
                })
            }

            setSubmitted(true)
            alert('배차 정보가 전송되었습니다. 관리자와 물류팀에 알림이 발송됩니다.')
        } catch (err) {
            console.error('Submit failed:', err)
            alert('오류가 발생했습니다. 다시 시도해 주세요.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="spinner"></div></div>
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="glass-card p-8 max-w-md w-full text-center">
                <AlertTriangleIcon size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">접근 불가</h2>
                <p className="text-gray-600">{error}</p>
            </div>
        </div>
    )

    if (submitted && shipment?.status !== 'PREPARING') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="glass-card p-8 max-w-md w-full text-center">
                    <CheckCircleIcon size={48} className="text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">배차 확인 완료</h2>
                    <p className="text-gray-600 mb-6">배차 정보가 이미 제출되었거나 배송이 시작되었습니다.</p>
                    <div className="bg-gray-100 p-4 rounded-lg text-left text-sm mb-4">
                        <div className="flex justify-between mb-1"><span>기사명:</span><strong>{driverName}</strong></div>
                        <div className="flex justify-between mb-1"><span>차량번호:</span><strong>{vehicleNo}</strong></div>
                        <div className="flex justify-between"><span>상태:</span><span className="text-blue-600 font-bold">{shipment?.status === 'IN_TRANSIT' ? '배송중' : '배송완료'}</span></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <TruckIcon size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">배차 요청 확인</h1>
                        <p className="text-gray-600">{shipment?.company} 담당자님, 아래 배송 건에 대한 차량을 배정해 주세요.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Item List */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="glass-card overflow-hidden">
                            <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
                                <h2 className="font-bold flex items-center gap-2"><PackageIcon size={18} /> 배송 물품 리스트</h2>
                                <span className="text-xs opacity-70">CONFIRMED ORDER</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3 text-left">품목명</th>
                                            <th className="px-4 py-3 text-right">박스당 중량</th>
                                            <th className="px-4 py-3 text-right">예상 박스수</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-900">총 중량(kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 font-medium">{item.productName}</td>
                                                <td className="px-4 py-4 text-right">{item.boxWeight ? `${item.boxWeight}kg` : '-'}</td>
                                                <td className="px-4 py-4 text-right">{item.totalBoxes ? `${item.totalBoxes}박스` : '-'}</td>
                                                <td className="px-4 py-4 text-right font-bold">{item.qtyKg.toLocaleString()}kg</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-4 font-bold text-gray-900">합계</td>
                                            <td className="px-4 py-4 text-right font-bold text-blue-600">
                                                {items.reduce((sum, i) => sum + (i.totalBoxes || 0), 0)}박스
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-blue-600 text-lg">
                                                {items.reduce((sum, i) => sum + i.qtyKg, 0).toLocaleString()}kg
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Right: Driver Form */}
                    <div className="lg:col-span-1">
                        <section className="glass-card p-6 sticky top-8 border-t-4 border-blue-600 shadow-xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <UserIcon size={20} className="text-blue-600" /> 차량 및 기사 배정
                                </h2>
                                {registeredDrivers.length > 0 && (
                                    <button
                                        type="button"
                                        className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                                        onClick={() => setShowDriverSearch(!showDriverSearch)}
                                    >
                                        <SearchIcon size={14} /> 이전 기록
                                    </button>
                                )}
                            </div>

                            {showDriverSearch && (
                                <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100 max-h-48 overflow-y-auto">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">최근 배차 내역 (재사용)</p>
                                    <div className="space-y-2">
                                        {registeredDrivers.map(d => (
                                            <button
                                                key={d.id}
                                                type="button"
                                                className="w-full text-left p-2 bg-white rounded border border-blue-100 hover:border-blue-400 transition-colors"
                                                onClick={() => selectRegisteredDriver(d)}
                                            >
                                                <div className="font-bold text-sm">{d.driverName} ({d.vehicleNumber})</div>
                                                <div className="text-[10px] text-gray-500">{d.driverPhone}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">차량 타입</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={vehicleTypeId}
                                        onChange={e => setVehicleTypeId(e.target.value)}
                                        required
                                    >
                                        <option value="">차량 선택...</option>
                                        {vehicleTypes.map(v => <option key={v.id} value={v.id}>{v.name} (최대 {v.capacityKg.toLocaleString()}kg)</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">차량 번호</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="서울 00가 0000"
                                        value={vehicleNo}
                                        onChange={e => setVehicleNo(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">기사 성함</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={driverName}
                                        onChange={e => setDriverName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">기사 연락처</label>
                                    <input
                                        type="tel"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="010-0000-0000"
                                        value={driverPhone}
                                        onChange={e => setDriverPhone(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <span className="spinner white"></span> : <><TruckIcon size={20} /> 배차 확인 및 전송</>}
                                    </button>
                                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                                        확인 버튼을 누르면 관리자와 물류팀에 자동으로 정보가 전송되며 배송이 시작됩니다.
                                    </p>
                                </div>
                            </form>
                        </section>
                    </div>
                </div>
            </div>

            <style>{`
                .glass-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid rgba(0,0,0,0.05);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(0,0,0,0.1);
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                .spinner.white {
                    border-color: rgba(255,255,255,0.3);
                    border-top-color: white;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
