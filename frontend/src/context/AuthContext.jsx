/**
 * AuthContext.jsx
 * Global authentication state — wraps the entire app.
 * Provides: user, role, login(), logout(), loading
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, clearTokens, saveTokens } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true while bootstrapping from localStorage

    // On mount: check if there's a saved token and fetch the /me profile
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) { setLoading(false); return; }

        authApi.me()
            .then(setUser)
            .catch(() => { clearTokens(); setUser(null); })
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email, password) => {
        const data = await authApi.login(email, password); // throws on error
        saveTokens(data.access, data.refresh);
        const me = await authApi.me();
        setUser(me);
        navigate('/dashboard/home');
        return me;
    }, [navigate]);

    const logout = useCallback(async () => {
        const refresh = localStorage.getItem('refresh_token');
        try { if (refresh) await authApi.logout(refresh); } catch { }
        clearTokens();
        setUser(null);
        navigate('/login');
    }, [navigate]);

    const replaceUser = useCallback((nextUser) => {
        setUser(nextUser);
        return nextUser;
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, replaceUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
