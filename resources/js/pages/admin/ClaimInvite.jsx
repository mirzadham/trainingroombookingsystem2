import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
    Eye, EyeOff, Lock, User, Briefcase, Phone, Mail, 
    CheckCircle, AlertCircle, ArrowRight, ShieldCheck, HelpCircle 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateInviteToken } from '../../services/api';

export default function ClaimInvite() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    // Page states
    const [status, setStatus] = useState('validating'); // validating | valid | invalid | success
    const [invitationData, setInvitationData] = useState(null);
    const [validationError, setValidationError] = useState('');

    // Form inputs
    const [name, setName] = useState('');
    const [department, setDepartment] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    // UI states
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const navigate = useNavigate();
    const { claimAdminInvite, isAdminAuthenticated } = useAuth();

    // Redirect if already logged in as admin
    useEffect(() => {
        if (isAdminAuthenticated) {
            navigate('/admin', { replace: true });
        }
    }, [isAdminAuthenticated, navigate]);

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            setValidationError('Missing invitation token. Please check the link provided in your email.');
            return;
        }

        const verifyToken = async () => {
            try {
                const data = await validateInviteToken(token);
                setInvitationData(data);
                setStatus('valid');
            } catch (err) {
                setStatus('invalid');
                const errMsg = err.response?.data?.message || 'This invitation link is invalid or has expired. Please contact a Super Admin to issue a new invite.';
                setValidationError(errMsg);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        
        // Frontend checks
        if (!name.trim()) {
            setFormError('Please enter your full name.');
            return;
        }
        if (!department.trim()) {
            setFormError('Please specify your department.');
            return;
        }
        if (password.length < 8) {
            setFormError('Password must be at least 8 characters long.');
            return;
        }
        if (password !== passwordConfirm) {
            setFormError('Passwords do not match.');
            return;
        }

        setFormLoading(true);

        try {
            await claimAdminInvite({
                token,
                name,
                department,
                phone: phone || null,
                password,
                password_confirmation: passwordConfirm,
            });
            
            setStatus('success');
            setTimeout(() => {
                navigate('/admin');
            }, 1800);
        } catch (err) {
            const errMsg = err.response?.data?.message 
                || err.response?.data?.errors?.password?.[0]
                || 'Failed to setup account. Please verify your details and try again.';
            setFormError(errMsg);
            setFormLoading(false);
        }
    };

    // Format role key for UI
    const getRoleLabel = (role) => {
        if (role === 'super_admin') return 'Super Administrator';
        if (role === 'location_admin') return 'Location Administrator';
        return 'Administrator';
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans antialiased">
            {/* Left Panel: Visual/Brand */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-950 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-mimos-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <Link to="/" className="inline-block mb-12 transition-transform duration-300 hover:scale-[1.02]">
                            <img 
                                src="/images/MIMOS-Academy.png" 
                                alt="MIMOS Logo" 
                                className="h-9 w-auto bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/20" 
                            />
                        </Link>
                    </div>
                    
                    <div className="my-auto max-w-lg space-y-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-mimos-400">
                            <ShieldCheck className="w-3.5 h-3.5" /> Direct Invitation Only
                        </span>
                        <h1 className="text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                            WELCOME TO THE<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-mimos-400 via-pink-400 to-pink-500">
                                CONTROL TEAM
                            </span>
                        </h1>
                        <p className="text-sm text-slate-400 leading-relaxed font-normal">
                            You have been nominated to receive administrative access. Set up your official credentials to manage room availability, handle bookings, and support organizational workspace coordination.
                        </p>
                    </div>
                    
                    <div className="text-xs text-slate-500 flex justify-between items-center border-t border-white/5 pt-6">
                        <span>&copy; {new Date().getFullYear()} MIMOS Academy. All rights reserved.</span>
                        <span className="text-[10px] tracking-wider uppercase font-bold text-slate-600">v2.1.0</span>
                    </div>
                </div>
            </div>

            {/* Right Panel: Content Wizard */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-20 bg-slate-50/50 min-h-screen">
                <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 p-8 sm:p-10 relative overflow-hidden transition-all duration-300">
                    {/* Small brand header for mobile */}
                    <div className="md:hidden flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                        <Link to="/">
                            <img src="/images/MIMOS-Academy.png" alt="MIMOS Logo" className="h-7 w-auto" />
                        </Link>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded">Admin Access</span>
                    </div>

                    {/* VIEW 1: VALIDATING STATE */}
                    {status === 'validating' && (
                        <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center animate-fade-in">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-mimos-600 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-mimos-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-900">Verifying Invitation</h3>
                                <p className="text-xs text-slate-400 max-w-xs">
                                    Securing connection and checking the cryptographic signature of your invitation link...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: INVALID STATE */}
                    {status === 'invalid' && (
                        <div className="py-6 space-y-6 text-center animate-fade-in">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center border border-rose-100">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Verification Failed</h2>
                                <p className="text-xs text-slate-500 leading-relaxed px-2">
                                    {validationError}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                <Link
                                    to="/"
                                    className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider transition rounded-xl flex justify-center items-center h-11"
                                >
                                    Return to Booking Portal
                                </Link>
                                <a
                                    href="mailto:support@mimos.my"
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" /> Need Assistance? Contact IT Support
                                </a>
                            </div>
                        </div>
                    )}

                    {/* VIEW 3: SUCCESS STATE */}
                    {status === 'success' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center animate-fade-in">
                            <div className="relative">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100 animate-scale-up">
                                    <CheckCircle className="w-10 h-10 animate-bounce" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-slate-950">Setup Complete!</h3>
                                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                                    Administrative account provisioned successfully. You are being securely authenticated and redirected to your command dashboard...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* VIEW 4: SETUP FORM STATE */}
                    {status === 'valid' && invitationData && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">Activate Administrative Profile</h2>
                                <p className="text-xs text-slate-400">Complete your details to finish setting up your account.</p>
                            </div>

                            {/* Scoped Context Panel */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Authorized Email
                                    </span>
                                    <span className="font-semibold text-slate-800 break-all max-w-[200px] text-right">
                                        {invitationData.email}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Assigned Privilege
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        invitationData.role === 'super_admin'
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                            : 'bg-pink-50 text-pink-700 border border-pink-100'
                                    }`}>
                                        {getRoleLabel(invitationData.role)}
                                    </span>
                                </div>
                                {invitationData.location && (
                                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                                        <span className="text-slate-400 flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Scoped Facility
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                            {invitationData.location.name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {formError && (
                                <div className="p-3.5 bg-rose-50 text-rose-600 text-xs border-l-3 border-rose-500 rounded-r-lg flex items-start gap-2 animate-shake">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name Input */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                                    <div className="relative flex items-center">
                                        <User className="absolute left-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="John Doe"
                                            required
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-mimos-500 focus:bg-white text-slate-800 text-sm rounded-xl focus:outline-none transition"
                                        />
                                    </div>
                                </div>

                                {/* Department Input */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
                                    <div className="relative flex items-center">
                                        <Briefcase className="absolute left-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={department}
                                            onChange={e => setDepartment(e.target.value)}
                                            placeholder="Information Technology"
                                            required
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-mimos-500 focus:bg-white text-slate-800 text-sm rounded-xl focus:outline-none transition"
                                        />
                                    </div>
                                </div>

                                {/* Phone Input */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number (Optional)</label>
                                    <div className="relative flex items-center">
                                        <Phone className="absolute left-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+60123456789"
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-mimos-500 focus:bg-white text-slate-800 text-sm rounded-xl focus:outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 my-6 pt-5" />

                                {/* Password Input */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Create Password</label>
                                        {password && password.length < 8 && (
                                            <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Min. 8 characters</span>
                                        )}
                                    </div>
                                    <div className="relative flex items-center">
                                        <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-mimos-500 focus:bg-white text-slate-800 text-sm rounded-xl focus:outline-none transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Input */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirm Password</label>
                                        {passwordConfirm && password !== passwordConfirm && (
                                            <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Passwords do not match</span>
                                        )}
                                        {passwordConfirm && password === passwordConfirm && (
                                            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Passwords match</span>
                                        )}
                                    </div>
                                    <div className="relative flex items-center">
                                        <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type={showPasswordConfirm ? 'text' : 'password'}
                                            value={passwordConfirm}
                                            onChange={e => setPasswordConfirm(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-mimos-500 focus:bg-white text-slate-800 text-sm rounded-xl focus:outline-none transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                            className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
                                        >
                                            {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3">
                                    <button
                                        type="submit"
                                        disabled={formLoading || password.length < 8 || password !== passwordConfirm}
                                        className="w-full py-3.5 bg-slate-950 hover:bg-mimos-600 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-widest transition duration-300 rounded-xl flex justify-center items-center h-12 shadow-lg shadow-slate-950/15 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {formLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span className="flex items-center gap-1.5">
                                                Claim Account & Sign In <ArrowRight className="w-4 h-4" />
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
