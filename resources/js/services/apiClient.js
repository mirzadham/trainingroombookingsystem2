import axios from 'axios';
import {
    USER_TOKEN_KEY, USER_DATA_KEY,
    ADMIN_TOKEN_KEY, ADMIN_DATA_KEY,
} from '../constants/authKeys';
import { BASE_PATH } from '../utils/basePath';

/**
 * Shared Axios instance with auth interceptors.
 * Domain-specific API modules import this client.
 */
const apiClient = axios.create({
    baseURL: `${BASE_PATH}/api`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

/**
 * Attach auth token to every request.
 *
 * If the request already has an explicit Authorization header (set by
 * admin-specific API helpers), we leave it alone.  Otherwise we pick
 * the right token based on the request URL:
 *   - /admin/* routes → admin_token
 *   - everything else → auth_token (user)
 */
apiClient.interceptors.request.use((config) => {
    // Skip if caller already set the header (e.g. getAdminUser, adminLogout)
    if (config.headers.Authorization) {
        return config;
    }

    const url = config.url || '';
    const isAdminRoute = url.startsWith('/admin');

    const token = isAdminRoute
        ? localStorage.getItem(ADMIN_TOKEN_KEY)
        : localStorage.getItem(USER_TOKEN_KEY);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses — clear only the relevant session
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            if (url.startsWith('/admin')) {
                localStorage.removeItem(ADMIN_TOKEN_KEY);
                localStorage.removeItem(ADMIN_DATA_KEY);
            } else {
                localStorage.removeItem(USER_TOKEN_KEY);
                localStorage.removeItem(USER_DATA_KEY);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
