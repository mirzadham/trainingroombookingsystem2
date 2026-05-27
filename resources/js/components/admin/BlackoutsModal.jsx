import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Trash2, Plus, AlertCircle, Loader2, CalendarOff } from 'lucide-react';
import * as api from '../../services/api';

export default function BlackoutsModal({ room, onClose }) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [formError, setFormError] = useState('');

    // Fetch blackouts for the selected room
    const { data: blackouts, isLoading, error } = useQuery({
        queryKey: ['room-blackouts', room.id],
        queryFn: () => api.getRoomBlackouts(room.id),
    });

    // Create a new blackout window
    const createMutation = useMutation({
        mutationFn: (data) => api.createRoomBlackout(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-blackouts', room.id] });
            // Invalidate admin-rooms and calendar queries to reflect availability changes
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
            setTitle('');
            setDescription('');
            setStartTime('');
            setEndTime('');
            setFormError('');
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.message || 'Failed to create blackout window';
            setFormError(msg);
        }
    });

    // Delete a blackout window
    const deleteMutation = useMutation({
        mutationFn: (id) => api.deleteRoomBlackout(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-blackouts', room.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
        },
        onError: (err) => {
            alert(err.response?.data?.message || err.message || 'Failed to remove blackout window');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');

        if (!title.trim()) {
            setFormError('Please enter a Title.');
            return;
        }
        if (!startTime) {
            setFormError('Please select a Start Time.');
            return;
        }
        if (!endTime) {
            setFormError('Please select an End Time.');
            return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end <= start) {
            setFormError('End Time must be after Start Time.');
            return;
        }

        createMutation.mutate({
            room_id: room.id,
            title: title.trim(),
            description: description.trim() || null,
            start_time: startTime.replace('T', ' ') + ':00', // Convert to YYYY-MM-DD HH:MM:SS format
            end_time: endTime.replace('T', ' ') + ':00',
        });
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-slide-up">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <CalendarOff className="w-5 h-5 text-pink-600" />
                            Manage Blackouts & Maintenance
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Schedule maintenance overrides for <span className="font-semibold text-slate-700">{room.name}</span> ({room.location?.name})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left Column: Form */}
                    <div className="flex-1 p-6 border-r border-slate-100 overflow-y-auto">
                        <h4 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Schedule Blackout Window</h4>
                        
                        {formError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Title / Purpose *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Scheduled IT Upgrades, AC Repair"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Additional context or notes regarding this lockout..."
                                    rows="3"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Start Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">End Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-mimos-500 hover:bg-mimos-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-mimos-500/20 hover:shadow-mimos-500/30 transition disabled:opacity-50 cursor-pointer"
                                >
                                    {createMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Scheduling...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Schedule Blackout
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Scheduled List */}
                    <div className="w-full md:w-1/2 p-6 bg-slate-50/50 overflow-y-auto flex flex-col">
                        <h4 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Active Blackout Windows</h4>

                        {isLoading && (
                            <div className="flex-1 flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-mimos-500 animate-spin" />
                                <span className="text-xs text-slate-400 mt-2">Loading blackouts...</span>
                            </div>
                        )}

                        {error && (
                            <div className="flex-1 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Failed to fetch active blackouts.</span>
                            </div>
                        )}

                        {!isLoading && !error && (!blackouts || blackouts.length === 0) && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-4">
                                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-sm font-medium text-slate-500">No scheduled blackouts</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Users can book this room freely during regular operating hours.</p>
                            </div>
                        )}

                        {!isLoading && !error && blackouts && blackouts.length > 0 && (
                            <div className="flex-1 space-y-3">
                                {blackouts.map((bo) => (
                                    <div
                                        key={bo.id}
                                        className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm hover:border-pink-200 transition group flex items-start justify-between gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-sm font-semibold text-slate-900 truncate">{bo.title}</h5>
                                            {bo.description && (
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{bo.description}</p>
                                            )}
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>Start: {formatDate(bo.start_time)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>End: {formatDate(bo.end_time)}</span>
                                                </div>
                                            </div>
                                            {bo.creator && (
                                                <div className="mt-2.5 text-[10px] text-slate-400">
                                                    Scheduled by: <span className="font-semibold">{bo.creator.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to remove this blackout window? This will immediately restore room availability.')) {
                                                    deleteMutation.mutate(bo.id);
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                            className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition cursor-pointer self-start shrink-0"
                                            title="Delete Blackout"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
