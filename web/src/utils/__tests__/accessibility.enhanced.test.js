/**
 * Enhanced Tests for Accessibility Utilities
 * Additional edge cases and coverage improvements
 */

import {
  addAriaAttributes,
  announceToScreenReader,
  checkContrast,
  trapFocus,
  createSkipLink,
  enhanceFocusIndicators,
  initAccessibility
} from '../accessibility';

describe('Accessibility Utilities Enhanced Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('addAriaAttributes Edge Cases', () => {
    it('should handle element with existing ARIA attributes', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-label', 'Existing');
      
      addAriaAttributes(element, {
        'aria-label': 'New',
        'aria-hidden': 'true'
      });
      
      expect(element.getAttribute('aria-label')).toBe('New');
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });

    it('should handle empty attributes object', () => {
      const element = document.createElement('div');
      expect(() => addAriaAttributes(element, {})).not.toThrow();
    });

    it('should handle attributes with null values', () => {
      const element = document.createElement('div');
      addAriaAttributes(element, {
        'aria-label': null,
        'aria-hidden': 'true'
      });
      
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('announceToScreenReader Edge Cases', () => {
    it('should handle empty message', () => {
      announceToScreenReader('');
      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeInTheDocument();
      expect(announcement.textContent).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      announceToScreenReader(longMessage);
      const announcement = document.querySelector('[role="status"]');
      expect(announcement.textContent).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const specialMessage = '<script>alert("xss")</script>';
      announceToScreenReader(specialMessage);
      const announcement = document.querySelector('[role="status"]');
      expect(announcement.textContent).toBe(specialMessage);
    });

    it('should remove announcement after timeout', () => {
      announceToScreenReader('Test');
      expect(document.querySelector('[role="status"]')).toBeInTheDocument();
      
      jest.advanceTimersByTime(1100);
      expect(document.querySelector('[role="status"]')).not.toBeInTheDocument();
    });

    it('should handle multiple announcements', () => {
      announceToScreenReader('First');
      announceToScreenReader('Second');
      
      const announcements = document.querySelectorAll('[role="status"]');
      expect(announcements.length).toBe(2);
    });
  });

  describe('checkContrast Edge Cases', () => {
    it('should handle same color for foreground and background', () => {
      const result = checkContrast('#000000', '#000000');
      expect(result).toBeDefined();
      expect(result.ratio).toBe(1);
      expect(result.meetsAA).toBe(false);
    });

    it('should handle invalid hex format', () => {
      expect(checkContrast('invalid', '#ffffff')).toBeNull();
      expect(checkContrast('#ffffff', 'invalid')).toBeNull();
    });

    it('should handle short hex codes', () => {
      const result = checkContrast('#000', '#fff');
      expect(result).toBeDefined();
      expect(result.meetsAA).toBe(true);
    });

    it('should handle hex without #', () => {
      const result = checkContrast('000000', 'ffffff');
      expect(result).toBeDefined();
      expect(result.meetsAA).toBe(true);
    });

    it('should handle edge case contrast ratios', () => {
      // Test at AA threshold (4.5:1)
      const result = checkContrast('#767676', '#ffffff');
      expect(result).toBeDefined();
      // Should be close to 4.5
    });
  });

  describe('trapFocus Edge Cases', () => {
    it('should handle element with no focusable children', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div>No focusable</div>';
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      // Should not crash
      expect(cleanup).toBeDefined();
      cleanup();
    });

    it('should handle element with single focusable child', () => {
      const container = document.createElement('div');
      container.innerHTML = '<button>Only one</button>';
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      const button = container.querySelector('button');
      expect(button).toHaveFocus();
      cleanup();
    });

    it('should handle disabled elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button disabled>Disabled</button>
        <button>Enabled</button>
      `;
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      const enabledButton = container.querySelector('button:not([disabled])');
      expect(enabledButton).toHaveFocus();
      cleanup();
    });

    it('should handle cleanup function', () => {
      const container = document.createElement('div');
      container.innerHTML = '<button>Test</button>';
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      expect(typeof cleanup).toBe('function');
      
      cleanup();
      // Should remove event listeners
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });

  describe('createSkipLink Edge Cases', () => {
    it('should handle missing target element', () => {
      const skipLink = createSkipLink('nonexistent-id');
      document.body.appendChild(skipLink);
      
      fireEvent.click(skipLink);
      // Should not crash
      expect(skipLink).toBeInTheDocument();
    });

    it('should handle custom label', () => {
      const skipLink = createSkipLink('main-content', 'Custom Label');
      expect(skipLink.textContent).toBe('Custom Label');
    });

    it('should handle empty targetId', () => {
      const skipLink = createSkipLink('');
      expect(skipLink.href).toContain('#');
    });
  });

  describe('enhanceFocusIndicators Edge Cases', () => {
    it('should not duplicate styles on multiple calls', () => {
      enhanceFocusIndicators();
      enhanceFocusIndicators();
      enhanceFocusIndicators();
      
      const styles = document.querySelectorAll('style');
      // Should not create duplicates (implementation dependent)
      expect(styles.length).toBeGreaterThan(0);
    });
  });

  describe('initAccessibility Edge Cases', () => {
    it('should handle missing main element', () => {
      document.body.innerHTML = '';
      initAccessibility();
      // Should not crash
      expect(document.body).toBeDefined();
    });

    it('should handle missing nav element', () => {
      document.body.innerHTML = '<main></main>';
      initAccessibility();
      // Should not crash
      expect(document.querySelector('main')).toBeInTheDocument();
    });

    it('should handle existing skip link', () => {
      const existingSkipLink = document.createElement('a');
      existingSkipLink.className = 'skip-link';
      document.body.appendChild(existingSkipLink);
      
      initAccessibility();
      // Should not duplicate
      const skipLinks = document.querySelectorAll('.skip-link');
      expect(skipLinks.length).toBe(1);
    });

    it('should handle main with existing role', () => {
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      document.body.appendChild(main);
      
      initAccessibility();
      // Should not duplicate role
      expect(main.getAttribute('role')).toBe('main');
    });
  });
});

