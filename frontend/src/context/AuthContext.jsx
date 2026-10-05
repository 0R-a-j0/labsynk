import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// Role hierarchy for permission checks
const ROLE_LEVELS = {
    student: 0,
    assistant: 1,
    hod: 2,
    principal: 3,
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('labsynk_token'));

    useEffect(() => {
        let active = true;
        const savedToken = localStorage.getItem('labsynk_token');
        const restoreSession = async () => {
            try {
                const data = savedToken ? await api.checkAuth(savedToken) : { authenticated: false };
                if (!active) return;
                if (data.authenticated) {
                    setUser(data.user);
                    setToken(savedToken);
                } else {
                    localStorage.removeItem('labsynk_token');
                    setToken(null);
                    setUser(null);
                }
            } catch {
                if (!active) return;
                localStorage.removeItem('labsynk_token');
                setToken(null);
                setUser(null);
            } finally {
                if (active) setLoading(false);
            }
        };
        restoreSession();
        return () => { active = false; };
    }, []);

    const login = async (email, password) => {
        const data = await api.login(email, password);
        localStorage.setItem('labsynk_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('labsynk_token');
        setToken(null);
        setUser(null);
    };

    // Permission checks
    const isAuthenticated = () => !!user;

    const hasRole = (requiredRole) => {
        if (!user || !(requiredRole in ROLE_LEVELS)) return false;
        const userLevel = ROLE_LEVELS[user.role] ?? -1;
        const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
        return userLevel >= requiredLevel;
    };

    const canEdit = () => hasRole('assistant');  // Lab assistants and above can edit
    const canUploadSyllabus = () => hasRole('assistant');
    const canAccessAdmin = () => hasRole('hod');  // HOD and Principal can access admin
    const isPrincipal = () => hasRole('principal');

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated,
        hasRole,
        canEdit,
        canUploadSyllabus,
        canAccessAdmin,
        isPrincipal,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
