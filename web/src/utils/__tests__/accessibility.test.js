/**
 * Tests for Accessibility Utilities
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

describe('Accessibility Utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('addAriaAttributes', () => {
    it('should add ARIA attributes to element', () => {
      const element = document.createElement('div');
      
      addAriaAttributes(element, {
        'aria-label': 'Test label',
        'aria-hidden': 'true',
        'role': 'button'
      });
      
      expect(element.getAttribute('aria-label')).toBe('Test label');
      expect(element.getAttribute('aria-hidden')).toBe('true');
      expect(element.getAttribute('role')).toBe('button');
    });

    it('should not add non-ARIA attributes', () => {
      const element = document.createElement('div');
      
      addAriaAttributes(element, {
        'aria-label': 'Test',
        'data-testid': 'test',
        'class': 'test-class'
      });
      
      expect(element.getAttribute('aria-label')).toBe('Test');
      expect(element.getAttribute('data-testid')).toBeNull();
      expect(element.getAttribute('class')).toBeNull();
    });

    it('should handle null element gracefully', () => {
      expect(() => addAriaAttributes(null, { 'aria-label': 'test' })).not.toThrow();
    });

    it('should handle null attributes gracefully', () => {
      const element = document.createElement('div');
      expect(() => addAriaAttributes(element, null)).not.toThrow();
    });
  });

  describe('announceToScreenReader', () => {
    it('should create and append announcement element', () => {
      announceToScreenReader('Test message');
      
      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeInTheDocument();
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveAttribute('aria-atomic', 'true');
      expect(announcement).toHaveTextContent('Test message');
    });

    it('should use assertive priority when specified', () => {
      announceToScreenReader('Urgent message', 'assertive');
      
      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toHaveAttribute('aria-live', 'assertive');
    });

    it('should remove announcement after timeout', (done) => {
      announceToScreenReader('Test message');
      
      setTimeout(() => {
        const announcement = document.querySelector('[role="status"]');
        expect(announcement).not.toBeInTheDocument();
        done();
      }, 1100);
    });
  });

  describe('checkContrast', () => {
    it('should calculate contrast ratio correctly', () => {
      const result = checkContrast('#000000', '#ffffff');
      
      expect(result).toBeDefined();
      expect(result.ratio).toBeGreaterThan(1);
      expect(result.meetsAA).toBe(true);
      expect(result.meetsAAA).toBe(true);
    });

    it('should detect insufficient contrast', () => {
      const result = checkContrast('#cccccc', '#dddddd');
      
      expect(result).toBeDefined();
      expect(result.meetsAA).toBe(false);
    });

    it('should return null for invalid colors', () => {
      const result = checkContrast('invalid', '#ffffff');
      expect(result).toBeNull();
    });

    it('should handle hex colors without #', () => {
      const result = checkContrast('000000', 'ffffff');
      expect(result).toBeDefined();
      expect(result.ratio).toBeGreaterThan(1);
    });
  });

  describe('trapFocus', () => {
    it('should trap focus within element', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      `;
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      
      const buttons = container.querySelectorAll('button');
      expect(buttons[0]).toHaveFocus();
      
      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      buttons[2].dispatchEvent(tabEvent);
      
      // Should wrap to first button
      expect(buttons[0]).toHaveFocus();
      
      cleanup();
    });

    it('should handle Shift+Tab to go backwards', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>First</button>
        <button>Second</button>
      `;
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      
      const buttons = container.querySelectorAll('button');
      buttons[0].focus();
      
      // Simulate Shift+Tab from first button
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      buttons[0].dispatchEvent(shiftTabEvent);
      
      // Should wrap to last button
      expect(buttons[1]).toHaveFocus();
      
      cleanup();
    });

    it('should ignore non-Tab keys', () => {
      const container = document.createElement('div');
      container.innerHTML = '<button>Test</button>';
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      
      const button = container.querySelector('button');
      button.focus();
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(enterEvent);
      
      // Focus should not change
      expect(button).toHaveFocus();
      
      cleanup();
    });
  });

  describe('createSkipLink', () => {
    it('should create skip link element', () => {
      const skipLink = createSkipLink('main-content', 'Skip to main');
      
      expect(skipLink).toBeInstanceOf(HTMLAnchorElement);
      expect(skipLink.href).toContain('#main-content');
      expect(skipLink.textContent).toBe('Skip to main');
      expect(skipLink).toHaveClass('skip-link');
      expect(skipLink).toHaveAttribute('aria-label', 'Skip to main');
    });

    it('should scroll to target when clicked', () => {
      const target = document.createElement('main');
      target.id = 'main-content';
      document.body.appendChild(target);
      
      const skipLink = createSkipLink('main-content');
      document.body.appendChild(skipLink);
      
      const scrollIntoViewSpy = jest.fn();
      target.scrollIntoView = scrollIntoViewSpy;
      
      skipLink.click();
      
      expect(target).toHaveFocus();
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    });
  });

  describe('enhanceFocusIndicators', () => {
    it('should add focus indicator styles', () => {
      enhanceFocusIndicators();
      
      const style = document.querySelector('style');
      expect(style).toBeInTheDocument();
      expect(style.textContent).toContain(':focus-visible');
      expect(style.textContent).toContain('.skip-link');
      expect(style.textContent).toContain('.sr-only');
    });
  });

  describe('initAccessibility', () => {
    it('should initialize all accessibility features', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);
      
      initAccessibility();
      
      // Should add skip link
      const skipLink = document.querySelector('.skip-link');
      expect(skipLink).toBeInTheDocument();
      
      // Should enhance focus indicators
      const style = document.querySelector('style');
      expect(style).toBeInTheDocument();
      
      // Should add role to main
      expect(main).toHaveAttribute('role', 'main');
      expect(main).toHaveAttribute('id', 'main-content');
    });

    it('should not duplicate skip link if it exists', () => {
      const existingSkipLink = document.createElement('a');
      existingSkipLink.className = 'skip-link';
      document.body.appendChild(existingSkipLink);
      
      initAccessibility();
      
      const skipLinks = document.querySelectorAll('.skip-link');
      expect(skipLinks.length).toBe(1);
    });

    it('should add role to nav element if it exists', () => {
      const nav = document.createElement('nav');
      document.body.appendChild(nav);
      
      initAccessibility();
      
      expect(nav).toHaveAttribute('role', 'navigation');
    });
  });
});

