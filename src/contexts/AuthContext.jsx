// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { httpClient, setToken, getToken } from '../api/httpClient';

const AuthContext = createContext(null);

/**
 * AuthProvider
 * - reads token from localStorage via getToken()
 * - fetches /me only if token exists to populate user on start
 * - exposes login, register, logout, refreshUser
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading indicates whether we're confirming current session on mount
  const [loading, setLoading] = useState(true);

  // Refresh/hydrate user from backend (only if token exists)
  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const t = getToken();
      if (!t) {
        // no token -> nothing to hydrate
        setUser(null);
        return null;
      }

      // /me must be implemented on backend and return user+profile
      const data = await httpClient.get('/me');
      setUser(data);
      return data;
    } catch (err) {
      // Invalid/expired token or other error
      console.warn('refreshUser failed:', err?.message || err);
      setUser(null);
      setToken(null); // clear any invalid token
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // On mount, try to hydrate only if token exists
    refreshUser();

    // Listen for global auth-logout event dispatched by httpClient on 401
    const onAuthLogout = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth-logout', onAuthLogout);

    return () => {
      window.removeEventListener('auth-logout', onAuthLogout);
    };
  }, [refreshUser]);

  /**
   * login(email, password)
   * expects backend: POST /auth/login -> { token, user }
   */
  const login = async (email, password, opts = {}) => {
    const payload = { email, password };
    if (opts.remember) payload.remember = true;

    const data = await httpClient.post('/auth/login', payload, { auth: false });
    if (!data) throw new Error('Empty login response');

    if (data.token) {
      setToken(data.token);
    }

    // If backend returned user directly, use it, otherwise refresh
    if (data.user) {
      setUser(data.user);
      setLoading(false);
      return data.user;
    }

    // If token only, hydrate
    const me = await refreshUser();
    return me;
  };

  /**
   * register(payload)
   * Accepts either (name, email, password, consent) signature OR object
   * Backend: POST /auth/register -> { token, user }
   */
  const register = async (...args) => {
    let payload;
    if (args.length === 1 && typeof args[0] === 'object') {
      payload = args[0];
    } else {
      const [name, email, password, consent] = args;
      payload = { name, email, password, consent };
    }

    const data = await httpClient.post('/auth/register', payload, { auth: false });
    if (!data) throw new Error('Empty register response');

    if (data.token) setToken(data.token);
    if (data.user) {
      setUser(data.user);
      setLoading(false);
      return data.user;
    }

    const me = await refreshUser();
    return me;
  };

  /**
   * logout()
   * Clear token locally and attempt server-side logout (best-effort)
   */
  const logout = async () => {
    try {
      // optional server logout
      try {
        await httpClient.post('/auth/logout', null);
      } catch (e) {
        // ignore server logout failures
      }
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
