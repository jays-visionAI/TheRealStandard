import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ============ ORDER SHEET (주문장) ============
export interface FirestoreOrderSheet {
    id: string
    inviteTokenId?: string
    customerOrgId: string
    customerName: string
    shipDate?: Timestamp
    status: 'DRAFT' | 'SENT' | 'SUBMITTED' | 'CONFIRMED' | 'CLOSED'
    createdAt: Timestamp
    updatedAt: Timestamp
}

export interface FirestoreOrderSheetItem {
    id: string
    orderSheetId: string
    productId: string
    productName: string
    unit: string
    unitPrice: number
    qtyRequested?: number
    estimatedKg?: number
    amount?: number
}

const ORDER_SHEETS_COLLECTION = 'orderSheets'
const ORDER_SHEET_ITEMS_COLLECTION = 'orderSheetItems'

export async function getAllOrderSheets(): Promise<FirestoreOrderSheet[]> {
    const snapshot = await getDocs(collection(db, ORDER_SHEETS_COLLECTION))
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreOrderSheet))
}

export async function getOrderSheetById(id: string): Promise<FirestoreOrderSheet | null> {
    const docRef = doc(db, ORDER_SHEETS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreOrderSheet
}

export async function getOrderSheetByToken(token: string): Promise<FirestoreOrderSheet | null> {
    const q = query(collection(db, ORDER_SHEETS_COLLECTION), where('inviteTokenId', '==', token))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestoreOrderSheet
}

export async function createOrderSheet(data: Omit<FirestoreOrderSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreOrderSheet> {
    const newDocRef = doc(collection(db, ORDER_SHEETS_COLLECTION))
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreOrderSheet
}

export async function updateOrderSheet(id: string, data: Partial<FirestoreOrderSheet>): Promise<void> {
    const docRef = doc(db, ORDER_SHEETS_COLLECTION, id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteOrderSheet(id: string): Promise<void> {
    const docRef = doc(db, ORDER_SHEETS_COLLECTION, id)
    await deleteDoc(docRef)
    // Also delete related items
    const itemsSnapshot = await getDocs(query(collection(db, ORDER_SHEET_ITEMS_COLLECTION), where('orderSheetId', '==', id)))
    for (const d of itemsSnapshot.docs) {
        await deleteDoc(d.ref)
    }
}

// Order Sheet Items
export async function getOrderSheetItems(orderSheetId: string): Promise<FirestoreOrderSheetItem[]> {
    const q = query(collection(db, ORDER_SHEET_ITEMS_COLLECTION), where('orderSheetId', '==', orderSheetId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreOrderSheetItem))
}

export async function setOrderSheetItems(orderSheetId: string, items: Omit<FirestoreOrderSheetItem, 'id' | 'orderSheetId'>[]): Promise<void> {
    // Delete existing items first
    const existing = await getDocs(query(collection(db, ORDER_SHEET_ITEMS_COLLECTION), where('orderSheetId', '==', orderSheetId)))
    for (const d of existing.docs) {
        await deleteDoc(d.ref)
    }
    // Add new items
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemRef = doc(collection(db, ORDER_SHEET_ITEMS_COLLECTION))
        await setDoc(itemRef, { ...item, orderSheetId, id: itemRef.id })
    }
}

// ============ SALES ORDER (판매오더) ============
export interface FirestoreSalesOrder {
    id: string
    sourceOrderSheetId: string
    customerOrgId: string
    customerName: string
    status: 'CREATED' | 'PO_GENERATED' | 'SHIPPED' | 'COMPLETED'
    totalsKg: number
    totalsAmount: number
    confirmedAt: Timestamp
    createdAt: Timestamp
}

export interface FirestoreSalesOrderItem {
    id: string
    salesOrderId: string
    productId: string
    productName: string
    qtyKg: number
    unitPrice: number
    amount: number
}

const SALES_ORDERS_COLLECTION = 'salesOrders'
const SALES_ORDER_ITEMS_COLLECTION = 'salesOrderItems'

export async function getAllSalesOrders(): Promise<FirestoreSalesOrder[]> {
    const snapshot = await getDocs(collection(db, SALES_ORDERS_COLLECTION))
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreSalesOrder))
}

export async function getSalesOrderById(id: string): Promise<FirestoreSalesOrder | null> {
    const docRef = doc(db, SALES_ORDERS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreSalesOrder
}

export async function createSalesOrder(data: Omit<FirestoreSalesOrder, 'id' | 'createdAt'>): Promise<FirestoreSalesOrder> {
    const newDocRef = doc(collection(db, SALES_ORDERS_COLLECTION))
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreSalesOrder
}

export async function updateSalesOrder(id: string, data: Partial<FirestoreSalesOrder>): Promise<void> {
    const docRef = doc(db, SALES_ORDERS_COLLECTION, id)
    await updateDoc(docRef, data)
}

export async function getSalesOrderItems(salesOrderId: string): Promise<FirestoreSalesOrderItem[]> {
    const q = query(collection(db, SALES_ORDER_ITEMS_COLLECTION), where('salesOrderId', '==', salesOrderId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreSalesOrderItem))
}

export async function setSalesOrderItems(salesOrderId: string, items: Omit<FirestoreSalesOrderItem, 'id' | 'salesOrderId'>[]): Promise<void> {
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemRef = doc(collection(db, SALES_ORDER_ITEMS_COLLECTION))
        await setDoc(itemRef, { ...item, salesOrderId, id: itemRef.id })
    }
}

// ============ SHIPMENT (배송) ============
export interface FirestoreShipment {
    id: string
    sourceSalesOrderId: string
    vehicleTypeId?: string
    driverName?: string
    driverPhone?: string
    status: 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
    etaAt?: Timestamp
    createdAt: Timestamp
    updatedAt: Timestamp
}

const SHIPMENTS_COLLECTION = 'shipments'

export async function getAllShipments(): Promise<FirestoreShipment[]> {
    const snapshot = await getDocs(collection(db, SHIPMENTS_COLLECTION))
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreShipment))
}

export async function getShipmentById(id: string): Promise<FirestoreShipment | null> {
    const docRef = doc(db, SHIPMENTS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreShipment
}

export async function createShipment(data: Omit<FirestoreShipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreShipment> {
    const newDocRef = doc(collection(db, SHIPMENTS_COLLECTION))
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreShipment
}

export async function updateShipment(id: string, data: Partial<FirestoreShipment>): Promise<void> {
    const docRef = doc(db, SHIPMENTS_COLLECTION, id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteShipment(id: string): Promise<void> {
    const docRef = doc(db, SHIPMENTS_COLLECTION, id)
    await deleteDoc(docRef)
}
