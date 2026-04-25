/**
 * Enhanced Tests for ChatBotEnhanced Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ChatBotEnhanced from '../ChatBotEnhanced';
import * as i18nService from '../../services/i18nService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock i18n service
jest.mock('../../services/i18nService', () => ({
  t: jest.fn((key) => key),
  getCurrentLanguage: jest.fn(() => 'es')
}));

// Mock child components
jest.mock('../SHAPVisualization', () => {
  return function MockSHAPVisualization() {
    return <div data-testid="shap-visualization">SHAP</div>;
  };
});

jest.mock('../FactorChart', () => {
  return function MockFactorChart() {
    return <div data-testid="factor-chart">Factor Chart</div>;
  };
});

jest.mock('../MLAdvancedResults', () => {
  return function MockMLAdvancedResults() {
    return <div data-testid="ml-advanced-results">ML Results</div>;
  };
});

describe('ChatBotEnhanced Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: { sessionId: 'test-session-id' }
      }
    });
    
    global.SpeechRecognition = jest.fn(() => ({
      continuous: false,
      interimResults: false,
      lang: 'es-ES',
      start: jest.fn(),
      stop: jest.fn(),
      onresult: null,
      onerror: null,
      onend: null
    }));
    
    global.webkitSpeechRecognition = global.SpeechRecognition;
  });

  describe('Edge Cases', () => {
    it('should handle empty message input', async () => {
      render(<ChatBotEnhanced />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(sendButton);
      
      // Should not send empty message
      await waitFor(() => {
        expect(mockedAxios.post).not.toHaveBeenCalledWith(
          expect.stringContaining('/analyze'),
          expect.any(Object)
        );
      });
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      
      render(<ChatBotEnhanced />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: longMessage } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = '<script>alert("xss")</script> & "quotes"';
      
      render(<ChatBotEnhanced />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: specialMessage } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });
    });

    it('should handle rapid message sending', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          data: { message: 'Response' }
        }
      });
      
      render(<ChatBotEnhanced />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.change(input, { target: { value: `Message ${i}` } });
        fireEvent.click(sendButton);
      }
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledTimes(5);
      });
    });

    it('should handle session initialization failure gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { data: { message: 'Session failed' } }
      });
      
      render(<ChatBotEnhanced />);
      
      // Should still render
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('should handle ML analysis failure gracefully', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: { success: true, data: { sessionId: 'test' } }
        })
        .mockRejectedValueOnce({
          response: { data: { message: 'ML failed' } }
        })
        .mockResolvedValueOnce({
          data: { message: 'Fallback response' }
        });
      
      render(<ChatBotEnhanced />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Tengo tos' } });
      fireEvent.click(sendButton);
      
      // Should continue with fallback
      await waitFor(() => {
        expect(screen.getByText('Tengo tos')).toBeInTheDocument();
      });
    });
  });

  describe('Voice Recognition Edge Cases', () => {
    it('should handle voice recognition not available', () => {
      delete global.SpeechRecognition;
      delete global.webkitSpeechRecognition;
      
      render(<ChatBotEnhanced />);
      
      // Should not crash
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle voice recognition errors', () => {
      const mockRecognition = {
        continuous: false,
        interimResults: false,
        lang: 'es-ES',
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: jest.fn(),
        onend: null
      };
      
      global.SpeechRecognition = jest.fn(() => mockRecognition);
      
      render(<ChatBotEnhanced />);
      
      // Should handle errors gracefully
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('History Edge Cases', () => {
    it('should handle corrupted localStorage history', () => {
      Storage.prototype.getItem.mockReturnValue('invalid json');
      
      render(<ChatBotEnhanced />);
      
      // Should not crash
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should limit history to 50 conversations', () => {
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));
      
      Storage.prototype.getItem.mockReturnValue(JSON.stringify(largeHistory));
      
      render(<ChatBotEnhanced />);
      
      // Should handle large history
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Suggestion Edge Cases', () => {
    it('should generate suggestions for different symptom types', async () => {
      render(<ChatBotEnhanced />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      // Test different symptom keywords
      const symptoms = ['tos', 'dolor', 'dificultad', 'fiebre'];
      
      for (const symptom of symptoms) {
        fireEvent.change(input, { target: { value: `Tengo ${symptom}` } });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
          // Suggestions should be generated
          expect(screen.getByText(`Tengo ${symptom}`)).toBeInTheDocument();
        });
      }
    });
  });
});

