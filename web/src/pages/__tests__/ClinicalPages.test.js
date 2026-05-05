/**
 * Unit tests for clinical management pages
 * Covers: AppointmentsPage, AlertsPage, ConsentsPage, ReferralsPage,
 *         MedicalHistoryPage, PrescriptionsPage, EmergencyPage, LabResultsPage, AdminPage
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Shared mock for AuthContext
jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../utils/apiBase', () => ({ API_BASE: 'http://test-api' }));
jest.mock('axios');

// Mock heavy child components used by wrapper pages
jest.mock('../../components/AppointmentCalendar', () =>
  function MockCalendar({ token }) {
    return <div data-testid="appointment-calendar">Calendar token={token}</div>;
  }
);
jest.mock('../../components/AlertConsole', () =>
  function MockAlerts() {
    return <div data-testid="alert-console">AlertConsole</div>;
  }
);
jest.mock('../../components/ConsentManagement', () =>
  function MockConsents({ token }) {
    return <div data-testid="consent-management">Consents token={token}</div>;
  }
);
jest.mock('../../components/ReferralManagement', () =>
  function MockReferrals({ token }) {
    return <div data-testid="referral-management">Referrals token={token}</div>;
  }
);

import { useAuth } from '../../contexts/AuthContext';

import AppointmentsPage from '../AppointmentsPage';
import AlertsPage from '../AlertsPage';
import ConsentsPage from '../ConsentsPage';
import ReferralsPage from '../ReferralsPage';
import MedicalHistoryPage from '../MedicalHistoryPage';
import PrescriptionsPage from '../PrescriptionsPage';
import EmergencyPage from '../EmergencyPage';
import LabResultsPage from '../LabResultsPage';
import AdminPage from '../AdminPage';

const AUTH = { token: 'test-token', user: { name: 'Admin', role: 'admin' }, isAuthenticated: true };

const withRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ── Wrapper pages ──────────────────────────────────────────────────────────────

describe('AppointmentsPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders page heading', () => {
    withRouter(<AppointmentsPage />);
    expect(screen.getByRole('heading', { name: /citas médicas/i })).toBeInTheDocument();
  });

  it('passes token to AppointmentCalendar', () => {
    withRouter(<AppointmentsPage />);
    expect(screen.getByTestId('appointment-calendar')).toHaveTextContent('test-token');
  });
});

describe('AlertsPage', () => {
  it('renders page heading', () => {
    withRouter(<AlertsPage />);
    expect(screen.getByRole('heading', { name: /alertas/i })).toBeInTheDocument();
  });

  it('renders AlertConsole', () => {
    withRouter(<AlertsPage />);
    expect(screen.getByTestId('alert-console')).toBeInTheDocument();
  });
});

describe('ConsentsPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders page heading', () => {
    withRouter(<ConsentsPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('renders ConsentManagement child', () => {
    withRouter(<ConsentsPage />);
    expect(screen.getByTestId('consent-management')).toBeInTheDocument();
  });
});

describe('ReferralsPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders page heading', () => {
    withRouter(<ReferralsPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('renders ReferralManagement child', () => {
    withRouter(<ReferralsPage />);
    expect(screen.getByTestId('referral-management')).toBeInTheDocument();
  });
});

// ── Data pages ─────────────────────────────────────────────────────────────────

describe('MedicalHistoryPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders page heading', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    withRouter(<MedicalHistoryPage />);
    expect(screen.getByRole('heading', { name: /historias médicas/i })).toBeInTheDocument();
  });

  it('shows loading indicator while fetching', () => {
    axios.get.mockReturnValueOnce(new Promise(() => {})); // never resolves
    withRouter(<MedicalHistoryPage />);
    expect(screen.getByText(/cargando historias/i)).toBeInTheDocument();
  });

  it('renders records returned from API', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          { _id: '1', patientName: 'Carlos López', primaryDiagnosis: 'Bronquitis', visitType: 'Consulta', visitDate: '2024-01-15', status: 'active' },
        ],
        total: 1,
      },
    });
    withRouter(<MedicalHistoryPage />);
    await waitFor(() => expect(screen.getByText('Carlos López')).toBeInTheDocument());
    expect(screen.getByText('Bronquitis')).toBeInTheDocument();
  });

  it('shows empty state when no records', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    withRouter(<MedicalHistoryPage />);
    await waitFor(() =>
      expect(screen.getByText(/no se encontraron historias/i)).toBeInTheDocument()
    );
  });

  it('shows error when API call fails', async () => {
    axios.get.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), {
        response: { data: { message: 'Sin autorización.' } },
      })
    );
    withRouter(<MedicalHistoryPage />);
    await waitFor(() => expect(screen.getByText('Sin autorización.')).toBeInTheDocument());
  });
});

describe('PrescriptionsPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders page heading', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    withRouter(<PrescriptionsPage />);
    expect(screen.getByRole('heading', { name: /prescripciones/i })).toBeInTheDocument();
  });

  it('shows loading indicator', () => {
    axios.get.mockReturnValueOnce(new Promise(() => {}));
    withRouter(<PrescriptionsPage />);
    expect(screen.getByText(/cargando prescripciones/i)).toBeInTheDocument();
  });

  it('renders prescription records', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          { _id: 'p1', patientName: 'Ana Torres', diagnosis: 'Asma', medications: [{ name: 'Salbutamol' }], status: 'active', prescribedDate: '2024-02-01' },
        ],
        total: 1,
      },
    });
    withRouter(<PrescriptionsPage />);
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());
  });

  it('shows error when API fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));
    withRouter(<PrescriptionsPage />);
    await waitFor(() =>
      expect(screen.getByText(/error al cargar prescripciones/i)).toBeInTheDocument()
    );
  });
});

describe('EmergencyPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders page heading', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    withRouter(<EmergencyPage />);
    expect(screen.getByRole('heading', { name: /emergencias/i })).toBeInTheDocument();
  });

  it('renders emergency records', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          { _id: 'e1', patientName: 'Pedro Ruiz', reason: 'Dificultad respiratoria', severity: 'critical', status: 'active', admittedAt: '2024-03-10' },
        ],
        total: 1,
      },
    });
    withRouter(<EmergencyPage />);
    await waitFor(() => expect(screen.getByText('Pedro Ruiz')).toBeInTheDocument());
  });
});

describe('LabResultsPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders page heading', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    withRouter(<LabResultsPage />);
    expect(screen.getByRole('heading', { name: /laboratorio/i })).toBeInTheDocument();
  });

  it('renders lab result records', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          { _id: 'l1', patientName: 'Rosa Mamani', testName: 'PCR', value: '5.2', unit: 'mg/L', status: 'completed', collectedAt: '2024-04-01' },
        ],
        total: 1,
      },
    });
    withRouter(<LabResultsPage />);
    await waitFor(() => expect(screen.getByText('Rosa Mamani')).toBeInTheDocument());
  });
});

describe('AdminPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(AUTH);
  });

  it('renders admin heading', async () => {
    axios.get.mockResolvedValue({ data: { data: [], total: 0 } });
    withRouter(<AdminPage />);
    expect(screen.getByRole('heading', { name: /administración/i })).toBeInTheDocument();
  });

  it('shows loading indicator', () => {
    axios.get.mockReturnValue(new Promise(() => {}));
    withRouter(<AdminPage />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('renders user rows from API', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          data: [{ _id: 'u1', name: 'Dr. García', email: 'g@h.com', role: 'doctor', createdAt: '2024-01-01' }],
          total: 1,
        },
      })
      .mockResolvedValueOnce({ data: { data: { totalUsers: 1, doctorCount: 1, patientCount: 0 } } });
    withRouter(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Dr. García')).toBeInTheDocument());
  });

  it('shows error when users API fails', async () => {
    axios.get
      .mockRejectedValueOnce(
        Object.assign(new Error('Forbidden'), {
          response: { data: { message: 'No tienes permisos de administrador.' } },
        })
      )
      .mockResolvedValueOnce({ data: { data: null } });
    withRouter(<AdminPage />);
    await waitFor(() =>
      expect(screen.getByText('No tienes permisos de administrador.')).toBeInTheDocument()
    );
  });
});