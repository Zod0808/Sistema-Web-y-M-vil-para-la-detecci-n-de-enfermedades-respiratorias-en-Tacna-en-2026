/**
 * E2E Tests for MLAdvancedResults Component
 * Tests rendering, data loading, and user interactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import MLAdvancedResults from '../MLAdvancedResults';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock child components
jest.mock('../SHAPVisualization', () => {
  return function MockSHAPVisualization({ data }) {
    return <div data-testid="shap-visualization">SHAP Visualization: {data ? 'Loaded' : 'No data'}</div>;
  };
});

jest.mock('../FactorChart', () => {
  return function MockFactorChart({ data }) {
    return <div data-testid="factor-chart">Factor Chart: {data ? 'Loaded' : 'No data'}</div>;
  };
});

describe('MLAdvancedResults Component', () => {
  const mockToken = 'test-token';
  const mockAnalysisId = 'analysis-123';
  const mockExperimentId = 'experiment-456';
  const mockSessionId = 'session-789';

  beforeEach(() => {
    localStorage.setItem('token', mockToken);
    mockedAxios.get.mockClear();
  });

  afterEach(() => {
    localStorage.removeItem('token');
  });

  describe('Rendering', () => {
    it('should render all tabs', () => {
      render(<MLAdvancedResults />);

      expect(screen.getByText('Explicaciones SHAP')).toBeInTheDocument();
      expect(screen.getByText('Comparación de Modelos')).toBeInTheDocument();
      expect(screen.getByText('Recomendaciones RL')).toBeInTheDocument();
      expect(screen.getByText('Historial de Experimentos')).toBeInTheDocument();
    });

    it('should render with default tab active', () => {
      render(<MLAdvancedResults />);

      const explanationsTab = screen.getByText('Explicaciones SHAP').closest('button');
      expect(explanationsTab).toHaveClass('active');
    });

    it('should render loading state', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<MLAdvancedResults analysisId={mockAnalysisId} />);

      expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    });

    it('should render error state', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      render(<MLAdvancedResults analysisId={mockAnalysisId} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch tabs when clicked', () => {
      render(<MLAdvancedResults />);

      const modelComparisonTab = screen.getByText('Comparación de Modelos');
      fireEvent.click(modelComparisonTab);

      expect(modelComparisonTab.closest('button')).toHaveClass('active');
    });

    it('should load data when switching to Model Comparison tab', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            models: [
              { name: 'Model A', accuracy: 0.85 },
              { name: 'Model B', accuracy: 0.90 }
            ]
          }
        }
      });

      render(<MLAdvancedResults />);

      const modelComparisonTab = screen.getByText('Comparación de Modelos');
      fireEvent.click(modelComparisonTab);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/ml/models/compare'),
          expect.objectContaining({
            headers: { Authorization: `Bearer ${mockToken}` }
          })
        );
      });
    });
  });

  describe('Data Loading', () => {
    it('should load analysis data when analysisId is provided', async () => {
      const mockShapData = {
        values: [0.1, 0.2, 0.3],
        base_value: 0.5,
        data: [1, 2, 3]
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            explanation: mockShapData
          }
        }
      });

      render(<MLAdvancedResults analysisId={mockAnalysisId} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining(`/symptom-analyzer/ml-analyze/${mockAnalysisId}`),
          expect.objectContaining({
            headers: { Authorization: `Bearer ${mockToken}` }
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('shap-visualization')).toHaveTextContent('Loaded');
      });
    });

    it('should load experiment data when experimentId is provided', async () => {
      const mockExperiments = [
        {
          experimentId: 'exp-1',
          experimentType: 'rl_session',
          status: 'completed',
          createdAt: new Date().toISOString()
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockExperiments
        }
      });

      render(<MLAdvancedResults experimentId={mockExperimentId} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/ml/experiments'),
          expect.objectContaining({
            params: { experimentId: mockExperimentId },
            headers: { Authorization: `Bearer ${mockToken}` }
          })
        );
      });
    });

    it('should load RL recommendations when sessionId is provided', async () => {
      const mockRecommendations = [
        {
          action: 'send_reminder',
          confidence: 0.85,
          recommendation: 'Send reminder now'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockRecommendations
        }
      });

      render(<MLAdvancedResults sessionId={mockSessionId} />);

      // Switch to RL recommendations tab
      const rlTab = screen.getByText('Recomendaciones RL');
      fireEvent.click(rlTab);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining(`/ml/rl/session/${mockSessionId}/recommendations`),
          expect.objectContaining({
            headers: { Authorization: `Bearer ${mockToken}` }
          })
        );
      });
    });
  });

  describe('SHAP Visualizations', () => {
    it('should display SHAP visualization when data is loaded', async () => {
      const mockShapData = {
        values: [0.1, 0.2, 0.3],
        base_value: 0.5,
        data: [1, 2, 3]
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            explanation: mockShapData
          }
        }
      });

      render(<MLAdvancedResults analysisId={mockAnalysisId} />);

      await waitFor(() => {
        expect(screen.getByTestId('shap-visualization')).toBeInTheDocument();
        expect(screen.getByTestId('shap-visualization')).toHaveTextContent('Loaded');
      });
    });

    it('should handle missing SHAP data gracefully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            explanation: null
          }
        }
      });

      render(<MLAdvancedResults analysisId={mockAnalysisId} />);

      await waitFor(() => {
        expect(screen.getByTestId('shap-visualization')).toHaveTextContent('No data');
      });
    });
  });

  describe('Model Comparison', () => {
    it('should display model comparison table', async () => {
      const mockComparison = {
        models: [
          {
            name: 'XGBoost',
            accuracy: 0.92,
            precision: 0.90,
            recall: 0.88,
            f1: 0.89
          },
          {
            name: 'Random Forest',
            accuracy: 0.88,
            precision: 0.86,
            recall: 0.85,
            f1: 0.855
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockComparison
        }
      });

      render(<MLAdvancedResults />);

      const modelComparisonTab = screen.getByText('Comparación de Modelos');
      fireEvent.click(modelComparisonTab);

      await waitFor(() => {
        expect(screen.getByText('XGBoost')).toBeInTheDocument();
        expect(screen.getByText('Random Forest')).toBeInTheDocument();
      });
    });
  });

  describe('RL Recommendations', () => {
    it('should display RL recommendations', async () => {
      const mockRecommendations = [
        {
          action: 'send_reminder',
          confidence: 0.85,
          recommendation: 'Send reminder now for optimal adherence',
          state_summary: { adherence_rate: 0.7 }
        },
        {
          action: 'delay_reminder',
          confidence: 0.65,
          recommendation: 'Delay reminder to reduce fatigue',
          state_summary: { fatigue_level: 0.6 }
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockRecommendations
        }
      });

      render(<MLAdvancedResults sessionId={mockSessionId} />);

      const rlTab = screen.getByText('Recomendaciones RL');
      fireEvent.click(rlTab);

      await waitFor(() => {
        expect(screen.getByText(/Send reminder now/i)).toBeInTheDocument();
        expect(screen.getByText(/Delay reminder/i)).toBeInTheDocument();
      });
    });
  });

  describe('Experiment History', () => {
    it('should display experiment history table', async () => {
      const mockExperiments = [
        {
          experimentId: 'exp-1',
          experimentType: 'rl_session',
          status: 'completed',
          createdAt: '2024-01-01T00:00:00Z',
          performance: {
            durationMs: 5000
          }
        },
        {
          experimentId: 'exp-2',
          experimentType: 'fl_round',
          status: 'running',
          createdAt: '2024-01-02T00:00:00Z'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockExperiments
        }
      });

      render(<MLAdvancedResults experimentId={mockExperimentId} />);

      const historyTab = screen.getByText('Historial de Experimentos');
      fireEvent.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('exp-1')).toBeInTheDocument();
        expect(screen.getByText('exp-2')).toBeInTheDocument();
      });
    });

    it('should filter experiments by type', async () => {
      const mockExperiments = [
        {
          experimentId: 'exp-1',
          experimentType: 'rl_session',
          status: 'completed'
        },
        {
          experimentId: 'exp-2',
          experimentType: 'fl_round',
          status: 'running'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockExperiments
        }
      });

      render(<MLAdvancedResults experimentId={mockExperimentId} />);

      const historyTab = screen.getByText('Historial de Experimentos');
      fireEvent.click(historyTab);

      await waitFor(() => {
        const filterSelect = screen.getByLabelText(/filtro/i);
        if (filterSelect) {
          fireEvent.change(filterSelect, { target: { value: 'rl_session' } });
        }
      });
    });
  });
});

