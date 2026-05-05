import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ReferralManagement from '../ReferralManagement';

jest.mock('axios');

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockInstance = {
  get: mockGet,
  post: mockPost,
  interceptors: { request: { use: jest.fn() } },
};

const mockReferrals = [
  {
    _id: 'r1',
    patientName: 'Ana Flores',
    referredToSpecialty: 'Cardiología',
    referralType: 'consultation',
    priority: 'high',
    status: 'pending',
    reason: 'Dolor en el pecho',
    createdAt: '2024-03-01T00:00:00.000Z',
  },
  {
    _id: 'r2',
    patientName: 'Carlos Ruiz',
    referredToSpecialty: 'Neumología',
    referralType: 'procedure',
    priority: 'medium',
    status: 'accepted',
    reason: 'Dificultad para respirar',
    createdAt: '2024-03-02T00:00:00.000Z',
  },
];

const mockStats = { total: 8, pending: 3, accepted: 3, completed: 2 };

beforeEach(() => {
  localStorage.clear();
  axios.create.mockReturnValue(mockInstance);
  mockGet.mockResolvedValue({ data: { data: mockReferrals } });
  mockPost.mockResolvedValue({ data: { success: true } });
  mockInstance.interceptors.request.use.mockImplementation(() => {});
});

describe('ReferralManagement', () => {
  describe('Loading and render', () => {
    it('shows loading state initially', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      render(<ReferralManagement />);
      expect(screen.getByText(/cargando referidos/i)).toBeInTheDocument();
    });

    it('renders main heading after data loads', async () => {
      render(<ReferralManagement />);
      await waitFor(() =>
        expect(screen.getByText(/gestión de referidos/i)).toBeInTheDocument()
      );
    });

    it('shows referral list after loading', async () => {
      render(<ReferralManagement />);
      await waitFor(() => expect(screen.getByText('Ana Flores')).toBeInTheDocument());
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    });

    it('shows specialty of referrals', async () => {
      render(<ReferralManagement />);
      await waitFor(() => expect(screen.getByText(/cardiología/i)).toBeInTheDocument());
    });

    it('shows stats when stats API succeeds', async () => {
      mockGet.mockImplementation((url) => {
        if (url.includes('stats')) return Promise.resolve({ data: { data: mockStats } });
        return Promise.resolve({ data: { data: mockReferrals } });
      });
      render(<ReferralManagement />);
      await waitFor(() => expect(screen.getByText('8')).toBeInTheDocument());
    });

    it('shows empty list when no referrals', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      render(<ReferralManagement />);
      await waitFor(() =>
        expect(screen.getByText(/gestión de referidos/i)).toBeInTheDocument()
      );
      expect(screen.queryByText('Ana Flores')).not.toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('renders filter selectors', async () => {
      render(<ReferralManagement />);
      await waitFor(() => screen.getByText('Ana Flores'));
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('re-fetches when status filter changes', async () => {
      render(<ReferralManagement />);
      await waitFor(() => screen.getByText('Ana Flores'));
      const callsBefore = mockGet.mock.calls.length;
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'pending' } });
      await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore));
    });
  });

  describe('Create modal', () => {
    it('opens create modal on button click', async () => {
      render(<ReferralManagement />);
      await waitFor(() => screen.getByText('Ana Flores'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo referido/i }));
      expect(screen.getByRole('heading', { name: /nuevo referido/i })).toBeInTheDocument();
    });

    it('closes create modal on cancel', async () => {
      render(<ReferralManagement />);
      await waitFor(() => screen.getByText('Ana Flores'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo referido/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(screen.queryByRole('heading', { name: /nuevo referido/i })).not.toBeInTheDocument();
    });

    it('can fill patient name field', async () => {
      render(<ReferralManagement />);
      await waitFor(() => screen.getByText('Ana Flores'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo referido/i }));
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'Pedro Sánchez' } });
      expect(inputs[0].value).toBe('Pedro Sánchez');
    });

    it('shows priority and type selectors in modal', async () => {
      render(<ReferralManagement />);
      await waitFor(() => screen.getByText('Ana Flores'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo referido/i }));
      const selects = screen.getAllByRole('combobox');
      // Modal adds more selects for type and priority
      expect(selects.length).toBeGreaterThan(2);
    });
  });

  describe('Token in header', () => {
    it('reads auth token from localStorage', async () => {
      localStorage.setItem('auth_token', 'test-jwt-token');
      render(<ReferralManagement />);
      await waitFor(() => screen.getByText('Ana Flores'));
      expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    });
  });
});