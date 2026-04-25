import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import AppointmentCalendar from '../AppointmentCalendar';

jest.mock('axios');

const sampleAppointments = [
  {
    _id: 'appt-1',
    scheduledAt: '2025-11-10T15:00:00Z',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    status: 'scheduled',
    reason: 'Control respiratorio',
  },
];

const sampleAvailability = [
  {
    start: '2025-11-12T09:00:00Z',
    end: '2025-11-12T09:30:00Z',
    available: true,
  },
  {
    start: '2025-11-12T09:30:00Z',
    end: '2025-11-12T10:00:00Z',
    available: false,
  },
];

describe('AppointmentCalendar component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carga citas al montar y las muestra en la tabla', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: sampleAppointments } });

    render(<AppointmentCalendar />);

    await waitFor(() => {
      expect(screen.getByText(/Citas cargadas correctamente/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Control respiratorio/i)).toBeInTheDocument();

    const firstCallUrl = axios.get.mock.calls[0][0];
    expect(firstCallUrl).toContain('/appointments?');
  });

  it('requiere doctorId para consultar disponibilidad', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [] } });

    render(<AppointmentCalendar />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/i }));

    expect(
      screen.getByText(/Ingrese un ID de doctor para consultar disponibilidad/i)
    ).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledTimes(1); // solo la carga inicial
  });

  it('consulta disponibilidad cuando se proporciona doctorId', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { data: sampleAppointments } }) // carga inicial
      .mockResolvedValueOnce({ data: { data: sampleAvailability } });

    render(<AppointmentCalendar />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/doctor-123/i), 'doctor-9');
    await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/i }));

    await waitFor(() => {
      expect(screen.getByText(/Disponibilidad cargada/i)).toBeInTheDocument();
      expect(screen.getByText(/Disponible/i)).toBeInTheDocument();
      expect(screen.getByText(/Reservado/i)).toBeInTheDocument();
    });

    const availabilityUrl = axios.get.mock.calls[1][0];
    expect(availabilityUrl).toContain('/appointments/doctor/doctor-9/availability');
  });
});

