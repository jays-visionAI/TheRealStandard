import React from 'react'

interface LogoProps {
    className?: string
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <img src="/logo.png" alt="MEATGO" className="h-10 w-auto" />
            <div className="flex flex-col leading-none">
                <span className="text-[#6366F1] font-black text-2xl tracking-tighter">MEATGO</span>
                <span className="text-[10px] font-bold text-gray-400 tracking-[0.3em] uppercase">믿고 쓰는 고기</span>
            </div>
        </div>
    )
}

export const LogoSmall: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-[#6366F1] font-black text-xl tracking-tighter">MEATGO</span>
            <div className="w-[1px] h-3 bg-white/20 mx-1" />
            <span className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">Premium Meat Logistics</span>
        </div>
    )
}
