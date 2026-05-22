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
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
            {/* Header Navigation — Single Row */}
            <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/75 border-b border-slate-200/40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Left: Logo */}
                        <Link to="/" className="flex items-center gap-3 group flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Academy" className="h-9 w-auto" />
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
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* Desktop Nav Links */}
                            <div className="hidden sm:flex items-center gap-6 mr-2">
                                <Link
                                    to="/calendar"
                                    className={`relative text-sm font-semibold transition-all duration-300 py-2 ${
                                        location.pathname === '/calendar'
                                            ? 'text-mimos-500'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Calendar
                                    {location.pathname === '/calendar' && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-mimos-500 to-pink-500 rounded-full animate-pulse" />
                                    )}
                                </Link>
                                {isAuthenticated && (
                                    <Link
                                        to="/my-bookings"
                                        className={`relative text-sm font-semibold transition-all duration-300 py-2 ${
                                            location.pathname === '/my-bookings'
                                                ? 'text-mimos-500'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        My Bookings
                                        {location.pathname === '/my-bookings' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-mimos-500 to-pink-500 rounded-full animate-pulse" />
                                        )}
                                    </Link>
                                )}
                            </div>

                            {/* Mobile Search Icon */}
                            {isSearchPage && (
                                <button
                                    onClick={() => setMobileSearchOpen(true)}
                                    className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100/80 transition"
                                    aria-label="Open search"
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                            )}

                            {/* Mobile Nav Hamburger */}
                            <button
                                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                                className="sm:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100/80 transition"
                                aria-label="Toggle navigation"
                            >
                                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>

                            {/* User Menu or Login Button */}
                            {isAuthenticated ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 bg-white/95 border border-slate-200/60 rounded-xl text-slate-700 hover:text-mimos-500 hover:border-mimos-500/30 hover:scale-[1.02] shadow-sm hover:shadow transition-all duration-300 cursor-pointer"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-mimos-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                                        </div>
                                        <span className="hidden sm:inline text-sm font-semibold max-w-[100px] truncate">{user?.name}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    </button>

                                    {userMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-xl shadow-slate-200/80 z-50 py-1.5">
                                                <div className="px-4 py-2.5 border-b border-slate-100">
                                                    <div className="text-sm font-bold text-slate-900 truncate">{user?.name}</div>
                                                    <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                                                </div>
                                                <Link
                                                    to="/profile"
                                                    onClick={() => { setUserMenuOpen(false); setMobileNavOpen(false); }}
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border-b border-slate-100/60"
                                                >
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    My Profile
                                                </Link>
                                                <Link
                                                    to="/my-bookings"
                                                    onClick={() => { setUserMenuOpen(false); setMobileNavOpen(false); }}
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                                >
                                                    <BookOpen className="w-4 h-4 text-slate-400" />
                                                    My Bookings
                                                </Link>
                                                <Link
                                                    to="/calendar"
                                                    onClick={() => { setUserMenuOpen(false); setMobileNavOpen(false); }}
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                                >
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    Calendar
                                                </Link>
                                                {isAdmin && (
                                                    <Link
                                                        to="/admin"
                                                        onClick={() => { setUserMenuOpen(false); setMobileNavOpen(false); }}
                                                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-mimos-500 font-bold bg-mimos-50/50 hover:bg-mimos-50 transition-colors border-t border-slate-100/60"
                                                    >
                                                        Admin Panel
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                >
                                                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 hover:scale-[1.02] shadow-md shadow-mimos-500/10 hover:shadow-mimos-500/25 text-white rounded-xl transition-all duration-300 font-semibold text-sm"
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span>Sign In</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mobile Nav Dropdown */}
                    {mobileNavOpen && (
                        <div className="sm:hidden border-t border-slate-200/50 bg-white">
                            <div className="py-2 space-y-1">
                                <Link
                                    to="/calendar"
                                    onClick={() => setMobileNavOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    Calendar
                                </Link>
                                {isAuthenticated && (
                                     <>
                                         <Link
                                             to="/profile"
                                             onClick={() => { setMobileNavOpen(false); }}
                                             className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                         >
                                             <User className="w-4 h-4 text-slate-400" />
                                             My Profile
                                         </Link>
                                         <Link
                                             to="/my-bookings"
                                             onClick={() => { setMobileNavOpen(false); }}
                                             className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                         >
                                             <BookOpen className="w-4 h-4 text-slate-400" />
                                             My Bookings
                                         </Link>
                                     </>
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
            <main className="flex-grow relative z-10">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200/50 py-10 mt-auto bg-white/60 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                    <div>
                        © 2026 <span className="font-semibold text-slate-700">MIMOS Academy</span> — Training Room Booking System
                    </div>
                    <div className="flex gap-4">
                        <span className="text-slate-400">TPM & KHTP Locations</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
