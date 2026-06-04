/**
 * Returns the base path for the application.
 * 
 * In production (subdirectory deployment like /roombooking/),
 * set VITE_BASE_PATH=/roombooking in .env before building.
 * Locally, it defaults to '' (empty string = root).
 */
const raw = import.meta.env.VITE_BASE_PATH || '';

// Ensure no trailing slash for path concatenation (e.g. '/roombooking' not '/roombooking/')
export const BASE_PATH = raw.endsWith('/') ? raw.slice(0, -1) : raw;

/**
 * Prepends the base path to a given asset/image path.
 * Usage: assetPath('/images/rooms/photo.png') → '/roombooking/images/rooms/photo.png'
 */
export function assetPath(path) {
    if (!BASE_PATH) return path;
    // Avoid double-prefixing
    if (path.startsWith(BASE_PATH)) return path;
    return `${BASE_PATH}${path}`;
}
