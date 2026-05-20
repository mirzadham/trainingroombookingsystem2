/**
 * API Service — Barrel re-export
 *
 * This file re-exports all domain-specific API modules so existing imports
 * (`import * as api from '../services/api'`) continue to work unchanged.
 *
 * For new code, prefer importing from domain-specific modules directly:
 *   import { createBooking } from '../services/bookingApi';
 *   import { login } from '../services/authApi';
 */

export { login, register, adminLogin, logout, adminLogout, getUser, getAdminUser, updateProfile, updatePassword, forgotPassword, resetPassword } from './authApi';

export { getBookings, createBooking, getBooking, updateBooking, cancelBooking, createRecurringBooking } from './bookingApi';
export { getPublicRooms, getPublicRoom, getRoomsWithTimeline, getAdminRooms, createRoom, updateRoom, deleteRoom } from './roomApi';
export { getAdminBookings, approveBooking, rejectBooking, adminUpdateBooking, getAdminDashboard, getUtilizationReport, getPeakHoursReport, batchApproveBookings, batchRejectBookings, getAuditLogs, getRoomBlackouts, createRoomBlackout, deleteRoomBlackout } from './adminApi';
export { searchAvailability, getTimeline, getSuggestions, getLocations, getCalendarEvents } from './availabilityApi';

// Re-export the shared client as default for any direct usage
export { default } from './apiClient';
