import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import ExecutiveDashboard from '../../components/ExecutiveDashboard';

jest.mock('axios');

const mockDashboardResponse = {
  summary: {
    patients: 1500,
    doctors: 120,
    admins: 10,
    activeUsers: 980,
    openAlerts: 45,
    criticalAlerts: 6,
    openAppointments: 14,
  },
  kpis: {
    averageAcknowledgementMinutes: 32.4,
    appointmentCompletionRate: 0.82,
    aiConfidenceAverage: 89.5,
    criticalAlertRatio: 0.33,
    satisfactionScore: 91.2,
  },
  usage: {
    loginsLastPeriod: 540,
    appointments: {
      completed: 120,
      cancelled: 12,
      noShow: 6,
    },
    alertsByStatus: {
      pending: 5,
      sent: 8,
      delivered: 20,
      failed: 2,
    },
    alertsByPriority: {
      low: 10,
      medium: 12,
      high: 5,
      critical: 6,
    },
    urgencyMix: {
      low: 10,
      medium: 15,
      high: 8,
      critical: 4,
    },
  },
  trends: {
    topDiagnoses: [
      { diagnosis: 'Bronquitis', count: 25 },
      { diagnosis: 'Neumonía', count: 18 },
    ],
    symptomCategories: [
      { category: 'respiratory', total: 40 },
      { category: 'fever', total: 18 },
    ],
    dailySymptomSeries: [
      { date: '2025-11-05', total: 8 },
      { date: '2025-11-06', total: 12 },
    ],
  },
  outbreaks: [
    {
      district: 'Gregorio Albarracín',
      category: 'respiratory',
      recentTotal: 22,
      growthRate: 0.56,
      severityRate: 0.44,
      riskLevel: 'high',
      confidence: 0.78,
    },
  ],
  epidemiology: {
    districtTrends: [
      {
        district: 'Centro de Tacna',
        category: 'respiratory',
        totalReports: 120,
        highSeverityPercentage: 42.5,
        trend: 'increase',
      },
    ],
  },
  predictiveInsights: {
    diseaseTrend: {
      disease: 'Bronquitis',
      lastObserved: 30,
      changePct: 12.4,
      trend: 'increasing',
      forecast: [
        { date: '2025-11-08', predicted: 31.2 },
        { date: '2025-11-09', predicted: 32.7 },
        { date: '2025-11-10', predicted: 34.1 },
      ],
    },
    resourceDemand: {
      resource: 'clinical_capacity',
      projectedLoad: 0.78,
      notes: 'Proyección basada en citas completadas y agendadas próximas.',
    },
  },
  timeframe: {
    from: '2025-11-01T00:00:00.000Z',
    to: '2025-11-07T23:59:59.999Z',
    periodInDays: 7,
  },
  generatedAt: '2025-11-07T15:45:00.000Z',
};

describe('ExecutiveDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: mockDashboardResponse });
  });

  it('renderiza métricas clave del dashboard ejecutivo', async () => {
    render(<ExecutiveDashboard autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText(/Pacientes/i)).toBeInTheDocument();
      expect(screen.getByText(/1500/)).toBeInTheDocument();
      expect(screen.getByText(/Índice de satisfacción/i)).toBeInTheDocument();
      expect(screen.getByText(/91.2%/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Diagnósticos principales/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Bronquitis/)).toHaveLength(2);
    expect(screen.getByText(/Gregorio Albarracín/)).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/v1/analytics/executive-dashboard', {
      params: { includeOutbreak: true },
    });
  });

  it('muestra mensaje de error y permite reintentar', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));
    render(<ExecutiveDashboard autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
    });

    axios.get.mockResolvedValueOnce({ data: mockDashboardResponse });
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pacientes/)).toBeInTheDocument();
    });
  });
});

