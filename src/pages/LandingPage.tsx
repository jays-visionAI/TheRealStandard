import { useNavigate } from 'react-router-dom'
import {
    ChartIcon,
    TrashIcon,
    AlertTriangleIcon,
    PackageIcon,
    SearchIcon,
    CheckIcon,
    KakaoIcon,
    LogOutIcon
} from '../components/Icons'
import { LogoSmall, Logo } from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { kakaoLogin } from '../lib/kakaoService'
import { getDefaultPathForRole } from '../components/ProtectedRoute'
import './LandingPage.css'

export default function LandingPage() {
    const navigate = useNavigate()
    const { user, loading, logout, loginWithKakao } = useAuth()

    const handleLogout = async () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            await logout()
            window.location.reload()
        }
    }

    const handleKakaoLogin = async () => {
        console.log('Kakao Login button clicked')
        try {
            const result = await kakaoLogin()
            const loggedInUser = await loginWithKakao(result.user)
            navigate(getDefaultPathForRole(loggedInUser.role))
        } catch (error) {
            console.error('Kakao login failed:', error)
            alert('카카오 로그인에 실패했습니다. 다시 시도해 주세요.')
        }
    }

    const handleNavigateLogin = () => {
        console.log('Navigating to Login page...')
        navigate('/login')
    }

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <div className="landing-page">
            {/* Navbar */}
            <header className="lp-header">
                <div className="container header-inner">
                    <div className="lp-logo">
                        <LogoSmall />
                    </div>
                    <nav className="lp-nav">
                        <ul>
                            <li><a href="#problems" onClick={(e) => { e.preventDefault(); scrollToSection('problems') }}>Problems</a></li>
                            <li><a href="#solution" onClick={(e) => { e.preventDefault(); scrollToSection('solution') }}>Solution</a></li>
                            <li><a href="#technology" onClick={(e) => { e.preventDefault(); scrollToSection('technology') }}>Technology</a></li>
                        </ul>
                    </nav>
                    <div className="flex gap-4 items-center min-w-[300px] justify-end">
                        {!loading && (
                            user ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-500 font-medium hidden md:inline">
                                        {user.name} ({user.role})
                                    </span>
                                    <button className="btn btn-secondary flex items-center gap-2" onClick={handleLogout}>
                                        <LogOutIcon size={16} /> Logout
                                    </button>
                                    <button className="btn btn-primary" onClick={() => navigate(getDefaultPathForRole(user.role))}>Dashboard</button>
                                </div>
                            ) : (
                                <>
                                    <button className="btn btn-secondary" onClick={handleNavigateLogin}>Login</button>
                                    <button className="btn btn-kakao flex items-center gap-2" onClick={handleKakaoLogin}>
                                        <KakaoIcon size={18} /> 카카오 로그인
                                    </button>
                                </>
                            )
                        )}
                        {loading && <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="container">
                    <div className="animate-fade-in-up">
                        <div className="hero-capsule">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Industrial Operating System v1.0
                        </div>
                        <h1 className="hero-title">
                            Meat Intelligence <br />
                            <span className="gradient-text">Operating System</span>
                        </h1>
                        <p className="hero-desc">
                            데이터로 육류 밸류체인의 마진 구조를 혁신합니다.<br />
                            수요 예측부터 재고 배분, 발주 실행까지. 완전히 새로운 산업 표준.
                        </p>
                        <div className="hero-cta-group flex-wrap">
                            <button className="btn btn-accent h-12 px-8 text-lg" onClick={() => scrollToSection('contact')}>도입 문의하기</button>
                            <button className="btn btn-secondary h-12 px-8 text-lg" onClick={() => scrollToSection('technology')}>기술 로드맵</button>
                            {!loading && (
                                user ? (
                                    <div className="flex gap-4 w-full md:w-auto">
                                        <button className="btn btn-primary h-12 px-8 text-lg flex-1 md:flex-none" onClick={() => navigate(getDefaultPathForRole(user.role))}>대시보드로 이동</button>
                                        <button className="btn btn-secondary h-12 px-8 text-lg flex-1 md:flex-none flex items-center gap-2" onClick={handleLogout}>
                                            <LogOutIcon size={20} /> 로그아웃
                                        </button>
                                    </div>
                                ) : (
                                    <button className="btn btn-kakao h-12 px-8 text-lg flex items-center gap-2 justify-center" onClick={handleKakaoLogin}>
                                        <KakaoIcon size={20} /> 카카오로 시작하기
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    <div className="trust-stats">
                        <div>
                            <div className="stat-num blue-gradient-text">12%</div>
                            <div className="stat-label">품절률 감소</div>
                        </div>
                        <div>
                            <div className="stat-num blue-gradient-text">-8%</div>
                            <div className="stat-label">폐기 손실 절감</div>
                        </div>
                        <div>
                            <div className="stat-num blue-gradient-text">15%</div>
                            <div className="stat-label">수율 편차 개선</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section (Bento Grid) */}
            <section id="problems" className="relative z-10">
                <div className="container">
                    <div className="text-center mb-16 animate-fade-in-up">
                        <div className="inline-block px-3 py-1 mb-4 text-xs font-bold text-blue-600 bg-blue-50 rounded-full tracking-wider">
                            PROBLEM DEFINITION
                        </div>
                        <h2 className="mb-4 text-4xl font-bold text-slate-800">
                            Supply Chain <span className="text-blue-600">Inefficiencies</span>
                        </h2>
                        <p className="max-w-2xl mx-auto text-slate-500 text-lg">
                            데이터 부재로 반복되는 5가지 구조적 문제점.<br />
                            이러한 비효율은 기업의 성장 잠재력을 갉아먹습니다.
                        </p>
                    </div>

                    <div className="bento-grid">
                        <div className="bento-row-top">
                            <div className="bento-card bento-card-lg">
                                <div className="flex justify-between items-start">
                                    <div className="bento-icon-wrapper">
                                        <ChartIcon size={24} />
                                    </div>
                                    <span className="badge-blue">Critical Impact</span>
                                </div>
                                <h3 className="bento-title">수요예측의 한계</h3>
                                <p className="bento-desc">
                                    경험과 감에 의존하는 발주로 인해 반복적인 과잉 재고와 품절이 발생합니다.
                                    데이터 기반의 예측 모델 부재가 가장 큰 원인입니다.
                                </p>
                                <div className="graph-container">
                                    <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none">
                                        <path d="M0 100 C 50 100, 80 20, 150 20 S 250 80, 400 40"
                                            fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                                        <path d="M0 100 C 50 100, 80 20, 150 20 S 250 80, 400 40 V 120 H 0 Z"
                                            fill="url(#fadeBlue)" opacity="0.1" />
                                        <path d="M0 110 Q 50 105 100 110 T 200 108 T 300 112 T 400 110"
                                            fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
                                        <defs>
                                            <linearGradient id="fadeBlue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3B82F6" />
                                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="flex gap-4 mt-2 text-xs text-slate-400 font-medium">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 실제 재고 (Fluctuation)</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> 예측 수요 (Miss)</span>
                                    </div>
                                </div>
                                <div className="card-footer">Detail View →</div>
                            </div>

                            <div className="bento-card bento-card-lg">
                                <div className="bento-icon-wrapper bg-red-50 text-red-500">
                                    <AlertTriangleIcon size={24} />
                                </div>
                                <h3 className="bento-title">마진 누수</h3>
                                <p className="bento-desc">
                                    중간 유통 단계마다 불필요하게 쌓이는 비효율 비용이 전체 마진율을 심각하게 저해하고 있습니다.
                                </p>
                                <div className="badge-red">
                                    <AlertTriangleIcon size={14} /> 누적 손실 발생 중
                                </div>
                                <div className="card-footer">Detail View →</div>
                            </div>
                        </div>

                        <div className="bento-card">
                            <div className="bento-icon-wrapper">
                                <SearchIcon size={24} />
                            </div>
                            <h3 className="bento-title">재고 불균형</h3>
                            <p className="bento-desc">
                                실시간으로 파악되지 않는 "깜깜이" 재고 현황으로 인해 지점 간 재고 이동이나 적시 대응이 불가능합니다.
                            </p>
                            <div className="card-footer">Detail View →</div>
                        </div>

                        <div className="bento-card">
                            <div className="bento-icon-wrapper">
                                <PackageIcon size={24} />
                            </div>
                            <h3 className="bento-title">수기 운영의 한계</h3>
                            <p className="bento-desc">
                                엑셀과 전화, 카톡으로 처리되는 아날로그 방식은 업무 속도를 늦추고 필연적인 휴먼 에러를 유발합니다.
                            </p>
                            <div className="ops-badges">
                                <span className="ops-badge text-green-700 bg-green-50">Excel</span>
                                <span className="ops-badge">📞 전화</span>
                                <span className="ops-badge text-yellow-700 bg-yellow-50">📱 카톡</span>
                            </div>
                            <div className="card-footer">Detail View →</div>
                        </div>

                        <div className="bento-card">
                            <div className="bento-icon-wrapper text-slate-500 bg-slate-100">
                                <TrashIcon size={24} />
                            </div>
                            <h3 className="bento-title">폐기 손실</h3>
                            <p className="bento-desc">
                                신선도 관리 실패로 버려지는 재고 가치는 단순한 비용 손실을 넘어 브랜드 이미지에도 타격을 줍니다.
                            </p>
                            <div className="card-footer">Detail View →</div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="solution">
                <div className="container">
                    <h2 className="mb-16 text-center text-4xl font-bold">How TRS Works</h2>
                    <div className="process-row">
                        <div className="process-line"></div>
                        <div className="process-step">
                            <div className="step-marker active">01</div>
                            <div>
                                <h3 className="mb-2 text-white">Data Collection</h3>
                                <p className="text-sm">전체 공급망 데이터 표준화 및 실시간 수집</p>
                            </div>
                        </div>
                        <div className="process-step">
                            <div className="step-marker">02</div>
                            <div>
                                <h3 className="mb-2 text-white">Optimization</h3>
                                <p className="text-sm">AI 엔진 기반 수요 예측 및 물량 배분 최적화</p>
                            </div>
                        </div>
                        <div className="process-step">
                            <div className="step-marker">03</div>
                            <div>
                                <h3 className="mb-2 text-white">Execution</h3>
                                <p className="text-sm">발주, 정산, 운영 프로세스 시스템 자동 실행</p>
                            </div>
                        </div>
                        <div className="process-step">
                            <div className="step-marker">04</div>
                            <div>
                                <h3 className="mb-2 text-white">Compounding</h3>
                                <p className="text-sm">절감 비용 재투자를 통한 복리 성장 구조 확립</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="technology">
                <div className="container">
                    <div className="mios-split">
                        <div>
                            <div className="hero-capsule mb-6">Meat Intelligence OS</div>
                            <h2 className="mb-6 text-4xl font-bold">Decision Controls</h2>
                            <p className="mb-8 text-lg">
                                복잡한 육류 비즈니스의 핵심 의사결정을<br />
                                데이터 기반 알고리즘으로 제어합니다.
                            </p>
                            <div className="space-y-4">
                                {['Production (생산량)', 'Allocation (배분)', 'Pricing (가격)', 'Restock (재구매)'].map((item) => (
                                    <div key={item} className="flex items-center gap-3">
                                        <div className="text-blue-500"><CheckIcon size={20} /></div>
                                        <span className="text-gray-300">{item} Optimization</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mios-visual">
                            <div className="flex gap-2 mb-6">
                                <div className="w-3 h-3 rounded-full bg-red-500 opacity-50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500 opacity-50"></div>
                            </div>
                            <div className="mios-code">
                                <div className="code-line"><span className="line-num">01</span><span className="text-purple-400">const</span> <span className="text-yellow-200">optimizeSupplyChain</span> = <span className="text-blue-300">async</span> () ={'>'} {'{'}</div>
                                <div className="code-line"><span className="line-num">02</span>  <span className="text-purple-400">const</span> demand = <span className="text-blue-300">await</span> ai.predict(<span className="text-green-300">'Q4_2025'</span>)</div>
                                <div className="code-line"><span className="line-num">03</span>  </div>
                                <div className="code-line"><span className="line-num">04</span>  <span className="text-gray-500">// Calculate optimal allocation</span></div>
                                <div className="code-line"><span className="line-num">05</span>  <span className="text-purple-400">return</span> inventory.distribute({'{'}</div>
                                <div className="code-line"><span className="line-num">06</span>    target: <span className="text-green-300">'WAREHOUSE_A'</span>,</div>
                                <div className="code-line"><span className="line-num">07</span>    amount: <span className="token-val">12500</span>, <span className="text-gray-500">// kg</span></div>
                                <div className="code-line"><span className="line-num">08</span>    efficiency: <span className="token-val">98.5</span> <span className="text-gray-500">// %</span></div>
                                <div className="code-line"><span className="line-num">09</span>  {'}'})</div>
                                <div className="code-line"><span className="line-num">10</span>{'}'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="lp-footer">
                <div className="container">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-center md:text-left">
                            <Logo className="mb-2" />
                            <p className="text-sm text-gray-500">Meat Intelligence Operating System</p>
                        </div>
                        <div className="flex gap-8 text-sm text-gray-400">
                            <a href="#" className="hover:text-white">Privacy</a>
                            <a href="#" className="hover:text-white">Terms</a>
                            <a href="#" className="hover:text-white">Contact</a>
                        </div>
                        <div className="text-sm text-gray-600">
                            © 2024 TRS Inc.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
