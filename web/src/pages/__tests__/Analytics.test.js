import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Analytics from '../Analytics';

jest.mock('../../components/AnalyticsDashboardSimple', () => ({
  __esModule: true,
  default: () => <div data-testid="analytics-dashboard">Módulo Dashboard</div>,
}));

jest.mock('../../components/TemporalTrends', () => ({
  __esModule: true,
  default: () => <div data-testid="temporal-trends">Módulo Tendencias</div>,
}));

jest.mock('../../components/DiseaseReports', () => ({
  __esModule: true,
  default: () => <div data-testid="disease-reports">Módulo Enfermedades</div>,
}));

jest.mock('../../components/ShapDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="shap-dashboard">Módulo SHAP</div>,
}));

describe('Analytics page', () => {
  it('muestra el encabezado y el dashboard por defecto', async () => {
    render(<Analytics />);

    expect(screen.getByRole('heading', { name: /Centro de Análisis/i })).toBeInTheDocument();
    expect(screen.getByText(/Herramientas avanzadas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
    });
  });

  it('permite cambiar entre pestañas mostrando el módulo correspondiente', async () => {
    render(<Analytics />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Tendencias/i }));

    await waitFor(() => {
      expect(screen.getByTestId('temporal-trends')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Enfermedades/i }));

    await waitFor(() => {
      expect(screen.getByTestId('disease-reports')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Explicabilidad/i }));

    await waitFor(() => {
      expect(screen.getByTestId('shap-dashboard')).toBeInTheDocument();
    });
  });
});

