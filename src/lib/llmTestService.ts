
interface TestResult {
    success: boolean
    message: string
}

export const llmTestService = {
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
