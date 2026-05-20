import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ============ 타입 정의 ============

export type TempZone = 'CHILLED' | 'FROZEN'
export type EventType = 'INBOUND' | 'OUTBOUND' | 'ADJUST'

export interface InventoryEvent {
    id: string
    eventType: EventType
    sourceId: string
    sourceType: 'PURCHASE_ORDER' | 'SALES_ORDER' | 'MANUAL'
    productId: string
    productName: string
    supplierId?: string
    supplierName?: string
    customerId?: string
    customerName?: string
    tempZone: TempZone
    boxCount: number
    weightKg: number
    unitCostPrice?: number
    unitSalePrice?: number
    memo?: string
    inboundAt: Timestamp
    createdAt: Timestamp
    createdBy: string
}

export interface InventoryStock {
    productId: string
    productName: string
    tempZone: TempZone
    totalWeightKg: number       // 현재 재고 kg
    totalBoxCount: number       // 현재 재고 박스 수
    lastInboundAt?: Timestamp   // 마지막 입고일시
}

export interface InboundParams {
    sourceId: string            // PO ID
    productId: string
    productName: string
    supplierId?: string
    supplierName?: string
    tempZone: TempZone
    boxCount: number
    weightKg: number
    unitCostPrice?: number
    memo?: string
    createdBy: string
}

export interface OutboundParams {
    sourceId: string            // SalesOrder ID
    productId: string
    productName: string
    customerId?: string
    customerName?: string
    tempZone: TempZone
    boxCount: number
    weightKg: number
    unitSalePrice?: number
    memo?: string
    createdBy: string
}

const COLLECTION = 'inventory'
const inventoryRef = collection(db, COLLECTION)

// ============ INBOUND (반입) ============

export async function recordInbound(params: InboundParams): Promise<string> {
    const docRef = await addDoc(inventoryRef, {
        eventType: 'INBOUND',
        sourceId: params.sourceId,
        sourceType: 'PURCHASE_ORDER',
        productId: params.productId,
        productName: params.productName,
        supplierId: params.supplierId || null,
        supplierName: params.supplierName || null,
        tempZone: params.tempZone,
        boxCount: params.boxCount,
        weightKg: params.weightKg,
        unitCostPrice: params.unitCostPrice || null,
        memo: params.memo || null,
        inboundAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: params.createdBy,
    })
    return docRef.id
}

// ============ OUTBOUND (출고) ============

export async function recordOutbound(params: OutboundParams): Promise<string> {
    const docRef = await addDoc(inventoryRef, {
        eventType: 'OUTBOUND',
        sourceId: params.sourceId,
        sourceType: 'SALES_ORDER',
        productId: params.productId,
        productName: params.productName,
        customerId: params.customerId || null,
        customerName: params.customerName || null,
        tempZone: params.tempZone,
        boxCount: params.boxCount,
        weightKg: params.weightKg,
        unitSalePrice: params.unitSalePrice || null,
        memo: params.memo || null,
        inboundAt: serverTimestamp(),   // OUTBOUND의 inboundAt은 출고시각
        createdAt: serverTimestamp(),
        createdBy: params.createdBy,
    })
    return docRef.id
}

// ============ 현재고 조회 ============

// 특정 상품의 현재고 (kg, 박스)
export async function getStockByProduct(
    productId: string,
    tempZone?: TempZone
): Promise<{ weightKg: number; boxCount: number }> {
    let inboundQuery = query(
        inventoryRef,
        where('productId', '==', productId),
        where('eventType', '==', 'INBOUND')
    )
    let outboundQuery = query(
        inventoryRef,
        where('productId', '==', productId),
        where('eventType', '==', 'OUTBOUND')
    )

    if (tempZone) {
        inboundQuery = query(inboundQuery, where('tempZone', '==', tempZone))
        outboundQuery = query(outboundQuery, where('tempZone', '==', tempZone))
    }

    const [inboundSnap, outboundSnap] = await Promise.all([
        getDocs(inboundQuery),
        getDocs(outboundQuery),
    ])

    const inKg = inboundSnap.docs.reduce((s, d) => s + (d.data().weightKg || 0), 0)
    const inBox = inboundSnap.docs.reduce((s, d) => s + (d.data().boxCount || 0), 0)
    const outKg = outboundSnap.docs.reduce((s, d) => s + (d.data().weightKg || 0), 0)
    const outBox = outboundSnap.docs.reduce((s, d) => s + (d.data().boxCount || 0), 0)

    return {
        weightKg: Math.max(0, inKg - outKg),
        boxCount: Math.max(0, inBox - outBox),
    }
}

// 전체 상품별 재고 목록 (대시보드용)
export async function getAllStocks(): Promise<InventoryStock[]> {
    const snapshot = await getDocs(inventoryRef)
    const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryEvent))

    // productId + tempZone 조합별로 집계
    const stockMap = new Map<string, InventoryStock>()

    for (const event of events) {
        const key = `${event.productId}_${event.tempZone}`
        if (!stockMap.has(key)) {
            stockMap.set(key, {
                productId: event.productId,
                productName: event.productName,
                tempZone: event.tempZone,
                totalWeightKg: 0,
                totalBoxCount: 0,
                lastInboundAt: undefined,
            })
        }
        const stock = stockMap.get(key)!
        if (event.eventType === 'INBOUND') {
            stock.totalWeightKg += event.weightKg
            stock.totalBoxCount += event.boxCount
            if (!stock.lastInboundAt || event.inboundAt > stock.lastInboundAt) {
                stock.lastInboundAt = event.inboundAt
            }
        } else if (event.eventType === 'OUTBOUND') {
            stock.totalWeightKg -= event.weightKg
            stock.totalBoxCount -= event.boxCount
        }
    }

    return Array.from(stockMap.values())
        .filter(s => s.totalWeightKg > 0)
        .sort((a, b) => a.productName.localeCompare(b.productName))
}

// ============ 알람용 — 2일 초과 재고 감지 ============

export async function getOverageStocks(thresholdDays = 2): Promise<InventoryEvent[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - thresholdDays)

    const q = query(
        inventoryRef,
        where('eventType', '==', 'INBOUND'),
        where('inboundAt', '<=', Timestamp.fromDate(cutoff)),
        orderBy('inboundAt', 'asc')
    )

    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryEvent))
}

// ============ 특정 PO/SO의 재고 이벤트 조회 ============

export async function getEventsBySource(sourceId: string): Promise<InventoryEvent[]> {
    const q = query(inventoryRef, where('sourceId', '==', sourceId))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryEvent))
}
