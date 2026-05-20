import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public pages
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import BookingWizard from './pages/booking/BookingWizard';
import MyBookings from './pages/MyBookings';
import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import AdminBookings from './pages/admin/Bookings';
import AdminRooms from './pages/admin/Rooms';
import AdminReports from './pages/admin/Reports';

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
        <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/book" element={<BookingWizard />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/login" element={<Login />} />
            </Route>

            {/* Admin Login (standalone, no layout) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Admin Routes */}
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/bookings" element={<AdminBookings />} />
                <Route path="/admin/rooms" element={<AdminRooms />} />
                <Route path="/admin/reports" element={<AdminReports />} />
            </Route>
        </Routes>
    );
}
