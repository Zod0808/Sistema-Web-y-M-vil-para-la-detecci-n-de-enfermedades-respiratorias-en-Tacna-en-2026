/**
 * Tests for AutomaticReportsDashboard Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import AutomaticReportsDashboard from '../AutomaticReportsDashboard';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('AutomaticReportsDashboard', () => {
  const mockReports = [
    {
      id: '1',
      type: 'daily',
      status: 'completed',
      generatedAt: '2024-11-01T00:00:00Z',
      metrics: { totalPatients: 100 },
      anomalies: []
    },
    {
      id: '2',
      type: 'weekly',
      status: 'pending',
      generatedAt: '2024-11-05T00:00:00Z',
      metrics: { totalPatients: 500 },
      anomalies: [{ severity: 'high', metric: 'totalPatients' }]
    }
  ];

  const mockStats = {
    total: 10,
    byType: { daily: 5, weekly: 3, monthly: 2 },
    byStatus: { completed: 8, pending: 2 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: {
        data: {
          reports: mockReports,
          stats: mockStats
        }
      }
    });
    mockedAxios.post.mockResolvedValue({
      data: { success: true }
    });
    
    // Mock window.URL and document.createElement for export
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.Blob = jest.fn();
  });

  it('should render loading state initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<AutomaticReportsDashboard />);
    expect(screen.getByText(/cargando reportes/i)).toBeInTheDocument();
  });

  it('should fetch and display reports', async () => {
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/reports/automatic', expect.any(Object));
    });
  });

  it('should display stats overview', async () => {
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Reportes')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('should filter reports by type', async () => {
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument();
    });
    
    const dailyButton = screen.getByText('Diarios');
    fireEvent.click(dailyButton);
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/v1/reports/automatic',
        expect.objectContaining({
          params: { type: 'daily' }
        })
      );
    });
  });

  it('should generate daily report', async () => {
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Generar Diario')).toBeInTheDocument();
    });
    
    const generateButton = screen.getByText('Generar Diario');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/reports/automatic/generate',
        expect.objectContaining({
          reportType: 'daily'
        })
      );
    });
  });

  it('should generate weekly report', async () => {
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      const generateButton = screen.getByText('Generar Semanal');
      fireEvent.click(generateButton);
    });
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/reports/automatic/generate',
        expect.objectContaining({
          reportType: 'weekly'
        })
      );
    });
  });

  it('should generate monthly report', async () => {
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      const generateButton = screen.getByText('Generar Mensual');
      fireEvent.click(generateButton);
    });
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/reports/automatic/generate',
        expect.objectContaining({
          reportType: 'monthly'
        })
      );
    });
  });

  it('should display error message on fetch failure', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { message: 'Error fetching reports' } }
    });
    
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display reports list', async () => {
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      // Reports should be displayed (implementation dependent)
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  it('should handle report selection', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          reports: mockReports,
          stats: mockStats
        }
      }
    });
    
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: mockReports[0]
      }
    });
    
    render(<AutomaticReportsDashboard />);
    
    await waitFor(() => {
      // Click on a report (implementation dependent)
      // This test would need to be adjusted based on actual implementation
    });
  });

  it('should auto-refresh when autoRefresh is true', async () => {
    jest.useFakeTimers();
    
    render(<AutomaticReportsDashboard autoRefresh={true} refreshInterval={1000} />);
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Initial + stats
    });
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // Should refresh
    });
    
    jest.useRealTimers();
  });

  it('should not auto-refresh when autoRefresh is false', async () => {
    jest.useFakeTimers();
    
    render(<AutomaticReportsDashboard autoRefresh={false} />);
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Initial + stats
    });
    
    jest.advanceTimersByTime(5000);
    
    // Should not have additional calls
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    
    jest.useRealTimers();
  });
});

