/**
 * Tests for DiseaseReports Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import DiseaseReports from '../DiseaseReports';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('DiseaseReports', () => {
  const mockDiseaseData = {
    symptomAnalysis: [
      { _id: 'Tos', count: 100, avgSeverity: 2.5, districts: ['Centro'], categories: ['Respiratorio'] }
    ],
    chatDiseaseAnalysis: [
      { _id: 'Asma', count: 50, avgConfidence: 0.85, avgUrgency: 0.6 }
    ],
    districtDistribution: [
      { _id: 'Centro de Tacna', totalReports: 200, symptoms: [{ name: 'Tos', count: 100 }] }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockDiseaseData
      }
    });
  });

  it('should render loading state initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<DiseaseReports />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('should fetch disease data on mount', async () => {
    render(<DiseaseReports />);
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/analytics/disease-reports'),
        expect.any(Object)
      );
    });
  });

  it('should display error message on fetch failure', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { message: 'Error fetching data' } }
    });
    
    render(<DiseaseReports />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should filter by district', async () => {
    render(<DiseaseReports />);
    
    await waitFor(() => {
      expect(screen.getByText(/distrito/i)).toBeInTheDocument();
    });
    
    // Find and click district selector (implementation dependent)
    const districtSelect = screen.getByRole('combobox', { name: /distrito/i });
    if (districtSelect) {
      fireEvent.change(districtSelect, { target: { value: 'Centro de Tacna' } });
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({
              district: 'Centro de Tacna'
            })
          })
        );
      });
    }
  });

  it('should filter by period', async () => {
    render(<DiseaseReports />);
    
    await waitFor(() => {
      // Find period selector
      const periodButtons = screen.getAllByRole('button');
      const periodButton = periodButtons.find(btn => btn.textContent.includes('7 días'));
      
      if (periodButton) {
        fireEvent.click(periodButton);
        
        await waitFor(() => {
          expect(mockedAxios.get).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              params: expect.objectContaining({
                period: '7d'
              })
            })
          );
        });
      }
    });
  });

  it('should display symptom analysis data', async () => {
    render(<DiseaseReports />);
    
    await waitFor(() => {
      expect(screen.getByText('Tos')).toBeInTheDocument();
    });
  });

  it('should display disease distribution', async () => {
    render(<DiseaseReports />);
    
    await waitFor(() => {
      expect(screen.getByText('Asma')).toBeInTheDocument();
    });
  });

  it('should display district distribution', async () => {
    render(<DiseaseReports />);
    
    await waitFor(() => {
      expect(screen.getByText(/Centro de Tacna/i)).toBeInTheDocument();
    });
  });

  it('should handle empty data gracefully', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          symptomAnalysis: [],
          chatDiseaseAnalysis: [],
          districtDistribution: []
        }
      }
    });
    
    render(<DiseaseReports />);
    
    await waitFor(() => {
      // Should render without crashing
      expect(screen.getByText(/enfermedades|reportes/i)).toBeInTheDocument();
    });
  });
});

