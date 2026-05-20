/**
 * localStorage key constants for auth sessions.
 *
 * User and admin sessions are stored under SEPARATE keys so logging
 * in as an admin never overwrites / contaminates the user session.
 */
export const USER_TOKEN_KEY  = 'auth_token';
export const USER_DATA_KEY   = 'auth_user';
export const ADMIN_TOKEN_KEY = 'admin_token';
export const ADMIN_DATA_KEY  = 'admin_user';
