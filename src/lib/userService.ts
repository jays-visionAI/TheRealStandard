import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db, cleanData } from './firebase'
import type { UserRole } from '../types'

// ============ 사업체 정보 타입 정의 ============

// 은행 정보 (공급사, 배송업체용)
export interface BankInfo {
    bankName: string
    accountNo: string
    accountHolder: string
}

// 사업체 공통 정보
export interface BusinessProfile {
    companyName: string           // 상호명
    bizRegNo: string              // 사업자등록번호
    ceoName: string               // 대표자명
    address: string               // 사업장 주소
    tel: string                   // 전화번호
    fax?: string                  // 팩스

    // 고객사 전용 (CUSTOMER)
    shipAddress1?: string         // 배송지1
    shipAddress2?: string         // 배송지2
    priceType?: 'wholesale' | 'retail'  // 가격 유형
    paymentTerms?: string         // 결제 조건
    creditLimit?: number          // 여신 한도
    isKeyAccount?: boolean        // 주요 거래처 여부
    contactPerson?: string        // 담당자명
    contactPhone?: string         // 담당자 연락처

    // 공급사 전용 (SUPPLIER)
    productCategories?: string[]  // 취급 품목 카테고리
    bankInfo?: BankInfo           // 계좌 정보

    // 배송업체 전용 (3PL)
    vehicleTypes?: string[]       // 보유 차량 유형
    serviceArea?: string[]        // 서비스 가능 지역
}

// ============ 통합 사용자 인터페이스 ============

// Firestore에서 사용할 User 인터페이스 (통합)
export interface FirestoreUser {
    id: string
    email: string
    name: string                  // 개인명 또는 담당자명
    phone?: string                // 개인 연락처
    role: UserRole
    status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
    firebaseUid?: string          // Firebase Auth UID
    inviteToken?: string          // 초대 토큰 (가입 전)

    // 사업체 정보 (CUSTOMER, SUPPLIER, 3PL 역할인 경우)
    business?: BusinessProfile

    // 레거시 호환용 (마이그레이션 후 제거 예정)
    orgId?: string
    password?: string             // 실제 프로덕션에서는 Firebase Auth 사용 권장

    createdAt: Timestamp
    updatedAt: Timestamp
    lastLogin?: Timestamp
}

// 컬렉션 참조
const USERS_COLLECTION = 'users'
const usersRef = collection(db, USERS_COLLECTION)

// ============ READ ============

// 모든 사용자 조회
export async function getAllUsers(): Promise<FirestoreUser[]> {
    const snapshot = await getDocs(usersRef)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestoreUser))
}

// ID로 사용자 조회
export async function getUserById(id: string): Promise<FirestoreUser | null> {
    const docRef = doc(db, USERS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as FirestoreUser
}

// 이메일로 사용자 조회 (소문자로 정규화)
export async function getUserByEmail(email: string): Promise<FirestoreUser | null> {
    const normalizedEmail = email.toLowerCase().trim()
    const q = query(usersRef, where('email', '==', normalizedEmail))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as FirestoreUser
}

// 역할별 사용자 조회
export async function getUsersByRole(role: UserRole): Promise<FirestoreUser[]> {
    const q = query(usersRef, where('role', '==', role))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestoreUser))
}

// ============ CREATE ============

// 새 사용자 생성 (이메일 소문자 정규화)
export async function createUser(userData: Omit<FirestoreUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreUser> {
    const newDocRef = doc(usersRef)
    const now = serverTimestamp()

    const newUser = {
        ...cleanData(userData),
        email: userData.email.toLowerCase().trim(),
        createdAt: now,
        updatedAt: now
    }

    await setDoc(newDocRef, newUser)

    // 생성된 문서 반환
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreUser
}

// 특정 ID로 사용자 생성 (초기 데이터 시드용, 이메일 소문자 정규화)
export async function createUserWithId(id: string, userData: Omit<FirestoreUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreUser> {
    const docRef = doc(db, USERS_COLLECTION, id)
    const now = serverTimestamp()

    const newUser = {
        ...cleanData(userData),
        email: userData.email.toLowerCase().trim(),
        createdAt: now,
        updatedAt: now
    }

    await setDoc(docRef, newUser)

    const created = await getDoc(docRef)
    return { id: created.id, ...created.data() } as FirestoreUser
}

// ============ UPDATE ============

// 사용자 정보 업데이트
export async function updateUser(id: string, data: Partial<FirestoreUser>): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, id)
    await updateDoc(docRef, {
        ...cleanData(data),
        updatedAt: serverTimestamp()
    })
}

// 마지막 로그인 시간 업데이트
export async function updateLastLogin(id: string): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, id)
    await updateDoc(docRef, {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
    })
}

// ============ DELETE ============

// 사용자 삭제
export async function deleteUser(id: string): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, id)
    await deleteDoc(docRef)
}

// ============ AUTH ============

// 이메일/비밀번호로 로그인 검증
export async function validateLogin(email: string, password: string): Promise<FirestoreUser | null> {
    const user = await getUserByEmail(email)
    if (!user) return null
    if (user.password !== password) return null
    if (user.status !== 'ACTIVE') return null

    // 로그인 성공시 lastLogin 업데이트
    await updateLastLogin(user.id)

    return user
}

// ============ SEED DATA ============

// 초기 데이터 시드 (개발용)
export async function seedInitialUsers(): Promise<void> {
    const existingUsers = await getAllUsers()
    if (existingUsers.length > 0) {
        console.log('Users already exist, skipping seed')
        return
    }

    const initialUsers = [
        { id: 'admin-1', email: 'admin@trs.co.kr', name: '김관리', role: 'ADMIN' as UserRole, status: 'ACTIVE' as const, password: '1234' },
        { id: 'acc-1', email: 'accounting@trs.co.kr', name: '이경리', role: 'ACCOUNTING' as UserRole, status: 'ACTIVE' as const, password: '1234' },
        { id: 'wh-1', email: 'warehouse@trs.co.kr', name: '박창고', role: 'WAREHOUSE' as UserRole, status: 'ACTIVE' as const, password: '1234' },
        { id: 'sales-1', email: 'sales@trs.co.kr', name: '최영업', role: 'OPS' as UserRole, status: 'ACTIVE' as const, password: '1234' },
    ]

    for (const user of initialUsers) {
        await createUserWithId(user.id, {
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            password: user.password
        })
    }

    console.log('Initial users seeded successfully')
}

// ============ 사업체 역할 관련 함수 ============

// 고객사(CUSTOMER) 목록 조회
export async function getAllCustomerUsers(): Promise<FirestoreUser[]> {
    const q = query(usersRef, where('role', '==', 'CUSTOMER'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestoreUser))
}

// 공급사(SUPPLIER) 목록 조회
export async function getAllSupplierUsers(): Promise<FirestoreUser[]> {
    const q = query(usersRef, where('role', '==', 'SUPPLIER'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestoreUser))
}

// 배송업체(3PL) 목록 조회
export async function getAll3PLUsers(): Promise<FirestoreUser[]> {
    const q = query(usersRef, where('role', '==', '3PL'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestoreUser))
}

// 사업체 정보로 사용자 조회 (사업자등록번호)
export async function getUserByBizRegNo(bizRegNo: string): Promise<FirestoreUser | null> {
    const q = query(usersRef, where('business.bizRegNo', '==', bizRegNo))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestoreUser
}

// 초대 토큰으로 사용자 조회
export async function getUserByInviteToken(token: string): Promise<FirestoreUser | null> {
    const q = query(usersRef, where('inviteToken', '==', token))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() } as FirestoreUser
}

// 사업체 정보 업데이트
export async function updateUserBusiness(id: string, business: Partial<BusinessProfile>): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, id)
    const user = await getUserById(id)
    if (!user) throw new Error('User not found')

    const updatedBusiness = {
        ...(user.business || {}),
        ...business
    }

    await updateDoc(docRef, {
        business: cleanData(updatedBusiness),
        updatedAt: serverTimestamp()
    })
}

// 활성 고객사 목록 (주문/발주 선택용)
export async function getActiveCustomers(): Promise<FirestoreUser[]> {
    const q = query(
        usersRef,
        where('role', '==', 'CUSTOMER'),
        where('status', '==', 'ACTIVE')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestoreUser))
}

// 활성 공급사 목록 (발주 선택용)
export async function getActiveSuppliers(): Promise<FirestoreUser[]> {
    const q = query(
        usersRef,
        where('role', '==', 'SUPPLIER'),
        where('status', '==', 'ACTIVE')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FirestoreUser))
}

// ============ 마이그레이션 함수 ============

// 기존 customers 컬렉션에서 users 컬렉션으로 데이터 마이그레이션
export async function migrateCustomersToUsers(): Promise<{ migrated: number; skipped: number; errors: string[] }> {
    const result = { migrated: 0, skipped: 0, errors: [] as string[] }

    try {
        // 기존 customers 컬렉션 조회
        const customersRef = collection(db, 'customers')
        const customersSnapshot = await getDocs(customersRef)

        console.log(`Found ${customersSnapshot.docs.length} customers to migrate`)

        for (const customerDoc of customersSnapshot.docs) {
            const customer = customerDoc.data()
            const customerId = customerDoc.id

            try {
                // 이미 users에 동일 이메일이 있는지 확인
                const existingUser = await getUserByEmail(customer.email || '')

                if (existingUser) {
                    console.log(`Skipping ${customer.email} - already exists in users`)
                    result.skipped++
                    continue
                }

                // users 컬렉션에 새 문서 생성
                const newUserData: Omit<FirestoreUser, 'id' | 'createdAt' | 'updatedAt'> = {
                    email: (customer.email || '').toLowerCase().trim(),
                    name: customer.contactPerson || customer.ceoName || '담당자',
                    phone: customer.contactPhone || customer.phone,
                    role: 'CUSTOMER',
                    status: customer.status || 'PENDING',
                    firebaseUid: customer.firebaseUid,
                    inviteToken: customer.inviteToken,
                    business: {
                        companyName: customer.companyName || '',
                        bizRegNo: customer.bizRegNo || '',
                        ceoName: customer.ceoName || '',
                        address: customer.address || '',
                        tel: customer.phone || '',
                        fax: customer.fax,
                        shipAddress1: customer.shipAddress1,
                        shipAddress2: customer.shipAddress2,
                        priceType: customer.priceType,
                        paymentTerms: customer.paymentTerms,
                        creditLimit: customer.creditLimit,
                        isKeyAccount: customer.isKeyAccount,
                        contactPerson: customer.contactPerson,
                        contactPhone: customer.contactPhone,
                    },
                    // 레거시 호환
                    orgId: customerId,
                    password: customer.password,
                }

                // 동일 ID로 생성 (참조 유지)
                await createUserWithId(customerId, newUserData)
                console.log(`Migrated customer: ${customer.companyName} (${customer.email})`)
                result.migrated++

            } catch (err: any) {
                const errorMsg = `Failed to migrate ${customer.email}: ${err.message}`
                console.error(errorMsg)
                result.errors.push(errorMsg)
            }
        }

        console.log(`Migration complete: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors.length} errors`)

    } catch (err: any) {
        console.error('Migration failed:', err)
        result.errors.push(`Migration failed: ${err.message}`)
    }

    return result
}
