import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPurchaseOrderByToken, getPurchaseOrderItems, type FirestorePurchaseOrder, type FirestorePurchaseOrderItem } from '../../lib/orderService'

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(val)

export default function PurchaseOrderView() {
    const { token } = useParams<{ token: string }>()
    const [po, setPO] = useState<FirestorePurchaseOrder | null>(null)
    const [items, setItems] = useState<FirestorePurchaseOrderItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return
        loadPO(token)
    }, [token])

    const loadPO = async (token: string) => {
        try {
            setLoading(true)
            const order = await getPurchaseOrderByToken(token)
            if (!order) {
                setError('유효하지 않은 발주서 링크입니다.')
                return
            }
            setPO(order)
            const poItems = await getPurchaseOrderItems(order.id)
            setItems(poItems)
        } catch (err) {
            console.error(err)
            setError('발주서를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-10 text-center">로딩 중...</div>
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>
    if (!po) return null

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
            <div className="border border-gray-200 rounded-lg p-8 shadow-sm print:shadow-none print:border-0">
                <header className="flex justify-between items-start mb-8 border-b pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">매입 발주서 (Purchase Order)</h1>
                        <p className="text-gray-500 text-sm">발주번호: {po.id}</p>
                        <p className="text-gray-500 text-sm">
                            발주일: {po.createdAt?.toDate?.().toLocaleDateString('ko-KR') || '-'}
                        </p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-800">MEATGO</h2>
                        <p className="text-sm text-gray-500 mt-1">사업자 등록번호: 123-45-67890</p>
                        <p className="text-sm text-gray-500">서울시 강남구 테헤란로 123</p>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="font-semibold text-gray-700 mb-2 border-b pb-2">공급받는 자 (Buyer)</h3>
                        <p className="text-sm"><span className="text-gray-500 w-20 inline-block">상호:</span> (주)더리얼스탠다드</p>
                        <p className="text-sm"><span className="text-gray-500 w-20 inline-block">담당자:</span> 매입 담당자</p>
                        <p className="text-sm"><span className="text-gray-500 w-20 inline-block">연락처:</span> 02-1234-5678</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="font-semibold text-gray-700 mb-2 border-b pb-2">공급자 (Supplier)</h3>
                        <p className="text-sm"><span className="text-gray-500 w-20 inline-block">상호:</span> {po.supplierName}</p>
                        <p className="text-sm"><span className="text-gray-500 w-20 inline-block">입고예정일:</span> {po.expectedArrivalDate?.toDate?.().toLocaleDateString('ko-KR') || '미정'}</p>
                    </div>
                </div>

                {po.memo && (
                    <div className="mb-8 p-4 bg-yellow-50 border border-yellow-100 rounded-md text-sm text-gray-700">
                        <strong>📌 요청사항/메모:</strong> {po.memo}
                    </div>
                )}

                <div className="mb-8">
                    <h3 className="font-bold text-lg mb-4">발주 품목</h3>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-t border-b border-gray-200">
                                <th className="p-3 text-left">품목명</th>
                                <th className="p-3 text-right">단가</th>
                                <th className="p-3 text-right">수량 (kg/box)</th>
                                <th className="p-3 text-right">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100">
                                    <td className="p-3">{item.productName}</td>
                                    <td className="p-3 text-right">₩{formatCurrency(item.unitPrice)}</td>
                                    <td className="p-3 text-right">{formatCurrency(item.qtyKg)} kg</td>
                                    <td className="p-3 text-right font-medium">₩{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-300 font-bold">
                                <td colSpan={2} className="p-4 text-right">합계</td>
                                <td className="p-4 text-right">{formatCurrency(po.totalsKg)} kg</td>
                                <td className="p-4 text-right text-lg text-blue-600">₩{formatCurrency(po.totalsAmount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="text-center mt-12 text-sm text-gray-500 print:hidden">
                    <p>위와 같이 발주합니다.</p>
                    <button
                        className="mt-6 px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                        onClick={() => window.print()}
                    >
                        🖨 인쇄하기 / PDF 저장
                    </button>
                </div>
            </div>
        </div>
    )
}
