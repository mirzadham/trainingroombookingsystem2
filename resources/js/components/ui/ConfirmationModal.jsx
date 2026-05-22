import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Button from './Button';

const variantConfig = {
    danger: {
        icon: AlertTriangle,
        iconClass: 'text-red-650',
        badgeBg: 'bg-red-50 border-red-100',
        btnVariant: 'danger',
    },
    success: {
        icon: CheckCircle,
        iconClass: 'text-emerald-650',
        badgeBg: 'bg-emerald-50 border-emerald-100',
        btnVariant: 'primary', // Will use standard primary emerald/pink gradient or can override
    },
    warning: {
        icon: AlertCircle,
        iconClass: 'text-amber-650',
        badgeBg: 'bg-amber-50 border-amber-100',
        btnVariant: 'primary',
    },
    info: {
        icon: Info,
        iconClass: 'text-blue-650',
        badgeBg: 'bg-blue-50 border-blue-100',
        btnVariant: 'primary',
    },
};

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
    isLoading = false,
    onConfirm,
    onClose,
}) {
    const backdropRef = useRef(null);

    // Escape key handling
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    const config = variantConfig[variant] || variantConfig.info;
    const Icon = config.icon;

    const handleBackdropClick = (e) => {
        if (e.target === backdropRef.current && !isLoading) {
            onClose();
        }
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200/50 overflow-hidden p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col items-center text-center">
                {/* Close Button */}
                {!isLoading && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer border-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* Variant Header Icon Badge */}
                <div className={`p-3 rounded-2xl border ${config.badgeBg} mb-4 mt-2 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${config.iconClass}`} />
                </div>

                {/* Content Title */}
                <h3 className="text-lg font-extrabold text-slate-900 leading-snug tracking-tight mb-2">
                    {title}
                </h3>

                {/* Content Message */}
                <p className="text-sm text-slate-500 font-medium leading-relaxed px-2 mb-6">
                    {message}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 text-sm font-semibold rounded-xl border border-slate-200"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        variant={config.btnVariant}
                        onClick={onConfirm}
                        loading={isLoading}
                        disabled={isLoading}
                        className={`flex-1 py-3 text-sm font-semibold rounded-xl ${
                            variant === 'success'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-0'
                                : ''
                        }`}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
