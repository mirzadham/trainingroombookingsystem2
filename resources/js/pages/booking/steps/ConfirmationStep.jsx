import React from 'react';
import { CalendarCheck, ChevronRight, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';

export default function ConfirmationStep({ form }) {
    const navigate = useNavigate();
    const { bookingResult } = form;

    if (!bookingResult) return null;

    // bookingResult may be a single booking object or an array (multi-day)
    const bookings = Array.isArray(bookingResult) ? bookingResult : [bookingResult];
    const primary = bookings[0];
    const totalDays = bookings.length;

    return (
        <div className="text-center py-6">
            <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-6">
                <CalendarCheck className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Booking Submitted!</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                Your request is <span className="text-amber-500 font-bold">Pending Approval</span>. You'll receive a confirmation email once an administrator reviews it.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 text-left max-w-sm mx-auto shadow-inner relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-mimos-500/10 to-pink-500/10 rounded-bl-full -mr-4 -mt-4" />
                
                <div className="space-y-4 relative z-10">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Hash className="w-3 h-3" /> Booking ID{totalDays > 1 ? `s (${totalDays} days)` : ''}
                        </div>
                        <div className="text-xl font-mono font-bold text-slate-900">
                            {String(bookings.map(b => b.id).join(', '))}
                        </div>

                        {totalDays > 1 && (
                            <>
                                <div className="h-px bg-slate-200 mt-3 mb-1" />
                                <div className="text-[10px] font-medium text-mimos-600">
                                    {totalDays} separate records linked under group {String(primary?.group_id || '').substring(0, 8)}
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="h-px bg-slate-200" />
                    
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {primary?.status || 'Pending'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                <Button
                    variant="secondary"
                    onClick={() => navigate('/my-bookings')}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border-0"
                >
                    View Bookings
                </Button>
                <Button
                    onClick={() => navigate('/')}
                    className="flex-1 py-3 group shadow-md shadow-mimos-500/20"
                >
                    New Search
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
