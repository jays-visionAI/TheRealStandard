import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TRS_Document {
    id: string
    categoryId: string
    title: string
    content: string
    type: 'MARKDOWN' | 'EMBED' | 'YOUTUBE'
    url?: string
    author: string
    createdAt: Date
    updatedAt: Date
}

export interface DocCategory {
    id: string
    name: string
    order: number
}

interface DocStore {
    categories: DocCategory[]
    documents: TRS_Document[]

    // Actions
    addCategory: (name: string) => void
    deleteCategory: (id: string) => void
    updateCategory: (id: string, name: string) => void

    addDocument: (doc: Omit<TRS_Document, 'id' | 'createdAt' | 'updatedAt'>) => void
    updateDocument: (id: string, data: Partial<TRS_Document>) => void
    deleteDocument: (id: string) => void
}

export const useDocStore = create<DocStore>()(
    persist(
        (set) => ({
            categories: [
                { id: 'cat-all', name: '전체', order: 0 },
                { id: 'cat-manual', name: '운영 매뉴얼', order: 1 },
                { id: 'cat-training', name: '교육 자료', order: 2 },
            ],
            documents: [],

            addCategory: (name) => set((state) => ({
                categories: [...state.categories, { id: `cat-${Date.now()}`, name, order: state.categories.length }]
            })),

            deleteCategory: (id) => set((state) => ({
                categories: state.categories.filter(c => c.id !== id),
                // Optionally move documents to 'all' or delete them? Let's keep them and mark as unassigned.
                documents: state.documents.map(d => d.categoryId === id ? { ...d, categoryId: 'cat-all' } : d)
            })),

            updateCategory: (id, name) => set((state) => ({
                categories: state.categories.map(c => c.id === id ? { ...c, name } : c)
            })),

            addDocument: (doc) => set((state) => ({
                documents: [
                    ...state.documents,
                    {
                        ...doc,
                        id: `doc-${Date.now()}`,
                        createdAt: new Date(),
                        updatedAt: new Date()
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
            }))
        }),
        {
            name: 'trs-doc-storage'
        }
    )
)
