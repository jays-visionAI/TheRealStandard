import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '../types'

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

export interface TRS_Document {
    id: string
    categoryId: string
    title: string
    content: string
    type: 'MARKDOWN' | 'EMBED' | 'YOUTUBE'
    url?: string
    author: string
    authorId: string
    createdAt: Date
    updatedAt: Date
    comments: DocComment[]
    attachments: DocAttachment[]
}

export interface DocCategory {
    id: string
    name: string
    order: number
    allowedRoles?: UserRole[] // undefined means 'all'
}

interface DocStore {
    categories: DocCategory[]
    documents: TRS_Document[]

    // Category Actions
    addCategory: (name: string, allowedRoles?: UserRole[]) => void
    deleteCategory: (id: string) => void
    updateCategory: (id: string, data: Partial<DocCategory>) => void

    // Document Actions
    addDocument: (doc: Omit<TRS_Document, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'attachments'>) => void
    updateDocument: (id: string, data: Partial<TRS_Document>) => void
    deleteDocument: (id: string) => void

    // Comment Actions
    addComment: (docId: string, author: string, authorId: string, text: string) => void
    deleteComment: (docId: string, commentId: string) => void

    // Attachment Actions (Mock)
    addAttachment: (docId: string, file: Omit<DocAttachment, 'id'>) => void
    deleteAttachment: (docId: string, attachmentId: string) => void
}

export const useDocStore = create<DocStore>()(
    persist(
        (set) => ({
            categories: [
                { id: 'cat-all', name: '전체', order: 0 },
                { id: 'cat-manual', name: '운영 매뉴얼', order: 1 },
                { id: 'cat-training', name: '교육 자료', order: 2 },
                { id: 'cat-admin', name: '관리자 전용', order: 3, allowedRoles: ['ADMIN'] },
            ],
            documents: [],

            addCategory: (name, allowedRoles) => set((state) => ({
                categories: [...state.categories, { id: `cat-${Date.now()}`, name, order: state.categories.length, allowedRoles }]
            })),

            deleteCategory: (id) => set((state) => ({
                categories: state.categories.filter(c => c.id !== id),
                documents: state.documents.map(d => d.categoryId === id ? { ...d, categoryId: 'cat-all' } : d)
            })),

            updateCategory: (id, data) => set((state) => ({
                categories: state.categories.map(c => c.id === id ? { ...c, ...data } : c)
            })),

            addDocument: (doc) => set((state) => ({
                documents: [
                    ...state.documents,
                    {
                        ...doc,
                        id: `doc-${Date.now()}`,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        comments: [],
                        attachments: []
                    }
                ]
            })),

            updateDocument: (id, data) => set((state) => ({
                documents: state.documents.map(d =>
                    d.id === id ? { ...d, ...data, updatedAt: new Date() } : d
                )
            })),

            deleteDocument: (id) => set((state) => ({
                documents: state.documents.filter(d => d.id !== id)
            })),

            addComment: (docId, author, authorId, text) => set((state) => ({
                documents: state.documents.map(d => d.id === docId ? {
                    ...d,
                    comments: [...d.comments, { id: `cmt-${Date.now()}`, author, authorId, text, createdAt: new Date() }]
                } : d)
            })),

            deleteComment: (docId, commentId) => set((state) => ({
                documents: state.documents.map(d => d.id === docId ? {
                    ...d,
                    comments: d.comments.filter(c => c.id !== commentId)
                } : d)
            })),

            addAttachment: (docId, file) => set((state) => ({
                documents: state.documents.map(d => d.id === docId ? {
                    ...d,
                    attachments: [...d.attachments, { ...file, id: `att-${Date.now()}` }]
                } : d)
            })),

            deleteAttachment: (docId, attachmentId) => set((state) => ({
                documents: state.documents.map(d => d.id === docId ? {
                    ...d,
                    attachments: d.attachments.filter(a => a.id !== attachmentId)
                } : d)
            }))
        }),
        {
            name: 'trs-doc-storage'
        }
    )
)
