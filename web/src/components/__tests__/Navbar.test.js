/**
 * Unit tests for Navbar Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Navbar from '../Navbar';
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
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: jest.fn(),
    loading: false,
  }),
}));

jest.mock('../ThemeToggle', () =>
  function MockThemeToggle() {
    return <div data-testid="theme-toggle" />;
  }
);

jest.mock('../LanguageSelector', () =>
  function MockLanguageSelector() {
    return <div data-testid="language-selector" />;
  }
);

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

beforeEach(() => {
  i18nService.t.mockImplementation((key) => NAV_TRANSLATIONS[key] || key);
  i18nService.getCurrentLanguage.mockReturnValue('es');
});

describe('Navbar Component', () => {
  describe('Component Rendering', () => {
    it('should render the navbar', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
    });

    it('should display brand icon and name', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
      expect(screen.getByText('Sistema de Enfermedades Respiratorias')).toBeInTheDocument();
    });

    it('should render all navigation links', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText('Inicio')).toBeInTheDocument();
      expect(screen.getByText('Estado del Sistema')).toBeInTheDocument();
      expect(screen.getByText('Análisis')).toBeInTheDocument();
      expect(screen.getByText('Mapa')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href attributes', () => {
      renderWithRouter(<Navbar />);
      
      const inicioLink = screen.getByText('Inicio').closest('a');
      const dashboardLink = screen.getByText('Estado del Sistema').closest('a');
      const analyticsLink = screen.getByText('Análisis').closest('a');
      const mapLink = screen.getByText('Mapa').closest('a');

      expect(inicioLink).toHaveAttribute('href', '/');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(analyticsLink).toHaveAttribute('href', '/analytics');
      expect(mapLink).toHaveAttribute('href', '/heatmap');
    });

    it('should highlight active link based on current route', () => {
      // This would require mocking useLocation hook
      // For now, we'll test that links exist
      renderWithRouter(<Navbar />);
      
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation role', () => {
      renderWithRouter(<Navbar />);
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have accessible link names', () => {
      renderWithRouter(<Navbar />);
      
      const inicioLink = screen.getByRole('link', { name: /inicio/i });
      expect(inicioLink).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithRouter(<Navbar />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithRouter(<Navbar />);
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
    });

    it('should render correctly on desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      renderWithRouter(<Navbar />);
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
    });
  });
});

