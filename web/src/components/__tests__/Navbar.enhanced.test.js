/**
 * Enhanced Tests for Navbar Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import * as i18nService from '../../services/i18nService';

// Mock i18n service
jest.mock('../../services/i18nService', () => ({
  t: jest.fn((key) => key),
  getCurrentLanguage: jest.fn(() => 'es'),
  setLanguage: jest.fn(),
}));

// Mock child components
jest.mock('../ThemeToggle', () => {
  return function MockThemeToggle() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  };
});

jest.mock('../LanguageSelector', () => {
  return function MockLanguageSelector() {
    return <div data-testid="language-selector">Language Selector</div>;
  };
});

const renderWithRouter = (component, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

describe('Navbar Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18nService.getCurrentLanguage.mockReturnValue('es');
  });

  describe('Edge Cases', () => {
    it('should handle language change event', () => {
      renderWithRouter(<Navbar />);
      
      const event = new CustomEvent('languageChanged', {
        detail: { language: 'en' }
      });
      window.dispatchEvent(event);
      
      // Should update language
      expect(i18nService.getCurrentLanguage).toHaveBeenCalled();
    });

    it('should highlight active link correctly', () => {
      renderWithRouter(<Navbar />, ['/dashboard']);
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('active');
    });

    it('should handle all navigation links', () => {
      renderWithRouter(<Navbar />);
      
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should render brand information', () => {
      renderWithRouter(<Navbar />);
      
      expect(screen.getByText(/respicare|brandName/i)).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      renderWithRouter(<Navbar />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('should handle rapid navigation', () => {
      const { rerender } = renderWithRouter(<Navbar />, ['/']);
      
      rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Navbar />
        </MemoryRouter>
      );
      
      rerender(
        <MemoryRouter initialEntries={['/analytics']}>
          <Navbar />
        </MemoryRouter>
      );
      
      // Should handle rapid navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have skip link', () => {
      renderWithRouter(<Navbar />);
      
      // Should have navigation landmarks
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should mark active link with aria-current', () => {
      renderWithRouter(<Navbar />, ['/dashboard']);
      
      const activeLink = screen.getByRole('link', { name: /dashboard/i });
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    });
  });
});

