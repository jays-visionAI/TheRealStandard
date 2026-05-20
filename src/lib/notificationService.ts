import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { getOverageStocks, getAllStocks } from './inventoryService'
import { getReceivables, markOverdueSettlements } from './settlementService'
import { getAllPriceLists } from './priceListService'

// ============ 타입 ============

export type NotificationType =
    | 'INVENTORY_OVERAGE'
    | 'INVENTORY_SHORTAGE'
    | 'PRICELIST_EXPIRING'
    | 'PRICELIST_EXPIRED'
    | 'SETTLEMENT_DUE'
    | 'SETTLEMENT_OVERDUE'

export type NotificationSeverity = 'INFO' | 'WARN' | 'DANGER'

export interface FirestoreNotification {
    id: string
    type: NotificationType
    severity: NotificationSeverity
    recipientUserId?: string
    recipientRoles?: string[]
    title: string
    message: string
    linkPath?: string
    linkLabel?: string
    sourceType?: 'INVENTORY' | 'SETTLEMENT' | 'PRICE_LIST' | 'ORDER'
    sourceId?: string
    isRead: boolean
    readBy?: string[]
    dedupKey?: string
    triggeredAt: Timestamp
    resolvedAt?: Timestamp
    expiresAt?: Timestamp
    createdAt: Timestamp
}

const COLLECTION = 'notifications'
const notifRef = collection(db, COLLECTION)

// ============ 기본 CRUD ============

export async function createNotification(
    data: Omit<FirestoreNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<string> {
    // 중복 방지: dedupKey가 있고 24시간 이내 같은 키 알람이 있으면 스킵
    if (data.dedupKey) {
        const dayAgo = new Date(Date.now() - 86400000)
        const dupQ = query(
            notifRef,
            where('dedupKey', '==', data.dedupKey),
            where('createdAt', '>=', Timestamp.fromDate(dayAgo))
        )
        const dupSnap = await getDocs(dupQ)
        if (!dupSnap.empty) {
            return dupSnap.docs[0].id
        }
    }

    const docRef = await addDoc(notifRef, {
        ...data,
        isRead: false,
        readBy: [],
        createdAt: serverTimestamp(),
    })
    return docRef.id
}

// 특정 유저(또는 역할)가 받을 알람 조회
export async function getNotificationsForUser(
    userId: string,
    userRole: string,
    limitCount = 50
): Promise<FirestoreNotification[]> {
    const q1 = query(
        notifRef,
        where('recipientUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    )

    const q2 = query(
        notifRef,
        where('recipientRoles', 'array-contains', userRole),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    )

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])

    const all = [
        ...snap1.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreNotification)),
        ...snap2.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreNotification)),
    ]

    // ID 기준 중복 제거
    const map = new Map<string, FirestoreNotification>()
    for (const n of all) map.set(n.id, n)

    // 만료 알람 제외 + 시각 역순 정렬
    const now = Date.now()
    return Array.from(map.values())
        .filter(n => !n.expiresAt || n.expiresAt.toDate().getTime() > now)
        .sort((a, b) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0))
}

// 미읽 알람 수
export async function getUnreadCount(userId: string, userRole: string): Promise<number> {
    const list = await getNotificationsForUser(userId, userRole, 100)
    return list.filter(n => {
        if (n.recipientUserId === userId) return !n.isRead
        return !(n.readBy || []).includes(userId)
    }).length
}

// 읽음 처리
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
    const docRef = doc(db, COLLECTION, notificationId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return
    const current = snap.data() as FirestoreNotification

    if (current.recipientUserId) {
        await updateDoc(docRef, { isRead: true })
        return
    }

    const readBy = current.readBy || []
    if (!readBy.includes(userId)) {
        await updateDoc(docRef, { readBy: [...readBy, userId] })
    }
}

// 일괄 읽음
export async function markAllAsRead(userId: string, userRole: string): Promise<void> {
    const list = await getNotificationsForUser(userId, userRole, 100)
    await Promise.all(list.map(n => markAsRead(n.id, userId)))
}

// 알람 삭제
export async function deleteNotification(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
}

// ============ 자동 감지 로직 ============

// 1. 재고 2일 초과 감지
export async function detectInventoryOverage(): Promise<number> {
    const overage = await getOverageStocks(2)
    let created = 0
    for (const event of overage) {
        const days = Math.floor((Date.now() - event.inboundAt.toDate().getTime()) / 86400000)
        await createNotification({
            type: 'INVENTORY_OVERAGE',
            severity: days >= 4 ? 'DANGER' : 'WARN',
            recipientRoles: ['ADMIN', 'OPS', 'SALES', 'WAREHOUSE'],
            title: `재고 ${days}일 경과: ${event.productName}`,
            message: `${event.productName} (${event.weightKg.toFixed(1)}kg, ${event.boxCount}박스)이 입고 ${days}일 경과했습니다. 출고 또는 냉동 전환을 검토하세요.`,
            linkPath: '/warehouse/inventory',
            linkLabel: '재고 현황 보기',
            sourceType: 'INVENTORY',
            sourceId: event.id,
            dedupKey: `OVERAGE_${event.id}`,
            triggeredAt: Timestamp.now(),
        })
        created++
    }
    return created
}

// 2. 결품 감지 (현재고 0 이하)
export async function detectInventoryShortage(thresholdKg = 0): Promise<number> {
    const stocks = await getAllStocks()
    let created = 0
    for (const s of stocks) {
        if (s.totalWeightKg > thresholdKg) continue
        await createNotification({
            type: 'INVENTORY_SHORTAGE',
            severity: 'DANGER',
            recipientRoles: ['ADMIN', 'OPS', 'PURCHASE', 'SALES'],
            title: `결품 발생: ${s.productName}`,
            message: `${s.productName} (${s.tempZone === 'CHILLED' ? '냉장' : '냉동'}) 재고가 0kg입니다. 매입 발주가 필요합니다.`,
            linkPath: '/admin/purchase-orders',
            linkLabel: '발주 생성',
            sourceType: 'INVENTORY',
            sourceId: s.productId,
            dedupKey: `SHORTAGE_${s.productId}_${s.tempZone}`,
            triggeredAt: Timestamp.now(),
        })
        created++
    }
    return created
}

// 3. 단가표 만료 감지
export async function detectPriceListExpiry(): Promise<number> {
    const lists = await getAllPriceLists()
    const now = Date.now()
    let created = 0

    for (const pl of lists) {
        if (!pl.validUntil) continue
        const validUntilMs = pl.validUntil.toDate().getTime()
        const daysLeft = Math.floor((validUntilMs - now) / 86400000)

        if (daysLeft < 0) {
            await createNotification({
                type: 'PRICELIST_EXPIRED',
                severity: 'DANGER',
                recipientRoles: ['ADMIN', 'OPS', 'SALES'],
                title: `단가표 만료: ${pl.title}`,
                message: `'${pl.title}' 단가표가 ${Math.abs(daysLeft)}일 전 만료되었습니다. 갱신이 필요합니다.`,
                linkPath: '/admin/products/price-lists',
                linkLabel: '단가표 갱신',
                sourceType: 'PRICE_LIST',
                sourceId: pl.id,
                dedupKey: `PL_EXPIRED_${pl.id}`,
                triggeredAt: Timestamp.now(),
            })
            created++
        } else if (daysLeft <= 3) {
            await createNotification({
                type: 'PRICELIST_EXPIRING',
                severity: 'WARN',
                recipientRoles: ['ADMIN', 'OPS', 'SALES'],
                title: `단가표 만료 임박 (${daysLeft}일)`,
                message: `'${pl.title}' 단가표가 ${daysLeft}일 후 만료됩니다.`,
                linkPath: '/admin/products/price-lists',
                linkLabel: '단가표 보기',
                sourceType: 'PRICE_LIST',
                sourceId: pl.id,
                dedupKey: `PL_EXPIRING_${pl.id}_${daysLeft}`,
                triggeredAt: Timestamp.now(),
            })
            created++
        }
    }
    return created
}

// 4. 미수채권 임박/연체 감지
export async function detectSettlementAlerts(): Promise<number> {
    await markOverdueSettlements()
    const receivables = await getReceivables()
    const now = Date.now()
    let created = 0

    for (const s of receivables) {
        if (!s.paymentDueAt) continue
        const dueMs = s.paymentDueAt.toDate().getTime()
        const daysLeft = Math.floor((dueMs - now) / 86400000)

        if (s.status === 'OVERDUE') {
            await createNotification({
                type: 'SETTLEMENT_OVERDUE',
                severity: 'DANGER',
                recipientRoles: ['ADMIN', 'OPS', 'ACCOUNTING', 'SALES'],
                title: `미수금 연체: ${s.customerName}`,
                message: `${s.customerName}의 ${s.remainingAmount.toLocaleString()}원이 ${Math.abs(daysLeft)}일 연체 중입니다.`,
                linkPath: `/admin/settlement/${s.id}`,
                linkLabel: '정산 처리',
                sourceType: 'SETTLEMENT',
                sourceId: s.id,
                dedupKey: `SETTLE_OVERDUE_${s.id}`,
                triggeredAt: Timestamp.now(),
            })
            created++
        } else if (daysLeft >= 0 && daysLeft <= 3) {
            await createNotification({
                type: 'SETTLEMENT_DUE',
                severity: 'WARN',
                recipientRoles: ['ADMIN', 'OPS', 'ACCOUNTING'],
                title: `결제기한 임박 (${daysLeft}일): ${s.customerName}`,
                message: `${s.customerName}의 ${s.remainingAmount.toLocaleString()}원 결제기한이 ${daysLeft}일 남았습니다.`,
                linkPath: `/admin/settlement/${s.id}`,
                linkLabel: '정산 보기',
                sourceType: 'SETTLEMENT',
                sourceId: s.id,
                dedupKey: `SETTLE_DUE_${s.id}_${daysLeft}`,
                triggeredAt: Timestamp.now(),
            })
            created++
        }
    }
    return created
}

// ============ 통합 자동 감지 ============

export async function runAllDetections(): Promise<{
    overage: number
    shortage: number
    priceList: number
    settlement: number
    total: number
}> {
    const [overage, shortage, priceList, settlement] = await Promise.all([
        detectInventoryOverage(),
        detectInventoryShortage(),
        detectPriceListExpiry(),
        detectSettlementAlerts(),
    ])
    return {
        overage,
        shortage,
        priceList,
        settlement,
        total: overage + shortage + priceList + settlement,
    }
}
