import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore'
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage'
import { db, storage } from './firebase'

// ============ 타입 ============

export type FileType =
    | 'BIZ_REG'
    | 'BANK_BOOK'
    | 'OUTBOUND_STATEMENT'
    | 'TEMP_LOG'
    | 'LOAD_PHOTO'
    | 'UNLOAD_PHOTO'
    | 'COMPANY_DOC'
    | 'COMPANY_PROFILE'
    | 'PRODUCT_IMAGE'
    | 'OTHER'

export type RelatedType =
    | 'USER'
    | 'COMPANY'
    | 'SALES_ORDER'
    | 'SHIPMENT'
    | 'SUPPLIER'
    | 'PRODUCT'

export interface FirestoreFileAttachment {
    id: string
    fileType: FileType
    relatedType: RelatedType
    relatedId: string
    fileName: string
    storagePath: string
    downloadUrl: string
    mimeType: string
    fileSizeBytes: number
    description?: string
    metadata?: Record<string, any>
    uploadedBy: string
    uploadedAt: Timestamp
}

const COLLECTION = 'fileAttachments'
const filesRef = collection(db, COLLECTION)

// ============ 업로드 ============

export interface UploadParams {
    file: File | Blob
    fileName: string
    fileType: FileType
    relatedType: RelatedType
    relatedId: string
    description?: string
    metadata?: Record<string, any>
    uploadedBy: string
}

export async function uploadFile(
    params: UploadParams
): Promise<FirestoreFileAttachment> {
    const timestamp = Date.now()
    const safeName = params.fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
    const storagePath = `files/${params.relatedType}/${params.relatedId}/${params.fileType}/${timestamp}_${safeName}`

    const storageRef = ref(storage, storagePath)
    const snap = await uploadBytes(storageRef, params.file, {
        contentType: (params.file as File).type || 'application/octet-stream',
    })
    const downloadUrl = await getDownloadURL(snap.ref)

    const docRef = await addDoc(filesRef, {
        fileType: params.fileType,
        relatedType: params.relatedType,
        relatedId: params.relatedId,
        fileName: params.fileName,
        storagePath,
        downloadUrl,
        mimeType: (params.file as File).type || 'application/octet-stream',
        fileSizeBytes: (params.file as File).size || 0,
        description: params.description || null,
        metadata: params.metadata || null,
        uploadedBy: params.uploadedBy,
        uploadedAt: serverTimestamp(),
    })

    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreFileAttachment
}

// ============ 조회 ============

export async function getFilesByRelated(
    relatedType: RelatedType,
    relatedId: string,
    fileType?: FileType
): Promise<FirestoreFileAttachment[]> {
    let q
    if (fileType) {
        q = query(
            filesRef,
            where('relatedType', '==', relatedType),
            where('relatedId', '==', relatedId),
            where('fileType', '==', fileType),
            orderBy('uploadedAt', 'desc')
        )
    } else {
        q = query(
            filesRef,
            where('relatedType', '==', relatedType),
            where('relatedId', '==', relatedId),
            orderBy('uploadedAt', 'desc')
        )
    }

    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreFileAttachment))
}

export async function getFileById(id: string): Promise<FirestoreFileAttachment | null> {
    const docRef = doc(db, COLLECTION, id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as FirestoreFileAttachment
}

export async function getCompanyDocuments(): Promise<FirestoreFileAttachment[]> {
    return getFilesByRelated('COMPANY', 'meatgo')
}

// ============ 삭제 ============

export async function deleteFile(fileId: string): Promise<void> {
    const file = await getFileById(fileId)
    if (!file) throw new Error('File not found')

    try {
        const storageRef = ref(storage, file.storagePath)
        await deleteObject(storageRef)
    } catch (err) {
        console.warn('Storage delete failed (ignored):', err)
    }

    await deleteDoc(doc(db, COLLECTION, fileId))
}

// ============ 헬퍼 ============

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/')
}

export function isPdfFile(mimeType: string): boolean {
    return mimeType === 'application/pdf'
}
