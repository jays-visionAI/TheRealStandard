import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

interface ListPaginationProps {
    page: number
    totalPages: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
}

export default function ListPagination({
    page, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange
}: ListPaginationProps) {
    const startItem = (page - 1) * pageSize + 1
    const endItem = Math.min(page * pageSize, totalItems)

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | '...')[] = []
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            if (page > 3) pages.push('...')
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
            if (page < totalPages - 2) pages.push('...')
            pages.push(totalPages)
        }
        return pages
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
        }}>
            {/* Left: page size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <span>페이지당</span>
                <select
                    value={pageSize}
                    onChange={e => onPageSizeChange(Number(e.target.value))}
                    style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                    }}
                >
                    {[10, 20, 30, 40, 50].map(n => (
                        <option key={n} value={n}>{n}개</option>
                    ))}
                </select>
                <span style={{ marginLeft: '8px' }}>
                    {totalItems > 0 ? `${startItem}-${endItem} / 총 ${totalItems}건` : '0건'}
                </span>
            </div>

            {/* Right: page navigation */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        style={{
                            ...navBtnStyle,
                            opacity: page <= 1 ? 0.3 : 1,
                            cursor: page <= 1 ? 'default' : 'pointer',
                        }}
                    >
                        <ChevronLeftIcon size={16} />
                    </button>
                    {getPageNumbers().map((p, i) =>
                        p === '...' ? (
                            <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onPageChange(p as number)}
                                style={{
                                    ...navBtnStyle,
                                    background: p === page ? 'var(--primary)' : 'transparent',
                                    color: p === page ? '#fff' : 'var(--text-secondary)',
                                    fontWeight: p === page ? 600 : 400,
                                }}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        style={{
                            ...navBtnStyle,
                            opacity: page >= totalPages ? 0.3 : 1,
                            cursor: page >= totalPages ? 'default' : 'pointer',
                        }}
                    >
                        <ChevronRightIcon size={16} />
                    </button>
                </div>
            )}
        </div>
    )
}

const navBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.15s',
}
