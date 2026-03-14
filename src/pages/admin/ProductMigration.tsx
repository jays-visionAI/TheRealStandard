import { useState, useEffect } from 'react'
import {
    collection, getDocs, query, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getAllProducts, type FirestoreProduct } from '../../lib/productService'

// 확정주문에서 추출한 실제 상품 목록 (고유 상품명 + 카테고리 분류)
const REAL_PRODUCTS: { name: string; category1: '냉장' | '냉동' | '부산물'; category2: 'B2B' | 'BOTH' }[] = [
    // === 냉장 부위 ===
    { name: '삼겹살(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '미삼겹살(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '목심(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '등심(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '안심(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '전지(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '미전지(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '미후지(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '갈비(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '등갈비(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '돈등뼈(냉장)', category1: '냉장', category2: 'B2B' },
    { name: '돈우콤마(,)[냉장]', category1: '냉장', category2: 'B2B' },
    { name: 'A 돈피(냉장)', category1: '냉장', category2: 'B2B' },

    // === 냉동 부위 ===
    { name: '삼겹(진공/냉동)', category1: '냉동', category2: 'B2B' },
    { name: '갈비(진공/냉동)', category1: '냉동', category2: 'B2B' },
    { name: '등심(PE/냉동)', category1: '냉동', category2: 'B2B' },
    { name: '돈등뼈(냉동)', category1: '냉동', category2: 'B2B' },
    { name: '연골 (냉동)', category1: '냉동', category2: 'B2B' },
    { name: '잡육(PE/냉동)', category1: '냉동', category2: 'B2B' },

    // === 무항생제 냉장 ===
    { name: '무항생제 삼겹(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 삼겹살(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 미삼겹(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 암미삼겹(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 목심(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 등심(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 안심(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 전지(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 미전지(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 갈비(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 등갈비(진공/냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 돈등뼈(냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 A돈피(냉장)', category1: '냉장', category2: 'B2B' },
    { name: '무항생제 항정(진공/냉장)', category1: '냉장', category2: 'B2B' },

    // === 무항생제 냉동 ===
    { name: '무항생제 삼겹(진공/냉동)', category1: '냉동', category2: 'B2B' },
    { name: '무항생제 등심(PE/냉동)', category1: '냉동', category2: 'B2B' },
    { name: '무항생제 돈등뼈(냉동)', category1: '냉동', category2: 'B2B' },
    { name: '무항생제 A돈피(냉동)', category1: '냉동', category2: 'B2B' },
    { name: '무항생제 잡육(PE/냉동)', category1: '냉동', category2: 'B2B' },
    { name: '무항생제 후지(PE/냉동)', category1: '냉동', category2: 'B2B' },
    { name: '무항생제 A지방(냉동)', category1: '냉동', category2: 'B2B' },
]

// 박스중량 계산용 원본 데이터 (SeedOrders에서 추출: product, qty=박스수, weight=총중량)
type BoxItem = { product: string; qty: number; weight: number }
type BoxData = Record<string, BoxItem[]>

const TAEYOON_BOX_DATA: BoxData = {
    '25/11/12': [
        { product: '갈비(진공/냉동)', qty: 7, weight: 102.2 },
        { product: '삼겹살(진공/냉장)', qty: 55, weight: 935.3 },
        { product: '미삼겹살(진공/냉장)', qty: 20, weight: 364.5 },
        { product: '등심(PE/냉동)', qty: 10, weight: 200.0 },
        { product: '전지(진공/냉장)', qty: 10, weight: 123.3 },
        { product: '미전지(진공/냉장)', qty: 30, weight: 465.2 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 30, weight: 465.5 },
        { product: '무항생제 암미삼겹(진공/냉장)', qty: 5, weight: 95.1 },
        { product: '무항생제 등심(PE/냉동)', qty: 10, weight: 200.0 },
        { product: '무항생제 A돈피(냉동)', qty: 3, weight: 60.0 },
        { product: 'A 돈피(냉장)', qty: 10, weight: 200.0 },
        { product: '등갈비(진공/냉장)', qty: 5, weight: 63.1 },
        { product: '무항생제 갈비(진공/냉동)', qty: 3, weight: 48.0 },
        { product: '무항생제 A돈피(냉장)', qty: 5, weight: 100.0 },
    ],
    '25/12/12': [
        { product: '돈등뼈(냉동)', qty: 30, weight: 533.3 },
        { product: '갈비(진공/냉장)', qty: 10, weight: 143.4 },
        { product: '등갈비(진공/냉장)', qty: 11, weight: 138.7 },
        { product: '등심(진공/냉장)', qty: 5, weight: 72.2 },
        { product: '목심(진공/냉장)', qty: 40, weight: 400.4 },
        { product: '삼겹살(진공/냉장)', qty: 60, weight: 1056.2 },
        { product: '미삼겹살(진공/냉장)', qty: 20, weight: 366.3 },
        { product: '전지(진공/냉장)', qty: 20, weight: 258.3 },
        { product: '미전지(진공/냉장)', qty: 40, weight: 652.2 },
        { product: '무항생제 돈등뼈(냉장)', qty: 13, weight: 236.6 },
        { product: '무항생제 갈비(진공/냉장)', qty: 7, weight: 109.9 },
        { product: '무항생제 목심(진공/냉장)', qty: 22, weight: 216.2 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 55, weight: 966.2 },
        { product: '무항생제 전지(진공/냉장)', qty: 20, weight: 242.9 },
        { product: '무항생제 미전지(진공/냉장)', qty: 20, weight: 311.1 },
        { product: '무항생제 등갈비(진공/냉장)', qty: 5, weight: 62.0 },
        { product: '무항생제 등심(진공/냉장)', qty: 2, weight: 27.9 },
        { product: '안심(진공/냉장)', qty: 3, weight: 36.1 },
    ],
    '25/12/31': [
        { product: '연골 (냉동)', qty: 1, weight: 11.6 },
        { product: '갈비(진공/냉장)', qty: 5, weight: 79.8 },
        { product: '등갈비(진공/냉장)', qty: 6, weight: 81.0 },
        { product: '삼겹(진공/냉동)', qty: 10, weight: 178.1 },
        { product: '무항생제 목심(진공/냉장)', qty: 39, weight: 389.9 },
        { product: '무항생제 전지(진공/냉장)', qty: 29, weight: 350.0 },
        { product: '무항생제 미전지(진공/냉장)', qty: 50, weight: 787.2 },
        { product: '목심(진공/냉장)', qty: 1, weight: 11.0 },
        { product: '미삼겹살(진공/냉장)', qty: 10, weight: 193.4 },
        { product: '전지(진공/냉장)', qty: 11, weight: 147.0 },
        { product: '무항생제 돈등뼈(냉장)', qty: 10, weight: 193.9 },
        { product: '무항생제 A돈피(냉장)', qty: 4, weight: 80.0 },
        { product: '삼겹살(진공/냉장)', qty: 17, weight: 313.5 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 63, weight: 1086.3 },
    ],
    '26/01/08': [
        { product: '갈비(진공/냉장)', qty: 6, weight: 86.3 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 50, weight: 856.5 },
        { product: '무항생제 미삼겹(진공/냉장)', qty: 10, weight: 182.8 },
        { product: '무항생제 돈등뼈(냉장)', qty: 15, weight: 291.3 },
        { product: '목심(진공/냉장)', qty: 9, weight: 84.7 },
        { product: '미전지(진공/냉장)', qty: 20, weight: 278.5 },
        { product: '무항생제 갈비(진공/냉장)', qty: 4, weight: 64.4 },
        { product: '무항생제 목심(진공/냉장)', qty: 1, weight: 9.9 },
        { product: '무항생제 미전지(진공/냉장)', qty: 20, weight: 310.5 },
        { product: 'A 돈피(냉장)', qty: 2, weight: 40.0 },
        { product: '등갈비(진공/냉장)', qty: 30, weight: 317.8 },
    ],
    '26/01/21': [
        { product: '돈등뼈(냉장)', qty: 20, weight: 379.6 },
        { product: 'A 돈피(냉장)', qty: 9, weight: 180.0 },
        { product: '등갈비(진공/냉장)', qty: 20, weight: 254.7 },
        { product: '목심(진공/냉장)', qty: 40, weight: 410.2 },
        { product: '삼겹살(진공/냉장)', qty: 24, weight: 409.6 },
        { product: '미삼겹살(진공/냉장)', qty: 9, weight: 169.9 },
        { product: '전지(진공/냉장)', qty: 30, weight: 441.9 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 16, weight: 262.5 },
        { product: '무항생제 미삼겹(진공/냉장)', qty: 6, weight: 109.3 },
        { product: '연골 (냉동)', qty: 20, weight: 313.0 },
        { product: '안심(진공/냉장)', qty: 3, weight: 34.3 },
        { product: '무항생제 안심(진공/냉장)', qty: 1, weight: 11.5 },
    ],
    '26/01/29': [
        { product: 'A 돈피(냉장)', qty: 10, weight: 200.0 },
        { product: '등갈비(진공/냉장)', qty: 1, weight: 12.2 },
        { product: '미삼겹살(진공/냉장)', qty: 21, weight: 387.9 },
        { product: '안심(진공/냉장)', qty: 2, weight: 22.2 },
        { product: '전지(진공/냉장)', qty: 7, weight: 91.2 },
        { product: '미전지(진공/냉장)', qty: 30, weight: 491.1 },
        { product: '무항생제 등갈비(진공/냉장)', qty: 1, weight: 11.7 },
        { product: '무항생제 목심(진공/냉장)', qty: 9, weight: 92.1 },
        { product: '무항생제 전지(진공/냉장)', qty: 3, weight: 37.2 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 10, weight: 169.3 },
        { product: '무항생제 미삼겹(진공/냉장)', qty: 4, weight: 68.5 },
        { product: '무항생제 안심(진공/냉장)', qty: 1, weight: 11.3 },
        { product: '무항생제 돈등뼈(냉장)', qty: 3, weight: 55.1 },
    ],
    '26/02/04': [
        { product: '돈등뼈(냉장)', qty: 25, weight: 425.8 },
        { product: '갈비(진공/냉장)', qty: 20, weight: 337.8 },
        { product: '등갈비(진공/냉장)', qty: 6, weight: 79.3 },
        { product: '등심(진공/냉장)', qty: 2, weight: 31.6 },
        { product: '목심(진공/냉장)', qty: 18, weight: 171.3 },
        { product: '삼겹살(진공/냉장)', qty: 31, weight: 511.4 },
        { product: '미삼겹살(진공/냉장)', qty: 25, weight: 437.7 },
        { product: '안심(진공/냉장)', qty: 4, weight: 46.3 },
        { product: '전지(진공/냉장)', qty: 15, weight: 201.5 },
        { product: '미전지(진공/냉장)', qty: 32, weight: 484.4 },
        { product: '무항생제 등갈비(진공/냉장)', qty: 4, weight: 55.2 },
        { product: '무항생제 등심(진공/냉장)', qty: 1, weight: 17.7 },
        { product: '무항생제 목심(진공/냉장)', qty: 42, weight: 402.1 },
        { product: '무항생제 전지(진공/냉장)', qty: 25, weight: 356.5 },
        { product: '무항생제 미전지(진공/냉장)', qty: 8, weight: 129.4 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 39, weight: 638.8 },
        { product: '무항생제 안심(진공/냉장)', qty: 4, weight: 45.3 },
    ],
    '26/02/13': [
        { product: '무항생제 돈등뼈(냉동)', qty: 21, weight: 378.3 },
        { product: '돈등뼈(냉동)', qty: 105, weight: 1873.1 },
        { product: '돈우콤마(,)[냉장]', qty: 1, weight: 12.6 },
        { product: '갈비(진공/냉장)', qty: 17, weight: 283.0 },
        { product: '등갈비(진공/냉장)', qty: 13, weight: 176.9 },
        { product: '등심(진공/냉장)', qty: 5, weight: 75.4 },
        { product: '목심(진공/냉장)', qty: 50, weight: 485.7 },
        { product: '삼겹살(진공/냉장)', qty: 40, weight: 697.7 },
        { product: '미전지(진공/냉장)', qty: 20, weight: 343.5 },
        { product: '무항생제 갈비(진공/냉장)', qty: 3, weight: 49.4 },
        { product: '무항생제 등갈비(진공/냉장)', qty: 7, weight: 100.0 },
        { product: '안심(진공/냉장)', qty: 3, weight: 33.8 },
        { product: '무항생제 돈등뼈(냉장)', qty: 5, weight: 90.8 },
        { product: '전지(진공/냉장)', qty: 20, weight: 269.9 },
        { product: '무항생제 전지(진공/냉장)', qty: 20, weight: 283.3 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 30, weight: 519.0 },
        { product: '미삼겹살(진공/냉장)', qty: 20, weight: 368.7 },
    ],
    '26/02/20': [
        { product: '삼겹살(진공/냉장)', qty: 50, weight: 890.4 },
        { product: '미삼겹살(진공/냉장)', qty: 20, weight: 380.0 },
        { product: '미후지(진공/냉장)', qty: 10, weight: 264.4 },
        { product: '돈등뼈(냉장)', qty: 10, weight: 181.1 },
        { product: '갈비(진공/냉장)', qty: 10, weight: 170.6 },
        { product: '등갈비(진공/냉장)', qty: 10, weight: 151.9 },
        { product: '목심(진공/냉장)', qty: 30, weight: 312.1 },
    ],
    '26/03/10': [
        { product: '등갈비(진공/냉장)', qty: 5, weight: 54.4 },
        { product: '돈우콤마(,)[냉장]', qty: 2, weight: 24.0 },
        { product: '목심(진공/냉장)', qty: 6, weight: 59.9 },
        { product: '무항생제 목심(진공/냉장)', qty: 4, weight: 41.4 },
        { product: '미삼겹살(진공/냉장)', qty: 10, weight: 199.4 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 13, weight: 235.6 },
        { product: '삼겹(진공/냉동)', qty: 49, weight: 845.1 },
        { product: '삼겹살(진공/냉장)', qty: 12, weight: 207.6 },
        { product: '안심(진공/냉장)', qty: 2, weight: 11.3 },
    ],
    '26/03/12': [
        { product: '무항생제 돈등뼈(냉장)', qty: 8, weight: 142.7 },
        { product: '목심(진공/냉장)', qty: 10, weight: 98.1 },
        { product: '무항생제 목심(진공/냉장)', qty: 10, weight: 103.3 },
        { product: '무항생제 미삼겹(진공/냉장)', qty: 1, weight: 15.6 },
        { product: '미삼겹살(진공/냉장)', qty: 19, weight: 343.6 },
        { product: '미전지(진공/냉장)', qty: 68, weight: 1130.9 },
        { product: '무항생제 삼겹(진공/냉동)', qty: 5, weight: 106.9 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 19, weight: 323.7 },
        { product: '무항생제 삼겹살(진공/냉장)', qty: 36, weight: 614.5 },
        { product: '삼겹(진공/냉동)', qty: 25, weight: 437.8 },
        { product: '삼겹살(진공/냉장)', qty: 4, weight: 72.7 },
        { product: '안심(진공/냉장)', qty: 2, weight: 23.7 },
        { product: '전지(진공/냉장)', qty: 51, weight: 712.6 },
    ],
}

const BAEKWOON_BOX_DATA: BoxData = {
    '26/03/06': [
        { product: '돈등뼈(냉장)', qty: 30, weight: 603.0 },
        { product: '목심(진공/냉장)', qty: 34, weight: 340.9 },
        { product: '무항생제 목심(진공/냉장)', qty: 16, weight: 152.3 },
        { product: '무항생제 미전지(진공/냉장)', qty: 35, weight: 555.0 },
        { product: '미전지(진공/냉장)', qty: 45, weight: 734.3 },
        { product: '무항생제 삼겹(진공/냉장)', qty: 45, weight: 760.1 },
        { product: '삼겹살(진공/냉장)', qty: 35, weight: 615.0 },
        { product: '무항생제 전지(진공/냉장)', qty: 40, weight: 560.5 },
        { product: '전지(진공/냉장)', qty: 40, weight: 553.9 },
    ],
}

const DAEKYUNG_BOX_DATA: BoxData = {
    '26/03/09': [
        { product: '무항생제 잡육(PE/냉동)', qty: 7, weight: 140.0 },
        { product: '잡육(PE/냉동)', qty: 64, weight: 1280.0 },
        { product: '무항생제 후지(PE/냉동)', qty: 1, weight: 21.7 },
        { product: '무항생제 A지방(냉동)', qty: 1, weight: 20.0 },
    ],
}

const HNW_BOX_DATA: BoxData = {
    '26/03/06': [
        { product: '목심(진공/냉장)', qty: 1, weight: 8.9 },
        { product: '미삼겹살(진공/냉장)', qty: 1, weight: 17.2 },
        { product: '삼겹(진공/냉동)', qty: 1, weight: 20.3 },
        { product: '삼겹살(진공/냉장)', qty: 2, weight: 34.8 },
        { product: '무항생제 항정(진공/냉장)', qty: 1, weight: 10.7 },
    ],
}

export default function ProductMigration() {
    const [logs, setLogs] = useState<string[]>([])
    const [running, setRunning] = useState(false)
    const [existingProducts, setExistingProducts] = useState<FirestoreProduct[]>([])
    const [orderItemCount, setOrderItemCount] = useState(0)

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    }

    useEffect(() => {
        loadCurrent()
    }, [])

    const loadCurrent = async () => {
        try {
            const products = await getAllProducts()
            setExistingProducts(products)

            const itemsSnap = await getDocs(collection(db, 'salesOrderItems'))
            setOrderItemCount(itemsSnap.size)
        } catch (err) {
            console.error(err)
        }
    }

    // Step 1: 기존 테스트 상품 전체 삭제
    const deleteOldProducts = async () => {
        const products = await getAllProducts()
        addLog(`기존 상품 ${products.length}개 삭제 시작...`)
        for (const p of products) {
            await deleteDoc(doc(db, 'products', p.id))
            addLog(`  삭제: ${p.name} (${p.id})`)
        }
        addLog(`기존 상품 ${products.length}개 삭제 완료`)
    }

    // Step 2: 실제 상품 등록
    const createRealProducts = async (): Promise<Map<string, string>> => {
        const nameToId = new Map<string, string>()
        addLog(`신규 상품 ${REAL_PRODUCTS.length}개 등록 시작...`)

        for (const product of REAL_PRODUCTS) {
            const docRef = doc(collection(db, 'products'))
            const now = serverTimestamp()
            await setDoc(docRef, {
                name: product.name,
                category1: product.category1,
                category2: product.category2,
                unit: 'kg',
                taxFree: true,
                costPrice: 0,
                wholesalePrice: 0,
                isActive: true,
                memo: '',
                createdAt: now,
                updatedAt: now,
            })
            nameToId.set(product.name, docRef.id)
            addLog(`  등록: ${product.name} -> ${docRef.id}`)
        }

        addLog(`신규 상품 ${REAL_PRODUCTS.length}개 등록 완료`)
        return nameToId
    }

    // Step 3: salesOrderItems의 productId를 신규 상품 ID로 업데이트
    const relinkOrderItems = async (nameToId: Map<string, string>) => {
        addLog('salesOrderItems productId 연결 시작...')

        const itemsSnap = await getDocs(collection(db, 'salesOrderItems'))
        let updated = 0
        let notFound = 0
        const unmatchedNames = new Set<string>()

        for (const itemDoc of itemsSnap.docs) {
            const data = itemDoc.data()
            const productName = data.productName as string

            // productName에서 실제 상품명 추출 (기존 형식: "삼겹살(진공/냉장) (국내산)")
            // "(국내산)" 부분 제거
            const cleanName = productName.replace(/\s*\(국내산\)\s*$/, '').trim()

            const newProductId = nameToId.get(cleanName)
            if (newProductId) {
                await updateDoc(doc(db, 'salesOrderItems', itemDoc.id), {
                    productId: newProductId
                })
                updated++
            } else {
                unmatchedNames.add(cleanName)
                notFound++
            }
        }

        addLog(`productId 업데이트: ${updated}건 완료, ${notFound}건 매칭 실패`)
        if (unmatchedNames.size > 0) {
            addLog(`매칭 실패 상품명:`)
            unmatchedNames.forEach(name => addLog(`  - "${name}"`))
        }
    }

    // 전체 마이그레이션 실행
    const runFullMigration = async () => {
        setRunning(true)
        setLogs([])
        addLog('=== 상품 DB 마이그레이션 시작 ===')

        try {
            // Step 1
            await deleteOldProducts()

            // Step 2
            const nameToId = await createRealProducts()

            // Step 3
            await relinkOrderItems(nameToId)

            addLog('')
            addLog('=== 마이그레이션 완료! ===')
            addLog(`총 ${REAL_PRODUCTS.length}개 상품 등록, salesOrderItems productId 연결 완료`)

            // 새로고침
            await loadCurrent()
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        } finally {
            setRunning(false)
        }
    }

    // productId 연결만 다시 실행
    const runRelinkOnly = async () => {
        setRunning(true)
        setLogs([])
        addLog('=== productId 재연결 시작 ===')

        try {
            const products = await getAllProducts()
            const nameToId = new Map<string, string>()
            products.forEach(p => nameToId.set(p.name, p.id))

            addLog(`현재 등록된 상품 ${products.length}개로 매칭합니다...`)
            await relinkOrderItems(nameToId)

            addLog('')
            addLog('=== 재연결 완료! ===')
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        } finally {
            setRunning(false)
        }
    }

    // 가격 + 박스중량 복원: salesOrderItems + SeedOrders 원본 데이터에서 추출
    const runPriceRestore = async () => {
        setRunning(true)
        setLogs([])
        addLog('=== 상품 단가 + 박스중량 복원 시작 ===')

        try {
            // 1. 현재 등록된 상품 목록
            const products = await getAllProducts()
            const nameToProduct = new Map<string, FirestoreProduct>()
            products.forEach(p => nameToProduct.set(p.name, p))
            addLog(`현재 상품 DB: ${products.length}개`)

            // 2. salesOrderItems에서 모든 아이템 읽기
            const itemsSnap = await getDocs(collection(db, 'salesOrderItems'))
            addLog(`salesOrderItems: ${itemsSnap.size}건`)

            // 3. 상품명별 최신 가격 추출
            const priceMap = new Map<string, { unitPrice: number; count: number }>()

            for (const itemDoc of itemsSnap.docs) {
                const data = itemDoc.data()
                const productName = (data.productName as string || '').replace(/\s*\(국내산\)\s*$/, '').trim()
                const unitPrice = data.unitPrice as number || 0

                if (productName && unitPrice > 0) {
                    const existing = priceMap.get(productName)
                    priceMap.set(productName, {
                        unitPrice,
                        count: (existing?.count || 0) + 1
                    })
                }
            }

            // 4. SeedOrders 원본 데이터에서 박스중량 계산 (weight / qty)
            const boxWeightMap = new Map<string, { totalWeight: number; totalQty: number }>()

            for (const companyOrders of [TAEYOON_BOX_DATA, BAEKWOON_BOX_DATA, DAEKYUNG_BOX_DATA, HNW_BOX_DATA]) {
                for (const items of Object.values(companyOrders)) {
                    for (const item of items) {
                        const existing = boxWeightMap.get(item.product) || { totalWeight: 0, totalQty: 0 }
                        existing.totalWeight += item.weight
                        existing.totalQty += item.qty
                        boxWeightMap.set(item.product, existing)
                    }
                }
            }

            addLog(`가격 추출: ${priceMap.size}개, 박스중량 추출: ${boxWeightMap.size}개`)
            addLog('')

            // 5. 상품 DB 업데이트
            let updated = 0
            let notFound = 0

            // 가격이 있는 상품 + 박스중량이 있는 상품 합집합
            const allNames = new Set([...priceMap.keys(), ...boxWeightMap.keys()])

            for (const productName of allNames) {
                const product = nameToProduct.get(productName)
                if (product) {
                    const updateData: any = { updatedAt: serverTimestamp() }
                    const logParts: string[] = []

                    const priceData = priceMap.get(productName)
                    if (priceData) {
                        updateData.wholesalePrice = priceData.unitPrice
                        logParts.push(`가격: ₩${priceData.unitPrice.toLocaleString()}`)
                    }

                    const bwData = boxWeightMap.get(productName)
                    if (bwData && bwData.totalQty > 0) {
                        const avgBoxWeight = Math.round((bwData.totalWeight / bwData.totalQty) * 10) / 10
                        updateData.boxWeight = avgBoxWeight
                        logParts.push(`박스중량: ${avgBoxWeight}kg`)
                    }

                    await updateDoc(doc(db, 'products', product.id), updateData)
                    addLog(`  ${productName}: ${logParts.join(', ')}`)
                    updated++
                } else {
                    const priceData = priceMap.get(productName)
                    const bwData = boxWeightMap.get(productName)
                    const info = []
                    if (priceData) info.push(`₩${priceData.unitPrice.toLocaleString()}`)
                    if (bwData) info.push(`${(bwData.totalWeight / bwData.totalQty).toFixed(1)}kg/box`)
                    addLog(`  [미매칭] ${productName}: ${info.join(', ')}`)
                    notFound++
                }
            }

            addLog('')
            addLog(`=== 복원 완료! ===`)
            addLog(`업데이트: ${updated}개, 미매칭: ${notFound}개`)

            // 새로고침
            await loadCurrent()
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        } finally {
            setRunning(false)
        }
    }

    // salesOrders 상태 수정: 확정주문인데 status가 CREATED인 것을 COMPLETED로 변경
    const runFixOrderStatus = async () => {
        setRunning(true)
        setLogs([])
        addLog('=== salesOrders 상태 수정 시작 ===')

        try {
            const soSnap = await getDocs(collection(db, 'salesOrders'))
            let fixed = 0

            for (const soDoc of soSnap.docs) {
                const data = soDoc.data()
                if (data.status === 'CREATED' && data.confirmedAt) {
                    await updateDoc(doc(db, 'salesOrders', soDoc.id), {
                        status: 'COMPLETED'
                    })
                    addLog(`  ${data.customerName} (${soDoc.id}): CREATED -> COMPLETED`)
                    fixed++
                }
            }

            addLog('')
            addLog(`=== 완료! ${fixed}건 상태 수정 ===`)
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
        } finally {
            setRunning(false)
        }
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>상품 DB 마이그레이션</h1>
            <p style={{ color: '#888', marginBottom: '2rem' }}>
                테스트 상품 삭제 - 실제 거래 상품 등록 - salesOrderItems productId 연결
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px 24px', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f38ba8' }}>{existingProducts.length}</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>현재 상품 DB</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px 24px', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a6e3a1' }}>{REAL_PRODUCTS.length}</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>신규 등록 상품</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px 24px', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#89b4fa' }}>{orderItemCount}</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>salesOrderItems</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                    onClick={runFullMigration}
                    disabled={running}
                    style={{
                        padding: '12px 24px', backgroundColor: running ? '#888' : '#f38ba8',
                        color: '#1e1e2e', border: 'none', borderRadius: '8px', fontSize: '0.95rem',
                        fontWeight: 'bold', cursor: running ? 'not-allowed' : 'pointer',
                    }}
                >
                    전체 마이그레이션 (삭제+등록+연결)
                </button>
                <button
                    onClick={runRelinkOnly}
                    disabled={running}
                    style={{
                        padding: '12px 24px', backgroundColor: running ? '#888' : '#89b4fa',
                        color: '#1e1e2e', border: 'none', borderRadius: '8px', fontSize: '0.95rem',
                        fontWeight: 'bold', cursor: running ? 'not-allowed' : 'pointer',
                    }}
                >
                    productId 재연결만
                </button>
                <button
                    onClick={runPriceRestore}
                    disabled={running}
                    style={{
                        padding: '12px 24px', backgroundColor: running ? '#888' : '#a6e3a1',
                        color: '#1e1e2e', border: 'none', borderRadius: '8px', fontSize: '0.95rem',
                        fontWeight: 'bold', cursor: running ? 'not-allowed' : 'pointer',
                    }}
                >
                    가격 복원 (salesOrderItems에서)
                </button>
                <button
                    onClick={runFixOrderStatus}
                    disabled={running}
                    style={{
                        padding: '12px 24px', backgroundColor: running ? '#888' : '#fab387',
                        color: '#1e1e2e', border: 'none', borderRadius: '8px', fontSize: '0.95rem',
                        fontWeight: 'bold', cursor: running ? 'not-allowed' : 'pointer',
                    }}
                >
                    주문상태 수정 (CREATED-COMPLETED)
                </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '8px' }}>등록될 상품 목록 ({REAL_PRODUCTS.length}개)</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '4px 8px', textAlign: 'left' }}>#</th>
                                <th style={{ padding: '4px 8px', textAlign: 'left' }}>상품명</th>
                                <th style={{ padding: '4px 8px', textAlign: 'left' }}>카테고리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {REAL_PRODUCTS.map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '3px 8px', color: '#888' }}>{i + 1}</td>
                                    <td style={{ padding: '3px 8px' }}>{p.name}</td>
                                    <td style={{ padding: '3px 8px', color: p.category1 === '냉장' ? '#89dceb' : '#b4befe' }}>{p.category1}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{
                background: '#1e1e2e', borderRadius: '12px', padding: '1.5rem',
                fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.8',
                maxHeight: '400px', overflowY: 'auto', color: '#cdd6f4'
            }}>
                {logs.length === 0 ? (
                    <span style={{ color: '#666' }}>로그가 여기에 표시됩니다...</span>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} style={{
                            color: log.includes('ERROR') ? '#f38ba8'
                                : log.includes('완료') || log.includes('===') ? '#a6e3a1'
                                : log.includes('실패') ? '#fab387'
                                : '#cdd6f4'
                        }}>
                            {log}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
