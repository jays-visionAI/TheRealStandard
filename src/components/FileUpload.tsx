import { useState, useRef } from 'react'
import {
    uploadFile,
    formatFileSize,
    isImageFile,
    isPdfFile,
    type FileType,
    type RelatedType,
    type FirestoreFileAttachment,
} from '../lib/fileService'
import { useAuth } from '../contexts/AuthContext'
import {
    FilePlusIcon,
    FileTextIcon,
    TrashIcon,
    EyeIcon,
} from './Icons'
import './FileUpload.css'

interface FileUploadProps {
    fileType: FileType
    relatedType: RelatedType
    relatedId: string
    label?: string
    accept?: string
    maxSizeMB?: number
    description?: string
    onUploaded?: (file: FirestoreFileAttachment) => void
    disabled?: boolean
}

export default function FileUpload({
    fileType,
    relatedType,
    relatedId,
    label = '파일 선택',
    accept = 'image/*,application/pdf',
    maxSizeMB = 10,
    description,
    onUploaded,
    disabled = false,
}: FileUploadProps) {
    const { user } = useAuth()
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setError(null)

        const maxBytes = maxSizeMB * 1024 * 1024
        if (file.size > maxBytes) {
            setError(`파일 크기가 ${maxSizeMB}MB를 초과합니다.`)
            return
        }

        try {
            setUploading(true)
            setProgress(30)
            const result = await uploadFile({
                file,
                fileName: file.name,
                fileType,
                relatedType,
                relatedId,
                description,
                uploadedBy: user.id,
            })
            setProgress(100)
            onUploaded?.(result)

            if (inputRef.current) inputRef.current.value = ''
        } catch (err) {
            console.error(err)
            setError('업로드 중 오류가 발생했습니다.')
        } finally {
            setTimeout(() => {
                setUploading(false)
                setProgress(0)
            }, 500)
        }
    }

    return (
        <div className="file-upload">
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                disabled={disabled || uploading}
                style={{ display: 'none' }}
            />
            <button
                type="button"
                className="upload-btn"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
            >
                <FilePlusIcon size={14} />
                {uploading ? ` 업로드 중... ${progress}%` : ` ${label}`}
            </button>
            <span className="upload-hint">
                {accept.includes('image') && '이미지 '}
                {accept.includes('pdf') && 'PDF '}
                / 최대 {maxSizeMB}MB
            </span>
            {error && <p className="upload-error">{error}</p>}
        </div>
    )
}

// ============ FileList 공용 컴포넌트 ============

interface FileListProps {
    files: FirestoreFileAttachment[]
    onDelete?: (fileId: string) => void
    showDownload?: boolean
}

export function FileList({ files, onDelete, showDownload = true }: FileListProps) {
    if (files.length === 0) {
        return <p className="file-list-empty">업로드된 파일이 없습니다.</p>
    }

    return (
        <div className="file-list">
            {files.map(f => (
                <div key={f.id} className="file-list-item">
                    <span className="file-icon">
                        {isImageFile(f.mimeType)
                            ? <EyeIcon size={16} />
                            : <FileTextIcon size={16} />}
                    </span>
                    <div className="file-info">
                        <span className="file-name">{f.fileName}</span>
                        <span className="file-meta">
                            {formatFileSize(f.fileSizeBytes)}
                            {f.uploadedAt && ` · ${f.uploadedAt.toDate().toLocaleDateString('ko-KR')}`}
                        </span>
                    </div>
                    {showDownload && (
                        <a
                            href={f.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-download"
                        >
                            다운로드
                        </a>
                    )}
                    {onDelete && (
                        <button className="file-delete" onClick={() => onDelete(f.id)}>
                            <TrashIcon size={14} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
