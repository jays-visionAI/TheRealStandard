import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, cleanData } from './firebase'

// ============ LEAD SERVICE (비회원 거래문의 인입) ============

const LEADS_COLLECTION = 'leads'

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED'

export interface Lead {
    id: string
    companyName: string          // 상호 (필수)
    contactName: string          // 담당자명 (필수)
    phone: string                // 연락처 (필수)
    email?: string
    message?: string             // 문의 내용
    productId?: string           // 어떤 상품 상세에서 들어왔는지 (있으면)
    productName?: string         // 디노멀라이즈 (영업 빠른 확인용)
    source: 'PRODUCT_DETAIL' | 'CATALOG' | 'LANDING'  // 인입 경로
    status: LeadStatus
    createdAt: Timestamp
    updatedAt: Timestamp
}

export interface CreateLeadInput {
    companyName: string
    contactName: string
    phone: string
    email?: string
    message?: string
    productId?: string
    productName?: string
    source: Lead['source']
}

/** 비회원 거래문의 생성 (공개 — firestore.rules에서 create: if true 허용) */
export async function createLead(input: CreateLeadInput): Promise<string> {
    const payload = cleanData({
        ...input,
        status: 'NEW' as LeadStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    const ref = await addDoc(collection(db, LEADS_COLLECTION), payload)
    return ref.id
}

/** 영업/운영자용 — 전체 리드 최신순 조회 */
export async function getAllLeads(): Promise<Lead[]> {
    const q = query(collection(db, LEADS_COLLECTION), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead))
}

/** 리드 상태 변경 (영업 처리) */
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
    await updateDoc(doc(db, LEADS_COLLECTION, id), {
        status,
        updatedAt: serverTimestamp(),
    })
}
