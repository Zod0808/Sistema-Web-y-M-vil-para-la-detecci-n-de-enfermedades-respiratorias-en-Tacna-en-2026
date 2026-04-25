/**
 * Unit tests for ChatBot Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ChatBot from '../ChatBot';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('ChatBot Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: { sessionId: 'test-session-id' }
      }
    });
  });

  describe('Component Rendering', () => {
    it('should render the chatbot component', () => {
      render(<ChatBot />);
      expect(screen.getByRole('heading', { name: /Asistente Respicare/i })).toBeInTheDocument();
    });

    it('should display welcome message on mount', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { sessionId: 'test-session-id' }
        }
      });

      render(<ChatBot />);
      
      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });
    });

    it('should render input field', () => {
      render(<ChatBot />);
      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      expect(input).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<ChatBot />);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe('Session Initialization', () => {
    it('should initialize chat session on mount', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { sessionId: 'test-session-id' }
        }
      });

      render(<ChatBot />);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/chat-conversations',
          expect.objectContaining({
            metadata: expect.objectContaining({
              source: 'web',
              language: 'es'
            })
          })
        );
      });
    });

    it('should handle session initialization error gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Session initialization failed'));

      render(<ChatBot />);

      // Component should still render even if session fails
      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Message Handling', () => {
    it('should send user message when form is submitted', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { sessionId: 'test-session-id' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            message: 'Respuesta del bot'
          }
        });

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Tengo tos y fiebre' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Tengo tos y fiebre')).toBeInTheDocument();
      });
    });

    it('should not send empty message', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { sessionId: 'test-session-id' }
        }
      });

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(sendButton);

      // Should not call API for empty message
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Only session init
    });

    it('should clear input after sending message', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { sessionId: 'test-session-id' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            message: 'Respuesta del bot'
          }
        });

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Bot Response Handling', () => {
    it('should display bot response after sending message', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { sessionId: 'test-session-id' }
          }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        })
        .mockResolvedValueOnce({
          data: {
            message: 'Esta es una respuesta del bot'
          }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        });

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Esta es una respuesta del bot')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle API error gracefully', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { sessionId: 'test-session-id' }
          }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        })
        .mockRejectedValueOnce(new Error('API Error'));

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      // Should show error message or handle gracefully
      await waitFor(() => {
        // Component should still be functional
        expect(input).toBeInTheDocument();
      });
    });

    it('should show loading state while waiting for response', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { sessionId: 'test-session-id' }
          }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        })
        .mockImplementationOnce(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                data: {
                  message: 'Respuesta del bot'
                }
              });
            }, 100);
          });
        })
        .mockResolvedValueOnce({
          data: { success: true }
        });

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      // Loading state should be visible
      await waitFor(() => {
        expect(sendButton).toBeDisabled();
      });
    });
  });

  describe('Symptom Extraction', () => {
    it('should extract symptoms from user message', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { sessionId: 'test-session-id' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              disease: 'Gripe',
              confidence: 0.85,
              urgency_level: 'medium'
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            message: 'Análisis completo'
          }
        });

      Storage.prototype.getItem = jest.fn(() => 'test-token');

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Tengo tos persistente y fiebre alta' } });
      fireEvent.click(sendButton);

      // Should attempt ML analysis if symptoms are detected
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/symptom-analyzer/ml-analyze',
          expect.objectContaining({
            symptoms: expect.any(Array)
          }),
          expect.any(Object)
        );
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ChatBot />);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });
      expect(sendButton).toHaveAttribute('aria-label', 'Enviar mensaje');
    });

    it('should be keyboard accessible', () => {
      render(<ChatBot />);
      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      // Input should be focusable
      input.focus();
      expect(input).toHaveFocus();

      // Button should be focusable
      fireEvent.change(input, { target: { value: 'Mensaje de prueba' } });
      expect(sendButton).not.toBeDisabled();
      sendButton.focus();
      expect(sendButton).toHaveFocus();
    });

    it('should support keyboard submission', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { sessionId: 'test-session-id' }
          }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        })
        .mockResolvedValueOnce({
          data: {
            message: 'Respuesta del bot'
          }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        });

      render(<ChatBot />);

      const input = screen.getByPlaceholderText(/describe tus síntomas/i);
      const sendButton = screen.getByRole('button', { name: /enviar mensaje/i });

      await waitFor(() => {
        expect(screen.getByText(/Hola!/i)).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
        expect(sendButton).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewport', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ChatBot />);
      expect(screen.getByRole('heading', { name: /Asistente Respicare/i })).toBeInTheDocument();
    });

    it('should render correctly on tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<ChatBot />);
      expect(screen.getByRole('heading', { name: /Asistente Respicare/i })).toBeInTheDocument();
    });

    it('should render correctly on desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      render(<ChatBot />);
      expect(screen.getByRole('heading', { name: /Asistente Respicare/i })).toBeInTheDocument();
    });
  });
});

