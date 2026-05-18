import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';

const SESSION_KEY = 'booking_draft';

export default function DetailsStep({ form }) {
    const { title, setTitle, description, setDescription, attendees, setAttendees, endDate, setEndDate, roomInfo, canProceedToAccount, handleNext } = form;
    const titleRef = useRef(null);
    const [showEndPanel, setShowEndPanel] = useState(!!endDate);

    useEffect(() => {
        if (titleRef.current) titleRef.current.focus();
    }, []);

    const cap = parseInt(roomInfo.capacity || 9999);
    const att = parseInt(attendees || 0);
    const isOverCapacity = attendees && att > cap;

    const handleToggleMultiDay = () => {
        if (showEndPanel) return;
        setEndDate(null);
        setShowEndPanel(true);
    };

    const handleCloseEndPanel = () => {
        if (!endDate) setEndDate('');
        setShowEndPanel(false);
    };

    return (
        <div className='space-y-6'>
            <div>
                <h2 className='text-xl font-extrabold text-slate-900'>Booking Details</h2>
                <p className='text-sm text-slate-500 mt-1'>What is the purpose of this booking?</p>
            </div>

            <div className='space-y-5'>
                <Input
                    ref={titleRef}
                    label='Title / Purpose *'
                    type='text'
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder='e.g. AI Workshop Session 3'
                />

                <div>
                    <label className='block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider'>Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder='Optional — describe the purpose, required equipment, etc.'
                        rows={3}
                        className='w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition resize-none'
                    />
                </div>

                <div>
                    <Input
                        label='Number of Attendees *'
                        type='number'
                        value={attendees}
                        onChange={e => setAttendees(e.target.value)}
                        min='1'
                        max={roomInfo.capacity}
                        placeholder={`Max ${roomInfo.capacity}`}
                    />
                    {isOverCapacity && (
                        <p className='mt-1.5 text-xs text-red-500 font-medium'>Attendees cannot exceed room capacity ({roomInfo.capacity}).</p>
                    )}
                </div>

                <div className='space-y-2'>
                    {endDate !== roomInfo.date ? (
                        <div className='p-4 rounded-xl bg-mimos-50/50 border border-mimos-100'>
                            <div className='flex items-center gap-2 mb-2'>
                                <CalendarPlus className='w-4 h-4 text-mimos-600' />
                                <span className='text-xs font-bold text-mimos-700 uppercase tracking-wider'>Multi-day Booking</span>
                            </div>
                            <div className='flex items-center gap-3'>
                                <div className='flex-1'>
                                    <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1'>End Date</label>
                                    <DatePicker
                                        value={endDate || roomInfo.date || ''}
                                        onChange={(val) => {
                                            setEndDate(val || null);
                                            if (val) setShowEndPanel(false);
                                        }}
                                        min={roomInfo.date || ''}
                                    />
                                </div>
                                <button
                                    type='button'
                                    onClick={handleCloseEndPanel}
                                    className='mt-5 text-xs text-slate-400 hover:text-red-500 transition-colors'
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type='button'
                            onClick={handleToggleMultiDay}
                            className='flex items-center gap-2 text-sm text-mimos-600 hover:text-mimos-700 font-medium transition-colors'
                        >
                            <CalendarPlus className='w-4 h-4' />
                            Book consecutive days
                        </button>
                    )}
                </div>
            </div>

            <Button
                onClick={handleNext}
                disabled={!canProceedToAccount || isOverCapacity}
                size='lg'
                className='w-full group py-3 text-base'
            >
                Next Step
                <ArrowRight className='w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform' />
            </Button>
        </div>
    );
}