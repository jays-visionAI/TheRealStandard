#!/usr/bin/env node

/**
 * MEATGO 상품 이미지 시드 스크립트
 *
 * Pexels API로 각 돼지고기 부위별 실사 이미지를 검색하여
 * Firebase Storage에 업로드하고, Firestore products 컬렉션의
 * mediaImages 필드를 업데이트합니다.
 *
 * ## 사전 준비
 * 1. Pexels API 키 발급: https://www.pexels.com/api/
 *    (가입 → 로그인 → API 키 생성 → 키 복사)
 * 2. .env 파일에 PEXELS_API_KEY=발급받은키 추가
 * 3. Firebase 서비스 계정 키 발급:
 *    Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
 *    다운로드한 JSON 파일을 프로젝트 루트에 service-account.json 으로 저장
 *
 * ## 실행 방법
 *   node --env-file=.env scripts/seed_product_images.mjs
 *
 * ## 주의
 * - Pexels API 무료 등급: 시간당 200건 요청 제한
 * - 이미 존재하는 mediaImages는 건너뛰지 않고 덮어씁니다
 * - 각 상품당 1장의 이미지를 검색하여 업로드합니다
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomBytes } from 'node:crypto'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ============ 상품별 Pexels 검색어 매핑 ============
// 부위별 정확한 검색어 (돼지고기 부위별 구분이 명확한 쿼리)

const PRODUCT_SEARCH_QUERIES = {
    // 냉장
    p01: 'raw pork belly whole slab meat',
    p02: 'thin sliced pork belly meat raw',
    p03: 'shaved paper thin pork belly meat',
    p04: 'scored pork belly grill marks',
    p05: 'pork belly chunks stew meat diced',
    p06: 'pork collar neck shoulder butt raw',
    p07: 'thin sliced pork shoulder collar',
    p08: 'pork jowl cheek raw',
    p09: 'pork skirt diaphragm meat raw',
    p10: 'pork hanger steak skirt meat',
    // 냉동
    p30: 'pork loin raw whole cutlet',
    p31: 'ground minced pork raw',
    // 부산물
    p37: 'raw pig front trotter feet',
    p38: 'raw pig hind trotter feet',
}

// 대체 검색어 (1차 검색 실패 시 사용)
const FALLBACK_SEARCH_QUERIES = {
    p01: 'pork belly raw meat butcher',
    p02: 'sliced pork belly',
    p03: 'thin pork slices meat',
    p04: 'grilled pork belly scored',
    p05: 'diced pork meat raw',
    p06: 'pork shoulder butt raw',
    p07: 'sliced pork neck meat',
    p08: 'pork cheek meat',
    p09: 'pork plate meat raw',
    p10: 'pork skirt meat',
    p30: 'pork loin meat raw',
    p31: 'minced pork raw',
    p37: 'pig feet trotter raw',
    p38: 'pig feet raw',
}

// ============ 설정 로드 ============

function loadConfig() {
    // dotenv로 .env 파일 로드
    const envPath = join(ROOT, '.env')
    if (existsSync(envPath)) {
        dotenv.config({ path: envPath })
    }

    const pexelsKey = process.env.PEXELS_API_KEY
    if (!pexelsKey || pexelsKey.startsWith('여기에')) {
        console.error('❌ PEXELS_API_KEY 환경 변수가 필요합니다.')
        console.error('   1. https://www.pexels.com/api/ 에서 API 키를 발급받으세요.')
        console.error('   2. .env 파일에 PEXELS_API_KEY=발급받은키 를 추가하세요.')
        console.error('   3. 실행: node --env-file=.env scripts/seed_product_images.mjs')
        process.exit(1)
    }

    // Firebase 설정
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'therealstandard-1e322'
    const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'therealstandard-1e322.firebasestorage.app'

    // 서비스 계정 키 파일 확인
    const saPath = join(ROOT, 'service-account.json')
    let serviceAccount = null
    if (existsSync(saPath)) {
        serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8'))
    } else {
        // 환경 변수에서 직접 로드 시도
        const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        if (saJson) {
            serviceAccount = JSON.parse(saJson)
        }
        // service-account.json이 없으면 ADC(Application Default Credentials) 사용
    }

    return { pexelsKey, projectId, storageBucket, serviceAccount }
}

// ============ Firebase Admin 초기화 ============

async function initFirebase(serviceAccount, storageBucket) {
    try {
        const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app')
        const { getFirestore } = await import('firebase-admin/firestore')
        const { getStorage } = await import('firebase-admin/storage')

        const app = initializeApp({
            credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
            storageBucket,
        })

        const db = getFirestore(app)
        const bucket = getStorage().bucket()

        return { app, db, bucket }
    } catch (err) {
        console.error('❌ Firebase Admin 초기화 실패:', err.message)
        console.error('   npm install firebase-admin 이 필요합니다.')
        process.exit(1)
    }
}

// ============ Pexels API ============

async function searchPexels(apiKey, query) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=square`
    const res = await fetch(url, {
        headers: { Authorization: apiKey }
    })
    if (!res.ok) {
        throw new Error(`Pexels API error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.photos || []
}

async function downloadImage(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    return buffer
}

// ============ 썸네일 생성 (Sharp) ============

async function generateThumbnail(imageBuffer) {
    try {
        const sharp = (await import('sharp')).default
        const thumb = await sharp(imageBuffer)
            .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer()
        return thumb
    } catch (err) {
        console.warn('   ⚠ Sharp not available, skipping thumbnail:', err.message)
        console.warn('   npm install sharp 으로 설치하면 썸네일이 생성됩니다.')
        return null
    }
}

// ============ Firebase Storage 업로드 ============

async function uploadToStorage(bucket, productId, imageBuffer, thumbBuffer) {
    const ts = Date.now()
    const hash = createHash('md5').update(randomBytes(16)).digest('hex').slice(0, 8)

    // 원본 업로드
    const originalPath = `product-media/${productId}/${ts}_${hash}_pexels.jpg`
    const originalFile = bucket.file(originalPath)
    await originalFile.save(imageBuffer, {
        contentType: 'image/jpeg',
        metadata: {
            metadata: { source: 'pexels', seededAt: new Date().toISOString() }
        }
    })
    await originalFile.makePublic()
    const originalUrl = originalFile.publicUrl()

    // 썸네일 업로드
    let thumbnailUrl = null
    if (thumbBuffer) {
        const thumbPath = `product-media/${productId}/${ts}_${hash}_thumb.jpg`
        const thumbFile = bucket.file(thumbPath)
        await thumbFile.save(thumbBuffer, {
            contentType: 'image/jpeg',
        })
        await thumbFile.makePublic()
        thumbnailUrl = thumbFile.publicUrl()
    }

    return {
        url: originalUrl,
        thumbnailUrl: thumbnailUrl || originalUrl,
        storagePath: originalPath,
        isPrimary: true,
    }
}

// ============ Firestore 업데이트 ============

async function updateFirestoreProduct(db, productId, mediaImage) {
    const docRef = db.collection('products').doc(productId)
    const doc = await docRef.get()

    if (!doc.exists) {
        console.warn(`   ⚠ 상품 문서 ${productId} 가 존재하지 않습니다.`)
        return false
    }

    await docRef.set(
        {
            mediaImages: [mediaImage],
            updatedAt: new Date(),
        },
        { merge: true }
    )
    return true
}

// ============ 메인 ============

async function main() {
    console.log('🥩 MEATGO 상품 이미지 시드 시작')
    console.log('='.repeat(50))

    const config = loadConfig()
    const { db, bucket } = await initFirebase(config.serviceAccount, config.storageBucket)

    console.log(`✅ Firebase 연결 완료 (${config.storageBucket})`)
    console.log(`📸 Pexels API 키 검증 중...`)

    // Pexels API 키 검증
    try {
        await searchPexels(config.pexelsKey, 'pork')
        console.log('✅ Pexels API 연결 완료')
    } catch (err) {
        console.error('❌ Pexels API 연결 실패:', err.message)
        process.exit(1)
    }

    const productIds = Object.keys(PRODUCT_SEARCH_QUERIES)
    const total = productIds.length
    let success = 0
    let skipped = 0
    let failed = 0

    console.log(`\n📦 ${total}개 상품 이미지 처리 시작...\n`)

    for (let i = 0; i < total; i++) {
        const productId = productIds[i]
        const query = PRODUCT_SEARCH_QUERIES[productId]
        const fallbackQuery = FALLBACK_SEARCH_QUERIES[productId]

        console.log(`[${i + 1}/${total}] ${productId} - 검색어: "${query}"`)

        try {
            // 1. Pexels 검색
            let results = await searchPexels(config.pexelsKey, query)

            // 결과가 없으면 대체 검색어 시도
            if (results.length === 0 && fallbackQuery) {
                console.log(`   → 대체 검색어 시도: "${fallbackQuery}"`)
                results = await searchPexels(config.pexelsKey, fallbackQuery)
            }

            if (results.length === 0) {
                console.warn(`   ⚠ 검색 결과 없음 (스킵)`)
                skipped++
                continue
            }

            // 첫 번째 결과 사용
            const photo = results[0]
            console.log(`   📷 선택: "${photo.alt || '(설명 없음)'}" by ${photo.photographer}`)
            console.log(`   🔗 Pexels: ${photo.url}`)

            // 2. 이미지 다운로드 (중간 해상도)
            const imageUrl = photo.src.large || photo.src.medium
            const imageBuffer = await downloadImage(imageUrl)
            console.log(`   ✅ 다운로드 완료 (${(imageBuffer.length / 1024).toFixed(0)} KB)`)

            // 3. 썸네일 생성
            const thumbBuffer = await generateThumbnail(imageBuffer)

            // 4. Storage 업로드
            const mediaImage = await uploadToStorage(bucket, productId, imageBuffer, thumbBuffer)
            console.log(`   ✅ Storage 업로드 완료`)

            // 5. Firestore 업데이트
            const updated = await updateFirestoreProduct(db, productId, mediaImage)
            if (updated) {
                console.log(`   ✅ Firestore 업데이트 완료`)
                success++
            } else {
                failed++
            }

        } catch (err) {
            console.error(`   ❌ 실패: ${err.message}`)
            failed++
        }

        // API 제한 방지 딜레이
        if (i < total - 1) {
            await new Promise(r => setTimeout(r, 1100))
        }
    }

    // ============ 결과 ============
    console.log('\n' + '='.repeat(50))
    console.log('📊 결과 요약')
    console.log(`   ✅ 성공: ${success}/${total}`)
    console.log(`   ⚠ 스킵: ${skipped}/${total}`)
    console.log(`   ❌ 실패: ${failed}/${total}`)

    if (success > 0) {
        console.log('\n🎉 이미지 시드가 완료되었습니다!')
        console.log('   PublicCatalog(/products)와 ProductCatalog에서 이미지를 확인하세요.')
    }

    process.exit(failed > 0 ? 1 : 0)
}

main()
