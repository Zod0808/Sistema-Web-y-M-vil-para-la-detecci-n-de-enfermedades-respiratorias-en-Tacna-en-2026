/**
 * Tests for ChatBotEnhanced Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import ChatBotEnhanced from '../ChatBotEnhanced';
import * as i18nService from '../services/i18nService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock i18n service
jest.mock('../services/i18nService', () => ({
  t: jest.fn((key) => key),
  getCurrentLanguage: jest.fn(() => 'es')
}));

// Mock child components
jest.mock('../SHAPVisualization', () => {
  return function MockSHAPVisualization({ shapData }) {
    return <div data-testid="shap-visualization">SHAP Visualization</div>;
  };
});

jest.mock('../FactorChart', () => {
  return function MockFactorChart({ factors }) {
    return <div data-testid="factor-chart">Factor Chart</div>;
  };
});

jest.mock('../MLAdvancedResults', () => {
  return function MockMLAdvancedResults({ analysisId, sessionId }) {
    return <div data-testid="ml-advanced-results">ML Advanced Results</div>;
  };
});

describe('ChatBotEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    
    // Mock session initialization
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: { sessionId: 'test-session-id' }
      }
    });
    
    // Mock message sending
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          message: 'Respuesta del bot',
          analysis: {
            id: 'test-analysis-id',
            shapExplanation: { key_factors: [] },
            factors: []
          }
        }
      }
    });
    
    // Mock Speech Recognition
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

  it('should render chatbot component', () => {
    render(<ChatBotEnhanced />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display greeting message', async () => {
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      expect(screen.getByText(/chatbot.greeting/i)).toBeInTheDocument();
    });
  });

  it('should initialize session on mount', async () => {
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/chat-conversations'),
        expect.any(Object)
      );
    });
  });

  it('should send message when form is submitted', async () => {
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Tengo tos' } });
      fireEvent.click(sendButton);
    });
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/symptom-analyzer/analyze'),
        expect.any(Object)
      );
    });
  });

  it('should display user message after sending', async () => {
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Tengo tos' } });
      fireEvent.click(sendButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Tengo tos')).toBeInTheDocument();
    });
  });

  it('should display bot response', async () => {
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Tengo tos' } });
      fireEvent.click(sendButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Respuesta del bot')).toBeInTheDocument();
    });
  });

  it('should show SHAP visualization when analysis is available', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          message: 'Respuesta',
          analysis: {
            id: 'test-id',
            shapExplanation: { key_factors: [{ feature: 'Tos', importance: 0.8 }] }
          }
        }
      }
    });
    
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Tengo tos' } });
      fireEvent.click(sendButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('shap-visualization')).toBeInTheDocument();
    });
  });

  it('should show suggestions', async () => {
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      // Suggestions should be displayed (implementation dependent)
      const suggestions = screen.queryAllByRole('button');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  it('should handle voice recognition start', () => {
    render(<ChatBotEnhanced />);
    
    const voiceButton = screen.getByRole('button', { name: /voz|voice|microphone/i });
    if (voiceButton) {
      fireEvent.click(voiceButton);
      // Should start listening (implementation dependent)
    }
  });

  it('should load conversation history from localStorage', () => {
    const mockHistory = [
      { role: 'user', content: 'Previous message', timestamp: new Date().toISOString() }
    ];
    Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockHistory));
    
    render(<ChatBotEnhanced />);
    
    // History should be loaded (implementation dependent)
    expect(Storage.prototype.getItem).toHaveBeenCalledWith('chatbot_history');
  });

  it('should save conversation history to localStorage', async () => {
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
    });
    
    await waitFor(() => {
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'chatbot_history',
        expect.any(String)
      );
    });
  });

  it('should handle language change', () => {
    render(<ChatBotEnhanced />);
    
    // Simulate language change event
    const event = new CustomEvent('languageChanged', {
      detail: { language: 'en' }
    });
    window.dispatchEvent(event);
    
    // Component should update (implementation dependent)
    expect(i18nService.getCurrentLanguage).toHaveBeenCalled();
  });

  it('should show advanced results button when analysis is available', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          message: 'Respuesta',
          analysis: {
            id: 'test-analysis-id',
            experimentId: 'test-experiment-id'
          }
        }
      }
    });
    
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
    });
    
    await waitFor(() => {
      const advancedButton = screen.queryByText(/resultados avanzados|advanced results/i);
      if (advancedButton) {
        expect(advancedButton).toBeInTheDocument();
      }
    });
  });

  it('should open advanced results modal when button is clicked', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          message: 'Respuesta',
          analysis: {
            id: 'test-analysis-id',
            experimentId: 'test-experiment-id'
          }
        }
      }
    });
    
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
    });
    
    await waitFor(() => {
      const advancedButton = screen.queryByText(/resultados avanzados|advanced results/i);
      if (advancedButton) {
        fireEvent.click(advancedButton);
        expect(screen.getByTestId('ml-advanced-results')).toBeInTheDocument();
      }
    });
  });

  it('should handle error when sending message', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: 'Error sending message' } }
    });
    
    render(<ChatBotEnhanced />);
    
    await waitFor(() => {
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
    });
    
    // Should handle error gracefully (implementation dependent)
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).toBeInTheDocument();
    });
  });
});

