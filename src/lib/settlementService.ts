import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ============ 타입 정의 ============

export type SettlementStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'OTHER'

export interface PaymentRecord {
    amount: number
    method: PaymentMethod
    paidAt: Timestamp
    memo?: string
    recordedBy: string
}

export interface FirestoreSettlement {
    id: string
    salesOrderId: string
    customerOrgId: string
    customerName: string
    estimatedAmount: number
    estimatedWeightKg: number
    finalWeightKg: number
    finalAmount: number
    unitPrice: number
    paidAmount: number
    remainingAmount: number
    status: SettlementStatus
    paymentDueAt: Timestamp
    paymentTermDays: number
    paymentHistory: PaymentRecord[]
    refundAmount?: number
    milestonePoints?: number
    milestoneMultiplier?: number
    notes?: string
    shippedAt: Timestamp
    settledAt?: Timestamp
    createdAt: Timestamp
    updatedAt: Timestamp
    createdBy: string
}

export interface CreateSettlementParams {
    salesOrderId: string
    customerOrgId: string
    customerName: string
    estimatedAmount: number
    estimatedWeightKg: number
    finalWeightKg: number
    unitPrice: number            // 원/kg
    paymentTermDays?: number     // 기본 30일
    shippedAt: Timestamp
    createdBy: string
}

const COLLECTION = 'settlements'
const settlementsRef = collection(db, COLLECTION)

// ============ 생성 ============

export async function createSettlement(
    params: CreateSettlementParams
): Promise<FirestoreSettlement> {
    const finalAmount = Math.round(params.finalWeightKg * params.unitPrice)
    const estimatedAmount = params.estimatedAmount
    const termDays = params.paymentTermDays ?? 30

    // 결제 기한 계산
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + termDays)

    // 선정산 초과 여부 계산
    const diff = estimatedAmount - finalAmount
    const refundAmount = diff > 0 ? diff : undefined
    const milestoneMultiplier = diff > 0 ? 2 : 1  // 선정산 초과 시 마일리지 2배
    const milestonePoints = diff > 0 ? Math.floor(diff * milestoneMultiplier) : undefined

    const data = {
        salesOrderId: params.salesOrderId,
        customerOrgId: params.customerOrgId,
        customerName: params.customerName,
        estimatedAmount,
        estimatedWeightKg: params.estimatedWeightKg,
        finalWeightKg: params.finalWeightKg,
        finalAmount,
        unitPrice: params.unitPrice,
        paidAmount: 0,
        remainingAmount: finalAmount,
        status: 'PENDING' as SettlementStatus,
        paymentDueAt: Timestamp.fromDate(dueDate),
        paymentTermDays: termDays,
        paymentHistory: [],
        refundAmount: refundAmount ?? null,
        milestonePoints: milestonePoints ?? null,
        milestoneMultiplier,
        shippedAt: params.shippedAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: params.createdBy,
    }

    const docRef = await addDoc(settlementsRef, data)
    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreSettlement
}

// ============ 조회 ============

export async function getSettlementById(id: string): Promise<FirestoreSettlement | null> {
    const docRef = doc(db, COLLECTION, id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as FirestoreSettlement
}

export async function getSettlementBySalesOrder(
    salesOrderId: string
): Promise<FirestoreSettlement | null> {
    const q = query(settlementsRef, where('salesOrderId', '==', salesOrderId))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, ...d.data() } as FirestoreSettlement
}

// 전체 정산 목록 (관리자용)
export async function getAllSettlements(): Promise<FirestoreSettlement[]> {
    const q = query(settlementsRef, orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreSettlement))
}

// 고객사별 정산 목록 (고객사 포털용)
export async function getSettlementsByCustomer(
    customerOrgId: string
): Promise<FirestoreSettlement[]> {
    const q = query(
        settlementsRef,
        where('customerOrgId', '==', customerOrgId),
        orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreSettlement))
}

// 미수채권 목록 (PENDING + PARTIAL + OVERDUE)
export async function getReceivables(): Promise<FirestoreSettlement[]> {
    const q = query(
        settlementsRef,
        where('status', 'in', ['PENDING', 'PARTIAL', 'OVERDUE']),
        orderBy('paymentDueAt', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreSettlement))
}

// 연체 감지 — 기한 초과된 PENDING/PARTIAL을 OVERDUE로 업데이트
export async function markOverdueSettlements(): Promise<number> {
    const now = Timestamp.now()
    const q = query(
        settlementsRef,
        where('status', 'in', ['PENDING', 'PARTIAL']),
        where('paymentDueAt', '<', now)
    )
    const snap = await getDocs(q)
    let count = 0
    for (const d of snap.docs) {
        await updateDoc(d.ref, {
            status: 'OVERDUE',
            updatedAt: serverTimestamp()
        })
        count++
    }
    return count
}

// ============ 수금 처리 ============

export async function recordPayment(
    settlementId: string,
    payment: Omit<PaymentRecord, 'paidAt'> & { paidAt?: Timestamp }
): Promise<FirestoreSettlement> {
    const docRef = doc(db, COLLECTION, settlementId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) throw new Error('Settlement not found')

    const current = { id: snap.id, ...snap.data() } as FirestoreSettlement

    const newPaidAmount = current.paidAmount + payment.amount
    const newRemaining = Math.max(0, current.finalAmount - newPaidAmount)

    let newStatus: SettlementStatus = 'PARTIAL'
    if (newPaidAmount >= current.finalAmount) {
        newStatus = 'PAID'
    } else if (new Date() > current.paymentDueAt.toDate()) {
        newStatus = 'OVERDUE'
    }

    const newRecord: PaymentRecord = {
        ...payment,
        paidAt: payment.paidAt || Timestamp.now(),
    }

    await updateDoc(docRef, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining,
        status: newStatus,
        paymentHistory: [...(current.paymentHistory || []), newRecord],
        settledAt: newStatus === 'PAID' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
    })

    const updated = await getDoc(docRef)
    return { id: updated.id, ...updated.data() } as FirestoreSettlement
}

// ============ 통계 ============

export interface SettlementSummary {
    totalReceivable: number      // 총 미수금
    totalOverdue: number         // 연체 금액
    totalPaidThisMonth: number   // 이번 달 수금액
    pendingCount: number         // 미수 건수
    overdueCount: number         // 연체 건수
}

export async function getSettlementSummary(): Promise<SettlementSummary> {
    const all = await getAllSettlements()
    const now = new Date()

    const receivables = all.filter(s => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(s.status))
    const overdue = all.filter(s => s.status === 'OVERDUE')
    const paidThisMonth = all.filter(s => {
        if (s.status !== 'PAID' || !s.settledAt) return false
        const d = s.settledAt.toDate()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    return {
        totalReceivable: receivables.reduce((s, i) => s + i.remainingAmount, 0),
        totalOverdue: overdue.reduce((s, i) => s + i.remainingAmount, 0),
        totalPaidThisMonth: paidThisMonth.reduce((s, i) => s + i.paidAmount, 0),
        pendingCount: receivables.length,
        overdueCount: overdue.length,
    }
}
