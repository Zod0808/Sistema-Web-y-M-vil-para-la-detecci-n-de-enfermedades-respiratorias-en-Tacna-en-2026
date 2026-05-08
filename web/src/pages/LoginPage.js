import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const FEATURES = [
  { icon: '🫁', text: 'Seguimiento respiratorio personalizado' },
  { icon: '📊', text: 'Reportes clínicos en tiempo real' },
  { icon: '🩺', text: 'Monitoreo de pacientes por wearable' },
  { icon: '🔒', text: 'Datos protegidos con cifrado médico' },
];

const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Si ya está autenticado, redirigir según rol
  if (!authLoading && isAuthenticated) {
    const dest = ['doctor', 'admin'].includes(user?.role) ? '/dashboard' : '/';
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      const from = location.state?.from?.pathname;
      // Redirigir según rol
      const dest = from && from !== '/login'
        ? from
        : ['doctor', 'admin'].includes(loggedUser?.role) ? '/dashboard' : '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales inválidas. Intenta de nuevo.');
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
            Plataforma clínica integral para el manejo de enfermedades respiratorias
          </p>
          <ul className="login-brand__features">
            {FEATURES.map((f, i) => (
              <li key={i} className="login-brand__feature">
                <span className="login-brand__feature-icon">{f.icon}</span>
                <span>{f.text}</span>
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
        <div className="login-form-card">
          <div className="login-form-header">
            <h1 className="login-form-title">Bienvenido</h1>
            <p className="login-form-subtitle">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <div className="login-error" role="alert" aria-live="polite">
                <span className="login-error__icon">⚠</span>
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">✉</span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Contraseña</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔑</span>
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <><span className="login-spinner" aria-hidden="true" />Verificando…</>
              ) : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="login-roles">
            <p className="login-roles__label">Acceso por tipo de usuario</p>
            <div className="login-roles__grid">
              <div className="login-role-card">
                <span>👤</span>
                <strong>Paciente</strong>
                <span>Chatbot, historial y citas</span>
              </div>
              <div className="login-role-card">
                <span>🩺</span>
                <strong>Médico</strong>
                <span>Reportes, monitoreo y analítica</span>
              </div>
              <div className="login-role-card">
                <span>⚙️</span>
                <strong>Admin</strong>
                <span>Gestión completa del sistema</span>
              </div>
            </div>
          </div>

          <p className="login-footer">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="login-link">Regístrate aquí</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
