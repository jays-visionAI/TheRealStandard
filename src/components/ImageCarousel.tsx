import { useState, type ReactNode } from 'react'

interface ImageCarouselProps {
    images: string[]
    alt: string
    /** 이미지가 없을 때 표시할 플레이스홀더 */
    fallback?: ReactNode
    /** object-fit (기본 cover) */
    fit?: 'cover' | 'contain'
}

/**
 * 다중 이미지 캐러셀 — 좌우 화살표 + 하단 도트 인디케이터.
 * - 이미지가 1장이면 화살표/도트를 숨기고 단일 이미지처럼 동작.
 * - 부모가 크기(aspectRatio/height)를 지정한 컨테이너 안에서 100% 채움.
 * - 외부 CSS 의존 없는 인라인 스타일 — 카탈로그 카드/상품 상세 어디서나 재사용.
 */
export default function ImageCarousel({ images, alt, fallback, fit = 'cover' }: ImageCarouselProps) {
    const [index, setIndex] = useState(0)

    if (!images || images.length === 0) {
        return <>{fallback ?? null}</>
    }

    const current = Math.min(index, images.length - 1)
    const multi = images.length > 1

    const go = (e: React.MouseEvent, delta: number) => {
        e.stopPropagation()
        setIndex(prev => {
            const next = (prev + delta + images.length) % images.length
            return next
        })
    }

    const arrowStyle: React.CSSProperties = {
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        width: '30px', height: '30px', borderRadius: '50%',
        background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none',
        cursor: 'pointer', fontSize: '15px', lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
    }

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img
                src={images[current]}
                alt={alt}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: fit }}
            />

            {multi && (
                <>
                    <button
                        aria-label="이전 이미지"
                        onClick={(e) => go(e, -1)}
                        style={{ ...arrowStyle, left: '8px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.7)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.45)' }}
                    >‹</button>
                    <button
                        aria-label="다음 이미지"
                        onClick={(e) => go(e, 1)}
                        style={{ ...arrowStyle, right: '8px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.7)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.45)' }}
                    >›</button>

                    <div style={{
                        position: 'absolute', bottom: '8px', left: 0, right: 0,
                        display: 'flex', justifyContent: 'center', gap: '6px',
                    }}>
                        {images.map((_, i) => (
                            <button
                                key={i}
                                aria-label={`${i + 1}번 이미지`}
                                onClick={(e) => { e.stopPropagation(); setIndex(i) }}
                                style={{
                                    width: '7px', height: '7px', borderRadius: '50%', padding: 0,
                                    border: 'none', cursor: 'pointer',
                                    background: i === current ? '#fff' : 'rgba(255,255,255,0.5)',
                                    boxShadow: '0 0 2px rgba(0,0,0,0.4)',
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
