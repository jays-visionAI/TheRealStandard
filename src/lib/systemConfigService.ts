import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

/**
 * system/api-keys 도큐먼트 — 외부 API 키를 Firestore에 영속화.
 * 모든 어드민이 공유하며, 로컬 systemStore와 동기화한다.
 *
 * 보안: firestore.rules에 의해 read는 직원(isStaff), write는 ADMIN/OPS만.
 */
export interface SystemApiKeys {
    datagoKey?: string         // 공공데이터포털 (EKAPE 등)
    kamisKey?: string          // KAMIS 인증키
    kamisId?: string           // KAMIS ID
    naverClientId?: string     // 네이버 Open API Client ID
    naverClientSecret?: string // 네이버 Open API Client Secret
    updatedAt?: any            // Timestamp
    updatedBy?: string         // 마지막 수정자 UID
}

const COLLECTION = 'system'
const DOC_ID = 'api-keys'

export async function getSystemApiKeys(): Promise<SystemApiKeys | null> {
    try {
        const snap = await getDoc(doc(db, COLLECTION, DOC_ID))
        if (!snap.exists()) return null
        return snap.data() as SystemApiKeys
    } catch (err) {
        console.error('Failed to load system API keys:', err)
        return null
    }
}

export async function saveSystemApiKeys(keys: Partial<SystemApiKeys>, updatedBy: string): Promise<void> {
    const ref = doc(db, COLLECTION, DOC_ID)
    // undefined 필드 제거 (Firestore가 거부)
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(keys)) {
        if (v !== undefined) clean[k] = v
    }
    await setDoc(ref, {
        ...clean,
        updatedAt: serverTimestamp(),
        updatedBy,
    }, { merge: true })
}
