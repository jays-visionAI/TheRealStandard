# Implementation Report: 상품 DB 실사 이미지 시딩

## Completed Changes

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `scripts/seed_product_images.mjs` | **CREATE** | Pexels API → 이미지 검색/다운로드 → Firebase Storage 업로드 → Firestore 업데이트 자동화 스크립트 |
| 2 | `storage.rules` | **UPDATE** | `product-media/{productId}/**` 경로에 read/write/delete 규칙 추가 |
| 3 | `package.json` | **UPDATE** | `seed:images` npm 스크립트 추가, `sharp` devDependency 추가 |
| 4 | `.env.example` | **UPDATE** | `PEXELS_API_KEY` 환경 변수 예시 추가 |
| 5 | `docs/implementation_plan_product_images.md` | **CREATE** | 구현 계획 문서 |

## What Was Built

### `scripts/seed_product_images.mjs`
- 15개 돼지고기 상품(p01~p38)에 대해 부위별 정확한 영문 검색어 매핑 제공
- Pexels API로 각 부위 검색 → 결과 없으면 대체 검색어(fallback) 자동 시도
- 다운로드 이미지 + Sharp 200×200 썸네일 생성 → Firebase Storage 이중 업로드
- Firestore `products/{id}` 문서에 `mediaImages` 필드 업데이트
- API 제한 방지를 위한 1.1초 요청 간격
- 상세 진행 로그 및 최종 성공/스킵/실패 통계 출력

### 검색어 매핑 (부위별 정확한 쿼리)
| 상품 ID | 상품명 | 1차 검색어 | 대체 검색어 |
|---------|-------|-----------|-----------|
| p01 | 삼겹살 | raw pork belly whole slab meat | pork belly raw meat butcher |
| p02 | 미삼겹살 | thin sliced pork belly meat raw | sliced pork belly |
| p03 | 삼겹살(대패) | shaved paper thin pork belly meat | thin pork slices meat |
| p04 | 삼겹살(칼집) | scored pork belly grill marks | grilled pork belly scored |
| p05 | 삼겹살/오겹살(찌개용) | pork belly chunks stew meat diced | diced pork meat raw |
| p06 | 목살 | pork collar neck shoulder butt raw | pork shoulder butt raw |
| p07 | 목살(대패) | thin sliced pork shoulder collar | sliced pork neck meat |
| p08 | 항정살 | pork jowl cheek raw | pork cheek meat |
| p09 | 가브리살 | pork skirt diaphragm meat raw | pork plate meat raw |
| p10 | 갈매기살 | pork hanger steak skirt meat | pork skirt meat |
| p30 | 등심(돈까스용)-냉동 | pork loin raw whole cutlet | pork loin meat raw |
| p31 | 뒷다리(다짐육) | ground minced pork raw | minced pork raw |
| p37 | 앞장족 | raw pig front trotter feet | pig feet trotter raw |
| p38 | 뒷장족 | raw pig hind trotter feet | pig feet raw |

### Storage Rules 업데이트
`product-media/{productId}/{fileName}` 경로에 대해:
- **read**: 인증된 사용자만 (공개 카탈로그는 앱이 인증 상태로 요청)
- **write**: 인증된 사용자 + 이미지 MIME 타입 + 10MB 제한
- **delete**: 인증된 사용자

## Verification Results

- ✅ `npx tsc --noEmit` — TypeScript 컴파일 오류 없음
- ✅ `npm run build` — Vite 프로덕션 빌드 성공 (3.76s)
- ✅ `storage.rules` — product-media 경로 규칙 추가 완료
- ⚠️ 실제 Pexels API 호출 및 Firebase 업로드는 사용자가 API 키 발급 후 직접 실행 필요

## Known Limitations

1. **Pexels 검색 정확도**: 한국형 돼지고기 부위(가브리살, 갈매기살)는 Pexels에 정확히 일치하는 사진이 적을 수 있음. 대체 검색어로 보완했으나 완벽하지 않을 수 있음.
2. **공개 카탈로그 접근**: PublicCatalog는 `displayOnPublic: true`인 상품만 표시. 시드 후에도 상품의 `displayOnPublic` 필드가 false면 표시되지 않음 → ProductMaster에서 수동 설정 필요.
3. **서비스 계정 필요**: Firebase Admin SDK 사용으로 서비스 계정 키 JSON 파일이 필요함.

## Next Steps

1. **Pexels API 키 발급** → https://www.pexels.com/api/
2. **Firebase 서비스 계정 키 발급** → Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → `service-account.json`으로 저장
3. **시드 실행**: `PEXELS_API_KEY=YOUR_KEY npm run seed:images`
4. **공개 카탈로그 설정**: ProductMaster에서 각 상품의 `displayOnPublic` 체크
