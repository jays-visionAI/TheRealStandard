import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProductById, getAllImageUrls, type FirestoreProduct } from '../../lib/productService'
import { getEmbedUrl } from '../../lib/youtubeUtils'
import { useAuth } from '../../contexts/AuthContext'
import ImageCarousel from '../../components/ImageCarousel'
import LeadInquiryForm from '../../components/LeadInquiryForm'
import { COLOR, FONT, RADIUS, SHADOW, containerStyle, btnPrimary, btnGhost } from '../../styles/design-tokens'

function formatCurrency(n: number): string {
    return n.toLocaleString('ko-KR')
}

function CategoryPlaceholder({ category }: { category: string }) {
    const emoji = category === '냉장' ? '🧊' : category === '냉동' ? '❄️' : '🦴'
    return (
        <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: COLOR.surfaceAlt, color: COLOR.textFaint, fontSize: '96px',
        }}>{emoji}</div>
    )
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${COLOR.border}`, fontSize: '14px' }}>
            <span style={{ color: COLOR.textMuted }}>{label}</span>
            <span style={{ color: COLOR.text, fontWeight: 600 }}>{value}</span>
        </div>
    )
}

export default function ProductDetail() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [product, setProduct] = useState<FirestoreProduct | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        if (!id) return
        setLoading(true)
        getProductById(id)
            .then(p => {
                // 공개 노출 상품만 (운영자/영업은 미리보기 허용)
                const visible = p && p.displayOnPublic === true && p.isActive !== false
                if (visible || (p && user)) {
                    setProduct(p)
                } else {
                    setNotFound(true)
                }
            })
            .catch(err => { console.error('Failed to load product:', err); setNotFound(true) })
            .finally(() => setLoading(false))
    }, [id, user])

    const embedUrl = product?.videoUrl ? getEmbedUrl(product.videoUrl) : null

    return (
        <div style={{ minHeight: '100vh', background: COLOR.bg, color: COLOR.text, fontFamily: FONT, lineHeight: 1.6 }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(254, 252, 248, 0.92)', backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${COLOR.border}`,
            }}>
                <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <div style={{
                            minWidth: '44px', height: '36px', borderRadius: RADIUS.md,
                            background: COLOR.primary, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', fontWeight: 800, letterSpacing: '-0.5px', padding: '0 8px',
                        }}>믿고</div>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: COLOR.secondary, letterSpacing: '-0.5px' }}>MEATGO</span>
                    </Link>
                    <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <Link to="/products" style={{ color: COLOR.text, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>카탈로그</Link>
                        {user ? (
                            <button onClick={() => navigate('/admin')} style={{ ...btnPrimary, padding: '8px 18px', fontSize: '14px', boxShadow: 'none' }}>대시보드</button>
                        ) : (
                            <button onClick={() => navigate('/login')} style={btnGhost}>로그인</button>
                        )}
                    </nav>
                </div>
            </header>

            <section style={{ ...containerStyle, padding: '24px' }}>
                <Link to="/products" style={{ fontSize: '14px', color: COLOR.textMuted, textDecoration: 'none' }}>← 카탈로그로 돌아가기</Link>
            </section>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: COLOR.textMuted }}>상품을 불러오는 중...</div>
            ) : notFound || !product ? (
                <div style={{ ...containerStyle, textAlign: 'center', padding: '80px 24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: COLOR.secondary, marginBottom: '8px' }}>상품을 찾을 수 없습니다</p>
                    <p style={{ fontSize: '14px', color: COLOR.textMuted, marginBottom: '24px' }}>삭제되었거나 비공개 처리된 상품일 수 있습니다.</p>
                    <button onClick={() => navigate('/products')} style={btnPrimary}>카탈로그 보기</button>
                </div>
            ) : (
                <section style={{ ...containerStyle, padding: '8px 24px 64px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: '40px', alignItems: 'start' }}>
                        {/* 좌: 이미지 + 영상 */}
                        <div>
                            <div style={{
                                aspectRatio: '4/3', width: '100%', position: 'relative',
                                overflow: 'hidden', borderRadius: RADIUS.xl, border: `1px solid ${COLOR.border}`, background: COLOR.surfaceAlt,
                            }}>
                                <ImageCarousel
                                    images={getAllImageUrls(product)}
                                    alt={product.name}
                                    fallback={<CategoryPlaceholder category={product.category1} />}
                                />
                            </div>
                            {embedUrl && (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: COLOR.secondary, marginBottom: '8px' }}>🎬 상품 영상</div>
                                    <div style={{
                                        position: 'relative', width: '100%', paddingTop: '56.25%',
                                        borderRadius: RADIUS.lg, overflow: 'hidden', background: '#000', boxShadow: SHADOW.md,
                                    }}>
                                        <iframe
                                            src={`${embedUrl}?rel=0`}
                                            title={`${product.name} 영상`}
                                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 우: 정보 + 거래문의 */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: RADIUS.sm, background: COLOR.primaryLight, color: COLOR.primaryDark, fontWeight: 600 }}>{product.category1}</span>
                                {product.taxFree && (
                                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: RADIUS.sm, background: COLOR.accentLight, color: COLOR.accent, fontWeight: 600 }}>면세</span>
                                )}
                                {!product.displayOnPublic && user && (
                                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: RADIUS.sm, background: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}>비공개(미리보기)</span>
                                )}
                            </div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, color: COLOR.secondary, letterSpacing: '-0.5px', marginBottom: '12px' }}>{product.name}</h1>
                            {product.memo && (
                                <p style={{ fontSize: '15px', color: COLOR.textMuted, marginBottom: '20px', lineHeight: 1.7 }}>{product.memo}</p>
                            )}

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', padding: '16px 0', borderTop: `1px solid ${COLOR.border}`, borderBottom: `1px solid ${COLOR.border}`, marginBottom: '20px' }}>
                                <span style={{ fontSize: '30px', fontWeight: 800, color: COLOR.secondary }}>₩{formatCurrency(product.wholesalePrice)}</span>
                                <span style={{ fontSize: '14px', color: COLOR.textMuted }}>/ {product.unit === 'box' ? 'BOX' : 'kg'}</span>
                            </div>

                            {/* 스펙 */}
                            <div style={{ marginBottom: '28px' }}>
                                <SpecRow label="보관" value={product.category1} />
                                <SpecRow label="거래 구분" value={product.category2} />
                                {product.subCategory && <SpecRow label="세부 분류" value={product.subCategory} />}
                                <SpecRow label="단위" value={product.unit === 'box' ? `박스${product.boxWeight ? ` (${product.boxWeight}kg)` : ''}` : 'kg'} />
                                <SpecRow label="과세 여부" value={product.taxFree ? '면세' : '과세'} />
                                {product.supplierName && <SpecRow label="공급사" value={product.supplierName} />}
                            </div>

                            {/* 거래문의 폼 */}
                            <div style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.xl, padding: '24px', boxShadow: SHADOW.sm }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: COLOR.secondary, marginBottom: '6px' }}>거래문의</h2>
                                <p style={{ fontSize: '13px', color: COLOR.textMuted, marginBottom: '18px' }}>이 상품에 대한 견적 · 단가 · 납품 조건을 문의하세요. 담당자가 빠르게 회신드립니다.</p>
                                <LeadInquiryForm source="PRODUCT_DETAIL" productId={product.id} productName={product.name} />
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <footer style={{ background: COLOR.surfaceAlt, borderTop: `1px solid ${COLOR.border}`, padding: '24px', textAlign: 'center', color: COLOR.textFaint, fontSize: '13px' }}>
                © {new Date().getFullYear()} MEATGO. 프리미엄 육류 B2B 유통.
            </footer>
        </div>
    )
}
