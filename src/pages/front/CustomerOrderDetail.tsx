import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    getSalesOrderById,
    getSalesOrderItems,
    type FirestoreSalesOrder,
    type FirestoreSalesOrderItem,
} from '../../lib/orderService'
import { getSettlementBySalesOrder, type FirestoreSettlement } from '../../lib/settlementService'
import { getFilesByRelated, type FirestoreFileAttachment } from '../../lib/fileService'
import { generateOutboundStatementPDF, triggerPdfDownload } from '../../lib/pdfService'
import { useAuth } from '../../contexts/AuthContext'
import { FileList } from '../../components/FileUpload'
import { ChevronLeftIcon, FileTextIcon } from '../../components/Icons'
import './CustomerOrderDetail.css'

export default function CustomerOrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [order, setOrder] = useState<FirestoreSalesOrder | null>(null)
    const [items, setItems] = useState<FirestoreSalesOrderItem[]>([])
    const [settlement, setSettlement] = useState<FirestoreSettlement | null>(null)
    const [statements, setStatements] = useState<FirestoreFileAttachment[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            if (!id) return
            try {
                const [so, soItems, settle] = await Promise.all([
                    getSalesOrderById(id),
                    getSalesOrderItems(id),
                    getSettlementBySalesOrder(id),
                ])
                setOrder(so)
                setItems(soItems)
                setSettlement(settle)

                const files = await getFilesByRelated('SALES_ORDER', id, 'OUTBOUND_STATEMENT')
                setStatements(files)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    const handleDownloadPdf = async () => {
        if (!order || !user) return
        const { blob } = await generateOutboundStatementPDF({
            salesOrder: order,
            items,
            settlement,
            uploadedBy: user.id,
            uploadToStorage: false,
        })
        triggerPdfDownload(blob, `outbound_${order.id}.pdf`)
    }

    if (loading) return <div className="customer-order-detail"><p>로딩 중...</p></div>
    if (!order) return <div className="customer-order-detail"><p>주문을 찾을 수 없습니다.</p></div>

    return (
        <div className="customer-order-detail">
            <button className="btn btn-ghost" onClick={() => navigate('/order/history')}>
                <ChevronLeftIcon size={16} /> 주문 목록
            </button>

            <h1>주문 #{order.id.slice(-6)}</h1>

            <div className="info-card">
                <div className="info-row"><span>주문일</span><span>{order.createdAt?.toDate().toLocaleDateString('ko-KR')}</span></div>
                <div className="info-row"><span>상태</span><span>{order.status}</span></div>
                <div className="info-row"><span>총 중량</span><span>{order.totalsKg.toFixed(1)} kg</span></div>
                <div className="info-row"><span>총 금액</span><span>{order.totalsAmount.toLocaleString()}원</span></div>
            </div>

            <div className="items-card">
                <h3>주문 품목</h3>
                <table>
                    <thead>
                        <tr><th>품목</th><th>수량(kg)</th><th>단가</th><th>금액</th></tr>
                    </thead>
                    <tbody>
                        {items.map(i => (
                            <tr key={i.id}>
                                <td>{i.productName}</td>
                                <td>{i.qtyKg.toFixed(1)}</td>
                                <td>{i.unitPrice.toLocaleString()}원</td>
                                <td>{(i.qtyKg * i.unitPrice).toLocaleString()}원</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {settlement && (
                <div className="info-card">
                    <h3>정산 정보</h3>
                    <div className="info-row"><span>예상 금액</span><span>{settlement.estimatedAmount.toLocaleString()}원</span></div>
                    <div className="info-row"><span>확정 금액</span><span>{settlement.finalAmount.toLocaleString()}원</span></div>
                    <div className="info-row"><span>수금액</span><span>{settlement.paidAmount.toLocaleString()}원</span></div>
                    <div className="info-row"><span>잔액</span><span>{settlement.remainingAmount.toLocaleString()}원</span></div>
                </div>
            )}

            <div className="info-card">
                <h3><FileTextIcon size={16} /> 출고 명세서</h3>
                <button className="btn btn-primary" onClick={handleDownloadPdf}>
                    <FileTextIcon size={14} /> PDF 다운로드 (즉시 생성)
                </button>
                {statements.length > 0 && (
                    <>
                        <p className="hint">또는 이전에 발행된 명세서:</p>
                        <FileList files={statements} />
                    </>
                )}
            </div>
        </div>
    )
}
