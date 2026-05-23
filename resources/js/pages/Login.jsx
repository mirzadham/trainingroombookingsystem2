import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Building2, Lock, Mail, Eye, EyeOff, ArrowRight, UserPlus, Phone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/';
    const initialMode = searchParams.get('mode') || 'login';

    const [mode, setMode] = useState(initialMode); // login, register, forgot
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');
    const navigate = useNavigate();
    const { login, register, isAuthenticated, forgotPassword } = useAuth();

    if (isAuthenticated) {
        navigate(redirectUrl, { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setForgotSuccess('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await login(email, password);
                navigate(redirectUrl);
            } else if (mode === 'register') {
                await register({
                    name,
                    email,
                    password,
                    password_confirmation: passwordConfirm,
                    phone,
                });
                navigate(redirectUrl);
            } else if (mode === 'forgot') {
                const res = await forgotPassword(email);
                setForgotSuccess(res.message || 'We have emailed your password reset link.');
                setEmail('');
            }
        } catch (err) {
            const msg = err.response?.data?.errors?.email?.[0]
                || err.response?.data?.message
                || 'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white">
            {/* Left Panel: Visual/Brand */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 p-12 flex-col justify-center relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-mimos-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-center">
                    <div className="text-center md:text-left">
                        <h1 className="text-5xl lg:text-7xl font-bold text-white leading-none tracking-tight">
                            JOIN THE<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-mimos-400 to-pink-400">INNOVATION</span>
                        </h1>
                    </div>
                </div>
            </div>

            {/* Right Panel: Form */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative">
                <div className="w-full max-w-[380px]">
                    <div className="md:hidden mb-12">
                        <Link to="/">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-8 w-auto" />
                        </Link>
                    </div>

                    {/* Minimal Tab Toggle or Header */}
                    {mode === 'forgot' ? (
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Forgot Password</h2>
                            <p className="text-xs text-slate-500">Enter your email address and we'll send you a link to reset your password.</p>
                        </div>
                    ) : (
                        <div className="flex gap-6 mb-12 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={() => { setMode('login'); setError(''); setForgotSuccess(''); }}
                                className={`pb-3 text-sm font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                                    mode === 'login' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('register'); setError(''); setForgotSuccess(''); }}
                                className={`pb-3 text-sm font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                                    mode === 'register' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Register
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mb-8 p-3 bg-red-50 text-red-500 text-sm border-l-2 border-red-500">
                            {error}
                        </div>
                    )}

                    {forgotSuccess && (
                        <div className="mb-8 p-3 bg-emerald-50 text-emerald-600 text-sm border-l-2 border-emerald-500">
                            {forgotSuccess}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {mode === 'register' && (
                            <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text" value={name} onChange={e => setName(e.target.value)} required
                                    className="w-full pb-2 bg-transparent text-slate-900 text-sm focus:outline-none"
                                />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Phone Number</label>
                                <input
                                    type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                                    placeholder="e.g. +60123456789"
                                    className="w-full pb-2 bg-transparent text-slate-900 text-sm focus:outline-none placeholder:text-slate-300"
                                />
                            </div>
                        )}

                        <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Email</label>
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                className="w-full pb-2 bg-transparent text-slate-900 text-sm focus:outline-none"
                            />
                        </div>

                        {mode !== 'forgot' && (
                            <div>
                                <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Password</label>
                                    <input
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
                                {mode === 'register' && (
                                    <p className="mt-2 text-[10px] text-slate-400">
                                        Must be at least 8 characters
                                    </p>
                                )}
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Confirm Password</label>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required
                                    className="w-full pb-2 pr-10 bg-transparent text-slate-900 text-sm focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-0 bottom-2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        )}

                        {mode === 'login' && (
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setMode('forgot'); setError(''); setForgotSuccess(''); }}
                                    className="text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit" disabled={loading}
                                className="w-full py-4 bg-slate-900 hover:bg-mimos-600 text-white text-xs font-bold uppercase tracking-widest transition-colors duration-300 disabled:opacity-50 cursor-pointer flex justify-center items-center h-12"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : mode === 'login' ? (
                                    'Sign In'
                                ) : mode === 'register' ? (
                                    'Create Account'
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </div>

                        {mode === 'forgot' && (
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); setForgotSuccess(''); }}
                                    className="text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer font-semibold uppercase tracking-wider"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
