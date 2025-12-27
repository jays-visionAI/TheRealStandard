import {
    doc, getDoc, setDoc, updateDoc,
    serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ============ SYSTEM SETTINGS SERVICE ============

export interface SystemSettings {
    kakaoJsKey: string
    kakaoRestApiKey: string
    kakaoChannelId: string
    companyName: string
    supportEmail: string
}

const SYSTEM_SETTINGS_DOC = 'settings'
const SYSTEM_COLLECTION = 'system'

export async function getSystemSettings(): Promise<SystemSettings | null> {
    const docRef = doc(db, SYSTEM_COLLECTION, SYSTEM_SETTINGS_DOC)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return snapshot.data() as SystemSettings
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<void> {
    const docRef = doc(db, SYSTEM_COLLECTION, SYSTEM_SETTINGS_DOC)
    const existing = await getDoc(docRef)

    if (existing.exists()) {
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
    } else {
        await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    }
}

export async function seedInitialSystemSettings(): Promise<void> {
    const existing = await getSystemSettings()
    if (existing) return

    const initialSettings: SystemSettings = {
        kakaoJsKey: '673898687a7442cae2d24608c0f5f7f3',
        kakaoRestApiKey: '',
        kakaoChannelId: '_zeXxjG',
        companyName: 'THE REAL STANDARD (TRS)',
        supportEmail: 'admin@trs.co.kr'
    }

    const docRef = doc(db, SYSTEM_COLLECTION, SYSTEM_SETTINGS_DOC)
    await setDoc(docRef, {
        ...initialSettings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    })
    console.log('Initial system settings seeded')
}
