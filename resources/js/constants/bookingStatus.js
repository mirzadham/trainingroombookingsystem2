export const BOOKING_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
};

export const STATUS_COLORS = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500' },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-600', dot: 'bg-red-500' },
    cancelled: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-400' },
};
