/**
 * Accessibility tests — WCAG 2.1 AA
 * Uses jest-axe to validate key components for critical violations.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';

expect.extend(toHaveNoViolations);

// ── Minimal stubs so components render without real services ──────────────────

jest.mock('../../services/i18nService', () => ({
  t: (key) => key,
  getCurrentLanguage: () => 'es',
  setLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: { es: 'Español', en: 'English' },
}));

jest.mock('../../contexts/I18nContext', () => ({
  useTranslation: () => ({
    t: (key) => key,
    language: 'es',
    setLanguage: jest.fn(),
    SUPPORTED_LANGUAGES: { es: 'Español', en: 'English' },
  }),
  I18nProvider: ({ children }) => children,
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
  }),
  AuthProvider: ({ children }) => children,
}));

jest.mock('../../components/ThemeProvider', () => ({
  ThemeProvider: ({ children }) => children,
  useThemeContext: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

jest.mock('../../components/ThemeToggle', () => () => (
  <button aria-label="Toggle theme">🌙</button>
));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWithRouter(ui) {
  const { container } = render(<MemoryRouter>{ui}</MemoryRouter>);
  return container;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Accessibility — WCAG 2.1 AA', () => {
  test('LoginPage has no critical axe violations', async () => {
    const LoginPage = (await import('../../pages/LoginPage')).default;
    const container = renderWithRouter(<LoginPage />);
    const results = await axe(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(results).toHaveNoViolations();
  });

  test('Navbar (unauthenticated) has no critical axe violations', async () => {
    const Navbar = (await import('../../components/Navbar')).default;
    const container = renderWithRouter(<Navbar />);
    const results = await axe(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(results).toHaveNoViolations();
  });

  test('LanguageSelector has no critical axe violations', async () => {
    const LanguageSelector = (await import('../../components/LanguageSelector')).default;
    const container = renderWithRouter(<LanguageSelector />);
    const results = await axe(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(results).toHaveNoViolations();
  });

  test('RegisterPage has no critical axe violations', async () => {
    const RegisterPage = (await import('../../pages/RegisterPage')).default;
    const container = renderWithRouter(<RegisterPage />);
    const results = await axe(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(results).toHaveNoViolations();
  });
});
