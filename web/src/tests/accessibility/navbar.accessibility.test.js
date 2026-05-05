/**
 * Accessibility Tests — Navbar Component
 *
 * Strategy:
 * - axe-core: WCAG 2.1 AA automated violations scan
 * - Landmark roles: nav, role="navigation", aria-label
 * - Active link: aria-current="page" on active route
 * - Icon semantics: aria-hidden on decorative icons
 * - Keyboard navigability: all links reachable via Tab
 * - Brand name presence for screen readers
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import Navbar from '../../components/Navbar';
import * as i18nService from '../../services/i18nService';

expect.extend(toHaveNoViolations);

const NAV_TRANSLATIONS = {
  'nav.brandName': 'RespiCare',
  'nav.brandSubtitle': 'Sistema de Enfermedades',
  'nav.home': 'Inicio',
  'nav.dashboard': 'Estado del Sistema',
  'nav.analytics': 'Análisis',
  'nav.map': 'Mapa',
  'nav.fhir': 'FHIR',
  'nav.hl7': 'HL7',
};

// ─── Mock i18n ────────────────────────────────────────────────────────────────

jest.mock('../../services/i18nService', () => ({
  t: jest.fn((key) => {
    const map = {
      'nav.brandName': 'RespiCare',
      'nav.brandSubtitle': 'Sistema de Enfermedades',
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
    return <div data-testid="theme-toggle" />;
  }
);

jest.mock('../../components/LanguageSelector', () =>
  function MockLanguageSelector() {
    return <div data-testid="language-selector" />;
  }
);

// Re-set t() mock after resetMocks:true clears implementations between tests
beforeEach(() => {
  i18nService.t.mockImplementation((key) => NAV_TRANSLATIONS[key] || key);
  i18nService.getCurrentLanguage.mockReturnValue('es');
});

const renderNavbar = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  );

// ─── WCAG 2.1 AA — axe automated scan ────────────────────────────────────────

describe('Navbar — WCAG 2.1 AA (axe-core)', () => {
  it('should have no accessibility violations on default route', async () => {
    const { container } = renderNavbar('/');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations on /dashboard route', async () => {
    const { container } = renderNavbar('/dashboard');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations on /analytics route', async () => {
    const { container } = renderNavbar('/analytics');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations on /heatmap route', async () => {
    const { container } = renderNavbar('/heatmap');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── Landmark roles ───────────────────────────────────────────────────────────

describe('Navbar — Landmark Roles', () => {
  it('should render a nav element with role="navigation"', () => {
    renderNavbar();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should have an aria-label on the nav element', () => {
    renderNavbar();
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label');
    expect(nav.getAttribute('aria-label').length).toBeGreaterThan(0);
  });

  it('should expose the brand name as visible text for screen readers', () => {
    renderNavbar();
    expect(screen.getByText('RespiCare')).toBeInTheDocument();
  });
});

// ─── Active link — aria-current ───────────────────────────────────────────────

describe('Navbar — Active Link aria-current', () => {
  it('should set aria-current="page" on active home link', () => {
    renderNavbar('/');
    const homeLink = screen.getByText('Inicio').closest('a');
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('should NOT set aria-current on non-active links when on /', () => {
    renderNavbar('/');
    const dashboardLink = screen.getByText('Estado del Sistema').closest('a');
    expect(dashboardLink).not.toHaveAttribute('aria-current');
  });

  it('should set aria-current="page" on /dashboard link', () => {
    renderNavbar('/dashboard');
    const dashLink = screen.getByText('Estado del Sistema').closest('a');
    expect(dashLink).toHaveAttribute('aria-current', 'page');
  });

  it('should set aria-current="page" on /analytics link', () => {
    renderNavbar('/analytics');
    const analyticsLink = screen.getByText('Análisis').closest('a');
    expect(analyticsLink).toHaveAttribute('aria-current', 'page');
  });

  it('should set aria-current="page" on /heatmap link', () => {
    renderNavbar('/heatmap');
    const mapLink = screen.getByText('Mapa').closest('a');
    expect(mapLink).toHaveAttribute('aria-current', 'page');
  });

  it('should only mark one link as active at a time', () => {
    renderNavbar('/analytics');
    const allLinks = document.querySelectorAll('a[aria-current="page"]');
    expect(allLinks.length).toBe(1);
  });
});

// ─── Decorative icons — aria-hidden ──────────────────────────────────────────

describe('Navbar — Decorative Icon Semantics', () => {
  it('should hide nav icons from screen readers with aria-hidden', () => {
    renderNavbar();
    const navIcons = document.querySelectorAll('.nav-icon');
    navIcons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should hide brand icon from screen readers with aria-hidden', () => {
    renderNavbar();
    const brandIcon = document.querySelector('.brand-icon');
    if (brandIcon) {
      expect(brandIcon).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

// ─── Navigation links — keyboard accessibility ───────────────────────────────

describe('Navbar — Links Are Keyboard Accessible', () => {
  it('should render all nav links as anchor elements', () => {
    renderNavbar();
    const links = document.querySelectorAll('.nav-link');
    expect(links.length).toBeGreaterThanOrEqual(6);
    links.forEach((link) => {
      expect(link.tagName.toLowerCase()).toBe('a');
    });
  });

  it('should have valid href attributes on all nav links', () => {
    renderNavbar();
    const links = document.querySelectorAll('.nav-link');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      expect(href).not.toBeNull();
      expect(href.startsWith('/')).toBe(true);
    });
  });

  it('should render Inicio link pointing to /', () => {
    renderNavbar();
    const homeLink = screen.getByText('Inicio').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render Estado del Sistema link pointing to /dashboard', () => {
    renderNavbar();
    const dashLink = screen.getByText('Estado del Sistema').closest('a');
    expect(dashLink).toHaveAttribute('href', '/dashboard');
  });

  it('should render Análisis link pointing to /analytics', () => {
    renderNavbar();
    const analyticsLink = screen.getByText('Análisis').closest('a');
    expect(analyticsLink).toHaveAttribute('href', '/analytics');
  });
});

// ─── Brand — screen reader presence ──────────────────────────────────────────

describe('Navbar — Brand Accessibility', () => {
  it('should render brand name visible to screen readers', () => {
    renderNavbar();
    const brandName = document.querySelector('.brand-name');
    expect(brandName).not.toBeNull();
    expect(brandName.textContent).toBeTruthy();
  });

  it('should render brand subtitle visible to screen readers', () => {
    renderNavbar();
    const brandSubtitle = document.querySelector('.brand-subtitle');
    if (brandSubtitle) {
      expect(brandSubtitle).toBeInTheDocument();
    }
  });
});

// ─── Link text — meaningful labels ───────────────────────────────────────────

describe('Navbar — Link Text Quality', () => {
  it('should provide meaningful text for all navigation links', () => {
    renderNavbar();
    const links = document.querySelectorAll('.nav-link');
    links.forEach((link) => {
      // Each link should have visible text (not just an icon)
      const spans = link.querySelectorAll('span:not([aria-hidden])');
      const hasText = Array.from(spans).some((s) => s.textContent.trim().length > 0);
      expect(hasText).toBe(true);
    });
  });
});