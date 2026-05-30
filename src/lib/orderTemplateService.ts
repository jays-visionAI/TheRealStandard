import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, cleanData } from './firebase'
import { getCreatorStamp } from './auditing'
import { createOrderSheet, setOrderSheetItems } from './orderService'
import { getAllProducts } from './productService'

// ============ ORDER TEMPLATE SERVICE (Phase 2.4 — 자동발주 템플릿) ============
//
// 단골 거래처의 정기 발주를 템플릿으로 저장하고, "발주서 생성" 한 번으로
// DRAFT 주문장을 만든다. (주간 자동 생성 배치는 Cloud Functions 도입 후 — nextGenerateAt 활용)

export type Cadence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export interface OrderTemplateItem {
    productId: string
    productName: string
    qty: number
    unit: string   // 'kg' | 'box'
}

export interface OrderTemplate {
    id: string
    customerOrgId: string
    customerName: string
    cadence: Cadence
    weekday?: number             // 주간 발주 요일 (0=일 ~ 6=토)
    items: OrderTemplateItem[]
    autoGenerate: boolean        // 자동 생성 활성화 (CF 도입 후 사용)
    lastGeneratedAt?: Timestamp
    nextGenerateAt?: Timestamp
    detectionConfidence?: number // 수동 생성=1, 패턴감지 시 0~1
    createdAt: Timestamp
    updatedAt: Timestamp
}

export type OrderTemplateInput = Omit<OrderTemplate, 'id' | 'createdAt' | 'updatedAt'>

const COLLECTION = 'orderTemplates'

export async function getAllOrderTemplates(): Promise<OrderTemplate[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderTemplate))
}

export async function createOrderTemplate(input: OrderTemplateInput): Promise<string> {
    const ref = doc(collection(db, COLLECTION))
    const now = serverTimestamp()
    await setDoc(ref, cleanData({ ...getCreatorStamp(), ...input, createdAt: now, updatedAt: now }))
    return ref.id
}

export async function updateOrderTemplate(id: string, input: Partial<OrderTemplateInput>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), cleanData({ ...input, updatedAt: serverTimestamp() }))
}

export async function deleteOrderTemplate(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
}

/**
 * 다음 발주 예정일 계산 (주간: 다음 해당 요일, 격주: +14일, 월간: +1개월).
 */
export function computeNextGenerateDate(cadence: Cadence, weekday?: number, from: Date = new Date()): Date {
    const d = new Date(from)
    if (cadence === 'WEEKLY' && weekday != null) {
        const diff = (weekday - d.getDay() + 7) % 7 || 7
        d.setDate(d.getDate() + diff)
    } else if (cadence === 'BIWEEKLY') {
        d.setDate(d.getDate() + 14)
    } else if (cadence === 'MONTHLY') {
        d.setMonth(d.getMonth() + 1)
    } else {
        d.setDate(d.getDate() + 7)
    }
    return d
}

/**
 * 템플릿으로 DRAFT 주문장 + 품목 생성. 생성된 orderSheet id 반환.
 * 단가는 생성 시점의 상품 wholesalePrice 기준.
 */
export async function generateOrderSheetFromTemplate(template: OrderTemplate): Promise<string> {
    const products = await getAllProducts()
    const priceById = new Map(products.map(p => [p.id, p]))

    const cutOff = new Date()
    cutOff.setDate(cutOff.getDate() + 2) // 발주 마감 기본 +2일

    const items = template.items.map(it => {
        const p = priceById.get(it.productId)
        const unitPrice = p?.wholesalePrice ?? 0
        const boxWeight = p?.boxWeight ?? 0
        const estimatedKg = it.unit === 'box' ? it.qty * (boxWeight || 0) : it.qty
        const amount = it.unit === 'box' ? it.qty * unitPrice : estimatedKg * unitPrice
        return {
            productId: it.productId,
            productName: it.productName,
            category1: p?.category1,
            unit: it.unit,
            unitPrice,
            qtyRequested: it.qty,
            estimatedKg,
            amount,
        }
    })

    const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0)
    const totalKg = items.reduce((s, i) => s + (i.estimatedKg || 0), 0)

    const sheet = await createOrderSheet({
        customerOrgId: template.customerOrgId,
        customerName: template.customerName,
        cutOffAt: Timestamp.fromDate(cutOff),
        shipTo: '',
        status: 'DRAFT',
        adminComment: `정기발주 템플릿(${template.cadence})에서 생성됨`,
        totalItems: items.length,
        totalKg,
        totalAmount,
    })

    await setOrderSheetItems(sheet.id, items)

    await updateOrderTemplate(template.id, {
        lastGeneratedAt: Timestamp.now(),
        nextGenerateAt: Timestamp.fromDate(computeNextGenerateDate(template.cadence, template.weekday)),
    })

    return sheet.id
}
