import React from 'react'

interface LogoProps {
    className?: string
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`flex items-baseline leading-none select-none ${className}`}>
            <span className="text-3xl font-black tracking-tighter text-slate-900">MEAT</span>
            <span className="text-3xl font-black tracking-tighter text-red-600">G</span>
            <span className="text-3xl font-black tracking-tighter text-slate-900">O</span>
            <span className="ml-2 text-lg font-bold text-slate-600 mb-0.5">믿고</span>
        </div>
    )
}

export const LogoSmall: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`flex items-baseline leading-none select-none ${className}`}>
            <span className="text-xl font-black tracking-tighter text-white">MEAT</span>
            <span className="text-xl font-black tracking-tighter text-red-500">G</span>
            <span className="text-xl font-black tracking-tighter text-white">O</span>
        </div>
    )
}
