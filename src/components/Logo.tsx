import React from 'react'

interface LogoProps {
    className?: string
}

export const MeatIcon: React.FC<LogoProps> = ({ className }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17 13H7V11H17V13Z" fill="currentColor" />
    </svg>
)

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <MeatIcon className="text-[#6366F1] w-8 h-8" />
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
            <MeatIcon className="text-[#6366F1] w-6 h-6" />
            <span className="text-white font-black text-xl tracking-tighter uppercase">MEATGO</span>
        </div>
    )
}
