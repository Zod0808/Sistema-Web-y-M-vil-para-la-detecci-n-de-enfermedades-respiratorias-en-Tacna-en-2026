import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AlertConsole from '../AlertConsole';

jest.mock('axios');

describe('AlertConsole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza inputs y botones principales', () => {
    render(<AlertConsole />);

    expect(screen.getByText(/Consola de Alertas/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/token JWT/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/token interno/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cargar Alertas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ver Monitoreo/i })).toBeTruthy();
  });

  it('carga alertas y muestra la tabla cuando hay datos', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'alert-1',
            title: 'Alerta respiratoria',
            userId: 'user-123',
            category: 'respiratory',
            priority: 'high',
            status: 'pending',
            scheduledAt: '2025-11-10T12:00:00Z',
          },
        ],
      },
    });

    render(<AlertConsole />);

    fireEvent.click(screen.getByRole('button', { name: /Cargar Alertas/i }));

    await waitFor(() => {
      expect(screen.getByText(/Se cargaron 1 alertas/i)).toBeTruthy();
      expect(screen.getByText(/Alerta respiratoria/i)).toBeTruthy();
      expect(screen.getByText(/user-123/i)).toBeTruthy();
      expect(screen.getByText(/respiratory/i)).toBeTruthy();
    });
  });

  it('muestra mensaje de error cuando la carga de alertas falla', async () => {
    axios.get.mockRejectedValueOnce({
      response: {
        data: { message: 'Token inválido' },
      },
    });

    render(<AlertConsole />);

    fireEvent.click(screen.getByRole('button', { name: /Cargar Alertas/i }));

    await waitFor(() => {
      expect(screen.getByText(/Token inválido/i)).toBeTruthy();
    });
  });

  it('muestra tarjeta de monitoreo cuando hay datos', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          queue: {
            scheduledSize: 5,
            nextScheduledAt: '2025-11-10T15:00:00Z',
            scheduledWithinHour: 2,
          },
          alerts: {
            criticalOpen: 1,
            failedLast24h: 3,
            deliveredToday: 10,
          },
          recentFailures: [
            {
              id: 'fail-1',
              title: 'Fallo API',
              lastError: 'Timeout',
              updatedAt: '2025-11-10T10:00:00Z',
            },
          ],
        },
      },
    });

    render(<AlertConsole />);

    fireEvent.click(screen.getByRole('button', { name: /Ver Monitoreo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Estado de la Cola/i)).toBeTruthy();
      expect(screen.getByText(/Total programadas/i)).toBeTruthy();
      expect(screen.getByText(/Fallo API/i)).toBeTruthy();
    });
  });

  it('envía token personalizados en el header', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [] } });

    render(<AlertConsole />);

    fireEvent.change(screen.getByPlaceholderText(/token JWT/i), {
      target: { value: 'jwt-token' },
    });
    fireEvent.change(screen.getByPlaceholderText(/token interno/i), {
      target: { value: 'internal-token' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Cargar Alertas/i }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/alerts'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer jwt-token',
            'x-internal-service-token': 'internal-token',
          }),
        })
      );
    });
  });
});

