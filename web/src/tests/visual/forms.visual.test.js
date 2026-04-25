/**
 * Visual Regression Tests — SymptomReportForm Component
 *
 * Strategy: Snapshots del formulario vacío, con errores de validación,
 * con campos completados, y estado de envío exitoso.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SymptomReportForm from '../../components/SymptomReportForm';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: { success: true, message: 'Reporte enviado exitosamente' },
  }),
  get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
}));

// Mock apiBase
jest.mock('../../utils/apiBase', () => ({
  default: 'http://localhost:3001/api/v1',
  API_BASE: 'http://localhost:3001/api/v1',
}));

// ─── DOM Snapshot — estado inicial del formulario ────────────────────────────

describe('SymptomReportForm — Snapshot Visual Regression', () => {
  it('matches DOM snapshot on initial empty render', () => {
    const { asFragment } = render(<SymptomReportForm />);
    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Estructura visual — campos del formulario ───────────────────────────────

describe('SymptomReportForm — Estructura Visual del Formulario', () => {
  it('should render form element', () => {
    render(<SymptomReportForm />);
    const form = document.querySelector('form, [class*="form"]');
    expect(form).not.toBeNull();
  });

  it('should render district selector', () => {
    render(<SymptomReportForm />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.tagName.toLowerCase()).toBe('select');
  });

  it('should render all Tacna district options', () => {
    render(<SymptomReportForm />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.options).map((o) => o.text);
    // Should have Tacna districts
    expect(options.length).toBeGreaterThan(1);
    expect(options.some((o) => /tacna/i.test(o))).toBe(true);
  });

  it('should render address input field', () => {
    render(<SymptomReportForm />);
    const addressInput = screen.getByRole('textbox');
    expect(addressInput).toBeInTheDocument();
  });

  it('should render symptom checkboxes', () => {
    render(<SymptomReportForm />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('should render submit button', () => {
    render(<SymptomReportForm />);
    const submitButton = screen.getByRole('button', {
      name: /enviar|reportar|submit/i,
    });
    expect(submitButton).toBeInTheDocument();
  });
});

// ─── Estado de checkboxes — síntomas seleccionados ───────────────────────────

describe('SymptomReportForm — Visual de Selección de Síntomas', () => {
  it('should show all checkboxes unchecked initially', () => {
    render(<SymptomReportForm />);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => {
      expect(cb).not.toBeChecked();
    });
  });

  it('should check a checkbox when clicked', () => {
    render(<SymptomReportForm />);
    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();
  });

  it('should uncheck a checkbox when clicked again', () => {
    render(<SymptomReportForm />);
    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();

    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).not.toBeChecked();
  });

  it('matches DOM snapshot with some symptoms selected', () => {
    const { asFragment } = render(<SymptomReportForm />);
    const checkboxes = screen.getAllByRole('checkbox');

    // Select first 3 symptoms
    [0, 1, 2].forEach((i) => {
      if (checkboxes[i]) fireEvent.click(checkboxes[i]);
    });

    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Selección de distrito — visual feedback ──────────────────────────────────

describe('SymptomReportForm — Visual de Selección de Distrito', () => {
  it('should update select value when district is changed', () => {
    render(<SymptomReportForm />);
    const select = screen.getByRole('combobox');

    // Select first real option (not placeholder)
    const options = Array.from(select.options);
    const firstRealOption = options.find((o) => o.value && o.value !== '');
    if (firstRealOption) {
      fireEvent.change(select, { target: { value: firstRealOption.value } });
      expect(select.value).toBe(firstRealOption.value);
    }
  });
});

// ─── Envío del formulario — estados visuales ──────────────────────────────────

describe('SymptomReportForm — Visual de Envío del Formulario', () => {
  it('should show success message after successful submission', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValueOnce({
      data: { success: true, message: 'Reporte enviado exitosamente' },
    });

    render(<SymptomReportForm />);

    // Fill required fields
    const select = screen.getByRole('combobox');
    const options = Array.from(select.options);
    const firstRealOption = options.find((o) => o.value && o.value !== '');
    if (firstRealOption) {
      fireEvent.change(select, { target: { value: firstRealOption.value } });
    }

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes[0]) fireEvent.click(checkboxes[0]);

    const submitButton = screen.getByRole('button', {
      name: /enviar|reportar|submit/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const successEl = document.querySelector(
        '.success, [class*="success"], [class*="ok"]'
      );
      const successText = screen.queryByText(/exitosamente|enviado|success/i);
      // Either a success element or text should appear
      expect(successEl || successText).not.toBeNull();
    });
  });

  it('should show error message on submission failure', async () => {
    const axios = require('axios');
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    render(<SymptomReportForm />);

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes[0]) fireEvent.click(checkboxes[0]);

    const submitButton = screen.getByRole('button', {
      name: /enviar|reportar|submit/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorEl = document.querySelector('.error, [class*="error"]');
      const errorText = screen.queryByText(/error|falló|problema/i);
      expect(errorEl || errorText).not.toBeNull();
    });
  });

  it('matches DOM snapshot after successful submission', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValueOnce({
      data: { success: true, message: 'Reporte enviado exitosamente' },
    });

    const { asFragment } = render(<SymptomReportForm />);

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes[0]) fireEvent.click(checkboxes[0]);

    const submitButton = screen.getByRole('button', {
      name: /enviar|reportar|submit/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const successEl =
        document.querySelector('.success, [class*="success"]') ||
        screen.queryByText(/exitosamente|enviado/i);
      if (successEl) {
        expect(successEl).toBeTruthy();
      }
    });

    expect(asFragment()).toMatchSnapshot();
  });
});

// ─── Accesibilidad visual — labels en campos ─────────────────────────────────

describe('SymptomReportForm — Accesibilidad Visual', () => {
  it('should have labeled district selector', () => {
    render(<SymptomReportForm />);
    const select = screen.getByRole('combobox');
    // Select should have an associated label or aria-label
    const hasLabel =
      select.labels?.length > 0 ||
      select.getAttribute('aria-label') ||
      select.getAttribute('aria-labelledby') ||
      document.querySelector(`label[for="${select.id}"]`);
    expect(hasLabel).toBeTruthy();
  });

  it('should have submit button with accessible name', () => {
    render(<SymptomReportForm />);
    const button = screen.getByRole('button', { name: /enviar|reportar|submit/i });
    expect(button).toBeInTheDocument();
    expect(button.textContent.trim().length).toBeGreaterThan(0);
  });
});