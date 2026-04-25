/**
 * Unit tests for AnalyticsDashboard Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AnalyticsDashboard from '../AnalyticsDashboard';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

jest.mock('recharts', () => ({
  __esModule: true,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }) => <div data-testid="bar">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: ({ children }) => <div data-testid="line">{children}</div>,
}));

const mockDashboardPayload = {
  overview: {
    totalReports: 100,
    recentReports: 45,
    urgentReports: 12,
    totalConversations: 30,
    recentConversations: 8,
  },
  distributions: {
    severity: [
      { _id: 'high', count: 12 },
      { _id: 'medium', count: 28 },
      { _id: 'low', count: 60 },
    ],
    category: [
      { _id: 'respiratory', count: 40 },
      { _id: 'fever', count: 25 },
      { _id: 'pain', count: 20 },
    ],
  },
  topDistricts: [
    { _id: 'Centro de Tacna', count: 22, avgSeverity: 2.1 },
    { _id: 'Gregorio Albarracín', count: 18, avgSeverity: 1.8 },
  ],
  recentActivity: [
    {
      severityLevel: 'high',
      location: { district: 'Centro de Tacna' },
      symptoms: [{ name: 'tos' }, { name: 'fiebre' }],
      reportedAt: new Date().toISOString(),
      category: 'respiratory',
    },
  ],
};

describe('AnalyticsDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the analytics dashboard', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: mockDashboardPayload },
      });

      render(<AnalyticsDashboard />);
      expect(await screen.findByRole('heading', { name: /dashboard de análisis avanzado/i })).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));

      render(<AnalyticsDashboard />);
      // Should show loading indicator
      expect(screen.getByText(/cargando dashboard de análisis/i)).toBeInTheDocument();
    });

    it('should display data after loading', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: mockDashboardPayload },
      });

      render(<AnalyticsDashboard />);

      expect(await screen.findByText(/100/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch analytics data on mount', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: mockDashboardPayload },
      });

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      render(<AnalyticsDashboard />);

      expect(await screen.findByText(/no se pudieron cargar los datos del dashboard/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: mockDashboardPayload },
      });

      render(<AnalyticsDashboard />);
      const headings = await screen.findAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});

