import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Users, 
    UserPlus, 
    Edit2, 
    Loader2, 
    MapPin, 
    X, 
    Search, 
    Filter, 
    Mail, 
    RefreshCw, 
    Trash2, 
    UserCheck, 
    UserX, 
    ShieldAlert, 
    Building2 
} from 'lucide-react';
import * as api from '../../services/api';

export default function AdminUsers() {
    const queryClient = useQueryClient();
    
    // States
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'invitations'
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modal States
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Queries
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users', searchQuery, roleFilter, statusFilter, locationFilter, currentPage],
        queryFn: () => api.getUsers({
            search: searchQuery,
            role: roleFilter,
            status: statusFilter,
            location_id: locationFilter,
            page: currentPage
        }),
        enabled: activeTab === 'users',
    });

    const { data: invitations, isLoading: invitesLoading } = useQuery({
        queryKey: ['admin-invitations'],
        queryFn: api.getAdminInvitations,
        enabled: activeTab === 'invitations',
    });

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
    });

    // Mutations
    const inviteMutation = useMutation({
        mutationFn: api.inviteAdmin,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
            setShowInviteModal(false);
            alert(data.message || 'Invitation sent successfully!');
        },
        onError: (err) => {
            alert(err.response?.data?.message || 'Failed to send invitation. Please try again.');
        }
    });

    const resendInviteMutation = useMutation({
        mutationFn: api.resendInvite,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
            alert(data.message || 'Invitation resent and renewed!');
        },
        onError: (err) => {
            alert(err.response?.data?.message || 'Failed to resend invitation.');
        }
    });

    const revokeInviteMutation = useMutation({
        mutationFn: api.revokeInvite,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
            alert(data.message || 'Invitation revoked.');
        },
        onError: (err) => {
            alert(err.response?.data?.message || 'Failed to revoke invitation.');
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }) => api.updateUser(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setEditingUser(null);
            alert(data.message || 'User updated successfully.');
        },
        onError: (err) => {
            alert(err.response?.data?.message || 'Failed to update user.');
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: api.toggleUserStatus,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            alert(data.message || 'User status updated.');
        },
        onError: (err) => {
            alert(err.response?.data?.message || 'Action denied.');
        }
    });

    const handleInviteSubmit = (inviteData) => {
        inviteMutation.mutate(inviteData);
    };

    const handleUpdateSubmit = (updatedData) => {
        updateUserMutation.mutate({ id: editingUser.id, data: updatedData });
    };

    const formatRole = (role) => {
        if (role === 'super_admin') return 'Super Admin';
        if (role === 'location_admin') return 'Location Admin';
        return 'Regular User';
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="w-7 h-7 text-mimos-500" /> Administrative User Directory
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Invite administrators, promote privileges, or manage user account suspensions
                    </p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-mimos-500 hover:bg-mimos-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-mimos-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                    <UserPlus className="w-4 h-4" /> Invite Administrator
                </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                        activeTab === 'users'
                            ? 'border-mimos-500 text-mimos-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <UserCheck className="w-4 h-4" /> Active Users ({usersData?.total || 0})
                </button>
                <button
                    onClick={() => setActiveTab('invitations')}
                    className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                        activeTab === 'invitations'
                            ? 'border-mimos-500 text-mimos-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <Mail className="w-4 h-4" /> Pending Invitations ({invitations?.length || 0})
                </button>
            </div>

            {/* ACTIVE USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    {/* Filters Tray */}
                    <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, department, or phone..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={roleFilter}
                                onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-mimos-500/20 cursor-pointer appearance-none min-w-[130px]"
                            >
                                <option value="">All Roles</option>
                                <option value="super_admin">Super Admins</option>
                                <option value="location_admin">Location Admins</option>
                                <option value="user">Regular Users</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-mimos-500/20 cursor-pointer appearance-none min-w-[120px]"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>

                            <select
                                value={locationFilter}
                                onChange={e => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-mimos-500/20 cursor-pointer appearance-none min-w-[150px]"
                            >
                                <option value="">All Locations</option>
                                {locations?.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table / Grid */}
                    {usersLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="w-8 h-8 text-mimos-500 animate-spin" />
                        </div>
                    ) : usersData?.data?.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-semibold text-slate-800">No active users found</h3>
                            <p className="text-sm text-slate-400 mt-1">Try resetting your filters or invite a new administrator.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/70 border-b border-slate-200/85 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <th className="px-6 py-4">User Details</th>
                                            <th className="px-6 py-4">Role Privileges</th>
                                            <th className="px-6 py-4">Department & Phone</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                        {usersData.data.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900">{user.name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit border ${
                                                            user.role === 'super_admin'
                                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                                : user.role === 'location_admin'
                                                                ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                                                                : 'bg-slate-100 border-slate-200 text-slate-600'
                                                        }`}>
                                                            {formatRole(user.role)}
                                                        </span>
                                                        {user.role === 'location_admin' && (
                                                            <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium pl-1">
                                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                                {user.location?.name || 'No Location Scope'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-800 font-medium">{user.department || '—'}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{user.phone || '—'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                                        user.status === 'suspended'
                                                            ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                                                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                    }`}>
                                                        {user.status === 'suspended' ? 'Suspended' : 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingUser(user)}
                                                            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                                                            title="Edit Details"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const act = user.status === 'suspended' ? 'reactivate' : 'suspend';
                                                                if (confirm(`Are you sure you want to ${act} user "${user.name}"?`)) {
                                                                    toggleStatusMutation.mutate(user.id);
                                                                }
                                                            }}
                                                            disabled={toggleStatusMutation.isPending}
                                                            className={`p-2 rounded-lg border transition cursor-pointer ${
                                                                user.status === 'suspended'
                                                                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                                                    : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
                                                            }`}
                                                            title={user.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                                                        >
                                                            {user.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination */}
                            {usersData.last_page > 1 && (
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <span className="text-xs text-slate-500 font-medium">
                                        Showing page {usersData.current_page} of {usersData.last_page}
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 transition cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, usersData.last_page))}
                                            disabled={currentPage === usersData.last_page}
                                            className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 transition cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* PENDING INVITATIONS TAB */}
            {activeTab === 'invitations' && (
                <div className="space-y-4">
                    {invitesLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="w-8 h-8 text-mimos-500 animate-spin" />
                        </div>
                    ) : !invitations || invitations.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
                            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
                            <h3 className="text-base font-semibold text-slate-800">No pending invitations</h3>
                            <p className="text-sm text-slate-400 mt-1">There are no administrators with outstanding tokens awaiting completion.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/70 border-b border-slate-200/85 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <th className="px-6 py-4">Invited Email</th>
                                            <th className="px-6 py-4">Assigned Role</th>
                                            <th className="px-6 py-4">Token Expiration</th>
                                            <th className="px-6 py-4">Invited By</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                        {invitations.map(invite => {
                                            const isExpired = new Date(invite.expires_at) < new Date();
                                            return (
                                                <tr key={invite.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-slate-900">{invite.email}</div>
                                                        <div className="text-[10px] text-slate-400/80 font-mono mt-0.5 overflow-hidden text-ellipsis max-w-[200px]" title={invite.token}>
                                                            Token: {invite.token.substring(0, 15)}...
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit border ${
                                                                invite.role === 'super_admin'
                                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                                    : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                                                            }`}>
                                                                {formatRole(invite.role)}
                                                            </span>
                                                            {invite.role === 'location_admin' && (
                                                                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium pl-1">
                                                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                                    {invite.location?.name || 'No Scope'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-800">
                                                                {new Date(invite.expires_at).toLocaleDateString()} at {new Date(invite.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className={`text-[10px] uppercase font-bold mt-0.5 w-fit ${isExpired ? 'text-red-600' : 'text-slate-400'}`}>
                                                                {isExpired ? 'Expired' : 'Pending Redemption'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-medium text-slate-700">{invite.inviter?.name || 'Super Admin'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`Resend and renew the invitation for "${invite.email}"?`)) {
                                                                        resendInviteMutation.mutate(invite.id);
                                                                    }
                                                                }}
                                                                disabled={resendInviteMutation.isPending}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-medium transition cursor-pointer"
                                                                title="Resend/Renew Invite"
                                                            >
                                                                <RefreshCw className="w-3 h-3" /> Resend
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`Are you sure you want to revoke/cancel the invitation for "${invite.email}"?`)) {
                                                                        revokeInviteMutation.mutate(invite.id);
                                                                    }
                                                                }}
                                                                disabled={revokeInviteMutation.isPending}
                                                                className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                                                                title="Revoke Invite"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* INVITE ADMIN MODAL */}
            {showInviteModal && (
                <InviteAdminModal
                    locations={locations || []}
                    onClose={() => setShowInviteModal(false)}
                    onSubmit={handleInviteSubmit}
                    isLoading={inviteMutation.isPending}
                />
            )}

            {/* EDIT USER DETAILS MODAL */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    locations={locations || []}
                    onClose={() => setEditingUser(null)}
                    onSubmit={handleUpdateSubmit}
                    isLoading={updateUserMutation.isPending}
                />
            )}
        </div>
    );
}

/* 
 * INVITE ADMIN SUB-MODAL COMPONENT 
 */
function InviteAdminModal({ locations, onClose, onSubmit, isLoading }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('location_admin');
    const [locationId, setLocationId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (role === 'location_admin' && !locationId) {
            alert('Please select an assigned location scope.');
            return;
        }
        onSubmit({
            email,
            role,
            location_id: role === 'location_admin' ? parseInt(locationId) : null
        });
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-200/70 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Invite Administrator</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Send a claim invitation to a staff colleague</p>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            required
                            placeholder="e.g. staff.name@mimos.my"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Role Scope</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setRole('location_admin')}
                                className={`px-4 py-3 border text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                    role === 'location_admin'
                                        ? 'bg-cyan-50/40 border-cyan-400 text-cyan-700 shadow-xs'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                <Building2 className="w-4 h-4 shrink-0" />
                                Location Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('super_admin')}
                                className={`px-4 py-3 border text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                    role === 'super_admin'
                                        ? 'bg-indigo-50/40 border-indigo-400 text-indigo-700 shadow-xs'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                Super Admin
                            </button>
                        </div>
                    </div>

                    {role === 'location_admin' && (
                        <div className="animate-slide-down">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Assigned Location Scope</label>
                            <select
                                value={locationId}
                                onChange={e => setLocationId(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 appearance-none cursor-pointer"
                            >
                                <option value="">Select building location...</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Footer buttons */}
                    <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition font-medium cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-mimos-500 hover:bg-mimos-600 text-white font-semibold rounded-xl disabled:opacity-50 transition cursor-pointer"
                        >
                            {isLoading ? 'Sending...' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* 
 * EDIT USER DETAIL SUB-MODAL COMPONENT 
 */
function EditUserModal({ user, locations, onClose, onSubmit, isLoading }) {
    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [role, setRole] = useState(user.role || 'user');
    const [userType, setUserType] = useState(user.user_type || 'internal');
    const [locationId, setLocationId] = useState(user.location_id || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [department, setDepartment] = useState(user.department || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            name,
            email,
            role,
            user_type: userType,
            location_id: role === 'location_admin' ? parseInt(locationId) : null,
            phone: phone || null,
            department: department || null,
        });
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all">
                {/* Header */}
                <div className="p-6 border-b border-slate-200/70 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Modify User Account</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Edit privileges, locations, or corporate details</p>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">User Type</label>
                            <select
                                value={userType}
                                onChange={e => setUserType(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 appearance-none cursor-pointer"
                            >
                                <option value="internal">Internal (MIMOS Staff)</option>
                                <option value="external">External Guest</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Role Scope</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 appearance-none cursor-pointer"
                            >
                                <option value="user">Regular User</option>
                                <option value="location_admin">Location Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>

                        {role === 'location_admin' && (
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Assigned Location Scope</label>
                                <select
                                    value={locationId}
                                    onChange={e => setLocationId(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 appearance-none cursor-pointer"
                                >
                                    <option value="">Select location...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Department</label>
                            <input
                                type="text"
                                placeholder="e.g. IT, R&D"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Phone Number</label>
                            <input
                                type="text"
                                placeholder="e.g. +6012345678"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition font-medium cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-mimos-500 hover:bg-mimos-600 text-white font-semibold rounded-xl disabled:opacity-50 transition cursor-pointer"
                        >
                            {isLoading ? 'Saving...' : 'Update Details'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
