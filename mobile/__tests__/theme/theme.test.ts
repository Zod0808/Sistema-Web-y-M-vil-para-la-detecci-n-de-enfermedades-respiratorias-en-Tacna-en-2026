/**
 * Tests for Theme
 */

import { theme } from '../../medical-app/theme/theme';
import { darkTheme } from '../../medical-app/theme/darkTheme';

describe('Theme', () => {
  describe('light theme', () => {
    it('should have colors defined', () => {
      expect(theme.colors).toBeDefined();
      expect(theme.colors.primary).toBeDefined();
      expect(theme.colors.secondary).toBeDefined();
    });

    it('should have fonts configured', () => {
      expect(theme.fonts).toBeDefined();
      expect(theme.fonts.regular).toBeDefined();
    });

    it('should have roundness', () => {
      expect(theme.roundness).toBeDefined();
      expect(typeof theme.roundness).toBe('number');
    });

    it('should have primary color', () => {
      expect(theme.colors.primary).toBe('#1976d2');
    });

    it('should have error color', () => {
      expect(theme.colors.error).toBeDefined();
    });
  });

  describe('dark theme', () => {
    it('should have colors defined', () => {
      expect(darkTheme.colors).toBeDefined();
      expect(darkTheme.colors.primary).toBeDefined();
    });

    it('should have different background from light theme', () => {
      expect(darkTheme.colors.background).not.toBe(theme.colors.background);
    });

    it('should have different surface from light theme', () => {
      expect(darkTheme.colors.surface).not.toBe(theme.colors.surface);
    });

    it('should have fonts configured', () => {
      expect(darkTheme.fonts).toBeDefined();
    });

    it('should have same roundness as light theme', () => {
      expect(darkTheme.roundness).toBe(theme.roundness);
    });
  });
});

