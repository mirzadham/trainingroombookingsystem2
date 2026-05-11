import React from 'react';

export default function Input({
    label,
    error,
    className = '',
    ...props
}) {
    return (
        <div>
            {label && (
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                className={`
                    w-full px-4 py-3 bg-white border rounded-xl text-slate-900 text-sm
                    placeholder:text-slate-400 focus:outline-none focus:ring-2
                    transition
                    ${error
                        ? 'border-red-300 focus:ring-red-500/50'
                        : 'border-slate-200 focus:ring-mimos-500/50'
                    }
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
        </div>
    );
}
