import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { isAdminRole } from '../constants/roles';
import {
    USER_TOKEN_KEY, USER_DATA_KEY,
    ADMIN_TOKEN_KEY, ADMIN_DATA_KEY,
} from '../constants/authKeys';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [adminUser, setAdminUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore both sessions on mount
    useEffect(() => {
        const userToken  = localStorage.getItem(USER_TOKEN_KEY);
        const savedUser  = localStorage.getItem(USER_DATA_KEY);
        const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
        const savedAdmin = localStorage.getItem(ADMIN_DATA_KEY);

        const promises = [];

        if (userToken && savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch {}
            promises.push(
                api.getUser()
                    .then(data => {
                        setUser(data.user);
                        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
                    })
                    .catch(() => {
                        localStorage.removeItem(USER_TOKEN_KEY);
                        localStorage.removeItem(USER_DATA_KEY);
                        setUser(null);
                    })
            );
        }

        if (adminToken && savedAdmin) {
            try { setAdminUser(JSON.parse(savedAdmin)); } catch {}
            // Reuse getUser with admin token — interceptor picks it up per-request
            promises.push(
                api.getAdminUser()
                    .then(data => {
                        setAdminUser(data.user);
                        localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(data.user));
                    })
                    .catch(() => {
                        localStorage.removeItem(ADMIN_TOKEN_KEY);
                        localStorage.removeItem(ADMIN_DATA_KEY);
                        setAdminUser(null);
                    })
            );
        }

        Promise.allSettled(promises).finally(() => setLoading(false));
    }, []);

    // Regular user login — writes ONLY to user keys
    const login = useCallback(async (email, password) => {
        const data = await api.login({ email, password });
        localStorage.setItem(USER_TOKEN_KEY, data.token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    // Admin login — writes ONLY to admin keys
    const adminLogin = useCallback(async (email, password) => {
        const data = await api.adminLogin({ email, password });
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(data.user));
        setAdminUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (formData) => {
        const data = await api.register(formData);
        localStorage.setItem(USER_TOKEN_KEY, data.token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    // User logout — clears ONLY user keys
    const logout = useCallback(async () => {
        try { await api.logout(); } catch {}
        localStorage.removeItem(USER_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        setUser(null);
    }, []);

    const updateProfile = useCallback(async (formData) => {
        const data = await api.updateProfile(formData);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const updatePassword = useCallback(async (formData) => {
        const data = await api.updatePassword(formData);
        return data;
    }, []);

    // Admin logout — clears ONLY admin keys
    const adminLogout = useCallback(async () => {
        try { await api.adminLogout(); } catch {}
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_DATA_KEY);
        setAdminUser(null);
    }, []);

    const value = {
        // User session
        user,
        isAuthenticated: !!user,
        isAdmin: isAdminRole(user?.role),

        // Admin session (separate)
        adminUser,
        isAdminAuthenticated: !!adminUser,
        isSuperAdmin: adminUser?.role === 'super_admin',

        loading,
        login,
        adminLogin,
        register,
        logout,
        adminLogout,
        updateProfile,
        updatePassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
