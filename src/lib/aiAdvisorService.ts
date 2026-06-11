import { generateText } from './llmService'
import type { CustomerInsight } from './customerInsightService'

// ============ AI ADVISOR — 룰 기반 인사이트의 자연어 해설 레이어 (v2) ============
// 어드민이 LLM 설정(전역)에 활성 제공자+키를 저장하면 동작. 미설정/실패 시 null → 기능 조용히 생략.
// 시스템 프롬프트는 고정 텍스트(프롬프트 캐싱 친화), 수치 창작 금지·과장 금지를 명시.

const SYSTEM = `당신은 한국 B2B 육류유통 플랫폼 MeatGo의 데이터 분석 비서입니다.
룰 엔진이 계산한 인사이트 카드 목록을 받아, 식당 사장님에게 들려주듯 따뜻하고 실용적인 한국어 요약을 작성합니다.
규칙:
- 2~3문장, 200자 이내.
- 카드에 없는 수치나 사실을 만들어내지 않습니다. 과장 금지.
- 가장 중요한 행동 1가지를 권합니다(예: 재주문, 정산 확인).
- 존댓말, 핵심부터.`

export async function summarizeInsights(
    mode: 'PERSONAL' | 'COHORT',
    insights: CustomerInsight[]
): Promise<string | null> {
    if (insights.length === 0) return null
    const lines = insights.slice(0, 8)
        .map(i => `- [${i.title}] ${i.body}${i.metric ? ` (${i.metric})` : ''}`)
        .join('\n')
    const prompt = `모드: ${mode === 'PERSONAL' ? '고객 본인 주문 데이터 기반' : '플랫폼 평균 데이터 기반(주문 이력 없음)'}\n인사이트 카드:\n${lines}\n\n위 내용을 요약해 주세요.`
    return generateText({ system: SYSTEM, prompt, maxTokens: 300 })
}
