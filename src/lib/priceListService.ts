import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

export interface PriceListItem {
    productId: string
    name: string
    costPrice: number
    wholesalePrice: number
    supplyPrice: number
    unit: string
    category1: string
    boxWeight?: number | null
}

export interface FirestorePriceList {
    id: string
    title: string
    items: PriceListItem[]
    shareTokenId?: string
    validUntil?: any // Timestamp
    createdAt: any
    updatedAt: any
}

const PRICE_LISTS_COLLECTION = 'priceLists'

export async function getAllPriceLists(): Promise<FirestorePriceList[]> {
    const q = query(collection(db, PRICE_LISTS_COLLECTION), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestorePriceList))
}

export async function getPriceListById(id: string): Promise<FirestorePriceList | null> {
    const docRef = doc(db, PRICE_LISTS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as FirestorePriceList
    }
    return null
}

export async function createPriceList(data: Omit<FirestorePriceList, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestorePriceList> {
    const docRef = await addDoc(collection(db, PRICE_LISTS_COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestorePriceList
}

export async function updatePriceList(id: string, data: Partial<Omit<FirestorePriceList, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const docRef = doc(db, PRICE_LISTS_COLLECTION, id)
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    })
}

export async function deletePriceList(id: string): Promise<void> {
    const docRef = doc(db, PRICE_LISTS_COLLECTION, id)
    await deleteDoc(docRef)
}

export async function getPriceListByShareToken(token: string): Promise<FirestorePriceList | null> {
    const q = query(collection(db, PRICE_LISTS_COLLECTION), where('shareTokenId', '==', token))
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) return null
    const d = querySnapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestorePriceList
}
