import React, { useState } from 'react';
import './FhirResourceViewer.css';

/**
 * Componente para visualizar recursos FHIR
 * Muestra información estructurada de recursos como Patient, Observation, DiagnosticReport, etc.
 */
const FhirResourceViewer = ({ resource, resourceType, onClose }) => {
  const [expanded, setExpanded] = useState({});

  if (!resource) {
    return (
      <div className="fhir-resource-viewer">
        <p>No hay recurso para mostrar</p>
      </div>
    );
  }

  const toggleExpand = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="fhir-null">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="fhir-boolean">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="fhir-number">{value}</span>;
    }
    if (typeof value === 'string') {
      // Intentar parsear como fecha
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return <span className="fhir-date">{new Date(value).toLocaleString()}</span>;
      }
      return <span className="fhir-string">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="fhir-array">
          {value.map((item, index) => (
            <div key={index} className="fhir-array-item">
              {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="fhir-object">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="fhir-object-item">
              <span className="fhir-key" onClick={() => toggleExpand(key)}>
                {key}:
              </span>
              {expanded[key] || typeof val !== 'object' ? (
                <div className="fhir-value">{renderValue(val)}</div>
              ) : (
                <div className="fhir-collapsed" onClick={() => toggleExpand(key)}>
                  {'{...}'}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  const getResourceDisplayName = () => {
    if (resourceType === 'Patient') {
      const name = resource.name?.[0];
      return name
        ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim()
        : resource.id || 'Paciente';
    }
    if (resourceType === 'Observation') {
      return resource.code?.text || resource.code?.coding?.[0]?.display || 'Observación';
    }
    if (resourceType === 'DiagnosticReport') {
      return resource.code?.text || 'Reporte de Diagnóstico';
    }
    return resourceType || 'Recurso';
  };

  return (
    <div className="fhir-resource-viewer">
      <div className="fhir-resource-header">
        <h3>{getResourceDisplayName()}</h3>
        <span className="fhir-resource-type">{resourceType}</span>
        {onClose && (
          <button className="fhir-close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div className="fhir-resource-content">
        {renderValue(resource)}
      </div>
    </div>
  );
};

export default FhirResourceViewer;

