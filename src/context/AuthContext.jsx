/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    getCurrentUser,
    getStoredAuthToken,
    updateCurrentUser,
    changeCurrentPassword,
    loginHomeOps,
    logoutHomeOps,
    setStoredAuthToken,
} from "../lib/homeopsApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => getStoredAuthToken());
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(getStoredAuthToken()));
    const [error, setError] = useState("");

    const clearSession = useCallback(() => {
        setStoredAuthToken("");
        setToken("");
        setUser(null);
        setLoading(false);
    }, []);

    const refreshUser = useCallback(async () => {
        const storedToken = getStoredAuthToken();

        if (!storedToken) {
            clearSession();
            return null;
        }

        setLoading(true);
        setError("");

        try {
            const json = await getCurrentUser();
            setUser(json.user || null);
            setToken(storedToken);
            return json.user || null;
        } catch (err) {
            clearSession();
            setError(err.message || "Your session expired. Please log in again.");
            return null;
        } finally {
            setLoading(false);
        }
    }, [clearSession]);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        function handleUnauthorized() {
            clearSession();
        }

        window.addEventListener("homeops:unauthorized", handleUnauthorized);
        return () => window.removeEventListener("homeops:unauthorized", handleUnauthorized);
    }, [clearSession]);

    const login = useCallback(async (credentials, passwordArg, rememberArg = true) => {
        const payload = typeof credentials === "object" && credentials !== null
            ? credentials
            : { email: credentials, password: passwordArg, remember: rememberArg };

        const email = String(payload.email || "").trim();
        const password = String(payload.password || "");
        const remember = payload.remember ?? true;

        if (!email || !password) {
            const validationError = new Error("Enter your email and password to continue.");
            setError(validationError.message);
            throw validationError;
        }

        setLoading(true);
        setError("");

        try {
            const json = await loginHomeOps({ email, password, remember });
            setStoredAuthToken(json.token);
            setToken(json.token);
            setUser(json.user || null);
            return json;
        } catch (err) {
            setError(err.message || "Could not log in.");
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateProfile = useCallback(async (payload) => {
        setError("");

        try {
            const json = await updateCurrentUser(payload);
            setUser(json.user || null);
            return json;
        } catch (err) {
            setError(err.message || "Could not update your account profile.");
            throw err;
        }
    }, []);

    const updatePassword = useCallback(async (payload) => {
        setError("");

        try {
            return await changeCurrentPassword(payload);
        } catch (err) {
            setError(err.message || "Could not update your password.");
            throw err;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            if (getStoredAuthToken()) {
                await logoutHomeOps();
            }
        } catch {
            // If the token is already dead, local logout is still the right user experience.
        } finally {
            clearSession();
        }
    }, [clearSession]);

    const value = useMemo(() => ({
        token,
        user,
        loading,
        error,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
        updateProfile,
        updatePassword,
        refreshUser,
        clearSession,
    }), [clearSession, error, loading, login, logout, refreshUser, token, updatePassword, updateProfile, user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider.");
    }

    return context;
}
