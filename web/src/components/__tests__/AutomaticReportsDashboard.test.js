/**
 * Tests for AutomaticReportsDashboard Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import AutomaticReportsDashboard from '../AutomaticReportsDashboard';

jest.mock('axios');
jest.mock('../../utils/apiBase', () => ({ API_BASE: 'http://test-api' }));

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockedAxios = axios;

describe('AutomaticReportsDashboard', () => {
  const mockReports = [
    {
      _id: '1',
      reportType: 'daily',
      status: 'completed',
      period: { startDate: '2024-11-01T00:00:00Z', endDate: '2024-11-01T23:59:59Z' },
      generatedAt: '2024-11-01T00:00:00Z',
      metrics: { totalPatients: 100, totalMedicalHistories: 50, totalAlerts: 5, totalAppointments: 20 },
      anomalies: []
    },
    {
      _id: '2',
      reportType: 'weekly',
      status: 'pending',
      period: { startDate: '2024-11-05T00:00:00Z', endDate: '2024-11-11T23:59:59Z' },
      generatedAt: '2024-11-05T00:00:00Z',
      metrics: { totalPatients: 500, totalMedicalHistories: 200, totalAlerts: 10, totalAppointments: 80 },
      anomalies: [{ severity: 'high', metric: 'totalPatients', value: 600, expectedRange: { min: 400, max: 550 } }]
    }
  ];

  const mockStats = {
    total: 10,
    byType: { daily: 5, weekly: 3, monthly: 2 },
    byStatus: { completed: 8, pending: 2, generating: 0, failed: 0, exported: 0 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockImplementation((url) => {
      if (url && url.includes('stats')) {
        return Promise.resolve({ data: { data: mockStats } });
      }
      return Promise.resolve({
        data: { data: { reports: mockReports } }
      });
    });
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
  });

  it('should render loading state initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));
    render(<AutomaticReportsDashboard />);
    expect(screen.getByText(/cargando reportes/i)).toBeInTheDocument();
  });

  it('should fetch and display reports', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('reports/automatic'),
      expect.any(Object)
    );
  });

  it('should display stats total after load', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => expect(screen.getAllByText('10').length).toBeGreaterThan(0));
  });

  it('should display stats by type', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => expect(screen.getAllByText('5').length).toBeGreaterThan(0));
  });

  it('should filter reports - all button exists', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => expect(screen.getByText('Todos')).toBeInTheDocument());
  });

  it('should filter reports - clicking Diarios filters by daily', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => screen.getByText('Todos'));
    const dailyBtn = screen.getAllByText(/diarios/i).find(el => el.tagName === 'BUTTON');
    fireEvent.click(dailyBtn);
    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('reports/automatic'),
        expect.objectContaining({ params: { type: 'daily' } })
      )
    );
  });

  it('should generate daily report on button click', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => screen.getByText(/reportes automáticos/i));
    const btn = screen.getByText(/generar diario/i);
    fireEvent.click(btn);
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('generate'),
        expect.objectContaining({ reportType: 'daily' })
      )
    );
  });

  it('should generate weekly report', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => screen.getByText(/reportes automáticos/i));
    fireEvent.click(screen.getByText(/generar semanal/i));
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('generate'),
        expect.objectContaining({ reportType: 'weekly' })
      )
    );
  });

  it('should generate monthly report', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => screen.getByText(/reportes automáticos/i));
    fireEvent.click(screen.getByText(/generar mensual/i));
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('generate'),
        expect.objectContaining({ reportType: 'monthly' })
      )
    );
  });

  it('should display error message on fetch failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() =>
      expect(document.querySelector('.error-message')).toBeInTheDocument()
    );
  });

  it('should display reports section after loading', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    expect(document.querySelector('.automatic-reports-dashboard')).toBeInTheDocument();
  });

  it('should render subtitle text', async () => {
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    await waitFor(() =>
      expect(screen.getByText(/resúmenes periódicos/i)).toBeInTheDocument()
    );
  });

  it('should not auto-refresh when autoRefresh is false', async () => {
    jest.useFakeTimers();
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    const callsAfterMount = mockedAxios.get.mock.calls.length;
    jest.advanceTimersByTime(60000);
    expect(mockedAxios.get.mock.calls.length).toBe(callsAfterMount);
    jest.useRealTimers();
  });
});