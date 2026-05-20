import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    History, Search, Filter, Clock, Globe, User as UserIcon, Calendar, 
    ArrowRight, CheckCircle, XCircle, AlertTriangle, FileText, ChevronDown, 
    ChevronUp, RefreshCw, Loader2, Eye
} from 'lucide-react';
import * as api from '../../services/api';

const ACTION_CONFIGS = {
    created: {
        label: 'Created',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: FileText,
        desc: 'Booking request created',
    },
    approved: {
        label: 'Approved',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
        desc: 'Booking request approved',
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: XCircle,
        desc: 'Booking request rejected',
    },
    admin_updated: {
        label: 'Admin Updated',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: History,
        desc: 'Booking updated by admin',
    },
    updated: {
        label: 'User Updated',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: History,
        desc: 'Booking updated by user',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: AlertTriangle,
        desc: 'Booking cancelled',
    },
};

export default function AuditLogs() {
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [searchVal, setSearchVal] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);

    // Fetch Audit Logs
    const { data: logData, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['audit-logs', page, actionFilter, searchQuery],
        queryFn: () => api.getAuditLogs({
            page,
            action: actionFilter || undefined,
            search: searchQuery || undefined
        }),
    });

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        setSearchQuery(searchVal);
    };

    const handleActionFilterChange = (val) => {
        setPage(1);
        setActionFilter(val);
    };

    const toggleExpandLog = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatTimeOnly = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatPropertyLabel = (prop) => {
        return prop
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    const renderDiffValue = (key, val) => {
        if (val === null || val === undefined) return <span className="text-slate-400 italic">None</span>;
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (key.includes('time') && typeof val === 'string') {
            return formatDateTime(val);
        }
        return String(val);
    };

    const logs = logData?.data || [];
    const totalLogs = logData?.total || 0;
    const fromIndex = logData?.from || 0;
    const toIndex = logData?.to || 0;
    const totalPages = logData?.last_page || 1;

    return (
        <div className="pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-6 h-6 text-pink-600" />
                        Audit Logs Timeline
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Review operational actions, administrator decisions, and changes across all room reservations</p>
                </div>
                <button 
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                    <input
                        type="text"
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        placeholder="Search IP, user name, booking title..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <button type="submit" className="hidden">Search</button>
                </form>

                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:inline">Filter By Action:</span>
                        <select
                            value={actionFilter}
                            onChange={(e) => handleActionFilterChange(e.target.value)}
                            className="flex-1 sm:flex-initial px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 cursor-pointer appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23708090%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65em_auto] bg-[right_10px_center] bg-no-repeat"
                        >
                            <option value="">All Actions</option>
                            <option value="created">Created</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="admin_updated">Admin Updated</option>
                            <option value="updated">User Updated</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
                    <span className="text-sm font-medium text-slate-500 mt-3">Fetching audit timeline...</span>
                </div>
            ) : error ? (
                <div className="p-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-3xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Error Loading Audit Logs</p>
                        <p className="text-xs text-red-600 mt-1">{error.message || 'An unexpected error occurred. Please try again.'}</p>
                    </div>
                </div>
            ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm px-6">
                    <History className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-bold text-slate-700">No logs found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">No operational records were found matching your current filter criteria.</p>
                </div>
            ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-8 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {/* Log Timeline Cards */}
                    {logs.map((log) => {
                        const config = ACTION_CONFIGS[log.action] || {
                            label: log.action.toUpperCase(),
                            color: 'bg-slate-100 text-slate-700 border-slate-200',
                            icon: FileText,
                            desc: 'System event',
                        };
                        const ActionIcon = config.icon;
                        const isExpanded = expandedLogId === log.id;
                        const hasChanges = log.changes && Object.keys(log.changes).length > 0;

                        return (
                            <div key={log.id} className="relative pl-16 group transition duration-300">
                                {/* Timeline Indicator Dot */}
                                <div className="absolute left-4 top-4 transform -translate-x-1/2 z-10">
                                    <div className={`w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center ${config.color} shrink-0 transition duration-300 group-hover:scale-110`}>
                                        <ActionIcon className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Timeline Card */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 hover:border-slate-300">
                                    {/* Meta Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 border rounded-full ${config.color}`}>
                                                {config.label}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <UserIcon className="w-3.5 h-3.5" />
                                                <span className="font-semibold text-slate-700">{log.user?.name || 'System / Auto'}</span>
                                                <span className="text-[10px] text-slate-400">({log.user?.email || 'automated@mimos.gov.my'})</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1.5 font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDateTime(log.created_at)}
                                            </span>
                                            {log.ip_address && (
                                                <span className="flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono text-[10px]">
                                                    <Globe className="w-3 h-3 text-slate-400" />
                                                    {log.ip_address}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Booking Reference Details */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {log.booking ? (
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                                        Booking: <span className="text-pink-600 hover:underline cursor-pointer">{log.booking.title}</span>
                                                        <span className="text-xs font-normal text-slate-400">({log.booking.room?.name || 'Unknown Room'})</span>
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span>
                                                            {new Date(log.booking.start_time).toLocaleDateString()} at {formatTimeOnly(log.booking.start_time)} - {formatTimeOnly(log.booking.end_time)}
                                                        </span>
                                                        {log.booking.room?.location && (
                                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                                                                {log.booking.room.location.name}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-400 italic">Booking Ref #ID {log.booking_id} (Deleted / Unavailable)</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">{config.desc}</p>
                                                </div>
                                            )}
                                        </div>

                                        {hasChanges && (
                                            <button
                                                onClick={() => toggleExpandLog(log.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer self-start md:self-center font-semibold"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                {isExpanded ? 'Hide Details' : 'View Changes'}
                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Expandable Changes Area */}
                                    {isExpanded && hasChanges && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 animate-slide-down">
                                            {log.action === 'rejected' && log.changes.rejection_reason && (
                                                <div className="bg-rose-50/50 border-l-4 border-rose-500 p-4 rounded-r-xl">
                                                    <span className="block text-[10px] uppercase font-bold tracking-wider text-rose-700">Rejection Reason Provided:</span>
                                                    <p className="text-sm text-rose-950 mt-1 italic font-medium">"{log.changes.rejection_reason}"</p>
                                                </div>
                                            )}

                                            {(log.action === 'admin_updated' || log.action === 'updated') && log.changes.before && log.changes.after && (
                                                <div>
                                                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">Visual Property Audit Diff</span>
                                                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
                                                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                                                            <thead className="bg-slate-100 font-bold text-slate-700">
                                                                <tr>
                                                                    <th scope="col" className="px-4 py-2 text-left">Property Field</th>
                                                                    <th scope="col" className="px-4 py-2 text-left w-1/2">Before Value (Old)</th>
                                                                    <th scope="col" className="px-4 py-2 text-left w-1/2">After Value (New)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-150 bg-white">
                                                                {Object.keys(log.changes.after).map((key) => {
                                                                    const beforeVal = log.changes.before[key];
                                                                    const afterVal = log.changes.after[key];
                                                                    const isChanged = String(beforeVal) !== String(afterVal);

                                                                    return (
                                                                        <tr key={key} className={isChanged ? 'bg-amber-50/20' : ''}>
                                                                            <td className="px-4 py-2.5 font-semibold text-slate-700">
                                                                                {formatPropertyLabel(key)}
                                                                            </td>
                                                                            <td className={`px-4 py-2.5 ${isChanged ? 'text-red-700 bg-red-50/40 line-through rounded-l' : 'text-slate-500'}`}>
                                                                                {renderDiffValue(key, beforeVal)}
                                                                            </td>
                                                                            <td className={`px-4 py-2.5 ${isChanged ? 'text-emerald-800 bg-emerald-50/40 font-semibold rounded-r' : 'text-slate-500'}`}>
                                                                                <div className="flex items-center gap-1">
                                                                                    {isChanged && <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                                                                    <span>{renderDiffValue(key, afterVal)}</span>
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

                                            {/* General Fallback Changes Viewer */}
                                            {log.action !== 'rejected' && log.action !== 'admin_updated' && log.action !== 'updated' && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-[11px] text-slate-700 overflow-x-auto">
                                                    <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm mt-4">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs text-slate-500">
                                        Showing <span className="font-semibold text-slate-800">{fromIndex}</span> to <span className="font-semibold text-slate-800">{toIndex}</span> of{' '}
                                        <span className="font-semibold text-slate-800">{totalLogs}</span> entries
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center rounded-l-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:z-20 cursor-pointer disabled:opacity-40"
                                        >
                                            Previous
                                        </button>
                                        
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                                            <button
                                                key={pNum}
                                                onClick={() => setPage(pNum)}
                                                className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium focus:z-20 cursor-pointer ${
                                                    pNum === page
                                                        ? 'z-10 bg-pink-50 border-pink-500 text-pink-700'
                                                        : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'
                                                }`}
                                            >
                                                {pNum}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                            disabled={page === totalPages}
                                            className="relative inline-flex items-center rounded-r-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:z-20 cursor-pointer disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
