export const ROLES = {
    USER: 'user',
    LOCATION_ADMIN: 'location_admin',
    SUPER_ADMIN: 'super_admin',
};

export const isAdminRole = (role) =>
    role === ROLES.LOCATION_ADMIN || role === ROLES.SUPER_ADMIN;
