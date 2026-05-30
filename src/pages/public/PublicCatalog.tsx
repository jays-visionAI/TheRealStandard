import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAllProducts, getAllImageUrls, type FirestoreProduct } from '../../lib/productService'
import { useAuth } from '../../contexts/AuthContext'
import YouTubeModal from '../../components/YouTubeModal'
import ImageCarousel from '../../components/ImageCarousel'
import { COLOR, FONT, RADIUS, SHADOW, containerStyle, capsuleStyle, btnPrimary, btnSecondary, btnGhost } from '../../styles/design-tokens'

type Category = 'all' | '냉장' | '냉동' | '부산물'

const CATEGORY_LABELS: Record<Category, { label: string; emoji: string }> = {
    all: { label: '전체', emoji: '🥩' },
    냉장: { label: '냉장', emoji: '🧊' },
    냉동: { label: '냉동', emoji: '❄️' },
    부산물: { label: '부산물', emoji: '🦴' },
}

function formatCurrency(n: number): string {
    return n.toLocaleString('ko-KR')
}

// 카테고리별 플레이스홀더 (이미지 없는 상품용) — 라이트 톤
function CategoryPlaceholder({ category }: { category: string }) {
    const tones: Record<string, { bg: string; fg: string }> = {
        '냉장': { bg: '#DBEAFE', fg: '#1E40AF' },
        '냉동': { bg: '#E0F2FE', fg: '#0369A1' },
        '부산물': { bg: '#FEF3C7', fg: '#92400E' },
    }
    const c = tones[category] || { bg: '#F3F4F6', fg: '#6B7280' }
    const emoji = category === '냉장' ? '🧊' : category === '냉동' ? '❄️' : '🦴'
    return (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${c.bg} 0%, #ffffff 100%)`,
            color: c.fg, fontSize: '80px',
        }}>{emoji}</div>
    )
}

export default function PublicCatalog() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState<Category>('all')
    const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null)

    useEffect(() => {
        getAllProducts()
            .then(all => {
                const visible = all.filter(p => p.displayOnPublic === true && p.isActive !== false)
                setProducts(visible)
            })
            .catch(err => console.error('Failed to load public catalog:', err))
            .finally(() => setLoading(false))
    }, [])

    const filtered = useMemo(() => {
        if (activeCategory === 'all') return products
        return products.filter(p => p.category1 === activeCategory)
    }, [products, activeCategory])

    const counts = useMemo(() => ({
        all: products.length,
        냉장: products.filter(p => p.category1 === '냉장').length,
        냉동: products.filter(p => p.category1 === '냉동').length,
        부산물: products.filter(p => p.category1 === '부산물').length,
    }), [products])

    return (
        <div style={{ minHeight: '100vh', background: COLOR.bg, color: COLOR.text, fontFamily: FONT, lineHeight: 1.6 }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(254, 252, 248, 0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${COLOR.border}`,
            }}>
                <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <div style={{
                            minWidth: '44px', height: '36px', borderRadius: RADIUS.md,
                            background: COLOR.primary, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', fontWeight: 800, letterSpacing: '-0.5px',
                            padding: '0 8px',
                        }}>믿고</div>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: COLOR.secondary, letterSpacing: '-0.5px' }}>MEATGO</span>
                    </Link>
                    <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <Link to="/" style={{ color: COLOR.text, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>홈</Link>
                        {user ? (
                            <button onClick={() => navigate('/admin')} style={{ ...btnPrimary, padding: '8px 18px', fontSize: '14px', boxShadow: 'none' }}>
                                대시보드
                            </button>
                        ) : (
                            <button onClick={() => navigate('/login')} style={btnGhost}>
                                로그인
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section style={{ ...containerStyle, padding: '64px 24px 32px' }}>
                <div style={capsuleStyle}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLOR.primary }}></span>
                    B2B 육류 도매 카탈로그
                </div>
                <h1 style={{
                    fontSize: '48px', fontWeight: 800, lineHeight: 1.15,
                    color: COLOR.secondary, marginTop: '20px', letterSpacing: '-1.2px',
                }}>
                    프리미엄 육류, <br />
                    <span style={{ color: COLOR.primary }}>엄선된 공급망에서.</span>
                </h1>
                <p style={{ fontSize: '17px', color: COLOR.textMuted, maxWidth: '640px', lineHeight: 1.7, marginTop: '20px' }}>
                    MEATGO는 전국 신선/냉동 육류를 B2B 거래처에 안정적으로 공급하는 통합 유통 플랫폼입니다.
                    아래에서 취급 품목을 확인하시고 거래를 시작해보세요.
                </p>
            </section>

            {/* Category Tabs */}
            <section style={{ ...containerStyle, padding: '0 24px 24px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => {
                        const isActive = activeCategory === cat
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    background: isActive ? COLOR.primary : COLOR.surface,
                                    color: isActive ? '#fff' : COLOR.text,
                                    border: `1px solid ${isActive ? COLOR.primary : COLOR.border}`,
                                    borderRadius: RADIUS.md,
                                    padding: '10px 18px',
                                    fontSize: '14px', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    fontFamily: FONT,
                                }}
                            >
                                <span style={{ marginRight: '8px' }}>{CATEGORY_LABELS[cat].emoji}</span>
                                {CATEGORY_LABELS[cat].label}
                                <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '12px' }}>({counts[cat]})</span>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* Product Grid */}
            <section style={{ ...containerStyle, padding: '8px 24px 64px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: COLOR.textMuted }}>
                        상품을 불러오는 중...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '80px 24px',
                        color: COLOR.textMuted, background: COLOR.surface,
                        borderRadius: RADIUS.xl, border: `1px dashed ${COLOR.border}`,
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                        <p style={{ fontSize: '16px', marginBottom: '8px', color: COLOR.text }}>표시할 상품이 없습니다</p>
                        <p style={{ fontSize: '13px' }}>관리자가 공개 카탈로그에 상품을 등록하면 여기에 노출됩니다.</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '20px',
                    }}>
                        {filtered.map(p => (
                            <article key={p.id} style={{
                                background: COLOR.surface,
                                border: `1px solid ${COLOR.border}`,
                                borderRadius: RADIUS.xl,
                                overflow: 'hidden',
                                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = COLOR.primary; e.currentTarget.style.boxShadow = SHADOW.lg }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = COLOR.border; e.currentTarget.style.boxShadow = '' }}
                            >
                                <div style={{ aspectRatio: '4/3', width: '100%', overflow: 'hidden', background: COLOR.surfaceAlt, position: 'relative' }}>
                                    <ImageCarousel
                                        images={getAllImageUrls(p)}
                                        alt={p.name}
                                        fallback={<CategoryPlaceholder category={p.category1} />}
                                    />
                                    {p.videoUrl && (
                                        <button
                                            onClick={() => setVideoModal({ url: p.videoUrl!, title: p.name })}
                                            title="영상 재생"
                                            style={{
                                                position: 'absolute', top: '10px', right: '10px',
                                                background: 'rgba(0,0,0,0.7)', color: '#fff',
                                                border: 'none', borderRadius: '4px', padding: '4px 9px',
                                                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.92)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.7)' }}
                                        >▶ 영상</button>
                                    )}
                                </div>
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                        <span style={{
                                            fontSize: '11px', padding: '2px 8px', borderRadius: RADIUS.sm,
                                            background: COLOR.primaryLight, color: COLOR.primaryDark, fontWeight: 600,
                                        }}>{p.category1}</span>
                                        {p.taxFree && (
                                            <span style={{
                                                fontSize: '11px', padding: '2px 8px', borderRadius: RADIUS.sm,
                                                background: COLOR.accentLight, color: COLOR.accent, fontWeight: 600,
                                            }}>면세</span>
                                        )}
                                    </div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: COLOR.secondary, marginBottom: '6px', minHeight: '40px', lineHeight: 1.4 }}>
                                        {p.name}
                                    </h3>
                                    {p.memo && (
                                        <p style={{ fontSize: '12px', color: COLOR.textMuted, marginBottom: '10px', minHeight: '18px' }}>
                                            {p.memo}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', paddingTop: '10px', borderTop: `1px solid ${COLOR.border}` }}>
                                        <span style={{ fontSize: '20px', fontWeight: 800, color: COLOR.secondary }}>
                                            ₩{formatCurrency(p.wholesalePrice)}
                                        </span>
                                        <span style={{ fontSize: '12px', color: COLOR.textMuted }}>
                                            / {p.unit === 'box' ? 'BOX' : 'kg'}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* CTA */}
            <section style={{ background: COLOR.surface, borderTop: `1px solid ${COLOR.border}` }}>
                <div style={{ ...containerStyle, padding: '64px 24px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 800, color: COLOR.secondary, marginBottom: '12px', letterSpacing: '-0.5px' }}>
                        거래를 시작하시겠어요?
                    </h2>
                    <p style={{ fontSize: '15px', color: COLOR.textMuted, marginBottom: '28px', lineHeight: 1.6 }}>
                        견적 요청 / 단가표 발급 / 신규 거래 등록은 아래에서 문의해주세요.<br />
                        담당자가 빠르게 회신드립니다.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/')} style={btnPrimary}>
                            거래 문의하기
                        </button>
                        <button onClick={() => navigate('/login')} style={btnSecondary}>
                            이미 거래처입니다 (로그인)
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ background: COLOR.surfaceAlt, borderTop: `1px solid ${COLOR.border}`, padding: '24px', textAlign: 'center', color: COLOR.textFaint, fontSize: '13px' }}>
                © {new Date().getFullYear()} MEATGO. 프리미엄 육류 B2B 유통.
            </footer>

            <YouTubeModal
                isOpen={!!videoModal}
                videoUrl={videoModal?.url}
                title={videoModal?.title}
                onClose={() => setVideoModal(null)}
            />
        </div>
    )
}
