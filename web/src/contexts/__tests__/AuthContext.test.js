/**
 * Unit tests for AuthContext / AuthProvider
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from '../AuthContext';

jest.mock('axios');
jest.mock('../../utils/apiBase', () => ({ API_BASE: 'http://test-api' }));

// Consumer component that exposes auth state via data-testid attributes
const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user?.name ?? 'none'}</span>
      <span data-testid="token">{auth.token ?? 'none'}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <button data-testid="btn-login" onClick={() => auth.login('a@b.com', 'pass').catch(() => {})} />
      <button data-testid="btn-logout" onClick={auth.logout} />
      <button
        data-testid="btn-register"
        onClick={() => auth.register('Jane', 'j@b.com', 'secret', 'doctor').catch(() => {})}
      />
    </div>
  );
};

const renderAuth = () =>
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // ── initial state ──────────────────────────────────────────────────────────

  it('starts unauthenticated when no token in localStorage', async () => {
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('loading starts false when there is no saved token', () => {
    renderAuth();
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  // ── token restoration ─────────────────────────────────────────────────────

  it('restores user from saved token on mount', async () => {
    localStorage.setItem('auth_token', 'saved-jwt');
    axios.get.mockResolvedValueOnce({
      data: { data: { user: { name: 'Dr. House', role: 'doctor' } } },
    });

    renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Dr. House')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('handles profile payload without nested .user key', async () => {
    localStorage.setItem('auth_token', 'tok');
    axios.get.mockResolvedValueOnce({
      data: { data: { name: 'Flat User', role: 'patient' } },
    });

    renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Flat User')
    );
  });

  it('clears token when profile request fails', async () => {
    localStorage.setItem('auth_token', 'bad-token');
    axios.get.mockRejectedValueOnce(new Error('401 Unauthorized'));

    renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  // ── login ──────────────────────────────────────────────────────────────────

  it('login() sets token and user in state', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { token: 'new-jwt', user: { name: 'Alice', role: 'patient' } } },
    });

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
    );
    expect(screen.getByTestId('token').textContent).toBe('new-jwt');
    expect(screen.getByTestId('user').textContent).toBe('Alice');
    expect(localStorage.getItem('auth_token')).toBe('new-jwt');
  });

  it('login() does not change auth state on failure', async () => {
    const err = Object.assign(new Error('Bad'), {
      response: { data: { message: 'Credenciales inválidas' } },
    });
    axios.post.mockRejectedValueOnce(err);

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  it('logout() clears token and user', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { token: 'jwt-x', user: { name: 'Bob', role: 'admin' } } },
    });

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await act(async () => { screen.getByTestId('btn-login').click(); });
    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
    );

    act(() => { screen.getByTestId('btn-logout').click(); });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  // ── register ───────────────────────────────────────────────────────────────

  it('register() sets token and user in state', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { token: 'reg-jwt', user: { name: 'Jane', role: 'doctor' } } },
    });

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await act(async () => { screen.getByTestId('btn-register').click(); });

    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
    );
    expect(screen.getByTestId('user').textContent).toBe('Jane');
    expect(localStorage.getItem('auth_token')).toBe('reg-jwt');
  });

  // ── useAuth outside provider ───────────────────────────────────────────────

  it('useAuth throws when used outside AuthProvider', () => {
    const BadConsumer = () => { useAuth(); return null; };
    expect(() => render(<BadConsumer />)).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });
});