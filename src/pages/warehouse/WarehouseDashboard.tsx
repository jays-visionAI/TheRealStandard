import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getAllPurchaseOrders,
    getAllSalesOrders,
    getAllShipments,
    type FirestorePurchaseOrder,
    type FirestoreSalesOrder,
    type FirestoreShipment
} from '../../lib/orderService'
import { FactoryIcon, CheckCircleIcon, PackageIcon, TruckDeliveryIcon, PhoneIcon } from '../../components/Icons'
import './WarehouseDashboard.css'

interface PendingItem {
    id: string
    orderId: string
    customerName: string
    supplier: string
    totalKg: number
    vehicleNo: string
    driverName: string
    driverPhone: string
    expectedTime: string
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
    type: 'RECEIVE' | 'RELEASE'
}

export default function WarehouseDashboard() {
    const navigate = useNavigate()

    // Firebase에서 직접 로드되는 데이터
    const [purchaseOrders, setPurchaseOrders] = useState<FirestorePurchaseOrder[]>([])
    const [salesOrders, setSalesOrders] = useState<FirestoreSalesOrder[]>([])
    const [shipments, setShipments] = useState<FirestoreShipment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [activeTab, setActiveTab] = useState<'receive' | 'release'>('receive')

    // Firebase에서 데이터 로드
    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [poData, soData, shipmentsData] = await Promise.all([
                getAllPurchaseOrders(),
                getAllSalesOrders(),
                getAllShipments()
            ])

            setPurchaseOrders(poData)
            setSalesOrders(soData)
            setShipments(shipmentsData)
        } catch (err) {
            console.error('Failed to load data:', err)
            setError('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // 매입 발주 데이터를 반입 대기로 매핑
    const receiveItems: PendingItem[] = useMemo(() => {
        return purchaseOrders.map(po => ({
            id: po.id,
            orderId: po.id,
            customerName: 'Internal',
            supplier: po.supplierName || '공급사 미정',
            totalKg: po.totalsKg,
            vehicleNo: '배정대기',
            driverName: '기사 미정',
            driverPhone: '',
            expectedTime: '오늘',
            status: po.status === 'SENT' ? 'PENDING' : 'COMPLETED',
            type: 'RECEIVE',
        }))
    }, [purchaseOrders])

    // 확정 주문 데이터를 출고 대기로 매핑 (배송 정보 동기화)
    const releaseItems: PendingItem[] = useMemo(() => {
        return salesOrders.map(so => {
            const shipment = shipments.find(s => s.sourceSalesOrderId === so.id || s.orderId === so.id)
            const etaValue = shipment?.eta || shipment?.etaAt
            return {
                id: so.id,
                orderId: so.id,
                customerName: so.customerName || '고객사 미정',
                supplier: '',
                totalKg: so.totalsKg,
                vehicleNo: shipment?.vehicleNumber || '배차대기',
                driverName: shipment?.driverName || '기사 미정',
                driverPhone: shipment?.driverPhone || '',
                expectedTime: etaValue ? new Date(etaValue instanceof Date ? etaValue : (etaValue as any).toDate?.() || etaValue).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '오늘',
                status: 'PENDING',
                type: 'RELEASE',
            }
        })
    }, [salesOrders, shipments])

    const currentItems = activeTab === 'receive' ? receiveItems : releaseItems

    const handleItemClick = (item: PendingItem) => {
        if (item.type === 'RECEIVE') {
            navigate(`/warehouse/receive/${item.id}`)
        } else {
            navigate(`/warehouse/release/${item.id}`)
        }
    }

    if (loading) {
        return (
            <div className="warehouse-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>데이터를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="warehouse-dashboard">
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
        <div className="warehouse-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <h1><FactoryIcon size={24} /> 물류창고 관리</h1>
                    <p className="header-date">{new Date().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    })}</p>
                </div>
                <div className="header-right">
                    <span className="user-info">창고담당: 관리자</span>
                </div>
            </header>

            {/* Summary Cards */}
            <section className="summary-section">
                <div className="summary-grid">
                    <div className="summary-card receive">
                        <div className="summary-icon">📥</div>
                        <div className="summary-content">
                            <span className="summary-value">{receiveItems.length}</span>
                            <span className="summary-label">반입 대기</span>
                        </div>
                    </div>
                    <div className="summary-card release">
                        <div className="summary-icon">📤</div>
                        <div className="summary-content">
                            <span className="summary-value">{releaseItems.length}</span>
                            <span className="summary-label">출고 대기</span>
                        </div>
                    </div>
                    <div className="summary-card completed">
                        <div className="summary-icon"><CheckCircleIcon size={24} /></div>
                        <div className="summary-content">
                            <span className="summary-value">
                                {receiveItems.filter(i => i.status === 'COMPLETED').length + releaseItems.filter(i => i.status === 'COMPLETED').length}
                            </span>
                            <span className="summary-label">오늘 처리 완료</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'receive' ? 'active' : ''}`}
                    onClick={() => setActiveTab('receive')}
                >
                    📥 반입 대기 ({receiveItems.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'release' ? 'active' : ''}`}
                    onClick={() => setActiveTab('release')}
                >
                    📤 출고 대기 ({releaseItems.length})
                </button>
            </div>

            {/* Items List */}
            <section className="items-section">
                {currentItems.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon"><PackageIcon size={48} /></span>
                        <p>대기 중인 항목이 없습니다</p>
                    </div>
                ) : (
                    <div className="items-list">
                        {currentItems.map(item => (
                            <div
                                key={item.id}
                                className="item-card glass-card"
                                onClick={() => handleItemClick(item)}
                            >
                                <div className="item-header">
                                    <div className="item-type">
                                        <span className={`type-badge ${item.type.toLowerCase()}`}>
                                            {item.type === 'RECEIVE' ? '📥 반입' : '📤 출고'}
                                        </span>
                                        <span className="expected-time">{item.expectedTime} 예정</span>
                                    </div>
                                    <span className="order-id">{item.orderId}</span>
                                </div>

                                <div className="item-body">
                                    <div className="item-main">
                                        <h3>{item.customerName}</h3>
                                        {item.supplier && (
                                            <p className="supplier">공급: {item.supplier}</p>
                                        )}
                                        <p className="weight">총 {item.totalKg}kg</p>
                                    </div>

                                    <div className="item-vehicle">
                                        <div className="vehicle-info">
                                            <span className="vehicle-no"><TruckDeliveryIcon size={14} /> {item.vehicleNo}</span>
                                            <span className="driver">{item.driverName}</span>
                                        </div>
                                        <a
                                            href={`tel:${item.driverPhone}`}
                                            className="phone-btn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <PhoneIcon size={14} /> {item.driverPhone}
                                        </a>
                                    </div>
                                </div>

                                <div className="item-footer">
                                    <button className="btn btn-primary">
                                        {item.type === 'RECEIVE' ? '반입 처리 →' : '출고 처리 →'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
