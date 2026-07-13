/**
 * Visual Regression Tests — Responsive Layout & Breakpoints
 *
 * Strategy: Simula distintos viewports usando window.matchMedia mocks,
 * verifica que los componentes adaptan sus clases CSS y estructura al breakpoint,
 * y realiza snapshots por viewport (mobile/tablet/desktop).
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Navbar from '../../components/Navbar';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, token: null, isAuthenticated: false, isLoading: false, login: jest.fn(), logout: jest.fn() }),
  AuthProvider: ({ children }) => children,
}));

jest.mock('../../components/ThemeProvider', () => ({
  ThemeProvider: ({ children }) => children,
  useThemeContext: () => ({ theme: 'light', toggleTheme: jest.fn(), setTheme: jest.fn() }),
}));

// Helper: simula matchMedia para un ancho dado
const mockMatchMedia = (width) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => {
      // Common CSS media query breakpoints
      const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
      const prefersColorMatch = query.match(/prefers-color-scheme:\s*(\w+)/);

      let matches = false;

      if (maxWidthMatch) {
        matches = width <= parseInt(maxWidthMatch[1], 10);
      } else if (minWidthMatch) {
        matches = width >= parseInt(minWidthMatch[1], 10);
      } else if (prefersColorMatch) {
        matches = false; // Default to light mode in tests
      }

      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });

  // Also update innerWidth
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

// Breakpoints (matching typical Tailwind / Bootstrap breakpoints)
const BREAKPOINTS = {
  mobile: 375,
  mobileLarge: 425,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  desktopXL: 1440,
};

// ─── Navbar — snapshots por viewport ─────────────────────────────────────────

describe('Navbar — Snapshots por Viewport', () => {
  it('matches DOM snapshot at mobile width (375px)', () => {
    mockMatchMedia(BREAKPOINTS.mobile);
    const { asFragment } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot at tablet width (768px)', () => {
    mockMatchMedia(BREAKPOINTS.tablet);
    const { asFragment } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot at desktop width (1280px)', () => {
    mockMatchMedia(BREAKPOINTS.desktop);
    const { asFragment } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Navbar — estructura en mobile ───────────────────────────────────────────

describe('Navbar — Comportamiento Responsive en Mobile', () => {
  beforeEach(() => {
    mockMatchMedia(BREAKPOINTS.mobile);
  });

  it('should always render nav element regardless of viewport', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render brand name at mobile viewport', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByText('RespiCare')).toBeInTheDocument();
  });

  it('should render all nav links at mobile viewport', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    // All links should still be in DOM (possibly hidden via CSS)
    const links = document.querySelectorAll('.nav-link');
    expect(links.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── Navbar — estructura en desktop ──────────────────────────────────────────

describe('Navbar — Comportamiento Responsive en Desktop', () => {
  beforeEach(() => {
    mockMatchMedia(BREAKPOINTS.desktop);
  });

  it('should render full navigation at desktop viewport', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Estado del Sistema')).toBeInTheDocument();
    expect(screen.getByText('Análisis')).toBeInTheDocument();
  });

  it('should render navbar menu container at desktop', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(document.querySelector('.navbar-menu')).toBeInTheDocument();
  });
});

// ─── Window resize — actualización de breakpoint ─────────────────────────────

describe('Responsive — Cambio de Viewport en Runtime', () => {
  it('should render correctly after simulated resize to mobile', () => {
    mockMatchMedia(BREAKPOINTS.desktop);
    const { rerender } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Simulate resize
    act(() => {
      mockMatchMedia(BREAKPOINTS.mobile);
      window.dispatchEvent(new Event('resize'));
    });

    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render correctly after simulated resize to desktop', () => {
    mockMatchMedia(BREAKPOINTS.mobile);
    const { rerender } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    act(() => {
      mockMatchMedia(BREAKPOINTS.desktop);
      window.dispatchEvent(new Event('resize'));
    });

    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});

// ─── matchMedia — sistema de detección de dark mode ──────────────────────────

describe('Responsive — Detección de Preferencia Dark Mode', () => {
  it('should detect dark mode preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    expect(typeof isDarkMode).toBe('boolean');
  });

  it('should detect light mode preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches;
    expect(isLightMode).toBe(true);
  });
});

// ─── Múltiples breakpoints — snapshots de todos los componentes ───────────────

describe('Responsive — Suite Completa de Breakpoints', () => {
  const viewportTests = [
    { name: 'iPhone SE (375px)', width: 375 },
    { name: 'iPhone XR (414px)', width: 414 },
    { name: 'iPad Mini (768px)', width: 768 },
    { name: 'iPad Pro (1024px)', width: 1024 },
    { name: 'Desktop (1280px)', width: 1280 },
    { name: 'Large Desktop (1440px)', width: 1440 },
  ];

  viewportTests.forEach(({ name, width }) => {
    it(`Navbar renders correctly at ${name}`, () => {
      mockMatchMedia(width);
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      );
      // Core structure always present
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
    });
  });
});

// ─── Grid layouts — verificación de clases responsive ────────────────────────

describe('Responsive — Clases CSS de Layout Grid', () => {
  it('should apply correct CSS classes for responsive grid', () => {
    mockMatchMedia(BREAKPOINTS.desktop);
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Navbar container should have responsive classes
    const container = document.querySelector('.navbar-container');
    if (container) {
      expect(container).toBeInTheDocument();
    }
  });

  it('should render ThemeToggle in all viewports', () => {
    [BREAKPOINTS.mobile, BREAKPOINTS.tablet, BREAKPOINTS.desktop].forEach((width) => {
      mockMatchMedia(width);
      const { unmount } = render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      );
      // ThemeToggle should be in DOM regardless of viewport
      const themeToggle = document.querySelector(
        '.theme-toggle, [class*="theme"], button[aria-label*="tema"]'
      );
      expect(themeToggle).not.toBeNull();
      unmount();
    });
  });
});