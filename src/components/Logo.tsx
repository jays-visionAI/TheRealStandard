import React from 'react'

interface LogoProps {
    className?: string
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`flex items-center ${className}`}>
            <svg width="180" height="48" viewBox="0 0 180 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* TRS Text */}
                <text x="50%" y="28" textAnchor="middle" fill="#C63024" style={{ font: '900 32px Inter, sans-serif', letterSpacing: '-0.05em' }}>TRS</text>

                {/* Horizontal Line with Gradient */}
                <defs>
                    <linearGradient id="logoLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#C63024" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                <rect x="20" y="34" width="140" height="2" fill="url(#logoLineGradient)" />

                {/* THE REAL STANDARD Text */}
                <text x="50%" y="44" textAnchor="middle" fill="#A1A1AA" style={{ font: '600 8px Inter, sans-serif', letterSpacing: '0.4em', textTransform: 'uppercase' }}>THE REAL STANDARD</text>
            </svg>
        </div>
    )
}

export const LogoSmall: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-[#C63024] font-black text-xl tracking-tighter">TRS</span>
            <div className="w-[1px] h-3 bg-white/20 mx-1" />
            <span className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">The Real Standard</span>
        </div>
    )
}
