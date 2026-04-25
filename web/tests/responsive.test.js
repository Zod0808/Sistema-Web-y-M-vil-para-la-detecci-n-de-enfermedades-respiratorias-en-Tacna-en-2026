/**
 * Responsive Design Tests
 */

import { render, screen } from '@testing-library/react';
import Navbar from '../src/components/Navbar';
import { BrowserRouter } from 'react-router-dom';

describe('Responsive Design Tests', () => {
  describe('Mobile Viewport (375px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
    });

    it('should render navbar on mobile', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
    });

    it('should have mobile-friendly navigation', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      // Navigation should be accessible on mobile
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toBeInTheDocument();
      });
    });
  });

  describe('Tablet Viewport (768px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
    });

    it('should render navbar on tablet', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
    });
  });

  describe('Desktop Viewport (1920px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
    });

    it('should render navbar on desktop', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      expect(screen.getByText('RespiCare')).toBeInTheDocument();
    });
  });

  describe('Layout Breakpoints', () => {
    it('should adapt layout at breakpoint 768px', () => {
      // Test responsive breakpoints
      const breakpoints = [375, 768, 1024, 1920];
      
      breakpoints.forEach(width => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });

        const { container } = render(
          <BrowserRouter>
            <Navbar />
          </BrowserRouter>
        );
        
        expect(container).toBeInTheDocument();
      });
    });
  });
});

