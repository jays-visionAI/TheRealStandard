# 🛠 Phase 2 — 운영 효율화 + 영업 도구 (Deep Spec)

**작성일**: 2026-05-22
**상위 문서**: [MeatGo Implementation Plan v2](MeatGo_Implementation_Plan_v2.md)
**목표 일정**: M+2.5 ~ M+4 (약 1.5개월, 정식 런칭 직후)
**선행 의존**: Phase 0 완료(✅), Phase 1 완료(예정)

---

## 0. 왜 Phase 2인가 — 핵심 가설

MVP가 안정화되면 가장 큰 운영 부담은 **"같은 일을 반복하는 시간"** 입니다.

| 반복 작업 | 1명이 30 거래처 운영 시 월 소요 시간 |
|----------|-----------------------------------|
| 매일 시장가 확인 + 매입가 조정 | 약 20h |
| 단골 거래처 매주 발주 받아쓰기 | 약 30h |
| 정산/배송 상태 일일이 카톡으로 안내 | 약 25h |
| 출고 명세서 PDF 만들고 이메일 보내기 | 약 15h |
| 세금계산서 발행 (월말) | 약 10h |
| **합계** | **~100h/월 (1.5인 분량)** |

Phase 2는 이 100시간 중 **70~80시간을 자동화**해서 1명이 50~70 거래처를 운영할 수 있게 하는 것이 핵심 KPI.

---

## 1. Phase 2 작업 목록 (7개)

| # | 작업 | 카테고리 | 일정 | 외부 의존 |
|---|------|----------|------|-----------|
| 2.1 | 자동 가격 동기화 | 데이터 자동화 | 3일 | EKAPE/KAMIS API + Cloud Functions |
| 2.2 | 거래처 수익성 계산기 | 분석/BI | 3일 | 없음 |
| 2.3 | SALES role 운영 매뉴얼 | 거버넌스 | 1일 | 없음 |
| 2.4 | 자동발주(template) 기능 | 운영 자동화 | 2일 | 없음 |
| 2.5 | 카카오 알림톡 연동 | 고객 커뮤니케이션 | 3일 | 카카오 비즈니스 채널 |
| 2.6 | PDF 거래명세서 자동 이메일 | 운영 자동화 | 1.5일 | SendGrid/Resend |
| 2.7 | 전자세금계산서 자동 발행 | 회계 자동화 | 3일 | 팝빌 SaaS |

**총 16.5일** (한 명 풀타임 기준 약 3.5주, Phase 2 1.5개월 일정에 맞음)

---

## 2. 각 작업 상세

### 2.1 자동 가격 동기화

**목적**: 매일 새벽 EKAPE(축산물품질평가원) + KAMIS(농산물유통정보) API에서 도매시세를 가져와 우리 상품의 매입가와 비교, 변동 시 "갱신 제안" 알림 생성.

**사용자 시나리오 — 아침 출근**
```
아침 9시, 어드민이 사이트 진입
→ AlertBell 종 아이콘 (8) 표시
→ 클릭하면 "오늘 매입가 갱신 제안 8건"
→ 화면 진입: "삼겹살 매입가 12,000 → 13,200 (+10%, EKAPE)"
→ 일괄 "수락" 또는 "거부" 또는 "직접 수정" 선택
→ 승인된 항목만 priceHistory + Product.costPrice 업데이트
```

**구현 구조**
```
[Cloud Function: 매일 04:00 KST]
  ├─ fetchEKAPE() → 축산물 가격 (한우/돼지/오리 등 등급별)
  ├─ fetchKAMIS() → 농산물 가격 (Phase 4 수산/채소에 대비)
  ├─ marketPrices 컬렉션에 저장 (시계열)
  └─ 우리 products와 매핑 → 변동 ≥ 5% 시 priceUpdateProposals 컬렉션 생성
       └─ notificationService.createNotification('PRICE_UPDATE_PROPOSAL')
```

**데이터 모델** (신규)
```ts
// priceUpdateProposals/{id}
{
  productId: string
  productName: string
  source: 'EKAPE' | 'KAMIS' | 'MANUAL'
  currentCostPrice: number
  proposedCostPrice: number
  changePercent: number       // 변동률
  marketGrade?: string        // 시장 등급 (한우 1++, 1+ 등)
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED'
  triggeredAt: Timestamp
  reviewedAt?: Timestamp
  reviewedBy?: string         // UID
}
```

**UI**: `/admin/insights/price-proposals` 신규 페이지 + AlertBell 알림 연동

**비용 추정**:
- EKAPE: 공공데이터포털 무료 (일 10,000건)
- KAMIS: 무료
- Cloud Functions: 일 1회 실행, 월 30회 → Firebase 무료 티어 내 (월 2M 호출)

**결정 필요**:
- 갱신 제안의 임계값 (5% / 10% / 사용자 설정?)
- 자동 수락 모드 지원 여부? (현재는 모두 수동 검토)

---

### 2.2 거래처 수익성 계산기

**목적**: "어느 거래처가 진짜 돈이 되는가" 를 데이터로 보여줘서 영업 자원 배분 + 단가 협상 근거 제공.

**공헌이익 공식**
```
공헌이익 = 매출
         - 매입원가
         - 운송비 (shipments에서 합산)
         - 회수기간 비용 (paymentTermDays × 기회비용율 × 매출)
         - 클레임/반품 손실
```

**사용자 시나리오 — 분기 결산**
```
어드민: /admin/insights/customer-profitability
→ 거래처 30개 랭킹 표시 (공헌이익 순)
  1. 태윤유통    : 매출 1.2억, CM 28%, ★
  2. 푸드고      : 매출 0.8억, CM 31%, ★
  ...
  29. ㅇㅇ식당   : 매출 0.5억, CM 4% (운송비 + 회수기간 길음) ⚠
→ 클릭하면 거래처별 상세:
  - 월별 매출 추이
  - 매입가 vs 공급가 마진 분포
  - 평균 회수일 + 외상 잔액
  - 클레임 횟수
  - 제안: "ㅇㅇ식당 마진 4% 미만, 단가 인상 협상 필요"
```

**데이터 모델** (기존 활용)
- salesOrders + salesOrderItems (매출/매입)
- shipments (운송)
- settlements (회수기간, 클레임)
- 신규 계산: `customerProfitabilitySnapshot` (월간 캐시)

**계산 비용**: 거래처 30개 × 12개월 = 360 행. 클라이언트 사이드에서 계산 가능.

**결정 필요**:
- 회수기간 기회비용율 (연 5% / 8% / 10%)?
- 클레임 데이터 어디서 (현재 명시적 모델 없음 — 추가 필요)?
- 운송비를 거래처에 어떻게 배분 (실비 vs 평균 분배)?

---

### 2.3 SALES role 운영 매뉴얼

**목적**: 영업담당자가 본인 권한 안에서 자연스럽게 일할 수 있도록 가이드 + UI 정합성 점검.

**산출물**:
1. **운영 매뉴얼 (PDF/HTML)**: 영업담당자가 할 수 있는 일·해야 할 일·금지 사항
2. **`내 거래처만 보기` 필터 점검**: `createdBy` 기반 필터가 모든 리스트에서 작동하는지 검증
3. **사이드바 메뉴 조정**: SALES role에 노출되는 메뉴가 합리적인지 (예: 매입발주는 숨김, 정산은 read-only)

**작업량**: 코드 변경 적음. 문서화 + 점검 1일.

---

### 2.4 자동발주 (Template Order)

**목적**: 단골 거래처가 매주 같은 품목을 발주받으면, 시스템이 패턴을 인식해서 다음 주에도 자동 제안 → 거래처가 "확정" 한 번 클릭으로 발주 완료.

**사용자 시나리오**
```
[Cloud Function: 매주 일요일 17:00 KST]
  - 지난 4주 거래처별 발주 데이터 분석
  - 같은 품목 3주 이상 반복 → "정기 발주 패턴" 인식
  - 다음 주용 발주서 DRAFT 자동 생성 (status: SENT)
  - 거래처에게 카톡 알림: "이번 주 정기 발주서가 준비됐습니다. 확인해주세요"
  - 거래처 클릭 → 수량 조정/품목 추가 가능 → 확정

거래처가 24시간 무응답 시:
  - 영업담당에게 알림: "ㅇㅇ식당 정기발주 미응답"
```

**데이터 모델** (신규)
```ts
// orderTemplates/{id}
{
  customerOrgId: string
  customerName: string
  cadence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  weekday?: number            // 주간 발주의 요일 (0=일)
  items: { productId, productName, qty, unit }[]
  autoGenerate: boolean       // 자동 생성 활성화
  lastGeneratedAt?: Timestamp
  nextGenerateAt?: Timestamp
  detectionConfidence: number // 패턴 신뢰도 (0-1)
}
```

**결정 필요**:
- 거래처가 자동 제안 받기 **옵트인** vs **기본 활성**?
- 패턴 인식 임계값 (3주 / 4주 / 8주 연속)?
- 무응답 정책 (자동 발주 처리 vs 자동 취소)?

---

### 2.5 카카오 알림톡 연동

**목적**: 정산, 배송, 단가표 등 거래처 통지를 이메일 + 알림톡 이중화 → 도달률 + 신뢰도 ↑.

**알림톡 사용 시나리오 (5가지)**
1. **단가표 발행** — "이번 주 단가표가 발행되었습니다. 확인하기"
2. **발주 확정** — "ㅇㅇ품목 발주가 접수됐습니다. 출고 예정일 m/d"
3. **출고 알림** — "오늘 새벽 배송 출발했습니다. 차량번호 12가3456"
4. **정산 알림** — "결제 예정일 (m/d) 임박. 잔액 ₩XX,XXX"
5. **연체 안내** — "결제 기한이 N일 경과했습니다. 영업담당 연락"

**기술 구조**
```
[발주 확정 이벤트] → notificationService.send({
   channel: ['firestore', 'kakao_alimtalk'],
   templateCode: 'ORDER_CONFIRMED',
   variables: { customerName, productName, expectedDate }
})
   ↓
Cloud Function:
   - Firestore notifications 저장 (AlertBell용)
   - 카카오 알림톡 발송 (서비스: 솔라피, 알리고, 카카오 비즈)
```

**카카오 알림톡 발송 SaaS 비교**
| SaaS | 건당 비용 | 템플릿 승인 | API 안정성 |
|------|----------|------------|-----------|
| 솔라피 (Solapi) | 6.5원 | 즉시 | 우수 |
| 알리고 | 7원 | 1~2일 | 양호 |
| 비즈톡 | 8원 | 즉시 | 양호 |

→ **권장: 솔라피** (가격·안정성·문서 우수)

**필요한 사전 작업**:
1. 카카오 비즈니스 채널 개설 ("@MEATGO")
2. 사업자등록증·법인등기부 등본 → 카카오 심사 (3일 소요)
3. 알림톡 템플릿 5개 작성 → 카카오 심사 (각 1~2일)

**결정 필요**:
- 카카오 비즈니스 채널 이름 (현재 채널 ID `_zeXxjG` 존재 — 추가 등록 필요)
- 알림톡 미수신 거래처에 대한 fallback (SMS? 이메일?)

---

### 2.6 PDF 거래명세서 자동 이메일

**목적**: 출고 확정 시 PDF 거래명세서를 자동으로 생성·이메일 발송 → 어드민이 매번 보내지 않아도 됨.

**구현 구조**
```
[Cloud Function: shipments/{id} status === 'DELIVERED' 트리거]
  - pdfService.generateShipmentStatement(shipmentId) → Storage 업로드
  - 거래처 이메일 조회 (users/{customerOrgId}.email)
  - SendGrid/Resend 이메일 발송 with PDF 첨부
  - emailLog 컬렉션에 기록 (감사용)
```

**이메일 발송 SaaS 비교**
| SaaS | 월 무료 | 도메인 검증 | 한국 IP 도달률 |
|------|--------|------------|--------------|
| Resend | 3,000건 | 간단 (DNS 1줄) | 양호 |
| SendGrid | 100건/일 | 보통 | 양호 |
| AWS SES | 200건/일 무료 | 복잡 | 양호 |

→ **권장: Resend** (DX·도달률 우수, 월 3,000건 무료가 충분)

**필요한 사전 작업**:
1. meatgo.kr 도메인의 SPF/DKIM 레코드 설정 (Cloudflare DNS 1줄)
2. 발송 이메일 주소 결정 (예: `noreply@meatgo.kr`, `billing@meatgo.kr`)

---

### 2.7 전자세금계산서 자동 발행

**목적**: 매월말 직접 손으로 작성하던 세금계산서를 자동 발행 → 회계 부담 제거.

**SaaS 비교**
| SaaS | 건당 비용 | API 품질 | 시장 점유율 |
|------|----------|---------|------------|
| **팝빌** | 70원 | 우수, 문서 풍부 | 1위 (대부분 회계법인 사용) |
| 바로빌 | 80원 | 양호 | 2위 |
| 위세이 | 60원 | 보통 | 신규 |

→ **권장: 팝빌** (한국 회계 SaaS의 사실상 표준. 회계사·세무사가 익숙)

**Cloud Function 흐름**
```
[매월 1일 09:00 트리거]
  - 지난 달 confirmedSalesOrders 조회 (status: DELIVERED + 정산 PAID)
  - 거래처별 합산 → 팝빌 API로 세금계산서 발행 요청
  - 발행 결과 (승인번호) → salesOrders.taxInvoiceId 저장
  - 거래처에게 카카오 알림톡 + 이메일
```

**필요한 사전 작업**:
1. 팝빌 가입 + 사업자등록증 + 인감 등록
2. 공인인증서/디지털서명용 인증서 설치
3. 거래처 사업자번호 사전 확보 (현재 business.bizRegNo로 보유)

**결정 필요**:
- 자동 발행 vs 매월말 1회 일괄 검토 후 발행?
- 면세/과세 자동 분류 기준 (product.taxFree 활용)
- 발행 후 거래처 수정 요청 처리 워크플로우

---

## 3. 외부 의존성 종합

Phase 2를 위해 신규로 도입할 서비스/계약:

| 항목 | 필요한 것 | 비용 (월) |
|------|----------|----------|
| Firebase Cloud Functions | 신규 셋업 (현재 미사용) | Spark 무료 (월 2M 호출), Blaze 1$~ |
| 솔라피 (알림톡) | 카카오 비즈채널 + 솔라피 계약 | 0원~ (사용량) |
| Resend (이메일) | 도메인 SPF/DKIM + 계정 | 월 3,000건 무료 |
| 팝빌 (세금계산서) | 사업자 가입 + 보증금 | 발행건당 70원 |
| **합계 (50 거래처 운영)** | | **약 월 5~15만 원** |

**참고**: 솔라피 알림톡 5종 × 50 거래처 × 4주 = 월 1,000건 × 6.5원 = 6,500원

---

## 4. Phase 2 작업 순서 권장

선행 의존성 고려한 순서:

```
Step 1 (1주): Cloud Functions 셋업 (functions/ 디렉토리 신설)
              └─ 향후 모든 자동화의 기반

Step 2 (3일): 2.6 PDF 이메일 자동 발송
              └─ 가장 단순한 자동화, Cloud Functions 검증

Step 3 (3일): 2.1 자동 가격 동기화
              └─ marketPrices + priceUpdateProposals + Cloud Function

Step 4 (3일): 2.5 카카오 알림톡 (이미 채널 있음)
              └─ Step 2의 Cloud Functions 인프라 재사용

Step 5 (2일): 2.4 자동발주 템플릿
              └─ Cloud Functions로 주간 배치

Step 6 (3일): 2.7 전자세금계산서 (팝빌)
              └─ 회계 처리, 신중하게 (테스트 모드 → 운영)

Step 7 (3일): 2.2 거래처 수익성 계산기
              └─ 데이터 충분히 쌓인 후가 유리

Step 8 (1일): 2.3 SALES 운영 매뉴얼
              └─ 마지막에 통합 정리
```

---

## 5. 의사결정 필요 사항 (총 10개)

| # | 카테고리 | 질문 | 권장 |
|---|---------|------|------|
| Q1 | 2.1 | 갱신 제안 임계값 | **5%** (작은 변동도 포착) |
| Q2 | 2.1 | 자동 수락 모드 지원 | **NO** (전부 수동 검토 — 운영 사고 방지) |
| Q3 | 2.2 | 회수기간 기회비용율 | **연 8%** (시중 대출금리 기준) |
| Q4 | 2.2 | 운송비 거래처 배분 방식 | **실비 추적** (shipments에 customerOrgId가 있어야 함 — 확인 필요) |
| Q5 | 2.4 | 자동발주 옵트인 vs 기본 | **옵트인** (거래처가 명시적 동의 후) |
| Q6 | 2.4 | 패턴 인식 임계값 | **4주 연속 동일 품목** |
| Q7 | 2.5 | 알림톡 SaaS | **솔라피** |
| Q8 | 2.5 | 채널명 | **@MEATGO** (또는 @믿고) — 결정 필요 |
| Q9 | 2.6 | 이메일 SaaS | **Resend** |
| Q10 | 2.7 | 세금계산서 SaaS | **팝빌** |

---

## 6. 리스크

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| **카카오 알림톡 템플릿 심사 지연** | 中 | 핵심 5개 템플릿 1주 일찍 등록 + 심사 |
| **팝빌 발행 실패 → 매월말 세금처리 차질** | 高 | 테스트 모드 1개월 운영 후 실 발행. 실패 시 수동 백업 절차 매뉴얼 |
| **자동 가격 갱신이 잘못된 데이터로 시장가 왜곡** | 高 | 일괄 자동 수락 비활성. 모두 수동 검토 |
| **Cloud Functions Blaze 요금제 전환 비용 폭증** | 中 | 호출량 모니터링 알림 (월 100$ 초과 시 alert) |
| **자동발주가 거래처 의도와 다르게 보내져 클레임** | 中 | 24h 응답 대기 + 명시적 확정 클릭 후만 처리 |

---

## 7. KPI — Phase 2 완료 시점 측정

| 항목 | 측정 방법 | 목표 |
|------|----------|------|
| 어드민 일일 운영 시간 절감 | (Phase 2 전) − (Phase 2 후) | -50% 이상 |
| 가격 갱신 응답 시간 | EKAPE 가격 변동 → 우리 매입가 갱신까지 | < 1 영업일 |
| 정산 알림 도달률 | 알림톡/이메일 발송 → 거래처 확인 | > 90% |
| 자동발주 수락률 | 시스템 제안 → 거래처 확정 | > 60% |
| 세금계산서 자동 발행률 | 매출 건수 중 자동 발행 비율 | > 95% |

---

## 8. Phase 1과의 의존 관계

| Phase 2 항목 | Phase 1 의존 |
|-------------|------------|
| 2.6 PDF 이메일 | Phase 1.5 상품 상세에 이미지 多 들어가면 PDF 디자인도 풍부해짐 (선택) |
| 그 외 6개 | Phase 1 의존 없음. Phase 1과 병렬 가능 |

→ Phase 1 작업 중에도 Cloud Functions 셋업(Step 1) 등을 미리 시작 가능.

---

## 9. 다음 액션

- [ ] 사용자: Q1~Q10 의사결정 답변
- [ ] 사용자: 카카오 비즈니스 채널 이름 확정
- [ ] 사용자: 팝빌·솔라피·Resend 계정 발급 (또는 위임)
- [ ] 작업자: Phase 1 완료 후 Step 1 (Cloud Functions 셋업) 착수

---

## Appendix — 참고

### Cloud Functions 셋업 가이드 (예고)
```bash
cd /Users/sangjaeseo/Antigravity/TRS
firebase init functions
# → TypeScript / ESLint / Node 20
# → functions/ 디렉토리 생성
# → firebase.json에 functions 섹션 추가
```

### 외부 API 키 관리
Phase 0.4에서 만든 `systemConfigService.ts` 에 추가 키 필드 확장:
- `solapiApiKey`, `solapiApiSecret` (알림톡)
- `resendApiKey` (이메일)
- `popbillLinkId`, `popbillSecretKey` (세금계산서)

---

*Meat Go AI · Phase 2 Operational Efficiency · Confidential. © 2026.*
