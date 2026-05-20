import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate();
    const { resetPassword, isAuthenticated } = useAuth();

    if (isAuthenticated) {
        navigate('/', { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== passwordConfirm) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            await resetPassword({
                token,
                email,
                password,
                password_confirmation: passwordConfirm,
            });
            setSuccess(true);
        } catch (err) {
            const msg = err.response?.data?.errors?.email?.[0]
                || err.response?.data?.message
                || 'Something went wrong. Please check your token or link expiration.';
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

                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <Link to="/" className="inline-block mb-12">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-8 w-auto bg-white/10 p-1.5 rounded-lg backdrop-blur-md border border-white/20" />
                        </Link>
                    </div>
                    
                    <div className="my-auto">
                        <h1 className="text-5xl lg:text-7xl font-bold text-white leading-none tracking-tight">
                            SECURE YOUR<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-mimos-400 to-pink-400">ACCOUNT</span>
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
                        <Link to="/">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-8 w-auto" />
                        </Link>
                    </div>

                    {success ? (
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100 animate-bounce">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Password Reset Successful</h2>
                                <p className="text-xs text-slate-500">Your password has been successfully updated. You can now log in with your new credentials.</p>
                            </div>
                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="w-full py-4 bg-slate-900 hover:bg-mimos-600 text-white text-xs font-bold uppercase tracking-widest transition-colors duration-300 cursor-pointer flex justify-center items-center h-12 gap-2"
                                >
                                    Go to Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-12 border-b border-slate-200 pb-6">
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Reset Password</h2>
                                <p className="text-xs text-slate-500">Choose a new, secure password for your account.</p>
                            </div>

                            {error && (
                                <div className="mb-8 p-3 bg-red-50 text-red-500 text-sm border-l-2 border-red-500">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="relative border-b border-slate-300">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Email Address</label>
                                    <input
                                        type="email" value={email} disabled
                                        className="w-full pb-2 bg-transparent text-slate-400 text-sm cursor-not-allowed focus:outline-none"
                                    />
                                </div>

                                <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">New Password</label>
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

                                <div className="relative border-b border-slate-300 focus-within:border-mimos-500 transition-colors">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Confirm Password</label>
                                    <input
                                        type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required
                                        className="w-full pb-2 bg-transparent text-slate-900 text-sm focus:outline-none"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit" disabled={loading}
                                        className="w-full py-4 bg-slate-900 hover:bg-mimos-600 text-white text-xs font-bold uppercase tracking-widest transition-colors duration-300 disabled:opacity-50 cursor-pointer flex justify-center items-center h-12"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
