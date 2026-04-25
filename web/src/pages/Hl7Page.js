import React, { useState } from 'react';
import Hl7MessageViewer from '../components/Hl7MessageViewer';
import API_BASE from '../utils/apiBase';
import './Hl7Page.css';

/**
 * Página para visualizar y convertir mensajes HL7
 * Permite ingresar mensajes HL7 v2 y convertirlos a FHIR
 */
const Hl7Page = () => {
  const [hl7Message, setHl7Message] = useState('');
  const [fhirResource, setFhirResource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messageFormat, setMessageFormat] = useState('v2');

  const exampleHl7Message = `MSH|^~\\&|LAB|HOSPITAL|LAB|HOSPITAL|20240101120000||ORU^R01|12345|P|2.5
PID|1||12345678^^^ID^MR||PEREZ^JUAN^MARIA||19900101|M|||123 CALLE PRINCIPAL^^TACNA^TACNA^23001|||(01)1234567
OBR|1||LAB123|CBC^Complete Blood Count^L|||20240101120000
OBX|1|NM|WBC^White Blood Count^L|1|7.5|10*3/uL|4.0-11.0|N|||F
OBX|2|NM|RBC^Red Blood Count^L|1|4.5|10*6/uL|4.5-5.5|N|||F`;

  const handleLoadExample = () => {
    setHl7Message(exampleHl7Message);
    setError(null);
    setFhirResource(null);
  };

  const handleConvertToFhir = async () => {
    if (!hl7Message.trim()) {
      setError('Por favor ingrese un mensaje HL7');
      return;
    }

    setLoading(true);
    setError(null);
    setFhirResource(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/fhir/hl7/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: hl7Message,
          format: messageFormat,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al convertir mensaje HL7');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setFhirResource(data.data);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err) {
      setError(err.message || 'Error al convertir mensaje HL7 a FHIR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hl7-page">
      <div className="hl7-page-header">
        <h1>Visualizador y Convertidor HL7</h1>
        <p>Ingrese un mensaje HL7 v2 o v3 para visualizarlo o convertirlo a FHIR</p>
      </div>

      <div className="hl7-page-content">
        <div className="hl7-input-panel">
          <div className="hl7-input-header">
            <h3>Mensaje HL7</h3>
            <div className="hl7-input-actions">
              <select
                value={messageFormat}
                onChange={(e) => setMessageFormat(e.target.value)}
                className="hl7-format-selector"
              >
                <option value="v2">HL7 v2</option>
                <option value="v3">HL7 v3 (XML)</option>
              </select>
              <button className="hl7-example-btn" onClick={handleLoadExample}>
                Cargar Ejemplo
              </button>
            </div>
          </div>

          <textarea
            className="hl7-message-input"
            value={hl7Message}
            onChange={(e) => setHl7Message(e.target.value)}
            placeholder="Pegue aquí su mensaje HL7..."
            rows={15}
          />

          <div className="hl7-input-footer">
            <button
              className="hl7-convert-button"
              onClick={handleConvertToFhir}
              disabled={loading || !hl7Message.trim()}
            >
              {loading ? 'Convirtiendo...' : 'Convertir a FHIR'}
            </button>
            {error && (
              <div className="hl7-error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="hl7-viewer-panel">
          {hl7Message && (
            <div className="hl7-viewer-section">
              <h3>Vista del Mensaje HL7</h3>
              <Hl7MessageViewer
                message={hl7Message}
                onConvertToFhir={handleConvertToFhir}
              />
            </div>
          )}

          {fhirResource && (
            <div className="hl7-fhir-result">
              <h3>Recurso FHIR Convertido</h3>
              <div className="hl7-fhir-content">
                <pre className="hl7-fhir-json">
                  {JSON.stringify(fhirResource, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!hl7Message && (
            <div className="hl7-empty-state">
              <p>Ingrese un mensaje HL7 para comenzar</p>
              <p className="hl7-empty-hint">
                Puede usar el botón "Cargar Ejemplo" para ver un mensaje de ejemplo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hl7Page;

