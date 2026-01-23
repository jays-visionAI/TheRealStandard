---
description: 3PL 파트너사 배차 프로세스 및 차량/기사 리스트 관리 워크플로우
---

# 3PL 파트너사 배차 프로세스 및 워크플로우 분석

## 1. 개요
본 워크플로우는 배송업체(3PL) 파트너사가 가입 후 자사의 차량 및 기사 정보를 사전에 등록하고, 관리자의 배차 요청에 대해 등록된 정보를 바탕으로 신속하게 응답할 수 있도록 설계되었습니다.

## 2. 주요 단계

### 단계 1: 파트너사 정보 완료 및 함대(Fleet) 관리
- **회원가입 후 초기 진입**: 3PL 역할로 가입한 사용자는 대시보드 또는 전용 메뉴(`차량/기사 관리`)로 안내됩니다.
- **정보 사전 등록**: 배차 시 재사용할 기사 성함, 연락처, 차량 번호, 차량 타입을 사전에 등록합니다.
- **관리 화면**: `FrontLayout`에 3PL용 메뉴를 추가하여 접근성을 높입니다.

### 단계 2: 관리자의 배차 요청 (Dispatch Request)
- **배차 요청 생성**: 관리자는 `Shipment`를 생성하고 해당 3PL 파트너사를 지정합니다.
- **알림 및 링크 발송**: 지정된 3PL 담당자에게 배차 요청 링크(토큰 포함)가 발송됩니다.

### 단계 3: 파트너사 배차 확정 (Dispatch Response)
- **요청 확인**: 파트너사 담당자는 링크(`DispatchView`)를 통해 배송 물량과 목적지를 확인합니다.
- **차량/기사 선택**: 사전에 등록한 리스트에서 적합한 항목을 선택합니다. (필요 시 신규 등록 가능)
- **최종 제출**: 제출 시 배송 상태가 `IN_TRANSIT`(배송중)으로 변경되며 관리자에게 알림이 전달됩니다.

## 3. 상세 설계

### 데이터 모델
- **carrierDrivers (Collection)**: 기사 및 차량 정보 저장
    - `carrierOrgId`: 소속 업체 ID
    - `driverName`, `driverPhone`: 기사 정보
    - `vehicleNumber`, `vehicleTypeId`: 차량 정보
    - `lastUsedAt`: 최근 배차 사용 일시

### UI 구성
1. **FleetManagement (`/order/fleet`)**: 파트너사용 자산 관리 페이지
2. **DispatchView (`/dispatch/:token`)**: 외부/파트너용 배차 응답 페이지 (기능 강화)
3. **FrontLayout**: 3PL 역할에 따른 메뉴 분기 처리

## 4. 구현 가이드
1. `src/pages/front/FleetManagement.tsx` 신규 생성
2. `src/layouts/FrontLayout.tsx` 메뉴 로직 수정
3. `src/App.tsx` 라우트 추가
4. `src/pages/public/DispatchView.tsx`에서 사전 등록된 드라이버 선택 로직 최적화
