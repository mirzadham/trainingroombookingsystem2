import React from 'react';

const statusConfig = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20' },
    cancelled: { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' },
};

export default function Badge({ status, className = '' }) {
    const config = statusConfig[status] || statusConfig.pending;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${config.bg} ${config.text} ${config.border} ${className}`}>
            {status}
        </span>
    );
}
