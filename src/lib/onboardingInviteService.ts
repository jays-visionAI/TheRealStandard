import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, cleanData } from './firebase'

// ============ ONBOARDING INVITE SERVICE (공급사 입점 온보딩 토큰) ============
// 승인된 입점신청에 대해 토큰을 발급. 공급사가 토큰으로 접속해 **본인 UID로 직접 계정을 생성**하므로
// 사전 유저가 필요 없고 users 생성 규칙 충돌도 없음. (docs/supplier_onboarding_spec.md — Phase B)

const COLLECTION = 'onboardingInvites'

export interface OnboardingInvite {
    token: string
    applicationId: string
    // 신청서에서 가져온 사전 채움 정보 (공개 read — 토큰 소지자만 링크를 앎)
    companyName: string
    bizRegNo: string
    ceoName: string
    contactName: string
    contactPhone: string
    contactEmail?: string
    categories: string[]
    used: boolean
    linkedUserId?: string     // 온보딩 완료 시 생성된 SUPPLIER user id
    createdAt: Timestamp
    usedAt?: Timestamp
}

function genToken(): string {
    // crypto 미사용(Math.random 허용 환경: 앱 런타임). 충분히 유니크한 토큰.
    return `sup-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
}

export interface CreateOnboardingInviteInput {
    applicationId: string
    companyName: string
    bizRegNo: string
    ceoName: string
    contactName: string
    contactPhone: string
    contactEmail?: string
    categories: string[]
}

/** 승인된 신청에 대해 온보딩 초대 발급 (PURCHASE/ADMIN). 토큰 반환. */
export async function createOnboardingInvite(input: CreateOnboardingInviteInput): Promise<string> {
    const token = genToken()
    await setDoc(doc(db, COLLECTION, token), cleanData({
        token,
        ...input,
        used: false,
        createdAt: serverTimestamp(),
    }))
    return token
}

/** 토큰으로 초대 조회 (공개 — 온보딩 페이지에서 사용) */
export async function getOnboardingInvite(token: string): Promise<OnboardingInvite | null> {
    const snap = await getDoc(doc(db, COLLECTION, token))
    if (!snap.exists()) return null
    return snap.data() as OnboardingInvite
}

/** 온보딩 완료 표시 (온보딩 중인 공급사 본인이 호출 — rules: update if isAuthenticated) */
export async function markOnboardingInviteUsed(token: string, linkedUserId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, token), {
        used: true,
        linkedUserId,
        usedAt: serverTimestamp(),
    })
}

/** 특정 신청건의 온보딩 초대 조회 (인박스에서 온보딩 상태 표시용) */
export async function getOnboardingInviteByApplication(applicationId: string): Promise<OnboardingInvite | null> {
    const q = query(collection(db, COLLECTION), where('applicationId', '==', applicationId))
    const snap = await getDocs(q)
    if (snap.empty) return null
    return snap.docs[0].data() as OnboardingInvite
}
