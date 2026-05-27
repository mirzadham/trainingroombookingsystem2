import React from 'react';

const variants = {
    primary: 'bg-mimos-500 hover:bg-mimos-600 text-white shadow-lg shadow-mimos-500/25 hover:shadow-mimos-500/40',
    secondary: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-sm',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    ...props
}) {
    return (
        <button
            disabled={disabled || loading}
            className={`
                inline-flex items-center justify-center gap-2 font-semibold rounded-xl
                transition-all duration-300 cursor-pointer
                disabled:opacity-40 disabled:cursor-not-allowed
                ${variants[variant] || variants.primary}
                ${sizes[size] || sizes.md}
                ${className}
            `}
            {...props}
        >
            {loading ? (
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
                children
            )}
        </button>
    );
}
