import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import ShapDashboard from '../ShapDashboard';

jest.mock('axios');

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockMetrics = {
  summary: {
    total_predictions: 12,
    avg_confidence: 0.82,
    median_confidence: 0.8,
  },
  quality_metrics: {
    high_confidence_rate: 32.5,
    medium_confidence_rate: 45.1,
    low_confidence_rate: 22.4,
  },
  distributions: {
    diseases: {
      asma: 5,
      bronquitis: 3,
      neumonia: 4,
    },
    urgency_levels: {
      high: 4,
      medium: 6,
      low: 2,
    },
  },
};

const mockFeatures = {
  top_features: [
    {
      feature_name: 'tos',
      positive: 0.45,
      negative: 0,
      shap_abs: 0.45,
      count: 3,
      avg_contribution: 0.15,
    },
    {
      feature_name: 'fiebre',
      positive: 0,
      negative: -0.2,
      shap_abs: 0.2,
      count: 2,
      avg_contribution: -0.1,
    },
  ],
  friendly_factors: [
    { description: "El síntoma 'tos' aumenta la probabilidad de este diagnóstico", count: 4 },
    { description: "El síntoma 'fiebre' aumenta la probabilidad de este diagnóstico", count: 2 },
  ],
};

const mockFairness = {
  F: {
    count: 7,
    avg_confidence: 0.86,
    high_confidence_rate: 0.6,
    urgency_distribution: {
      high: 3,
      medium: 3,
      low: 1,
    },
  },
  M: {
    count: 5,
    avg_confidence: 0.78,
    high_confidence_rate: 0.4,
    urgency_distribution: {
      high: 1,
      medium: 3,
      low: 1,
    },
  },
};

describe('ShapDashboard component', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/analytics/ml/monitoring')) {
        return Promise.resolve({ data: { success: true, data: mockMetrics } });
      }
      if (url.includes('/analytics/ml/features')) {
        return Promise.resolve({ data: { success: true, data: mockFeatures } });
      }
      if (url.includes('/analytics/ml/fairness')) {
        return Promise.resolve({ data: { success: true, data: mockFairness } });
      }

      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('muestra el dashboard de explicabilidad con datos', async () => {
    render(<ShapDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Explicabilidad de la IA/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Contribuciones SHAP principales/i)).toBeInTheDocument();
    expect(screen.getByText(/Explicabilidad de la IA/i)).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledTimes(3);
  });

  it('muestra un mensaje de error cuando fallan las peticiones', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    render(<ShapDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });
});

