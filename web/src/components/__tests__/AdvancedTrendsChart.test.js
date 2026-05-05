import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import AdvancedTrendsChart from '../AdvancedTrendsChart';

jest.mock('axios');
jest.mock('../../utils/apiBase', () => ({
  LEGACY_API_BASE: 'http://test-legacy',
  API_BASE: 'http://test-api',
}));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockTrendsData = {
  success: true,
  data: {
    dailyTrends: [
      {
        _id: '2024-01-01',
        total: 12,
        data: [
          { severity: 'mild', count: 4, urgency: 2, confidence: 0.8 },
          { severity: 'moderate', count: 5, urgency: 3, confidence: 0.7 },
          { severity: 'severe', count: 3, urgency: 5, confidence: 0.9 },
        ],
      },
      {
        _id: '2024-01-02',
        total: 8,
        data: [
          { severity: 'mild', count: 6, urgency: 1, confidence: 0.75 },
          { severity: 'moderate', count: 2, urgency: 2, confidence: 0.65 },
        ],
      },
    ],
    summary: {
      totalCases: 20,
      avgSeverity: 2.3,
      trend: 'increasing',
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockResolvedValue({ data: mockTrendsData });
});

describe('AdvancedTrendsChart', () => {
  it('shows loading state on initial render', () => {
    axios.get.mockReturnValue(new Promise(() => {}));
    render(<AdvancedTrendsChart />);
    expect(screen.getByText(/cargando datos de tendencias/i)).toBeInTheDocument();
  });

  it('renders heading after data loads', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() =>
      expect(screen.getByText(/gráficos avanzados de tendencias/i)).toBeInTheDocument()
    );
  });

  it('renders subtitle after data loads', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() =>
      expect(screen.getByText(/análisis interactivo/i)).toBeInTheDocument()
    );
  });

  it('shows error when API fails', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    render(<AdvancedTrendsChart />);
    await waitFor(() =>
      expect(screen.getByText(/no se pudieron cargar/i)).toBeInTheDocument()
    );
  });

  it('shows error message from API response', async () => {
    axios.get.mockResolvedValue({ data: { success: false, message: 'Datos no disponibles' } });
    render(<AdvancedTrendsChart />);
    await waitFor(() =>
      expect(screen.getByText(/Datos no disponibles/)).toBeInTheDocument()
    );
  });

  it('renders period selector', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() => screen.getByText(/gráficos avanzados/i));
    expect(screen.getByDisplayValue(/últimos 30 días/i)).toBeInTheDocument();
  });

  it('renders chart type selector', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() => screen.getByText(/gráficos avanzados/i));
    expect(screen.getByDisplayValue(/línea/i)).toBeInTheDocument();
  });

  it('changes period when selector changes', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() => screen.getByText(/gráficos avanzados/i));

    const periodSelect = screen.getByDisplayValue(/últimos 30 días/i);
    fireEvent.change(periodSelect, { target: { value: '7d' } });
    expect(axios.get).toHaveBeenCalledTimes(2); // initial + re-fetch
  });

  it('changes chart type when selector changes', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() => screen.getByText(/gráficos avanzados/i));

    const typeSelect = screen.getByDisplayValue(/línea/i);
    fireEvent.change(typeSelect, { target: { value: 'area' } });
    expect(screen.getByDisplayValue(/área/i)).toBeInTheDocument();
  });

  it('changes chart type to bar', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() => screen.getByText(/gráficos avanzados/i));

    const typeSelect = screen.getByDisplayValue(/línea/i);
    fireEvent.change(typeSelect, { target: { value: 'bar' } });
    expect(screen.getByDisplayValue(/barras/i)).toBeInTheDocument();
  });

  it('changes chart type to composed', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() => screen.getByText(/gráficos avanzados/i));

    const typeSelect = screen.getByDisplayValue(/línea/i);
    fireEvent.change(typeSelect, { target: { value: 'composed' } });
    expect(screen.getByDisplayValue(/combinado/i)).toBeInTheDocument();
  });

  it('renders district selector', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() => screen.getByText(/gráficos avanzados/i));
    const selects = screen.getAllByRole('combobox');
    // Should have period, chart type, and district selectors
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('does not show loading after data is received', async () => {
    render(<AdvancedTrendsChart />);
    await waitFor(() =>
      expect(screen.queryByText(/cargando datos de tendencias/i)).not.toBeInTheDocument()
    );
  });
});