import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Building2, LogIn, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function PublicLayout() {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setMenuOpen(false);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3 group">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-8 w-auto" />
                        </Link>

                        <div className="flex items-center gap-4">
                            <Link
                                to="/calendar"
                                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Calendar
                            </Link>
                            {isAuthenticated && (
                                <Link
                                    to="/my-bookings"
                                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    My Bookings
                                </Link>
                            )}

                            {/* User menu or Login button */}
                            {isAuthenticated ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setMenuOpen(!menuOpen)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="hidden sm:inline max-w-[120px] truncate">{user?.name}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    </button>

                                    {menuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 z-50 py-1">
                                                <div className="px-4 py-2 border-b border-slate-100">
                                                    <div className="text-sm font-medium text-slate-900 truncate">{user?.name}</div>
                                                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                                                </div>
                                                <Link
                                                    to="/my-bookings"
                                                    onClick={() => setMenuOpen(false)}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                                                >
                                                    My Bookings
                                                </Link>
                                                {isAdmin && (
                                                    <Link
                                                        to="/admin"
                                                        onClick={() => setMenuOpen(false)}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm text-mimos-600 hover:text-mimos-700 hover:bg-mimos-50 transition"
                                                    >
                                                        Admin Panel
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                                >
                                                    <LogOut className="w-3.5 h-3.5" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
                    © 2026 MIMOS Academy — Training Room Booking System
                </div>
            </footer>
        </div>
    );
}
