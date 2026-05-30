/**
 * 축산물품질평가원 경락가격 API
 * 출처: https://www.data.go.kr
 * 활용신청: 축산물품질평가원_축산물경락가격정보
 */

import { getApiKey } from '../../stores/systemStore'
import { apiOrigin } from './apiBase'

const BASE_URL = '/api/datago/B552895'  // dev: vite proxy / prod: Cloudflare Worker

export interface EkapePriceItem {
    delDate: string
    cattleClsCd: string      // 1=소, 2=돼지
    gradeCd: string
    marketCd: string
    marketName: string
    avgPrice: number
    maxPrice: number
    minPrice: number
    judgeHead: number
}

/**
 * 일별 경락가격 조회
 * @param date YYYYMMDD
 * @param cattleType '1' = 소, '2' = 돼지
 */
export async function fetchEkapeDailyPrices(
    date: string,
    cattleType: '1' | '2' = '2'
): Promise<EkapePriceItem[]> {
    const url = new URL(`${BASE_URL}/getKpnPriceList/getKpnPriceList`, apiOrigin())
    url.searchParams.set('serviceKey', getApiKey('datagoKey'))
    url.searchParams.set('delDate', date)
    url.searchParams.set('cattleClsCd', cattleType)
    url.searchParams.set('numOfRows', '100')
    url.searchParams.set('pageNo', '1')
    url.searchParams.set('_type', 'json')

    try {
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error(`EKAPE API error: ${res.status}`)
        const data = await res.json()
        const items = data?.response?.body?.items?.item || []
        return Array.isArray(items) ? items : [items]
    } catch (err) {
        console.error('Failed to fetch EKAPE prices:', err)
        return []
    }
}

export async function fetchEkapeBeefGradePrices(date: string): Promise<EkapePriceItem[]> {
    return fetchEkapeDailyPrices(date, '1')
}
