import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, cleanData } from './firebase'

// ============ SUPPLIER APPLICATION SERVICE (공급사 입점제안) ============
// 비회원 공급사가 입점 신청 → PURCHASE/ADMIN이 심사. (docs/supplier_onboarding_spec.md)

const COLLECTION = 'supplierApplications'

export type SupplierApplicationStatus =
    | 'SUBMITTED'   // 신청 접수
    | 'REVIEWING'   // 검토 중
    | 'APPROVED'    // 승인 (온보딩 대기)
    | 'REJECTED'    // 반려
    | 'ON_HOLD'     // 보류
    | 'ONBOARDED'   // 계정 발급 완료

export interface SupplierApplication {
    id: string
    companyName: string          // 상호 (필수)
    bizRegNo: string             // 사업자등록번호 (필수)
    ceoName: string              // 대표자 (필수)
    contactName: string          // 담당자 (필수)
    contactPhone: string         // 연락처 (필수)
    contactEmail?: string
    categories: string[]         // 취급 카테고리
    mainItems?: string           // 주요 품목
    monthlyCapacity?: string     // 월 공급능력
    origin?: string              // 산지/도축장
    message?: string
    status: SupplierApplicationStatus
    reviewNote?: string
    reviewedBy?: string
    reviewedAt?: Timestamp
    inviteToken?: string         // 승인 시 발급(Phase B)
    linkedUserId?: string        // 온보딩된 SUPPLIER user(Phase B)
    createdAt: Timestamp
    updatedAt: Timestamp
}

export interface CreateSupplierApplicationInput {
    companyName: string
    bizRegNo: string
    ceoName: string
    contactName: string
    contactPhone: string
    contactEmail?: string
    categories: string[]
    mainItems?: string
    monthlyCapacity?: string
    origin?: string
    message?: string
}

/** 비회원 입점 신청 (공개 — rules에서 create: if true) */
export async function createSupplierApplication(input: CreateSupplierApplicationInput): Promise<string> {
    const payload = cleanData({
        ...input,
        status: 'SUBMITTED' as SupplierApplicationStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    const ref = await addDoc(collection(db, COLLECTION), payload)
    return ref.id
}

/** 심사용 — 전체 신청 최신순 (PURCHASE/ADMIN) */
export async function getAllSupplierApplications(): Promise<SupplierApplication[]> {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupplierApplication))
}

/** 상태 변경 + 심사 메모 (PURCHASE/ADMIN) */
export async function updateSupplierApplicationStatus(
    id: string,
    status: SupplierApplicationStatus,
    opts?: { reviewNote?: string; reviewedBy?: string }
): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), cleanData({
        status,
        reviewNote: opts?.reviewNote,
        reviewedBy: opts?.reviewedBy,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }))
}
