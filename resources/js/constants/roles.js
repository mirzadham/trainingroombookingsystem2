export const ROLES = {
    USER: 'user',
    LOCATION_ADMIN: 'location_admin',
    ROOM_ADMIN: 'room_admin',
    SUPER_ADMIN: 'super_admin',
};

export const isAdminRole = (role) =>
    role === ROLES.LOCATION_ADMIN || role === ROLES.ROOM_ADMIN || role === ROLES.SUPER_ADMIN;
