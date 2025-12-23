# TRS - 태윤유통 물류 시스템

육류유통 수발주/발주/물류/배차 프로토타입 시스템

## 🚀 시작하기

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 📁 프로젝트 구조

```
/TRS
├── /src
│   ├── /components      # 재사용 가능한 UI 컴포넌트
│   ├── /contexts        # React Context (인증 등)
│   ├── /layouts         # 페이지 레이아웃 (Admin, Front)
│   ├── /pages
│   │   ├── /admin      # 운영자 페이지
│   │   └── /front      # 고객 페이지
│   ├── /styles         # 전역 CSS 및 디자인 시스템
│   ├── /types          # TypeScript 타입 정의
│   └── /utils          # 유틸리티 함수
├── /functions          # Firebase Cloud Functions (예정)
└── /public
```

## 🎨 디자인 시스템

첨단 AI 기반 기업 이미지를 위한 색상 팔레트:

| 용도 | 색상 | HEX |
|------|------|-----|
| Primary | Electric Indigo | `#6366F1` |
| Secondary | Cyan | `#06B6D4` |
| Accent | Emerald | `#10B981` |
| Background | Slate Dark | `#0F172A` |

## 📱 주요 화면

### Admin (운영자)
- **대시보드**: 핵심 KPI 및 빠른 작업
- **주문장 관리**: 생성, 검토, 확정
- **배송/배차**: 차량 추천, 배차 정보 입력
- **문서 관리**: 엑셀 업로드/파싱, 매칭
- **물류 게이트**: 체크리스트, 서명

### Front (고객)
- **주문 초대**: 토큰 기반 접근
- **주문서 작성**: 품목 선택, 수량 입력
- **배송 조회**: 상태, 기사 정보, ETA

## 🔧 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build**: Vite 6
- **Routing**: React Router v7
- **Styling**: Vanilla CSS (다크모드, 글래스모피즘)
- **Parser**: SheetJS (xlsx)
- **Backend**: Firebase (예정)

## 🗓️ 개발 로드맵

- [x] Phase 1: 프로젝트 초기화 및 디자인 시스템
- [x] Phase 2: Admin 레이아웃 및 대시보드
- [x] Phase 3: 주문장 생성/목록/검토
- [x] Phase 4: 배송/배차 관리
- [x] Phase 5: 문서 업로드/파싱
- [x] Phase 6: 물류 게이트
- [x] Phase 7: 고객 주문/배송조회
- [ ] Phase 8: Firebase 연동
- [ ] Phase 9: 실제 데이터 연동 테스트

## 📄 라이선스

Private - 태윤유통
