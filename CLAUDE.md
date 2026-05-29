# CLAUDE.md — MEATGO(믿고)

육류유통 통합 플랫폼. B2B 수발주 / 발주(구매) / 물류·배차 / 정산 / 공개 카탈로그를 한 시스템에서 운영.

## 명령어

```bash
npm run dev          # Vite 개발 서버
npm run build        # tsc 타입체크 + Vite 프로덕션 빌드 (dist/)
npm run preview      # 빌드 결과 미리보기
npm run seed:images  # 상품 실사 이미지 시드 (PEXELS_API_KEY + service-account.json 필요)
npx tsc --noEmit     # 타입체크만
```

배포: Firebase Hosting (site `therealstandard-1e322`, public `dist`, SPA rewrite). `firebase deploy`.

## 기술 스택

- React 19 + TypeScript, Vite 6, React Router v7
- 상태관리: Zustand (`src/stores/`)
- 백엔드: Firebase (Auth, Firestore, Storage, Hosting) — `src/lib/firebase.ts`에 초기화, `cleanData()` 헬퍼 제공
- 스타일: Vanilla CSS (라이트모드, 글래스모피즘). Primary `#6366F1`, Secondary `#06B6D4`, Accent `#10B981`
- 에디터: react-quill-new, 문서/PDF: jspdf · marked, 엑셀: xlsx

## 디렉터리 구조

```
src/
├── components/   공용 UI (MediaUploader, FileUpload, Modal, ProtectedRoute, AlertBell, ShippingCard, ListPagination, Logo, Icons)
├── contexts/     AuthContext (로그인/역할 상태)
├── hooks/        useListFilters (목록 필터/페이지네이션 공통 훅)
├── layouts/      AdminLayout, FrontLayout
├── lib/          비즈니스 로직 서비스 (아래 참고)
│   └── external/ ekapeService, kamisService, naverNewsService (외부 시장가/뉴스 API)
├── pages/
│   ├── admin/      운영자 (대시보드, 주문장, 발주, 정산, 마스터, 시스템설정 등)
│   ├── front/      고객사/공급사/3PL 포털 (주문, 배송조회, 정산조회, 카탈로그)
│   ├── workflow/   단계형 업무 흐름 (StepPO → StepReview → StepDispatch → StepGate)
│   ├── warehouse/  창고 (입고/출고/재고)
│   ├── public/     비로그인 공개 페이지 (PublicCatalog, DispatchView)
│   ├── auth/       Login, Signup, InviteActivation
│   ├── account/    AccountProfile
│   └── accounting/ (정산 관련, 현재 비어있음)
├── stores/       Zustand 스토어 (docStore 등)
├── types/        index.ts — 전역 타입 (UserRole 등)
└── styles/       index.css (전역 디자인 시스템)
```

## 역할 (UserRole) — `src/types/index.ts`

`ADMIN`(최고관리자) · `SALES`(영업: 주문장/수주/미수) · `PURCHASE`(구매: 발주/공급사/입고) · `CUSTOMER`(고객사) · `SUPPLIER`(공급사) · `ACCOUNTING`(회계/정산) · `WAREHOUSE`(창고/물류) · `3PL`(배송). 사용자는 `roles: UserRole[]` 배열 보유. 접근 제어는 `ProtectedRoute` + `firestore.rules`의 `hasAnyRole()`.

## 주요 Firestore 컬렉션

`users` · `products` · `orderSheets`/`orderSheetItems` · `salesOrders`/`salesOrderItems` · `purchaseOrders`/`purchaseOrderItems` · `settlements` · `shipments` · `inventory` · `priceLists`/`priceHistory` · `inviteTokens` · `documents`/`docCategories`/`fileAttachments` · `marketPrices`/`marketNews` · `notifications` · `carrierDrivers`/`vehicleTypes` · `system`(설정). 규칙은 `firestore.rules`, 스토리지는 `storage.rules`(`product-media/{productId}/**` 포함).

## 핵심 lib 서비스

`orderService`, `productService`, `priceListService`/`priceHistoryService`, `settlementService`, `inventoryService`, `vehicleService`, `userService`, `inviteTokenService`(초대 토큰 — `users.inviteToken` deprecate, 이 컬렉션으로 이관 중), `docService`, `fileService`, `notificationService`(알림/`runAllDetections`), `systemConfigService`/`systemService`(외부 API 키 Firestore 영속화), `marketDataService`/`newsService`, `pdfService`, `auditing`.

## 개발 로드맵 (docs/MeatGo_Implementation_Plan_v2.md)

- **Phase 0** MVP 정합성: 대체로 완료 (0.2 inviteToken 이관 진행 중, 0.4 외부 API키 Firestore화·0.5 거래처 포털 회사서류 완료)
- **Phase 1** 카탈로그/콘텐츠 풍부화: 1.1 멀티미디어 모델 + 1.2 MediaUploader 완료 → 다음: 1.3 YouTube embed, 1.4 공개카탈로그 강화, 1.5 상품 상세 `/products/:id`, 1.8 거래문의 leads 폼
- Phase 2 운영 효율화/영업도구 → Phase 3 AI 인사이트 → Phase 4 수산 확장 → Phase 5 마켓플레이스화

## 컨벤션 / 주의사항

- UI 문구·주석은 한국어. 코드 식별자는 영어.
- 비밀키(`service-account.json`)와 `google-cloud-sdk/`는 `.gitignore` 처리됨 — 커밋 금지.
- Firebase 설정값은 `.env`(VITE_ 접두사). 외부 API 키(EKAPE/KAMIS/NAVER)는 `.env`보다 Firestore `system/settings`를 우선 사용하도록 강등됨.
- 빌드 시 번들 크기 경고(>500kB)와 dynamic/static import 혼용 경고가 있으나 빌드는 정상. 기능 영향 없음.
