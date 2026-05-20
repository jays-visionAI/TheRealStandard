import {
    collection, doc, getDocs, query, where, orderBy, limit,
    serverTimestamp, Timestamp, updateDoc, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { fetchAllMeatNews, stripHtmlTags } from './external/naverNewsService'

const COLLECTION = 'marketNews'
const ref = collection(db, COLLECTION)

export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'

export interface FirestoreMarketNews {
    id: string
    source: 'NAVER' | 'GOOGLE' | 'EKAPE' | 'CHUKSAN_NEWS'
    sourceLink: string
    title: string
    description: string
    pubDate: Timestamp
    keywords: string[]
    productType?: 'BEEF' | 'PORK' | 'CHICKEN' | 'OTHER'
    sentiment?: Sentiment
    importanceScore?: number
    fetchedAt: Timestamp
    isPinned?: boolean
}

// ============ 키워드 분류 (규칙 기반) ============

const KEYWORDS_BEEF = ['한우', '소고기', '소도체', '거세우', '암소', '육우']
const KEYWORDS_PORK = ['한돈', '돼지', '돼지고기', '돈육', '삼겹', '목살']
const KEYWORDS_CHICKEN = ['닭', '닭고기', '계육', '오리']
const KEYWORDS_POSITIVE = ['상승', '강세', '오름', '인상', '호조']
const KEYWORDS_NEGATIVE = ['하락', '약세', '내림', '인하', '폭락', '부진']
const KEYWORDS_HIGH_IMPACT = ['ASF', '구제역', '조류인플루엔자', '관세', 'FTA', '명절', '도축']

function extractKeywords(text: string): string[] {
    const found = new Set<string>()
    const all = [
        ...KEYWORDS_BEEF, ...KEYWORDS_PORK, ...KEYWORDS_CHICKEN,
        ...KEYWORDS_POSITIVE, ...KEYWORDS_NEGATIVE, ...KEYWORDS_HIGH_IMPACT
    ]
    for (const k of all) {
        if (text.includes(k)) found.add(k)
    }
    return Array.from(found)
}

function detectProductType(text: string): 'BEEF' | 'PORK' | 'CHICKEN' | 'OTHER' {
    if (KEYWORDS_BEEF.some(k => text.includes(k))) return 'BEEF'
    if (KEYWORDS_PORK.some(k => text.includes(k))) return 'PORK'
    if (KEYWORDS_CHICKEN.some(k => text.includes(k))) return 'CHICKEN'
    return 'OTHER'
}

function detectSentiment(text: string): Sentiment {
    let pos = 0, neg = 0
    for (const k of KEYWORDS_POSITIVE) if (text.includes(k)) pos++
    for (const k of KEYWORDS_NEGATIVE) if (text.includes(k)) neg++
    if (pos > neg) return 'POSITIVE'
    if (neg > pos) return 'NEGATIVE'
    return 'NEUTRAL'
}

function calcImportance(text: string): number {
    let score = 50
    for (const k of KEYWORDS_HIGH_IMPACT) {
        if (text.includes(k)) score += 15
    }
    for (const k of [...KEYWORDS_POSITIVE, ...KEYWORDS_NEGATIVE]) {
        if (text.includes(k)) score += 5
    }
    return Math.min(100, score)
}

// ============ 수집 ============

export async function ingestNaverNews(): Promise<number> {
    const items = await fetchAllMeatNews()
    if (items.length === 0) return 0

    // 최근 7일 중복 체크
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentSnap = await getDocs(query(
        ref, where('fetchedAt', '>=', Timestamp.fromDate(weekAgo))
    ))
    const existingLinks = new Set(recentSnap.docs.map(d => d.data().sourceLink))

    let batch = writeBatch(db)
    let count = 0

    for (const item of items) {
        if (existingLinks.has(item.originallink)) continue

        const cleanTitle = stripHtmlTags(item.title)
        const cleanDesc = stripHtmlTags(item.description)
        const fullText = cleanTitle + ' ' + cleanDesc

        const docRef = doc(ref)
        batch.set(docRef, {
            source: 'NAVER',
            sourceLink: item.originallink,
            title: cleanTitle,
            description: cleanDesc,
            pubDate: Timestamp.fromDate(new Date(item.pubDate)),
            keywords: extractKeywords(fullText),
            productType: detectProductType(fullText),
            sentiment: detectSentiment(fullText),
            importanceScore: calcImportance(fullText),
            fetchedAt: serverTimestamp(),
            isPinned: false,
        })
        count++
        if (count % 400 === 0) {
            await batch.commit()
            batch = writeBatch(db)
        }
    }
    await batch.commit()
    return count
}

// ============ 조회 ============

export async function getRecentNews(
    productType?: 'BEEF' | 'PORK' | 'CHICKEN',
    count: number = 20
): Promise<FirestoreMarketNews[]> {
    const constraints: any[] = [orderBy('pubDate', 'desc'), limit(count)]
    if (productType) constraints.unshift(where('productType', '==', productType))
    const q = query(ref, ...constraints)
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMarketNews))
}

export async function getPinnedNews(): Promise<FirestoreMarketNews[]> {
    const q = query(ref, where('isPinned', '==', true), orderBy('pubDate', 'desc'), limit(10))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMarketNews))
}

export async function togglePinned(newsId: string, pinned: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTION, newsId), { isPinned: pinned })
}
