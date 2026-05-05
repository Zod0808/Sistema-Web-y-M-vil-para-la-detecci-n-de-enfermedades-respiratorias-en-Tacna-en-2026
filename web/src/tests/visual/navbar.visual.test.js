/**
 * Visual Regression Tests — Navbar Component
 *
 * Strategy: DOM snapshot + CSS class assertions + ARIA attributes
 * Detects structural and semantic visual regressions without external VRT tools.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Navbar from '../../components/Navbar';
import * as i18nService from '../../services/i18nService';

const NAV_TRANSLATIONS = {
  'nav.brandName': 'RespiCare',
  'nav.brandSubtitle': 'Sistema de Enfermedades Respiratorias',
  'nav.home': 'Inicio',
  'nav.dashboard': 'Estado del Sistema',
  'nav.analytics': 'Análisis',
  'nav.map': 'Mapa',
  'nav.fhir': 'FHIR',
  'nav.hl7': 'HL7',
};

// Mock dependencies that require context providers
jest.mock('../../services/i18nService', () => ({
  t: jest.fn((key) => {
    const map = {
      'nav.brandName': 'RespiCare',
      'nav.brandSubtitle': 'Sistema de Enfermedades Respiratorias',
      'nav.home': 'Inicio',
      'nav.dashboard': 'Estado del Sistema',
      'nav.analytics': 'Análisis',
      'nav.map': 'Mapa',
      'nav.fhir': 'FHIR',
      'nav.hl7': 'HL7',
    };
    return map[key] || key;
  }),
  getCurrentLanguage: jest.fn(() => 'es'),
  setLanguage: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null, logout: jest.fn(), loading: false }),
}));
jest.mock('../../components/ThemeToggle', () =>
  function MockThemeToggle() {
    return <button data-testid="theme-toggle" className="navbar-theme-toggle">T</button>;
  }
);
jest.mock('../../components/LanguageSelector', () =>
  function MockLanguageSelector() {
    return <select data-testid="language-selector" className="navbar-language-selector" />;
  }
);

// Wrap with router since Navbar uses Link and useLocation
const renderNavbar = (initialRoute = '/') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Navbar />
    </MemoryRouter>
  );

// Re-set t() mock after resetMocks:true clears implementations between tests
beforeEach(() => {
  i18nService.t.mockImplementation((key) => NAV_TRANSLATIONS[key] || key);
  i18nService.getCurrentLanguage.mockReturnValue('es');
});

// ─── DOM Snapshot — captura la estructura HTML completa ──────────────────────

describe('Navbar — Snapshot Visual Regression', () => {
  it('matches DOM snapshot on default route (/)', () => {
    const { asFragment } = renderNavbar('/');
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot on /dashboard route', () => {
    const { asFragment } = renderNavbar('/dashboard');
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot on /analytics route', () => {
    const { asFragment } = renderNavbar('/analytics');
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot on /heatmap route', () => {
    const { asFragment } = renderNavbar('/heatmap');
    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Estructura visual — elementos clave siempre presentes ───────────────────

describe('Navbar — Estructura Visual', () => {
  beforeEach(() => renderNavbar('/'));

  it('should render the brand section with icon, name and subtitle', () => {
    expect(screen.getByText('RespiCare')).toBeInTheDocument();
    expect(
      screen.getByText('Sistema de Enfermedades Respiratorias')
    ).toBeInTheDocument();
    // Brand icon (emoji) is in the DOM
    expect(document.querySelector('.brand-icon')).toBeInTheDocument();
    expect(document.querySelector('.brand-name')).toBeInTheDocument();
    expect(document.querySelector('.brand-subtitle')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    // 6 main nav links + 1 login link when unauthenticated
    expect(navLinks.length).toBeGreaterThanOrEqual(6);
  });

  it('should render nav with correct role and aria-label', () => {
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    expect(nav).toHaveClass('navbar');
  });

  it('should render navbar-container as structural wrapper', () => {
    expect(document.querySelector('.navbar-container')).toBeInTheDocument();
    expect(document.querySelector('.navbar-menu')).toBeInTheDocument();
  });
});

// ─── Estado activo — ruta activa recibe clase 'active' ───────────────────────

describe('Navbar — Estado de Enlace Activo', () => {
  it('should mark home link as active when on / route', () => {
    renderNavbar('/');
    const homeLink = screen.getByText('Inicio').closest('a');
    expect(homeLink).toHaveClass('active');
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('should mark dashboard link as active when on /dashboard route', () => {
    renderNavbar('/dashboard');
    const dashLink = screen.getByText('Estado del Sistema').closest('a');
    expect(dashLink).toHaveClass('active');
    expect(dashLink).toHaveAttribute('aria-current', 'page');
  });

  it('should mark analytics link as active when on /analytics route', () => {
    renderNavbar('/analytics');
    const analyticsLink = screen.getByText('Análisis').closest('a');
    expect(analyticsLink).toHaveClass('active');
  });

  it('should NOT mark other links as active when one is active', () => {
    renderNavbar('/dashboard');
    const homeLink = screen.getByText('Inicio').closest('a');
    expect(homeLink).not.toHaveClass('active');
    expect(homeLink).not.toHaveAttribute('aria-current');
  });
});

// ─── Atributos ARIA — accesibilidad visual ───────────────────────────────────

describe('Navbar — Atributos ARIA y Accesibilidad Visual', () => {
  it('should have aria-hidden on all nav icon spans', () => {
    renderNavbar('/');
    const iconSpans = document.querySelectorAll('.nav-icon');
    iconSpans.forEach((span) => {
      expect(span).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should have aria-hidden on brand icon', () => {
    renderNavbar('/');
    const brandIcon = document.querySelector('.brand-icon');
    expect(brandIcon).toHaveAttribute('aria-hidden', 'true');
  });

  it('should have correct href attributes on main nav links', () => {
    renderNavbar('/');
    const mainHrefs = ['/', '/dashboard', '/analytics', '/heatmap', '/fhir', '/hl7'];
    const links = document.querySelectorAll('.nav-link');
    const actualHrefs = Array.from(links).map((l) => l.getAttribute('href'));
    mainHrefs.forEach((href) => expect(actualHrefs).toContain(href));
  });
});

// ─── CSS classes — clases CSS aplicadas correctamente ───────────────────────

describe('Navbar — CSS Classes Visual', () => {
  it('should apply navbar class to root nav element', () => {
    renderNavbar('/');
    expect(document.querySelector('nav')).toHaveClass('navbar');
  });

  it('should apply nav-link class to all links', () => {
    renderNavbar('/');
    const links = document.querySelectorAll('a.nav-link');
    expect(links.length).toBeGreaterThanOrEqual(6);
  });

  it('should only have ONE active link at a time', () => {
    renderNavbar('/analytics');
    const activeLinks = document.querySelectorAll('.nav-link.active');
    expect(activeLinks).toHaveLength(1);
  });

  it('should render LanguageSelector inside navbar-menu', () => {
    renderNavbar('/');
    const menu = document.querySelector('.navbar-menu');
    expect(menu).toBeInTheDocument();
    // ThemeToggle and LanguageSelector are children of navbar-menu
    const buttons = menu.querySelectorAll('button, select, [class*="language"], [class*="theme"]');
    expect(buttons.length).toBeGreaterThan(0);
  });
});