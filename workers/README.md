# MeatGo API Gateway (Cloudflare Worker)

Firebase 정적 호스팅에는 서버 런타임이 없어, 외부 API 호출(시세/뉴스)과 비밀키 처리·자동화를
이 Worker가 담당합니다. **이 Worker가 없으면 운영 환경에서 시세/뉴스 기능이 동작하지 않습니다.**

## 무엇을 하나

| 경로 | 업스트림 | 비고 |
|------|----------|------|
| `/api/datago/*` | `https://apis.data.go.kr` | EKAPE 축산물 경락가격 |
| `/api/kamis/*` | `http://www.kamis.or.kr` | KAMIS 농산물 가격 |
| `/api/naver/*` | `https://openapi.naver.com` | 네이버 뉴스 |
| `/` `/health` | — | 헬스체크 |

- CORS 헤더 부여(`ALLOWED_ORIGINS`)
- 비밀키가 Worker secret으로 설정되면 클라이언트 전달값 대신 사용(키 유출 방지)

## 배포

```bash
cd workers
npm install
npx wrangler login           # 최초 1회 (Cloudflare 계정 인증)
npm run deploy               # → https://meatgo-api.<account>.workers.dev
```

배포 후 출력된 Worker URL을 **앱의 `.env`** 에 등록하고 다시 빌드/배포:

```bash
# 프로젝트 루트 .env
VITE_API_BASE=https://meatgo-api.<account>.workers.dev
```

> dev(`npm run dev`)에서는 `VITE_API_BASE`를 비워두면 Vite 프록시가 처리하므로 Worker 없이도 동작합니다.

## 비밀키 등록 (선택, 권장)

키를 Worker에 두면 브라우저 번들에서 제거할 수 있습니다.

```bash
npx wrangler secret put DATAGO_KEY
npx wrangler secret put KAMIS_KEY
npx wrangler secret put KAMIS_ID
npx wrangler secret put NAVER_CLIENT_ID
npx wrangler secret put NAVER_CLIENT_SECRET
```

## 로컬 실행

```bash
npm run dev      # wrangler dev (로컬 8787)
```

## 향후 확장 (Phase 2 잔여)

- **2.1 자동 가격 동기화**: `wrangler.toml`의 `[triggers] crons` 주석 해제 + `scheduled()` 구현
  (EKAPE/KAMIS fetch → Firestore REST로 `marketPrices`/`priceUpdateProposals` 기록)
- **2.5 카카오 알림톡(솔라피)**: `/api/notify/alimtalk` POST 엔드포인트 + `SOLAPI_*` secret
- **2.6 PDF 거래명세서 이메일(Resend)**: `/api/notify/email` 엔드포인트 + `RESEND_API_KEY`
- **2.7 전자세금계산서(팝빌)**: `/api/tax/issue` 엔드포인트 + `POPBILL_*` secret

각 기능은 라우트 + secret만 추가하면 되며, 앱은 동일하게 `VITE_API_BASE` 기준으로 호출합니다.
