import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import { useAuth } from '../contexts/AuthContext';
import './clinical.css';
import './AdminPage.css';

const ROLE_LABELS = { admin: 'Administrador', doctor: 'Doctor', patient: 'Paciente' };
const LIMIT = 15;

const AdminPage = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, statsRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/auth/users`, { params: { page, limit: LIMIT }, headers }),
        axios.get(`${API_BASE}/auth/stats`, { headers }),
      ]);
      if (usersRes.status === 'fulfilled') {
        const payload = usersRes.value.data?.data;
        const list = Array.isArray(payload) ? payload : payload?.users || [];
        setUsers(list);
        setTotal(usersRes.value.data?.total || list.length);
      } else {
        setError(usersRes.reason?.response?.data?.message || 'Error al cargar usuarios.');
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || null);
      }
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="clinical-page">
      <div className="clinical-page-header">
        <h1>⚙️ Panel de Administración</h1>
        {total > 0 && <span className="clinical-count">{total} usuarios</span>}
      </div>

      {stats && (
        <div className="admin-stats">
          {[
            { label: 'Total usuarios', value: stats.totalUsers || total, icon: '👥' },
            { label: 'Doctores', value: stats.doctorCount || '—', icon: '👨‍⚕️' },
            { label: 'Pacientes', value: stats.patientCount || '—', icon: '🏥' },
            { label: 'Activos', value: stats.activeUsers || '—', icon: '✅' },
          ].map((s) => (
            <div key={s.label} className="admin-stat-card">
              <span className="admin-stat-icon">{s.icon}</span>
              <div>
                <div className="admin-stat-value">{s.value}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="clinical-error">{error}</div>}
      {loading ? (
        <div className="clinical-loading">
          <div className="loading-spinner" />
          <p>Cargando usuarios…</p>
        </div>
      ) : (
        <div className="clinical-table-wrapper">
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="clinical-empty">No se encontraron usuarios</td>
                </tr>
              ) : users.map((u) => (
                <tr key={u._id} className={u._id === currentUser?._id ? 'admin-current-user' : ''}>
                  <td>
                    {u.name || '—'}
                    {u._id === currentUser?._id && (
                      <span className="admin-you-badge"> (tú)</span>
                    )}
                  </td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className="badge">{ROLE_LABELS[u.role] || u.role || '—'}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${u.isActive ? 'status-active' : 'status-inactive'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-PE') : 'Nunca'}
                  </td>
                  <td>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-PE') : '—'}
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

export default AdminPage;