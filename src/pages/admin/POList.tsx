import { Link } from 'react-router-dom'
import { PlusIcon } from '../../components/Icons'

export default function POList() {
    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-left">
                    <h1>매입발주(공급사용) 목록</h1>
                    <p className="text-secondary">공급사에게 직접 주문하는 매입 발주 리스트입니다</p>
                </div>
                <Link to="/admin/purchase-orders/create" className="btn btn-primary">
                    <PlusIcon size={18} /> + 매입 발주서 생성
                </Link>
            </div>
            <div className="glass-card p-12 text-center">
                <p className="text-xl font-semibold mb-4">발주서(Purchase Order) 관리 페이지입니다.</p>
                <p className="text-muted">공급사 발주 내역을 조회하고 처리하는 섹션입니다.</p>
                <div className="mt-8">
                    <Link to="/admin/purchase-orders/create" className="btn btn-primary btn-lg">
                        첫 매입 발주서 생성하기
                    </Link>
                </div>
            </div>
        </div>
    )
}
