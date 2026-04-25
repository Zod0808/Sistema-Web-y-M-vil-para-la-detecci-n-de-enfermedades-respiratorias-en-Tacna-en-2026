/**
 * User Flow Integration Tests
 * 
 * Tests complete user journeys across multiple components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../components/ThemeProvider';
import App from '../../App';
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

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: {} }
    });
    
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionId: 'test-session',
          message: 'Respuesta del bot',
          analysis: {
            id: 'test-analysis',
            shapExplanation: { key_factors: [] }
          }
        }
      }
    });
  });

  describe('Complete Symptom Analysis Flow', () => {
    it('should complete full symptom analysis journey', async () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );
      
      // 1. User arrives at home page
      await waitFor(() => {
        expect(screen.getByText(/home.welcome/i)).toBeInTheDocument();
      });
      
      // 2. User interacts with chatbot
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Tengo tos persistente y fiebre' } });
      
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      fireEvent.click(sendButton);
      
      // 3. System analyzes symptoms
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/symptom-analyzer'),
          expect.any(Object)
        );
      });
      
      // 4. User sees analysis results
      await waitFor(() => {
        expect(screen.getByText('Tengo tos persistente y fiebre')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate through all main pages', async () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );
      
      // Start at home
      await waitFor(() => {
        expect(screen.getByText(/home.welcome/i)).toBeInTheDocument();
      });
      
      // Navigate to dashboard (if link exists)
      const dashboardLinks = screen.queryAllByRole('link');
      const dashboardLink = dashboardLinks.find(link => 
        link.getAttribute('href')?.includes('dashboard') ||
        link.textContent.toLowerCase().includes('dashboard')
      );
      
      if (dashboardLink) {
        fireEvent.click(dashboardLink);
        await waitFor(() => {
          expect(screen.getByText(/estado del sistema|dashboard/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Theme Customization Flow', () => {
    it('should allow user to customize theme and see changes', () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );
      
      // Find theme toggle
      const themeButtons = screen.queryAllByRole('button');
      const themeToggle = themeButtons.find(btn => 
        btn.textContent.includes('tema') || 
        btn.textContent.includes('theme') ||
        btn.getAttribute('aria-label')?.includes('tema')
      );
      
      if (themeToggle) {
        // Toggle to dark
        fireEvent.click(themeToggle);
        expect(document.body).toHaveClass('theme-dark');
        
        // Toggle back to light
        fireEvent.click(themeToggle);
        expect(document.body).toHaveClass('theme-light');
      }
    });
  });

  describe('Language Selection Flow', () => {
    it('should allow user to change language and see updates', () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );
      
      // Find language selector
      const langButton = screen.queryByRole('button', { name: /seleccionar idioma/i });
      
      if (langButton) {
        fireEvent.click(langButton);
        
        const englishOption = screen.queryByRole('button', { name: /seleccionar english/i });
        if (englishOption) {
          fireEvent.click(englishOption);
          
          // Language should change
          expect(screen.getByText('English')).toBeInTheDocument();
        }
      }
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle errors and allow recovery', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'Service unavailable' } }
      }).mockResolvedValueOnce({
        data: { status: 'healthy' }
      });
      
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );
      
      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
      
      // Retry
      const retryButton = screen.getByText(/reintentar/i);
      fireEvent.click(retryButton);
      
      // Should recover
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Multi-step Analysis Flow', () => {
    it('should handle multi-step symptom analysis with follow-up questions', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              sessionId: 'test-session',
              message: '¿Cuánto tiempo llevas con la tos?',
              analysis: null
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              message: 'Basado en tus síntomas, te recomiendo...',
              analysis: {
                id: 'test-analysis',
                disease: 'Bronquitis',
                confidence: 0.85
              }
            }
          }
        });
      
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );
      
      // First message
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Tengo tos' } });
      fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/cuánto tiempo/i)).toBeInTheDocument();
      });
      
      // Follow-up message
      fireEvent.change(input, { target: { value: 'Hace 2 semanas' } });
      fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/recomiendo/i)).toBeInTheDocument();
      });
    });
  });
});

