import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Loader2, DoorOpen, Users, MapPin, X, CalendarOff } from 'lucide-react';
import * as api from '../../services/api';
import BlackoutsModal from '../../components/admin/BlackoutsModal';

export default function AdminRooms() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [selectedRoomForBlackout, setSelectedRoomForBlackout] = useState(null);

    const { data: rooms, isLoading } = useQuery({
        queryKey: ['admin-rooms'],
        queryFn: api.getAdminRooms,
    });

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
    });

    const createMutation = useMutation({
        mutationFn: api.createRoom,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-rooms'] }); setShowForm(false); },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.updateRoom(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-rooms'] }); setEditingRoom(null); },
    });

    const deleteMutation = useMutation({
        mutationFn: api.deleteRoom,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-rooms'] }),
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manage Rooms</h1>
                    <p className="text-sm text-slate-500 mt-1">Add, edit, or deactivate training rooms</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-mimos-500 to-pink-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-mimos-500/25 transition cursor-pointer"
                >
                    <Plus className="w-4 h-4" /> Add Room
                </button>
            </div>

            {/* Add Room Form */}
            {showForm && (
                <RoomForm
                    locations={locations || []}
                    onSubmit={(data) => createMutation.mutate(data)}
                    onCancel={() => setShowForm(false)}
                    isLoading={createMutation.isPending}
                />
            )}

            {/* Edit Room Form */}
            {editingRoom && (
                <RoomForm
                    room={editingRoom}
                    locations={locations || []}
                    onSubmit={(data) => updateMutation.mutate({ id: editingRoom.id, data })}
                    onCancel={() => setEditingRoom(null)}
                    isLoading={updateMutation.isPending}
                />
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-mimos-400 animate-spin" />
                </div>
            )}

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(rooms || []).map((room) => (
                    <div key={room.id} className={`bg-white border border-slate-200 shadow-sm rounded-2xl p-5 transition ${!room.is_active ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">{room.name}</h3>
                                <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                    <MapPin className="w-3 h-3" />{room.location?.code || room.location?.name}
                                </span>
                            </div>
                            {!room.is_active && (
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                    Inactive
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.capacity} seats</span>
                        </div>

                        {room.amenities?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                                {room.amenities.map(a => (
                                    <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                        {a.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                            <button
                                onClick={() => setEditingRoom(room)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                            >
                                <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                                onClick={() => setSelectedRoomForBlackout(room)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg transition cursor-pointer"
                            >
                                <CalendarOff className="w-3.5 h-3.5" /> Blackouts
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(room.id)}
                                disabled={deleteMutation.isPending}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                            >
                                <Trash2 className="w-3 h-3" /> Deactivate
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Blackout override modal */}
            {selectedRoomForBlackout && (
                <BlackoutsModal
                    room={selectedRoomForBlackout}
                    onClose={() => setSelectedRoomForBlackout(null)}
                />
            )}

        </div>
    );
}

function RoomForm({ room, locations, onSubmit, onCancel, isLoading }) {
    const [name, setName] = useState(room?.name || '');
    const [locationId, setLocationId] = useState(room?.location_id || '');
    const [capacity, setCapacity] = useState(room?.capacity || '');
    const [description, setDescription] = useState(room?.description || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            name,
            location_id: parseInt(locationId),
            capacity: parseInt(capacity),
            description: description || null,
        });
    };

    return (
        <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{room ? 'Edit Room' : 'Add New Room'}</h3>
                <button onClick={onCancel} className="text-slate-600 hover:text-slate-900 transition cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Room Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Location</label>
                    <select value={locationId} onChange={e => setLocationId(e.target.value)} required
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 appearance-none cursor-pointer">
                        <option value="" className="bg-white">Select...</option>
                        {locations.map(loc => <option key={loc.id} value={loc.id} className="bg-white">{loc.name} ({loc.code})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Capacity</label>
                    <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} required min="1"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                    <button type="button" onClick={onCancel} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
                    <button type="submit" disabled={isLoading}
                        className="px-6 py-2.5 bg-gradient-to-r from-mimos-500 to-pink-600 text-white font-medium rounded-xl disabled:opacity-50 transition cursor-pointer">
                        {isLoading ? 'Saving...' : room ? 'Update Room' : 'Create Room'}
                    </button>
                </div>
            </form>
        </div>
    );
}
