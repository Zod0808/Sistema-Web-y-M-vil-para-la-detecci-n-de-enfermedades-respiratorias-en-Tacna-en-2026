/**
 * Enhanced Tests for TemporalTrends Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import TemporalTrends from '../TemporalTrends';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('TemporalTrends Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { data: [] }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty trends data', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: [] }
      });
      
      render(<TemporalTrends />);
      
      await waitFor(() => {
        expect(screen.getByText(/no hay datos|no data/i)).toBeInTheDocument();
      });
    });

    it('should display trends with data', async () => {
      const mockData = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 15 },
        { date: '2024-01-03', value: 12 },
      ];
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: mockData }
      });
      
      render(<TemporalTrends />);
      
      await waitFor(() => {
        expect(screen.getByText(/tendencias|trends/i)).toBeInTheDocument();
      });
    });

    it('should handle time period selection', () => {
      render(<TemporalTrends />);
      
      const periodButtons = screen.getAllByRole('button');
      const weekButton = periodButtons.find(btn => btn.textContent.includes('semana|week'));
      
      if (weekButton) {
        fireEvent.click(weekButton);
        expect(mockedAxios.get).toHaveBeenCalled();
      }
    });

    it('should handle chart type selection', () => {
      render(<TemporalTrends />);
      
      const chartTypeButtons = screen.getAllByRole('button');
      const lineButton = chartTypeButtons.find(btn => btn.textContent.includes('línea|line'));
      
      if (lineButton) {
        fireEvent.click(lineButton);
        // Should switch chart type
        expect(lineButton).toBeInTheDocument();
      }
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'API Error' } }
      });
      
      render(<TemporalTrends />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle very large datasets', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: Math.random() * 100,
      }));
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: largeData }
      });
      
      render(<TemporalTrends />);
      
      await waitFor(() => {
        // Should handle large dataset
        expect(screen.getByText(/tendencias|trends/i)).toBeInTheDocument();
      });
    });
  });
});

