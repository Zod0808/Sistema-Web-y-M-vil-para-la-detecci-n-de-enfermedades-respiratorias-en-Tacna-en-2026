import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import { useAuth } from '../contexts/AuthContext';
import './clinical.css';
import './AdminPage.css';

const ROLE_LABELS = { admin: 'Administrador', doctor: 'Doctor', patient: 'Paciente' };
const LIMIT = 15;

const EMPTY_FORM = { name: '', email: '', password: '', role: 'patient' };

/* ── Create / Edit Modal ─────────────────────────────────────────── */
function UserModal({ mode, initial, onSave, onClose, loading, error }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === 'create' ? '➕ Crear Usuario' : '✏️ Editar Usuario'}</h2>

        {error && <div className="admin-modal-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-field">
            <label>Nombre completo</label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>
          <div className="admin-modal-field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>
          {mode === 'create' && (
            <div className="admin-modal-field">
              <label>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
            </div>
          )}
          <div className="admin-modal-field">
            <label>Rol</label>
            <select value={form.role} onChange={set('role')}>
              <option value="patient">Paciente</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-save" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
const AdminPage = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [modal, setModal] = useState(null); // null | { mode:'create'|'edit', user?:object }
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

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
        setTotal(usersRes.value.data?.total ?? usersRes.value.data?.pagination?.total ?? list.length);
      } else {
        setError(usersRes.reason?.response?.data?.message || 'Error al cargar usuarios.');
      }
      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value.data?.data || null;
        if (raw) {
          // Normalizar formato: backend devuelve {doctor:{total,active}, patient:{total,active}, admin:{total,active}}
          const normalized = raw.totalUsers != null ? raw : {
            totalUsers: (raw.doctor?.total || 0) + (raw.admin?.total || 0) + (raw.patient?.total || 0),
            doctorCount: raw.doctor?.total || 0,
            patientCount: raw.patient?.total || 0,
            activeUsers: (raw.doctor?.active || 0) + (raw.admin?.active || 0) + (raw.patient?.active || 0),
          };
          setStats(normalized);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [page, headers]);

  useEffect(() => { load(); }, [load]);

  /* ── Toggle isActive (no borra datos) ── */
  const handleToggleActive = async (u) => {
    if (!window.confirm(
      u.isActive !== false
        ? `¿Desactivar a ${u.name}? No podrá iniciar sesión hasta que sea reactivado.`
        : `¿Reactivar a ${u.name}?`
    )) return;

    try {
      await axios.patch(`${API_BASE}/auth/users/${u._id}/toggle`, {}, { headers });
      setUsers((prev) =>
        prev.map((x) => (x._id === u._id ? { ...x, isActive: !x.isActive } : x))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar estado del usuario.');
    }
  };

  /* ── Create user ── */
  const handleCreate = async (form) => {
    setModalLoading(true);
    setModalError('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/users`, form, { headers });
      setModal(null);
      setUsers((prev) => [data.data, ...prev]);
      setTotal((t) => t + 1);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error al crear usuario.');
    } finally {
      setModalLoading(false);
    }
  };

  /* ── Edit user ── */
  const handleEdit = async (form) => {
    setModalLoading(true);
    setModalError('');
    try {
      const { data } = await axios.patch(
        `${API_BASE}/auth/users/${modal.user._id}`,
        { name: form.name, email: form.email, role: form.role },
        { headers }
      );
      setModal(null);
      setUsers((prev) =>
        prev.map((x) => (x._id === modal.user._id ? { ...x, ...data.data } : x))
      );
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error al actualizar usuario.');
    } finally {
      setModalLoading(false);
    }
  };

  const openEdit = (u) => {
    setModalError('');
    setModal({ mode: 'edit', user: u });
  };

  const openCreate = () => {
    setModalError('');
    setModal({ mode: 'create' });
  };

  const closeModal = () => { setModal(null); setModalError(''); };

  return (
    <div className="clinical-page">
      <div className="clinical-page-header">
        <h1>⚙️ Panel de Administración</h1>
        <div className="admin-header-actions">
          {total > 0 && <span className="clinical-count">{total} usuarios</span>}
          <button className="btn-create" onClick={openCreate}>➕ Crear Usuario</button>
        </div>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="clinical-empty">No se encontraron usuarios</td>
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
                    <span className={`status-badge ${u.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                      {u.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-PE') : 'Nunca'}
                  </td>
                  <td>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-PE') : '—'}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="btn-edit"
                        onClick={() => openEdit(u)}
                        title="Editar usuario"
                      >
                        ✏️ Editar
                      </button>
                      {u._id !== currentUser?._id && (
                        <button
                          className={u.isActive !== false ? 'btn-deactivate' : 'btn-activate'}
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive !== false ? 'Desactivar usuario' : 'Reactivar usuario'}
                        >
                          {u.isActive !== false ? '🔒 Desactivar' : '🔓 Reactivar'}
                        </button>
                      )}
                    </div>
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

      {modal && (
        <UserModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? { name: modal.user.name, email: modal.user.email, role: modal.user.role, password: '' } : EMPTY_FORM}
          onSave={modal.mode === 'create' ? handleCreate : handleEdit}
          onClose={closeModal}
          loading={modalLoading}
          error={modalError}
        />
      )}
    </div>
  );
};

export default AdminPage;
