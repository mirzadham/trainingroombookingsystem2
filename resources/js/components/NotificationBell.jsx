import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Loader2 } from 'lucide-react';
import * as api from '../services/api';

const TYPE_ICONS = {
    submitted: '📨',
    approved: '✅',
    rejected: '❌',
    cancelled: '↩️',
    admin_cancelled: '⚠️',
    reminder: '⏰',
    waitlist_available: '🎉',
    expired: '🕒',
};

function timeAgo(isoStr) {
    if (!isoStr) return '';
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef(null);

    // Poll unread count every 60s so the badge stays fresh while idle
    const { data: countData } = useQuery({
        queryKey: ['notification-unread-count'],
        queryFn: () => api.getUnreadNotificationCount(),
        refetchInterval: 60_000,
    });

    const { data: listData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.getNotifications({ page: 1 }),
        enabled: isOpen,
    });

    const markReadMutation = useMutation({
        mutationFn: (id) => api.markNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
        },
    });

    const markAllMutation = useMutation({
        mutationFn: () => api.markAllNotificationsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
        },
    });

    const unreadCount = countData?.unread_count ?? 0;
    const notifications = listData?.data || [];

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (notification) => {
        if (!notification.read_at) {
            markReadMutation.mutate(notification.id);
        }
        setIsOpen(false);
        navigate('/my-bookings');
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl text-slate-600 hover:text-mimos-500 hover:bg-slate-100/80 transition-all duration-200 cursor-pointer"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                {unreadCount > 0 ? (
                    <BellRing className="w-5 h-5" />
                ) : (
                    <Bell className="w-5 h-5" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/80 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllMutation.mutate()}
                                disabled={markAllMutation.isPending}
                                className="flex items-center gap-1 text-[11px] font-semibold text-mimos-600 hover:text-mimos-700 transition cursor-pointer disabled:opacity-50"
                            >
                                {markAllMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                )}
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading && (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 text-mimos-500 animate-spin" />
                            </div>
                        )}

                        {!isLoading && notifications.length === 0 && (
                            <div className="text-center py-10 px-6">
                                <div className="text-3xl mb-2">🔔</div>
                                <p className="text-sm text-slate-500 font-medium">No notifications yet</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Booking updates, reminders and waitlist alerts will appear here.
                                </p>
                            </div>
                        )}

                        {notifications.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => handleItemClick(n)}
                                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer border-b border-slate-50 last:border-b-0 hover:bg-slate-50/80 ${
                                    n.read_at ? 'opacity-60' : 'bg-mimos-500/[0.02]'
                                }`}
                            >
                                <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                                    {TYPE_ICONS[n.type] || '🔔'}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[13px] font-medium text-slate-800 leading-snug">
                                        {n.message}
                                    </span>
                                    <span className="block text-[11px] text-slate-400 font-semibold mt-1">
                                        {timeAgo(n.created_at)}
                                        {n.booking?.reference_no ? ` · ${n.booking.reference_no}` : ''}
                                    </span>
                                </span>
                                {!n.read_at && (
                                    <span className="w-2 h-2 rounded-full bg-mimos-500 flex-shrink-0 mt-1.5" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                navigate('/my-bookings');
                            }}
                            className="w-full py-2.5 text-xs font-semibold text-mimos-600 hover:bg-mimos-50 transition-colors border-t border-slate-100 cursor-pointer"
                        >
                            View My Bookings
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
