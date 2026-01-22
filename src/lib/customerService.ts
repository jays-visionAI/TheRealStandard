import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db, cleanData } from './firebase'

// ============ CUSTOMER SERVICE ============
export interface FirestoreCustomer {
    id: string
    companyName: string
    bizRegNo: string
    ceoName: string
    phone: string
    fax?: string
    email: string
    address: string
    shipAddress1: string
    shipAddress2?: string
    contactPerson?: string
    contactPhone?: string
    priceType: 'wholesale' | 'retail'
    paymentTerms?: string
    creditLimit?: number
    memo?: string
    isActive: boolean
    isKeyAccount: boolean
    password?: string
    inviteToken?: string
    isJoined: boolean
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE'
    firebaseUid?: string
    createdAt: Timestamp
    updatedAt: Timestamp
}

const CUSTOMERS_COLLECTION = 'customers'
const customersRef = collection(db, CUSTOMERS_COLLECTION)

export async function getAllCustomers(): Promise<FirestoreCustomer[]> {
    const snapshot = await getDocs(customersRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreCustomer))
}

export async function getCustomerById(id: string): Promise<FirestoreCustomer | null> {
    const docRef = doc(db, CUSTOMERS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreCustomer
}

export async function getCustomerByEmail(email: string): Promise<FirestoreCustomer | null> {
    const normalizedEmail = email.toLowerCase().trim()
    const q = query(customersRef, where('email', '==', normalizedEmail))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestoreCustomer
}

export async function getCustomerByToken(token: string): Promise<FirestoreCustomer | null> {
    const q = query(customersRef, where('inviteToken', '==', token))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestoreCustomer
}

export async function createCustomer(data: Omit<FirestoreCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreCustomer> {
    const newDocRef = doc(customersRef)
    const now = serverTimestamp()
    const normalizedData = {
        ...cleanData(data),
        email: data.email.toLowerCase().trim()
    }
    await setDoc(newDocRef, { ...normalizedData, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreCustomer
}

export async function createCustomerWithId(id: string, data: Omit<FirestoreCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreCustomer> {
    const docRef = doc(db, CUSTOMERS_COLLECTION, id)
    const now = serverTimestamp()
    const normalizedData = {
        ...cleanData(data),
        email: data.email.toLowerCase().trim()
    }
    await setDoc(docRef, { ...normalizedData, createdAt: now, updatedAt: now })
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreCustomer
}

export async function updateCustomer(id: string, data: Partial<FirestoreCustomer>): Promise<void> {
    const docRef = doc(db, CUSTOMERS_COLLECTION, id)
    const updateData = { ...cleanData(data), updatedAt: serverTimestamp() }
    // 이메일이 포함된 경우 소문자로 정규화
    if (data.email) {
        updateData.email = data.email.toLowerCase().trim()
    }
    await updateDoc(docRef, updateData)
}

export async function deleteCustomer(id: string): Promise<void> {
    const docRef = doc(db, CUSTOMERS_COLLECTION, id)
    await deleteDoc(docRef)
}

export async function validateCustomerLogin(email: string, password: string): Promise<FirestoreCustomer | null> {
    const customer = await getCustomerByEmail(email)
    if (!customer) return null
    if (customer.password !== password) return null
    if (customer.status !== 'ACTIVE') return null
    return customer
}

export async function seedInitialCustomers(): Promise<void> {
    const existing = await getAllCustomers()
    if (existing.length > 0) return

    const initialCustomers = [
        { id: 'cust-1', companyName: '아우내식품', bizRegNo: '123-45-67890', ceoName: '박아우', phone: '02-1234-5678', email: 'aunae@example.com', address: '서울시 강남구 삼성동 123', shipAddress1: '서울시 강남구 삼성동 123', priceType: 'wholesale' as const, isActive: true, isKeyAccount: true, status: 'ACTIVE' as const, password: '1234', isJoined: true },
        { id: 'cust-2', companyName: '진심왕돈가스', bizRegNo: '987-65-43210', ceoName: '김진심', phone: '02-9876-5432', email: 'jinsim@example.com', address: '서울시 송파구 잠실동 456', shipAddress1: '서울시 송파구 잠실동 456', priceType: 'wholesale' as const, isActive: true, isKeyAccount: true, status: 'PENDING' as const, inviteToken: 'welcome-jinsim', isJoined: false },
    ]

    for (const c of initialCustomers) {
        await createCustomerWithId(c.id, c)
    }
    console.log('Initial customers seeded')
}
