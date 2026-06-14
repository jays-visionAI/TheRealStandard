import {
    collection, doc, getDocs, serverTimestamp, Timestamp, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { getAllCustomerUsers } from './userService'
import { getAllProducts } from './productService'

// ============ SALES IMPORT — 출하내역 엑셀 일괄입력 (관리자) ============
// 돈우출하내역 형식: [출고일자, 거래처코드, 거래처명, 대분류, 중분류, 등급, 제품코드,
//   제품명, 수량, 중량, 원가, 매출원가, 매출단가, 매출가]
// (거래처+날짜) 그룹 → salesOrders 1건, 그 라인 → salesOrderItems.
// 기존 salesOrders와 (거래처+KST날짜)로 dedup → 이미 입력된 건 자동 제외(idempotent).
// 신규 거래처는 결정적 합성 orgId(excel:상호명)로 저장 — 규칙상 임의 UID user 생성 불가하므로.
// ※ 원가(원가/매출원가)는 부정확 정보라 import 안 함. 매출가(=고객사 매입가)만 보존.

export interface ParsedLine {
    date: string          // YYYY-MM-DD
    custCode: string
    custName: string
    productCode: string
    productName: string
    qtyBox: number
    qtyKg: number
    unitPrice: number
    amount: number        // 매출가 = 그 거래처가 우리에게서 산 금액(= 고객 매입가)
}

export interface ImportGroup {
    key: string           // normCust|date
    custCode: string
    custName: string
    date: string
    customerOrgId: string // 매칭된 실제 orgId 또는 excel:합성
    matched: boolean      // 기존 거래처 계정과 매칭됨
    isNew: boolean        // 기존 salesOrders에 없음(= 입력 대상)
    lines: ParsedLine[]
    totalKg: number
    totalBoxes: number
    totalAmount: number
}

export interface ImportPlan {
    groups: ImportGroup[]
    newCount: number
    dupCount: number
    newLines: number
    newAmount: number
    matchedCusts: number
    syntheticCusts: number
    sheetNames: string[]
}

const norm = (s: any) => String(s || '').replace(/\(주\)|주식회사|㈜|농업회사법인|\s/g, '').trim()

function toYmd(v: any): string {
    if (v instanceof Date) {
        // 로컬 자정 기준 날짜 (엑셀 셀은 날짜만)
        return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
    }
    return String(v).slice(0, 10)
}

// 기존 salesOrders의 (거래처+KST날짜) 지문
function kstYmd(dt: Date): string {
    return new Date(dt.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

const num = (v: any) => {
    const n = Number(String(v).replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
}

/**
 * 엑셀(ArrayBuffer)을 파싱하고 기존 데이터와 대조해 입력 계획을 만든다. (쓰기 없음)
 */
export async function planSalesImport(buffer: ArrayBuffer): Promise<ImportPlan> {
    // XLSX 동적 import (브라우저)
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

    // 기존 salesOrders 지문 + 거래처 매핑 + (참고)상품
    const [soSnap, customers, products] = await Promise.all([
        getDocs(collection(db, 'salesOrders')),
        getAllCustomerUsers(),
        getAllProducts(),
    ])
    const existingKeys = new Set<string>()
    soSnap.docs.forEach(d => {
        const o: any = d.data()
        const dt = o.confirmedAt?.toDate?.()
        if (dt) existingKeys.add(`${norm(o.customerName)}|${kstYmd(dt)}`)
    })
    const custByNorm = new Map(customers.map(c => [norm((c as any).business?.companyName || c.name), c.id]))
    const prodByName = new Map(products.map(p => [String(p.name).trim(), p.id]))

    // 라인 파싱 → 그룹화
    const groups = new Map<string, ImportGroup>()
    const sheetNames: string[] = wb.SheetNames
    for (const sheet of sheetNames) {
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' })
        for (const r of rows) {
            const custName = String(r['거래처명'] || '').trim()
            if (!custName) continue
            const date = toYmd(r['출고일자'])
            const key = `${norm(custName)}|${date}`
            const line: ParsedLine = {
                date,
                custCode: String(r['거래처코드'] || ''),
                custName,
                productCode: String(r['제품코드'] || ''),
                productName: String(r['제품명'] || '').trim(),
                qtyBox: num(r['수량']),
                qtyKg: num(r['중량']),
                unitPrice: num(r['매출단가']),
                amount: num(r['매출가']),
            }
            ;(line as any)._productId = prodByName.get(line.productName) || ''
            if (!groups.has(key)) {
                const realOrgId = custByNorm.get(norm(custName))
                groups.set(key, {
                    key, custCode: line.custCode, custName, date,
                    customerOrgId: realOrgId || `excel:${norm(custName)}`,
                    matched: !!realOrgId,
                    isNew: !existingKeys.has(key),
                    lines: [], totalKg: 0, totalBoxes: 0, totalAmount: 0,
                })
            }
            const g = groups.get(key)!
            g.lines.push(line)
            g.totalKg += line.qtyKg
            g.totalBoxes += line.qtyBox
            g.totalAmount += line.amount
        }
    }

    const arr = [...groups.values()].sort((a, b) => a.date.localeCompare(b.date))
    const newGroups = arr.filter(g => g.isNew)
    return {
        groups: arr,
        newCount: newGroups.length,
        dupCount: arr.length - newGroups.length,
        newLines: newGroups.reduce((s, g) => s + g.lines.length, 0),
        newAmount: newGroups.reduce((s, g) => s + g.totalAmount, 0),
        matchedCusts: new Set(arr.filter(g => g.matched).map(g => g.key.split('|')[0])).size,
        syntheticCusts: new Set(arr.filter(g => !g.matched).map(g => g.key.split('|')[0])).size,
        sheetNames,
    }
}

/**
 * 신규 그룹만 salesOrders + salesOrderItems로 생성. 결정적 doc ID라 재실행해도 중복 없음.
 * @returns 생성된 주문 수
 */
export async function executeSalesImport(plan: ImportPlan): Promise<{ orders: number; items: number }> {
    const newGroups = plan.groups.filter(g => g.isNew)
    let orders = 0, items = 0
    // 배치(쓰기 500개 한도) 단위로 커밋
    let batch = writeBatch(db)
    let ops = 0
    const flush = async () => { if (ops > 0) { await batch.commit(); batch = writeBatch(db); ops = 0 } }

    for (const g of newGroups) {
        const ymd = g.date.replace(/-/g, '')
        const codePart = g.custCode || norm(g.custName).slice(0, 6)
        const soId = `XLS-${codePart}-${ymd}`
        // KST 정오로 저장 → KST 날짜 안정
        const confirmedAt = Timestamp.fromDate(new Date(`${g.date}T12:00:00+09:00`))
        const soRef = doc(db, 'salesOrders', soId)
        batch.set(soRef, {
            sourceOrderSheetId: `EXCEL-${codePart}-${ymd}`,
            customerOrgId: g.customerOrgId,
            customerName: g.custName,
            status: 'CREATED',
            totalsKg: Math.round(g.totalKg * 10) / 10,
            totalsBoxes: g.totalBoxes,
            totalsAmount: Math.round(g.totalAmount),
            orderUnit: 'kg',
            confirmedAt,
            createdAt: serverTimestamp(),
            importedFrom: 'excel',
        })
        ops++; orders++
        g.lines.forEach((ln, i) => {
            const itemRef = doc(db, 'salesOrderItems', `${soId}-${i + 1}`)
            batch.set(itemRef, {
                salesOrderId: soId,
                productId: (ln as any)._productId || '',
                productName: ln.productName,
                productCode: ln.productCode,
                qtyKg: ln.qtyKg,
                qtyBox: ln.qtyBox,
                unit: 'kg',
                unitPrice: ln.unitPrice,
                amount: Math.round(ln.amount),
            })
            ops++; items++
        })
        if (ops >= 400) await flush()
    }
    await flush()
    return { orders, items }
}
