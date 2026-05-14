import React from 'react';
import { LogIn, ArrowRight } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function AuthGateStep({ form }) {
    const {
        authMode, setAuthMode,
        authPassword, setAuthPassword,
        authPasswordConfirm, setAuthPasswordConfirm,
        authLoading, authError, setAuthError,
        guestEmail, guestName,
        handleAuth,
    } = form;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">Verify Your Account</h2>
                <p className="text-sm text-slate-500 mt-1">To secure your booking and easily manage it later.</p>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                    onClick={() => { setAuthMode('login'); setAuthError(''); setAuthPassword(''); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Existing User
                </button>
                <button
                    onClick={() => { setAuthMode('register'); setAuthError(''); setAuthPassword(''); setAuthPasswordConfirm(''); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${authMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    New User
                </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
                    <LogIn className="w-5 h-5" />
                </div>
                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{authMode === 'login' ? 'Logging in as' : 'Registering as'}</div>
                    <div className="text-sm font-bold text-slate-900">{guestEmail}</div>
                </div>
            </div>

            {authError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                    {authError}
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
                <Input
                    label="Password *"
                    type="password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    required
                    autoFocus
                />
                
                {authMode === 'register' && (
                    <Input
                        label="Confirm Password *"
                        type="password"
                        value={authPasswordConfirm}
                        onChange={e => setAuthPasswordConfirm(e.target.value)}
                        required
                    />
                )}
                
                <Button
                    type="submit"
                    loading={authLoading}
                    disabled={authLoading || !authPassword || (authMode === 'register' && !authPasswordConfirm)}
                    size="lg"
                    className="w-full group py-3 text-base"
                >
                    {authMode === 'login' ? 'Sign In & Submit Booking' : 'Register & Submit Booking'}
                    {!authLoading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
            </form>
        </div>
    );
}
