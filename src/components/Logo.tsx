import React from 'react'

interface LogoProps {
    className?: string
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`flex items-baseline leading-none select-none ${className}`}>
            <span className="text-3xl font-black tracking-tighter text-[#002B5B]">MEAT</span>
            <span className="text-3xl font-black tracking-tighter text-red-600">G</span>
            <span className="text-3xl font-black tracking-tighter text-[#002B5B]">O</span>
            <span className="ml-2 text-lg font-bold text-slate-500 mb-0.5 tracking-widest">믿고</span>
        </div>
    )
}

export const LogoSmall: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`flex items-center justify-center bg-white rounded-md px-2 py-1 shadow-sm ${className}`}>
            <div className="flex items-baseline leading-none select-none">
                <span className="text-xl font-black tracking-tighter text-[#002B5B]">MEAT</span>
                <span className="text-xl font-black tracking-tighter text-red-600">G</span>
                <span className="text-xl font-black tracking-tighter text-[#002B5B]">O</span>
            </div>
        </div>
    )
}
