import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import { useAuth } from '../contexts/AuthContext';
import './clinical.css';

const LIMIT = 10;

const PrescriptionsPage = () => {
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
      const res = await axios.get(`${API_BASE}/prescriptions`, {
        params: { page, limit: LIMIT },
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = res.data?.data;
      const list = Array.isArray(payload) ? payload : payload?.prescriptions || [];
      setRecords(list);
      setTotal(res.data?.total || res.data?.pagination?.total || list.length);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar prescripciones.');
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => { load(); }, [load]);

  const formatMedications = (meds) => {
    if (!meds || !Array.isArray(meds) || meds.length === 0) return '—';
    return meds.map((m) => m.name || m.medicationName || m).slice(0, 2).join(', ') +
      (meds.length > 2 ? ` +${meds.length - 2}` : '');
  };

  return (
    <div className="clinical-page">
      <div className="clinical-page-header">
        <h1>💊 Prescripciones</h1>
        {total > 0 && <span className="clinical-count">{total} registros</span>}
      </div>
      {error && <div className="clinical-error">{error}</div>}
      {loading ? (
        <div className="clinical-loading">
          <div className="loading-spinner" />
          <p>Cargando prescripciones…</p>
        </div>
      ) : (
        <div className="clinical-table-wrapper">
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Medicamentos</th>
                <th>Prescrito por</th>
                <th>Fecha</th>
                <th>Vence</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="clinical-empty">
                    No se encontraron prescripciones
                  </td>
                </tr>
              ) : records.map((r) => (
                <tr key={r._id}>
                  <td>{r.patientName || r.patientId || '—'}</td>
                  <td>{formatMedications(r.medications)}</td>
                  <td>{r.doctorName || r.prescribedBy || '—'}</td>
                  <td>
                    {r.prescribedDate || r.createdAt
                      ? new Date(r.prescribedDate || r.createdAt).toLocaleDateString('es-PE')
                      : '—'}
                  </td>
                  <td>
                    {r.expiresAt
                      ? new Date(r.expiresAt).toLocaleDateString('es-PE')
                      : '—'}
                  </td>
                  <td>
                    <span className={`status-badge status-${r.status || 'active'}`}>
                      {r.status || 'Activo'}
                    </span>
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

export default PrescriptionsPage;