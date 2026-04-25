import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import InteractiveHeatMap from '../InteractiveHeatMap';

jest.mock('axios');
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="mock-map">{children}</div>,
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Popup: ({ children }) => <div>{children}</div>,
  Circle: ({ children }) => <div data-testid="mock-circle">{children}</div>,
  useMap: () => ({ setView: jest.fn() }),
}));
jest.mock('../VirtualizedList', () => ({
  __esModule: true,
  default: ({ items }) => <div data-testid="mock-virtualized">{items.length} elementos</div>,
}));

const buildHeatmapResponse = () => ({
  data: {
    success: true,
    data: [
      {
        district: 'Centro de Tacna',
        count: 60,
        riskLevel: 'high',
        symptoms: ['tos', 'fiebre'],
        lastReport: '2025-11-10T14:00:00Z',
      },
      {
        district: 'Pocollay',
        count: 5,
        riskLevel: 'low',
        symptoms: ['tos'],
        lastReport: '2025-11-09T13:00:00Z',
      },
    ],
  },
});

describe('InteractiveHeatMap component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza información estadística y permite filtrar zonas', async () => {
    axios.get.mockResolvedValueOnce(buildHeatmapResponse());

    render(<InteractiveHeatMap />);

    expect(screen.getByText(/Cargando mapa en tiempo real/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Mapa en Tiempo Real/i)).toBeInTheDocument();
      expect(screen.getByText(/Zonas Activas/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-virtualized')).toHaveTextContent('2 elementos');
    expect(screen.getAllByTestId('mock-circle')).toHaveLength(2);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Emergencia/i }));

    await waitFor(() => {
      const circles = screen.getAllByTestId('mock-circle');
      expect(circles).toHaveLength(1);
      expect(screen.getByText(/Centro de Tacna/i)).toBeInTheDocument();
      expect(screen.queryByText(/Pocollay/i)).not.toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/symptom-reports/heatmap');
  });

  it('muestra mensaje de error y permite reintentar la carga', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    render(<InteractiveHeatMap />);

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudieron cargar los datos del mapa/i)
      ).toBeInTheDocument();
    });

    axios.get.mockResolvedValueOnce(buildHeatmapResponse());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Reintentar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mapa en Tiempo Real/i)).toBeInTheDocument();
    });
  });
});

