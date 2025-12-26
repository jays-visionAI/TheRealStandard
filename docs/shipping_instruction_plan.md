# TRS 배차 및 출고지시(Shipping Instruction) 시스템 기획안

## 1. 개요
확정된 주문(SalesOrder)에 대해 최종 배차 정보를 입력하고, 물류팀과 고객에게 배송 정보를 공유하는 프로세스를 자동화합니다.

## 2. 주요 기능 및 요구사항

### 2.1 배차 정보 입력 (Admin)
- **대상**: 승인완료(Approved) 상태의 SalesOrder
- **트리거**: "출고지시" 버튼 클릭 시 모달 오픈
- **입력 항목**:
    - **배송번호 (Shipment No)**: `SH-YYYYMMDD-XXXX` 형식의 자동 생성 번호
    - **배송업체**: 직접 입력 또는 선택
    - **배송기사명**: 기사 성함
    - **연락처**: 기사님 휴대폰 번호
    - **차량번호**: 차량 번호판 정보
    - **차량 타입**: `Settings > 차량 타입`에 등록된 데이터 바인딩 (예: 1톤 냉탑, 5톤 트럭 등)
    - **도착예정시간 (ETA)**: 날짜 및 시간 선택

### 2.2 배송 정보 카드 (UI/UX)
- **디자인 컨셉**: 프리미엄 티켓/송장 형태의 카드 디자인
- **구성 요소**:
    - 배송번호 및 상태
    - 기사님/차량 정보 (아이콘 활용)
    - 배송 경로 (물류창고 -> 고객사)
    - 예상 도착 시간 강조

### 2.3 워크플로우 연결
1.  **Admin (영업/운영)**: 배차 정보를 입력하여 '출고지시' 완료
2.  **Logistics (물류팀)**: `Warehouse Dashboard`에서 새로운 출고 건 확인 및 정보 카드 가동
3.  **Customer (고객)**: 고객용 트래킹 페이지(`DeliveryTracking.tsx`)에서 배송 카드 실시간 노출

## 3. 데이터 모델 (Shipment)
```typescript
interface Shipment {
    id: string;             // 배송번호 SH-xxxx
    orderId: string;        // 연결된 SalesOrder ID
    company: string;        // 배송업체
    driverName: string;     // 기사명
    driverPhone: string;    // 연락처
    vehicleNumber: string;  // 차량번호
    vehicleType: string;    //차량타입 (ID 또는 명칭)
    eta: Date;              // 도착예정시간
    status: 'READY' | 'SHIPPING' | 'DELIVERED';
    createdAt: Date;
}
```

## 4. UI/UX 계획
- **모달 에디터**: Glassmorphism 디자인이 적용된 입력 폼
- **배송 카드**: 
    - 애니메이션이 가미된 확장형 카드
    - 출력(PDF) 또는 공유 링크 생성 기능 고려

## 5. 기대 효과
- 물류팀과의 실시간 정보 동기화로 오배송 방지
- 고객에게 신뢰감 있는 실시간 배송 정보 제공
- 배차 업무의 디지털화 및 이력 관리
