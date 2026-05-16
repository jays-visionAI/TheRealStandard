import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'
import { useAuth } from '../../contexts/AuthContext'

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

// 카테고리별 플레이스홀더 SVG (이미지 없는 상품 폴백용)
function CategoryPlaceholder({ category, large }: { category: string; large?: boolean }) {
    const colors: Record<string, { bg: string; fg: string }> = {
        '냉장': { bg: '#dbeafe', fg: '#1e40af' },
        '냉동': { bg: '#e0f2fe', fg: '#0369a1' },
        '부산물': { bg: '#fef3c7', fg: '#92400e' },
    }
    const c = colors[category] || { bg: '#f3f4f6', fg: '#6b7280' }
    const size = large ? 80 : 36
    const emoji = category === '냉장' ? '🧊' : category === '냉동' ? '❄️' : '🦴'
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${c.bg} 0%, #ffffff 100%)`,
            color: c.fg,
            fontSize: `${size}px`,
        }}>
            {emoji}
        </div>
    )
}

export default function PublicCatalog() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState<Category>('all')

    useEffect(() => {
        getAllProducts()
            .then(all => {
                // 공개 토글된 활성 상품만 노출
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
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link to="/" style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', textDecoration: 'none', letterSpacing: '-0.5px' }}>
                        MEATGO
                    </Link>
                    <nav style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Link to="/" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px' }}>홈</Link>
                        {user ? (
                            <button
                                onClick={() => navigate('/admin')}
                                style={{ background: '#6366f1', color: '#fff', border: 0, borderRadius: '6px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}
                            >
                                대시보드
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                style={{ background: '#6366f1', color: '#fff', border: 0, borderRadius: '6px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}
                            >
                                로그인
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 24px 32px' }}>
                <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '999px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', fontSize: '12px', color: '#a5b4fc', marginBottom: '20px' }}>
                    B2B 육류 도매 카탈로그
                </div>
                <h1 style={{ fontSize: '48px', fontWeight: 'bold', lineHeight: 1.2, marginBottom: '16px', letterSpacing: '-1px' }}>
                    프리미엄 육류, <br />
                    <span style={{ background: 'linear-gradient(90deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        엄선된 공급망에서.
                    </span>
                </h1>
                <p style={{ fontSize: '17px', color: '#94a3b8', maxWidth: '640px', lineHeight: 1.7 }}>
                    MEATGO는 전국 신선/냉동 육류를 B2B 거래처에 안정적으로 공급하는 통합 유통 플랫폼입니다.
                    아래에서 취급 품목을 확인하시고 거래를 시작해보세요.
                </p>
            </section>

            {/* Category Tabs */}
            <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                background: activeCategory === cat ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                color: activeCategory === cat ? '#fff' : '#cbd5e1',
                                border: `1px solid ${activeCategory === cat ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '8px',
                                padding: '10px 18px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            <span style={{ marginRight: '8px' }}>{CATEGORY_LABELS[cat].emoji}</span>
                            {CATEGORY_LABELS[cat].label}
                            <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '12px' }}>({counts[cat]})</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Product Grid */}
            <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '8px 24px 64px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
                        상품을 불러오는 중...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 24px', color: '#64748b', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
                        <p style={{ fontSize: '16px', marginBottom: '8px' }}>표시할 상품이 없습니다</p>
                        <p style={{ fontSize: '13px', color: '#475569' }}>관리자가 공개 카탈로그에 상품을 등록하면 여기에 노출됩니다.</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '20px',
                    }}>
                        {filtered.map(p => (
                            <article key={p.id} style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                transition: 'transform 0.2s, border-color 0.2s',
                                cursor: 'default',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                            >
                                <div style={{ aspectRatio: '4/3', width: '100%', overflow: 'hidden', background: '#1e293b' }}>
                                    {p.imageUrl ? (
                                        <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <CategoryPlaceholder category={p.category1} large />
                                    )}
                                </div>
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                                            {p.category1}
                                        </span>
                                        {p.taxFree && (
                                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
                                                면세
                                            </span>
                                        )}
                                    </div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px', minHeight: '40px', lineHeight: 1.4 }}>
                                        {p.name}
                                    </h3>
                                    {p.memo && (
                                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', minHeight: '18px' }}>
                                            {p.memo}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                                            ₩{formatCurrency(p.wholesalePrice)}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
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
            <section style={{ background: 'rgba(99,102,241,0.08)', borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                        거래를 시작하시겠어요?
                    </h2>
                    <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>
                        견적 요청 / 단가표 발급 / 신규 거래 등록은 아래에서 문의해주세요.<br />
                        담당자가 빠르게 회신드립니다.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{ background: '#6366f1', color: '#fff', border: 0, borderRadius: '8px', padding: '14px 28px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            거래 문의하기
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '14px 28px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            이미 거래처입니다 (로그인)
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
                © {new Date().getFullYear()} MEATGO. 프리미엄 육류 B2B 유통.
            </footer>
        </div>
    )
}
