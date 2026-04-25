import React, { useState } from 'react';
import axios from 'axios';
import './MedicalReport.css';
import API_BASE from '../utils/apiBase';

const DEFAULT_TEMPLATES = [
  { id: 'clinical-summary', name: 'Resumen Clínico' },
  { id: 'treatment-plan', name: 'Plan de Tratamiento' },
];

const MedicalReport = () => {
  const [token, setToken] = useState('');
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATES[0].id);
  const [diagnosis, setDiagnosis] = useState('');
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [recentReports, setRecentReports] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const generateReport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(
        `${API_BASE}/reports/generate`,
        {
          patientId,
          doctorId,
          templateId,
          diagnosis,
          observations,
          recommendations: recommendations
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        },
        { headers }
      );

      const report = response.data?.data;
      setMessage({ type: 'success', text: 'Reporte generado correctamente.' });
      if (report?.id) {
        await loadHistory();
        window.open(`${API_BASE}/reports/${report.id}/download?token=${token}`, '_blank', 'noopener');
      }
    } catch (error) {
      console.error(error);
      const text =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'No fue posible generar el reporte médico.';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!patientId) {
      setMessage({ type: 'error', text: 'Ingrese el ID de paciente para consultar el historial.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.get(`${API_BASE}/reports?patientId=${patientId}`, {
        headers,
      });
      setRecentReports(response.data?.data ?? []);
      setMessage({ type: 'success', text: 'Historial cargado.' });
    } catch (error) {
      console.error(error);
      const text =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'No fue posible obtener el historial.';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="medical-report">
      <header>
        <h3>📄 Generador de Reportes Médicos</h3>
        <p>Crea y descarga reportes profesionales en PDF.</p>
      </header>

      <div className="report-form">
        <label>
          Token JWT
          <input
            type="text"
            placeholder="Opcional: Bearer token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>

        <label>
          ID Paciente
          <input
            type="text"
            placeholder="patient-123"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          />
        </label>

        <label>
          ID Doctor
          <input
            type="text"
            placeholder="doctor-456"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          />
        </label>

        <label>
          Plantilla
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {DEFAULT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Diagnóstico
          <textarea
            rows={3}
            placeholder="Descripción del diagnóstico..."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </label>

        <label>
          Observaciones
          <textarea
            rows={3}
            placeholder="Observaciones clínicas..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </label>

        <label>
          Recomendaciones (una por línea)
          <textarea
            rows={3}
            placeholder="Ej: Realizar control en 7 días"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </label>

        <div className="report-actions">
          <button onClick={generateReport} disabled={loading}>
            🧾 Generar PDF
          </button>
          <button onClick={loadHistory} disabled={loading}>
            📚 Ver historial
          </button>
        </div>
      </div>

      {message && (
        <div className={`report-message ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      {recentReports.length > 0 && (
        <div className="report-history">
          <h4>Historial reciente</h4>
          <table>
            <thead>
              <tr>
                <th>Reporte</th>
                <th>Fecha</th>
                <th>Compartido con</th>
                <th>Firma</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.title}</td>
                  <td>{new Date(report.createdAt).toLocaleString()}</td>
                  <td>{report.sharedWith?.length ? report.sharedWith.join(', ') : '—'}</td>
                  <td>{report.signedBy ? `Firmado por ${report.signedBy}` : 'Pendiente'}</td>
                  <td>
                    <a
                      href={`${API_BASE}/reports/${report.id}/download?token=${token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Descargar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default MedicalReport;

