import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(() => !!localStorage.getItem('auth_token'));

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) return;
    axios
      .get(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
      .then((res) => {
        const payload = res.data?.data;
        setUser(payload?.user || payload || null);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
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
    setUser(u);
    return u;
  };

  const register = async (name, email, password, role = 'patient') => {
    const res = await axios.post(`${API_BASE}/auth/register`, { name, email, password, role });
    const { token: t, user: u } = res.data.data;
    persistToken(t);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
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