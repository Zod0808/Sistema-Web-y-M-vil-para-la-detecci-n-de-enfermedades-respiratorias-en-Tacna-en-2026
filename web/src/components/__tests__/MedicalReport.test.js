import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import MedicalReport from '../MedicalReport';

jest.mock('axios');

describe('MedicalReport component', () => {
  let openSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  const fillRequiredFields = async () => {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Bearer token/i), 'token-123');
    await user.type(screen.getByPlaceholderText(/patient-123/i), 'patient-1');
    await user.type(screen.getByPlaceholderText(/doctor-456/i), 'doctor-9');
    await user.type(screen.getByPlaceholderText(/Descripción del diagnóstico/i), 'Diagnóstico');
    await user.type(screen.getByPlaceholderText(/Observaciones clínicas/i), 'Observaciones');
    await user.type(screen.getByPlaceholderText(/Realizar control en 7 días/i), 'Recomendación A\nRecomendación B');
  };

  it('genera un reporte y carga el historial al finalizar', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { id: 'report-1' } },
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'report-1',
            title: 'Reporte Bronquitis',
            createdAt: '2025-11-10T12:00:00Z',
            sharedWith: ['especialista@respicare.pe'],
            signedBy: 'Dr. Pérez',
          },
        ],
      },
    });

    render(<MedicalReport />);
    await fillRequiredFields();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Generar PDF/i }));

    await waitFor(() => {
      expect(screen.getByText(/Historial cargado./i)).toBeInTheDocument();
      expect(screen.getByText(/Reporte Bronquitis/i)).toBeInTheDocument();
    });

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/reports/report-1/download'),
      '_blank',
      'noopener'
    );
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/reports/generate'),
      expect.objectContaining({
        patientId: 'patient-1',
        doctorId: 'doctor-9',
        recommendations: ['Recomendación A', 'Recomendación B'],
      }),
      expect.any(Object)
    );
  });

  it('muestra un mensaje de error si la generación falla', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Error al generar reporte' } },
    });

    render(<MedicalReport />);
    await fillRequiredFields();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Generar PDF/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error al generar reporte/i)).toBeInTheDocument();
    });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('requiere un ID de paciente para cargar historial', async () => {
    render(<MedicalReport />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Ver historial/i }));

    expect(screen.getByText(/Ingrese el ID de paciente/i)).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('carga historial con éxito cuando se proporciona paciente', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'report-2',
            title: 'Reporte Asma',
            createdAt: '2025-11-11T10:30:00Z',
            sharedWith: [],
            signedBy: null,
          },
        ],
      },
    });

    render(<MedicalReport />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/patient-123/i), 'patient-2');

    await user.click(screen.getByRole('button', { name: /Ver historial/i }));

    await waitFor(() => {
      expect(screen.getByText(/Historial cargado./i)).toBeInTheDocument();
      expect(screen.getByText(/Reporte Asma/i)).toBeInTheDocument();
      expect(screen.getByText(/Pendiente/i)).toBeInTheDocument();
    });
  });
});

