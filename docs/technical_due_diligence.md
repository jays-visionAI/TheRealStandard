# MeatGo(믿고) — 기술 실사(Technical Due Diligence) 문서

**작성일**: 2026-06-09
**대상**: 투자자 / 인수자 / 기술 파트너 실사용
**범위**: 코드베이스(`/src` 131개 파일·약 40,900 LOC), 인프라, 데이터모델, 보안, 외부연동, 리스크
**원칙**: 본 문서는 마케팅 자료가 아니라 **리스크를 정직하게 노출**하는 실사 문서이다. 강점과 약점·기술부채를 함께 기술한다.

---

## 0. 종합 평가 (Executive Summary)

| 항목 | 평가 |
|------|------|
| **제품 성숙도** | 핵심 거래 플랫폼(수발주·정산·카탈로그·공급사 온보딩) **운영 가능 수준**. 자동화·AI는 로드맵. |
| **코드 성숙도** | TypeScript 전면 적용, 빌드·타입체크 무오류. 서비스 계층 분리 양호. 일부 타입 불일치·스텁 잔존. |
| **아키텍처** | 서버리스(Firebase) + 엣지(Cloudflare) 하이브리드. 민첩·저비용. 단일 백엔드 종속(Firebase). |
| **보안** | RBAC + Firestore Rules 서버측 통제 적용. 단, 규칙-코드 정합성 이슈 일부 잔존(아래 §6). |
| **AI 준비도** | AI "기능"은 미구현(Phase 3). 단, 이를 얹을 **데이터 인프라·거버넌스·외부 시세 피드는 선구축**. |
| **핵심 리스크** | ① 단일 개발자 의존(버스 팩터) ② Firebase 종속 ③ 외부 SaaS 미연동(자동화 보류) ④ 일부 규칙-코드 부채 |

**전체 기술 성숙도 추정: 약 70%** — "오늘 거래를 받을 수 있는 코어는 완성, 무인 자동화·AI·고급 정합성은 추가 개발 필요."

---

## 1. 기술 스택 & 아키텍처

### 1.1 스택
| 레이어 | 기술 | 버전 |
|--------|------|------|
| 프론트엔드 | React + TypeScript | 19.1 / 5.8 |
| 빌드 | Vite | 6.3 |
| 라우팅 | React Router | 7.x |
| 상태관리 | Zustand | 5.x |
| 백엔드 | Firebase (Auth·Firestore·Storage) | 11.10 |
| 프론트 호스팅 | Cloudflare Pages (meatgo.kr) + Firebase Hosting(보조) | — |
| 엣지 함수 | Cloudflare Worker (API 게이트웨이) | wrangler 3 |
| 문서/PDF/엑셀 | jspdf · marked · xlsx | — |
| 에디터 | react-quill-new | — |

### 1.2 배포 토폴로지
```
GitHub(jays-visionAI/TheRealStandard) ──auto──▶ Cloudflare Pages ──▶ meatgo.kr  (프론트엔드/정적)
                                                       │
                          ┌────────────────────────────┼─────────────────────────────┐
                          ▼                            ▼                              ▼
              Firebase Auth(로그인)         Firestore(DB·28컬렉션)         Firebase Storage(파일/이미지)
                          │
              Cloudflare Worker(meatgo-api.workers.dev) ── 외부 정부 시세/뉴스 API 프록시(CORS·비밀키)
```
- **CI/CD**: GitHub `main` 푸시 → Cloudflare Pages 자동 빌드·배포(검증됨). 별도 GitHub Actions 없음.
- **빌드 산출물**: 정적 SPA(`dist`), SPA fallback(`_redirects` / Firebase rewrite).

### 1.3 평가
- **강점**: 서버 운영 0(서버리스/엣지) → 인프라 비용·운영부담 최소. 기능 추가→배포가 분 단위.
- **리스크**: **Firebase 단일 백엔드 종속**(Firestore 쿼리·룰·요금 모델에 묶임). 마이그레이션 비용 큼. Cloudflare Pages 환경변수(`VITE_API_BASE`) 일부 미설정 등 멀티-호스팅 정합성 관리 필요.

---

## 2. 코드베이스 메트릭 & 품질

| 지표 | 값 |
|------|-----|
| TS/TSX 파일 | 131개 |
| 총 LOC(src) | 약 40,900 |
| 페이지 | 73개 |
| 공용 컴포넌트 | 12개 |
| lib 서비스(도메인 로직) | 35개 |
| Git 커밋 | 382 |
| 타입체크/빌드 | `tsc --noEmit` + `vite build` **무오류** |

- **구조**: `pages`(역할별: admin/front/public/workflow/warehouse/auth) · `lib`(서비스 계층) · `components`(공용) · `contexts`(Auth) · `stores`(Zustand) · `styles`(디자인 토큰) 로 **관심사 분리 양호**.
- **타입 안정성**: 전면 TS, Firestore 모델 인터페이스화(`FirestoreUser`, `FirestoreSalesOrder` 등).
- **부채**: ① `PurchaseOrder` 타입과 런타임 스키마 불일치 ② 사용자 도달 가능한 **스텁 2건**(ShipmentDetail·CatalogManager) ③ `accounting/` 빈 폴더 ④ 일부 하드코딩 값(창고 입출고). → 치명적이지 않으나 정리 필요.

---

## 3. 도메인 데이터 모델 & 기능 커버리지

### 3.1 핵심 컬렉션 (28개, Rules 적용)
`users` · `products` · `orderSheets`/`orderSheetItems` · `salesOrders`/`salesOrderItems` · `purchaseOrders`/`purchaseOrderItems` · `settlements` · `shipments` · `inventory` · `priceLists`/`priceHistory` · `inviteTokens` · `onboardingInvites` · `supplierApplications` · `leads` · `orderTemplates` · `documents`/`fileAttachments` · `marketPrices`/`marketNews` · `notifications` · `carrierDrivers`/`vehicleTypes` · `system`

### 3.2 End-to-End 흐름 (구현됨)
```
[고객] 주문장(orderSheets) → 확정매출(salesOrders) → 배송(shipments) → 정산(settlements)
[구매] 발주(purchaseOrders) ← 공급사(SUPPLIER)        [재고] inventory 입출고
[영업] 거래문의(leads) · 자동발주 템플릿(orderTemplates) · 거래처 수익성 분석
[공급사] 입점신청(supplierApplications) → 심사 → 초대링크 온보딩(onboardingInvites) → 활성화
```
- **9개 역할**(ADMIN/OPS/SALES/PURCHASE/CUSTOMER/SUPPLIER/ACCOUNTING/WAREHOUSE/3PL) RBAC.
- **거버넌스**: 모든 쓰기에 작성자 스탬프(CreatorStamp) → 감사 추적·"내 거래처" 필터.

### 3.3 도메인 공백 (실사상 중요)
- **클레임/반품/CS 모델 부재** — 육류 유통 특성상 빈번한 품질·중량 클레임을 다룰 스키마 없음(정산 `refundAmount` 단일 필드로만 부분 대응).
- **식품 이력추적 미저장** — `ShipmentPackage`(바코드·도축장·유통기한)·`GateCheck`(검수·서명) 타입은 있으나 Firestore 영속화 안 됨 → HACCP/이력제 감사근거 부족.
- **배송원가 분해 부재** — 운임 단일값(`shippingCost`)만, 유류·인건비 분리 없음.
- **트랜잭션 원자성** — 일부 다단계 쓰기(주문+품목, 사용자 생성)가 트랜잭션 없이 수행 → 동시성·부분실패 정합성 리스크.

---

## 4. 보안 & 접근 제어

### 4.1 적용된 통제
- **Firestore Rules 서버측 RBAC**: `hasAnyRole()`·`isStaff()`·`isAdmin()`·`isOwnDocument()` 헬퍼로 컬렉션별 정밀 제어.
- **Storage Rules**: 파일 크기/MIME 제한(20MB, 이미지/PDF), 경로별 인증 요구.
- **이중 Auth 인스턴스**(secondary app)로 관리자 세션 보호.
- **비밀키 관리**: 외부 API 키를 Cloudflare Worker secret으로 서버측 주입 가능(번들 노출 방지). Firebase 웹 키는 설계상 공개값.
- **이번 실사 중 수정된 보안 결함**:
  - ✅ 로그인 실패 시 임의 계정 자동생성(가입통제 우회) → 운영에서 제거(DEV 한정).
  - ✅ 상품 저장 `undefined` 필드 오류, 구글 관리자 로그인 역할 오인식 → 수정.

### 4.2 잔존 리스크 (실사 고지)
- **규칙-코드 정합성 부채**: `users` create 규칙(`request.auth.uid == userId`)이 **관리자 직접 사용자 생성(OrganizationMaster 고객 가등록)** 과 충돌 → 해당 경로 권한 거부 가능. *공급사는 초대링크 온보딩으로 우회 구현 완료, 고객 가등록 경로는 규칙 보완 또는 Cloud Function 이관 필요.*
- **초대/활성화 레거시 흐름**: 일부 토큰 만료·일회용 처리 미흡(과거 `inviteTokens`). 신규 `onboardingInvites`는 개선됨.
- **데모 상수**: `DEMO_ACCOUNTS`(평문 비번)·데모 로그인 UI가 코드에 잔존(현재 운영 동작은 DEV 가드로 차단). 운영 빌드에서 상수/UI 완전 제거 권장.
- **권한 폭**: `salesOrders` 읽기가 `isAuthenticated`(전체 인증자) → 거래처 간 데이터 분리 강화 여지.

---

## 5. 외부 연동 & AI 준비도

### 5.1 정부/외부 데이터 연동 (인프라 구축)
| API | 제공기관 | 용도 | 상태 |
|-----|----------|------|------|
| EKAPE 축산물 경락가격 | 축산물품질평가원 (data.go.kr) | 소·돼지 도축 시세 | 연동 코드 완비, **키 미입력** |
| KAMIS 축산물 가격 | aT(한국농수산식품유통공사) | 축산물 도소매가 | 연동 코드 완비, **키 미입력** |
| 네이버 뉴스 | Naver | 시장 뉴스 | 연동 코드 완비 |
- **게이트웨이**: Cloudflare Worker가 CORS·비밀키를 처리 → 정적 호스팅에서도 외부 API 호출 가능(엔지니어링 해결됨). **키만 입력하면 즉시 동작.**

### 5.2 AI 준비도 — 정직한 현황
- **현재**: AI/ML 추론 기능 **미구현**. `LLMSettings`·`systemConfigService`는 연동 설정 스캐폴드 수준.
- **그러나 토대는 구축됨**: ① 구조화된 거래/시세/재고 시계열 ② 권한·감사 거버넌스 ③ 외부 시장 피드 ④ 룰 기반 분석 엔진(거래처 수익성).
- **로드맵(Phase 3)**: Anthropic API 연동 → 시세 트렌드·매수타이밍·재고처분·이탈예측·공급사 신뢰도 스코어. **데이터 재가공 없이 모델 탑재 가능한 구조.**
- → *실사 관점: "AI"는 현시점 마케팅 포지셔닝이며, 기술적 실체는 "AI-ready 데이터 인프라"이다. 이를 과대평가하지 말 것.*

---

## 6. 인프라 · DevOps · 운영

- **배포**: GitHub→Cloudflare Pages 자동배포(검증). 무중단·즉시.
- **모니터링/관측성**: 별도 APM·에러트래킹(Sentry 등) 미도입 → **운영 가시성 부족**(리스크).
- **테스트**: 자동화 테스트(유닛/E2E) **부재** → 회귀 안전망 없음. 타입체크가 1차 방어선.
- **비용**: Firebase(Blaze)·Cloudflare(무료~소액)·외부 SaaS 미계약 → 현 단계 **월 운영비 매우 낮음**. 트래픽/자동화 도입 시 Firestore read·CF·SaaS 비용 증가 모델링 필요.
- **인증 운영 마찰**: Firebase/Cloudflare CLI 토큰 만료로 수동 재인증 필요한 사례 다수 → CI 서비스계정/토큰 자동화 권장.

---

## 7. 확장성 고려사항

- **읽기 패턴**: 일부 집계(수익성·재고)가 **전체 컬렉션 클라이언트 스캔** → 데이터 증가 시 Firestore read 비용·성능 저하. 집계 캐시(`publicStats`)·서버 배치 필요.
- **검색**: 전문검색 엔진 부재(Firestore 한계). 상품/거래처 검색 규모 커지면 Algolia 등 도입 검토.
- **자동화 부재**: 스케줄 배치(가격 동기화·정기발주·세금계산서)는 **서버 런타임 필요**(현재 미도입) → Cloudflare Worker Cron 또는 Cloud Functions로 해결 가능(설계상 준비됨).

---

## 8. 기술 리스크 등록부 (Risk Register)

| # | 리스크 | 심각도 | 비고/대응 |
|---|--------|--------|-----------|
| 1 | **단일 개발자 의존(버스 팩터 1)** | 높음 | 문서화 진행(CLAUDE.md·스펙). 인수 시 인력 승계 계획 필수 |
| 2 | Firebase 단일 백엔드 종속 | 중간 | 마이그레이션 비용 큼. 현 단계 합리적 선택이나 락인 인지 |
| 3 | `users` 생성 규칙-코드 충돌(고객 가등록) | 중간 | 규칙 보완 또는 Function 이관 필요 |
| 4 | 자동화 테스트·관측성 부재 | 중간 | 핵심 흐름 E2E + 에러트래킹 도입 권장 |
| 5 | 클레임/CS·이력추적 모델 부재 | 중간 | 육류 도메인 필수. 데이터 적재 전 모델 설계 권장 |
| 6 | 외부 시세 API 키 미입력·SaaS 미계약 | 낮음 | 키/계약만 추가하면 동작(엔지니어링 완료) |
| 7 | 스텁 2건·타입 불일치·데모 상수 | 낮음 | 정리성 부채, 빠르게 해소 가능 |

---

## 9. 로드맵 & 단계 성숙도

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | MVP 정합성 | 거의 완료 |
| 1 | 카탈로그/콘텐츠 풍부화 | **완료**(멀티미디어·상품상세·거래문의·랜딩) |
| 2 | 운영효율화/영업도구 | 부분(수익성·SALES가이드·자동발주·공급사 입점 완료 / 가격동기화·알림톡·이메일·세금계산서는 외부SaaS 대기) |
| 3 | AI 인사이트 | 미착수(토대만) |
| 4 | 수산 확장 | 미착수 |
| 5 | 마켓플레이스화 | 미착수 |

---

## 10. 권고 (Remediation Priorities)

**즉시(보안·정합성)**
1. `users` 생성 규칙-코드 충돌 해소(규칙 보완 또는 Cloud Function 이관) + 데모 상수 운영 제거.
2. 신규 컬렉션 규칙 배포 확인(`supplierApplications`·`onboardingInvites`·`leads`·`orderTemplates`).

**단기(품질·운영)**
3. 에러트래킹(Sentry)·핵심 흐름 E2E 테스트 도입 → 회귀 안전망.
4. 스텁 2건·`PurchaseOrder` 타입 정리, 수익성/재고 집계 캐시화.

**중기(도메인·확장)**
5. 클레임/CS·식품 이력추적(ShipmentPackage/GateCheck) 모델 영속화 → HACCP/이력제 대응.
6. 서버 런타임(Worker Cron/Functions) 1회 셋업 → 가격동기화·정기발주·알림 자동화 동시 해금.
7. 외부 SaaS(시세 키·솔라피·Resend·팝빌) 계약 → 자동화 완성.

**전략(차별화)**
8. Phase 3 AI: 이미 구축된 데이터 인프라 위에 시세 예측·매수타이밍·이탈예측 모델 탑재.

---

## 부록 — 실사 점검 산출물
- 개발 현황 감사: `docs/MeatGo_Implementation_Plan_v2.md`, 본 세션 다중 에이전트 감사 결과.
- 공급사 온보딩 스펙: `docs/supplier_onboarding_spec.md`.
- Phase 2 운영효율화 스펙: `docs/phase2_operational_efficiency_spec.md`.

*본 문서는 코드 위치·규칙·커밋·메트릭 근거에 기반해 작성되었으며, 강점과 리스크를 균형 있게 기술하였다. 추가 심층 항목(코드 라인 단위 보안 감사, 성능 부하 테스트, 라이선스 점검)은 별도 진행을 권고한다.*
