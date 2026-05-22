import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';
import { 
    LayoutDashboard, 
    CalendarCheck, 
    DoorOpen, 
    BarChart3, 
    LogOut,
    Building2,
    ChevronRight,
    History,
    Bell,
    X,
    ArrowRight,
    Users
} from 'lucide-react';

const baseNavItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/bookings', icon: CalendarCheck, label: 'Bookings' },
    { path: '/admin/rooms', icon: DoorOpen, label: 'Rooms' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { path: '/admin/audit-logs', icon: History, label: 'Audit Logs' },
];

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { adminLogout, adminUser } = useAuth();

    const isSuperAdmin = adminUser?.role === 'super_admin';
    const menuItems = [
        ...baseNavItems,
        ...(isSuperAdmin ? [{ path: '/admin/users', icon: Users, label: 'Users' }] : [])
    ];

    // Live alert notification state
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const prevCountRef = useRef(null);

    // Poll for pending bookings count every 15 seconds
    const { data: pendingData } = useQuery({
        queryKey: ['admin-pending-count-check'],
        queryFn: () => api.getAdminBookings({ status: 'pending' }),
        refetchInterval: 15000, // 15 seconds
        enabled: !!adminUser, // only run if logged in
    });

    const pendingCount = pendingData?.total || pendingData?.data?.length || 0;

    useEffect(() => {
        // Initialize ref on first load
        if (prevCountRef.current === null) {
            if (pendingCount !== undefined) {
                prevCountRef.current = pendingCount;
            }
            return;
        }

        // Show toast alert if count increases
        if (pendingCount > prevCountRef.current) {
            const diff = pendingCount - prevCountRef.current;
            setToastMsg(`You have ${diff} new booking request${diff > 1 ? 's' : ''} awaiting approval! Total pending: ${pendingCount}`);
            setShowToast(true);

            // Auto-hide alert after 7 seconds
            const timer = setTimeout(() => setShowToast(false), 7000);
            return () => clearTimeout(timer);
        }

        // Update count ref
        prevCountRef.current = pendingCount;
    }, [pendingCount]);

    const handleLogout = async () => {
        await adminLogout();
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen flex bg-slate-50 text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-slate-200/60 bg-white/75 backdrop-blur-xl flex flex-col shadow-sm relative z-30">
                {/* Logo */}
                <div className="p-6 border-b border-slate-200/55 flex flex-col gap-2">
                    <Link to="/admin" className="flex items-center gap-3">
                        <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-10 w-auto" />
                        <div>
                            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Admin Panel</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1.5">
                    {menuItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden ${
                                    isActive
                                        ? 'bg-gradient-to-r from-mimos-500/10 to-pink-500/5 text-mimos-600 shadow-xs border-l-4 border-mimos-500 pl-2.5'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border-l-4 border-transparent'
                                }`}
                            >
                                <item.icon className={`w-4.5 h-4.5 transition-all duration-300 ${
                                    isActive 
                                        ? 'text-mimos-500 scale-110' 
                                        : 'text-slate-400 group-hover:text-slate-700 group-hover:scale-105'
                                }`} />
                                <span>{item.label}</span>
                                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-mimos-500/70" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-slate-200/55">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50/80 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                        <LogOut className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-auto relative">
                {/* Modern Transparent Header with breadcrumbs / Sync light */}
                <header className="h-16 shrink-0 flex items-center justify-between px-8 bg-white/40 backdrop-blur-md border-b border-slate-200/40 relative z-20">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            Live Sync Connected
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xs font-medium text-slate-600 bg-slate-200/50 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-slate-200/30">
                            Logged in as: <span className="font-semibold text-mimos-600">{adminUser?.name || 'MIMOS Staff'}</span>
                        </div>
                    </div>
                </header>

                {/* Simulated/Polled Real-Time Floating Glassmorphism Alert */}
                {showToast && (
                    <div className="fixed top-6 right-6 z-[9999] w-80 bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl shadow-2xl p-4 flex gap-3 items-start animate-slide-in text-white">
                        <div className="p-2 bg-gradient-to-r from-mimos-500 to-pink-600 rounded-xl shrink-0 shadow-md">
                            <Bell className="w-4 h-4 text-white animate-bounce" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-pink-400">New Reservation</h4>
                            <p className="text-xs text-slate-200 mt-1 font-semibold leading-relaxed">{toastMsg}</p>
                            <button
                                onClick={() => {
                                    setShowToast(false);
                                    navigate('/admin/bookings');
                                }}
                                className="mt-3 flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 font-bold transition uppercase tracking-wider cursor-pointer"
                            >
                                Review Requests <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <button
                            onClick={() => setShowToast(false)}
                            className="text-slate-400 hover:text-slate-200 shrink-0 p-1 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <main className="flex-1 p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

