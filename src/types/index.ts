// ======================================
// TRS Type Definitions
// PRD v1.0 기반 데이터 모델
// ======================================

// 사용자 역할
export type UserRole = 'ADMIN' | 'OPS' | 'CUSTOMER' | 'SUPPLIER' | 'ACCOUNTING' | 'WAREHOUSE';

// 조직 정보 (고객/공급사/도축장/물류 등)
export interface Organization {
    id: string;
    bizRegNo: string;        // 사업자등록번호
    name: string;
    ceoName: string;
    address: string;
    tel: string;
    fax?: string;
    roles: UserRole[];
    createdAt: Date;
    updatedAt: Date;
}

// 제품 마스터
export type UnitType = 'KG' | 'BOX';
export type TempZone = 'FROZEN' | 'CHILLED' | 'AMBIENT';
export type ProductCategory = '냉장' | '냉동' | '부산물';

export interface Product {
    id: string;
    name: string;
    category: ProductCategory;
    subCategory?: string;
    unitType: UnitType;
    boxWeight?: number | null;      // BOX→KG 환산 기준
    tempZone: TempZone;
    taxFree: boolean;        // 면세 여부

    // 다양한 가격 체계 (모두 원/kg 단위)
    costPrice: number;       // 매입가 - 공급업체로부터 매입하는 가격
    wholesalePrice: number;  // 도매가/B2B 공급가 - 거래처에 공급하는 가격
    retailPrice: number;     // 소매가/직판장(돈우매장)가 - 소비자에게 판매하는 가격

    isActive: boolean;       // 활성화 여부
    memo?: string;           // 비고
    createdAt: Date;
    updatedAt: Date;
}

// 고객 카탈로그
export interface CustomerCatalog {
    id: string;
    customerOrgId: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

// 카탈로그 아이템
export interface CatalogItem {
    id: string;
    catalogId: string;
    productId: string;
    productName?: string;    // Denormalized
    unitPrice: number;
    visible: boolean;
    defaultInputType: UnitType;
}

// 차량 타입 마스터
export interface VehicleType {
    id: string;
    name: string;            // e.g., "1.8톤", "3.5톤"
    capacityKg: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// 문서 템플릿
export type DocumentStage = 'INBOUND' | 'OUTBOUND';

export interface DocumentTemplate {
    id: string;
    name: string;
    stage: DocumentStage;
    required: boolean;
    uploaderRole: UserRole;
    verifierRole: UserRole;
    enabled: boolean;
}

// ======================================
// 주문/확정 관련
// ======================================

// 주문장 상태
export type OrderSheetStatus =
    | 'DRAFT'           // 초안
    | 'SENT'            // 발송됨
    | 'SUBMITTED'       // 고객 제출
    | 'REVISION'        // 수정요청
    | 'CONFIRMED';      // 최종확정

// 주문장
export interface OrderSheet {
    id: string;
    customerOrgId: string;
    customerName?: string;   // Denormalized
    shipDate?: Date;
    cutOffAt: Date;          // 마감시간
    shipTo: string;          // 배송지
    adminComment?: string;
    customerComment?: string;
    discountAmount?: number;
    status: OrderSheetStatus;
    inviteTokenId: string;
    lastSubmittedAt?: Date;
    revisionComment?: string;
    createdAt: Date;
    updatedAt: Date;
}

// 주문장 아이템
export interface OrderSheetItem {
    id: string;
    orderSheetId: string;
    productId: string;
    productName?: string;
    inputType: UnitType;
    qtyKg?: number;
    qtyBox?: number;
    estimatedKg: number;     // 최종 환산 중량
    unitPrice: number;
    amount: number;
}

// 확정 주문 (SalesOrder) - 불변
export type SalesOrderStatus = 'CREATED' | 'PO_GENERATED' | 'SHIPPED' | 'COMPLETED';

export interface SalesOrder {
    id: string;
    sourceOrderSheetId: string;
    confirmedAt: Date;
    customerOrgId: string;
    customerName?: string;
    status: SalesOrderStatus;
    totalsKg: number;
    totalsAmount: number;
    createdAt: Date;
}

// 확정 주문 아이템
export interface SalesOrderItem {
    id: string;
    salesOrderId: string;
    productId: string;
    productName?: string;
    qtyKg: number;
    unitPrice: number;
    amount: number;
}

// ======================================
// 발주 (PO) 관련
// ======================================

export type POStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'REVISION_REQUESTED';

export interface PurchaseOrder {
    id: string;
    sourceSalesOrderId: string;
    supplierOrgId?: string;
    supplierName?: string;
    status: POStatus;
    confirmedAt?: Date;
    totalsKg: number;
    totalsAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PurchaseOrderItem {
    id: string;
    poId: string;
    productId?: string;
    productName: string;
    qtyKg: number;
    unitCost: number;
    amount: number;
    note?: string;
}

// ======================================
// 배송 (Shipment) 관련
// ======================================

export type ShipmentStatus = 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED';

export interface Shipment {
    id: string;
    sourceSalesOrderId: string;
    status: ShipmentStatus;
    carrierName?: string;       // 배송업체명
    vehicleTypeId?: string;
    vehicleTypeName?: string;   // Denormalized
    vehicleNo?: string;         // 차량번호
    driverName?: string;
    driverPhone?: string;
    etaAt?: Date;               // 예상 도착시간
    totalsKg: number;
    createdAt: Date;
    updatedAt: Date;
}

// 출고 패키지 (바코드 단위)
export interface ShipmentPackage {
    id: string;
    shipmentId: string;
    outboundBarcode: string;
    productName: string;
    qty: number;
    weightKg: number;
    unitPrice: number;
    amount: number;
    traceNo?: string;           // 이력번호
    animalId?: string;          // 개체번호
    slaughterhouseName?: string;// 도축장
    remarkCode?: string;        // 비고
    producedAt?: Date;          // 생산일
    expiresAt?: Date;           // 유통기한
}

// ======================================
// 문서 관련
// ======================================

export type DocumentType = 'TRANSACTION_STATEMENT' | 'INSPECTION_REPORT' | 'ETC';
export type DocumentStatus = 'UPLOADED' | 'PARSED' | 'MATCHED' | 'VERIFIED';
export type AttachToType = 'SALES_ORDER' | 'SHIPMENT' | 'PURCHASE_ORDER' | 'ORDER_SHEET';

export interface Document {
    id: string;
    docType: DocumentType;
    fileUrl: string;
    fileName: string;
    uploadedBy: string;
    uploadedAt: Date;
    status: DocumentStatus;
    attachTo?: {
        type: AttachToType;
        id: string;
    };
    extractedSummary?: {
        transactionDate?: Date;
        customerName?: string;
        totalWeight?: number;
        totalAmount?: number;
    };
}

// 거래내역서 라인
export interface TransactionStatementLine {
    id: string;
    statementId: string;
    productName: string;
    origin?: string;
    qty: number;
    weight: number;
    unitPrice: number;
    amount: number;
    traceNo?: string;
    slaughterhouse?: string;
}

// 검수확인서 - ShipmentPackage로 변환됨

// ======================================
// 물류 게이트
// ======================================

export type GateStage = 'INBOUND' | 'OUTBOUND';

export interface GateCheck {
    id: string;
    stage: GateStage;
    relatedShipmentId: string;
    checklist: Record<string, boolean>;
    signatureUrl?: string;
    signatureData?: string;
    checkedBy: string;
    checkedAt: Date;
}

// ======================================
// Invite Token
// ======================================

export interface InviteToken {
    id: string;
    orderSheetId: string;
    token: string;
    expiresAt: Date;
    usedAt?: Date;
    createdAt: Date;
}

// ======================================
// 파싱 결과 타입
// ======================================

export interface ParsedTransactionLine {
    productName: string;
    origin: string;
    qty: number;
    weight: number;
    unitPrice: number;
    amount: number;
    traceNo: string;
    slaughterhouse: string;
}

export interface ParsedInspectionPackage {
    barcode: string;
    productName: string;
    qty: number;
    weight: number;
    unitPrice: number;
    amount: number;
    traceNo: string;
    animalId: string;
    slaughterhouse: string;
    remark: string;
    producedAt: string;
    expiresAt: string;
}
