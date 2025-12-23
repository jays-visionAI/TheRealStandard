import React, { useEffect } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    footer?: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md'
}: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEsc)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizeClasses = {
        sm: 'max-w-[400px]',
        md: 'max-w-[560px]',
        lg: 'max-w-[800px]'
    }

    return (
        <div className="modal-backdrop" onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
        }}>
            <div className={`modal ${sizeClasses[size]}`} role="dialog" aria-modal="true">
                <div className="modal-header">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">{title}</h3>
                        <button
                            className="btn btn-ghost p-2"
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="modal-body">
                    {children}
                </div>

                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
