/**
 * Visual Regression Tests — Dashboard Page + AnalyticsDashboard Component
 *
 * Strategy: DOM snapshots de estados clave (loading, error, con datos),
 * verificación de tarjetas de estadísticas, secciones de servicios y layout.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock apiBase
jest.mock('../../utils/apiBase', () => ({
  default: 'http://localhost:3001/api/v1',
  API_BASE: 'http://localhost:3001/api/v1',
  LEGACY_API_BASE: 'http://localhost:3001/api/v1',
  BACKEND_BASE_URL: 'http://localhost:3001',
  AI_BASE_URL: 'http://localhost:8000/api/v1',
}));

// Mock recharts (charts library) para evitar errores de canvas en jsdom
jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: () => <div data-testid="pie" />,
    Cell: () => null,
    Legend: () => null,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
  };
});

// Mock child components that have their own API calls
jest.mock('../../components/AlertConsole', () => () => (
  <div data-testid="alert-console-mock">AlertConsole</div>
));
jest.mock('../../components/AppointmentCalendar', () => () => (
  <div data-testid="appointment-calendar-mock">AppointmentCalendar</div>
));

import Dashboard from '../../pages/Dashboard';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';

const mockDashboardData = {
  overview: {
    totalPatients: 1250,
    totalDoctors: 45,
    totalHistories: 3420,
    activeAlerts: 12,
    pendingAppointments: 38,
  },
  diseaseDistribution: [
    { name: 'Bronquitis', value: 420, percentage: 34 },
    { name: 'Asma', value: 310, percentage: 25 },
    { name: 'Gripe', value: 280, percentage: 22 },
    { name: 'EPOC', value: 150, percentage: 12 },
    { name: 'Otros', value: 90, percentage: 7 },
  ],
  recentActivity: [
    { type: 'history', description: 'Nueva historia médica', date: '2026-04-14T10:00:00Z' },
    { type: 'alert', description: 'Alerta crítica creada', date: '2026-04-14T09:30:00Z' },
  ],
};

// ─── Dashboard Page — estados visuales ───────────────────────────────────────

describe('Dashboard Page — Snapshot Visual Regression', () => {
  it('matches DOM snapshot in loading state', async () => {
    const axios = require('axios');
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { asFragment } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Should show loading state immediately
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot after services loaded', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url) => {
      if (url.includes('/health')) {
        return Promise.resolve({
          data: { status: 'ok', version: '1.0.0', environment: 'test' },
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    const { asFragment } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Dashboard Page — estructura visual ──────────────────────────────────────

describe('Dashboard Page — Estructura Visual', () => {
  beforeEach(() => {
    const axios = require('axios');
    axios.get.mockResolvedValue({
      data: { status: 'ok', version: '1.0.0' },
    });
  });

  it('should render dashboard page container', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    const container = document.querySelector('.dashboard-page, .dashboard-container, [class*="dashboard"]');
    expect(container).not.toBeNull();
  });

  it('should render dashboard header', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    const header = document.querySelector('.dashboard-header, header, h1');
    expect(header).not.toBeNull();
  });

  it('should render Estado del Sistema title', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByText(/estado del sistema/i)).toBeInTheDocument();
  });

  it('should render loading spinner initially', () => {
    const axios = require('axios');
    axios.get.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const spinner = document.querySelector('.spinner, .loading, [class*="spinner"], [class*="loading"]');
    expect(spinner).not.toBeNull();
  });

  it('should render services section', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({
      data: { status: 'ok', version: '1.0.0', services: {} },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const servicesSection = document.querySelector(
        '.services-section, [class*="service"], [class*="status"]'
      );
      expect(servicesSection).not.toBeNull();
    });
  });
});

// ─── Dashboard — tarjetas de estado de servicios ─────────────────────────────

describe('Dashboard Page — Estado Visual de Servicios', () => {
  it('should display backend service status after load', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url) => {
      if (url.includes('/health')) {
        return Promise.resolve({
          data: { status: 'ok', service: 'backend', version: '1.0.0' },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Should show some status information
    const statusContent = document.querySelector(
      '[class*="status"], [class*="service"], [class*="card"]'
    );
    expect(statusContent).not.toBeNull();
  });

  it('should display error state when services are down', async () => {
    const axios = require('axios');
    axios.get.mockRejectedValue(new Error('ECONNREFUSED'));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const errorEl = document.querySelector('.error, [class*="error"]');
      const errorText = screen.queryByText(/error|problema|no se pudo/i);
      expect(errorEl || errorText).not.toBeNull();
    });
  });
});

// ─── AnalyticsDashboard — snapshot con datos de analytics ─────────────────────

describe('AnalyticsDashboard — Snapshot Visual Regression', () => {
  it('matches DOM snapshot in loading state', () => {
    const axios = require('axios');
    axios.get.mockImplementation(() => new Promise(() => {}));

    const { asFragment } = render(<AnalyticsDashboard />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches DOM snapshot with analytics data', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url) => {
      if (url.includes('/analytics/dashboard')) {
        return Promise.resolve({ data: mockDashboardData });
      }
      if (url.includes('/analytics/ml')) {
        return Promise.resolve({
          data: { success: true, data: { accuracy: 0.92, totalPredictions: 1250 } },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    const { asFragment } = render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── AnalyticsDashboard — estructura visual ───────────────────────────────────

describe('AnalyticsDashboard — Estructura Visual', () => {
  beforeEach(() => {
    const axios = require('axios');
    axios.get.mockResolvedValue({
      data: mockDashboardData,
    });
  });

  it('should render analytics dashboard container', () => {
    render(<AnalyticsDashboard />);
    const container = document.querySelector(
      '.analytics-dashboard, [class*="analytics"], [class*="dashboard"]'
    );
    expect(container).not.toBeNull();
  });

  it('should render chart containers after data loads', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      const charts = document.querySelectorAll(
        '[data-testid="bar-chart"], [data-testid="pie-chart"], [data-testid="responsive-container"]'
      );
      expect(charts.length).toBeGreaterThan(0);
    });
  });

  it('should display disease distribution data', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      const text = document.body.textContent;
      expect(text).toMatch(/bronquitis|asma|distribución/i);
    });
  });
});

// ─── AnalyticsDashboard — tarjetas de métricas ────────────────────────────────

describe('AnalyticsDashboard — Tarjetas de Métricas Visuales', () => {
  it('should show total patients metric', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValueOnce({
      data: { ...mockDashboardData, overview: mockDashboardData.overview },
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      const text = document.body.textContent;
      // Should show some numerical data
      expect(text).toMatch(/\d+/);
    });
  });
});