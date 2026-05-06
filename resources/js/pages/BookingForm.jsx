import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Clock, Users, CalendarCheck, Check, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';

const STEPS = ['Details', 'Review', 'Account', 'Confirm'];

export default function BookingForm() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isAuthenticated, login, register } = useAuth();

    const roomId = searchParams.get('room_id');
    const roomName = searchParams.get('room_name') || '';
    const location = searchParams.get('location') || '';
    const capacity = searchParams.get('capacity') || '';
    const startTime = searchParams.get('start_time') || '';
    const endTime = searchParams.get('end_time') || '';
    const date = searchParams.get('date') || '';

    const [step, setStep] = useState(0);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [attendees, setAttendees] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);

    // Auth form state
    const [authMode, setAuthMode] = useState('login');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authName, setAuthName] = useState('');
    const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    const formatTime = (dt) => {
        if (!dt) return '';
        return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dt) => {
        if (!dt) return date;
        return new Date(dt).toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Step 1: Fill form
    const canProceedToReview = title.trim() && attendees && parseInt(attendees) > 0;

    const handleNext = () => {
        if (step === 0 && !canProceedToReview) return;
        if (step === 1) {
            // After review, go to auth if not authenticated, else submit
            if (isAuthenticated) {
                handleSubmit();
                return;
            }
        }
        setStep(s => Math.min(s + 1, 3));
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        try {
            if (authMode === 'login') {
                await login(authEmail, authPassword);
            } else {
                await register({
                    name: authName,
                    email: authEmail,
                    password: authPassword,
                    password_confirmation: authPasswordConfirm,
                });
            }
            // After successful auth, submit the booking
            handleSubmit();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Authentication failed.';
            setAuthError(msg);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');

        try {
            const result = await api.createBooking({
                room_id: parseInt(roomId),
                title,
                description: description || null,
                start_time: startTime,
                end_time: endTime,
                attendees: parseInt(attendees),
            });
            setBookingResult(result);
            setStep(3);
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                setError(Object.values(errors).flat().join(' '));
            } else {
                setError(err.response?.data?.message || 'Failed to create booking.');
            }
            // Go back to review step on error
            setStep(1);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Back button */}
            <button
                onClick={() => step > 0 && step < 3 ? setStep(s => s - 1) : navigate(-1)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                {step > 0 && step < 3 ? 'Back' : 'Back to search'}
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((label, i) => (
                    <React.Fragment key={label}>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${i <= step ? 'text-mimos-600' : 'text-slate-500'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                i < step ? 'bg-mimos-500 text-white' :
                                i === step ? 'bg-mimos-500/20 text-mimos-600 ring-2 ring-mimos-500/50' :
                                'bg-white border border-slate-200 text-slate-500'
                            }`}>
                                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span className="hidden sm:inline">{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-px ${i < step ? 'bg-mimos-500/50' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Room summary bar */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-slate-900 font-medium">{roomName}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3 h-3" />{location}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Users className="w-3 h-3" />Max {capacity}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" />{formatTime(startTime)} – {formatTime(endTime)}</span>
                <span className="text-xs text-slate-600">{formatDate(startTime)}</span>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Step 0: Details Form */}
            {step === 0 && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-slate-900">Booking Details</h2>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Title / Purpose *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. AI Workshop Session 3"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional — describe the purpose, required equipment, etc."
                            rows={3}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Number of Attendees *</label>
                        <input
                            type="number"
                            value={attendees}
                            onChange={e => setAttendees(e.target.value)}
                            min="1"
                            max={capacity}
                            placeholder={`Max ${capacity}`}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition"
                        />
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={!canProceedToReview}
                        className="group w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-mimos-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Review Booking
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* Step 1: Review */}
            {step === 1 && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Review Your Booking</h2>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Title</span>
                            <span className="text-slate-900 font-medium">{title}</span>
                        </div>
                        {description && (
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Description</span>
                                <span className="text-slate-900 text-right max-w-[60%]">{description}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Room</span>
                            <span className="text-slate-900">{roomName} ({location})</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Date</span>
                            <span className="text-slate-900">{formatDate(startTime)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Time</span>
                            <span className="text-slate-900">{formatTime(startTime)} – {formatTime(endTime)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Attendees</span>
                            <span className="text-slate-900">{attendees}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setStep(0)}
                            className="flex-1 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition cursor-pointer"
                        >
                            Edit
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-mimos-500/25 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : isAuthenticated ? (
                                <>Submit Booking <CalendarCheck className="w-4 h-4" /></>
                            ) : (
                                <>Continue <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Auth Gate */}
            {step === 2 && !isAuthenticated && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                    <div className="text-center mb-6">
                        <LogIn className="w-8 h-8 text-mimos-600 mx-auto mb-2" />
                        <h2 className="text-lg font-semibold text-slate-900">Sign in to complete your booking</h2>
                        <p className="text-sm text-slate-500 mt-1">Your booking details are saved</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex rounded-xl bg-white border border-slate-200 p-1 mb-6">
                        <button
                            onClick={() => { setAuthMode('login'); setAuthError(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${authMode === 'login' ? 'bg-mimos-500/20 text-mimos-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setAuthMode('register'); setAuthError(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${authMode === 'register' ? 'bg-mimos-500/20 text-mimos-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Register
                        </button>
                    </div>

                    {authError && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {authError}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {authMode === 'register' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Full Name</label>
                                <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} required
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Email</label>
                            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Password</label>
                            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition" />
                        </div>
                        {authMode === 'register' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Confirm Password</label>
                                <input type="password" value={authPasswordConfirm} onChange={e => setAuthPasswordConfirm(e.target.value)} required
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition" />
                            </div>
                        )}
                        <button type="submit" disabled={authLoading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-mimos-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-mimos-500/25 transition-all disabled:opacity-50 cursor-pointer">
                            {authLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : authMode === 'login' ? 'Sign In & Book' : 'Register & Book'}
                        </button>
                    </form>
                </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && bookingResult && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center">
                    <div className="inline-flex p-3 rounded-full bg-emerald-500/10 mb-4">
                        <CalendarCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Submitted!</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Your booking is <span className="text-amber-500 font-medium">pending approval</span>. You'll be notified once an admin reviews it.
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Booking ID</span><span className="text-slate-900 font-mono">#{bookingResult.id}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Room</span><span className="text-slate-900">{bookingResult.room?.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-amber-500 font-medium uppercase text-xs">{bookingResult.status}</span></div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => navigate('/my-bookings')} className="flex-1 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition cursor-pointer">
                            My Bookings
                        </button>
                        <button onClick={() => navigate('/')} className="flex-1 px-6 py-3 bg-gradient-to-r from-mimos-500 to-pink-600 text-white font-semibold rounded-xl transition cursor-pointer">
                            Book Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
