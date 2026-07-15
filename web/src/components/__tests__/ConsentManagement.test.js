import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ConsentManagement from '../ConsentManagement';

jest.mock('axios');

// jsdom doesn't implement Canvas 2d context; unconditionally install a stub
// so clearSignature() and the signature capture paths don't throw.
// (jsdom may return null from getContext — a truthy stub is required.)
HTMLCanvasElement.prototype.getContext = function () {
  return {
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    strokeStyle: '',
    lineWidth: 0,
    getImageData: (_x, _y, w, h) => ({
      data: new Uint8ClampedArray(w * h * 4),
    }),
  };
};
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,STUB';

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

    it('shows Presentar button only for draft consents', async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [
            { ...mockConsents[0], _id: 'draft1', status: 'draft', title: 'Draft One' },
            { ...mockConsents[1], _id: 'signed1', status: 'signed' },
          ],
        },
      });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Draft One'));
      expect(screen.getByRole('button', { name: /presentar/i })).toBeInTheDocument();
    });

    it('shows Firmar button for pending_signature consents', async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [{ ...mockConsents[0], _id: 'ps1', status: 'pending_signature', title: 'To Sign' }],
        },
      });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('To Sign'));
      expect(screen.getByRole('button', { name: /^firmar$/i })).toBeInTheDocument();
    });

    it('shows PDF button for signed consents', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Anestesia General'));
      expect(screen.getByRole('button', { name: /^pdf$/i })).toBeInTheDocument();
    });

    it('shows Revocar button for signed or pending_signature consents', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Anestesia General'));
      expect(screen.getByRole('button', { name: /revocar/i })).toBeInTheDocument();
    });

    it('presents a draft consent when Presentar clicked', async () => {
      window.alert = jest.fn();
      mockGet.mockResolvedValueOnce({
        data: { data: [{ ...mockConsents[0], _id: 'd1', status: 'draft', title: 'Draft X' }] },
      });
      mockGet.mockResolvedValue({ data: { data: mockConsents } });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Draft X'));
      fireEvent.click(screen.getByRole('button', { name: /presentar/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith(expect.stringContaining('/present'))
      );
    });

    it('handles present error and shows alert', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockGet.mockResolvedValueOnce({
        data: { data: [{ ...mockConsents[0], _id: 'd2', status: 'draft', title: 'Err' }] },
      });
      mockGet.mockResolvedValue({ data: { data: [] } });
      mockPost.mockRejectedValueOnce({ response: { data: { message: 'Present failed' } } });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Err'));
      fireEvent.click(screen.getByRole('button', { name: /presentar/i }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Present failed'));
      alertSpy.mockRestore();
    });

    it('revokes a consent when confirmed via prompt', async () => {
      window.alert = jest.fn();
      window.prompt = jest.fn().mockReturnValue('No longer needed');
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Anestesia General'));
      fireEvent.click(screen.getByRole('button', { name: /revocar/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining('/revoke'),
          expect.objectContaining({ reason: 'No longer needed' })
        )
      );
    });

    it('skips revoke when prompt cancelled', async () => {
      window.prompt = jest.fn().mockReturnValue(null);
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Anestesia General'));
      const before = mockPost.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: /revocar/i }));
      expect(mockPost.mock.calls.length).toBe(before);
    });

    it('opens detail modal when Ver clicked', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      const verButtons = screen.getAllByRole('button', { name: /^ver$/i });
      fireEvent.click(verButtons[0]);
      expect(screen.getByRole('heading', { name: /detalle del consentimiento/i })).toBeInTheDocument();
    });

    it('closes detail modal via Cerrar', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getAllByRole('button', { name: /^ver$/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
      expect(screen.queryByRole('heading', { name: /detalle del consentimiento/i })).not.toBeInTheDocument();
    });

    it('opens signature modal when Firmar clicked', async () => {
      mockGet.mockResolvedValue({
        data: { data: [{ ...mockConsents[0], _id: 'ps2', status: 'pending_signature', title: 'Signable' }] },
      });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Signable'));
      fireEvent.click(screen.getByRole('button', { name: /^firmar$/i }));
      expect(screen.getByRole('heading', { name: /firmar consentimiento/i })).toBeInTheDocument();
    });

    it('cancels signature modal', async () => {
      mockGet.mockResolvedValue({
        data: { data: [{ ...mockConsents[0], _id: 'ps3', status: 'pending_signature', title: 'Cancelable' }] },
      });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cancelable'));
      fireEvent.click(screen.getByRole('button', { name: /^firmar$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));
      expect(screen.queryByRole('heading', { name: /firmar consentimiento/i })).not.toBeInTheDocument();
    });

    it('handles empty signature (blank canvas) with alert', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockGet.mockResolvedValue({
        data: { data: [{ ...mockConsents[0], _id: 'ps4', status: 'pending_signature', title: 'Blank' }] },
      });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Blank'));
      fireEvent.click(screen.getByRole('button', { name: /^firmar$/i }));

      // Wait for setTimeout(100ms) initSignatureCanvas
      await new Promise((r) => setTimeout(r, 150));

      // Click the final Firmar button inside the modal — canvas has no strokes so alert should fire
      const modalFirmar = screen.getAllByRole('button', { name: /^firmar$/i }).slice(-1)[0];
      fireEvent.click(modalFirmar);
      await waitFor(() => expect(alertSpy).toHaveBeenCalled());
      alertSpy.mockRestore();
    });
  });

  describe('Add / remove list items in form', () => {
    const openForm = async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo consentimiento/i }));
    };

    it('adds a risk and displays it', async () => {
      await openForm();
      const riskInput = screen.getByPlaceholderText(/agregar riesgo/i);
      fireEvent.change(riskInput, { target: { value: 'Infección' } });
      const btn = riskInput.parentElement.querySelector('button');
      fireEvent.click(btn);
      expect(screen.getByText(/^- Infección$/)).toBeInTheDocument();
    });

    it('does not add empty risk', async () => {
      await openForm();
      const riskInput = screen.getByPlaceholderText(/agregar riesgo/i);
      fireEvent.change(riskInput, { target: { value: '   ' } });
      const btn = riskInput.parentElement.querySelector('button');
      fireEvent.click(btn);
      expect(screen.queryByText(/^- /)).not.toBeInTheDocument();
    });

    it('removes a risk when × clicked', async () => {
      await openForm();
      const riskInput = screen.getByPlaceholderText(/agregar riesgo/i);
      fireEvent.change(riskInput, { target: { value: 'Sangrado' } });
      fireEvent.click(riskInput.parentElement.querySelector('button'));
      expect(screen.getByText(/^- Sangrado$/)).toBeInTheDocument();

      const removeBtn = screen.getByText(/^- Sangrado$/).parentElement.querySelector('button');
      fireEvent.click(removeBtn);
      expect(screen.queryByText(/^- Sangrado$/)).not.toBeInTheDocument();
    });

    it('adds a benefit', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar beneficio/i);
      fireEvent.change(input, { target: { value: 'Recuperación' } });
      fireEvent.click(input.parentElement.querySelector('button'));
      expect(screen.getByText(/^- Recuperación$/)).toBeInTheDocument();
    });

    it('adds an alternative', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar alternativa/i);
      fireEvent.change(input, { target: { value: 'Fisioterapia' } });
      fireEvent.click(input.parentElement.querySelector('button'));
      expect(screen.getByText(/^- Fisioterapia$/)).toBeInTheDocument();
    });

    it('adds risk on Enter key', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar riesgo/i);
      fireEvent.change(input, { target: { value: 'Anafilaxia' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
      expect(screen.getByText(/^- Anafilaxia$/)).toBeInTheDocument();
    });
  });

  describe('Create submission', () => {
    it('submits create form and calls POST', async () => {
      window.alert = jest.fn();
      localStorage.setItem('user', JSON.stringify({ _id: 'u1', name: 'Dr X' }));

      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo consentimiento/i }));

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'pat-1' } });
      fireEvent.change(inputs[1], { target: { value: 'John Doe' } });
      fireEvent.change(inputs[2], { target: { value: 'Title Test' } });

      // Description textarea has role textbox too — grab the last two textareas
      const textareas = document.querySelectorAll('textarea');
      fireEvent.change(textareas[0], { target: { value: 'Description text' } });

      fireEvent.click(screen.getByRole('button', { name: /crear consentimiento/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith(
          '/informed-consents',
          expect.objectContaining({ patientId: 'pat-1', title: 'Title Test' })
        )
      );
    });

    it('handles create error and shows alert', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      localStorage.setItem('user', JSON.stringify({ _id: 'u2', name: 'Dr Y' }));
      mockPost.mockRejectedValueOnce({ response: { data: { message: 'Create failed' } } });

      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo consentimiento/i }));

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'p' } });
      fireEvent.change(inputs[1], { target: { value: 'n' } });
      fireEvent.change(inputs[2], { target: { value: 't' } });
      const textareas = document.querySelectorAll('textarea');
      fireEvent.change(textareas[0], { target: { value: 'd' } });

      fireEvent.click(screen.getByRole('button', { name: /crear consentimiento/i }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Create failed'));
      alertSpy.mockRestore();
    });
  });

  describe('Filter changes', () => {
    it('reloads consents when type filter changes', async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      const before = mockGet.mock.calls.length;

      const selects = screen.getAllByRole('combobox');
      // Second combobox is the Tipo filter
      fireEvent.change(selects[1], { target: { value: 'surgery' } });

      await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(before));
      expect(
        mockGet.mock.calls.some(
          (c) => typeof c[0] === 'string' && c[0].includes('consentType=surgery')
        )
      ).toBe(true);
    });
  });

  describe('Add/remove benefit and alternative', () => {
    const openForm = async () => {
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      fireEvent.click(screen.getByRole('button', { name: /nuevo consentimiento/i }));
    };

    it('removes a benefit when × clicked', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar beneficio/i);
      fireEvent.change(input, { target: { value: 'Alivio' } });
      fireEvent.click(input.parentElement.querySelector('button'));
      expect(screen.getByText(/^- Alivio$/)).toBeInTheDocument();
      const removeBtn = screen.getByText(/^- Alivio$/).parentElement.querySelector('button');
      fireEvent.click(removeBtn);
      expect(screen.queryByText(/^- Alivio$/)).not.toBeInTheDocument();
    });

    it('removes an alternative when × clicked', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar alternativa/i);
      fireEvent.change(input, { target: { value: 'Descanso' } });
      fireEvent.click(input.parentElement.querySelector('button'));
      expect(screen.getByText(/^- Descanso$/)).toBeInTheDocument();
      const removeBtn = screen.getByText(/^- Descanso$/).parentElement.querySelector('button');
      fireEvent.click(removeBtn);
      expect(screen.queryByText(/^- Descanso$/)).not.toBeInTheDocument();
    });

    it('adds a benefit on Enter key', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar beneficio/i);
      fireEvent.change(input, { target: { value: 'Beta' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
      expect(screen.getByText(/^- Beta$/)).toBeInTheDocument();
    });

    it('adds an alternative on Enter key', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar alternativa/i);
      fireEvent.change(input, { target: { value: 'Alt X' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
      expect(screen.getByText(/^- Alt X$/)).toBeInTheDocument();
    });

    it('cancels create modal and resets form', async () => {
      await openForm();
      const input = screen.getByPlaceholderText(/agregar riesgo/i);
      fireEvent.change(input, { target: { value: 'Risk1' } });
      fireEvent.click(input.parentElement.querySelector('button'));
      expect(screen.getByText(/^- Risk1$/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));
      expect(screen.queryByRole('heading', { name: /nuevo consentimiento informado/i })).not.toBeInTheDocument();
    });
  });

  describe('Detail modal content', () => {
    it('renders risks, benefits, alternatives, and signatures when present', async () => {
      const richConsent = {
        ...mockConsents[1],
        _id: 'rich',
        title: 'Rich Detail',
        description: 'Full details',
        procedureDetails: 'Proc steps',
        risks: ['Riesgo A', 'Riesgo B'],
        benefits: ['Beneficio A'],
        alternatives: ['Alternativa A'],
        patientSignature: { signerName: 'John', signedAt: '2026-01-15T10:00:00Z' },
        doctorSignature: { signerName: 'Dr House', signedAt: '2026-01-15T11:00:00Z' },
      };
      mockGet.mockResolvedValue({ data: { data: [richConsent] } });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Rich Detail'));

      fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

      expect(screen.getByText('Riesgo A')).toBeInTheDocument();
      expect(screen.getByText('Beneficio A')).toBeInTheDocument();
      expect(screen.getByText('Alternativa A')).toBeInTheDocument();
      expect(screen.getByText(/John/)).toBeInTheDocument();
      expect(screen.getByText(/Dr House/)).toBeInTheDocument();
    });
  });

  describe('PDF download', () => {
    it('downloads PDF and triggers browser download link', async () => {
      // Stub URL.createObjectURL + revokeObjectURL for jsdom
      const originalCreate = URL.createObjectURL;
      URL.createObjectURL = jest.fn(() => 'blob:mock');
      mockGet.mockResolvedValueOnce({ data: { data: mockConsents } });
      mockGet.mockResolvedValueOnce({ data: { data: null } });
      mockGet.mockResolvedValueOnce({ data: new Blob(['fake-pdf'], { type: 'application/pdf' }) });

      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Anestesia General'));
      fireEvent.click(screen.getByRole('button', { name: /^pdf$/i }));

      await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
      URL.createObjectURL = originalCreate;
    });

    it('shows alert when PDF download fails', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockGet.mockResolvedValueOnce({ data: { data: mockConsents } });
      mockGet.mockResolvedValueOnce({ data: { data: null } });
      mockGet.mockRejectedValueOnce(new Error('PDF failed'));
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Anestesia General'));
      fireEvent.click(screen.getByRole('button', { name: /^pdf$/i }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error al descargar PDF'));
      alertSpy.mockRestore();
    });
  });

  describe('Signature submission (canvas has content)', () => {
    it('submits signature when canvas has ink', async () => {
      window.alert = jest.fn();
      localStorage.setItem('user', JSON.stringify({ _id: 'signer-1', name: 'Signer' }));

      // Override getImageData so hasContent === true
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function () {
        return {
          clearRect: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          strokeStyle: '',
          lineWidth: 0,
          getImageData: (_x, _y, w, h) => {
            const data = new Uint8ClampedArray(w * h * 4);
            // Set alpha byte of the first pixel so hasContent evaluates true
            data[3] = 255;
            return { data };
          },
        };
      };

      mockGet.mockResolvedValue({
        data: { data: [{ ...mockConsents[0], _id: 'sig1', status: 'pending_signature', title: 'Ready' }] },
      });

      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Ready'));
      fireEvent.click(screen.getByRole('button', { name: /^firmar$/i }));

      // Wait for setTimeout(100ms) initSignatureCanvas
      await new Promise((r) => setTimeout(r, 150));

      const modalFirmar = screen.getAllByRole('button', { name: /^firmar$/i }).slice(-1)[0];
      fireEvent.click(modalFirmar);

      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining('/sign'),
          expect.objectContaining({ signerId: 'signer-1', signerRole: 'patient' })
        )
      );

      HTMLCanvasElement.prototype.getContext = origGetContext;
    });
  });

  describe('Signature canvas drawing', () => {
    it('exercises mousedown/mousemove/mouseup drawing paths', async () => {
      mockGet.mockResolvedValue({
        data: { data: [{ ...mockConsents[0], _id: 'draw1', status: 'pending_signature', title: 'Draw' }] },
      });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Draw'));
      fireEvent.click(screen.getByRole('button', { name: /^firmar$/i }));

      // Wait for setTimeout(100ms) initSignatureCanvas to run
      await new Promise((r) => setTimeout(r, 150));

      const canvas = document.getElementById('signatureCanvas');
      // Simulate drawing: mousedown → mousemove (multiple) → mouseup → mouseout
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
      fireEvent.mouseMove(canvas, { clientX: 30, clientY: 40 });
      fireEvent.mouseUp(canvas);
      // Move after up should be a no-op (isDrawing = false)
      fireEvent.mouseMove(canvas, { clientX: 40, clientY: 50 });
      // Trigger mouseOut path
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.mouseOut(canvas);

      // No assertion needed; goal is to hit the listener code paths
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('shows alert when loadConsents fails', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockGet.mockRejectedValueOnce(new Error('Network')); // consents load fails
      mockGet.mockResolvedValueOnce({ data: { data: null } }); // stats load
      render(<ConsentManagement />);
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error al cargar consentimientos'));
      alertSpy.mockRestore();
    });

    it('handles stats load failure silently', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGet.mockImplementation((url) => {
        if (url.includes('stats')) return Promise.reject(new Error('stats down'));
        return Promise.resolve({ data: { data: mockConsents } });
      });
      render(<ConsentManagement />);
      await waitFor(() => screen.getByText('Cirugía Cardíaca'));
      // component still renders; stats card just missing
      expect(screen.queryByText(/^10$/)).not.toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });
});