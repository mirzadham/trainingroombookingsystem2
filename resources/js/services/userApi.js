import api from './apiClient';

/**
 * Administrative User Management API endpoints.
 * Only accessible by authenticated Super Admins.
 */

// Retrieve paginated list of active users
export const getUsers = (params) =>
    api.get('/admin/users', { params }).then(r => r.data);

// Update user details and role scope
export const updateUser = (id, data) =>
    api.put(`/admin/users/${id}`, data).then(r => r.data);

// Suspend or reactivate user account
export const toggleUserStatus = (id) =>
    api.post(`/admin/users/${id}/toggle-status`).then(r => r.data);

// Fetch outstanding, unclaimed invitations
export const getAdminInvitations = () =>
    api.get('/admin/users/invitations').then(r => r.data);

// Create and send a new admin invitation
export const inviteAdmin = (data) =>
    api.post('/admin/users/invite', data).then(r => r.data);

// Resend/renew a pending invitation token
export const resendInvite = (id) =>
    api.post(`/admin/users/invitations/${id}/resend`).then(r => r.data);

// Revoke/cancel a pending invitation token
export const revokeInvite = (id) =>
    api.delete(`/admin/users/invitations/${id}`).then(r => r.data);

/**
 * Public Authentication Invitation API endpoints.
 * No dashboard authorization is required to claim an invitation.
 */

// Validate the incoming setup link token
export const validateInviteToken = (token) =>
    api.post('/auth/invitations/validate', { token }).then(r => r.data);

// Redeem the token to setup the admin account
export const claimInvite = (data) =>
    api.post('/auth/invitations/claim', data).then(r => r.data);
