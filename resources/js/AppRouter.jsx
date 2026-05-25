import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public pages (Lazy loaded)
const Home = lazy(() => import('./pages/Home'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const BookingWizard = lazy(() => import('./pages/booking/BookingWizard'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Login = lazy(() => import('./pages/Login'));
const RoomDetails = lazy(() => import('./pages/RoomDetails'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Admin pages (Lazy loaded)
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminBookings = lazy(() => import('./pages/admin/Bookings'));
const AdminRooms = lazy(() => import('./pages/admin/Rooms'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const ClaimInvite = lazy(() => import('./pages/admin/ClaimInvite'));

function AdminRoute({ children }) {
    const { isAdminAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdminAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
}

export default function AppRouter() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        }>
            <Routes>
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/rooms/:id" element={<RoomDetails />} />
                    <Route path="/book" element={<BookingWizard />} />
                    <Route path="/my-bookings" element={<MyBookings />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                </Route>

                {/* Admin Login & Setup (standalone, no layout) */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/setup-account" element={<ClaimInvite />} />

                {/* Protected Admin Routes */}
                <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/bookings" element={<AdminBookings />} />
                    <Route path="/admin/rooms" element={<AdminRooms />} />
                    <Route path="/admin/reports" element={<AdminReports />} />
                    <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                </Route>
            </Routes>
        </Suspense>
    );
}
