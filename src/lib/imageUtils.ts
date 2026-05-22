/**
 * 클라이언트 사이드 이미지 리사이즈 유틸.
 * 업로드 시 Canvas API로 썸네일을 생성하여 Firebase Storage 트래픽을 줄인다.
 * Cloud Functions의 image-resize를 안 쓰는 비용 절감 전략.
 */

export interface ResizeOptions {
    maxWidth: number
    maxHeight: number
    quality?: number   // 0~1, JPEG 압축률 (default 0.85)
    mimeType?: string  // 'image/jpeg' | 'image/webp' (default 'image/jpeg')
}

/**
 * File을 받아 Canvas로 리사이즈한 Blob을 반환.
 * 비율을 유지하면서 maxWidth/maxHeight 박스에 맞춤.
 */
export async function resizeImage(file: File, options: ResizeOptions): Promise<Blob> {
    const { maxWidth, maxHeight, quality = 0.85, mimeType = 'image/jpeg' } = options

    const imgUrl = URL.createObjectURL(file)
    try {
        const img = await loadImage(imgUrl)
        const { width, height } = calcFitDimensions(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D context unavailable')

        // 부드러운 다운샘플링
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        const blob = await canvasToBlob(canvas, mimeType, quality)
        return blob
    } finally {
        URL.revokeObjectURL(imgUrl)
    }
}

/**
 * 표준 썸네일 (200x200 박스에 비율 유지) 생성.
 */
export function generateThumbnail(file: File): Promise<Blob> {
    return resizeImage(file, { maxWidth: 200, maxHeight: 200, quality: 0.8 })
}

// ============ 내부 헬퍼 ============

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = url
    })
}

function calcFitDimensions(srcW: number, srcH: number, maxW: number, maxH: number): { width: number; height: number } {
    if (srcW <= maxW && srcH <= maxH) return { width: srcW, height: srcH }
    const ratio = Math.min(maxW / srcW, maxH / srcH)
    return {
        width: Math.round(srcW * ratio),
        height: Math.round(srcH * ratio),
    }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob)
                else reject(new Error('Canvas to Blob conversion failed'))
            },
            mimeType,
            quality
        )
    })
}
