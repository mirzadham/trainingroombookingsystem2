import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './ui/Button';

/**
 * AuthPromptModal — A premium split-layout modal shown when an unauthenticated
 * user attempts to book a room. Connects seamlessly with standard auth flows.
 */
export default function AuthPromptModal({ isOpen, onClose, redirectUrl }) {
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLogin = () => {
        const url = `/login?redirect=${encodeURIComponent(redirectUrl)}&mode=login`;
        window.location.href = url;
    };

    const handleSignUp = () => {
        const url = `/login?redirect=${encodeURIComponent(redirectUrl)}&mode=register`;
        window.location.href = url;
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-50 flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full max-w-[600px] rounded-[32px] border border-slate-100 shadow-2xl p-8 sm:p-10 relative animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition p-1.5 rounded-full hover:bg-slate-50 cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Heading */}
                <h3 className="text-center text-base sm:text-[17px] font-bold text-slate-800 tracking-tight leading-relaxed max-w-md mx-auto mt-4 mb-8">
                    You need to be logged in to your MIMOS Academy account to book a room.
                </h3>

                {/* Split Content */}
                <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 items-center">
                    {/* Left Column: Already have account? */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-xs sm:text-[13px] font-semibold text-slate-500 mb-4 tracking-wide">
                            Already have an account?
                        </span>
                        <Button 
                            variant="secondary" 
                            onClick={handleLogin}
                            className="w-full max-w-[130px] py-2 border-slate-200 text-slate-700 hover:border-mimos-500 hover:text-mimos-600 hover:bg-slate-50/50 shadow-sm transition-all duration-200"
                        >
                            Log In
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px bg-slate-200/60 h-16 self-center mx-2" />
                    <div className="md:hidden w-full h-px bg-slate-100 my-2" />

                    {/* Right Column: Don't have account yet? */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-xs sm:text-[13px] font-semibold text-slate-500 mb-4 tracking-wide">
                            Don't have an account yet?
                        </span>
                        <Button 
                            variant="primary" 
                            onClick={handleSignUp}
                            className="w-full max-w-[130px] py-2 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            Sign Up
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
