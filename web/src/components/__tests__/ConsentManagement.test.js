import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ConsentManagement from '../ConsentManagement';

jest.mock('axios');

// Stable mock instance — not a jest.fn() so resetMocks:true doesn't clear it
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockInstance = {
  get: mockGet,
  post: mockPost,
  interceptors: { request: { use: jest.fn() } },
};

const mockConsents = [
  {
    _id: 'c1',
    title: 'Cirugía Cardíaca',
    patientName: 'María García',
    consentType: 'surgery',
    status: 'pending',
    createdAt: '2024-01-15T00:00:00.000Z',
    expiresAt: '2025-01-15T00:00:00.000Z',
  },
  {
    _id: 'c2',
    title: 'Anestesia General',
    patientName: 'Juan Pérez',
    consentType: 'anesthesia',
    status: 'signed',
    createdAt: '2024-02-01T00:00:00.000Z',
    expiresAt: '2025-02-01T00:00:00.000Z',
    signatures: [{ signerRole: 'patient', signedAt: '2024-02-02' }],
  },
];

const mockStats = { total: 10, pending: 3, signed: 5, revoked: 2 };

beforeEach(() => {
  localStorage.clear();
  // Re-set implementations after resetMocks:true clears them
  axios.create.mockReturnValue(mockInstance);
  mockGet.mockResolvedValue({ data: { data: mockConsents } });
  mockPost.mockResolvedValue({ data: { success: true } });
  mockInstance.interceptors.request.use.mockImplementation(() => {});
});

describe('ConsentManagement', () => {
  describe('Initial render', () => {
    it('shows loading state when fetching', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      render(<ConsentManagement />);
      expect(screen.getByText(/cargando consentimientos/i)).toBeInTheDocument();
    });

    it('renders main heading after load', async () => {
      render(<ConsentManagement />);
      await waitFor(() =>
        expect(screen.getByText(/gestión de consentimientos informados/i)).toBeInTheDocument()
      );
    });

    it('shows consent list after loading', async () => {
      render(<ConsentManagement />);
      await waitFor(() => expect(screen.getByText('Cirugía Cardíaca')).toBeInTheDocument());
      expect(screen.getByText('María García')).toBeInTheDocument();
    });

    it('shows stats when stats API succeeds', async () => {
      mockGet.mockImplementation((url) => {
        if (url.includes('stats')) return Promise.resolve({ data: { data: mockStats } });
        return Promise.resolve({ data: { data: mockConsents } });
      });
      render(<ConsentManagement />);
      await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument());
    });

    it('shows empty list when no consents', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      render(<ConsentManagement />);
      await waitFor(() =>
        expect(screen.getByText(/gestión de consentimientos/i)).toBeInTheDocument()
      );
      expect(screen.queryByText('Cirugía Cardíaca')).not.toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('renders status and type filter selects', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('re-fetches when filter changes', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      const callsBefore = mockGet.mock.calls.length;
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'pending' } });
      await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore));
    });
  });

  describe('Create modal', () => {
    it('opens create modal when button clicked', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo consentimiento/i }));
      expect(screen.getByRole('heading', { name: /nuevo consentimiento informado/i })).toBeInTheDocument();
    });

    it('closes create modal on cancel', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo consentimiento/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(screen.queryByRole('heading', { name: /nuevo consentimiento informado/i })).not.toBeInTheDocument();
    });

    it('can fill form title field', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo consentimiento/i }));

      const titleInputs = screen.getAllByRole('textbox');
      const titleField = titleInputs.find(
        (i) => i.getAttribute('placeholder')?.toLowerCase().includes('título') ||
               i.getAttribute('id')?.toLowerCase().includes('title')
      ) || titleInputs[0];
      fireEvent.change(titleField, { target: { value: 'Test Título' } });
      expect(titleField.value).toBe('Test Título');
    });
  });

  describe('Consent list actions', () => {
    it('renders action buttons for consents', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      const buttons = screen.getAllByRole('button');
      // At least: Nuevo Consentimiento + actions for each consent
      expect(buttons.length).toBeGreaterThan(2);
    });
  });
});