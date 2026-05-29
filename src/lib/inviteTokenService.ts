import { collection, doc, setDoc, getDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db, cleanData } from './firebase'

const INVITE_TOKENS_COLLECTION = 'inviteTokens'

export interface InviteToken {
    id: string
    userId: string
    token: string
    type: 'CUSTOMER' | 'SUPPLIER' | '3PL'
    usedAt: Date | null
    createdAt: Date
    expiresAt?: Date
}

export async function createInviteToken(params: {
    userId: string
    type: 'CUSTOMER' | 'SUPPLIER' | '3PL'
}): Promise<InviteToken> {
    const token = `invite-${Math.random().toString(36).substr(2, 9)}`
    const docRef = doc(db, INVITE_TOKENS_COLLECTION, token)
    const now = new Date()

    const data = {
        userId: params.userId,
        token,
        type: params.type,
        usedAt: null,
        createdAt: now,
    }

    await setDoc(docRef, cleanData({
        ...data,
        createdAt: serverTimestamp(),
    }))

    return { id: token, ...data }
}

export async function getInviteToken(token: string): Promise<InviteToken | null> {
    const docRef = doc(db, INVITE_TOKENS_COLLECTION, token)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null

    const data = snapshot.data()
    if (data.usedAt) return null

    return {
        id: snapshot.id,
        userId: data.userId,
        token: data.token,
        type: data.type,
        usedAt: data.usedAt?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        expiresAt: data.expiresAt?.toDate?.() || undefined,
    }
}

export async function markInviteTokenUsed(token: string): Promise<void> {
    const docRef = doc(db, INVITE_TOKENS_COLLECTION, token)
    await setDoc(docRef, { usedAt: serverTimestamp() }, { merge: true })
}

export async function clearLegacyInviteToken(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId)
    const snapshot = await getDoc(userRef)
    if (snapshot.exists() && snapshot.data().inviteToken) {
        await setDoc(userRef, { inviteToken: '' }, { merge: true })
    }
}

/**
 * 특정 사용자의 모든 미사용 초대 토큰 조회
 */
export async function getUserInviteTokens(userId: string): Promise<InviteToken[]> {
    const q = query(
        collection(db, INVITE_TOKENS_COLLECTION),
        where('userId', '==', userId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => {
        const data = d.data()
        return {
            id: d.id,
            userId: data.userId,
            token: data.token,
            type: data.type,
            usedAt: data.usedAt?.toDate?.() || null,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            expiresAt: data.expiresAt?.toDate?.() || undefined,
        }
    })
}
