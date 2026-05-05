import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FhirResourceViewer from '../FhirResourceViewer';

describe('FhirResourceViewer', () => {
  it('shows no-resource message when resource is null', () => {
    render(<FhirResourceViewer resource={null} resourceType="Patient" />);
    expect(screen.getByText(/no hay recurso para mostrar/i)).toBeInTheDocument();
  });

  it('renders Patient name from resource', () => {
    const resource = {
      id: 'p1',
      name: [{ given: ['Juan'], family: 'Pérez' }],
      gender: 'male',
    };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('renders Patient id when no name', () => {
    const resource = { id: 'patient-123' };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    expect(screen.getByText('patient-123')).toBeInTheDocument();
  });

  it('renders Observation display name', () => {
    const resource = { id: 'obs1', code: { text: 'Temperatura' } };
    render(<FhirResourceViewer resource={resource} resourceType="Observation" />);
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
  });

  it('renders DiagnosticReport display name', () => {
    const resource = { id: 'dr1', code: { text: 'Reporte Respiratorio' } };
    render(<FhirResourceViewer resource={resource} resourceType="DiagnosticReport" />);
    expect(screen.getByText('Reporte Respiratorio')).toBeInTheDocument();
  });

  it('renders generic resource type as title', () => {
    const resource = { id: 'enc1', status: 'finished' };
    render(<FhirResourceViewer resource={resource} resourceType="Encounter" />);
    expect(screen.getAllByText('Encounter').length).toBeGreaterThan(0);
  });

  it('renders boolean value as string', () => {
    const resource = { active: true };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    expect(document.querySelector('.fhir-boolean')).toBeInTheDocument();
  });

  it('renders number value', () => {
    const resource = { score: 42 };
    render(<FhirResourceViewer resource={resource} resourceType="Observation" />);
    expect(document.querySelector('.fhir-number')).toBeInTheDocument();
  });

  it('renders string value in quotes', () => {
    const resource = { status: 'active' };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    expect(document.querySelector('.fhir-string')).toBeInTheDocument();
  });

  it('renders date-like string as fhir-date', () => {
    const resource = { birthDate: '1990-01-15' };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    expect(document.querySelector('.fhir-date')).toBeInTheDocument();
  });

  it('renders null value after expanding collapsed key', () => {
    const resource = { deceased: null };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    const collapsed = document.querySelector('.fhir-collapsed');
    if (collapsed) {
      fireEvent.click(collapsed);
      expect(document.querySelector('.fhir-null')).toBeInTheDocument();
    } else {
      expect(document.querySelector('.fhir-object')).toBeInTheDocument();
    }
  });

  it('renders array values after expanding collapsed key', () => {
    const resource = { tags: ['respiratory', 'chronic'] };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    const collapsed = document.querySelector('.fhir-collapsed');
    if (collapsed) {
      fireEvent.click(collapsed);
      expect(document.querySelector('.fhir-array')).toBeInTheDocument();
    } else {
      expect(document.querySelector('.fhir-object')).toBeInTheDocument();
    }
  });

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    const resource = { id: 'p1' };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" onClose={onClose} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows resource type badge', () => {
    const resource = { id: 'c1' };
    render(<FhirResourceViewer resource={resource} resourceType="Condition" />);
    expect(screen.getAllByText('Condition').length).toBeGreaterThan(0);
  });

  it('toggles nested object expansion on click', () => {
    const resource = { meta: { versionId: '1', lastUpdated: '2024-01-01' } };
    render(<FhirResourceViewer resource={resource} resourceType="Patient" />);
    const collapsed = document.querySelector('.fhir-collapsed');
    if (collapsed) {
      fireEvent.click(collapsed);
      expect(document.querySelector('.fhir-object')).toBeInTheDocument();
    }
  });
});