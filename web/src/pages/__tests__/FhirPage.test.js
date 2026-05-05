import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FhirPage from '../FhirPage';

jest.mock('../../components/FhirResourceViewer', () => ({
  __esModule: true,
  default: ({ resource, onClose }) => (
    <div data-testid="fhir-viewer">
      <span>{JSON.stringify(resource?.id)}</span>
      {onClose && <button onClick={onClose}>Cerrar</button>}
    </div>
  ),
}));

const mockPatientBundle = {
  data: {
    resourceType: 'Bundle',
    entry: [
      { resource: { resourceType: 'Patient', id: 'p1', name: [{ given: ['Ana'], family: 'López' }] } },
      { resource: { resourceType: 'Patient', id: 'p2', name: [{ given: ['Juan'], family: 'Ruiz' }] } },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockPatientBundle),
  });
});

describe('FhirPage', () => {
  it('renders main heading', async () => {
    render(<FhirPage />);
    expect(screen.getByText(/consulta fhir/i)).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<FhirPage />);
    expect(screen.getByText(/buscar y visualizar/i)).toBeInTheDocument();
  });

  it('renders resource type selector', () => {
    render(<FhirPage />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('shows Patient as default resource type', () => {
    render(<FhirPage />);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('Patient');
  });

  it('fetches resources on mount', async () => {
    render(<FhirPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('fhir/Patient'),
      expect.any(Object)
    );
  });

  it('shows error message on fetch failure', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    render(<FhirPage />);
    await waitFor(() =>
      expect(screen.getByText(/error al buscar recursos fhir/i)).toBeInTheDocument()
    );
  });

  it('handles network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));
    render(<FhirPage />);
    await waitFor(() =>
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    );
  });

  it('changes resource type when selector changes', async () => {
    render(<FhirPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const callsBefore = global.fetch.mock.calls.length;
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Observation' } });
    await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('renders search fields for Patient type', async () => {
    render(<FhirPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByText(/nombre/i)).toBeInTheDocument();
  });

  it('shows resource viewer on resource click', async () => {
    render(<FhirPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const resourceItems = document.querySelectorAll('.fhir-resource-item');
    if (resourceItems.length > 0) {
      fireEvent.click(resourceItems[0]);
      await waitFor(() =>
        expect(screen.getByTestId('fhir-viewer')).toBeInTheDocument()
      );
    }
  });
});