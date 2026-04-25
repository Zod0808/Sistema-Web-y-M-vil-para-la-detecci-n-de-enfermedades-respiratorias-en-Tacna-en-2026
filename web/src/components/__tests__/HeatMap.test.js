import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import HeatMap from '../HeatMap';

jest.mock('axios');

const buildHeatmapPayload = () => ({
  data: {
    success: true,
    data: [
      {
        district: 'Centro de Tacna',
        coordinates: { latitude: -18.0056, longitude: -70.2444 },
        totalCases: 40,
        severity: 'high',
        highSeverity: 20,
        mediumSeverity: 10,
        lowSeverity: 10,
      },
      {
        district: 'Gregorio Albarracín',
        coordinates: { latitude: -18.03, longitude: -70.25 },
        totalCases: 25,
        severity: 'medium',
        highSeverity: 5,
        mediumSeverity: 15,
        lowSeverity: 5,
      },
      {
        district: 'Ciudad Nueva',
        coordinates: { latitude: -18.012, longitude: -70.23 },
        totalCases: 12,
        severity: 'low',
        highSeverity: 2,
        mediumSeverity: 4,
        lowSeverity: 6,
      },
    ],
  },
});

describe('HeatMap component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra datos provenientes del backend y permite filtrar por severidad', async () => {
    axios.get.mockResolvedValueOnce(buildHeatmapPayload());

    render(<HeatMap />);

    expect(screen.getByText(/Cargando datos/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('40')).toBeInTheDocument(); // Casos Totales
      expect(screen.getByText(/Centro de Tacna/i)).toBeInTheDocument();
      expect(screen.getByText(/Gregorio Albarracín/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Medio/i }));

    await waitFor(() => {
      expect(screen.getByText(/Gregorio Albarracín/i)).toBeInTheDocument();
      expect(screen.queryByText(/Centro de Tacna/i)).not.toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/symptom-reports/heatmap');
  });

  it('usa datos de ejemplo cuando el backend falla', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    render(<HeatMap />);

    await waitFor(() => {
      expect(screen.getByText(/Usando datos de ejemplo/i)).toBeInTheDocument();
      expect(screen.getByText(/Centro de Tacna/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Actualizar/i }));
    expect(axios.get).toHaveBeenCalledTimes(2);
  });
});

