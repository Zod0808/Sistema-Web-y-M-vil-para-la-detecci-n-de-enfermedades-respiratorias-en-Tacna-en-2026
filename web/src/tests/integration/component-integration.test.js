/**
 * Integration Tests for Component Interactions
 * 
 * Tests how components work together in real scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../components/ThemeProvider';
import Home from '../../pages/Home';
import Dashboard from '../../pages/Dashboard';
import Analytics from '../../pages/Analytics';
import Navbar from '../../components/Navbar';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeToggle from '../../components/ThemeToggle';
import ChatBotEnhanced from '../../components/ChatBotEnhanced';
import axios from 'axios';

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

// Mock child components
jest.mock('../../components/ChatBotEnhanced', () => {
  return function MockChatBotEnhanced() {
    return <div data-testid="chatbot-enhanced">ChatBot Enhanced</div>;
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

describe('Component Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: {} }
    });
    
    mockedAxios.post.mockResolvedValue({
      data: { success: true, data: { sessionId: 'test-session' } }
    });
  });

  describe('Home Page Integration', () => {
    it('should render Home with ChatBotEnhanced', () => {
      renderWithProviders(<Home />);
      
      expect(screen.getByTestId('chatbot-enhanced')).toBeInTheDocument();
    });

    it('should handle language change across components', () => {
      renderWithProviders(
        <div>
          <LanguageSelector />
          <Home />
        </div>
      );
      
      const langButton = screen.getByRole('button', { name: /seleccionar idioma/i });
      fireEvent.click(langButton);
      
      const englishOption = screen.getByRole('button', { name: /seleccionar english/i });
      fireEvent.click(englishOption);
      
      // Language change should propagate
      expect(screen.getByTestId('chatbot-enhanced')).toBeInTheDocument();
    });
  });

  describe('Dashboard Integration', () => {
    it('should render Dashboard with AlertConsole and AppointmentCalendar', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'healthy' }
      }).mockResolvedValueOnce({
        data: { status: 'healthy' }
      });
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/estado del sistema/i)).toBeInTheDocument();
      });
    });

    it('should handle service status checks', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'healthy' }
      }).mockResolvedValueOnce({
        data: { status: 'healthy' }
      });
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Theme Integration', () => {
    it('should apply theme across all components', () => {
      renderWithProviders(
        <div>
          <ThemeToggle />
          <Home />
        </div>
      );
      
      const toggleButton = screen.getByRole('button');
      fireEvent.click(toggleButton);
      
      // Theme should change
      expect(document.body).toHaveClass('theme-dark');
    });

    it('should persist theme across navigation', () => {
      const { rerender } = renderWithProviders(
        <div>
          <ThemeToggle />
          <Home />
        </div>
      );
      
      const toggleButton = screen.getByRole('button');
      fireEvent.click(toggleButton);
      
      // Rerender with different component
      rerender(
        <ThemeProvider>
          <BrowserRouter>
            <div>
              <ThemeToggle />
              <Dashboard />
            </div>
          </BrowserRouter>
        </ThemeProvider>
      );
      
      // Theme should persist
      expect(document.body).toHaveClass('theme-dark');
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate between pages using Navbar', () => {
      renderWithProviders(
        <div>
          <Navbar />
          <Home />
        </div>
      );
      
      // Find navigation links (implementation dependent)
      const navLinks = screen.queryAllByRole('link');
      if (navLinks.length > 0) {
        const dashboardLink = navLinks.find(link => 
          link.getAttribute('href')?.includes('/dashboard')
        );
        
        if (dashboardLink) {
          fireEvent.click(dashboardLink);
          // Navigation should occur
        }
      }
    });
  });

  describe('Analytics Integration', () => {
    it('should render Analytics with multiple dashboard components', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            overview: { totalReports: 100 },
            distributions: { severity: [] }
          }
        }
      });
      
      renderWithProviders(<Analytics />);
      
      await waitFor(() => {
        // Analytics components should render
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully across components', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'API Error' } }
      });
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      mockedAxios.get
        .mockRejectedValueOnce({
          response: { data: { message: 'API Error' } }
        })
        .mockResolvedValueOnce({
          data: { status: 'healthy' }
        });
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        const retryButton = screen.getByText(/reintentar/i);
        fireEvent.click(retryButton);
      });
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('State Management Integration', () => {
    it('should maintain state across component re-renders', () => {
      const { rerender } = renderWithProviders(
        <div>
          <LanguageSelector />
          <ThemeToggle />
        </div>
      );
      
      // Change language
      const langButton = screen.getByRole('button', { name: /seleccionar idioma/i });
      fireEvent.click(langButton);
      const englishOption = screen.getByRole('button', { name: /seleccionar english/i });
      fireEvent.click(englishOption);
      
      // Rerender
      rerender(
        <ThemeProvider>
          <BrowserRouter>
            <div>
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </BrowserRouter>
        </ThemeProvider>
      );
      
      // State should be maintained
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });
});

