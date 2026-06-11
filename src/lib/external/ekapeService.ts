/**
 * 축산물품질평가원(EKAPE) 경락가격 API
 * 데이터셋: data.go.kr "축산물품질평가원_축산물경락가격정보" (15057912)
 *
 * ⚠️ 실제 엔드포인트는 apis.data.go.kr가 아니라 **축평원 자체 서버**다:
 *   http://data.ekape.or.kr/openapi-data/service/user/grade/auct/{cattle|pigGrade|pigJejuGrade}
 *   - cattle    : 소도체 등급별 경락가격
 *   - pigGrade  : 돼지도체 등급별 경락가격 (skinYn Y=탕박/N=박피)
 *   - 응답은 XML (resultCode 00=정상). 인증키는 data.go.kr 발급 serviceKey(Decoding).
 * dev는 Vite 프록시, 운영은 Cloudflare Worker(/api/ekape)가 CORS/HTTP를 처리한다.
 */

import { getApiKey } from '../../stores/systemStore'
import { apiOrigin } from './apiBase'

const BASE = '/api/ekape/openapi-data/service/user/grade/auct'

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

function num(v: string | undefined): number {
    const n = parseFloat((v || '').replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
}

/** XML <item> 들을 {태그: 텍스트} 레코드 배열로 파싱 */
function parseItems(xml: string): Record<string, string>[] {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    return Array.from(doc.getElementsByTagName('item')).map(item => {
        const rec: Record<string, string> = {}
        Array.from(item.children).forEach(c => { rec[c.tagName] = c.textContent || '' })
        return rec
    })
}

function pick(rec: Record<string, string>, keys: string[]): string | undefined {
    for (const k of keys) {
        if (rec[k] !== undefined && rec[k] !== '') return rec[k]
    }
    return undefined
}

/**
 * 일별 경락가격 조회 (기존 시그니처 유지 — marketDataService 호환)
 * @param date YYYYMMDD
 * @param cattleType '1' = 소(cattle), '2' = 돼지(pigGrade)
 */
export async function fetchEkapeDailyPrices(
    date: string,
    cattleType: '1' | '2' = '2'
): Promise<EkapePriceItem[]> {
    const op = cattleType === '1' ? 'cattle' : 'pigGrade'
    const url = new URL(`${BASE}/${op}`, apiOrigin())
    url.searchParams.set('serviceKey', getApiKey('datagoKey'))
    url.searchParams.set('startYmd', date)
    url.searchParams.set('endYmd', date)
    if (cattleType === '2') url.searchParams.set('skinYn', 'Y') // 탕박 기준

    try {
        const res = await fetch(url.toString())
        const text = await res.text()
        if (!res.ok) throw new Error(`EKAPE HTTP ${res.status}`)
        const resultMsg = text.match(/<resultMsg>([^<]*)<\/resultMsg>/)?.[1]
        const resultCode = text.match(/<resultCode>([^<]*)<\/resultCode>/)?.[1]
        if (resultCode && resultCode !== '00') {
            console.warn(`EKAPE ${op} resultCode=${resultCode}: ${resultMsg}`)
            return []
        }
        // 필드명은 오퍼레이션별로 상이 — 공식 명세 명명 규칙(gradeCode/gradeName, *Price, *Cnt, abattName) 기반 후보 매핑
        const items = parseItems(text)
        const mapped = items.map(rec => ({
            delDate: pick(rec, ['auctDate', 'auctYmd', 'judgeDate', 'abattDate', 'baseDate']) || date,
            cattleClsCd: cattleType,
            gradeCd: pick(rec, ['gradeName', 'gradeNm', 'gradeCode', 'gradeCd', 'judgeGradeCd', 'grade']) || '',
            marketCd: pick(rec, ['abattCode', 'abattCd', 'marketCd']) || '',
            marketName: pick(rec, ['abattName', 'abattNm', 'marketNm']) || '',
            avgPrice: num(pick(rec, ['avgPrice', 'avgAmt', 'auctAvgAmt', 'totPrice', 'avgAuctAmt'])),
            maxPrice: num(pick(rec, ['maxPrice', 'maxAmt', 'auctMaxAmt'])),
            minPrice: num(pick(rec, ['minPrice', 'minAmt', 'auctMinAmt'])),
            judgeHead: num(pick(rec, ['auctCnt', 'judgeHeadCnt', 'totCnt', 'headCnt', 'judgeHead'])),
        }))
        // 진단: 항목은 있는데 가격 매핑이 전부 0이면 실제 태그명을 로깅 (후보 키 보강용)
        if (items.length > 0 && mapped.every(m => m.avgPrice === 0)) {
            console.warn(`EKAPE ${op} 가격 매핑 실패 — 실제 필드:`, Object.keys(items[0]))
        }
        return mapped
    } catch (err) {
        console.error('Failed to fetch EKAPE prices:', err)
        return []
    }
}

export async function fetchEkapeBeefGradePrices(date: string): Promise<EkapePriceItem[]> {
    return fetchEkapeDailyPrices(date, '1')
}
