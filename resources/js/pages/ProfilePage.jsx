import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Phone, Building, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ProfilePage() {
    const { user, isAuthenticated, updateProfile, updatePassword } = useAuth();
    const navigate = useNavigate();

    // Active tab: 'personal' or 'security'
    const [activeTab, setActiveTab] = useState('personal');

    // Personal details state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [department, setDepartment] = useState('');
    
    // Security details state
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    // UI Status states
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [validationErrors, setValidationErrors] = useState({});

    // Redirect to login if guest tries to access profile directly
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Pre-fill user profile fields
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setDepartment(user.department || '');
        }
    }, [user]);

    // Handle personal info form submission
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        setValidationErrors({});

        try {
            await updateProfile({
                name,
                email,
                phone: phone || null,
                department: department || null,
            });
            setSuccessMessage('Your profile details have been updated successfully.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                setValidationErrors(errors);
                setErrorMessage('Please fix the validation errors below.');
            } else {
                setErrorMessage(err.response?.data?.message || 'Failed to update profile.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle password change form submission
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== passwordConfirmation) {
            setErrorMessage('New passwords do not match.');
            return;
        }

        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        setValidationErrors({});

        try {
            await updatePassword({
                current_password: currentPassword,
                password: password,
                password_confirmation: passwordConfirmation,
            });
            setSuccessMessage('Your password has been changed successfully.');
            setCurrentPassword('');
            setPassword('');
            setPasswordConfirmation('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                setValidationErrors(errors);
                setErrorMessage('Please fix the validation errors below.');
            } else {
                setErrorMessage(err.response?.data?.message || 'Failed to update password.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null; // Will navigate to login via useEffect
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-20rem)]">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Manage your personal profile details and security settings</p>
            </div>

            {/* Success & Error Global Alerts */}
            {successMessage && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-start gap-3 shadow-sm animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>{successMessage}</div>
                </div>
            )}

            {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-start gap-3 shadow-sm animate-fadeIn">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>{errorMessage}</div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Side: Dynamic Sidebar Tabs */}
                <div className="w-full md:w-64 shrink-0 space-y-2">
                    <button
                        onClick={() => { setActiveTab('personal'); setSuccessMessage(''); setErrorMessage(''); setValidationErrors({}); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                            activeTab === 'personal'
                                ? 'bg-mimos-50 text-mimos-700 shadow-sm border border-mimos-100/50'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                        }`}
                    >
                        <User className="w-4 h-4" />
                        Personal Info
                    </button>
                    <button
                        onClick={() => { setActiveTab('security'); setSuccessMessage(''); setErrorMessage(''); setValidationErrors({}); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                            activeTab === 'security'
                                ? 'bg-mimos-50 text-mimos-700 shadow-sm border border-mimos-100/50'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                        }`}
                    >
                        <Lock className="w-4 h-4" />
                        Security & Password
                    </button>
                </div>

                {/* Right Side: Tab Forms Container */}
                <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
                    {activeTab === 'personal' && (
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                                    <User className="w-5 h-5 text-slate-400" />
                                    Personal Information
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Keep your reservation contact details up to date.</p>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="sm:col-span-2">
                                    <Input
                                        label="Full Name *"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        error={validationErrors.name?.[0]}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <Input
                                        label="Email Address *"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        error={validationErrors.email?.[0]}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <Input
                                        label="Phone Number"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        error={validationErrors.phone?.[0]}
                                        placeholder="+60 12 345 6789"
                                    />
                                </div>

                                <div>
                                    <Input
                                        label="Department"
                                        type="text"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        error={validationErrors.department?.[0]}
                                        placeholder="Engineering / HR"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <Button
                                    type="submit"
                                    loading={loading}
                                    disabled={loading || !name.trim() || !email.trim()}
                                    className="px-6 py-2.5 text-sm"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'security' && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-slate-400" />
                                    Change Password
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Ensure your account remains safe and secure.</p>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="space-y-5">
                                <Input
                                    label="Current Password *"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    error={validationErrors.current_password?.[0]}
                                    required
                                />

                                <Input
                                    label="New Password *"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={validationErrors.password?.[0]}
                                    placeholder="Minimum 8 characters"
                                    required
                                />

                                <Input
                                    label="Confirm New Password *"
                                    type="password"
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <Button
                                    type="submit"
                                    loading={loading}
                                    disabled={loading || !currentPassword || !password || !passwordConfirmation}
                                    className="px-6 py-2.5 text-sm"
                                >
                                    Change Password
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
