/**
 * MeatGo 프론트 디자인 시스템 (Forest Green + Charcoal Gold)
 *
 * 공개 영역 (랜딩 / 공개 카탈로그 / 거래문의 등)에서 공통 사용.
 * 어드민 영역(/admin/*)은 별도 시스템 — 이 토큰을 쓰지 않는다.
 */

export const COLOR = {
    // Primary — Forest Green (신선·신뢰·자연)
    primary: '#047857',        // Emerald-700
    primaryDark: '#065F46',    // Emerald-800
    primaryLight: '#D1FAE5',   // Emerald-100 — 캡슐 배경
    primaryAlpha: 'rgba(4, 120, 87, 0.08)',

    // Secondary — Charcoal (정통·프리미엄)
    secondary: '#1F2937',      // Slate-800
    secondaryLight: '#374151', // Slate-700

    // Accent — Amber (따뜻한 강조)
    accent: '#D97706',         // Amber-600
    accentLight: '#FEF3C7',    // Amber-100

    // Neutrals
    bg: '#FEFCF8',             // Warm White — 따뜻한 배경
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',     // 카드 배경 대안
    surfaceDark: '#1F2937',    // 다크 블록 (Supplier 섹션 등)

    // Text
    text: '#1F2937',           // 본문
    textMuted: '#6B7280',      // 서브카피
    textFaint: '#9CA3AF',      // 매우 옅은 텍스트
    textOnDark: '#F3F4F6',     // 다크 배경 위 텍스트

    // Border
    border: '#E5E7EB',
    borderDark: '#D1D5DB',
}

export const FONT = `'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`

export const RADIUS = {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    pill: '999px',
}

export const SHADOW = {
    sm: '0 1px 3px rgba(0,0,0,0.04)',
    md: '0 4px 12px rgba(0,0,0,0.06)',
    lg: '0 12px 24px rgba(0,0,0,0.08)',
    primary: '0 4px 12px rgba(4, 120, 87, 0.25)',
}

export const MAX_W = '1200px'

// 실사 이미지 (Unsplash CDN — public/images/로 미러링되기 전 임시)
// 향후 사용자가 직접 촬영한 사진으로 교체 권장
export const IMAGES = {
    hero: '/images/hero-meat.jpg',
    whyCard1: '/images/why-pricing.jpg',
    whyCard2: '/images/why-automation.jpg',
    whyCard3: '/images/why-data.jpg',
    categoryMeat: '/images/category-meat.jpg',
    categoryVeg: '/images/category-veg.jpg',
    categorySauce: '/images/category-sauce.jpg',
    supplier: '/images/supplier-farm.jpg',
}

// 공용 인라인 스타일 헬퍼
export const containerStyle: React.CSSProperties = {
    maxWidth: MAX_W, margin: '0 auto', padding: '0 24px',
}

export const capsuleStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: COLOR.primaryLight, color: COLOR.primaryDark,
    padding: '6px 14px', borderRadius: RADIUS.pill,
    fontSize: '12px', fontWeight: 600, letterSpacing: '0.3px',
}

export const btnPrimary: React.CSSProperties = {
    background: COLOR.primary, color: '#fff', border: 0,
    borderRadius: RADIUS.md, padding: '14px 28px',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT,
    boxShadow: SHADOW.primary,
    transition: 'transform 0.15s, box-shadow 0.15s',
}

export const btnSecondary: React.CSSProperties = {
    background: COLOR.surface, color: COLOR.secondary,
    border: `1.5px solid ${COLOR.border}`,
    borderRadius: RADIUS.md, padding: '14px 28px',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT,
    transition: 'all 0.15s',
}

export const btnGhost: React.CSSProperties = {
    background: 'transparent', color: COLOR.text,
    border: `1px solid ${COLOR.border}`,
    borderRadius: RADIUS.md, padding: '8px 18px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT,
}
