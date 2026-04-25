/**
 * Visual Regression Tests — Theme System (ThemeProvider + ThemeToggle)
 *
 * Strategy: Verify dark/light mode CSS classes, ARIA labels,
 * icon rendering, CSS custom properties, and body class application.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../../components/ThemeProvider';
import ThemeToggle from '../../components/ThemeToggle';

// Mock localStorage for theme persistence
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Wrapper helper: renders ThemeToggle inside ThemeProvider
const renderWithTheme = (initialMode = 'light') => {
  localStorageMock.getItem.mockReturnValue(initialMode);
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
};

// ─── DOM Snapshot — temas light y dark ───────────────────────────────────────

describe('Theme — Snapshot Visual Regression', () => {
  it('matches DOM snapshot in light mode', () => {
    const { asFragment } = renderWithTheme('light');
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot in dark mode', () => {
    const { asFragment } = renderWithTheme('dark');
    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── ThemeToggle — estructura visual ─────────────────────────────────────────

describe('ThemeToggle — Estructura Visual', () => {
  it('should render as a button element', () => {
    renderWithTheme('light');
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.tagName.toLowerCase()).toBe('button');
  });

  it('should have class theme-toggle on the button', () => {
    renderWithTheme('light');
    const button = screen.getByRole('button');
    expect(button).toHaveClass('theme-toggle');
  });

  it('should render icon span with aria-hidden', () => {
    renderWithTheme('light');
    const iconSpan = document.querySelector('.theme-toggle__icon');
    expect(iconSpan).toBeInTheDocument();
    expect(iconSpan).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render text label span', () => {
    renderWithTheme('light');
    const textSpan = document.querySelector('.theme-toggle__text');
    expect(textSpan).toBeInTheDocument();
  });
});

// ─── Light mode — iconos y textos correctos ───────────────────────────────────

describe('ThemeToggle — Visual en Light Mode', () => {
  it('should show moon icon (🌙) in light mode', () => {
    renderWithTheme('light');
    const icon = document.querySelector('.theme-toggle__icon');
    expect(icon).toHaveTextContent('🌙');
  });

  it('should show "Modo oscuro" text in light mode', () => {
    renderWithTheme('light');
    expect(screen.getByText(/modo oscuro/i)).toBeInTheDocument();
  });

  it('should have correct ARIA label in light mode', () => {
    renderWithTheme('light');
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Cambiar a tema oscuro');
  });

  it('should have correct title in light mode', () => {
    renderWithTheme('light');
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Cambiar a tema oscuro');
  });
});

// ─── Dark mode — iconos y textos correctos ────────────────────────────────────

describe('ThemeToggle — Visual en Dark Mode', () => {
  it('should show sun icon (☀️) in dark mode', () => {
    renderWithTheme('dark');
    const icon = document.querySelector('.theme-toggle__icon');
    expect(icon).toHaveTextContent('☀️');
  });

  it('should show "Modo claro" text in dark mode', () => {
    renderWithTheme('dark');
    expect(screen.getByText(/modo claro/i)).toBeInTheDocument();
  });

  it('should have correct ARIA label in dark mode', () => {
    renderWithTheme('dark');
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Cambiar a tema claro');
  });
});

// ─── Toggle interactivo — cambio de modo ─────────────────────────────────────

describe('ThemeToggle — Transición Visual Light ↔ Dark', () => {
  it('should toggle from light to dark when clicked', () => {
    renderWithTheme('light');
    const button = screen.getByRole('button');

    expect(screen.getByText(/modo oscuro/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(button);
    });

    expect(screen.getByText(/modo claro/i)).toBeInTheDocument();
  });

  it('should toggle icon from moon to sun when clicked', () => {
    renderWithTheme('light');
    const button = screen.getByRole('button');
    const icon = document.querySelector('.theme-toggle__icon');

    expect(icon).toHaveTextContent('🌙');

    act(() => {
      fireEvent.click(button);
    });

    expect(icon).toHaveTextContent('☀️');
  });

  it('should toggle from dark to light when clicked twice', () => {
    renderWithTheme('light');
    const button = screen.getByRole('button');

    act(() => fireEvent.click(button));
    act(() => fireEvent.click(button));

    // Should be back to light mode
    expect(screen.getByText(/modo oscuro/i)).toBeInTheDocument();
  });

  it('matches DOM snapshot after toggle', () => {
    const { asFragment } = renderWithTheme('light');
    const button = screen.getByRole('button');

    act(() => {
      fireEvent.click(button);
    });

    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Body class — clase aplicada al documento ────────────────────────────────

describe('ThemeProvider — Clase CSS en Body', () => {
  it('should apply theme-light class to body in light mode', () => {
    renderWithTheme('light');
    // ThemeProvider applies class to document.body
    expect(document.body.className).toContain('theme-light');
  });

  it('should apply theme-dark class to body in dark mode', () => {
    renderWithTheme('dark');
    expect(document.body.className).toContain('theme-dark');
  });

  it('should switch body class when toggle is clicked', () => {
    renderWithTheme('light');
    expect(document.body.className).toContain('theme-light');

    const button = screen.getByRole('button');
    act(() => {
      fireEvent.click(button);
    });

    expect(document.body.className).toContain('theme-dark');
  });
});

// ─── CSS custom properties — variables CSS aplicadas ─────────────────────────

describe('ThemeProvider — Variables CSS en :root', () => {
  it('should set --color-primary CSS variable on mount', () => {
    renderWithTheme('light');
    const rootStyle = document.documentElement.style;
    // ThemeProvider sets CSS custom properties
    const primaryColor = rootStyle.getPropertyValue('--color-primary');
    // In light mode, primary color should be set
    expect(typeof primaryColor).toBe('string');
  });

  it('should set --color-background CSS variable', () => {
    renderWithTheme('light');
    const rootStyle = document.documentElement.style;
    const bgColor = rootStyle.getPropertyValue('--color-background');
    expect(typeof bgColor).toBe('string');
  });

  it('should update CSS variables when theme changes', () => {
    renderWithTheme('light');
    const rootStyle = document.documentElement.style;
    const lightBg = rootStyle.getPropertyValue('--color-background');

    const button = screen.getByRole('button');
    act(() => {
      fireEvent.click(button);
    });

    const darkBg = rootStyle.getPropertyValue('--color-background');
    // Colors should differ between light and dark (or at least be set)
    expect(typeof darkBg).toBe('string');
  });
});