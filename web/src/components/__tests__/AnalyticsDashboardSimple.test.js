/**
 * Tests for AnalyticsDashboardSimple Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import AnalyticsDashboardSimple from '../AnalyticsDashboardSimple';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('AnalyticsDashboardSimple', () => {
  const mockDashboardData = {
    overview: {
      totalReports: 1000,
      recentReports: 150,
      urgentReports: 25,
      totalConversations: 500
    },
    distributions: {
      severity: [
        { _id: 'high', count: 25 },
        { _id: 'medium', count: 50 },
        { _id: 'low', count: 75 }
      ],
      diseases: [
        { _id: 'Asma', count: 200 },
        { _id: 'Bronquitis', count: 150 }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockDashboardData
      }
    });
  });

  it('should render loading state initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<AnalyticsDashboardSimple />);
    expect(screen.getByText(/cargando dashboard/i)).toBeInTheDocument();
  });

  it('should fetch dashboard data on mount', async () => {
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/analytics/mock-dashboard')
      );
    });
  });

  it('should display overview cards', async () => {
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Reportes')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('Últimos 7 días')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Casos Urgentes')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('should display severity distribution', async () => {
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      expect(screen.getByText(/distribución por severidad/i)).toBeInTheDocument();
    });
  });

  it('should display error message on fetch failure', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { message: 'Error fetching dashboard' } }
    });
    
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
    });
  });

  it('should retry on error button click', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { message: 'Error fetching dashboard' } }
    });
    
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      const retryButton = screen.getByText(/reintentar/i);
      fireEvent.click(retryButton);
    });
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should display no data message when data is null', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: null
      }
    });
    
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      expect(screen.getByText(/no hay datos disponibles/i)).toBeInTheDocument();
    });
  });

  it('should display refresh button', async () => {
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      expect(screen.getByText(/actualizar/i)).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText(/actualizar/i);
      fireEvent.click(refreshButton);
    });
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should disable refresh button while loading', async () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<AnalyticsDashboardSimple />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText(/actualizar/i);
      expect(refreshButton).toBeDisabled();
    });
  });
});

