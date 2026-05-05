import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Hl7MessageViewer from '../Hl7MessageViewer';

const SAMPLE_MSG = `MSH|^~\\&|LAB|HOSP|LAB|HOSP|20240101||ORU^R01|123|P|2.5
PID|1||12345^^^ID^MR||PEREZ^JUAN||19900101|M
OBX|1|NM|WBC^White Blood^L|1|7.5|10*3/uL|4-11|N|||F`;

describe('Hl7MessageViewer', () => {
  it('shows empty state when message is empty string', () => {
    render(<Hl7MessageViewer message="" />);
    expect(screen.getByText(/no hay mensaje hl7/i)).toBeInTheDocument();
  });

  it('shows empty state when message is null', () => {
    render(<Hl7MessageViewer message={null} />);
    expect(screen.getByText(/no hay mensaje hl7/i)).toBeInTheDocument();
  });

  it('shows empty state when message is undefined', () => {
    render(<Hl7MessageViewer />);
    expect(screen.getByText(/no hay mensaje hl7/i)).toBeInTheDocument();
  });

  it('renders structured view by default', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    expect(screen.getByText(/visualizador de mensaje hl7/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/vista estructurada/i)).toBeInTheDocument();
  });

  it('renders segment names from parsed message', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    expect(screen.getByText(/MSH - Message Header/)).toBeInTheDocument();
    expect(screen.getByText(/PID - Patient Identification/)).toBeInTheDocument();
    expect(screen.getByText(/OBX - Observation\/Result/)).toBeInTheDocument();
  });

  it('shows message info section for messages with MSH header', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    expect(screen.getByText(/Tipo de Mensaje/)).toBeInTheDocument();
    expect(screen.getByText(/Segmentos/)).toBeInTheDocument();
  });

  it('expands segment on click to show fields', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    const mshHeader = screen.getByText(/MSH - Message Header/).closest('.hl7-segment-header');
    fireEvent.click(mshHeader);
    expect(screen.getAllByText(/Campo/i).length).toBeGreaterThan(0);
  });

  it('collapses segment on second click', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    const mshHeader = screen.getByText(/MSH - Message Header/).closest('.hl7-segment-header');
    fireEvent.click(mshHeader);
    expect(screen.getAllByText(/Campo/i).length).toBeGreaterThan(0);
    fireEvent.click(mshHeader);
    expect(screen.queryAllByText(/^Campo \d+:$/).length).toBe(0);
  });

  it('switches to raw view when selected', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: 'raw' } });
    const pre = document.querySelector('.hl7-raw-content');
    expect(pre).toBeInTheDocument();
    expect(pre.textContent).toContain('MSH');
  });

  it('renders convert button when onConvertToFhir is provided', () => {
    const onConvert = jest.fn();
    render(<Hl7MessageViewer message={SAMPLE_MSG} onConvertToFhir={onConvert} />);
    const btn = screen.getByText(/convertir a fhir/i);
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('renders close button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<Hl7MessageViewer message={SAMPLE_MSG} onClose={onClose} />);
    const btn = screen.getByText('×');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render convert button when onConvertToFhir is not provided', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    expect(screen.queryByText(/convertir a fhir/i)).not.toBeInTheDocument();
  });

  it('renders subfields for fields containing ^', () => {
    render(<Hl7MessageViewer message={SAMPLE_MSG} />);
    const mshHeader = screen.getByText(/MSH - Message Header/).closest('.hl7-segment-header');
    fireEvent.click(mshHeader);
    const subfields = document.querySelectorAll('.hl7-subfield');
    expect(subfields.length).toBeGreaterThan(0);
  });

  it('renders unknown segment type with just its name', () => {
    const msgWithUnknown = 'ZZZ|field1|field2\nMSH|^~\\&|A|B';
    render(<Hl7MessageViewer message={msgWithUnknown} />);
    expect(screen.getByText(/ZZZ - ZZZ/)).toBeInTheDocument();
  });
});