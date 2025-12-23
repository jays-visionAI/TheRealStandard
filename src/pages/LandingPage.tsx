import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ChartIcon,
    NetworkIcon,
    RefreshCwIcon,
    TrashIcon,
    AlertTriangleIcon,
    PackageIcon,
    SearchIcon,
    TruckDeliveryIcon
} from '../components/Icons'
import './LandingPage.css'

export default function LandingPage() {
    const navigate = useNavigate()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <div className="landing-page">
            {/* Header */}
            <header className={`lp-header ${scrolled ? 'scrolled' : ''}`}>
                <div className="container header-content">
                    <div className="lp-logo">TRS</div>

                    <nav className="lp-nav">
                        <ul>
                            <li><a href="#problem" onClick={(e) => { e.preventDefault(); scrollToSection('problem'); }}>문제</a></li>
                            <li><a href="#solution" onClick={(e) => { e.preventDefault(); scrollToSection('solution'); }}>솔루션</a></li>
                            <li><a href="#mios" onClick={(e) => { e.preventDefault(); scrollToSection('mios'); }}>MIOS</a></li>
                            <li><a href="#roadmap" onClick={(e) => { e.preventDefault(); scrollToSection('roadmap'); }}>로드맵</a></li>
                        </ul>
                    </nav>

                    <button className="lp-btn lp-btn-primary" onClick={() => navigate('/login')}>
                        시스템 접속
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="container hero-content">
                    <div className="hero-text animate-fade-in">
                        <h1>Meat Intelligence OS로<br />육류 밸류체인의<br /><span className="gradient-text">마진 구조를 바꿉니다.</span></h1>
                        <p className="sub-text">
                            수요–가공–배분–발주를 데이터로 연결해<br />
                            폐기·품절·수율 편차를 줄이는 산업 OS 기반 기업
                        </p>

                        <div className="hero-actions">
                            <button className="lp-btn lp-btn-primary" onClick={() => scrollToSection('contact')}>문의하기</button>
                            <button className="lp-btn lp-btn-secondary" onClick={() => scrollToSection('roadmap')}>로드맵 보기</button>
                        </div>

                        <div className="trust-indicators">
                            <div className="trust-item"><strong>12%↓</strong> 품절률 감소</div>
                            <div className="trust-item"><strong>8%↓</strong> 폐기율 감소</div>
                            <div className="trust-item"><strong>15%↓</strong> 수율 편차 감소</div>
                        </div>
                    </div>

                    <div className="hero-visual animate-slide-in">
                        <div className="lp-card os-diagram">
                            {/* SVG Flow Diagram */}
                            <svg width="100%" height="100%" viewBox="0 0 600 400" className="os-flow">
                                {/* Connecting Lines */}
                                <path d="M150 200 L 300 200" className="flow-line" />
                                <path d="M300 200 L 450 200" className="flow-line" style={{ animationDelay: '0.5s' }} />

                                {/* Node 1: Data */}
                                <g className="flow-node" transform="translate(50, 160)">
                                    <rect width="100" height="80" rx="12" />
                                    <text x="50" y="45" textAnchor="middle" fill="#fff" fontWeight="bold">Data</text>
                                    <text x="50" y="65" textAnchor="middle" fill="#8B949E" fontSize="12">Standardized</text>
                                </g>

                                {/* Node 2: Optimization */}
                                <g className="flow-node" transform="translate(250, 160)">
                                    <rect width="100" height="80" rx="12" />
                                    <text x="50" y="45" textAnchor="middle" fill="#fff" fontWeight="bold">Optimization</text>
                                    <text x="50" y="65" textAnchor="middle" fill="#8B949E" fontSize="12">AI Engine</text>
                                </g>

                                {/* Node 3: Execution */}
                                <g className="flow-node" transform="translate(450, 160)">
                                    <rect width="100" height="80" rx="12" />
                                    <text x="50" y="45" textAnchor="middle" fill="#fff" fontWeight="bold">Execution</text>
                                    <text x="50" y="65" textAnchor="middle" fill="#8B949E" fontSize="12">Auto Ops</text>
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section id="problem" className="bg-secondary">
                <div className="container">
                    <div className="section-header">
                        <h2>왜 육류 공급망은 여전히 비효율적인가?</h2>
                        <p className="text-secondary">데이터 없이 반복되는 5가지 구조적 문제</p>
                    </div>

                    <div className="problem-grid">
                        <div className="lp-card problem-card">
                            <div className="problem-icon"><ChartIcon /></div>
                            <h3>수요예측의 한계</h3>
                            <p className="text-secondary">경험과 감에 의존하는 발주, 반복되는 과잉/품절로 인한 기회 비용 손실</p>
                        </div>

                        <div className="lp-card problem-card">
                            <div className="problem-icon"><SearchIcon /></div>
                            <h3>재고 불균형</h3>
                            <p className="text-secondary">어디에 얼마나 있는지 모르는 실시간 현황, 보이지 않는 재고들</p>
                        </div>

                        <div className="lp-card problem-card">
                            <div className="problem-icon"><AlertTriangleIcon /></div>
                            <h3>마진 누수</h3>
                            <p className="text-secondary">중간 유통 단계마다 쌓이는 비효율 비용과 불필요한 마진 구조</p>
                        </div>

                        <div className="lp-card problem-card">
                            <div className="problem-icon"><PackageIcon /></div>
                            <h3>수기 운영</h3>
                            <p className="text-secondary">엑셀과 전화로 처리되는 발주/정산/운영의 휴먼 에러</p>
                        </div>

                        <div className="lp-card problem-card">
                            <div className="problem-icon"><TrashIcon /></div>
                            <h3>폐기 손실</h3>
                            <p className="text-secondary">신선도 관리 실패로 사라지는 재고 가치와 환경 비용</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solution Section */}
            <section id="solution">
                <div className="container">
                    <div className="section-header">
                        <h2>TRS가 하는 일</h2>
                    </div>

                    <div className="process-steps">
                        <div className="step-card">
                            <div className="step-num">1</div>
                            <div className="step-line"></div>
                            <h3>수집</h3>
                            <p className="text-secondary mt-2">공급망 전체 데이터를 표준화하여 수집</p>
                        </div>

                        <div className="step-card">
                            <div className="step-num">2</div>
                            <div className="step-line"></div>
                            <h3>최적화</h3>
                            <p className="text-secondary mt-2">수요, 배분, 가격을 AI 기반으로 자동 최적화</p>
                        </div>

                        <div className="step-card">
                            <div className="step-num">3</div>
                            <div className="step-line"></div>
                            <h3>실행</h3>
                            <p className="text-secondary mt-2">발주, 정산, 운영을 시스템으로 자동 실행</p>
                        </div>

                        <div className="step-card">
                            <div className="step-num">4</div>
                            <h3>복리화</h3>
                            <p className="text-secondary mt-2">절감된 비용을 재투자하여 복리 성장 구조 확립</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* MIOS Section */}
            <section id="mios" className="bg-secondary">
                <div className="container">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="mb-6">MIOS<br /><span className="text-secondary font-normal">Meat Intelligence Operating System</span></h2>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="text-accent mt-1"><NetworkIcon /></div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">표준 데이터 레이어</h4>
                                        <p className="text-secondary">통합 공급망 데이터를 실시간으로 동기화하고 표준화합니다.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="text-accent mt-1"><RefreshCwIcon /></div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">최적화 엔진</h4>
                                        <p className="text-secondary">AI가 수요, 물량 배분, 신선도를 분석해 최적의 의사결정을 제안합니다.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="text-accent mt-1"><TruckDeliveryIcon /></div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">실행 자동화</h4>
                                        <p className="text-secondary">복잡한 발주, 정산, 운영 프로세스를 원클릭으로 처리합니다.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="lp-card border-accent bg-opacity-50">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                                <span className="text-sm font-mono text-accent">Decision Controls</span>
                                <span className="flex gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500 opacity-50"></span>
                                    <span className="w-3 h-3 rounded-full bg-yellow-500 opacity-50"></span>
                                    <span className="w-3 h-3 rounded-full bg-green-500 opacity-50"></span>
                                </span>
                            </div>
                            <ul className="space-y-4 font-mono text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="text-accent">▸</span>
                                    <span>Production Decisions (생산량)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-accent">▸</span>
                                    <span>Allocation Decisions (배분)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-accent">▸</span>
                                    <span>Pricing Decisions (가격/마크다운)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-accent">▸</span>
                                    <span>Reorder Decisions (리오더)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-accent">▸</span>
                                    <span>Repurchase Decisions (재구매)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roadmap Section */}
            <section id="roadmap">
                <div className="container">
                    <div className="section-header">
                        <h2>로드맵</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <div className="lp-card">
                            <div className="text-accent font-bold mb-2">Q1 '25</div>
                            <h4 className="font-bold mb-2">수발주 MVP 런칭</h4>
                            <p className="text-sm text-secondary">B2B 주문-배차-정산 자동화 시스템 구축</p>
                        </div>
                        <div className="lp-card">
                            <div className="text-accent font-bold mb-2">Q2 '25</div>
                            <h4 className="font-bold mb-2">최적화 엔진 v1</h4>
                            <p className="text-sm text-secondary">수요 예측 데이터 축적 및 재고 배분 알고리즘</p>
                        </div>
                        <div className="lp-card">
                            <div className="text-accent font-bold mb-2">Q3 '25</div>
                            <h4 className="font-bold mb-2">통합 MIOS v1</h4>
                            <p className="text-sm text-secondary">데이터-최적화-실행이 통합된 완전체 플랫폼</p>
                        </div>
                        <div className="lp-card">
                            <div className="text-accent font-bold mb-2">Q4 '25</div>
                            <h4 className="font-bold mb-2">파트너 확장</h4>
                            <p className="text-sm text-secondary">공급망 주요 파트너사 네트워크 확대</p>
                        </div>
                    </div>

                    <div className="lp-card bg-secondary text-center">
                        <h3>3-5년 비전</h3>
                        <div className="flex flex-wrap justify-center gap-8 mt-4 text-secondary">
                            <span>• 육류 공급망 데이터 플랫폼 No.1</span>
                            <span>• B2B 육류 거래의 표준 인프라</span>
                            <span>• 아시아 시장 확장</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="bg-secondary">
                <div className="container max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <h2>TRS와 논의가<br />필요하신가요?</h2>
                            <p className="text-secondary mt-4 mb-8">
                                육류 공급망 최적화, 데이터 기반 운영,<br />
                                MIOS 도입에 대해 이야기 나눠보세요.
                            </p>
                            <div className="text-secondary">
                                <p className="mb-2"><strong>Email</strong> contact@the-real-standard.com</p>
                                <p><strong>Tel</strong> 02-1234-5678</p>
                            </div>
                        </div>

                        <div className="lp-card bg-white bg-opacity-5">
                            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                <div>
                                    <label className="block text-sm text-secondary mb-1">회사명</label>
                                    <input type="text" className="w-full bg-black bg-opacity-20 border border-gray-700 rounded p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-secondary mb-1">담당자</label>
                                    <input type="text" className="w-full bg-black bg-opacity-20 border border-gray-700 rounded p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-secondary mb-1">이메일</label>
                                    <input type="email" className="w-full bg-black bg-opacity-20 border border-gray-700 rounded p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-secondary mb-1">문의 내용</label>
                                    <textarea rows={3} className="w-full bg-black bg-opacity-20 border border-gray-700 rounded p-2 text-white"></textarea>
                                </div>
                                <button className="lp-btn lp-btn-primary w-full">보내기</button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="lp-footer">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <h4>THE REAL STANDARD</h4>
                            <p className="text-secondary text-sm">
                                Meat Intelligence Operating System<br />
                                데이터로 육류 산업의 기준을 만듭니다.
                            </p>
                        </div>
                        <div className="footer-col">
                            <h5>회사</h5>
                            <ul>
                                <li><a href="#">회사 소개</a></li>
                                <li><a href="#">채용</a></li>
                                <li><a href="#">뉴스</a></li>
                            </ul>
                        </div>
                        <div className="footer-col">
                            <h5>제품</h5>
                            <ul>
                                <li><a href="#mios">MIOS</a></li>
                                <li><a href="#" onClick={() => navigate('/login')}>수발주시스템</a></li>
                                <li><a href="#roadmap">로드맵</a></li>
                            </ul>
                        </div>
                        <div className="footer-col">
                            <h5>지원</h5>
                            <ul>
                                <li><a href="#contact">문의하기</a></li>
                                <li><a href="#">FAQ</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-800 text-center text-sm text-muted">
                        &copy; 2024 The Real Standard. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
