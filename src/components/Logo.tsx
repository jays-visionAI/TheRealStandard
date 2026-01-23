import React from 'react'
import { TRSLogo } from './Icons'

interface LogoProps {
    className?: string
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <TRSLogo size={32} className="w-9 h-9" />
            <div className="flex flex-col leading-none">
                <span className="text-[#6366F1] font-black text-2xl tracking-tighter uppercase">MEATGO</span>
                <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">믿고 쓰는 고기</span>
            </div>
        </div>
    )
}

export const LogoSmall: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <TRSLogo size={24} className="w-7 h-7" />
            <span className="text-white font-black text-xl tracking-tighter uppercase">MEATGO</span>
        </div>
    )
}
