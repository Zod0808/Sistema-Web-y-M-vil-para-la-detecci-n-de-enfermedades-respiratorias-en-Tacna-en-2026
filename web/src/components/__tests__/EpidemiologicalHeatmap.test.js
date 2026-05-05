import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import EpidemiologicalHeatmap from '../EpidemiologicalHeatmap';

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

const mockHeatmapData = {
  success: true,
  data: [
    {
      district: 'Centro de Tacna',
      totalCases: 50,
      severity: 'high',
      highSeverity: 20,
      mediumSeverity: 20,
      lowSeverity: 10,
      coordinates: { latitude: -18.01, longitude: -70.25 },
    },
    {
      district: 'Pocollay',
      totalCases: 30,
      severity: 'medium',
      highSeverity: 5,
      mediumSeverity: 15,
      lowSeverity: 10,
      coordinates: { latitude: -18.03, longitude: -70.24 },
    },
  ],
};

const mockTrendsData = {
  success: true,
  data: {
    dailyTrends: [
      {
        _id: '2024-01-01',
        total: 10,
        data: [
          { severity: 'mild', count: 4 },
          { severity: 'moderate', count: 6 },
        ],
      },
    ],
  },
};

const resolveAll = () => {
  axios.get.mockImplementation((url) => {
    if (url.includes('heatmap')) return Promise.resolve({ data: mockHeatmapData });
    return Promise.resolve({ data: mockTrendsData });
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resolveAll();
});

describe('EpidemiologicalHeatmap', () => {
  it('shows loading state on mount', () => {
    axios.get.mockReturnValue(new Promise(() => {}));
    render(<EpidemiologicalHeatmap />);
    expect(screen.getByText(/cargando datos epidemiológicos/i)).toBeInTheDocument();
  });

  it('renders heading after data loads', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() =>
      expect(screen.getByText(/Heatmaps y Clusters Epidemiológicos/)).toBeInTheDocument()
    );
  });

  it('shows error state when API fails', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    render(<EpidemiologicalHeatmap />);
    await waitFor(() =>
      expect(screen.getByText(/no se pudieron cargar/i)).toBeInTheDocument()
    );
  });

  it('shows no data message when heatmap API returns success:false', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('heatmap'))
        return Promise.resolve({ data: { success: false, data: [] } });
      return Promise.resolve({ data: mockTrendsData });
    });
    render(<EpidemiologicalHeatmap />);
    await waitFor(() =>
      expect(screen.getByText(/no se encontraron datos/i)).toBeInTheDocument()
    );
  });

  it('renders period selector', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() =>
      screen.getByText(/Heatmaps y Clusters/)
    );
    expect(screen.getByDisplayValue(/últimos 30 días/i)).toBeInTheDocument();
  });

  it('renders district selector', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() => screen.getByText(/Heatmaps y Clusters/));
    const districtSelect = screen.getAllByRole('combobox').find(
      (s) => s.value === 'all'
    );
    expect(districtSelect).toBeInTheDocument();
  });

  it('renders heatmap type selector', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() => screen.getByText(/Heatmaps y Clusters/));
    expect(screen.getByDisplayValue(/geográfico/i)).toBeInTheDocument();
  });

  it('changes period and re-fetches data', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() => screen.getByText(/Heatmaps y Clusters/));

    const periodSelect = screen.getByDisplayValue(/últimos 30 días/i);
    fireEvent.change(periodSelect, { target: { value: '7d' } });
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(4)); // 2 initial + 2 re-fetch
  });

  it('switches heatmap type to temporal', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() => screen.getByText(/Heatmaps y Clusters/));

    const typeSelect = screen.getByDisplayValue(/geográfico/i);
    fireEvent.change(typeSelect, { target: { value: 'temporal' } });
    expect(screen.getByDisplayValue(/temporal/i)).toBeInTheDocument();
  });

  it('switches heatmap type to severity', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() => screen.getByText(/Heatmaps y Clusters/));

    const typeSelect = screen.getByDisplayValue(/geográfico/i);
    fireEvent.change(typeSelect, { target: { value: 'severity' } });
    expect(screen.getByDisplayValue(/por severidad/i)).toBeInTheDocument();
  });

  it('renders data table or chart area after loading', async () => {
    render(<EpidemiologicalHeatmap />);
    await waitFor(() => screen.getByText(/Heatmaps y Clusters/));
    // Data loaded — component renders charts/tables, not loading state
    expect(screen.queryByText(/cargando datos epidemiológicos/i)).not.toBeInTheDocument();
  });
});