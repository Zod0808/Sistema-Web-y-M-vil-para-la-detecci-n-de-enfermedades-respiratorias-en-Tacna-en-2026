import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const readCachedUser = () => {
  try {
    const s = localStorage.getItem('auth_user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readCachedUser);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(() => !!localStorage.getItem('auth_token'));

  const persistUser = (u) => {
    if (u) localStorage.setItem('auth_user', JSON.stringify(u));
    else localStorage.removeItem('auth_user');
    setUser(u);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) { setLoading(false); return; }
    axios
      .get(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
      .then((res) => {
        const payload = res.data?.data;
        persistUser(payload?.user || payload || null);
      })
      .catch((err) => {
        const status = err?.response?.status;
        // Solo cerrar sesión si el token es inválido/expirado (401/403)
        // Errores de red o servidor mantienen la sesión con datos en caché
        if (status === 401 || status === 403) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const persistToken = (t) => {
    localStorage.setItem('auth_token', t);
    setToken(t);
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    const { token: t, user: u } = res.data.data;
    persistToken(t);
    persistUser(u);
    return u;
  };

  const register = async (name, email, password, role = 'patient') => {
    const res = await axios.post(`${API_BASE}/auth/register`, { name, email, password, role });
    const { token: t, user: u } = res.data.data;
    persistToken(t);
    persistUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: !!token, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
};