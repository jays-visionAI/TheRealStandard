import { BookOpenIcon, CheckCircleIcon, AlertTriangleIcon, XIcon } from '../../components/Icons'

const C = {
    text: '#1F2937', muted: '#6B7280', border: '#E5E7EB',
    good: '#047857', goodBg: '#D1FAE5', warn: '#B45309', warnBg: '#FEF3C7', bad: '#DC2626', badBg: '#FEE2E2',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: C.text, marginTop: 0, marginBottom: '14px' }}>{title}</h2>
            {children}
        </section>
    )
}

function Item({ tone, children }: { tone: 'good' | 'warn' | 'bad'; children: React.ReactNode }) {
    const map = { good: { c: C.good, Icon: CheckCircleIcon }, warn: { c: C.warn, Icon: AlertTriangleIcon }, bad: { c: C.bad, Icon: XIcon } }
    const { c, Icon } = map[tone]
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '14px', color: C.text, lineHeight: 1.6 }}>
            <span style={{ color: c, flexShrink: 0, marginTop: '2px' }}><Icon size={16} /></span>
            <span>{children}</span>
        </div>
    )
}

const ACCESS: { menu: string; access: string; tone: 'good' | 'warn' | 'bad' }[] = [
    { menu: '대시보드 / Document Hub', access: '열람 가능', tone: 'good' },
    { menu: '거래문의 (Leads)', access: '열람 + 상태 변경', tone: 'good' },
    { menu: '상품관리 (상품리스트/단가표)', access: '열람 + 단가표 관리', tone: 'good' },
    { menu: '매출발주 / 확정주문(매출)', access: '생성·검토·확정', tone: 'good' },
    { menu: '거래처 수익성 (인사이트)', access: '열람 가능', tone: 'good' },
    { menu: '고객사(구매처) 관리', access: '등록·수정 / "내 거래처만 보기"', tone: 'good' },
    { menu: '물류 · 배송', access: '열람 (배차는 운영/창고)', tone: 'warn' },
    { menu: '매입발주 / 공급사 관리', access: '숨김 (구매 담당 전용)', tone: 'bad' },
    { menu: '정산 / 미수채권', access: '숨김 (회계 전용)', tone: 'bad' },
    { menu: 'Settings (API·차량·문서 등)', access: '숨김 (관리자 전용)', tone: 'bad' },
]

export default function SalesGuide() {
    return (
        <div style={{ padding: '24px', maxWidth: '860px' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: 800, color: C.text, marginBottom: '6px' }}>
                <BookOpenIcon size={22} /> 영업담당(SALES) 운영 가이드
            </h1>
            <p style={{ fontSize: '13px', color: C.muted, marginTop: 0, marginBottom: '20px' }}>
                영업담당자가 본인 권한 안에서 거래처를 관리하고 수주~정산까지 흐름을 이끄는 방법을 안내합니다.
            </p>

            <Section title="✅ 할 수 있는 일">
                <Item tone="good">신규 거래처(고객사) 등록 및 초대장 발송 — 등록한 거래처는 <b>자동으로 "내 거래처"</b>로 표시됩니다.</Item>
                <Item tone="good">매출발주(주문장) 생성 → 검토 → 확정, 확정주문(매출) 관리</Item>
                <Item tone="good">단가표 관리 및 거래처별 단가 안내</Item>
                <Item tone="good">거래문의(Leads) 확인 및 상태 변경(신규→연락함→거래전환)</Item>
                <Item tone="good">거래처 수익성(공헌이익) 확인 후 단가 협상 근거로 활용</Item>
            </Section>

            <Section title="📋 해야 하는 일 (표준 흐름)">
                <Item tone="good">1) 거래문의 인입 → 24시간 내 1차 연락, 상태를 <b>연락함</b>으로 변경</Item>
                <Item tone="good">2) 거래 성사 → 고객사 관리에서 거래처 등록 + 초대장 발송</Item>
                <Item tone="good">3) 주문장 생성 → 거래처 확인 → 검토 후 확정</Item>
                <Item tone="good">4) 출고/배송은 물류·창고팀에 인계 (배차는 운영 영역)</Item>
                <Item tone="good">5) 월말 거래처 수익성 점검 → 저마진(CM 5% 미만) 거래처 단가 재협상</Item>
            </Section>

            <Section title="⚠ 주의 / 금지 사항">
                <Item tone="warn">매입가(원가)·공급사 단가는 구매팀 영역 — 임의 변경 금지</Item>
                <Item tone="warn">정산·수금 처리는 회계팀 영역 — 영업은 수익성 열람만</Item>
                <Item tone="bad">매입발주(공급사 발주)는 영업 권한 밖이며 메뉴에 노출되지 않습니다.</Item>
                <Item tone="bad">시스템 설정(API 키·차량·문서 분류)은 관리자 전용입니다.</Item>
            </Section>

            <Section title="🔑 메뉴별 권한 범위">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: 700 }}>메뉴</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: 700 }}>접근</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ACCESS.map(r => {
                                const bg = r.tone === 'good' ? C.goodBg : r.tone === 'warn' ? C.warnBg : C.badBg
                                const fg = r.tone === 'good' ? C.good : r.tone === 'warn' ? C.warn : C.bad
                                return (
                                    <tr key={r.menu}>
                                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', color: C.text }}>{r.menu}</td>
                                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }}>
                                            <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>{r.access}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="💡 '내 거래처만 보기' 활용">
                <Item tone="good">고객사 관리 화면 우상단 체크박스로 켜고 끌 수 있습니다. (SALES는 기본 ON)</Item>
                <Item tone="good">본인이 등록한 거래처만 모아 보여, 담당 거래처에 영업 자원을 집중할 수 있습니다.</Item>
                <Item tone="warn">가이드 도입(Phase 2.3) 이전에 등록된 거래처는 작성자 정보가 없어 "내 거래처"에 잡히지 않을 수 있습니다 — 필요 시 체크 해제 후 전체에서 확인하세요.</Item>
            </Section>
        </div>
    )
}
