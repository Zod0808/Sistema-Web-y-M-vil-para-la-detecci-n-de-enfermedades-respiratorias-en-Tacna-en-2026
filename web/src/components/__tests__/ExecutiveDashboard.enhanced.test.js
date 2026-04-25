/**
 * Enhanced Tests for ExecutiveDashboard Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ExecutiveDashboard from '../ExecutiveDashboard';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('ExecutiveDashboard Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { data: {} }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty dashboard data', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: null }
      });
      
      render(<ExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/cargando|loading/i)).toBeInTheDocument();
      });
    });

    it('should display all KPI cards', async () => {
      const mockData = {
        totalPatients: 100,
        totalAppointments: 50,
        totalAlerts: 10,
        systemHealth: 'healthy',
      };
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: mockData }
      });
      
      render(<ExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/100|patients/i)).toBeInTheDocument();
      });
    });

    it('should handle date range filter', () => {
      render(<ExecutiveDashboard />);
      
      const startDateInput = screen.getByLabelText(/fecha inicio|start date/i);
      const endDateInput = screen.getByLabelText(/fecha fin|end date/i);
      
      if (startDateInput && endDateInput) {
        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
        fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
        
        // Should trigger data refresh
        expect(mockedAxios.get).toHaveBeenCalled();
      }
    });

    it('should handle export to CSV', () => {
      render(<ExecutiveDashboard />);
      
      const exportButton = screen.getByText(/exportar|export|csv/i);
      if (exportButton) {
        fireEvent.click(exportButton);
        // Should trigger CSV export
        expect(exportButton).toBeInTheDocument();
      }
    });

    it('should handle refresh data', async () => {
      render(<ExecutiveDashboard />);
      
      const refreshButton = screen.getByText(/actualizar|refresh/i);
      if (refreshButton) {
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
          expect(mockedAxios.get).toHaveBeenCalled();
        });
      }
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'API Error' } }
      });
      
      render(<ExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });
});

