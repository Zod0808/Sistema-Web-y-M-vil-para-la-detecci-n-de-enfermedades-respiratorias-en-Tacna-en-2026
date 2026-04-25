import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeatMapPage from '../HeatMapPage';

jest.mock('../../components/InteractiveHeatMap', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-interactive-heatmap">Mapa interactivo</div>,
}));

describe('HeatMapPage', () => {
  it('muestra el fallback y luego renderiza el mapa interactivo', async () => {
    render(<HeatMapPage />);

    expect(screen.getByText(/Cargando mapa epidemiológico/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('mock-interactive-heatmap')).toBeInTheDocument();
    });
  });
});

