import React, { useState } from 'react';
import './Hl7MessageViewer.css';

/**
 * Componente para visualizar mensajes HL7 v2
 * Muestra la estructura de segmentos y campos de un mensaje HL7
 */
const Hl7MessageViewer = ({ message, onClose, onConvertToFhir }) => {
  const [expandedSegments, setExpandedSegments] = useState({});
  const [viewMode, setViewMode] = useState('structured'); // 'raw' | 'structured'

  if (!message) {
    return (
      <div className="hl7-message-viewer">
        <p>No hay mensaje HL7 para mostrar</p>
      </div>
    );
  }

  const toggleSegment = (index) => {
    setExpandedSegments((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Parsear mensaje HL7 v2
  const parseHl7Message = (msg) => {
    if (typeof msg !== 'string') {
      return { segments: [], raw: '' };
    }

    const lines = msg.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
    const segments = lines.map((line, index) => {
      const parts = line.split('|');
      return {
        index,
        name: parts[0] || '',
        fields: parts.slice(1).map((field, fieldIndex) => ({
          index: fieldIndex + 1,
          value: field || '',
          subFields: field.includes('^') ? field.split('^') : null,
        })),
        raw: line,
      };
    });

    return {
      segments,
      raw: msg,
      header: segments.find((s) => s.name === 'MSH') || null,
    };
  };

  const parsed = parseHl7Message(message);

  // Mapeo de nombres de segmentos comunes
  const segmentNames = {
    MSH: 'Message Header',
    PID: 'Patient Identification',
    PV1: 'Patient Visit',
    OBR: 'Observation Request',
    OBX: 'Observation/Result',
    NTE: 'Notes and Comments',
    ORC: 'Common Order',
    AL1: 'Patient Allergy Information',
    DG1: 'Diagnosis',
    PR1: 'Procedures',
  };

  const getSegmentDisplayName = (segmentName) => {
    return segmentNames[segmentName] || segmentName;
  };

  const renderStructuredView = () => {
    return (
      <div className="hl7-structured-view">
        {parsed.segments.map((segment, segmentIndex) => (
          <div key={segmentIndex} className="hl7-segment">
            <div
              className="hl7-segment-header"
              onClick={() => toggleSegment(segmentIndex)}
            >
              <span className="hl7-segment-name">
                {segment.name} - {getSegmentDisplayName(segment.name)}
              </span>
              <span className="hl7-segment-toggle">
                {expandedSegments[segmentIndex] ? '▼' : '▶'}
              </span>
            </div>
            {expandedSegments[segmentIndex] && (
              <div className="hl7-segment-fields">
                {segment.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="hl7-field">
                    <span className="hl7-field-label">Campo {field.index}:</span>
                    {field.subFields ? (
                      <div className="hl7-subfields">
                        {field.subFields.map((subField, subIndex) => (
                          <div key={subIndex} className="hl7-subfield">
                            <span className="hl7-subfield-label">
                              {field.index}.{subIndex + 1}:
                            </span>
                            <span className="hl7-subfield-value">{subField}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="hl7-field-value">{field.value || '(vacío)'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRawView = () => {
    return (
      <div className="hl7-raw-view">
        <pre className="hl7-raw-content">{parsed.raw}</pre>
      </div>
    );
  };

  return (
    <div className="hl7-message-viewer">
      <div className="hl7-viewer-header">
        <h3>Visualizador de Mensaje HL7</h3>
        <div className="hl7-viewer-actions">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="hl7-view-mode-selector"
          >
            <option value="structured">Vista Estructurada</option>
            <option value="raw">Vista Raw</option>
          </select>
          {onConvertToFhir && (
            <button className="hl7-convert-btn" onClick={onConvertToFhir}>
              Convertir a FHIR
            </button>
          )}
          {onClose && (
            <button className="hl7-close-btn" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      {parsed.header && (
        <div className="hl7-message-info">
          <div className="hl7-info-item">
            <strong>Tipo de Mensaje:</strong>{' '}
            {parsed.header.fields[8]?.value || 'N/A'}
          </div>
          <div className="hl7-info-item">
            <strong>ID del Mensaje:</strong>{' '}
            {parsed.header.fields[9]?.value || 'N/A'}
          </div>
          <div className="hl7-info-item">
            <strong>Segmentos:</strong> {parsed.segments.length}
          </div>
        </div>
      )}

      <div className="hl7-viewer-content">
        {viewMode === 'structured' ? renderStructuredView() : renderRawView()}
      </div>
    </div>
  );
};

export default Hl7MessageViewer;

