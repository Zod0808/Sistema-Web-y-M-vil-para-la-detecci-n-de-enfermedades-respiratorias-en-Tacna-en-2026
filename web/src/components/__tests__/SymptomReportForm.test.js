/**
 * Unit tests for SymptomReportForm Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import SymptomReportForm from '../SymptomReportForm';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('SymptomReportForm Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render the form', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/reportar síntomas/i)).toBeInTheDocument();
    });

    it('should render district selector', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByLabelText(/distrito/i)).toBeInTheDocument();
    });

    it('should render address input', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
    });

    it('should render symptom checkboxes', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText('Tos seca')).toBeInTheDocument();
      expect(screen.getByText('Fiebre')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByRole('button', { name: /enviar reporte/i })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByRole('button', { name: /cerrar/i })).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should allow selecting district', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const districtSelect = screen.getByLabelText(/distrito/i);
      fireEvent.change(districtSelect, { target: { value: 'Centro de Tacna' } });
      
      expect(districtSelect.value).toBe('Centro de Tacna');
    });

    it('should allow entering address', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const addressInput = screen.getByLabelText(/dirección/i);
      fireEvent.change(addressInput, { target: { value: 'Av. Principal 123' } });
      
      expect(addressInput.value).toBe('Av. Principal 123');
    });

    it('should allow selecting symptoms', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const tosCheckbox = screen.getByLabelText('Tos seca');
      fireEvent.click(tosCheckbox);
      
      expect(tosCheckbox).toBeChecked();
    });

    it('should display severity controls after selecting a symptom', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

      const tosCheckbox = screen.getByLabelText('Tos seca');
      fireEvent.click(tosCheckbox);

      expect(screen.getByDisplayValue('Leve')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require district selection', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true }
      });

      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const submitButton = screen.getByRole('button', { name: /enviar reporte/i });
      fireEvent.click(submitButton);

      // Should show validation error or prevent submission
      await waitFor(() => {
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });
    });

    it('should require at least one symptom', async () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const districtSelect = screen.getByLabelText(/distrito/i);
      fireEvent.change(districtSelect, { target: { value: 'Centro de Tacna' } });
      
      const submitButton = screen.getByRole('button', { name: /enviar reporte/i });
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'Reporte enviado exitosamente' }
      });

      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      // Fill form
      const districtSelect = screen.getByLabelText(/distrito/i);
      fireEvent.change(districtSelect, { target: { value: 'Centro de Tacna' } });
      
      const addressInput = screen.getByLabelText(/dirección/i);
      fireEvent.change(addressInput, { target: { value: 'Av. Principal 123' } });
      
      const tosCheckbox = screen.getByLabelText('Tos seca');
      fireEvent.click(tosCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /enviar reporte/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });
    });

    it('should call onSuccess callback after successful submission', async () => {
      jest.useFakeTimers();

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true }
      });

      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const districtSelect = screen.getByLabelText(/distrito/i);
      fireEvent.change(districtSelect, { target: { value: 'Centro de Tacna' } });
      
      const tosCheckbox = screen.getByLabelText('Tos seca');
      fireEvent.click(tosCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /enviar reporte/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });

      // Avanza el temporizador que controla el cierre automático (2 segundos)
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle submission error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Submission failed'));

      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const districtSelect = screen.getByLabelText(/distrito/i);
      fireEvent.change(districtSelect, { target: { value: 'Centro de Tacna' } });
      
      const tosCheckbox = screen.getByLabelText('Tos seca');
      fireEvent.click(tosCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /enviar reporte/i });
      fireEvent.click(submitButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      expect(screen.getByLabelText(/distrito/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
    });

    it('should have accessible checkboxes', () => {
      render(<SymptomReportForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const tosCheckbox = screen.getByLabelText('Tos seca');
      expect(tosCheckbox).toHaveAttribute('type', 'checkbox');
    });
  });
});

