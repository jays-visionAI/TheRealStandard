import React from 'react'

interface LogoProps {
    className?: string
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <img src="/logo_trust.png" alt="MeatGo Logo" className="h-10 w-auto object-contain" />
            <div className="flex flex-col leading-none">
                <span className="text-[#0f172a] font-black text-2xl tracking-tighter uppercase">MEATGO</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">믿고 쓰는 고기</span>
            </div>
        </div>
    )
}

export const LogoSmall: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <img src="/logo_trust.png" alt="MeatGo Logo" className="h-8 w-auto object-contain bg-white rounded-md p-0.5" />
            <span className="text-white font-black text-xl tracking-tighter uppercase">MEATGO</span>
        </div>
    )
}
