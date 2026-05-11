import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LogIn, LogOut, User, ChevronDown, Menu, X, Calendar, BookOpen, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import HeaderSearchPill from '../components/HeaderSearchPill';
import HeaderSearchModal from '../components/HeaderSearchModal';

export default function PublicLayout() {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const isSearchPage = location.pathname === '/search';

    // Get search params for header
    const headerLocationId = searchParams.get('location_id') || '';
    const headerDate = searchParams.get('date') || '';
    const headerAttendees = searchParams.get('attendees') || '';

    const handleLogout = async () => {
        await logout();
        setUserMenuOpen(false);
        setMobileNavOpen(false);
        navigate('/');
    };

    const handleSearch = (filters) => {
        const params = new URLSearchParams();
        if (filters.location_id) params.set('location_id', filters.location_id);
        params.set('date', filters.date);
        if (filters.attendees) params.set('attendees', filters.attendees);
        navigate(`/search?${params.toString()}`);
        window.scrollTo(0, 0);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Header Navigation — Single Row */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Left: Logo */}
                        <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Academy" className="h-8 w-auto" />
                        </Link>

                        {/* Center: Pill Search — hidden on mobile, shown on md+ */}
                        <div className="hidden md:flex flex-1 max-w-xl mx-6">
                            {isSearchPage && (
                                <HeaderSearchPill
                                    key={`${headerLocationId}-${headerDate}-${headerAttendees}`}
                                    initialLocation={headerLocationId}
                                    initialDate={headerDate}
                                    initialAttendees={headerAttendees}
                                    onSearch={handleSearch}
                                />
                            )}
                        </div>

                        {/* Right: Nav + User Actions */}
                        <div className="flex items-center gap-1 sm:gap-3">
                            {/* Desktop Nav Links */}
                            <div className="hidden sm:flex items-center gap-3">
                                <Link
                                    to="/calendar"
                                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Calendar
                                </Link>
                                {isAuthenticated && (
                                    <Link
                                        to="/my-bookings"
                                        className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                        My Bookings
                                    </Link>
                                )}
                            </div>

                            {/* Mobile Search Icon */}
                            {isSearchPage && (
                                <button
                                    onClick={() => setMobileSearchOpen(true)}
                                    className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                                    aria-label="Open search"
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                            )}

                            {/* Mobile Nav Hamburger */}
                            <button
                                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                                className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                                aria-label="Toggle navigation"
                            >
                                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>

                            {/* User Menu or Login Button */}
                            {isAuthenticated ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">{user?.name}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    </button>

                                    {userMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 z-50 py-1">
                                                <div className="px-4 py-2 border-b border-slate-100">
                                                    <div className="text-sm font-medium text-slate-900 truncate">{user?.name}</div>
                                                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                                                </div>
                                                <Link
                                                    to="/my-bookings"
                                                    onClick={() => { setUserMenuOpen(false); setMobileNavOpen(false); }}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                                >
                                                    <BookOpen className="w-4 h-4" />
                                                    My Bookings
                                                </Link>
                                                <Link
                                                    to="/calendar"
                                                    onClick={() => { setUserMenuOpen(false); setMobileNavOpen(false); }}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    Calendar
                                                </Link>
                                                {isAdmin && (
                                                    <Link
                                                        to="/admin"
                                                        onClick={() => { setUserMenuOpen(false); setMobileNavOpen(false); }}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm text-mimos-600 hover:bg-mimos-50 transition"
                                                    >
                                                        Admin Panel
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer"
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
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span className="hidden sm:inline text-sm font-medium">Sign In</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mobile Nav Dropdown */}
                    {mobileNavOpen && (
                        <div className="sm:hidden border-t border-slate-200 bg-white">
                            <div className="py-2 space-y-1">
                                <Link
                                    to="/calendar"
                                    onClick={() => setMobileNavOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Calendar
                                </Link>
                                {isAuthenticated && (
                                    <Link
                                        to="/my-bookings"
                                        onClick={() => { setMobileNavOpen(false); }}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        My Bookings
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Mobile Search Modal */}
            <HeaderSearchModal
                isOpen={mobileSearchOpen}
                onClose={() => setMobileSearchOpen(false)}
                initialLocation={headerLocationId}
                initialDate={headerDate}
                initialAttendees={headerAttendees}
                onSearch={handleSearch}
            />

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
