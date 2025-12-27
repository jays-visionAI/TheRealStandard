import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { UserRole } from '../types'

// ============ DOCUMENT SERVICE ============

export interface DocComment {
    id: string
    author: string
    authorId: string
    text: string
    createdAt: Date
}

export interface DocAttachment {
    id: string
    name: string
    size: number
    type: string
    url: string
}

export interface FirestoreDocument {
    id: string
    categoryId: string
    title: string
    content: string
    type: 'MARKDOWN' | 'EMBED' | 'YOUTUBE'
    url?: string
    author: string
    authorId: string
    createdAt: Timestamp
    updatedAt: Timestamp
    comments: DocComment[]
    attachments: DocAttachment[]
}

export interface DocCategory {
    id: string
    name: string
    order: number
    allowedRoles?: UserRole[]
}

const DOCUMENTS_COLLECTION = 'documents'
const DOC_CATEGORIES_COLLECTION = 'docCategories'

// ============ CATEGORIES ============
export async function getAllCategories(): Promise<DocCategory[]> {
    const snapshot = await getDocs(collection(db, DOC_CATEGORIES_COLLECTION))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocCategory))
}

export async function createCategory(name: string, order: number, allowedRoles?: UserRole[]): Promise<DocCategory> {
    const newDocRef = doc(collection(db, DOC_CATEGORIES_COLLECTION))
    const data = { name, order, allowedRoles: allowedRoles || null }
    await setDoc(newDocRef, data)
    return { id: newDocRef.id, name, order, allowedRoles }
}

export async function updateCategory(id: string, data: Partial<DocCategory>): Promise<void> {
    const docRef = doc(db, DOC_CATEGORIES_COLLECTION, id)
    await updateDoc(docRef, data)
}

export async function deleteCategory(id: string): Promise<void> {
    const docRef = doc(db, DOC_CATEGORIES_COLLECTION, id)
    await deleteDoc(docRef)
}

// ============ DOCUMENTS ============
export async function getAllDocuments(): Promise<FirestoreDocument[]> {
    const snapshot = await getDocs(collection(db, DOCUMENTS_COLLECTION))
    return snapshot.docs.map(d => {
        const data = d.data()
        return {
            ...data,
            id: d.id,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as unknown as FirestoreDocument
    })
}

export async function getDocumentById(id: string): Promise<FirestoreDocument | null> {
    const docRef = doc(db, DOCUMENTS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    const data = snapshot.data()
    return {
        ...data,
        id: snapshot.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as unknown as FirestoreDocument
}

export async function createDocument(
    data: Omit<FirestoreDocument, 'id' | 'createdAt' | 'updatedAt' | 'comments'>
): Promise<FirestoreDocument> {
    const newDocRef = doc(collection(db, DOCUMENTS_COLLECTION))
    const now = serverTimestamp()
    await setDoc(newDocRef, {
        ...data,
        comments: [],
        createdAt: now,
        updatedAt: now
    })
    const created = await getDoc(newDocRef)
    const createdData = created.data()!
    return {
        ...createdData,
        id: created.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as unknown as FirestoreDocument
}

export async function updateDocument(id: string, data: Partial<FirestoreDocument>): Promise<void> {
    const docRef = doc(db, DOCUMENTS_COLLECTION, id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteDocument(id: string): Promise<void> {
    const docRef = doc(db, DOCUMENTS_COLLECTION, id)
    await deleteDoc(docRef)
}

// ============ COMMENTS ============
export async function addComment(
    documentId: string,
    author: string,
    authorId: string,
    text: string
): Promise<void> {
    const docRef = doc(db, DOCUMENTS_COLLECTION, documentId)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) throw new Error('Document not found')

    const data = snapshot.data()
    const comments = data.comments || []
    const newComment: DocComment = {
        id: `cmt-${Date.now()}`,
        author,
        authorId,
        text,
        createdAt: new Date()
    }

    await updateDoc(docRef, {
        comments: [...comments, newComment],
        updatedAt: serverTimestamp()
    })
}

export async function deleteComment(documentId: string, commentId: string): Promise<void> {
    const docRef = doc(db, DOCUMENTS_COLLECTION, documentId)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) throw new Error('Document not found')

    const data = snapshot.data()
    const comments = (data.comments || []).filter((c: DocComment) => c.id !== commentId)

    await updateDoc(docRef, { comments, updatedAt: serverTimestamp() })
}

// ============ SEEDING ============
export async function seedInitialDocCategories(): Promise<void> {
    const existing = await getAllCategories()
    if (existing.length > 0) return

    const initialCategories = [
        { id: 'cat-all', name: '전체', order: 0 },
        { id: 'cat-manual', name: '운영 매뉴얼', order: 1 },
        { id: 'cat-training', name: '교육 자료', order: 2 },
        { id: 'cat-admin', name: '관리자 전용', order: 3, allowedRoles: ['ADMIN'] as UserRole[] },
    ]

    for (const cat of initialCategories) {
        const docRef = doc(db, DOC_CATEGORIES_COLLECTION, cat.id)
        await setDoc(docRef, { name: cat.name, order: cat.order, allowedRoles: cat.allowedRoles || null })
    }
    console.log('Initial document categories seeded')
}
