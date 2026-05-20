/**
 * KAMIS API (농산물유통정보)
 * 출처: https://www.kamis.or.kr/customer/reference/openapi_list.do
 */

import { getApiKey } from '../../stores/systemStore'

const BASE_URL = '/api/kamis/service/price/xml.do'

export interface KamisPriceItem {
    productname: string
    unit: string
    day1: string
    day1_price?: string
    dpr1?: string
    dpr2?: string
    pubdate: string
}

export async function fetchKamisItemPrice(
    itemCategoryCode: string,
    itemCode: string,
    regday: string
): Promise<KamisPriceItem[]> {
    const url = new URL(BASE_URL, window.location.origin)
    url.searchParams.set('action', 'periodProductList')
    url.searchParams.set('p_productclscode', '02')
    url.searchParams.set('p_itemcategorycode', itemCategoryCode)
    url.searchParams.set('p_itemcode', itemCode)
    url.searchParams.set('p_regday', regday)
    url.searchParams.set('p_convert_kg_yn', 'Y')
    url.searchParams.set('p_cert_key', getApiKey('kamisKey'))
    url.searchParams.set('p_cert_id', getApiKey('kamisId'))
    url.searchParams.set('p_returntype', 'json')

    try {
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error(`KAMIS error: ${res.status}`)
        const data = await res.json()
        return data?.data?.item || []
    } catch (err) {
        console.error('Failed to fetch KAMIS price:', err)
        return []
    }
}

export const KAMIS_CATEGORIES = {
    LIVESTOCK: '500',
}

export const KAMIS_ITEMS = {
    BEEF: '411',
    PORK: '514',
}
