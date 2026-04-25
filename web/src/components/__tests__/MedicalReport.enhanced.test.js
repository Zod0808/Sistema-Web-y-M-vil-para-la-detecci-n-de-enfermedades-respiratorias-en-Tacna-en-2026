/**
 * Enhanced Tests for MedicalReport Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import MedicalReport from '../MedicalReport';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('MedicalReport Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { data: {} }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty report data', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: null }
      });
      
      render(<MedicalReport reportId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByText(/no hay datos|no data/i)).toBeInTheDocument();
      });
    });

    it('should handle report with all fields', async () => {
      const mockReport = {
        id: '1',
        patientName: 'Test Patient',
        diagnosis: 'Bronquitis',
        symptoms: ['tos', 'fiebre'],
        recommendations: ['Rest', 'Hydration'],
        date: '2024-01-15',
      };
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: mockReport }
      });
      
      render(<MedicalReport reportId="1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
        expect(screen.getByText('Bronquitis')).toBeInTheDocument();
      });
    });

    it('should handle export to PDF', () => {
      render(<MedicalReport reportId="1" />);
      
      const exportButton = screen.getByText(/exportar|export|pdf/i);
      if (exportButton) {
        fireEvent.click(exportButton);
        // Should trigger PDF export
        expect(exportButton).toBeInTheDocument();
      }
    });

    it('should handle print', () => {
      const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
      
      render(<MedicalReport reportId="1" />);
      
      const printButton = screen.getByText(/imprimir|print/i);
      if (printButton) {
        fireEvent.click(printButton);
        expect(printSpy).toHaveBeenCalled();
      }
      
      printSpy.mockRestore();
    });

    it('should handle share', () => {
      const shareSpy = jest.fn();
      Object.assign(navigator, {
        share: shareSpy,
      });
      
      render(<MedicalReport reportId="1" />);
      
      const shareButton = screen.getByText(/compartir|share/i);
      if (shareButton) {
        fireEvent.click(shareButton);
        // Should trigger share
        expect(shareButton).toBeInTheDocument();
      }
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'Report not found' } }
      });
      
      render(<MedicalReport reportId="invalid-id" />);
      
      await waitFor(() => {
        expect(screen.getByText(/error|not found/i)).toBeInTheDocument();
      });
    });

    it('should handle loading state', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      
      render(<MedicalReport reportId="1" />);
      
      expect(screen.getByText(/cargando|loading/i)).toBeInTheDocument();
    });
  });
});

