import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { isAdminRole } from '../constants/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                // Verify token is still valid
                api.getUser()
                    .then(data => {
                        setUser(data.user);
                        localStorage.setItem('auth_user', JSON.stringify(data.user));
                    })
                    .catch(() => {
                        // Token expired
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('auth_user');
                        setUser(null);
                    })
                    .finally(() => setLoading(false));
            } catch {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        const data = await api.login({ email, password });
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const adminLogin = useCallback(async (email, password) => {
        const data = await api.adminLogin({ email, password });
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (formData) => {
        const data = await api.register(formData);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.logout();
        } catch {
            // Ignore errors on logout
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setUser(null);
    }, []);

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: isAdminRole(user?.role),
        isSuperAdmin: user?.role === 'super_admin',
        login,
        adminLogin,
        register,
        logout,
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
