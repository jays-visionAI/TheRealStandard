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
import { db } from './firebase'
import type { UserRole } from '../types'

// Firestore에서 사용할 User 인터페이스
export interface FirestoreUser {
    id: string
    email: string
    name: string
    role: UserRole
    orgId?: string
    status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
    password?: string  // 실제 프로덕션에서는 Firebase Auth 사용 권장
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

// 이메일로 사용자 조회
export async function getUserByEmail(email: string): Promise<FirestoreUser | null> {
    const q = query(usersRef, where('email', '==', email))
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

// 새 사용자 생성
export async function createUser(userData: Omit<FirestoreUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreUser> {
    const newDocRef = doc(usersRef)
    const now = serverTimestamp()

    const newUser = {
        ...userData,
        createdAt: now,
        updatedAt: now
    }

    await setDoc(newDocRef, newUser)

    // 생성된 문서 반환
    const created = await getDoc(newDocRef)
    return { id: created.id, ...created.data() } as FirestoreUser
}

// 특정 ID로 사용자 생성 (초기 데이터 시드용)
export async function createUserWithId(id: string, userData: Omit<FirestoreUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreUser> {
    const docRef = doc(db, USERS_COLLECTION, id)
    const now = serverTimestamp()

    const newUser = {
        ...userData,
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
        ...data,
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
