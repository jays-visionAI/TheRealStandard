import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SystemSettings {
    kakaoJsKey: string
    kakaoRestApiKey: string
    kakaoChannelId: string
    companyName: string
    supportEmail: string
    openaiApiKey?: string
    geminiApiKey?: string
    deepseekApiKey?: string
    activeLlmProvider?: 'openai' | 'gemini' | 'deepseek'
}

interface SystemStore {
    settings: SystemSettings
    updateSettings: (data: Partial<SystemSettings>) => void
}

export const useSystemStore = create<SystemStore>()(
    persist(
        (set) => ({
            settings: {
                kakaoJsKey: '673898687a7442cae2d24608c0f5f7f3',
                kakaoRestApiKey: '',
                kakaoChannelId: '_zeXxjG',
                companyName: 'THE REAL STANDARD (TRS)',
                supportEmail: 'admin@trs.co.kr'
            },
            updateSettings: (data) => set((state) => ({
                settings: { ...state.settings, ...data }
            }))
        }),
        {
            name: 'trs-system-storage'
        }
    )
)
