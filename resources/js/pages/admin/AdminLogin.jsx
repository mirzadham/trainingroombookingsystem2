import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { adminLogin, isAdminAuthenticated } = useAuth();

    // Redirect if already authenticated as admin
    if (isAdminAuthenticated) {
        navigate('/admin', { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await adminLogin(email, password);
            navigate('/admin');
        } catch (err) {
            const msg = err.response?.data?.errors?.email?.[0] || err.response?.data?.message || 'Invalid credentials.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white">
            {/* Left Panel: Visual/Brand */}
            <div className="hidden md:flex md:w-1/2 bg-slate-900 p-12 flex-col justify-center relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-mimos-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <a href="/" className="inline-block mb-12">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-8 w-auto bg-white/10 p-1.5 rounded-lg backdrop-blur-md border border-white/20" />
                        </a>
                    </div>
                    
                    <div className="my-auto">
                        <h1 className="text-5xl lg:text-7xl font-bold text-white leading-none tracking-tight">
                            COMMAND<br />
                            <span className="text-mimos-400">CENTER</span>
                        </h1>
                    </div>
                    
                    <div className="text-sm text-slate-400">
                        &copy; {new Date().getFullYear()} MIMOS Academy.
                    </div>
                </div>
            </div>

            {/* Right Panel: Form */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative">
                <div className="w-full max-w-[380px]">
                    <div className="md:hidden mb-12">
                        <a href="/">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-8 w-auto" />
                        </a>
                    </div>

                    <div className="mb-12 border-b border-slate-200 pb-3">
                        <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-900">
                            Admin Portal
                        </h2>
                    </div>

                    {error && (
                        <div className="mb-8 p-3 bg-red-50 text-red-500 text-sm border-l-2 border-red-500">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Email Address</label>
                            <input
                                id="admin-email"
                                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                className="w-full pb-2 bg-transparent text-slate-900 text-sm focus:outline-none"
                            />
                        </div>

                        <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Password</label>
                            <input
                                id="admin-password"
                                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                                className="w-full pb-2 pr-10 bg-transparent text-slate-900 text-sm focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-0 bottom-2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="pt-4">
                            <button
                                id="admin-login-button"
                                type="submit" disabled={loading}
                                className="w-full py-4 bg-slate-900 hover:bg-mimos-600 text-white text-xs font-bold uppercase tracking-widest transition-colors duration-300 disabled:opacity-50 cursor-pointer flex justify-center items-center h-12"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Back link */}
                    <div className="text-center mt-12">
                        <a href="/" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                            ← Back to Booking
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
