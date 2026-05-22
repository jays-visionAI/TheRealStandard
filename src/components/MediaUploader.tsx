import { useRef, useState } from 'react'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../lib/firebase'
import { generateThumbnail } from '../lib/imageUtils'
import { extractVideoId, normalizeYouTubeUrl, getThumbnailUrl } from '../lib/youtubeUtils'
import type { ProductMediaImage } from '../lib/productService'

/**
 * 상품 미디어 업로더 — 최대 5장 이미지 (대표 1장 지정) + YouTube 영상 URL.
 * 업로드 시 Canvas로 200x200 썸네일 자동 생성 후 원본+썸네일 모두 Storage에 저장.
 */

interface Props {
    /** 상품 ID (신규 생성 중이면 임시 ID 전달) */
    relatedId: string
    /** 현재 값 */
    images: ProductMediaImage[]
    videoUrl?: string
    /** 변경 콜백 */
    onChange: (next: { images: ProductMediaImage[]; videoUrl?: string }) => void
    /** 최대 이미지 수 (기본 5) */
    maxImages?: number
    uploadedBy?: string
}

const STORAGE_BASE = 'product-media'

export default function MediaUploader({ relatedId, images, videoUrl, onChange, maxImages = 5, uploadedBy }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [videoInput, setVideoInput] = useState(videoUrl || '')
    const [videoError, setVideoError] = useState<string | null>(null)

    const isPrimaryCount = images.filter(i => i.isPrimary).length

    // 이미지 업로드 (단일 또는 다중)
    const handleFiles = async (files: FileList) => {
        if (uploading) return
        const remaining = maxImages - images.length
        if (remaining <= 0) {
            alert(`이미지는 최대 ${maxImages}장까지 업로드 가능합니다.`)
            return
        }
        const filesToUpload = Array.from(files).slice(0, remaining)
        setUploading(true)
        try {
            const newImages: ProductMediaImage[] = []
            for (const file of filesToUpload) {
                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name} 은 5MB를 초과합니다.`)
                    continue
                }
                const ts = Date.now() + Math.floor(Math.random() * 1000)
                const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')

                // 1. 원본 업로드
                const originalPath = `${STORAGE_BASE}/${relatedId}/${ts}_${safeName}`
                const originalRef = storageRef(storage, originalPath)
                await uploadBytes(originalRef, file, { contentType: file.type })
                const originalUrl = await getDownloadURL(originalRef)

                // 2. 썸네일 생성 + 업로드
                let thumbnailUrl: string | undefined
                try {
                    const thumbBlob = await generateThumbnail(file)
                    const thumbPath = `${STORAGE_BASE}/${relatedId}/${ts}_thumb_${safeName}.jpg`
                    const thumbRef = storageRef(storage, thumbPath)
                    await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/jpeg' })
                    thumbnailUrl = await getDownloadURL(thumbRef)
                } catch (err) {
                    console.warn('Thumbnail generation failed (fallback to original):', err)
                }

                newImages.push({
                    url: originalUrl,
                    thumbnailUrl,
                    storagePath: originalPath,
                    // 첫 업로드 + 기존에 대표가 없으면 자동으로 대표 지정
                    isPrimary: images.length === 0 && newImages.length === 0,
                })
            }

            // 대표 이미지가 하나도 없으면 첫 번째를 대표로
            const combined = [...images, ...newImages]
            if (!combined.some(i => i.isPrimary) && combined.length > 0) {
                combined[0].isPrimary = true
            }
            onChange({ images: combined, videoUrl })
        } catch (err: any) {
            console.error('Upload failed:', err)
            alert(err?.message || '이미지 업로드에 실패했습니다.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _u = uploadedBy // 추후 fileAttachments 메타 기록 시 사용 예정
        }
    }

    const setPrimary = (idx: number) => {
        const next = images.map((img, i) => ({ ...img, isPrimary: i === idx }))
        onChange({ images: next, videoUrl })
    }

    const removeImage = async (idx: number) => {
        const img = images[idx]
        // Storage에서 삭제 (실패해도 UI에선 제거)
        try {
            if (img.storagePath) {
                await deleteObject(storageRef(storage, img.storagePath))
            }
        } catch (err) {
            console.warn('Storage delete failed:', err)
        }
        const next = images.filter((_, i) => i !== idx)
        // 삭제한 게 대표였으면 첫 번째를 대표로 승격
        if (img.isPrimary && next.length > 0 && !next.some(i => i.isPrimary)) {
            next[0].isPrimary = true
        }
        onChange({ images: next, videoUrl })
    }

    const handleVideoChange = (v: string) => {
        setVideoInput(v)
        if (!v.trim()) {
            setVideoError(null)
            onChange({ images, videoUrl: undefined })
            return
        }
        const normalized = normalizeYouTubeUrl(v)
        if (!normalized) {
            setVideoError('YouTube URL이 유효하지 않습니다. (예: https://youtu.be/XXXXXXXXXXX)')
        } else {
            setVideoError(null)
            onChange({ images, videoUrl: normalized })
        }
    }

    return (
        <div>
            {/* 이미지 슬롯 그리드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
            }}>
                {images.map((img, idx) => (
                    <div key={idx} style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: img.isPrimary ? '2px solid #047857' : '1px solid #e5e7eb',
                        background: '#f9fafb',
                    }}>
                        <img
                            src={img.thumbnailUrl || img.url}
                            alt={`상품 이미지 ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {img.isPrimary && (
                            <div style={{
                                position: 'absolute', top: '4px', left: '4px',
                                background: '#047857', color: '#fff',
                                fontSize: '10px', fontWeight: 700,
                                padding: '2px 8px', borderRadius: '999px',
                            }}>★ 대표</div>
                        )}
                        <div style={{
                            position: 'absolute', top: '4px', right: '4px',
                            display: 'flex', gap: '4px',
                        }}>
                            {!img.isPrimary && (
                                <button
                                    type="button"
                                    onClick={() => setPrimary(idx)}
                                    title="대표 지정"
                                    style={{
                                        background: 'rgba(255,255,255,0.92)',
                                        border: 0, borderRadius: '4px',
                                        width: '24px', height: '24px',
                                        fontSize: '12px', cursor: 'pointer',
                                    }}
                                >☆</button>
                            )}
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                title="삭제"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.92)', color: '#fff',
                                    border: 0, borderRadius: '4px',
                                    width: '24px', height: '24px',
                                    fontSize: '12px', cursor: 'pointer',
                                    fontWeight: 700,
                                }}
                            >×</button>
                        </div>
                    </div>
                ))}

                {/* 빈 슬롯 */}
                {images.length < maxImages && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            aspectRatio: '1',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db',
                            background: '#f9fafb',
                            cursor: uploading ? 'wait' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: '12px',
                            gap: '4px',
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>+</span>
                        {uploading ? '업로드 중...' : `이미지 추가 (${images.length}/${maxImages})`}
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => e.target.files && handleFiles(e.target.files)}
            />

            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>
                권장: 정사각형, 500×500 px 이상, 5MB 이하. 업로드 시 200×200 썸네일 자동 생성.
                {isPrimaryCount === 0 && images.length > 0 && (
                    <span style={{ color: '#dc2626', marginLeft: '8px' }}>※ 대표 이미지를 1장 지정해주세요.</span>
                )}
            </p>

            {/* YouTube 영상 URL */}
            <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '14px',
            }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>
                    🎬 YouTube 영상 URL (선택)
                </label>
                <input
                    type="text"
                    value={videoInput}
                    onChange={e => handleVideoChange(e.target.value)}
                    placeholder="https://youtu.be/XXXXXXXXXXX"
                    style={{
                        width: '100%', padding: '8px 12px', fontSize: '13px',
                        border: `1px solid ${videoError ? '#dc2626' : '#e5e7eb'}`,
                        borderRadius: '6px', outline: 'none',
                        fontFamily: 'monospace',
                    }}
                />
                {videoError && (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{videoError}</p>
                )}
                {videoUrl && !videoError && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                            src={getThumbnailUrl(videoUrl, 'medium') || ''}
                            alt="영상 썸네일"
                            style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '12px', color: '#047857', fontWeight: 600, margin: 0 }}>
                                ✓ YouTube 영상 ID 인식됨
                            </p>
                            <p style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', margin: '2px 0 0' }}>
                                ID: {extractVideoId(videoUrl)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
