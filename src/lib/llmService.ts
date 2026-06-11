import { getLlmSettings, type LlmSettings, type LlmProvider } from './systemConfigService'
import { apiOrigin } from './external/apiBase'

// ============ LLM SERVICE — 전역(Firestore) 설정 기반 공용 텍스트 생성 ============
// 어드민이 LLM 설정(/admin/settings/llm)에서 저장한 활성 제공자·키·모델을 사용한다.
//
// Anthropic / MiniMax: 동일한 Anthropic Messages API 형식.
//   - Anthropic: Worker 프록시 /api/anthropic → api.anthropic.com
//   - MiniMax:   Worker 프록시 /api/minimax  → api.minimax.io/anthropic (Anthropic 호환)
//   (둘 다 브라우저 CORS 제약이 있어 Cloudflare Worker 게이트웨이를 경유)
// OpenAI / DeepSeek: OpenAI 호환 chat/completions 직접 호출 (CORS 허용됨)
// Gemini: generateContent 직접 호출

export const DEFAULT_MODELS: Record<string, string> = {
    anthropic: 'claude-haiku-4-5',   // 저가형 — 해설/요약 용도
    minimax: 'MiniMax-M2',
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.0-flash',
    deepseek: 'deepseek-chat',
}

export interface GenerateInput {
    system?: string
    prompt: string
    maxTokens?: number
}

let cachedSettings: LlmSettings | null = null
let cachedAt = 0
const CACHE_MS = 60_000

export async function getLlmConfig(force = false): Promise<LlmSettings | null> {
    if (!force && cachedSettings && Date.now() - cachedAt < CACHE_MS) return cachedSettings
    cachedSettings = await getLlmSettings()
    cachedAt = Date.now()
    return cachedSettings
}

function keyFor(s: LlmSettings, p: LlmProvider): string | undefined {
    switch (p) {
        case 'anthropic': return s.anthropicApiKey
        case 'minimax': return s.minimaxApiKey
        case 'openai': return s.openaiApiKey
        case 'gemini': return s.geminiApiKey
        case 'deepseek': return s.deepseekApiKey
    }
}

/** Anthropic Messages API 형식 호출 (Anthropic·MiniMax 공용) */
async function callMessagesApi(proxyPrefix: string, apiKey: string, model: string, input: GenerateInput): Promise<string | null> {
    const res = await fetch(`${apiOrigin()}${proxyPrefix}/v1/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: input.maxTokens ?? 400,
            // 시스템 프롬프트는 고정 텍스트 — 프롬프트 캐싱 마커(프롬프트가 모델 최소치를 넘으면 활성화)
            ...(input.system ? { system: [{ type: 'text', text: input.system, cache_control: { type: 'ephemeral' } }] } : {}),
            messages: [{ role: 'user', content: input.prompt }],
        }),
    })
    if (!res.ok) {
        console.warn(`LLM(messages) HTTP ${res.status}:`, await res.text().catch(() => ''))
        return null
    }
    const data = await res.json()
    const block = Array.isArray(data?.content) ? data.content.find((b: any) => b.type === 'text') : null
    return block?.text ?? null
}

/** OpenAI 호환 chat/completions 호출 (OpenAI·DeepSeek 공용) */
async function callChatCompletions(baseUrl: string, apiKey: string, model: string, input: GenerateInput): Promise<string | null> {
    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            max_tokens: input.maxTokens ?? 400,
            messages: [
                ...(input.system ? [{ role: 'system', content: input.system }] : []),
                { role: 'user', content: input.prompt },
            ],
        }),
    })
    if (!res.ok) {
        console.warn(`LLM(chat) HTTP ${res.status}:`, await res.text().catch(() => ''))
        return null
    }
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? null
}

async function callGemini(apiKey: string, model: string, input: GenerateInput): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
            contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
            generationConfig: { maxOutputTokens: input.maxTokens ?? 400 },
        }),
    })
    if (!res.ok) {
        console.warn(`LLM(gemini) HTTP ${res.status}:`, await res.text().catch(() => ''))
        return null
    }
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

/**
 * 전역 LLM 설정(활성 제공자)으로 텍스트 생성. 실패/미설정 시 null (호출부는 기능을 조용히 생략).
 */
export async function generateText(input: GenerateInput): Promise<string | null> {
    try {
        const cfg = await getLlmConfig()
        if (!cfg?.activeLlmProvider) return null
        const provider = cfg.activeLlmProvider
        const apiKey = keyFor(cfg, provider)
        if (!apiKey) return null

        switch (provider) {
            case 'anthropic':
                return await callMessagesApi('/api/anthropic', apiKey, cfg.anthropicModel || DEFAULT_MODELS.anthropic, input)
            case 'minimax':
                return await callMessagesApi('/api/minimax', apiKey, cfg.minimaxModel || DEFAULT_MODELS.minimax, input)
            case 'openai':
                return await callChatCompletions('https://api.openai.com/v1', apiKey, DEFAULT_MODELS.openai, input)
            case 'deepseek':
                return await callChatCompletions('https://api.deepseek.com', apiKey, DEFAULT_MODELS.deepseek, input)
            case 'gemini':
                return await callGemini(apiKey, DEFAULT_MODELS.gemini, input)
            default:
                return null
        }
    } catch (err) {
        console.warn('generateText failed:', err)
        return null
    }
}
