import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
    LayoutDashboard, 
    CalendarCheck, 
    DoorOpen, 
    BarChart3, 
    LogOut,
    Building2,
    ChevronRight 
} from 'lucide-react';

const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/bookings', icon: CalendarCheck, label: 'Bookings' },
    { path: '/admin/rooms', icon: DoorOpen, label: 'Rooms' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
];

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen flex bg-slate-50 text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-xl flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-slate-200">
                    <Link to="/admin" className="flex items-center gap-3">
                        <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-10 w-auto bg-white border border-slate-100 p-1 rounded-xl" />
                        <div>
                            <span className="text-xs text-slate-500 font-medium">Admin Panel</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                                    isActive
                                        ? 'bg-mimos-500/10 text-mimos-400 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <item.icon className={`w-4.5 h-4.5 ${isActive ? 'text-mimos-400' : 'text-slate-500 group-hover:text-slate-700'}`} />
                                {item.label}
                                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-mimos-400/50" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-slate-200">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer">
                        <LogOut className="w-4.5 h-4.5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-auto">
                <main className="flex-1 p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
