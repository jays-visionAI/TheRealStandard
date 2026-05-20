import jsPDF from 'jspdf'
import type { FirestoreSalesOrder, FirestoreSalesOrderItem } from './orderService'
import type { FirestoreSettlement } from './settlementService'
import { uploadFile } from './fileService'

interface OutboundStatementParams {
    salesOrder: FirestoreSalesOrder
    items: FirestoreSalesOrderItem[]
    settlement?: FirestoreSettlement | null
    uploadedBy: string
    uploadToStorage?: boolean
}

/**
 * 출고 거래명세서 PDF 생성
 * 한글 폰트 미포함 — 영문/숫자 위주. 후속 Sprint에서 NotoSansKR 추가 예정.
 */
export async function generateOutboundStatementPDF(
    params: OutboundStatementParams
): Promise<{ blob: Blob; storageFileId?: string }> {
    const { salesOrder, items, settlement } = params

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })

    pdf.setFontSize(20)
    pdf.text('OUTBOUND STATEMENT', 105, 20, { align: 'center' })

    pdf.setFontSize(11)
    pdf.text(`Order ID: ${salesOrder.id}`, 20, 35)
    pdf.text(`Customer: ${salesOrder.customerName}`, 20, 42)
    pdf.text(`Date: ${new Date().toLocaleDateString('en-US')}`, 20, 49)

    // 표 헤더
    pdf.setFontSize(10)
    pdf.line(20, 60, 190, 60)
    pdf.text('Product', 22, 67)
    pdf.text('Qty(kg)', 110, 67, { align: 'right' })
    pdf.text('Unit Price', 145, 67, { align: 'right' })
    pdf.text('Amount', 188, 67, { align: 'right' })
    pdf.line(20, 70, 190, 70)

    let y = 78
    items.forEach((item) => {
        const productName = item.productName || ''
        pdf.text(productName.substring(0, 30), 22, y)
        pdf.text((item.qtyKg || 0).toFixed(1), 110, y, { align: 'right' })
        pdf.text((item.unitPrice || 0).toLocaleString(), 145, y, { align: 'right' })
        pdf.text(((item.qtyKg || 0) * (item.unitPrice || 0)).toLocaleString(), 188, y, { align: 'right' })
        y += 7
        if (y > 270) {
            pdf.addPage()
            y = 20
        }
    })

    pdf.line(20, y + 2, 190, y + 2)
    y += 10
    pdf.setFontSize(11)
    if (settlement) {
        pdf.text('Estimated Amount:', 130, y, { align: 'right' })
        pdf.text(`${settlement.estimatedAmount.toLocaleString()} KRW`, 188, y, { align: 'right' })
        y += 7
        pdf.text('Final Amount:', 130, y, { align: 'right' })
        pdf.text(`${settlement.finalAmount.toLocaleString()} KRW`, 188, y, { align: 'right' })
        y += 7
        pdf.text('Final Weight:', 130, y, { align: 'right' })
        pdf.text(`${settlement.finalWeightKg.toFixed(1)} kg`, 188, y, { align: 'right' })
    } else {
        pdf.text('Total Amount:', 130, y, { align: 'right' })
        pdf.text(`${(salesOrder.totalsAmount || 0).toLocaleString()} KRW`, 188, y, { align: 'right' })
    }

    pdf.setFontSize(8)
    pdf.text('* This is a system-generated document.', 105, 285, { align: 'center' })
    pdf.text('Meat Go AI', 105, 290, { align: 'center' })

    const blob = pdf.output('blob')

    let storageFileId: string | undefined
    if (params.uploadToStorage) {
        const fileName = `outbound_${salesOrder.id}_${Date.now()}.pdf`
        const result = await uploadFile({
            file: blob,
            fileName,
            fileType: 'OUTBOUND_STATEMENT',
            relatedType: 'SALES_ORDER',
            relatedId: salesOrder.id,
            description: `${salesOrder.customerName} outbound statement`,
            uploadedBy: params.uploadedBy,
        })
        storageFileId = result.id
    }

    return { blob, storageFileId }
}

/**
 * 브라우저에서 PDF 즉시 다운로드
 */
export function triggerPdfDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
