import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccountingStore } from '../../stores/accountingStore'
import {
    WalletIcon,
    TrendingUpIcon,
    ClockIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    ChevronRightIcon
} from '../../components/Icons'
import './AccountingDashboard.css'

export default function AccountingDashboard() {
    const navigate = useNavigate()
    const { records, getSalesRecords, getPurchaseRecords, getPendingRecords, getCompletedRecords } = useAccountingStore()

    const salesRecords = getSalesRecords()
    const purchaseRecords = getPurchaseRecords()
    const pendingRecords = getPendingRecords()
    const completedRecords = getCompletedRecords()

    // 통계 계산
    const stats = useMemo(() => {
        const totalSales = salesRecords.reduce((sum, r) => sum + r.totalAmount, 0)
        const totalPurchases = purchaseRecords.reduce((sum, r) => sum + r.totalAmount, 0)
        const pendingReceivables = salesRecords
            .filter(r => r.paymentStatus === 'PENDING')
            .reduce((sum, r) => sum + r.totalAmount, 0)
        const pendingPayables = purchaseRecords
            .filter(r => r.paymentStatus === 'PENDING')
            .reduce((sum, r) => sum + r.totalAmount, 0)
        const pendingInvoiceSales = salesRecords.filter(r => r.invoiceStatus === 'PENDING').length
        const pendingInvoicePurchase = purchaseRecords.filter(r => r.invoiceStatus === 'PENDING').length

        return {
            totalSales,
            totalPurchases,
            profit: totalSales - totalPurchases,
            pendingReceivables,
            pendingPayables,
            pendingInvoiceSales,
            pendingInvoicePurchase,
            pendingCount: pendingRecords.length,
            completedCount: completedRecords.length
        }
    }, [salesRecords, purchaseRecords, pendingRecords, completedRecords])

    // 최근 거래 내역
    const recentRecords = useMemo(() => {
        return [...records]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
    }, [records])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원'
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    }

    return (
        <div className="accounting-dashboard-new">
            {/* 요약 카드 */}
            <div className="stats-grid">
                <div className="stat-card sales">
                    <div className="stat-icon">
                        <TrendingUpIcon size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">이번 달 매출</div>
                        <div className="stat-value">{formatCurrency(stats.totalSales)}</div>
                        <div className="stat-sub">{salesRecords.length}건</div>
                    </div>
                </div>
                <div className="stat-card purchases">
                    <div className="stat-icon">
                        <WalletIcon size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">이번 달 매입</div>
                        <div className="stat-value">{formatCurrency(stats.totalPurchases)}</div>
                        <div className="stat-sub">{purchaseRecords.length}건</div>
                    </div>
                </div>
                <div className="stat-card pending">
                    <div className="stat-icon">
                        <ClockIcon size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">미정산 건수</div>
                        <div className="stat-value">{stats.pendingCount}건</div>
                        <div className="stat-sub clickable" onClick={() => navigate('/accounting/pending')}>
                            상세보기 <ChevronRightIcon size={14} />
                        </div>
                    </div>
                </div>
                <div className="stat-card completed">
                    <div className="stat-icon">
                        <CheckCircleIcon size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">정산 완료</div>
                        <div className="stat-value">{stats.completedCount}건</div>
                        <div className="stat-sub clickable" onClick={() => navigate('/accounting/completed')}>
                            상세보기 <ChevronRightIcon size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 미수금/미지급 알림 */}
            <div className="alert-section">
                {stats.pendingReceivables > 0 && (
                    <div className="alert-card warning" onClick={() => navigate('/accounting/sales')}>
                        <AlertTriangleIcon size={20} />
                        <div className="alert-content">
                            <span className="alert-title">미수금</span>
                            <span className="alert-amount">{formatCurrency(stats.pendingReceivables)}</span>
                        </div>
                        <ChevronRightIcon size={18} />
                    </div>
                )}
                {stats.pendingPayables > 0 && (
                    <div className="alert-card danger" onClick={() => navigate('/accounting/purchases')}>
                        <AlertTriangleIcon size={20} />
                        <div className="alert-content">
                            <span className="alert-title">미지급</span>
                            <span className="alert-amount">{formatCurrency(stats.pendingPayables)}</span>
                        </div>
                        <ChevronRightIcon size={18} />
                    </div>
                )}
                {stats.pendingInvoiceSales > 0 && (
                    <div className="alert-card info" onClick={() => navigate('/accounting/sales')}>
                        <AlertTriangleIcon size={20} />
                        <div className="alert-content">
                            <span className="alert-title">세금계산서 미발행</span>
                            <span className="alert-amount">{stats.pendingInvoiceSales}건</span>
                        </div>
                        <ChevronRightIcon size={18} />
                    </div>
                )}
                {stats.pendingInvoicePurchase > 0 && (
                    <div className="alert-card info" onClick={() => navigate('/accounting/purchases')}>
                        <AlertTriangleIcon size={20} />
                        <div className="alert-content">
                            <span className="alert-title">세금계산서 미수취</span>
                            <span className="alert-amount">{stats.pendingInvoicePurchase}건</span>
                        </div>
                        <ChevronRightIcon size={18} />
                    </div>
                )}
            </div>

            {/* 최근 거래 내역 */}
            <div className="recent-section glass-card">
                <div className="section-header">
                    <h3>최근 거래 내역</h3>
                </div>
                <div className="recent-list">
                    {recentRecords.length === 0 ? (
                        <div className="empty-state">거래 내역이 없습니다</div>
                    ) : (
                        recentRecords.map(record => (
                            <div key={record.id} className="recent-item">
                                <div className="recent-type">
                                    <span className={`type-badge ${record.type === 'SALES' ? 'sales' : 'purchase'}`}>
                                        {record.type === 'SALES' ? '매출' : '매입'}
                                    </span>
                                </div>
                                <div className="recent-info">
                                    <span className="recent-name">{record.counterpartyName}</span>
                                    <span className="recent-date">{formatDate(record.transactionDate)}</span>
                                </div>
                                <div className="recent-amount">
                                    {formatCurrency(record.totalAmount)}
                                </div>
                                <div className="recent-status">
                                    {record.paymentStatus === 'COMPLETED' ? (
                                        <span className="status-badge success">완료</span>
                                    ) : (
                                        <span className="status-badge pending">대기</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 빠른 메뉴 */}
            <div className="quick-menu">
                <button className="quick-btn" onClick={() => navigate('/accounting/sales')}>
                    매출 내역
                </button>
                <button className="quick-btn" onClick={() => navigate('/accounting/purchases')}>
                    매입 내역
                </button>
                <button className="quick-btn" onClick={() => navigate('/accounting/invoices')}>
                    세금계산서
                </button>
                <button className="quick-btn" onClick={() => navigate('/accounting/certificates')}>
                    등급확인서
                </button>
            </div>
        </div>
    )
}
