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
    // 외부 데이터 API 키
    datagoKey?: string
    kamisKey?: string
    kamisId?: string
    naverClientId?: string
    naverClientSecret?: string
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
                companyName: 'MEATGO (믿고)',
                supportEmail: 'admin@meatgo.kr',
                datagoKey: '',
                kamisKey: '',
                kamisId: '',
                naverClientId: '',
                naverClientSecret: '',
            },
            updateSettings: (data) => set((state) => ({
                settings: { ...state.settings, ...data }
            }))
        }),
        {
            name: 'meatgo-system-storage'
        }
    )
)

/**
 * store에서 API 키를 가져오는 헬퍼.
 * store 값이 있으면 우선 사용, 없으면 env 변수 fallback.
 */
export function getApiKey(key: 'datagoKey' | 'kamisKey' | 'kamisId' | 'naverClientId' | 'naverClientSecret'): string {
    const store = useSystemStore.getState().settings
    const envMap: Record<string, string> = {
        datagoKey: import.meta.env.VITE_DATAGO_KEY || '',
        kamisKey: import.meta.env.VITE_KAMIS_KEY || '',
        kamisId: import.meta.env.VITE_KAMIS_ID || '',
        naverClientId: import.meta.env.VITE_NAVER_CLIENT_ID || '',
        naverClientSecret: import.meta.env.VITE_NAVER_CLIENT_SECRET || '',
    }
    return (store[key] && store[key]!.trim()) ? store[key]! : envMap[key]
}

