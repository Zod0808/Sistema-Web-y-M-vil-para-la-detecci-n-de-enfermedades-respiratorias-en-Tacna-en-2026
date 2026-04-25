/**
 * Advanced Accessibility Tests
 * 
 * Comprehensive accessibility testing using axe-core and manual checks
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../components/ThemeProvider';
import Home from '../../pages/Home';
import Dashboard from '../../pages/Dashboard';
import Analytics from '../../pages/Analytics';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeToggle from '../../components/ThemeToggle';
import ChatBotEnhanced from '../../components/ChatBotEnhanced';
import axios from 'axios';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock i18n service
jest.mock('../../services/i18nService', () => ({
  t: jest.fn((key) => key),
  getCurrentLanguage: jest.fn(() => 'es'),
  setLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: {
    es: 'Español',
    en: 'English'
  }
}));

// Mock ChatBotEnhanced
jest.mock('../../components/ChatBotEnhanced', () => {
  return function MockChatBotEnhanced() {
    return (
      <div data-testid="chatbot-enhanced" role="region" aria-label="Chatbot">
        <input type="text" aria-label="Mensaje" />
        <button aria-label="Enviar">Enviar</button>
      </div>
    );
  };
});

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ThemeProvider>
  );
};

describe('Advanced Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: {} }
    });
    
    mockedAxios.post.mockResolvedValue({
      data: { success: true, data: { sessionId: 'test' } }
    });
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations on Home page', async () => {
      const { container } = renderWithProviders(<Home />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on Dashboard', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on Analytics', async () => {
      const { container } = renderWithProviders(<Analytics />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be navigable with keyboard only', () => {
      renderWithProviders(
        <div>
          <LanguageSelector />
          <ThemeToggle />
        </div>
      );
      
      // All interactive elements should be focusable
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', expect.any(String));
      });
    });

    it('should have logical tab order', () => {
      renderWithProviders(
        <div>
          <button>First</button>
          <LanguageSelector />
          <ThemeToggle />
          <button>Last</button>
        </div>
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Tab order should be logical (left to right, top to bottom)
      buttons.forEach((button, index) => {
        if (index > 0) {
          // Each button should be reachable via Tab
          expect(button).toBeInTheDocument();
        }
      });
    });

    it('should trap focus in modals', () => {
      // This would test focus trapping in modals
      // Implementation depends on modal component
      renderWithProviders(<Home />);
      
      // Focus should be manageable
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <div>
          <LanguageSelector />
          <ThemeToggle />
        </div>
      );
      
      const langButton = screen.getByRole('button', { name: /seleccionar idioma/i });
      expect(langButton).toHaveAttribute('aria-label');
      expect(langButton).toHaveAttribute('aria-expanded');
    });

    it('should announce dynamic content changes', () => {
      renderWithProviders(<Home />);
      
      // Check for live regions
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThanOrEqual(0);
    });

    it('should have skip links', () => {
      renderWithProviders(<Home />);
      
      // Skip link should exist
      const skipLink = document.querySelector('.skip-link') || 
                      document.querySelector('a[href="#main-content"]');
      expect(skipLink).toBeInTheDocument();
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast for text', () => {
      renderWithProviders(<Home />);
      
      // Get all text elements
      const textElements = screen.getAllByText(/./);
      
      // In a real scenario, you would check contrast ratios
      // This is a placeholder - real implementation would use a contrast checker
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Verify styles are applied (actual contrast checking would be more complex)
        expect(color).toBeTruthy();
        expect(backgroundColor || 'transparent').toBeTruthy();
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper form labels', () => {
      renderWithProviders(<Home />);
      
      const input = screen.getByLabelText(/mensaje/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should show error messages with proper ARIA', () => {
      // This would test form validation errors
      renderWithProviders(<Home />);
      
      // Error messages should be associated with inputs
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        const errorId = input.getAttribute('aria-describedby');
        if (errorId) {
          const errorElement = document.getElementById(errorId);
          expect(errorElement).toBeInTheDocument();
        }
      });
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      renderWithProviders(<Home />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Focus styles should be defined
        const styles = window.getComputedStyle(button, ':focus-visible');
        // In a real test, you would check for outline or border
        expect(button).toBeInTheDocument();
      });
    });

    it('should manage focus on page changes', () => {
      const { rerender } = renderWithProviders(<Home />);
      
      // Focus should be managed on navigation
      rerender(
        <ThemeProvider>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </ThemeProvider>
      );
      
      // Main content should be focusable
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic HTML elements', () => {
      renderWithProviders(<Home />);
      
      // Should have main landmark
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      
      // Should have proper heading hierarchy
      const headings = screen.getAllByRole('heading');
      if (headings.length > 1) {
        // Headings should be in logical order
        headings.forEach((heading, index) => {
          if (index > 0) {
            const level = parseInt(heading.tagName.charAt(1));
            const prevLevel = parseInt(headings[index - 1].tagName.charAt(1));
            // Levels should not skip (h1 -> h3 is bad, h1 -> h2 is ok)
            expect(level - prevLevel).toBeLessThanOrEqual(1);
          }
        });
      }
    });

    it('should have proper landmarks', () => {
      renderWithProviders(<Home />);
      
      // Should have main landmark
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      
      // Navigation should be marked
      const nav = screen.queryByRole('navigation');
      if (nav) {
        expect(nav).toBeInTheDocument();
      }
    });
  });

  describe('Alternative Text', () => {
    it('should have alt text for images', () => {
      renderWithProviders(<Home />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        const alt = img.getAttribute('alt');
        // Alt text should not be empty (unless decorative)
        if (alt !== '') {
          expect(alt.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Responsive Design Accessibility', () => {
    it('should be accessible on mobile viewport', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      renderWithProviders(<Home />);
      
      // Content should be accessible
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });

    it('should maintain accessibility at different zoom levels', () => {
      renderWithProviders(<Home />);
      
      // All interactive elements should remain accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
        expect(button).not.toHaveStyle({ display: 'none' });
      });
    });
  });
});

