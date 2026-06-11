import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    getOrderSheetsByCustomer,
    getSalesOrdersByCustomer,
    getAllSalesOrders,
    type FirestoreOrderSheet
} from '../../lib/orderService'
import {
    ClipboardListIcon,
    PackageIcon,
    TruckIcon,
    TrendingUpIcon,
    ChevronRightIcon,
    FileTextIcon,
    SparklesIcon,
    RefreshCwIcon,
    StarIcon,
    WalletIcon,
    ChartIcon,
    ArrowRightIcon
} from '../../components/Icons'
import { getCompanyDocuments, type FirestoreFileAttachment } from '../../lib/fileService'
import { computeCustomerInsights, type CustomerInsightResult, type InsightKind } from '../../lib/customerInsightService'
import './CustomerDashboard.css'

export default function CustomerDashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        pendingSheets: 0,
        activeOrders: 0,
        completedMonth: 0,
        totalSpentMonth: 0
    })
    const [recentSheets, setRecentSheets] = useState<FirestoreOrderSheet[]>([])
    const [companyDocs, setCompanyDocs] = useState<FirestoreFileAttachment[]>([])
    const [platform, setPlatform] = useState<{ orgs: number; orders: number } | null>(null)
    const [insightResult, setInsightResult] = useState<CustomerInsightResult | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            if (!user?.id) {
                setLoading(false)
                return
            }

            try {
                const [sheets, orders] = await Promise.all([
                    getOrderSheetsByCustomer(user.id),
                    getSalesOrdersByCustomer(user.id)
                ])

                const pending = sheets.filter(s => ['SENT', 'REVISION', 'SUBMITTED'].includes(s.status))
                const active = orders.filter(o => o.status !== 'COMPLETED')

                const now = new Date()
                const thisMonthOrders = orders.filter(o => {
                    const d = o.createdAt.toDate()
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                })

                setStats({
                    pendingSheets: pending.length,
                    activeOrders: active.length,
                    completedMonth: thisMonthOrders.length,
                    totalSpentMonth: thisMonthOrders.reduce((sum, o) => sum + o.totalsAmount, 0)
                })

                setRecentSheets(pending.slice(0, 3))

                // 플랫폼 활동 띠 — 이번 달 전체 발주 활동 (군중 신호). salesOrders read = 인증 사용자 허용
                try {
                    const allSO = await getAllSalesOrders()
                    const monthSO = allSO.filter(o => {
                        const d = (o.confirmedAt || o.createdAt)?.toDate?.()
                        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                    })
                    const orgs = new Set(monthSO.map(o => o.customerOrgId).filter(Boolean)).size
                    setPlatform({ orgs, orders: monthSO.length })
                } catch { /* 권한/네트워크 실패 시 띠 숨김 */ }

                // 맞춤 인사이트 (주문 0건=코호트 / 이력 있음=개인화) — 실패 시 섹션 생략
                try {
                    setInsightResult(await computeCustomerInsights(user.id))
                } catch (e) {
                    console.warn('Customer insights skipped:', e)
                }

                // MeatGo 회사 서류 로드
                const docs = await getCompanyDocuments()
                setCompanyDocs(docs)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    if (loading) return <div className="p-10 text-center">Loading...</div>

    return (
        <div className="customer-dashboard">
            <header className="dashboard-header">
                <h2>반갑습니다, {user?.name}님! 👋</h2>
                <p>오늘의 주문 현황과 소식을 확인하세요.</p>
            </header>

            <div className="stats-container">
                <div className="stat-card glass-card accent-blue" onClick={() => navigate('/order/list')}>
                    <div className="stat-icon"><ClipboardListIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="label">진행중인 주문서</span>
                        <span className="value">{stats.pendingSheets}건</span>
                    </div>
                </div>
                <div className="stat-card glass-card accent-orange" onClick={() => navigate('/order/tracking')}>
                    <div className="stat-icon"><TruckIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="label">진행 중인 배송</span>
                        <span className="value">{stats.activeOrders}건</span>
                    </div>
                </div>
                <div className="stat-card glass-card accent-green" onClick={() => navigate('/order/history')}>
                    <div className="stat-icon"><TrendingUpIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="label">이달의 주문 금액</span>
                        <span className="value">₩{(stats.totalSpentMonth / 10000).toFixed(0)}<small>만원</small></span>
                    </div>
                </div>
            </div>

            {platform && platform.orders > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'linear-gradient(90deg, #D1FAE5 0%, #ECFDF5 100%)',
                    border: '1px solid #A7F3D0', borderRadius: '12px',
                    padding: '12px 18px', margin: '0 0 20px', fontSize: '14px', color: '#065F46', fontWeight: 600,
                }}>
                    <span className="mg-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#047857', flexShrink: 0 }} />
                    <span>이번 달 <strong>{platform.orgs}곳</strong>의 거래처가 <strong>{platform.orders}건</strong> 발주 중이에요.</span>
                </div>
            )}

            {/* 맞춤 인사이트 (베타) — 주문 0건이면 플랫폼 평균, 이력 있으면 개인화 */}
            {insightResult && insightResult.insights.length > 0 && (
                <div className="glass-card" style={{ padding: '20px 22px', marginBottom: '20px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <SparklesIcon size={18} color="#047857" />
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#1F2937' }}>맞춤 인사이트</h3>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857', background: '#D1FAE5', padding: '2px 8px', borderRadius: '999px' }}>BETA</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 14px' }}>
                        {insightResult.mode === 'PERSONAL'
                            ? '사장님의 주문 데이터를 분석한 결과예요.'
                            : '아직 주문 이력이 없어 플랫폼 평균 데이터를 보여드려요. 주문이 쌓이면 맞춤 분석으로 바뀝니다.'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                        {insightResult.insights.map(ins => {
                            const tone = ins.tone === 'warning' ? '#DC2626' : ins.tone === 'action' ? '#047857' : '#1D4ED8'
                            const iconMap: Record<InsightKind, React.ReactNode> = {
                                reorder: <RefreshCwIcon size={16} />, spend: <TrendingUpIcon size={16} />,
                                top: <StarIcon size={16} />, cross: <SparklesIcon size={16} />,
                                settlement: <WalletIcon size={16} />, popular: <StarIcon size={16} />,
                                pattern: <ChartIcon size={16} />, start: <ArrowRightIcon size={16} />,
                            }
                            return (
                                <div key={ins.id} style={{
                                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px',
                                    display: 'flex', flexDirection: 'column', gap: '8px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '30px', height: '30px', borderRadius: '8px',
                                            background: `${tone}14`, color: tone,
                                        }}>{iconMap[ins.kind]}</span>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF' }}>
                                            {ins.basis === 'personal' ? '내 주문 기반' : '플랫폼 평균'}
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1F2937' }}>{ins.title}</span>
                                            {ins.metric && <span style={{ fontSize: '13px', fontWeight: 800, color: tone }}>{ins.metric}</span>}
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.6, margin: '4px 0 0' }}>{ins.body}</p>
                                    </div>
                                    {ins.cta && (
                                        <button
                                            onClick={() => navigate(ins.cta!.path)}
                                            style={{
                                                alignSelf: 'flex-start', marginTop: 'auto',
                                                background: 'transparent', border: 'none', padding: 0,
                                                fontSize: '12px', fontWeight: 700, color: tone, cursor: 'pointer',
                                            }}
                                        >{ins.cta.label} →</button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {insightResult.sampleNote && (
                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '12px 0 0' }}>* {insightResult.sampleNote}</p>
                    )}
                </div>
            )}

            <div className="dashboard-grid">
                <div className="grid-section glass-card">
                    <div className="section-header">
                        <h3>⚡ 바로 작성하기</h3>
                        <Link to="/order/list" className="view-all">모두 보기 <ChevronRightIcon size={14} /></Link>
                    </div>
                    <div className="pending-list">
                        {recentSheets.length > 0 ? (
                            recentSheets.map(sheet => (
                                <div key={sheet.id} className="pending-item" onClick={() => navigate(`/order/${sheet.inviteTokenId}/edit`)}>
                                    <div className="item-icon"><PackageIcon size={20} /></div>
                                    <div className="item-info">
                                        <p className="item-title">{sheet.customerName} 주문서</p>
                                        <p className="item-meta">
                                            {sheet.status === 'SUBMITTED' ? (
                                                <span className="text-warning">승인 대기중</span>
                                            ) : (
                                                `마감: ${sheet.cutOffAt.toDate().toLocaleDateString()}`
                                            )}
                                        </p>
                                    </div>
                                    <button className="item-btn">
                                        {sheet.status === 'SUBMITTED' ? '보기' : '작성'} <ChevronRightIcon size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="empty-message">작성할 주문서가 없습니다.</div>
                        )}
                    </div>
                </div>

                <div className="grid-section glass-card">
                    <div className="section-header">
                        <h3>📚 상품 추천</h3>
                        <Link to="/order/catalog" className="view-all">카탈로그 <ChevronRightIcon size={14} /></Link>
                    </div>
                    <div className="catalog-preview">
                        <p className="preview-text">최신 육류 상품 리스트와 가격을 확인하세요.</p>
                        <button className="btn btn-primary w-full" onClick={() => navigate('/order/catalog')}>
                            카탈로그 열기
                        </button>
                    </div>
                </div>

                {companyDocs.length > 0 && (
                    <div className="grid-section glass-card">
                        <div className="section-header">
                            <h3><FileTextIcon size={16} /> MeatGo 회사 서류</h3>
                        </div>
                        <p className="preview-text">사업자등록증, 통장사본 등 거래에 필요한 서류입니다.</p>
                        <div className="company-doc-list">
                            {companyDocs.map(d => (
                                <a
                                    key={d.id}
                                    href={d.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="doc-item"
                                >
                                    <FileTextIcon size={16} />
                                    <span className="doc-name">{d.fileName}</span>
                                    <span className="doc-action">다운로드 &rarr;</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
