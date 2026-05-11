import React from 'react';

export default function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white border border-slate-200 shadow-sm rounded-2xl ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
