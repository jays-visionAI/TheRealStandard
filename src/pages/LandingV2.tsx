import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDefaultPathForRole } from '../components/ProtectedRoute'
import { createLead } from '../lib/leadService'
import { getAllProducts, type FirestoreProduct } from '../lib/productService'

// ============================================
// 컬러 토큰 (Forest Green + Charcoal Gold)
// ============================================
const C = {
    primary: '#047857',       // Emerald-700  · 신선·신뢰
    primaryDark: '#065F46',   // Emerald-800  · 호버
    primaryLight: '#D1FAE5',  // Emerald-100  · 캡슐 배경
    secondary: '#1F2937',     // Slate-800    · 정통·프리미엄
    secondaryLight: '#374151',// Slate-700
    accent: '#D97706',        // Amber-600    · 따뜻한 강조
    accentLight: '#FEF3C7',   // Amber-100
    bg: '#FEFCF8',            // Warm White   · 따뜻한 베이스
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',
    text: '#1F2937',
    textMuted: '#6B7280',
    textFaint: '#9CA3AF',
    border: '#E5E7EB',
    borderDark: '#D1D5DB',
}

// 공용 폰트 시스템
const FONT = `'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`

// ============================================
// 거래문의 모달
// ============================================
function ContactModal({ onClose }: { onClose: () => void }) {
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const companyName = (fd.get('companyName') as string || '').trim()
        const contactName = (fd.get('contactName') as string || '').trim()
        const phone = (fd.get('phone') as string || '').trim()
        const email = (fd.get('email') as string || '').trim()
        const categories = fd.getAll('categories').map(String)
        const expectedVolume = (fd.get('expectedVolume') as string || '').trim()
        const memo = (fd.get('memo') as string || '').trim()

        if (!companyName || !contactName || !phone) {
            setError('회사명 · 담당자명 · 연락처는 필수입니다.')
            return
        }

        // 카테고리/예상거래액/메모를 message로 통합 (Lead 모델의 message 단일 필드)
        const message = [
            categories.length ? `관심 카테고리: ${categories.join(', ')}` : '',
            expectedVolume ? `월 예상 거래액: ${expectedVolume}` : '',
            memo,
        ].filter(Boolean).join('\n')

        setSubmitting(true)
        setError(null)
        try {
            await createLead({ companyName, contactName, phone, email: email || undefined, message: message || undefined, source: 'LANDING' })
            setDone(true)
        } catch (err) {
            console.error('Failed to submit lead:', err)
            setError('문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(31, 41, 55, 0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px', backdropFilter: 'blur(4px)',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: C.surface, borderRadius: '16px',
                    maxWidth: '520px', width: '100%',
                    maxHeight: '90vh', overflow: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                }}
            >
                {done ? (
                    <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: C.primaryLight, color: C.primary,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '36px', marginBottom: '20px',
                        }}>✓</div>
                        <h3 style={{ fontSize: '22px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
                            문의 접수 완료
                        </h3>
                        <p style={{ fontSize: '15px', color: C.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
                            1 영업일 내 영업담당이 연락드립니다.<br />
                            감사합니다.
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                background: C.primary, color: '#fff', border: 0,
                                borderRadius: '8px', padding: '12px 32px',
                                fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                            }}
                        >확인</button>
                    </div>
                ) : (
                    <>
                        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${C.border}` }}>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>
                                거래 문의하기
                            </h2>
                            <p style={{ fontSize: '13px', color: C.textMuted, marginTop: '4px' }}>
                                문의 후 1 영업일 내 회신드립니다.
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: '24px 32px' }}>
                            <FormField label="회사명 / 상호" required name="companyName" />
                            <FormField label="담당자명" required name="contactName" />
                            <FormField label="연락처" required name="phone" type="tel" placeholder="010-0000-0000" />
                            <FormField label="이메일" name="email" type="email" />
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>
                                    관심 카테고리
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['육류', '채소(예정)', '양념·가공식품(예정)', '기타'].map(c => (
                                        <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                                            <input type="checkbox" name="categories" value={c} />
                                            {c}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <FormField label="월 예상 거래액 (선택)" name="expectedVolume" as="select" options={['~500만원', '500~2000만원', '2000만원 이상']} />
                            <FormField label="문의 내용 (선택)" name="memo" as="textarea" placeholder="궁금하신 사항을 자유롭게 적어주세요." />
                            {error && (
                                <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500, marginTop: '8px' }}>{error}</div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                                <button type="button" onClick={onClose} style={{
                                    flex: 1, background: 'transparent', color: C.textMuted,
                                    border: `1px solid ${C.border}`, borderRadius: '8px',
                                    padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                }}>취소</button>
                                <button type="submit" disabled={submitting} style={{
                                    flex: 2, background: C.primary, color: '#fff', border: 0,
                                    borderRadius: '8px', padding: '12px',
                                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                    opacity: submitting ? 0.6 : 1,
                                }}>{submitting ? '전송 중...' : '문의 보내기'}</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

function FormField({ label, required, name, type = 'text', placeholder, as, options }: {
    label: string; required?: boolean; name: string; type?: string; placeholder?: string;
    as?: 'textarea' | 'select'; options?: string[]
}) {
    const baseStyle: React.CSSProperties = {
        width: '100%', padding: '10px 12px', fontSize: '14px',
        border: `1px solid ${C.border}`, borderRadius: '8px',
        background: C.surface, color: C.text, outline: 'none',
        fontFamily: FONT,
    }
    return (
        <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>
                {label} {required && <span style={{ color: C.accent }}>*</span>}
            </label>
            {as === 'textarea' ? (
                <textarea name={name} placeholder={placeholder} rows={3} style={baseStyle} />
            ) : as === 'select' ? (
                <select name={name} style={baseStyle}>
                    <option value="">선택 안 함</option>
                    {options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : (
                <input name={name} type={type} placeholder={placeholder} required={required} style={baseStyle} />
            )}
        </div>
    )
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function LandingV2() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [contactOpen, setContactOpen] = useState(false)

    // 라이브 상품 데이터 (히어로 라벨 + 트러스트바 지표) — products는 공개 read
    const [products, setProducts] = useState<FirestoreProduct[]>([])
    const [heroIdx, setHeroIdx] = useState(0)
    useEffect(() => {
        getAllProducts().then(all => setProducts(all.filter(p => p.isActive !== false))).catch(() => {})
    }, [])
    useEffect(() => {
        if (products.length < 2) return
        const t = setInterval(() => setHeroIdx(i => (i + 1) % products.length), 2600)
        return () => clearInterval(t)
    }, [products])
    const liveLabel = products.length > 0 ? products[heroIdx % products.length].name : '한우 1등급'
    const productCount = products.length
    const recentCount = useMemo(() => {
        const now = Date.now()
        return products.filter(p => {
            const t = (p.createdAt as any)?.toDate ? (p.createdAt as any).toDate().getTime() : 0
            return t && (now - t) < 7 * 86400000
        }).length
    }, [products])

    return (
        <div style={{
            background: C.bg, color: C.text, minHeight: '100vh',
            fontFamily: FONT, lineHeight: 1.6,
        }}>
            {/* ============ HEADER ============ */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(254, 252, 248, 0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${C.border}`,
            }}>
                <div style={maxContainer}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
                        <div
                            onClick={() => navigate('/')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        >
                            <div style={{
                                minWidth: '44px', height: '36px', borderRadius: '8px',
                                background: C.primary, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '15px', fontWeight: 800, letterSpacing: '-0.5px',
                                padding: '0 8px',
                            }}>믿고</div>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: C.secondary, letterSpacing: '-0.5px' }}>
                                MEATGO
                            </span>
                        </div>
                        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <NavLink onClick={() => navigate('/products')}>상품</NavLink>
                            <NavLink onClick={() => document.getElementById('supplier')?.scrollIntoView({ behavior: 'smooth' })}>공급사</NavLink>
                            <NavLink onClick={() => setContactOpen(true)}>거래문의</NavLink>
                            {user ? (
                                <button onClick={() => navigate(getDefaultPathForRole(user.role))} style={btnPrimary}>대시보드</button>
                            ) : (
                                <button onClick={() => navigate('/login')} style={btnGhost}>로그인</button>
                            )}
                        </nav>
                    </div>
                </div>
            </header>

            {/* ============ HERO ============ */}
            <section style={{ ...maxContainer, padding: '80px 24px 64px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '64px', alignItems: 'center' }}>
                    <div>
                        <div style={capsule}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.primary, display: 'inline-block' }}></span>
                            B2B 육류 유통 플랫폼
                        </div>
                        <h1 style={{
                            fontSize: '56px', fontWeight: 800, lineHeight: 1.15,
                            color: C.secondary, marginTop: '20px', letterSpacing: '-1.5px',
                        }}>
                            AI로 똑똑해진<br />
                            당신의 축산 유통 파트너<br />
                            <span style={{ color: C.primary }}>'믿고'</span>
                        </h1>
                        <p style={{
                            fontSize: '17px', color: C.textMuted, marginTop: '24px',
                            maxWidth: '500px', lineHeight: 1.7,
                        }}>
                            MEATGO는 영세·중형 식당이 데이터 기반으로<br />
                            발주·정산·물류를 한 곳에서 처리하는<br />
                            <strong style={{ color: C.text }}>B2B 유통 플랫폼</strong>입니다.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '36px', flexWrap: 'wrap' }}>
                            <button onClick={() => navigate('/products')} style={btnPrimaryLg}>
                                🥩 상품 보러가기 →
                            </button>
                            <button onClick={() => setContactOpen(true)} style={btnSecondaryLg}>
                                거래 문의하기
                            </button>
                        </div>
                    </div>
                    <HeroVisual label={liveLabel} />
                </div>
            </section>

            {/* ============ TRUST BAR ============ */}
            <section style={{ background: C.secondary, color: '#fff', padding: '24px 0' }}>
                <div style={maxContainer}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
                        textAlign: 'center', fontSize: '14px',
                    }}>
                        <TrustItem icon="📦" text={productCount > 0 ? `취급 품목 ${productCount}종` : '신선·냉동 전 품목'} />
                        <TrustItem icon="✓" text="HACCP 인증 공급망" />
                        <TrustItem icon="✓" text="콜드체인 99.5%" />
                        <TrustItem icon={recentCount > 0 ? '🆕' : '✓'} text={recentCount > 0 ? `이번 주 신규 ${recentCount}건 입고` : '새벽배송 (서울·경기)'} />
                    </div>
                </div>
            </section>

            {/* ============ AI 의사결정 브리핑 (차별화 핵심) ============ */}
            <AIBriefingSection />

            {/* ============ 플랫폼 흐름 (발주~정산 E2E) ============ */}
            <PlatformFlowSection />

            {/* ============ WHY MEATGO ============ */}
            <section style={{ ...maxContainer, padding: '96px 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: C.primary, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Why MEATGO?
                    </p>
                    <h2 style={{ fontSize: '40px', fontWeight: 800, color: C.secondary, marginTop: '12px', letterSpacing: '-1px' }}>
                        왜 다른가요?
                    </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    <ValueCard icon="💰" title="안정적 단가"
                        body="축산물품질평가원·KAMIS의 실시간 시장가를 모니터링. 급등기에도 거래처를 단가 충격으로부터 보호합니다."
                    />
                    <ValueCard icon="⚡" title="자동화된 발주·정산"
                        body="주문장 → 출고 → 정산까지 한 흐름. 외상 장부, 정산서, 세금계산서 모두 자동. 주말 야근 끝."
                    />
                    <ValueCard icon="📊" title="데이터 기반 결정"
                        body="이번 주 매수 타이밍, 재고 처분 추천, 거래처별 수익성 분석. 데이터가 답을 줍니다."
                    />
                </div>
            </section>

            {/* ============ HOW IT WORKS ============ */}
            <section style={{ background: C.surfaceAlt, padding: '96px 0' }}>
                <div style={maxContainer}>
                    <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: C.primary, letterSpacing: '1px', textTransform: 'uppercase' }}>
                            How it Works
                        </p>
                        <h2 style={{ fontSize: '40px', fontWeight: 800, color: C.secondary, marginTop: '12px', letterSpacing: '-1px' }}>
                            네 단계로 끝나는 거래
                        </h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        <StepCard n={1} icon="📋" title="거래 등록" body="영업담당과 간단한 거래 조건 설정. 매일 단가표가 전송됩니다." />
                        <StepCard n={2} icon="📦" title="발주" body="원하는 품목을 한번에 발주. 익일 새벽 입고." />
                        <StepCard n={3} icon="✅" title="검수" body="창고 입고 시 실시간 검수와 사진 기록." />
                        <StepCard n={4} icon="💳" title="정산" body="실중량 기준 정산서 자동발행. 외상 자동 추적." />
                    </div>
                </div>
            </section>

            {/* ============ CATEGORIES ============ */}
            <section style={{ ...maxContainer, padding: '96px 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: C.primary, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Categories
                    </p>
                    <h2 style={{ fontSize: '40px', fontWeight: 800, color: C.secondary, marginTop: '12px', letterSpacing: '-1px' }}>
                        취급 카테고리
                    </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                    <CategoryCard emoji="🥩" name="육류" status="NOW SERVING" statusColor={C.primary}
                        desc="한우·돼지·오리·닭, 냉장/냉동/부산물"
                        imageUrl="/images/category-meat.jpg"
                        active onClick={() => navigate('/products')}
                    />
                    <CategoryCard emoji="🥬" name="채소" status="Q1 2027 OPEN" statusColor={C.accent}
                        desc="산지직송, 친환경·유기농 (예정)"
                        imageUrl="/images/category-veg.jpg"
                    />
                    <CategoryCard emoji="🌶️" name="양념·가공식품" status="Q2 2027" statusColor={C.textFaint}
                        desc="장류, 소스, 가공식품 (예정)"
                        imageUrl="/images/category-sauce.jpg"
                    />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <button onClick={() => navigate('/products')} style={btnSecondaryLg}>
                        전체 상품 둘러보기 →
                    </button>
                </div>
            </section>

            {/* ============ SUPPLIER SECTION ============ */}
            <section id="supplier" style={{ background: C.secondary, color: '#fff', padding: '96px 0' }}>
                <div style={maxContainer}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '64px', alignItems: 'center' }}>
                        <div style={{
                            aspectRatio: '4/3', borderRadius: '16px', overflow: 'hidden',
                            position: 'relative',
                            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
                        }}>
                            <img src="/images/supplier-farm.jpg" alt="공급사·농가"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                loading="lazy"
                            />
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: `linear-gradient(135deg, rgba(4, 120, 87, 0.4) 0%, rgba(6, 95, 70, 0.55) 100%)`,
                            }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: C.primaryLight, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                For Suppliers
                            </p>
                            <h2 style={{ fontSize: '36px', fontWeight: 800, marginTop: '12px', letterSpacing: '-1px' }}>
                                공급사이신가요?<br />
                                <span style={{ color: C.primaryLight }}>안정적인 판로</span>가 필요하신가요?
                            </h2>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 32px' }}>
                                {[
                                    ['💰', '빠른 결제 (D+7)'],
                                    ['📊', '수요예측 데이터 제공'],
                                    ['📋', '디지털 출고·이력 관리'],
                                ].map(([icon, text]) => (
                                    <li key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontSize: '16px', color: '#E5E7EB' }}>
                                        <span style={{ fontSize: '20px' }}>{icon}</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => navigate('/supplier/apply')} style={{
                                background: C.primary, color: '#fff', border: 0,
                                borderRadius: '10px', padding: '14px 28px',
                                fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                            }}>공급사 신청 →</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ FINAL CTA ============ */}
            <section style={{ ...maxContainer, padding: '96px 24px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '44px', fontWeight: 800, color: C.secondary, letterSpacing: '-1.2px', marginBottom: '16px' }}>
                    오늘 견적부터 받아보세요.
                </h2>
                <p style={{ fontSize: '16px', color: C.textMuted, marginBottom: '32px' }}>
                    바로 주문할 수 있습니다.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/products')} style={btnPrimaryLg}>
                        🥩 상품 보러가기 →
                    </button>
                    <button onClick={() => setContactOpen(true)} style={btnSecondaryLg}>
                        거래 문의하기
                    </button>
                </div>
            </section>

            {/* ============ FOOTER ============ */}
            <footer style={{ background: C.surfaceAlt, borderTop: `1px solid ${C.border}`, padding: '48px 0 32px' }}>
                <div style={maxContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{
                                    minWidth: '40px', height: '32px', borderRadius: '8px', background: C.primary, color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800,
                                    letterSpacing: '-0.5px', padding: '0 8px',
                                }}>믿고</div>
                                <span style={{ fontSize: '18px', fontWeight: 700, color: C.secondary }}>MEATGO</span>
                            </div>
                            <p style={{ fontSize: '13px', color: C.textMuted }}>
                                Meat Intelligence Operating System
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: C.textMuted }}>
                            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
                            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); setContactOpen(true) }} style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
                            <a onClick={() => navigate('/')} style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}>회사소개</a>
                        </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '20px', fontSize: '12px', color: C.textFaint }}>
                        © {new Date().getFullYear()} MEATGO Inc. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* ============ MODALS ============ */}
            {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}

            {/* Responsive — 768px 이하 */}
            <style>{`
                @media (max-width: 768px) {
                    section [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
                    h1 { font-size: 38px !important; }
                    h2 { font-size: 28px !important; }
                }
            `}</style>
        </div>
    )
}

// ============================================
// 보조 컴포넌트
// ============================================
function HeroVisual({ label }: { label: string }) {
    return (
        <div style={{
            aspectRatio: '4/3', borderRadius: '20px',
            border: `1px solid ${C.border}`,
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(31, 41, 55, 0.12)',
        }}>
            <img src="/images/hero-meat.jpg" alt="신선한 정육"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="eager"
            />
            {/* 오버레이 — 텍스트 가독성을 위한 어두운 그라데이션 */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(31, 41, 55, 0.45) 100%)',
            }} />
            <div style={{
                position: 'absolute', bottom: '20px', left: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                padding: '12px 16px', fontSize: '13px', color: C.text,
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                fontWeight: 500,
            }}>
                <span className="mg-pulse" style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: C.primary,
                }} />
                <span>지금 입고 중 · <strong style={{ fontWeight: 700 }}>{label}</strong></span>
            </div>
            <div style={{
                position: 'absolute', top: '20px', right: '20px',
                background: C.accent, color: '#fff', borderRadius: '999px',
                padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)',
            }}>면세</div>
        </div>
    )
}

function TrustItem({ icon, text }: { icon: string; text: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ color: C.primaryLight, fontWeight: 700 }}>{icon}</span>
            <span>{text}</span>
        </div>
    )
}

function ValueCard({ icon, title, body }: { icon: string; title: string; body: string }) {
    return (
        <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '32px 28px',
            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = C.primary }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = C.border }}
        >
            <div style={{
                width: '56px', height: '56px', borderRadius: '12px',
                background: C.primaryLight, color: C.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', marginBottom: '20px',
            }}>{icon}</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.secondary, marginBottom: '12px' }}>
                {title}
            </h3>
            <p style={{ fontSize: '15px', color: C.textMuted, lineHeight: 1.7, margin: 0 }}>
                {body}
            </p>
        </div>
    )
}

function StepCard({ n, icon, title, body }: { n: number; icon: string; title: string; body: string }) {
    return (
        <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '24px', position: 'relative',
        }}>
            <div style={{
                position: 'absolute', top: '-12px', left: '20px',
                background: C.secondary, color: '#fff',
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700,
            }}>{n}</div>
            <div style={{ fontSize: '36px', marginTop: '4px', marginBottom: '12px' }}>{icon}</div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: C.secondary, marginBottom: '8px' }}>{title}</h4>
            <p style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{body}</p>
        </div>
    )
}

function CategoryCard({ emoji, name, status, statusColor, desc, active, onClick, imageUrl }: {
    emoji: string; name: string; status: string; statusColor: string; desc: string;
    active?: boolean; onClick?: () => void; imageUrl?: string
}) {
    return (
        <div onClick={onClick} style={{
            background: C.surface, border: `1px solid ${active ? C.primary : C.border}`,
            borderRadius: '16px', overflow: 'hidden',
            cursor: onClick ? 'pointer' : 'default',
            position: 'relative',
            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
            opacity: active ? 1 : 0.92,
        }}
            onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.10)' } }}
            onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' } }}
        >
            {/* 이미지 */}
            <div style={{ aspectRatio: '16/10', width: '100%', overflow: 'hidden', position: 'relative', background: '#f3f4f6' }}>
                {imageUrl ? (
                    <img src={imageUrl} alt={name}
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                            filter: active ? 'none' : 'grayscale(40%) brightness(0.95)',
                            transition: 'filter 0.2s',
                        }}
                        loading="lazy"
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>
                        {emoji}
                    </div>
                )}
                {/* 상태 뱃지 */}
                {active && <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    background: C.primary, color: '#fff',
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>{status}</div>}
                {!active && <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    background: 'rgba(255,255,255,0.95)', color: statusColor,
                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px',
                    border: `1px solid ${C.border}`,
                }}>{status}</div>}
            </div>
            {/* 텍스트 */}
            <div style={{ padding: '20px 24px 24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.secondary, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{emoji}</span>
                    {name}
                </h3>
                <p style={{ fontSize: '13px', color: C.textMuted, margin: 0 }}>{desc}</p>
            </div>
        </div>
    )
}

function NavLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: 'transparent', border: 0, color: C.text,
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                fontFamily: FONT,
            }}
        >{children}</button>
    )
}

// ============================================
// AI 의사결정 브리핑 (제품 차별화 핵심 — 제품의 깊이를 보여줌)
// ============================================
const DECISIONS = [
    { tag: '매수 타이밍', icon: '📈', title: '삼겹살 — 강력 매수', score: '78', reason: '경락가 60일 최저 · 환율↑로 원가 상승 예상', accent: '#047857', bg: 'rgba(4,120,87,0.12)' },
    { tag: '판매 가격', icon: '🏷️', title: '목심 단가 −3% 권장', score: 'CM 31%', reason: '재고 과잉 → 회전 촉진', accent: '#D97706', bg: 'rgba(217,119,6,0.12)' },
    { tag: '재고 처분', icon: '⏳', title: '등심 9일 내 소진 필요', score: '할인 18%', reason: '유통기한 잔여 < 소진 예상일', accent: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
    { tag: '거래처 이탈', icon: '⚠️', title: '○○식당 이탈 위험 76', score: 'High', reason: '발주 18일째 없음(평소 6일) · 금액 −40%', accent: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
    { tag: '수요 예측', icon: '🔮', title: '다음 주 +12% 증가 전망', score: '320kg', reason: '명절 수요 · 4주 추세 상승', accent: '#1D4ED8', bg: 'rgba(29,78,216,0.12)' },
    { tag: '공급사 평가', icon: '🏭', title: '△△미트 신뢰도 B → C', score: '하락', reason: '입고 지연율 상승 · 단가 변동 확대', accent: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
]

function AIBriefingSection() {
    return (
        <section style={{ background: C.surfaceAlt, padding: '100px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
            <div style={maxContainer}>
                <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
                    <div style={capsule}>⚡ AI DECISION SUPPORT</div>
                    <h2 style={{ fontSize: '40px', fontWeight: 800, color: C.secondary, marginTop: '16px', letterSpacing: '-1px', lineHeight: 1.2 }}>
                        매일 아침, <span style={{ color: C.primary }}>AI가 오늘의 결정</span>을 브리핑합니다
                    </h2>
                    <p style={{ fontSize: '17px', color: C.textMuted, marginTop: '16px', lineHeight: 1.7 }}>
                        축산 시세 · 수급 · 자체 거래 데이터를 종합해 <strong style={{ color: C.text }}>매수 타이밍부터 가격·재고·거래처 이탈까지</strong> — 감이 아니라 데이터로 판단합니다.
                    </p>
                </div>

                {/* 제품 목업 패널 */}
                <div style={{
                    background: C.secondary, borderRadius: '20px', padding: '24px',
                    boxShadow: '0 24px 60px rgba(31,41,55,0.28)', overflow: 'hidden',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#fff' }}>
                        <span style={{ display: 'flex', gap: '6px' }}>
                            {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <span key={c} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c }} />)}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: 700, marginLeft: '6px' }}>🌅 오늘의 의사결정 브리핑</span>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF' }}>실시간 데이터 · 6개 추천</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                        {DECISIONS.map((d, i) => (
                            <div key={d.tag} className="mg-fade-up" style={{
                                background: '#fff', borderRadius: '14px', padding: '16px',
                                borderLeft: `4px solid ${d.accent}`, animationDelay: `${i * 0.06}s`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.3px' }}>{d.icon} {d.tag}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: d.accent, background: d.bg, padding: '2px 8px', borderRadius: '999px' }}>{d.score}</span>
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: C.secondary, marginBottom: '6px', lineHeight: 1.3 }}>{d.title}</div>
                                <div style={{ fontSize: '12px', color: C.textMuted, lineHeight: 1.5 }}>{d.reason}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <p style={{ fontSize: '13px', color: C.textFaint, textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
                    * 정부 공식 시세(축산물품질평가원 경락가 · aT KAMIS)와 자체 거래 데이터 기반.<br />
                    모든 추천은 <strong>근거와 신뢰도</strong>를 함께 제시하며, 최종 결정은 담당자가 승인합니다.
                </p>
            </div>
        </section>
    )
}

// ============================================
// 플랫폼 흐름 — 발주~정산 End-to-End
// ============================================
const FLOW_STEPS = [
    { icon: '📋', title: '주문 접수', body: '고객 발주·견적, 단가표 자동 전송' },
    { icon: '✅', title: '검토·확정', body: '수량·단가 검수 후 확정' },
    { icon: '🚚', title: '배차·출고', body: '콜드체인 차량 추천·배차' },
    { icon: '📦', title: '입고·검수', body: '창고 게이트 검수·서명' },
    { icon: '💰', title: '정산·미수', body: '공헌이익·미수채권 자동 집계' },
]
const CAPABILITIES = ['거래처 수익성 분석', '자동발주 템플릿', '공급사 셀프 온보딩', '실사 상품 카탈로그', '재고 입출고', '단가표 관리']

function PlatformFlowSection() {
    return (
        <section style={{ ...maxContainer, padding: '100px 24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px' }}>
                <div style={capsule}>🔗 ONE PLATFORM</div>
                <h2 style={{ fontSize: '40px', fontWeight: 800, color: C.secondary, marginTop: '16px', letterSpacing: '-1px', lineHeight: 1.2 }}>
                    발주 한 번으로, <span style={{ color: C.primary }}>정산까지 한 흐름</span>으로
                </h2>
                <p style={{ fontSize: '17px', color: C.textMuted, marginTop: '16px', lineHeight: 1.7 }}>
                    수발주·물류·정산이 흩어진 엑셀·카톡·전화를 하나의 데이터로. 한 번 입력하면 끝까지 연결됩니다.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
                {FLOW_STEPS.map((s, i) => (
                    <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px',
                            padding: '20px 18px', width: '180px', textAlign: 'center', boxShadow: '0 2px 8px rgba(31,41,55,0.06)',
                        }}>
                            <div style={{ fontSize: '30px', marginBottom: '8px' }}>{s.icon}</div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: C.secondary, marginBottom: '4px' }}>{s.title}</div>
                            <div style={{ fontSize: '12px', color: C.textMuted, lineHeight: 1.5 }}>{s.body}</div>
                        </div>
                        {i < FLOW_STEPS.length - 1 && <span style={{ color: C.primary, fontSize: '20px', fontWeight: 800 }}>→</span>}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {CAPABILITIES.map(c => (
                    <span key={c} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: C.primaryLight, color: C.primaryDark, borderRadius: '999px',
                        padding: '8px 16px', fontSize: '14px', fontWeight: 600,
                    }}>✓ {c}</span>
                ))}
            </div>
        </section>
    )
}

// ============================================
// 스타일 토큰
// ============================================
const maxContainer: React.CSSProperties = {
    maxWidth: '1200px', margin: '0 auto', padding: '0 24px',
}

const capsule: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: C.primaryLight, color: C.primaryDark,
    padding: '6px 14px', borderRadius: '999px',
    fontSize: '12px', fontWeight: 600, letterSpacing: '0.3px',
}

const btnBase: React.CSSProperties = {
    border: 0, borderRadius: '10px', cursor: 'pointer',
    fontFamily: FONT, fontWeight: 600, transition: 'all 0.15s',
}

const btnPrimary: React.CSSProperties = {
    ...btnBase, background: C.primary, color: '#fff',
    padding: '10px 20px', fontSize: '14px',
}

const btnPrimaryLg: React.CSSProperties = {
    ...btnBase, background: C.primary, color: '#fff',
    padding: '14px 28px', fontSize: '15px',
    boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
}

const btnSecondaryLg: React.CSSProperties = {
    ...btnBase, background: C.surface, color: C.secondary,
    border: `1.5px solid ${C.border}`,
    padding: '14px 28px', fontSize: '15px',
}

const btnGhost: React.CSSProperties = {
    ...btnBase, background: 'transparent', color: C.text,
    border: `1px solid ${C.border}`, padding: '8px 18px', fontSize: '14px',
}
