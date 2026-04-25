/**
 * Tests for Theme System
 */

import { colors, lightTheme, darkTheme, getTheme, useTheme } from '../theme';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Theme System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('colors', () => {
    it('should export color palette', () => {
      expect(colors).toBeDefined();
      expect(colors.primary).toBeDefined();
      expect(colors.secondary).toBeDefined();
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.info).toBeDefined();
      expect(colors.grey).toBeDefined();
    });

    it('should have primary colors', () => {
      expect(colors.primary.main).toBe('#1976d2');
      expect(colors.primary.light).toBe('#42a5f5');
      expect(colors.primary.dark).toBe('#1565c0');
      expect(colors.primary.contrastText).toBe('#ffffff');
    });

    it('should have grey scale', () => {
      expect(colors.grey[50]).toBe('#fafafa');
      expect(colors.grey[500]).toBe('#9e9e9e');
      expect(colors.grey[900]).toBe('#212121');
    });
  });

  describe('lightTheme', () => {
    it('should have light mode', () => {
      expect(lightTheme.mode).toBe('light');
    });

    it('should have palette with light colors', () => {
      expect(lightTheme.palette.background.default).toBe('#ffffff');
      expect(lightTheme.palette.text.primary).toBe('rgba(0, 0, 0, 0.87)');
    });

    it('should have typography settings', () => {
      expect(lightTheme.typography).toBeDefined();
      expect(lightTheme.typography.fontFamily).toBeDefined();
      expect(lightTheme.typography.h1).toBeDefined();
      expect(lightTheme.typography.body1).toBeDefined();
    });

    it('should have spacing system', () => {
      expect(lightTheme.spacing).toBeDefined();
      expect(lightTheme.spacing.unit).toBe(8);
      expect(lightTheme.spacing.xs).toBe(4);
      expect(lightTheme.spacing.xl).toBe(32);
    });

    it('should have shape settings', () => {
      expect(lightTheme.shape).toBeDefined();
      expect(lightTheme.shape.borderRadius).toBe(4);
    });

    it('should have shadows', () => {
      expect(lightTheme.shadows).toBeDefined();
      expect(Array.isArray(lightTheme.shadows)).toBe(true);
    });

    it('should have transitions', () => {
      expect(lightTheme.transitions).toBeDefined();
      expect(lightTheme.transitions.duration).toBeDefined();
      expect(lightTheme.transitions.easing).toBeDefined();
    });
  });

  describe('darkTheme', () => {
    it('should have dark mode', () => {
      expect(darkTheme.mode).toBe('dark');
    });

    it('should have palette with dark colors', () => {
      expect(darkTheme.palette.background.default).toBe('#121212');
      expect(darkTheme.palette.text.primary).toBe('rgba(255, 255, 255, 0.87)');
    });

    it('should inherit from lightTheme', () => {
      expect(darkTheme.typography).toEqual(lightTheme.typography);
      expect(darkTheme.spacing).toEqual(lightTheme.spacing);
      expect(darkTheme.shape).toEqual(lightTheme.shape);
    });
  });

  describe('getTheme', () => {
    it('should return light theme by default', () => {
      const theme = getTheme();
      expect(theme.mode).toBe('light');
    });

    it('should return light theme for light mode', () => {
      const theme = getTheme('light');
      expect(theme.mode).toBe('light');
      expect(theme.palette.background.default).toBe('#ffffff');
    });

    it('should return dark theme for dark mode', () => {
      const theme = getTheme('dark');
      expect(theme.mode).toBe('dark');
      expect(theme.palette.background.default).toBe('#121212');
    });

    it('should detect system preference for auto mode', () => {
      window.matchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const theme = getTheme('auto');
      expect(theme.mode).toBe('dark');
    });

    it('should default to light when system preference is light', () => {
      window.matchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const theme = getTheme('auto');
      expect(theme.mode).toBe('light');
    });

    it('should default to light when matchMedia is not available', () => {
      const originalMatchMedia = window.matchMedia;
      delete window.matchMedia;

      const theme = getTheme('auto');
      expect(theme.mode).toBe('light');

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('useTheme hook', () => {
    it('should return theme with default light mode', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('light');
      expect(result.current.theme.mode).toBe('light');
    });

    it('should load theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('dark');
    });

    it('should toggle theme', () => {
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.mode).toBe('light');
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.mode).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
    });

    it('should set specific theme', () => {
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(result.current.mode).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
    });

    it('should persist theme to localStorage', () => {
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const { result } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('light');
    });

    it('should handle setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const { result } = renderHook(() => useTheme());
      
      expect(() => {
        act(() => {
          result.current.setTheme('dark');
        });
      }).not.toThrow();
    });
  });

  describe('Theme structure', () => {
    it('should have consistent structure between light and dark', () => {
      const lightKeys = Object.keys(lightTheme);
      const darkKeys = Object.keys(darkTheme);
      
      // Dark theme should have all keys from light theme
      lightKeys.forEach(key => {
        expect(darkKeys).toContain(key);
      });
    });

    it('should have proper color contrast in light theme', () => {
      const textColor = lightTheme.palette.text.primary;
      const bgColor = lightTheme.palette.background.default;
      
      expect(textColor).toBeDefined();
      expect(bgColor).toBeDefined();
      // Light theme should have dark text on light background
      expect(textColor).toContain('0, 0, 0');
      expect(bgColor).toBe('#ffffff');
    });

    it('should have proper color contrast in dark theme', () => {
      const textColor = darkTheme.palette.text.primary;
      const bgColor = darkTheme.palette.background.default;
      
      expect(textColor).toBeDefined();
      expect(bgColor).toBeDefined();
      // Dark theme should have light text on dark background
      expect(textColor).toContain('255, 255, 255');
      expect(bgColor).toBe('#121212');
    });
  });
});

