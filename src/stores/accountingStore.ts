import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 정산 기록 타입
export interface AccountingRecord {
    id: string
    type: 'SALES' | 'PURCHASE'  // 매출/매입 구분
    referenceId: string          // SalesOrder 또는 PurchaseOrder ID
    referenceNumber: string      // 주문번호/발주번호
    counterpartyId: string       // 고객사 또는 공급처 ID
    counterpartyName: string     // 고객사 또는 공급처명
    transactionDate: string      // 거래일자
    items: string                // 품목 요약

    amount: number              // 공급가액
    tax: number                 // 세액 (10%)
    totalAmount: number         // 합계

    invoiceStatus: 'PENDING' | 'ISSUED' | 'RECEIVED'  // 세금계산서 상태
    invoiceFile?: string        // 세금계산서 파일 URL
    invoiceNumber?: string      // 세금계산서 번호
    invoiceDate?: string        // 세금계산서 발행/수취일

    paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED'  // 수금/지급 상태
    paymentAmount?: number      // 지급/수금 금액
    paymentDate?: string        // 지급/수금일

    certificateFile?: string    // 등급확인서 파일 (매입만)
    certificateGrade?: string   // 등급 (1+, 1, 2 등)

    notes?: string
    createdAt: string
    updatedAt: string
}

// 세금계산서 타입
export interface Invoice {
    id: string
    type: 'ISSUED' | 'RECEIVED'  // 발행(매출)/수취(매입)
    invoiceNumber: string
    accountingRecordId: string
    counterpartyName: string
    amount: number
    tax: number
    totalAmount: number
    issueDate: string
    fileUrl?: string
    createdAt: string
}

// 등급확인서 타입
export interface GradeCertificate {
    id: string
    purchaseOrderId: string
    supplierName: string
    grade: string               // 1++, 1+, 1, 2, 3
    productName: string
    weight: number
    certNumber: string
    certDate: string
    fileUrl?: string
    createdAt: string
}

interface AccountingState {
    records: AccountingRecord[]
    invoices: Invoice[]
    certificates: GradeCertificate[]

    // Records
    addRecord: (record: Omit<AccountingRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
    updateRecord: (id: string, updates: Partial<AccountingRecord>) => void
    deleteRecord: (id: string) => void

    // Invoice actions
    uploadInvoice: (recordId: string, invoiceNumber: string, fileUrl?: string) => void

    // Payment actions
    updatePaymentStatus: (recordId: string, status: AccountingRecord['paymentStatus'], amount?: number) => void

    // Certificate actions
    addCertificate: (cert: Omit<GradeCertificate, 'id' | 'createdAt'>) => void
    deleteCertificate: (id: string) => void

    // Getters
    getSalesRecords: () => AccountingRecord[]
    getPurchaseRecords: () => AccountingRecord[]
    getPendingRecords: () => AccountingRecord[]
    getCompletedRecords: () => AccountingRecord[]
}

// 샘플 데이터
const sampleRecords: AccountingRecord[] = [
    {
        id: 'acc-001',
        type: 'SALES',
        referenceId: 'so-001',
        referenceNumber: 'SO-2025-0001',
        counterpartyId: 'cust-001',
        counterpartyName: '맛있는식당',
        transactionDate: '2025-12-20',
        items: '한우 등심 10kg, 한우 안심 5kg',
        amount: 1500000,
        tax: 150000,
        totalAmount: 1650000,
        invoiceStatus: 'ISSUED',
        invoiceNumber: 'TAX-2025-001',
        invoiceDate: '2025-12-21',
        paymentStatus: 'COMPLETED',
        paymentAmount: 1650000,
        paymentDate: '2025-12-25',
        createdAt: '2025-12-20T10:00:00',
        updatedAt: '2025-12-25T14:00:00'
    },
    {
        id: 'acc-002',
        type: 'SALES',
        referenceId: 'so-002',
        referenceNumber: 'SO-2025-0002',
        counterpartyId: 'cust-002',
        counterpartyName: '고기마을',
        transactionDate: '2025-12-22',
        items: '돼지 삼겹살 20kg',
        amount: 400000,
        tax: 40000,
        totalAmount: 440000,
        invoiceStatus: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: '2025-12-22T09:00:00',
        updatedAt: '2025-12-22T09:00:00'
    },
    {
        id: 'acc-003',
        type: 'PURCHASE',
        referenceId: 'po-001',
        referenceNumber: 'PO-2025-0001',
        counterpartyId: 'sup-001',
        counterpartyName: '축산농장',
        transactionDate: '2025-12-18',
        items: '한우 통째 100kg',
        amount: 2000000,
        tax: 200000,
        totalAmount: 2200000,
        invoiceStatus: 'RECEIVED',
        invoiceNumber: 'SUP-TAX-001',
        invoiceDate: '2025-12-19',
        paymentStatus: 'COMPLETED',
        paymentAmount: 2200000,
        paymentDate: '2025-12-23',
        certificateGrade: '1+',
        createdAt: '2025-12-18T08:00:00',
        updatedAt: '2025-12-23T16:00:00'
    },
    {
        id: 'acc-004',
        type: 'PURCHASE',
        referenceId: 'po-002',
        referenceNumber: 'PO-2025-0002',
        counterpartyId: 'sup-002',
        counterpartyName: '돈육농장',
        transactionDate: '2025-12-24',
        items: '돼지 반마리 50kg x 10',
        amount: 1800000,
        tax: 180000,
        totalAmount: 1980000,
        invoiceStatus: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: '2025-12-24T10:00:00',
        updatedAt: '2025-12-24T10:00:00'
    },
]

export const useAccountingStore = create<AccountingState>()(
    persist(
        (set, get) => ({
            records: sampleRecords,
            invoices: [],
            certificates: [],

            addRecord: (record) => {
                const now = new Date().toISOString()
                const newRecord: AccountingRecord = {
                    ...record,
                    id: `acc-${Date.now()}`,
                    createdAt: now,
                    updatedAt: now
                }
                set((state) => ({ records: [...state.records, newRecord] }))
            },

            updateRecord: (id, updates) => {
                set((state) => ({
                    records: state.records.map(r =>
                        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
                    )
                }))
            },

            deleteRecord: (id) => {
                set((state) => ({ records: state.records.filter(r => r.id !== id) }))
            },

            uploadInvoice: (recordId, invoiceNumber, fileUrl) => {
                const record = get().records.find(r => r.id === recordId)
                if (!record) return

                const invoiceStatus = record.type === 'SALES' ? 'ISSUED' : 'RECEIVED'
                get().updateRecord(recordId, {
                    invoiceStatus,
                    invoiceNumber,
                    invoiceFile: fileUrl,
                    invoiceDate: new Date().toISOString().split('T')[0]
                })

                // Add to invoices list
                const invoice: Invoice = {
                    id: `inv-${Date.now()}`,
                    type: record.type === 'SALES' ? 'ISSUED' : 'RECEIVED',
                    invoiceNumber,
                    accountingRecordId: recordId,
                    counterpartyName: record.counterpartyName,
                    amount: record.amount,
                    tax: record.tax,
                    totalAmount: record.totalAmount,
                    issueDate: new Date().toISOString().split('T')[0],
                    fileUrl,
                    createdAt: new Date().toISOString()
                }
                set((state) => ({ invoices: [...state.invoices, invoice] }))
            },

            updatePaymentStatus: (recordId, status, amount) => {
                get().updateRecord(recordId, {
                    paymentStatus: status,
                    paymentAmount: amount,
                    paymentDate: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : undefined
                })
            },

            addCertificate: (cert) => {
                const newCert: GradeCertificate = {
                    ...cert,
                    id: `cert-${Date.now()}`,
                    createdAt: new Date().toISOString()
                }
                set((state) => ({ certificates: [...state.certificates, newCert] }))
            },

            deleteCertificate: (id) => {
                set((state) => ({ certificates: state.certificates.filter(c => c.id !== id) }))
            },

            getSalesRecords: () => get().records.filter(r => r.type === 'SALES'),
            getPurchaseRecords: () => get().records.filter(r => r.type === 'PURCHASE'),
            getPendingRecords: () => get().records.filter(r =>
                r.invoiceStatus === 'PENDING' || r.paymentStatus === 'PENDING'
            ),
            getCompletedRecords: () => get().records.filter(r =>
                r.invoiceStatus !== 'PENDING' && r.paymentStatus === 'COMPLETED'
            ),
        }),
        {
            name: 'trs-accounting-storage'
        }
    )
)
