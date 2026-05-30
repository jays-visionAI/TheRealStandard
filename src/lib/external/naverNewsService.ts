/**
 * 네이버 뉴스 검색 API
 * 출처: https://developers.naver.com/docs/serviceapi/search/news/news.md
 * 일 25,000건 무료, 회당 100건까지
 */

import { getApiKey } from '../../stores/systemStore'
import { apiOrigin } from './apiBase'

const NEWS_API = '/api/naver/v1/search/news.json'

export interface NaverNewsItem {
    title: string             // HTML 태그 포함
    originallink: string
    link: string
    description: string       // HTML 태그 포함
    pubDate: string           // RFC 822
}

export async function searchNaverNews(
    query: string,
    display: number = 50,
    start: number = 1,
    sort: 'sim' | 'date' = 'date'
): Promise<NaverNewsItem[]> {
    const url = `${apiOrigin()}${NEWS_API}?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`

    try {
        const res = await fetch(url, {
            headers: {
                'X-Naver-Client-Id': getApiKey('naverClientId'),
                'X-Naver-Client-Secret': getApiKey('naverClientSecret'),
            }
        })
        if (!res.ok) throw new Error(`Naver API error: ${res.status}`)
        const data = await res.json()
        return data.items || []
    } catch (err) {
        console.error('Failed to fetch Naver news:', err)
        return []
    }
}

export function stripHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

/**
 * 다중 키워드로 한 번에 검색하고 중복 제거
 */
export async function fetchAllMeatNews(): Promise<NaverNewsItem[]> {
    const queries = [
        '한우 가격',
        '한돈 시세',
        '돼지고기 도매',
        '소고기 시세',
        '축산물 시장',
        '축산물 수급',
    ]

    const allResults: NaverNewsItem[] = []
    for (const q of queries) {
        const items = await searchNaverNews(q, 30, 1, 'date')
        allResults.push(...items)
        await new Promise(r => setTimeout(r, 200))  // 부하 방지
    }

    // originallink 기준 중복 제거
    const unique = new Map<string, NaverNewsItem>()
    for (const item of allResults) {
        if (!unique.has(item.originallink)) {
            unique.set(item.originallink, item)
        }
    }
    return Array.from(unique.values())
}
