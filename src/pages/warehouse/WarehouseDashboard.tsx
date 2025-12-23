import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    const [activeTab, setActiveTab] = useState<'receive' | 'release'>('receive')

    // Mock 데이터 - 반입 대기
    const receiveItems: PendingItem[] = [
        {
            id: 'R-001',
            orderId: 'OS-2024-003',
            customerName: '태윤유통',
            supplier: '우경인터내셔널',
            totalKg: 105,
            vehicleNo: '서울12가3456',
            driverName: '김기사',
            driverPhone: '010-1234-5678',
            expectedTime: '09:30',
            status: 'PENDING',
            type: 'RECEIVE',
        },
        {
            id: 'R-002',
            orderId: 'OS-2024-004',
            customerName: '한우명가',
            supplier: '다한식품',
            totalKg: 80,
            vehicleNo: '경기34나5678',
            driverName: '박기사',
            driverPhone: '010-2345-6789',
            expectedTime: '10:00',
            status: 'PENDING',
            type: 'RECEIVE',
        },
    ]

    // Mock 데이터 - 출고 대기
    const releaseItems: PendingItem[] = [
        {
            id: 'L-001',
            orderId: 'OS-2024-001',
            customerName: '프라임미트',
            supplier: '',
            totalKg: 95,
            vehicleNo: '서울56다7890',
            driverName: '이기사',
            driverPhone: '010-3456-7890',
            expectedTime: '14:00',
            status: 'PENDING',
            type: 'RELEASE',
        },
        {
            id: 'L-002',
            orderId: 'OS-2024-002',
            customerName: '고기마을',
            supplier: '',
            totalKg: 120,
            vehicleNo: '인천78라1234',
            driverName: '최기사',
            driverPhone: '010-4567-8901',
            expectedTime: '15:30',
            status: 'PENDING',
            type: 'RELEASE',
        },
    ]

    const currentItems = activeTab === 'receive' ? receiveItems : releaseItems

    const handleItemClick = (item: PendingItem) => {
        if (item.type === 'RECEIVE') {
            navigate(`/warehouse/receive/${item.id}`)
        } else {
            navigate(`/warehouse/release/${item.id}`)
        }
    }

    return (
        <div className="warehouse-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>🏭 물류창고 관리</h1>
                    <p className="header-date">{new Date().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    })}</p>
                </div>
                <div className="header-right">
                    <span className="user-info">창고담당: 홍길동</span>
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
                        <div className="summary-icon">✅</div>
                        <div className="summary-content">
                            <span className="summary-value">8</span>
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
                        <span className="empty-icon">📦</span>
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
                                            <span className="vehicle-no">🚛 {item.vehicleNo}</span>
                                            <span className="driver">{item.driverName}</span>
                                        </div>
                                        <a
                                            href={`tel:${item.driverPhone}`}
                                            className="phone-btn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            📞 {item.driverPhone}
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
