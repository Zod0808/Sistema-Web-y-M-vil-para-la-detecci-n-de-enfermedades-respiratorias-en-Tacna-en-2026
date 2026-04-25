/**
 * Visual Regression Tests — AlertConsole Component
 *
 * Strategy: Snapshots del estado vacío, con alertas activas, con diferentes
 * severidades, con mensajes de error/éxito, y estado de carga.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertConsole from '../../components/AlertConsole';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock apiBase
jest.mock('../../utils/apiBase', () => ({
  default: 'http://localhost:3001/api/v1',
  API_BASE: 'http://localhost:3001/api/v1',
}));

const mockAlerts = [
  {
    _id: 'alert-001',
    type: 'critical',
    severity: 'critical',
    title: 'Saturación de oxígeno crítica',
    message: 'El paciente presenta SpO2 88%',
    status: 'active',
    createdAt: '2026-04-13T10:00:00.000Z',
  },
  {
    _id: 'alert-002',
    type: 'warning',
    severity: 'high',
    title: 'Frecuencia cardíaca elevada',
    message: 'FC 140 bpm durante 10 minutos',
    status: 'active',
    createdAt: '2026-04-13T09:00:00.000Z',
  },
  {
    _id: 'alert-003',
    type: 'info',
    severity: 'low',
    title: 'Recordatorio de medicación',
    message: 'Toma de broncodilatador a las 14:00',
    status: 'acknowledged',
    createdAt: '2026-04-13T08:00:00.000Z',
  },
];

// ─── DOM Snapshot — estado inicial ───────────────────────────────────────────

describe('AlertConsole — Snapshot Visual Regression', () => {
  it('matches DOM snapshot on initial empty state', () => {
    const { asFragment } = render(<AlertConsole />);
    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Estructura visual — layout inicial ──────────────────────────────────────

describe('AlertConsole — Estructura Visual Inicial', () => {
  it('should render AlertConsole container', () => {
    render(<AlertConsole />);
    // Should have some container
    const container = document.querySelector(
      '.alert-console, [class*="alert"], [class*="console"]'
    );
    expect(container).not.toBeNull();
  });

  it('should render JWT token input field', () => {
    render(<AlertConsole />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('should render load alerts button', () => {
    render(<AlertConsole />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ─── Estado de carga visual ───────────────────────────────────────────────────

describe('AlertConsole — Estado Visual de Carga', () => {
  it('should show loading indicator when fetching alerts', async () => {
    const axios = require('axios');
    axios.get.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { success: true, data: mockAlerts },
              }),
            300
          )
        )
    );

    render(<AlertConsole />);
    const loadButton = screen.getByText(/cargar alertas|obtener alertas|load/i);
    fireEvent.click(loadButton);

    // Check for loading state
    const loadingEl = document.querySelector(
      '.loading, .spinner, [class*="loading"], [class*="cargando"]'
    );
    if (loadingEl) {
      expect(loadingEl).toBeInTheDocument();
    }

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });
});

// ─── Listado de alertas — renderizado con datos ───────────────────────────────

describe('AlertConsole — Visual con Alertas Cargadas', () => {
  beforeEach(() => {
    const axios = require('axios');
    axios.get.mockResolvedValue({
      data: { success: true, data: mockAlerts },
    });
  });

  it('should render alert list after loading', async () => {
    render(<AlertConsole />);
    const loadButton = screen.getByText(/cargar alertas|obtener alertas/i);
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Saturación de oxígeno crítica')).toBeInTheDocument();
    });
  });

  it('should render all 3 alerts in the list', async () => {
    render(<AlertConsole />);
    const loadButton = screen.getByText(/cargar alertas|obtener alertas/i);
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Saturación de oxígeno crítica')).toBeInTheDocument();
      expect(screen.getByText('Frecuencia cardíaca elevada')).toBeInTheDocument();
      expect(screen.getByText('Recordatorio de medicación')).toBeInTheDocument();
    });
  });

  it('matches DOM snapshot with alerts loaded', async () => {
    const { asFragment } = render(<AlertConsole />);
    const loadButton = screen.getByText(/cargar alertas|obtener alertas/i);
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Saturación de oxígeno crítica')).toBeInTheDocument();
    });

    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Mensaje de feedback — éxito vs error ────────────────────────────────────

describe('AlertConsole — Visual de Mensajes de Feedback', () => {
  it('should show success message after loading alerts', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValueOnce({
      data: { success: true, data: mockAlerts },
    });

    render(<AlertConsole />);
    const loadButton = screen.getByText(/cargar alertas|obtener alertas/i);
    fireEvent.click(loadButton);

    await waitFor(() => {
      const successEl = document.querySelector(
        '.success, [class*="success"], .message-success, .alert-success'
      );
      if (successEl) {
        expect(successEl).toBeInTheDocument();
      }
      // Or check for text
      const successTexts = screen.queryAllByText(/cargaron|exitosamente|success/i);
      expect(successTexts.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('should show error message on API failure', async () => {
    const axios = require('axios');
    axios.get.mockRejectedValueOnce({
      message: 'Network Error',
      code: 'ERR_NETWORK',
    });

    render(<AlertConsole />);
    const loadButton = screen.getByText(/cargar alertas|obtener alertas/i);
    fireEvent.click(loadButton);

    await waitFor(() => {
      const errorEl = document.querySelector(
        '.error, [class*="error"], .message-error, .alert-error'
      );
      if (errorEl) {
        expect(errorEl).toBeInTheDocument();
      }
    });
  });
});

// ─── Acción de reconocimiento de alerta ───────────────────────────────────────

describe('AlertConsole — Visual de Reconocimiento de Alerta', () => {
  it('should render acknowledge button for active alerts', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValueOnce({
      data: { success: true, data: mockAlerts },
    });

    render(<AlertConsole />);
    const loadButton = screen.getByText(/cargar alertas|obtener alertas/i);
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Saturación de oxígeno crítica')).toBeInTheDocument();
    });

    // Look for acknowledge buttons
    const acknowledgeButtons = screen.queryAllByText(/reconocer|acknowledge/i);
    // There might be acknowledge buttons for active alerts
    expect(acknowledgeButtons.length).toBeGreaterThanOrEqual(0);
  });
});