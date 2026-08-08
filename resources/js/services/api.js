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

export { getBookings, createBooking, getBooking, updateBooking, cancelBooking, createRecurringBooking, cancelBookingSeries } from './bookingApi';
export { getPublicRooms, getPublicRoom, getRoomsWithTimeline, getAdminRooms, createRoom, updateRoom, deleteRoom, toggleRoomActive, uploadRoomImages, deleteRoomImage, setRoomPrimaryImage } from './roomApi';
export { getAdminBookings, exportAdminBookings, exportAdminAuditLogs, approveBooking, rejectBooking, adminUpdateBooking, adminCancelBooking, adminCancelBookingSeries, markBookingAttendance, getAdminDashboard, getUtilizationReport, getPeakHoursReport, batchApproveBookings, batchRejectBookings, getAuditLogs, getRoomBlackouts, createRoomBlackout, deleteRoomBlackout, adminSearchUsers, adminCreateBooking, getAdminCalendarEvents, getAdminCalendarSeries } from './adminApi';
export { searchAvailability, getTimeline, getSuggestions, getLocations, getCalendarEvents, getCalendarSubscription, regenerateCalendarSubscription } from './availabilityApi';
export { getUsers, updateUser, toggleUserStatus, getAdminInvitations, inviteAdmin, resendInvite, revokeInvite, validateInviteToken, claimInvite } from './userApi';
export { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from './notificationApi';
export { getMyWaitlist, joinWaitlist, leaveWaitlist } from './waitlistApi';
export { getFavorites, addFavorite, removeFavorite } from './favoriteApi';

// Re-export the shared client as default for any direct usage
export { default } from './apiClient';
