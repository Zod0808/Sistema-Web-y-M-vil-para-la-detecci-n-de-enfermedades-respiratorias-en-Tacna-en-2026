import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import TemporalTrends from '../TemporalTrends';

jest.mock('axios');

const mockSuccessResponse = {
  data: {
    success: true,
    data: {
      dailyTrends: [
        {
          _id: '2025-11-01',
          total: 12,
          data: [
            { severity: 'mild', count: 4 },
            { severity: 'moderate', count: 5 },
            { severity: 'severe', count: 3 },
          ],
        },
        {
          _id: '2025-11-02',
          total: 8,
          data: [
            { severity: 'mild', count: 3 },
            { severity: 'moderate', count: 4 },
            { severity: 'severe', count: 1 },
          ],
        },
      ],
      weeklyTrends: [
        {
          _id: { week: 44 },
          count: 20,
          avgSeverity: 2.5,
        },
      ],
      topSymptoms: [
        { _id: 'tos', totalCount: 15 },
        { _id: 'fiebre', totalCount: 10 },
      ],
    },
  },
};

describe('TemporalTrends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra la pantalla de carga inicialmente y luego los datos', async () => {
    axios.get.mockResolvedValueOnce(mockSuccessResponse);

    render(<TemporalTrends />);

    expect(screen.getByText(/Cargando datos de tendencias/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Tendencias Temporales/i)).toBeInTheDocument();
      expect(screen.getByText(/Tendencias Diarias/i)).toBeInTheDocument();
      expect(screen.getByText(/Tendencias Semanales/i)).toBeInTheDocument();
      expect(screen.getByText(/Síntomas Más Reportados/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/12 reportes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/tos/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Severidad: 2.5/i)).toBeInTheDocument();
  });

  it('muestra mensaje de error y permite reintentar', async () => {
    axios.get
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(mockSuccessResponse);

    render(<TemporalTrends />);

    await waitFor(() => {
      expect(screen.getByText(/No se pudieron cargar los datos de tendencias/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tendencias Diarias/i)).toBeInTheDocument();
    });
  });

  it('aplica los filtros seleccionados y llama a la API con los parámetros correctos', async () => {
    axios.get.mockReset();
    const collectedConfigs = [];
    axios.get.mockImplementation((_, config) => {
      collectedConfigs.push(config);
      return Promise.resolve(mockSuccessResponse);
    });

    render(<TemporalTrends />);

    await waitFor(() => {
      expect(screen.getByText(/Tendencias Diarias/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const [periodSelect, districtSelect, categorySelect] = screen.getAllByRole('combobox');

    await user.selectOptions(periodSelect, '7d');
    await user.selectOptions(districtSelect, 'Gregorio Albarracín');
    await user.selectOptions(categorySelect, 'respiratory');

    await waitFor(() => {
      expect(screen.queryByText(/Cargando datos de tendencias/i)).not.toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Actualizar/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.queryByText(/Cargando datos de tendencias/i)).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const match = collectedConfigs.some((config) =>
        config?.params?.period === '7d' &&
        config?.params?.district === 'Gregorio Albarracín' &&
        config?.params?.category === 'respiratory'
      );
      expect(match).toBe(true);
    });
  });
});

