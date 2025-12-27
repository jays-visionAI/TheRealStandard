import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ============ SUPPLIER SERVICE ============
export interface FirestoreSupplier {
    id: string
    companyName: string
    bizRegNo: string
    ceoName: string
    phone: string
    fax?: string
    email: string
    address: string
    contactPerson?: string
    contactPhone?: string
    supplyCategory: 'meat' | 'byproduct' | 'packaging' | 'other'
    paymentTerms?: string
    bankName?: string
    bankAccount?: string
    memo?: string
    isActive: boolean
    createdAt: Timestamp
    updatedAt: Timestamp
}

const SUPPLIERS_COLLECTION = 'suppliers'
const suppliersRef = collection(db, SUPPLIERS_COLLECTION)

export async function getAllSuppliers(): Promise<FirestoreSupplier[]> {
    const snapshot = await getDocs(suppliersRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreSupplier))
}

export async function getSupplierById(id: string): Promise<FirestoreSupplier | null> {
    const docRef = doc(db, SUPPLIERS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreSupplier
}

export async function createSupplier(data: Omit<FirestoreSupplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreSupplier> {
    const newDocRef = doc(suppliersRef)
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreSupplier
}

export async function createSupplierWithId(id: string, data: Omit<FirestoreSupplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreSupplier> {
    const docRef = doc(db, SUPPLIERS_COLLECTION, id)
    const now = serverTimestamp()
    await setDoc(docRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreSupplier
}

export async function updateSupplier(id: string, data: Partial<FirestoreSupplier>): Promise<void> {
    const docRef = doc(db, SUPPLIERS_COLLECTION, id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteSupplier(id: string): Promise<void> {
    const docRef = doc(db, SUPPLIERS_COLLECTION, id)
    await deleteDoc(docRef)
}

export async function seedInitialSuppliers(): Promise<void> {
    const existing = await getAllSuppliers()
    if (existing.length > 0) return

    const initialSuppliers = [
        { id: 'supp-1', companyName: '우경인터내셔널', bizRegNo: '111-22-33333', ceoName: '박공급', phone: '02-1111-2222', email: 'wookyoung@example.com', address: '경기도 용인시 처인구...', supplyCategory: 'meat' as const, isActive: true },
    ]

    for (const s of initialSuppliers) {
        await createSupplierWithId(s.id, s)
    }
    console.log('Initial suppliers seeded')
}
