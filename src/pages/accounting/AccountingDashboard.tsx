import { useState, useMemo } from 'react'
import { useOrderStore } from '../../stores/orderStore'
import {
    ClipboardListIcon,
    TruckDeliveryIcon,
    ShoppingCartIcon
} from '../../components/Icons'
import './AccountingDashboard.css'

export default function AccountingDashboard() {
    const { orderSheets, salesOrders, purchaseOrders, shipments } = useOrderStore()

    // 메인 섹션: 'sales' (발주받기), 'purchase' (발주하기), 'delivery' (배송리스트)
    const [mainSection, setMainSection] = useState<'sales' | 'purchase' | 'delivery'>('sales')

    // 발주받기 서브 탭
    const [salesTab, setSalesTab] = useState<'waiting' | 'customer' | 'admin'>('waiting')

    // 발주하기 서브 탭
    const [purchaseTab, setPurchaseTab] = useState<'sent' | 'confirmed'>('sent')


    // 데이터 필터링 로직
    const salesData = useMemo(() => {
        if (salesTab === 'waiting') return orderSheets.filter(o => o.status === 'SENT')
        if (salesTab === 'customer') return orderSheets.filter(o => o.status === 'SUBMITTED')
        return salesOrders // CONFIRMED 상태는 salesOrders로 변환됨
    }, [orderSheets, salesOrders, salesTab])

    const purchaseData = useMemo(() => {
        if (purchaseTab === 'sent') return purchaseOrders.filter(p => p.status === 'SENT')
        return purchaseOrders.filter(p => p.status === 'CONFIRMED')
    }, [purchaseOrders, purchaseTab])

    const deliveryData = useMemo(() => shipments, [shipments])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    const formatDate = (date: Date | string) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="accounting-dashboard">
            {/* Main Navigation */}
            <nav className="main-nav glass-card">
                <button
                    className={`nav-item ${mainSection === 'sales' ? 'active' : ''}`}
                    onClick={() => setMainSection('sales')}
                >
                    <ClipboardListIcon size={20} />
                    <span>1. 발주받기 (매출)</span>
                </button>
                <button
                    className={`nav-item ${mainSection === 'purchase' ? 'active' : ''}`}
                    onClick={() => setMainSection('purchase')}
                >
                    <ShoppingCartIcon size={20} />
                    <span>2. 발주하기 (매입)</span>
                </button>
                <button
                    className={`nav-item ${mainSection === 'delivery' ? 'active' : ''}`}
                    onClick={() => setMainSection('delivery')}
                >
                    <TruckDeliveryIcon size={20} />
                    <span>3. 배송리스트</span>
                </button>
            </nav>

            <header className="dashboard-header mt-6">
                <div className="header-left">
                    <h1>
                        {mainSection === 'sales' && '발주받기 관리'}
                        {mainSection === 'purchase' && '발주하기 관리'}
                        {mainSection === 'delivery' && '배송 현황 리스트'}
                    </h1>
                    <p className="header-date">경리 회계 단계 업무 대시보드</p>
                </div>
            </header>

            {/* Sub Tabs based on Main Section */}
            {mainSection === 'sales' && (
                <div className="tab-navigation sales-tabs">
                    <button className={`tab-btn ${salesTab === 'waiting' ? 'active' : ''}`} onClick={() => setSalesTab('waiting')}>
                        대기주문 ({orderSheets.filter(o => o.status === 'SENT').length})
                    </button>
                    <button className={`tab-btn ${salesTab === 'customer' ? 'active' : ''}`} onClick={() => setSalesTab('customer')}>
                        고객 확정 ({orderSheets.filter(o => o.status === 'SUBMITTED').length})
                    </button>
                    <button className={`tab-btn ${salesTab === 'admin' ? 'active' : ''}`} onClick={() => setSalesTab('admin')}>
                        회사 승인 ({salesOrders.length})
                    </button>
                </div>
            )}

            {mainSection === 'purchase' && (
                <div className="tab-navigation purchase-tabs">
                    <button className={`tab-btn ${purchaseTab === 'sent' ? 'active' : ''}`} onClick={() => setPurchaseTab('sent')}>
                        발주주문 ({purchaseOrders.filter(p => p.status === 'SENT').length})
                    </button>
                    <button className={`tab-btn ${purchaseTab === 'confirmed' ? 'active' : ''}`} onClick={() => setPurchaseTab('confirmed')}>
                        확정/서류완료 ({purchaseOrders.filter(p => p.status === 'CONFIRMED').length})
                    </button>
                </div>
            )}

            {/* Content Table */}
            <section className="content-section glass-card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            {mainSection === 'sales' && (
                                <tr>
                                    <th>일시</th>
                                    <th>주문번호</th>
                                    <th>고객사</th>
                                    <th className="text-right">금액</th>
                                    <th>필요서류</th>
                                    <th>작업</th>
                                </tr>
                            )}
                            {mainSection === 'purchase' && (
                                <tr>
                                    <th>발주일</th>
                                    <th>발주번호</th>
                                    <th>공급사</th>
                                    <th className="text-right">금액</th>
                                    <th>서류확인</th>
                                    <th>작업</th>
                                </tr>
                            )}
                            {mainSection === 'delivery' && (
                                <tr>
                                    <th>시간</th>
                                    <th>배송번호</th>
                                    <th>고객사</th>
                                    <th>배송업체</th>
                                    <th>차량/기사</th>
                                    <th>결제상태</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {mainSection === 'sales' && salesData.length > 0 && salesData.map(item => (
                                <tr key={item.id}>
                                    <td>{formatDate(item.createdAt)}</td>
                                    <td className="font-mono text-primary">{item.id}</td>
                                    <td>{item.customerName}</td>
                                    <td className="text-right font-medium">
                                        {'totalsAmount' in item ? formatCurrency(item.totalsAmount) : '-'}
                                    </td>
                                    <td>
                                        <div className="doc-tags">
                                            <span className="doc-tag pending">명세서</span>
                                            <span className="doc-tag pending">등급서</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="btn btn-xs btn-secondary">서류 업로드</button>
                                    </td>
                                </tr>
                            ))}
                            {mainSection === 'purchase' && purchaseData.length > 0 && purchaseData.map(item => (
                                <tr key={item.id}>
                                    <td>{formatDate(item.createdAt)}</td>
                                    <td className="font-mono text-primary">{item.id}</td>
                                    <td>{item.supplierName || '공급사 미정'}</td>
                                    <td className="text-right font-medium">{formatCurrency(item.totalsAmount)}</td>
                                    <td>
                                        <span className={`status-pill ${item.status === 'CONFIRMED' ? 'success' : 'warning'}`}>
                                            {item.status === 'CONFIRMED' ? '확인완료' : '서류대기'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn btn-xs btn-ghost">상세보기</button>
                                    </td>
                                </tr>
                            ))}
                            {mainSection === 'delivery' && deliveryData.length > 0 && deliveryData.map(item => (
                                <tr key={item.id}>
                                    <td>{formatDate(item.createdAt)}</td>
                                    <td className="font-mono text-primary">{item.id}</td>
                                    <td>{item.carrierName || '-'}</td>
                                    <td>{item.carrierName || '직배'}</td>
                                    <td>{item.vehicleNo} / {item.driverName}</td>
                                    <td>
                                        <span className="status-pill info">지급대기</span>
                                    </td>
                                </tr>
                            ))}
                            {(mainSection === 'sales' && salesData.length === 0) ||
                                (mainSection === 'purchase' && purchaseData.length === 0) ||
                                (mainSection === 'delivery' && deliveryData.length === 0) ? (
                                <tr>
                                    <td colSpan={6} className="text-center p-12 text-muted">
                                        표시할 거래 내역이 없습니다.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
