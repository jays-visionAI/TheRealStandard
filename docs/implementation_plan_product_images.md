# Implementation Plan: 상품 DB 실사 이미지 시딩

## Summary
15개 돼지고기 상품(p01~p38)에 각 부위별 실사 이미지를 Firebase Storage에 업로드하고 Firestore `products.mediaImages` 필드에 연결하는 Node.js 시드 스크립트를 작성한다. Pexels API를 사용해 각 부위명으로 검색 후 자동 다운로드 → Storage 업로드 → Firestore 업데이트.

## Scope

### In Scope
- `scripts/seed_product_images.mjs` 생성 (Node.js, firebase-admin, Pexels API)
- `storage.rules`에 `product-media/{productId}` 경로 허용 규칙 추가
- 부위별 정확한 영문 검색어 매핑 (삼겹살→pork belly, 목살→pork collar 등)
- 썸네일 자동 생성 (Sharp 라이브러리로 200x200 리사이즈)
- Storage에 원본 + 썸네일 업로드, Firestore `mediaImages` 필드 업데이트

### Out of Scope
- Pexels API 키 발급 (사용자가 직접 https://www.pexels.com/api/ 에서 발급)
- Firebase 서비스 계정 키 발급 (사용자가 직접 Firebase Console에서 발급)
- 기존 `seedInitialProducts()` 함수 수정

### Deferred
- YouTube 영상 연결
- 추가 상품 이미지

## Planned Changes

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `scripts/seed_product_images.mjs` | CREATE | Pexels API로 부위별 검색 → 다운로드 → Firebase Storage 업로드 → Firestore 업데이트 |
| 2 | `storage.rules` | UPDATE | `product-media/{productId}/**` 경로 읽기/쓰기 허용 추가 |
| 3 | `scripts/.env.example` | CREATE | PEXELS_API_KEY, FIREBASE_SERVICE_ACCOUNT_PATH 예시 |
| 4 | `package.json` | UPDATE | `seed:images` 스크립트 추가 |

## Technical Approach

### 이미지 검색 전략
각 상품 ID별로 정확한 부위 영문 검색어를 매핑:
- p01 삼겹살 → "raw pork belly cut meat"
- p02 미삼겹살 → "thin sliced pork belly"
- p03 삼겹살(대패) → "shaved pork belly meat"
- p04 삼겹살(칼집) → "scored pork belly grill"
- p05 삼겹살/오겹살(찌개용) → "pork belly chunks stew"
- p06 목살 → "pork collar butt raw"
- p07 목살(대패) → "thin sliced pork shoulder"
- p08 항정살 → "pork jowl cheek meat"
- p09 가브리살 → "pork diaphragm skirt meat"
- p10 갈매기살 → "pork hanger steak skirt"
- p30 등심(돈까스용) → "pork loin cutlet raw"
- p31 뒷다리(다짐육) → "ground minced pork meat"
- p37 앞장족 → "pig front trotter feet raw"
- p38 뒷장족 → "pig hind trotter feet"

### Storage 경로
- MediaUploader와 동일한 경로 규칙 사용: `product-media/{productId}/{timestamp}_{filename}`
- 썸네일: `product-media/{productId}/{timestamp}_thumb_{filename}.jpg`

### Firestore 업데이트 형식
```json
{
  "mediaImages": [{
    "url": "gs://...",
    "thumbnailUrl": "gs://..._thumb",
    "storagePath": "product-media/p01/1234567890_pork_belly.jpg",
    "isPrimary": true
  }]
}
```

## Risk Assessment
- Pexels 검색 결과가 부정확할 수 있음 → 검색어를 최대한 구체화, 실패 시 수동 URL 지정 옵션 제공
- Firebase Admin 초기화 실패 → 서비스 계정 JSON 경로 검증 로직 포함
- Storage 업로드 실패 → 개별 상품별 try-catch로 일부 실패 허용
