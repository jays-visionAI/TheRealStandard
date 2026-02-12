/**
 * 상품 표시 우선순위 정렬
 * 
 * 이 배열에 포함된 상품명은 해당 순서대로 상위에 노출됩니다.
 * 이 배열에 없는 상품은 아래쪽에 가나다(한글) 순으로 정렬됩니다.
 * 
 * 매칭 방식: 상품명이 배열의 항목으로 "시작"하면 매칭됩니다.
 * 예: '삼겹살' -> '삼겹살', '삼겹살(대패)', '삼겹살(칼집)' 모두 매칭
 */
export const PRODUCT_DISPLAY_ORDER: string[] = [
    '삼겹살',
    'S 냉동삼겹',
    '미삼겹살',
    '목살',
    '안심',
    '등심',
    '등심(냉동)',
    '전지',
    '미전지',
    '후지(냉장)',
    '후지(냉동)',
    '미후지(냉장)',
    '미후지(냉동)',
    '미후지 알사태',
    '갈비',
    '등갈비(냉장)',
    '등갈비(냉동)',
    'A돈피',
    'A 돈피',
    '잡육',
    '등뼈(냉장)',
    '등뼈(냉동)',
    '등뼈(냉동)_25년',
]

/**
 * 상품명의 우선순위 인덱스를 반환합니다.
 * 우선순위 리스트에 없으면 Infinity를 반환합니다.
 * 
 * 매칭 규칙:
 * 1. 정확히 일치하는 항목 우선
 * 2. 상품명이 우선순위 항목으로 시작하는 경우 매칭
 */
export function getProductSortIndex(productName: string): number {
    // 1. 정확히 일치
    const exactIdx = PRODUCT_DISPLAY_ORDER.indexOf(productName)
    if (exactIdx !== -1) return exactIdx

    // 2. 시작 매칭 (가장 긴 매칭 우선)
    let bestIdx = -1
    let bestLen = 0
    for (let i = 0; i < PRODUCT_DISPLAY_ORDER.length; i++) {
        const priority = PRODUCT_DISPLAY_ORDER[i]
        if (productName.startsWith(priority) && priority.length > bestLen) {
            bestIdx = i
            bestLen = priority.length
        }
    }
    if (bestIdx !== -1) return bestIdx

    return Infinity
}

/**
 * 우선순위 기반 상품 정렬 비교 함수
 * 
 * 사용법: products.sort(compareProductOrder)
 * 또는:   products.sort((a, b) => compareProductOrder(a, b))
 */
export function compareProductOrder(
    a: { name: string },
    b: { name: string }
): number {
    const idxA = getProductSortIndex(a.name)
    const idxB = getProductSortIndex(b.name)

    // 둘 다 우선순위 리스트에 있으면 우선순위 순서대로
    if (idxA !== Infinity && idxB !== Infinity) {
        return idxA - idxB
    }

    // 하나만 우선순위에 있으면 그것이 먼저
    if (idxA !== Infinity) return -1
    if (idxB !== Infinity) return 1

    // 둘 다 없으면 가나다순
    return a.name.localeCompare(b.name, 'ko')
}

/**
 * 그룹화된 상품명(baseName)에 대한 우선순위 정렬 비교 함수
 * PriceListGuestView 등에서 그룹 정렬 시 사용
 */
export function compareGroupOrder(
    a: { name: string },
    b: { name: string }
): number {
    const idxA = getGroupSortIndex(a.name)
    const idxB = getGroupSortIndex(b.name)

    if (idxA !== Infinity && idxB !== Infinity) {
        return idxA - idxB
    }
    if (idxA !== Infinity) return -1
    if (idxB !== Infinity) return 1

    return a.name.localeCompare(b.name, 'ko')
}

/**
 * 그룹명(baseName)의 우선순위 인덱스를 반환합니다.
 * baseName은 괄호 제거된 이름이므로, 우선순위 배열에서 괄호를 제거하고 매칭합니다.
 */
function getGroupSortIndex(baseName: string): number {
    // 우선순위 배열에서 baseName과 매칭되는 항목의 최소 인덱스를 찾음
    let bestIdx = Infinity
    for (let i = 0; i < PRODUCT_DISPLAY_ORDER.length; i++) {
        const priority = PRODUCT_DISPLAY_ORDER[i]
        // 괄호 제거한 우선순위명
        const priorityBase = priority.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim()

        if (baseName === priorityBase || baseName.startsWith(priorityBase)) {
            if (i < bestIdx) bestIdx = i
        }
    }
    return bestIdx
}
