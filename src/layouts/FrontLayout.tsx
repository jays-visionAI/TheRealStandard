import { Outlet } from 'react-router-dom'
import { TRSLogo } from '../components/Icons'
import './FrontLayout.css'

export default function FrontLayout() {
    return (
        <div className="front-layout">
            {/* Header */}
            <header className="front-header">
                <div className="front-logo">
                    <TRSLogo size={36} className="logo-icon" />
                    <div className="logo-text">
                        <span className="logo-title">TRS</span>
                        <span className="logo-subtitle">THE REAL STANDARD</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="front-main">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="front-footer">
                <p>© 2024 TRS Solution. All rights reserved.</p>
                <p className="footer-contact">
                    문의: 02-1234-5678 | help@taeyoon.co.kr
                </p>
            </footer>
        </div>
    )
}
