#!/usr/bin/env node

/**
 * MEATGO 상품 이미지 시드 스크립트 (Pexels 로열티프리)
 *
 * 운영 products 컬렉션을 직접 읽어, 각 상품명의 부위 키워드로 Pexels 실사 이미지를 검색·다운로드하여
 * Firebase Storage에 업로드하고 products.mediaImages 를 채웁니다.
 * (이미 mediaImages가 있는 상품은 건너뜁니다. 전체 강제는 FORCE=1)
 *
 * ## 사전 준비
 * 1. .env 에 PEXELS_API_KEY (이미 설정돼 있음). 키 발급: https://www.pexels.com/api/
 * 2. Firebase 서비스 계정 키:
 *    Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"
 *    → 다운로드한 JSON을 프로젝트 루트에 service-account.json 으로 저장 (gitignore됨)
 *
 * ## 실행
 *   npm run seed:images
 *   (전체 덮어쓰기: FORCE=1 npm run seed:images)
 *
 * ## 주의
 * - Pexels 무료: 시간당 200건. 상품당 1장.
 * - Pexels 라이선스는 상업적 사용/수정 무료(출처표기 불필요).
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ============ .env 수동 로드 (dotenv 의존 제거) ============
function loadEnv() {
    const p = join(ROOT, '.env')
    if (!existsSync(p)) return
    for (const line of readFileSync(p, 'utf-8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
        if (m && process.env[m[1]] === undefined) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
        }
    }
}
loadEnv()

// ============ 부위 키워드 → Pexels 검색어 (우선순위 순; 긴 키워드 먼저) ============
const CUT_QUERIES = [
    ['등갈비', 'raw pork back ribs meat'],
    ['갈비', 'raw pork spare ribs meat'],
    ['미삼겹', 'raw pork belly slab meat'],
    ['삼겹', 'raw pork belly slab meat'],
    ['목심', 'raw pork neck collar meat'],
    ['목살', 'raw pork neck collar meat'],
    ['등심', 'raw pork loin meat'],
    ['안심', 'raw pork tenderloin meat'],
    ['전지', 'raw pork shoulder picnic meat'],
    ['후지', 'raw pork ham hind leg meat'],
    ['항정', 'raw pork jowl cheek meat'],
    ['돈등뼈', 'raw pork backbone bones butcher'],
    ['등뼈', 'raw pork backbone bones butcher'],
    ['돈피', 'raw pork skin rind'],
    ['연골', 'raw pork rib cartilage'],
    ['지방', 'raw pork fat lard'],
    ['잡육', 'raw minced ground pork'],
]
const FALLBACK_QUERY = 'fresh raw pork meat butcher'

function queryForName(name) {
    for (const [kw, q] of CUT_QUERIES) if (name.includes(kw)) return q
    return FALLBACK_QUERY
}

// ============ 설정 ============
function loadConfig() {
    const pexelsKey = process.env.PEXELS_API_KEY
    if (!pexelsKey || pexelsKey.startsWith('여기에')) {
        console.error('❌ PEXELS_API_KEY 가 필요합니다 (.env). 발급: https://www.pexels.com/api/')
        process.exit(1)
    }
    const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'therealstandard-1e322.firebasestorage.app'
    const saPath = join(ROOT, 'service-account.json')
    let serviceAccount = null
    if (existsSync(saPath)) {
        serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8'))
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    } else {
        console.error('❌ service-account.json 이 없습니다.')
        console.error('   Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"')
        console.error('   → 다운로드한 JSON을 프로젝트 루트에 service-account.json 으로 저장 후 다시 실행하세요.')
        process.exit(1)
    }
    return { pexelsKey, storageBucket, serviceAccount, force: process.env.FORCE === '1' }
}

async function initFirebase(serviceAccount, storageBucket) {
    const { initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    const { getStorage } = await import('firebase-admin/storage')
    const app = initializeApp({ credential: cert(serviceAccount), storageBucket })
    return { db: getFirestore(app), bucket: getStorage().bucket() }
}

// ============ Pexels ============
async function searchPexels(apiKey, query) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=square`
    const res = await fetch(url, { headers: { Authorization: apiKey } })
    if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText}`)
    return (await res.json()).photos || []
}

async function downloadImage(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
}

async function generateThumbnail(buf) {
    try {
        const sharp = (await import('sharp')).default
        return await sharp(buf).resize(200, 200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
    } catch {
        return null
    }
}

async function uploadToStorage(bucket, productId, imageBuffer, thumbBuffer) {
    const ts = Date.now()
    const hash = createHash('md5').update(randomBytes(16)).digest('hex').slice(0, 8)
    const originalPath = `product-media/${productId}/${ts}_${hash}_pexels.jpg`
    const originalFile = bucket.file(originalPath)
    await originalFile.save(imageBuffer, { contentType: 'image/jpeg', metadata: { metadata: { source: 'pexels', seededAt: new Date().toISOString() } } })
    await originalFile.makePublic()
    const originalUrl = originalFile.publicUrl()

    let thumbnailUrl = null
    if (thumbBuffer) {
        const thumbPath = `product-media/${productId}/${ts}_${hash}_thumb.jpg`
        const thumbFile = bucket.file(thumbPath)
        await thumbFile.save(thumbBuffer, { contentType: 'image/jpeg' })
        await thumbFile.makePublic()
        thumbnailUrl = thumbFile.publicUrl()
    }
    return { url: originalUrl, thumbnailUrl: thumbnailUrl || originalUrl, storagePath: originalPath, isPrimary: true }
}

// ============ 메인 ============
async function main() {
    console.log('🥩 MEATGO 상품 이미지 시드 (Pexels)')
    console.log('='.repeat(50))
    const config = loadConfig()
    const { db, bucket } = await initFirebase(config.serviceAccount, config.storageBucket)
    console.log(`✅ Firebase 연결 (${config.storageBucket})`)

    try { await searchPexels(config.pexelsKey, 'pork'); console.log('✅ Pexels API 연결') }
    catch (e) { console.error('❌ Pexels 연결 실패:', e.message); process.exit(1) }

    const snap = await db.collection('products').get()
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const targets = all.filter(p => config.force || !(p.mediaImages && p.mediaImages.length > 0))
    console.log(`\n📦 전체 ${all.length}개 중 ${targets.length}개 처리 (이미지 보유 ${all.length - targets.length}개 스킵)\n`)

    let success = 0, skipped = 0, failed = 0
    for (let i = 0; i < targets.length; i++) {
        const p = targets[i]
        const query = queryForName(p.name || '')
        console.log(`[${i + 1}/${targets.length}] ${p.name} → "${query}"`)
        try {
            let results = await searchPexels(config.pexelsKey, query)
            if (results.length === 0) results = await searchPexels(config.pexelsKey, FALLBACK_QUERY)
            if (results.length === 0) { console.warn('   ⚠ 검색 결과 없음 (스킵)'); skipped++; continue }
            const photo = results[0]
            const imageBuffer = await downloadImage(photo.src.large || photo.src.medium)
            const thumbBuffer = await generateThumbnail(imageBuffer)
            const mediaImage = await uploadToStorage(bucket, p.id, imageBuffer, thumbBuffer)
            await db.collection('products').doc(p.id).set({ mediaImages: [mediaImage], updatedAt: new Date() }, { merge: true })
            console.log(`   ✅ 완료 (${(imageBuffer.length / 1024).toFixed(0)}KB) by ${photo.photographer}`)
            success++
        } catch (e) {
            console.error(`   ❌ 실패: ${e.message}`); failed++
        }
        if (i < targets.length - 1) await new Promise(r => setTimeout(r, 1100))
    }

    console.log('\n' + '='.repeat(50))
    console.log(`📊 성공 ${success} / 스킵 ${skipped} / 실패 ${failed}`)
    if (success > 0) {
        console.log('\n🎉 완료! 상품관리에서 "전체 공개"를 누르면 공개 카탈로그(/products)에 노출됩니다.')
    }
    process.exit(failed > 0 && success === 0 ? 1 : 0)
}

main()
