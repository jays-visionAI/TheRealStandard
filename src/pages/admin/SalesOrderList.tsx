// Placeholder components for admin pages
// These will be fully implemented as development progresses

export default function SalesOrderList() {
    return (
        <div className="page-container">
            <div className="page-header">
                <h1>확정주문 목록</h1>
                <p className="text-secondary">확정된 SalesOrder 목록</p>
            </div>
            <div className="glass-card p-6 text-center">
                <p className="text-muted">확정주문(SalesOrder) 관리 페이지입니다.</p>
                <p className="text-sm text-muted mt-2">주문이 확정되면 이 목록에 표시됩니다.</p>
            </div>
        </div>
    )
}
