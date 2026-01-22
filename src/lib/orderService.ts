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
    shipDate?: Timestamp | null
    cutOffAt: Timestamp
    shipTo: string
    adminComment?: string
    customerComment?: string
    discountAmount?: number
    status: 'DRAFT' | 'SENT' | 'SUBMITTED' | 'CONFIRMED' | 'REVISION' | 'CLOSED'
    isGuest?: boolean
    sourcePriceListId?: string // 유입된 단가표 ID
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

export async function getOrderSheetsByCustomer(customerOrgId: string): Promise<FirestoreOrderSheet[]> {
    const q = query(collection(db, ORDER_SHEETS_COLLECTION), where('customerOrgId', '==', customerOrgId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreOrderSheet))
}

export async function createOrderSheet(data: Omit<FirestoreOrderSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreOrderSheet> {
    const newDocRef = doc(collection(db, ORDER_SHEETS_COLLECTION))
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreOrderSheet
}

export async function createOrderSheetWithId(id: string, data: Omit<FirestoreOrderSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreOrderSheet> {
    const docRef = doc(db, ORDER_SHEETS_COLLECTION, id)
    const now = serverTimestamp()
    await setDoc(docRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreOrderSheet
}

export async function generateOrderSheetId(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const yyyymmdd = `${year}${month}${day}`

    const startOfDay = new Date(year, today.getMonth(), today.getDate())
    const endOfDay = new Date(year, today.getMonth(), today.getDate() + 1)

    const q = query(
        collection(db, ORDER_SHEETS_COLLECTION),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<', Timestamp.fromDate(endOfDay))
    )

    const snapshot = await getDocs(q)
    const count = snapshot.size + 1
    const sequence = String(count).padStart(3, '0')

    return `${yyyymmdd}-${sequence}`
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

export async function getSalesOrdersByCustomer(customerOrgId: string): Promise<FirestoreSalesOrder[]> {
    const q = query(collection(db, SALES_ORDERS_COLLECTION), where('customerOrgId', '==', customerOrgId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreSalesOrder))
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

export async function deleteSalesOrder(id: string): Promise<void> {
    const docRef = doc(db, SALES_ORDERS_COLLECTION, id)
    await deleteDoc(docRef)
    // Delete items
    const itemsSnapshot = await getDocs(query(collection(db, SALES_ORDER_ITEMS_COLLECTION), where('salesOrderId', '==', id)))
    for (const d of itemsSnapshot.docs) {
        await deleteDoc(d.ref)
    }
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
    orderId?: string // for backward compatibility
    vehicleTypeId?: string
    vehicleNumber?: string
    driverName?: string
    driverPhone?: string
    company?: string // 물류사명
    carrierOrgId?: string // Link to carrier organization
    dispatcherToken?: string // Token for public access by dispatcher
    dispatchRequestedAt?: Timestamp
    eta?: Timestamp
    etaAt?: Timestamp
    status: 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
    isModified?: boolean // 수정 여부
    modifiedAt?: Timestamp // 마지막 수정 일시
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

export async function getShipmentsBySalesOrder(salesOrderId: string): Promise<FirestoreShipment[]> {
    const q = query(collection(db, SHIPMENTS_COLLECTION), where('sourceSalesOrderId', '==', salesOrderId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreShipment))
}

export async function getShipmentByToken(token: string): Promise<FirestoreShipment | null> {
    const q = query(collection(db, SHIPMENTS_COLLECTION), where('dispatcherToken', '==', token))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestoreShipment
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

// ============ CARRIER DRIVERS (배차기사 관리) ============
export interface RegisteredDriver {
    id: string
    carrierOrgId: string
    driverName: string
    driverPhone: string
    vehicleNumber: string
    vehicleTypeId?: string
    lastUsedAt: Timestamp
}

const DRIVERS_COLLECTION = 'carrierDrivers'

export async function getDriversByCarrier(carrierOrgId: string): Promise<RegisteredDriver[]> {
    const q = query(collection(db, DRIVERS_COLLECTION), where('carrierOrgId', '==', carrierOrgId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegisteredDriver))
}

export async function upsertDriver(carrierOrgId: string, data: Omit<RegisteredDriver, 'id' | 'carrierOrgId' | 'lastUsedAt'>): Promise<void> {
    const q = query(
        collection(db, DRIVERS_COLLECTION),
        where('carrierOrgId', '==', carrierOrgId),
        where('vehicleNumber', '==', data.vehicleNumber)
    )
    const snapshot = await getDocs(q)
    const now = Timestamp.now()

    if (snapshot.empty) {
        const newRef = doc(collection(db, DRIVERS_COLLECTION))
        await setDoc(newRef, {
            ...data,
            id: newRef.id,
            carrierOrgId,
            lastUsedAt: now
        })
    } else {
        const existingDoc = snapshot.docs[0]
        await updateDoc(existingDoc.ref, {
            ...data,
            lastUsedAt: now
        })
    }
}

export async function deleteDriver(id: string): Promise<void> {
    const docRef = doc(db, DRIVERS_COLLECTION, id)
    await deleteDoc(docRef)
}

// ============ PURCHASE ORDER (매입발주) ============
export interface FirestorePurchaseOrder {
    id: string
    inviteTokenId?: string
    supplierOrgId: string
    supplierName: string
    status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'COMPLETED'
    totalsKg: number
    totalsAmount: number
    expectedArrivalDate?: Timestamp | null
    memo?: string
    createdAt: Timestamp
    updatedAt: Timestamp
}

export interface FirestorePurchaseOrderItem {
    id: string
    purchaseOrderId: string
    productId: string
    productName: string
    qtyKg: number
    unitPrice: number
    amount: number
}

const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders'
const PURCHASE_ORDER_ITEMS_COLLECTION = 'purchaseOrderItems'

export async function getAllPurchaseOrders(): Promise<FirestorePurchaseOrder[]> {
    const snapshot = await getDocs(collection(db, PURCHASE_ORDERS_COLLECTION))
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestorePurchaseOrder))
}

export async function getPurchaseOrderById(id: string): Promise<FirestorePurchaseOrder | null> {
    const docRef = doc(db, PURCHASE_ORDERS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestorePurchaseOrder
}

export async function getPurchaseOrderByToken(token: string): Promise<FirestorePurchaseOrder | null> {
    const q = query(collection(db, PURCHASE_ORDERS_COLLECTION), where('inviteTokenId', '==', token))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestorePurchaseOrder
}

export async function getPurchaseOrderItems(purchaseOrderId: string): Promise<FirestorePurchaseOrderItem[]> {
    const q = query(collection(db, PURCHASE_ORDER_ITEMS_COLLECTION), where('purchaseOrderId', '==', purchaseOrderId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePurchaseOrderItem))
}

export async function createPurchaseOrder(data: Omit<FirestorePurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestorePurchaseOrder> {
    const newDocRef = doc(collection(db, PURCHASE_ORDERS_COLLECTION))
    const now = serverTimestamp()
    await setDoc(newDocRef, { ...data, createdAt: now, updatedAt: now })
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestorePurchaseOrder
}

export async function updatePurchaseOrder(id: string, data: Partial<FirestorePurchaseOrder>): Promise<void> {
    const docRef = doc(db, PURCHASE_ORDERS_COLLECTION, id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

// ============ CREATE SALES ORDER FROM ORDER SHEET ============
export async function createSalesOrderFromSheet(
    orderSheet: { id: string; customerOrgId: string; customerName: string },
    items: { productId?: string; productName?: string; estimatedKg?: number; unitPrice?: number; amount?: number }[]
): Promise<FirestoreSalesOrder> {
    const totalsKg = items.reduce((sum, i) => sum + (i.estimatedKg || 0), 0)
    const totalsAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0)

    const salesOrder = await createSalesOrder({
        sourceOrderSheetId: orderSheet.id,
        customerOrgId: orderSheet.customerOrgId,
        customerName: orderSheet.customerName,
        status: 'CREATED',
        totalsKg,
        totalsAmount,
        confirmedAt: Timestamp.now(),
    })

    // Create sales order items
    const soItems = items.map(i => ({
        productId: i.productId || '',
        productName: i.productName || '',
        qtyKg: i.estimatedKg || 0,
        unitPrice: i.unitPrice || 0,
        amount: i.amount || 0,
    }))

    await setSalesOrderItems(salesOrder.id, soItems)

    return salesOrder
}

// ============ SEEDING ============
export async function seedInitialOrders(): Promise<void> {
    // Orders are created dynamically, no initial seed needed
    console.log('Order service initialized')
}

