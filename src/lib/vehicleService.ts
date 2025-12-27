import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ============ VEHICLE SERVICE ============
export interface FirestoreVehicleType {
    id: string
    name: string
    capacityKg: number
    enabled: boolean
    createdAt: Timestamp
    updatedAt: Timestamp
}

const VEHICLES_COLLECTION = 'vehicleTypes'
const vehiclesRef = collection(db, VEHICLES_COLLECTION)

export async function getAllVehicleTypes(): Promise<FirestoreVehicleType[]> {
    const snapshot = await getDocs(vehiclesRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreVehicleType))
}

export async function getVehicleTypeById(id: string): Promise<FirestoreVehicleType | null> {
    const docRef = doc(db, VEHICLES_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreVehicleType
}

export async function createVehicleType(data: Omit<FirestoreVehicleType, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreVehicleType> {
    const newDocRef = doc(vehiclesRef)
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreVehicleType
}

export async function createVehicleTypeWithId(id: string, data: Omit<FirestoreVehicleType, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreVehicleType> {
    const docRef = doc(db, VEHICLES_COLLECTION, id)
    const now = serverTimestamp()
    await setDoc(docRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreVehicleType
}

export async function updateVehicleType(id: string, data: Partial<FirestoreVehicleType>): Promise<void> {
    const docRef = doc(db, VEHICLES_COLLECTION, id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteVehicleType(id: string): Promise<void> {
    const docRef = doc(db, VEHICLES_COLLECTION, id)
    await deleteDoc(docRef)
}

export async function seedInitialVehicleTypes(): Promise<void> {
    const existing = await getAllVehicleTypes()
    if (existing.length > 0) return

    const initialVehicles = [
        { id: 'vt-1', name: '1톤 냉탑', capacityKg: 1000, enabled: true },
        { id: 'vt-2', name: '3.5톤', capacityKg: 3500, enabled: true },
        { id: 'vt-3', name: '5톤 트럭', capacityKg: 5000, enabled: true },
        { id: 'vt-4', name: '11톤', capacityKg: 11000, enabled: true },
    ]

    for (const v of initialVehicles) {
        await createVehicleTypeWithId(v.id, v)
    }
    console.log('Initial vehicle types seeded')
}
