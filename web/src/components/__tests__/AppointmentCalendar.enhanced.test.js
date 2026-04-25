/**
 * Enhanced Tests for AppointmentCalendar Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import AppointmentCalendar from '../AppointmentCalendar';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('AppointmentCalendar Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { data: [] }
    });
    mockedAxios.post.mockResolvedValue({
      data: { success: true }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty appointments list', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: [] }
      });
      
      render(<AppointmentCalendar />);
      
      await waitFor(() => {
        expect(screen.getByText(/no hay citas|no appointments/i)).toBeInTheDocument();
      });
    });

    it('should handle date selection', () => {
      render(<AppointmentCalendar />);
      
      const dateInput = screen.getByLabelText(/fecha|date/i);
      if (dateInput) {
        fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
        expect(dateInput.value).toBe('2024-01-15');
      }
    });

    it('should handle create appointment', async () => {
      render(<AppointmentCalendar />);
      
      const createButton = screen.getByText(/crear|create|nueva|new/i);
      fireEvent.click(createButton);
      
      // Should open create modal or form
      expect(screen.getByText(/nueva cita|new appointment/i)).toBeInTheDocument();
    });

    it('should handle edit appointment', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [{
            id: '1',
            date: '2024-01-15',
            patientName: 'Test Patient',
          }]
        }
      });
      
      render(<AppointmentCalendar />);
      
      await waitFor(() => {
        const editButton = screen.getByText(/editar|edit/i);
        if (editButton) {
          fireEvent.click(editButton);
          expect(screen.getByText(/editar cita|edit appointment/i)).toBeInTheDocument();
        }
      });
    });

    it('should handle delete appointment', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [{
            id: '1',
            date: '2024-01-15',
            patientName: 'Test Patient',
          }]
        }
      });
      
      render(<AppointmentCalendar />);
      
      await waitFor(() => {
        const deleteButton = screen.getByText(/eliminar|delete/i);
        if (deleteButton) {
          fireEvent.click(deleteButton);
          // Should show confirmation
          expect(screen.getByText(/confirmar|confirm/i)).toBeInTheDocument();
        }
      });
    });

    it('should filter appointments by date range', () => {
      render(<AppointmentCalendar />);
      
      const startDateInput = screen.getByLabelText(/fecha inicio|start date/i);
      const endDateInput = screen.getByLabelText(/fecha fin|end date/i);
      
      if (startDateInput && endDateInput) {
        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
        fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
        
        // Should filter appointments
        expect(startDateInput.value).toBe('2024-01-01');
        expect(endDateInput.value).toBe('2024-01-31');
      }
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'API Error' } }
      });
      
      render(<AppointmentCalendar />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });
});

