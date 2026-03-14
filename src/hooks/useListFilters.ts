import { useState, useMemo, useCallback } from 'react'

const STORAGE_KEY = 'trs_list_page_size'

function getStoredPageSize(): number {
    try {
        const v = localStorage.getItem(STORAGE_KEY)
        if (v) {
            const n = parseInt(v, 10)
            if ([10, 20, 30, 40, 50].includes(n)) return n
        }
    } catch { }
    return 20
}

export interface ListFiltersState {
    startDate: string
    endDate: string
    sortField: string
    sortDir: 'asc' | 'desc'
    page: number
    pageSize: number
}

export function useListFilters<T>(
    items: T[],
    options: {
        dateExtractor: (item: T) => Date | undefined
        defaultSort?: string
    }
) {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [sortField, setSortField] = useState(options.defaultSort || '')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSizeState] = useState(getStoredPageSize)

    const setPageSize = useCallback((size: number) => {
        setPageSizeState(size)
        setPage(1)
        try { localStorage.setItem(STORAGE_KEY, String(size)) } catch { }
    }, [])

    const toggleSort = useCallback((field: string) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir('desc')
        }
        setPage(1)
    }, [sortField])

    const dateFiltered = useMemo(() => {
        let result = [...items]

        if (startDate) {
            const start = new Date(startDate)
            start.setHours(0, 0, 0, 0)
            result = result.filter(item => {
                const d = options.dateExtractor(item)
                return d && d >= start
            })
        }

        if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            result = result.filter(item => {
                const d = options.dateExtractor(item)
                return d && d <= end
            })
        }

        return result
    }, [items, startDate, endDate, options.dateExtractor])

    const totalFiltered = dateFiltered.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const safePage = Math.min(page, totalPages)

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * pageSize
        return dateFiltered.slice(start, start + pageSize)
    }, [dateFiltered, safePage, pageSize])

    return {
        startDate, setStartDate: (v: string) => { setStartDate(v); setPage(1) },
        endDate, setEndDate: (v: string) => { setEndDate(v); setPage(1) },
        sortField, sortDir, toggleSort,
        page: safePage, setPage,
        pageSize, setPageSize,
        totalFiltered,
        totalPages,
        filteredItems: dateFiltered,
        paginatedItems,
    }
}
