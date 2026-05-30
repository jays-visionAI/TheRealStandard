import type { UserRole } from '../types'

export interface MenuChild {
    label: string
    path: string
    /** 이 메뉴에 접근 가능한 역할들. 비어있으면 부모 메뉴 권한을 따름 */
    roles?: UserRole[]
}

export interface MenuItem {
    label: string
    path?: string
    iconKey: string
    /** 이 메뉴 그룹에 접근 가능한 역할들 */
    roles: UserRole[]
    children?: MenuChild[]
}

/**
 * 전체 메뉴 정의
 * - 메뉴별 roles는 "이 메뉴를 볼 수 있는 역할"을 명시
 * - children도 자체 roles를 가질 수 있음 (없으면 부모 roles 상속)
 */
export const menuConfig: MenuItem[] = [
    {
        label: '대시보드',
        path: '/admin',
        iconKey: 'dashboard',
        roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE', 'ACCOUNTING', 'WAREHOUSE'],
    },
    {
        label: 'Document Hub',
        path: '/admin/documents',
        iconKey: 'docs',
        roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE', 'ACCOUNTING'],
    },
    {
        label: '거래문의 (Leads)',
        path: '/admin/leads',
        iconKey: 'orders',
        roles: ['ADMIN', 'OPS', 'SALES'],
    },
    {
        label: '상품관리',
        iconKey: 'products',
        roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE'],
        children: [
            {
                label: '상품리스트',
                path: '/admin/products/b2b',
                roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE'],
            },
            {
                label: '단가표',
                path: '/admin/products/price-lists',
                roles: ['ADMIN', 'OPS', 'SALES'],
            },
        ],
    },
    {
        label: '발주 관리',
        iconKey: 'orders',
        roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE', 'ACCOUNTING'],
        children: [
            {
                label: '매출발주(고객용) 목록',
                path: '/admin/order-sheets',
                roles: ['ADMIN', 'OPS', 'SALES', 'ACCOUNTING'],
            },
            {
                label: '매입발주(공급사용) 목록',
                path: '/admin/purchase-orders',
                roles: ['ADMIN', 'OPS', 'PURCHASE'],
            },
            {
                label: '확정주문(매출)',
                path: '/admin/sales-orders',
                roles: ['ADMIN', 'OPS', 'SALES', 'ACCOUNTING'],
            },
            {
                label: '확정주문(매입)',
                path: '/admin/confirmed-purchase-orders',
                roles: ['ADMIN', 'OPS', 'PURCHASE'],
            },
        ],
    },
    {
        label: '물류/배송',
        iconKey: 'transactions',
        roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE', 'WAREHOUSE'],
        children: [
            {
                label: '배송 목록',
                path: '/admin/shipments',
                roles: ['ADMIN', 'OPS', 'SALES', 'WAREHOUSE'],
            },
            {
                label: '재고 현황',
                path: '/warehouse/inventory',
                roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE', 'WAREHOUSE'],
            },
        ],
    },
    {
        label: '정산',
        iconKey: 'transactions',
        roles: ['ADMIN', 'OPS', 'ACCOUNTING'],
        children: [
            {
                label: '정산/미수채권',
                path: '/admin/settlement',
                roles: ['ADMIN', 'OPS', 'ACCOUNTING'],
            },
        ],
    },
    {
        label: 'Users',
        iconKey: 'users',
        roles: ['ADMIN', 'OPS', 'SALES', 'PURCHASE'],
        children: [
            {
                label: '전체 유저 리스트',
                path: '/admin/users/list',
                roles: ['ADMIN', 'OPS'],
            },
            {
                label: 'Staff Setting (임직원)',
                path: '/admin/users/staff',
                roles: ['ADMIN', 'OPS'],
            },
            {
                label: '고객사 (구매처) 관리',
                path: '/admin/users/customers',
                roles: ['ADMIN', 'OPS', 'SALES'],
            },
            {
                label: '공급 거래처 관리',
                path: '/admin/users/suppliers',
                roles: ['ADMIN', 'OPS', 'PURCHASE'],
            },
            {
                label: '배송업체 관리',
                path: '/admin/users/carriers',
                roles: ['ADMIN', 'OPS'],
            },
        ],
    },
    {
        label: 'Settings',
        iconKey: 'settings',
        roles: ['ADMIN', 'OPS'],
        children: [
            { label: '카탈로그 관리', path: '/admin/settings/catalogs', roles: ['ADMIN', 'OPS'] },
            { label: '차량 타입', path: '/admin/settings/vehicles', roles: ['ADMIN', 'OPS'] },
            { label: '문서 관리', path: '/admin/settings/documents', roles: ['ADMIN', 'OPS'] },
            { label: '회사 서류 관리', path: '/admin/company-documents', roles: ['ADMIN', 'OPS'] },
            { label: '물류 게이트', path: '/admin/settings/warehouse', roles: ['ADMIN', 'OPS'] },
            { label: 'API 설정', path: '/admin/settings/system', roles: ['ADMIN'] },
            { label: 'LLM 설정', path: '/admin/settings/llm', roles: ['ADMIN'] },
        ],
    },
]

/**
 * 사용자 역할에 따라 노출할 메뉴를 필터링
 */
export function filterMenuByRole(role: UserRole | undefined): MenuItem[] {
    if (!role) return []

    return menuConfig
        .filter(item => item.roles.includes(role))
        .map(item => {
            if (!item.children) return item

            const visibleChildren = item.children.filter(c =>
                c.roles ? c.roles.includes(role) : item.roles.includes(role)
            )

            // 자식이 모두 필터링되어 비어있으면 부모도 제외
            if (visibleChildren.length === 0 && item.children.length > 0) return null

            return { ...item, children: visibleChildren }
        })
        .filter((item): item is MenuItem => item !== null)
}
