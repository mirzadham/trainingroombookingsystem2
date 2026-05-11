import React from 'react';
import { LogIn } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function AuthGateStep({ form }) {
    const {
        authMode, setAuthMode,
        authEmail, setAuthEmail,
        authPassword, setAuthPassword,
        authName, setAuthName,
        authPasswordConfirm, setAuthPasswordConfirm,
        authLoading, authError, setAuthError,
        handleAuth,
    } = form;

    return (
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
                    <Input
                        label="Full Name"
                        type="text"
                        value={authName}
                        onChange={e => setAuthName(e.target.value)}
                        required
                    />
                )}
                <Input
                    label="Email"
                    type="email"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    required
                />
                <Input
                    label="Password"
                    type="password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    required
                />
                {authMode === 'register' && (
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={authPasswordConfirm}
                        onChange={e => setAuthPasswordConfirm(e.target.value)}
                        required
                    />
                )}
                <Button
                    type="submit"
                    loading={authLoading}
                    disabled={authLoading}
                    size="lg"
                    className="w-full"
                >
                    {authMode === 'login' ? 'Sign In & Book' : 'Register & Book'}
                </Button>
            </form>
        </div>
    );
}
