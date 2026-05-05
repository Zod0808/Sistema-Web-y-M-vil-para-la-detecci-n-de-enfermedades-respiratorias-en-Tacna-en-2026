import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import { useAuth } from '../contexts/AuthContext';
import './clinical.css';

const LIMIT = 10;

const INTERPRETATION_LABELS = {
  normal: 'Normal',
  low: 'Bajo',
  high: 'Alto',
  critical: 'Crítico',
};

const LabResultsPage = () => {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/lab/results`, {
        params: { page, limit: LIMIT },
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = res.data?.data;
      const list = Array.isArray(payload) ? payload : payload?.results || payload?.labResults || [];
      setRecords(list);
      setTotal(res.data?.total || res.data?.pagination?.total || list.length);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar resultados de laboratorio.');
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="clinical-page">
      <div className="clinical-page-header">
        <h1>🔬 Resultados de Laboratorio</h1>
        {total > 0 && <span className="clinical-count">{total} registros</span>}
      </div>
      {error && <div className="clinical-error">{error}</div>}
      {loading ? (
        <div className="clinical-loading">
          <div className="loading-spinner" />
          <p>Cargando resultados de laboratorio…</p>
        </div>
      ) : (
        <div className="clinical-table-wrapper">
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Prueba</th>
                <th>Categoría</th>
                <th>Interpretación</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="clinical-empty">
                    No se encontraron resultados de laboratorio
                  </td>
                </tr>
              ) : records.map((r) => (
                <tr key={r._id}>
                  <td>{r.patientName || r.patientId || '—'}</td>
                  <td>{r.testName || r.testType || r.name || '—'}</td>
                  <td>
                    <span className="badge">{r.category || '—'}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${r.interpretation || 'normal'}`}>
                      {INTERPRETATION_LABELS[r.interpretation] || r.interpretation || 'Normal'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${r.status || 'completed'}`}>
                      {r.status || 'Completado'}
                    </span>
                  </td>
                  <td>
                    {r.testDate || r.createdAt
                      ? new Date(r.testDate || r.createdAt).toLocaleDateString('es-PE')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > LIMIT && (
        <div className="clinical-pagination">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ← Anterior
          </button>
          <span>Página {page} de {Math.ceil(total / LIMIT)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
};

export default LabResultsPage;