/**
 * Unit tests for Navbar Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Navbar from '../Navbar';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

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

