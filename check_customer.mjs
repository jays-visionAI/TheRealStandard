import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyAdBrS6laoxwwwRwBAaxMUPyYCws-F4ocs",
    authDomain: "therealstandard-1e322.firebaseapp.com",
    projectId: "therealstandard-1e322",
    storageBucket: "therealstandard-1e322.firebasestorage.app",
    messagingSenderId: "685628763026",
    appId: "1:685628763026:web:4c6b434f05b3e04751af4b",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// 1. salesOrders에서 어반나이프 관련 데이터 찾기
const soSnap = await getDocs(collection(db, 'salesOrders'))
const allSO = soSnap.docs.map(d => ({ id: d.id, ...d.data() }))

// 어반나이프 salesOrders
const urbanKnife = allSO.filter(so => so.customerName && so.customerName.includes('어반나이프'))
console.log(`\n=== 어반나이프 salesOrders: ${urbanKnife.length}건 ===`)
urbanKnife.forEach(so => {
    console.log(`  ID: ${so.id}`)
    console.log(`    customerName: ${so.customerName}`)
    console.log(`    customerOrgId: ${so.customerOrgId}`)
    console.log(`    totalsAmount: ${so.totalsAmount}`)
    console.log(`    totalsKg: ${so.totalsKg}`)
    console.log(`    status: ${so.status}`)
    console.log(`    confirmedAt: ${so.confirmedAt?.toDate?.() || so.confirmedAt}`)
    console.log(`    sourceOrderSheetId: ${so.sourceOrderSheetId}`)
    console.log('')
})

// 2. 해당 salesOrders의 salesOrderItems 찾기
const itemsSnap = await getDocs(collection(db, 'salesOrderItems'))
const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
const urbanSOIds = new Set(urbanKnife.map(so => so.id))
const urbanItems = allItems.filter(item => urbanSOIds.has(item.salesOrderId))
console.log(`\n=== 어반나이프 salesOrderItems: ${urbanItems.length}건 ===`)
urbanItems.forEach(item => {
    console.log(`  salesOrderId: ${item.salesOrderId}`)
    console.log(`    productId: ${item.productId}`)
    console.log(`    productName: ${item.productName}`)
    console.log(`    qtyKg: ${item.qtyKg}`)
    console.log(`    unitPrice: ${item.unitPrice}`)
    console.log(`    amount: ${item.amount}`)
    console.log('')
})

// 3. orderSheets에서 어반나이프 관련
const osSnap = await getDocs(collection(db, 'orderSheets'))
const allOS = osSnap.docs.map(d => ({ id: d.id, ...d.data() }))
const urbanOS = allOS.filter(os => os.customerName && os.customerName.includes('어반나이프'))
console.log(`\n=== 어반나이프 orderSheets: ${urbanOS.length}건 ===`)
urbanOS.forEach(os => {
    console.log(`  ID: ${os.id}`)
    console.log(`    status: ${os.status}`)
    console.log(`    totalAmount: ${os.totalAmount}`)
    console.log(`    totalKg: ${os.totalKg}`)
    console.log('')
})

// 4. 전체 거래처별 매출 집계 확인
const customerMap = new Map()
allSO.forEach(so => {
    const existing = customerMap.get(so.customerOrgId) || { name: so.customerName, amount: 0, kg: 0, count: 0 }
    existing.amount += so.totalsAmount || 0
    existing.kg += so.totalsKg || 0
    existing.count += 1
    customerMap.set(so.customerOrgId, existing)
})
const ranking = [...customerMap.values()].sort((a, b) => b.amount - a.amount)
console.log('\n=== 전체 거래처별 매출 TOP 10 ===')
ranking.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i+1}. ${c.name}: ₩${c.amount.toLocaleString()} (${c.count}건 / ${Math.round(c.kg).toLocaleString()}kg)`)
})

process.exit(0)
