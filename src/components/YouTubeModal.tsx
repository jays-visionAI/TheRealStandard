import { useEffect } from 'react'
import { getEmbedUrl } from '../lib/youtubeUtils'

interface YouTubeModalProps {
    /** YouTube URL 또는 video ID. null/빈값이면 닫힘 처리. */
    videoUrl?: string | null
    isOpen: boolean
    onClose: () => void
    title?: string
}

/**
 * YouTube 영상 재생 라이트박스.
 * - 어떤 형태의 YouTube URL이든 정규화하여 16:9 iframe으로 재생 (autoplay).
 * - ESC / 배경 클릭 / 닫기 버튼으로 종료, 열린 동안 body 스크롤 잠금.
 * - 외부 CSS 의존 없이 인라인 스타일 — 공개/어드민 어디서나 drop-in 사용 가능.
 */
export default function YouTubeModal({ videoUrl, isOpen, onClose, title }: YouTubeModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEsc)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen || !videoUrl) return null

    const embed = getEmbedUrl(videoUrl)
    if (!embed) return null

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'YouTube 영상'}
        >
            <div style={{ position: 'relative', width: '100%', maxWidth: '900px' }}>
                <button
                    onClick={onClose}
                    aria-label="닫기"
                    style={{
                        position: 'absolute', top: '-40px', right: 0,
                        background: 'transparent', border: 'none', color: '#fff',
                        fontSize: '26px', lineHeight: 1, cursor: 'pointer', padding: '4px',
                    }}
                >✕</button>
                {title && (
                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                        {title}
                    </div>
                )}
                <div style={{
                    position: 'relative', width: '100%', paddingTop: '56.25%',
                    borderRadius: '12px', overflow: 'hidden', background: '#000',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}>
                    <iframe
                        src={`${embed}?autoplay=1&rel=0`}
                        title={title || 'YouTube video player'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%', border: 'none',
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
