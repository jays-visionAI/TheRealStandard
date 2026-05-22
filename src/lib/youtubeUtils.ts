/**
 * YouTube URL 유틸.
 * 다양한 형태의 YouTube URL을 정규화하여 video ID + embed URL + 썸네일 URL을 추출.
 *
 * 지원하는 입력:
 * - https://www.youtube.com/watch?v=XXXXXXXXXXX
 * - https://youtu.be/XXXXXXXXXXX
 * - https://www.youtube.com/embed/XXXXXXXXXXX
 * - https://www.youtube.com/shorts/XXXXXXXXXXX
 * - https://m.youtube.com/watch?v=XXXXXXXXXXX
 * - XXXXXXXXXXX (raw video ID)
 */

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/

export function extractVideoId(input: string): string | null {
    if (!input) return null
    const trimmed = input.trim()
    if (!trimmed) return null

    // Raw video ID (11자)
    if (VIDEO_ID_REGEX.test(trimmed)) return trimmed

    try {
        const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
        const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')

        if (host === 'youtu.be') {
            const id = url.pathname.slice(1) // /XXX → XXX
            return VIDEO_ID_REGEX.test(id) ? id : null
        }

        if (host === 'youtube.com') {
            // /watch?v=XXX
            const vParam = url.searchParams.get('v')
            if (vParam && VIDEO_ID_REGEX.test(vParam)) return vParam

            // /embed/XXX or /shorts/XXX or /v/XXX
            const segments = url.pathname.split('/').filter(Boolean)
            if (segments.length >= 2 && ['embed', 'shorts', 'v'].includes(segments[0])) {
                if (VIDEO_ID_REGEX.test(segments[1])) return segments[1]
            }
        }
    } catch {
        return null
    }
    return null
}

export function getEmbedUrl(videoIdOrUrl: string): string | null {
    const id = extractVideoId(videoIdOrUrl)
    if (!id) return null
    return `https://www.youtube.com/embed/${id}`
}

export function getThumbnailUrl(videoIdOrUrl: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string | null {
    const id = extractVideoId(videoIdOrUrl)
    if (!id) return null
    const map: Record<string, string> = {
        default: 'default.jpg',
        medium: 'mqdefault.jpg',
        high: 'hqdefault.jpg',
        maxres: 'maxresdefault.jpg',
    }
    return `https://img.youtube.com/vi/${id}/${map[quality]}`
}

/**
 * 정규화된 watch URL을 반환 (저장용).
 * 입력이 어떤 형태든 https://www.youtube.com/watch?v=XXX 로 통일.
 */
export function normalizeYouTubeUrl(input: string): string | null {
    const id = extractVideoId(input)
    if (!id) return null
    return `https://www.youtube.com/watch?v=${id}`
}

export function isValidYouTubeInput(input: string): boolean {
    return extractVideoId(input) !== null
}
