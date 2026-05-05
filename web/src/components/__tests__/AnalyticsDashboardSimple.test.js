import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import AnalyticsDashboardSimple from '../AnalyticsDashboardSimple';

jest.mock('axios');
jest.mock('../../utils/apiBase', () => ({
  LEGACY_API_BASE: 'http://test-legacy',
  API_BASE: 'http://test-api',
}));

const mockedAxios = axios;

const mockDashboardData = {
  overview: {
    totalReports: 1000,
    recentReports: 150,
    urgentReports: 25,
    totalConversations: 500,
  },
  distributions: {
    severity: [
      { _id: 'high', count: 25 },
      { _id: 'medium', count: 50 },
      { _id: 'low', count: 75 },
    ],
    diseases: [
      { _id: 'Asma', count: 200 },
      { _id: 'Bronquitis', count: 150 },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAxios.get.mockResolvedValue({ data: mockDashboardData });
});

describe('AnalyticsDashboardSimple', () => {
  it('should render loading state initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));
    render(<AnalyticsDashboardSimple />);
    expect(screen.getByText(/cargando dashboard/i)).toBeInTheDocument();
  });

  it('should fetch dashboard data on mount', async () => {
    render(<AnalyticsDashboardSimple />);
    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/analytics/dashboard')
      )
    );
  });

  it('should display heading after data loads', async () => {
    render(<AnalyticsDashboardSimple />);
    await waitFor(() =>
      expect(screen.getByText(/dashboard de análisis avanzado/i)).toBeInTheDocument()
    );
  });

  it('should display error message on fetch failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
    render(<AnalyticsDashboardSimple />);
    await waitFor(() =>
      expect(screen.getByText(/reintentar/i)).toBeInTheDocument()
    );
  });

  it('should retry on error button click', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
    render(<AnalyticsDashboardSimple />);
    await waitFor(() => screen.getByText(/reintentar/i));
    fireEvent.click(screen.getByText(/reintentar/i));
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(2));
  });

  it('should display no data message when data has no overview', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} });
    render(<AnalyticsDashboardSimple />);
    await waitFor(() =>
      expect(screen.getByText(/no se encontraron datos/i)).toBeInTheDocument()
    );
  });

  it('should display refresh button after data loads', async () => {
    render(<AnalyticsDashboardSimple />);
    await waitFor(() =>
      expect(screen.getByText(/actualizar/i)).toBeInTheDocument()
    );
  });

  it('should refresh data when refresh button is clicked', async () => {
    render(<AnalyticsDashboardSimple />);
    await waitFor(() => screen.getByText(/actualizar/i));
    fireEvent.click(screen.getByText(/actualizar/i));
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(2));
  });
});