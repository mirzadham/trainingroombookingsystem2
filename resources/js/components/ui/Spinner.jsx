import React from 'react';

export default function Spinner({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-4 h-4 border',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-2',
    };

    return (
        <div
            className={`${sizes[size] || sizes.md} border-blue-400/30 border-t-blue-400 rounded-full animate-spin ${className}`}
        />
    );
}
