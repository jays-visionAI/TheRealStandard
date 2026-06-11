import { apiOrigin } from './external/apiBase'

interface TestResult {
    success: boolean
    message: string
}

// Anthropic Messages API 형식 핑 (Anthropic·MiniMax 공용 — Worker 프록시 경유, CORS 처리)
async function pingMessagesApi(proxyPrefix: string, apiKey: string, model: string, label: string): Promise<TestResult> {
    if (!apiKey) return { success: false, message: 'API 키를 입력해주세요.' }
    try {
        const res = await fetch(`${apiOrigin()}${proxyPrefix}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: 'user', content: 'ping' }] }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({} as any))
            throw new Error(err?.error?.message || `Status: ${res.status}`)
        }
        return { success: true, message: `${label} API 연결 성공 (${model})` }
    } catch (error: any) {
        return { success: false, message: `연결 실패: ${error.message}` }
    }
}

export const llmTestService = {
    async testAnthropicConnection(apiKey: string, model = 'claude-haiku-4-5'): Promise<TestResult> {
        return pingMessagesApi('/api/anthropic', apiKey, model, 'Anthropic Claude')
    },

    async testMiniMaxConnection(apiKey: string, model = 'MiniMax-M2'): Promise<TestResult> {
        return pingMessagesApi('/api/minimax', apiKey, model, 'MiniMax')
    },

    async testOpenAIConnection(apiKey: string): Promise<TestResult> {
        if (!apiKey) {
            return { success: false, message: 'API 키를 입력해주세요.' }
        }

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error?.message || `Status: ${response.status}`)
            }

            return { success: true, message: 'OpenAI API 연결 성공' }
        } catch (error: any) {
            return { success: false, message: `연결 실패: ${error.message}` }
        }
    },

    async testGeminiConnection(apiKey: string): Promise<TestResult> {
        if (!apiKey) {
            return { success: false, message: 'API 키를 입력해주세요.' }
        }

        try {
            // Using a simple model list check for Gemini
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error?.message || `Status: ${response.status}`)
            }

            return { success: true, message: 'Gemini API 연결 성공' }
        } catch (error: any) {
            return { success: false, message: `연결 실패: ${error.message}` }
        }
    },

    async testDeepSeekConnection(apiKey: string): Promise<TestResult> {
        if (!apiKey) {
            return { success: false, message: 'API 키를 입력해주세요.' }
        }

        try {
            // DeepSeek is OpenAI compatible
            const response = await fetch('https://api.deepseek.com/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error?.message || `Status: ${response.status}`)
            }

            return { success: true, message: 'DeepSeek API 연결 성공' }
        } catch (error: any) {
            return { success: false, message: `연결 실패: ${error.message}` }
        }
    }
}
