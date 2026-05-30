/**
 * 외부 API 게이트웨이 origin 결정.
 * - 개발: VITE_API_BASE 미설정 → window.location.origin → Vite dev 프록시(/api/*)가 처리
 * - 운영: VITE_API_BASE = Cloudflare Worker URL(예: https://meatgo-api.<acct>.workers.dev)
 *         → Worker가 /api/datago·/api/kamis·/api/naver 를 외부 API로 프록시 (CORS·비밀키 처리)
 *
 * 정적 호스팅(Firebase)에는 프록시가 없으므로, 운영에서 시세/뉴스 API를 쓰려면 반드시 설정.
 */
export function apiOrigin(): string {
    const base = import.meta.env.VITE_API_BASE
    return base && base.trim() ? base.trim().replace(/\/$/, '') : window.location.origin
}
