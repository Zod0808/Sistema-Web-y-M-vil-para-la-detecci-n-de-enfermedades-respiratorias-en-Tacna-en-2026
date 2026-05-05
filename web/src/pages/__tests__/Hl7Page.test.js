import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Hl7Page from '../Hl7Page';

jest.mock('../../utils/apiBase', () => ({
  __esModule: true,
  default: 'http://test-api',
  API_BASE: 'http://test-api',
  LEGACY_API_BASE: 'http://test-api',
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('Hl7Page', () => {
  it('renders page heading', () => {
    render(<Hl7Page />);
    expect(screen.getByRole('heading', { name: /visualizador y convertidor hl7/i })).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<Hl7Page />);
    expect(screen.getByText(/ingrese un mensaje hl7 v2 o v3/i)).toBeInTheDocument();
  });

  it('shows empty state initially', () => {
    render(<Hl7Page />);
    expect(screen.getByText(/ingrese un mensaje hl7 para comenzar/i)).toBeInTheDocument();
  });

  it('shows empty state hint text', () => {
    render(<Hl7Page />);
    expect(screen.getByText(/puede usar el botón/i)).toBeInTheDocument();
  });

  it('renders format selector with v2 and v3 options', () => {
    render(<Hl7Page />);
    expect(screen.getByRole('option', { name: 'HL7 v2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'HL7 v3 (XML)' })).toBeInTheDocument();
  });

  it('loads example message when button clicked', () => {
    render(<Hl7Page />);
    fireEvent.click(screen.getByRole('button', { name: /cargar ejemplo/i }));
    const textarea = screen.getByPlaceholderText(/pegue aquí su mensaje hl7/i);
    expect(textarea.value).toContain('MSH');
    expect(screen.getByText(/MSH - Message Header/)).toBeInTheDocument();
  });

  it('convert button is disabled when textarea is empty', () => {
    render(<Hl7Page />);
    expect(screen.getByRole('button', { name: /convertir a fhir/i })).toBeDisabled();
  });

  it('shows hl7 viewer after typing a message', () => {
    render(<Hl7Page />);
    fireEvent.change(screen.getByPlaceholderText(/pegue aquí su mensaje hl7/i), {
      target: { value: 'MSH|^~\\&|LAB|HOSP|||\nPID|1||12345' },
    });
    expect(screen.getByText(/vista del mensaje hl7/i)).toBeInTheDocument();
  });

  // Helper: get the page-level "Convertir a FHIR" button (not the viewer's button)
  const clickConvertBtn = () =>
    fireEvent.click(document.querySelector('.hl7-convert-button'));

  it('shows FHIR result on successful conversion', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { resourceType: 'Bundle', id: 'test-123' } }),
    });

    render(<Hl7Page />);
    fireEvent.change(screen.getByPlaceholderText(/pegue aquí su mensaje hl7/i), {
      target: { value: 'MSH|^~\\&|A|B' },
    });
    clickConvertBtn();

    await waitFor(() => expect(screen.getByText(/recurso fhir convertido/i)).toBeInTheDocument());
    expect(screen.getByText(/"resourceType"/)).toBeInTheDocument();
  });

  it('shows loading text during conversion', async () => {
    let resolveFetch;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));

    render(<Hl7Page />);
    fireEvent.change(screen.getByPlaceholderText(/pegue aquí su mensaje hl7/i), {
      target: { value: 'MSH|data' },
    });
    clickConvertBtn();

    expect(document.querySelector('.hl7-convert-button').textContent).toMatch(/convirtiendo/i);

    resolveFetch({ ok: false, json: async () => ({ message: 'error' }) });
  });

  it('shows error when fetch response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'HL7 parse error' }),
    });

    render(<Hl7Page />);
    fireEvent.change(screen.getByPlaceholderText(/pegue aquí su mensaje hl7/i), {
      target: { value: 'INVALID' },
    });
    clickConvertBtn();

    await waitFor(() =>
      expect(screen.getByText(/HL7 parse error/)).toBeInTheDocument()
    );
  });

  it('shows error when fetch throws network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Hl7Page />);
    fireEvent.change(screen.getByPlaceholderText(/pegue aquí su mensaje hl7/i), {
      target: { value: 'MSH|DATA' },
    });
    clickConvertBtn();

    await waitFor(() =>
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    );
  });

  it('shows error when response has success=false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    });

    render(<Hl7Page />);
    fireEvent.change(screen.getByPlaceholderText(/pegue aquí su mensaje hl7/i), {
      target: { value: 'MSH|DATA' },
    });
    clickConvertBtn();

    await waitFor(() =>
      expect(screen.getByText(/respuesta inválida/i)).toBeInTheDocument()
    );
  });

  it('can change format to v3', () => {
    render(<Hl7Page />);
    const formatSelect = screen.getByDisplayValue('HL7 v2');
    fireEvent.change(formatSelect, { target: { value: 'v3' } });
    expect(screen.getByDisplayValue('HL7 v3 (XML)')).toBeInTheDocument();
  });
});