# 공급사 입점제안(신청) 프로세스 — 확정 스펙

**작성일**: 2026-06-04
**상태**: 설계 확정 (구현 대기)

## 결정 사항
- **온보딩 방식**: 초대링크 (공급사가 본인 UID로 직접 활성화 → `users` 생성 규칙 충돌 우회)
- **신청 폼**: 간단 신청(사업자·담당자·취급품목). **서류는 온보딩 단계에서** 수집
- **심사 권한**: PURCHASE + ADMIN/OPS

---

## 전체 흐름 (4단계)

```
[1.신청]               [2.심사]                 [3.온보딩(초대)]          [4.거래]
비회원 공급사      →    PURCHASE/ADMIN      →    공급사 본인 활성화     →   매입발주 참여
/supplier/apply        /admin/supplier-          /invite/<token>          SupplierMaster
supplierApplications   applications 인박스        프로필+서류 → ACTIVE      (활성 공급사)
status: SUBMITTED      → REVIEWING → APPROVED    application: ONBOARDED
```

### 1단계 — 신청 (비회원, 간단)
- 진입: 랜딩 "공급사 신청" 버튼 → `/supplier/apply` (현재는 일반 거래문의 모달로 연결 → 교체)
- 수집: 상호 · 사업자등록번호 · 대표자 · 담당자명 · 연락처 · 이메일 · 취급 카테고리(돈육/우육/계육/수산/기타) · 주요 품목 · 월 공급능력(선택) · 산지·도축장(선택) · 제안 메시지(선택)
- 서류 업로드 **없음** (온보딩에서)
- 저장 → `supplierApplications` (status `SUBMITTED`) → 접수확인 화면 + 운영자 알림

### 2단계 — 심사 (PURCHASE/ADMIN)
- `/admin/supplier-applications` 인박스 (LeadInbox 패턴 재활용)
- 상태 전이: `SUBMITTED → REVIEWING → APPROVED / REJECTED / ON_HOLD`
- 상세 보기 + 반려/보류 사유 메모(reviewNote)

### 3단계 — 온보딩 (초대링크)
- 승인(APPROVED) → **초대 토큰 생성**(applicationId 연결, type `SUPPLIER`) → 초대링크를 담당자에게 전달(복사/이메일)
- 공급사 `/invite/<token>` → 비번 설정 시 **본인 Firebase UID로 `users` 문서 생성**(request.auth.uid == userId → 규칙 통과) → status `PENDING`
- 첫 로그인 → ProfileSetup: 사업자 상세 + **서류 업로드**(사업자등록증·HACCP·축산물이력 등) → status `ACTIVE`
- application: `linkedUserId` 연결, status `ONBOARDED`

### 4단계 — 거래 시작
- ACTIVE 공급사 → SupplierMaster 노출 → **매입발주** 대상으로 선택 가능

---

## 데이터 모델 — `supplierApplications/{id}`
```ts
{
  companyName: string        // 상호 (필수)
  bizRegNo: string           // 사업자등록번호 (필수)
  ceoName: string            // 대표자 (필수)
  contactName: string        // 담당자 (필수)
  contactPhone: string       // 연락처 (필수)
  contactEmail?: string
  categories: string[]       // 취급 카테고리
  mainItems?: string         // 주요 품목
  monthlyCapacity?: string   // 월 공급능력
  origin?: string            // 산지/도축장
  message?: string
  status: 'SUBMITTED' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'ON_HOLD' | 'ONBOARDED'
  reviewNote?: string
  reviewedBy?: string        // 심사자 UID
  reviewedAt?: Timestamp
  inviteToken?: string       // 승인 시 발급된 초대 토큰
  linkedUserId?: string      // 온보딩된 SUPPLIER user id
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Firestore 규칙
```
match /supplierApplications/{id} {
  allow create: if true;                              // 비회원 신청
  allow read, update: if hasAnyRole(['ADMIN','OPS','PURCHASE']);
  allow delete: if isAdmin();
}
```

## 초대 토큰 (규칙 우회 핵심)
- 기존 `inviteTokens`는 `userId`(사전 생성 유저) 기반 → 관리자 유저 생성 규칙에 걸림.
- **확장**: 토큰이 `applicationId`(또는 pre-fill 신청정보)를 참조하도록 하여, **사전 유저 없이** 발급.
- 공급사가 활성화할 때 본인 UID로 `users` 문서를 생성(규칙 통과) → 신청건과 연결.

---

## 신규/변경 자산
| # | 파일 | 내용 |
|---|------|------|
| 1 | `src/lib/supplierApplicationService.ts` | createApplication(공개) / getAll·updateStatus·approve(staff) |
| 2 | `src/pages/public/SupplierApply.tsx` | `/supplier/apply` 신청 폼 |
| 3 | `src/pages/admin/SupplierApplicationInbox.tsx` | `/admin/supplier-applications` 심사 인박스 |
| 4 | `firestore.rules` | `supplierApplications` 규칙 추가 |
| 5 | `src/App.tsx` / `src/lib/menuConfig.ts` | 라우트 + 메뉴(PURCHASE/ADMIN) |
| 6 | `src/pages/LandingV2.tsx` | "공급사 신청" 버튼 → `/supplier/apply` 연결 |
| 7 | (온보딩) `inviteTokenService` + `InviteActivation` + `ProfileSetup` | 초대 토큰 applicationId 연계 + 서류 업로드 |

## 구현 단계 제안
- **Phase A (신청+심사)**: 1·2·3·4·5·6 — 신청 폼 + 인박스(상태관리). 가장 빠른 가치(공급사 인입 확보).
- **Phase B (온보딩 자동화)**: 7 — 승인→초대→활성화→서류. *기존 초대 활성화 흐름 버그(PENDING→ACTIVE 등)와 함께 처리 필요.*

> Phase A만으로도 "공급사 신청 받고 영업/구매가 심사"가 동작. 계정 발급은 우선 SupplierMaster 수동 또는 Phase B로.
