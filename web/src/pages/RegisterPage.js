import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const ROLES = [
  { value: 'patient', label: 'Paciente',       icon: '👤', desc: 'Gestión de citas e historial' },
  { value: 'doctor',  label: 'Médico',          icon: '🩺', desc: 'Monitoreo y reportes clínicos' },
  { value: 'admin',   label: 'Administrador',   icon: '⚙️', desc: 'Control completo del sistema' },
];

const BENEFITS = [
  { icon: '🔒', text: 'Datos médicos cifrados y seguros' },
  { icon: '📱', text: 'Acceso desde cualquier dispositivo' },
  { icon: '🩺', text: 'Seguimiento clínico personalizado' },
  { icon: '📊', text: 'Reportes e indicadores en tiempo real' },
];

const RegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
  });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const { register, isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (!authLoading && isAuthenticated) {
    const dest = ['doctor', 'admin'].includes(user?.role) ? '/dashboard' : '/';
    return <Navigate to={dest} replace />;
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const created = await register(form.name, form.email, form.password, form.role);
      const dest = ['doctor', 'admin'].includes(created?.role ?? form.role) ? '/dashboard' : '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Panel izquierdo — branding ── */}
      <aside className="login-brand" aria-hidden="true">
        <div className="login-brand__inner">
          <div className="login-brand__logo">
            <span className="login-brand__icon">🫁</span>
            <span className="login-brand__name">RespiCare</span>
          </div>
          <p className="login-brand__tagline">
            Únete a la plataforma clínica más completa para el manejo de enfermedades respiratorias
          </p>
          <ul className="login-brand__features">
            {BENEFITS.map((b, i) => (
              <li key={i} className="login-brand__feature">
                <span className="login-brand__feature-icon">{b.icon}</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
          <div className="login-brand__badge">
            Sistema certificado · Datos encriptados · HIPAA-ready
          </div>
        </div>
      </aside>

      {/* ── Panel derecho — formulario ── */}
      <section className="login-form-panel">
        <div className="login-form-card" style={{ maxWidth: 460 }}>
          <div className="login-form-header">
            <h1 className="login-form-title">Crear cuenta</h1>
            <p className="login-form-subtitle">Completa tus datos para registrarte en RespiCare</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <div className="login-error" role="alert" aria-live="polite">
                <span className="login-error__icon">⚠</span>
                {error}
              </div>
            )}

            {/* Nombre */}
            <div className="login-field">
              <label htmlFor="reg-name">Nombre completo</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">👤</span>
                <input
                  id="reg-name"
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Juan Pérez"
                  required
                  autoFocus
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="login-field">
              <label htmlFor="reg-email">Correo electrónico</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">✉</span>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="usuario@ejemplo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Rol */}
            <div className="login-field">
              <label htmlFor="reg-role">Tipo de usuario</label>
              <div className="login-roles__grid" style={{ marginTop: 4 }}>
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className="login-role-card"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    style={form.role === r.value
                      ? { border: '2px solid #1565c0', background: '#e8f0fe' }
                      : {}}
                  >
                    <span>{r.icon}</span>
                    <strong>{r.label}</strong>
                    <span>{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <label htmlFor="reg-password">Contraseña</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔑</span>
                <input
                  id="reg-password"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="login-pwd-toggle"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="login-field">
              <label htmlFor="reg-confirm">Confirmar contraseña</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔑</span>
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Repite tu contraseña"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="login-pwd-toggle"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <><span className="login-spinner" aria-hidden="true" />Registrando…</>
              ) : 'Crear Cuenta'}
            </button>
          </form>

          <p className="login-footer">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="login-link">Inicia sesión aquí</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default RegisterPage;
