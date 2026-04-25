/**
 * Enhanced Tests for AlertConsole Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import AlertConsole from '../AlertConsole';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('AlertConsole Enhanced Tests', () => {
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
    it('should handle empty JWT token', async () => {
      render(<AlertConsole />);
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });

    it('should handle empty internal token', async () => {
      render(<AlertConsole />);
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });

    it('should build headers with both tokens', async () => {
      render(<AlertConsole />);
      
      const jwtInput = screen.getByLabelText(/jwt|authorization/i);
      const internalInput = screen.getByLabelText(/internal|service token/i);
      
      fireEvent.change(jwtInput, { target: { value: 'jwt_token' } });
      fireEvent.change(internalInput, { target: { value: 'internal_token' } });
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer jwt_token',
              'x-internal-service-token': 'internal_token',
            })
          })
        );
      });
    });

    it('should handle whitespace in tokens', async () => {
      render(<AlertConsole />);
      
      const jwtInput = screen.getByLabelText(/jwt|authorization/i);
      fireEvent.change(jwtInput, { target: { value: '  jwt_token  ' } });
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer jwt_token',
            })
          })
        );
      });
    });

    it('should handle load monitoring', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: { alerts: 10, errors: 2 } }
      });
      
      render(<AlertConsole />);
      
      const monitoringButton = screen.getByText(/monitoreo|monitoring/i);
      fireEvent.click(monitoringButton);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/monitoring'),
          expect.any(Object)
        );
      });
    });

    it('should handle acknowledge alert', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: [{ id: 'alert1', title: 'Test Alert' }] }
      });
      
      render(<AlertConsole />);
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        const acknowledgeButton = screen.getByText(/reconocer|acknowledge/i);
        if (acknowledgeButton) {
          fireEvent.click(acknowledgeButton);
          
          expect(mockedAxios.post).toHaveBeenCalledWith(
            expect.stringContaining('/acknowledge'),
            null,
            expect.any(Object)
          );
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'API Error' } }
      });
      
      render(<AlertConsole />);
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        message: 'Network Error'
      });
      
      render(<AlertConsole />);
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/error|network/i)).toBeInTheDocument();
      });
    });

    it('should display success message after loading', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: [{ id: '1' }, { id: '2' }] }
      });
      
      render(<AlertConsole />);
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/2.*alertas|alerts/i)).toBeInTheDocument();
      });
    });

    it('should handle empty alerts response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: [] }
      });
      
      render(<AlertConsole />);
      
      const loadButton = screen.getByText(/cargar alertas|load alerts/i);
      fireEvent.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/0.*alertas|alerts/i)).toBeInTheDocument();
      });
    });
  });
});

