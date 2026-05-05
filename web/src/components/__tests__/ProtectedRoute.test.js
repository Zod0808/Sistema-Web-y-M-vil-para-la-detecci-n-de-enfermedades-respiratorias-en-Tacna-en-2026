/**
 * Unit tests for ProtectedRoute component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const Dashboard = () => <div>Dashboard</div>;
const LoginPage = () => <div>Login Page</div>;

const renderRoute = (authState, roles) =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute roles={roles}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Main Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  // ── loading state ─────────────────────────────────────────────────────────

  it('renders loading spinner while auth is loading', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, user: null, loading: true });
    renderRoute({ loading: true });
    expect(screen.getByText(/verificando sesión/i)).toBeInTheDocument();
  });

  // ── unauthenticated ───────────────────────────────────────────────────────

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, user: null, loading: false });
    renderRoute();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  // ── authenticated ─────────────────────────────────────────────────────────

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Alice', role: 'patient' },
      loading: false,
    });
    renderRoute();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  // ── role-based access ─────────────────────────────────────────────────────

  it('redirects to /dashboard when user role is not allowed', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Alice', role: 'patient' },
      loading: false,
    });
    renderRoute(null, ['admin']);
    expect(screen.getByText('Main Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders children when user role matches required roles', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Admin', role: 'admin' },
      loading: false,
    });
    renderRoute(null, ['admin', 'doctor']);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders children when no roles restriction is specified', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Doc', role: 'doctor' },
      loading: false,
    });
    renderRoute(null, undefined);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});