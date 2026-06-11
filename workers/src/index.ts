/**
 * MeatGo API Gateway (Cloudflare Worker)
 *
 * 역할:
 *  1) 외부 시세/뉴스 API CORS 프록시 (Firebase 정적 호스팅엔 프록시가 없어 운영에서 필수)
 *     - /api/datago/*  → https://apis.data.go.kr   (EKAPE 축산물 경락가격)
 *     - /api/kamis/*   → http://www.kamis.or.kr     (KAMIS 농산물 가격)
 *     - /api/naver/*   → https://openapi.naver.com  (네이버 뉴스)
 *  2) 비밀키 서버측 주입 (Worker secret 설정 시 클라이언트 값 대체)
 *  3) (예정) 2.1 자동 가격 동기화 cron / 2.5 알림톡 / 2.6 이메일 / 2.7 세금계산서 엔드포인트
 *
 * 클라이언트는 dev에서 Vite 프록시(/api/*), 운영에서 VITE_API_BASE=<이 Worker URL> 로 호출.
 */

export interface Env {
    ALLOWED_ORIGINS?: string
    // 시세/뉴스 (선택 — 설정 시 클라이언트 전달값 대신 사용)
    NAVER_CLIENT_ID?: string
    NAVER_CLIENT_SECRET?: string
    DATAGO_KEY?: string
    KAMIS_KEY?: string
    KAMIS_ID?: string
    // LLM (선택 — secret 설정 시 클라이언트 전달 키 대신 서버측 키 사용 = 키 비노출 강화)
    ANTHROPIC_API_KEY?: string
    MINIMAX_API_KEY?: string
}

const UPSTREAMS: Record<string, string> = {
    '/api/datago': 'https://apis.data.go.kr',
    '/api/ekape': 'http://data.ekape.or.kr',     // 축평원 자체 서버 (경락가격 실제 엔드포인트)
    '/api/kamis': 'http://www.kamis.or.kr',
    '/api/naver': 'https://openapi.naver.com',
    // LLM — 브라우저 CORS 불가 제공자를 프록시. MiniMax는 Anthropic 호환 API 사용.
    '/api/anthropic': 'https://api.anthropic.com',
    '/api/minimax': 'https://api.minimax.io/anthropic',
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
    const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean)
    let allow = '*'
    if (!allowed.includes('*')) {
        allow = origin && allowed.includes(origin) ? origin : (allowed[0] || '*')
    } else if (origin) {
        allow = origin
    }
    return {
        'Access-Control-Allow-Origin': allow,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Naver-Client-Id,X-Naver-Client-Secret,x-api-key,anthropic-version',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)
        const origin = request.headers.get('Origin')
        const cors = corsHeaders(origin, env)

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors })
        }

        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response('MeatGo API gateway OK', {
                status: 200,
                headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' },
            })
        }

        const prefix = Object.keys(UPSTREAMS).find(p => url.pathname.startsWith(p))
        if (!prefix) {
            return new Response('Not found', { status: 404, headers: cors })
        }

        const rest = url.pathname.slice(prefix.length)
        const target = new URL(UPSTREAMS[prefix] + rest)
        url.searchParams.forEach((v, k) => target.searchParams.set(k, v))

        // 비밀키 서버측 주입 (설정된 경우 클라이언트 전달값을 덮어씀)
        if (prefix === '/api/datago' && env.DATAGO_KEY) target.searchParams.set('serviceKey', env.DATAGO_KEY)
        if (prefix === '/api/kamis') {
            if (env.KAMIS_KEY) target.searchParams.set('p_cert_key', env.KAMIS_KEY)
            if (env.KAMIS_ID) target.searchParams.set('p_cert_id', env.KAMIS_ID)
        }

        const headers = new Headers()
        headers.set('Accept', request.headers.get('Accept') || '*/*')
        const ct = request.headers.get('Content-Type')
        if (ct) headers.set('Content-Type', ct)
        if (prefix === '/api/naver') {
            const id = env.NAVER_CLIENT_ID || request.headers.get('X-Naver-Client-Id') || ''
            const secret = env.NAVER_CLIENT_SECRET || request.headers.get('X-Naver-Client-Secret') || ''
            if (id) headers.set('X-Naver-Client-Id', id)
            if (secret) headers.set('X-Naver-Client-Secret', secret)
        }
        if (prefix === '/api/anthropic' || prefix === '/api/minimax') {
            // 키: Worker secret 우선(서버측 보관 강화), 없으면 클라이언트 전달값(어드민 전역 설정) 사용
            const secretKey = prefix === '/api/anthropic' ? env.ANTHROPIC_API_KEY : env.MINIMAX_API_KEY
            const apiKey = secretKey || request.headers.get('x-api-key') || ''
            if (apiKey) headers.set('x-api-key', apiKey)
            headers.set('anthropic-version', request.headers.get('anthropic-version') || '2023-06-01')
            const auth = request.headers.get('Authorization')
            if (auth) headers.set('Authorization', auth)
        }

        try {
            const res = await fetch(target.toString(), {
                method: request.method,
                headers,
                body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
            })
            const out = new Response(res.body, { status: res.status, headers: res.headers })
            for (const [k, v] of Object.entries(cors)) out.headers.set(k, v)
            return out
        } catch (e) {
            return new Response(`Upstream error: ${(e as Error).message}`, { status: 502, headers: cors })
        }
    },

    // ── 2.1 자동 가격 동기화 (cron) ──────────────────────────────
    // wrangler.toml의 [triggers] crons 주석을 해제하고 아래를 구현:
    // async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    //   1) EKAPE/KAMIS fetch → 2) 우리 products와 비교(변동 ≥ 5%) →
    //   3) Firestore REST API로 marketPrices / priceUpdateProposals 기록
    // }
}
