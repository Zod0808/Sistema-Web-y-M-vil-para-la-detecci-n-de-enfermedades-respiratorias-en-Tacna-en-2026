import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

/* ── Nav link definitions by role ──────────────────────────────────────────── */

// Rutas accesibles para pacientes
const PATIENT_HEALTH_LINKS = [
  { to: '/medical-history', label: 'Mi Historial',    icon: '📋' },
  { to: '/appointments',    label: 'Mis Citas',        icon: '📅' },
  { to: '/prescriptions',   label: 'Mis Recetas',      icon: '💊' },
  { to: '/lab-results',     label: 'Resultados de Lab',icon: '🔬' },
  { to: '/consents',        label: 'Consentimientos',  icon: '📝' },
];

// Dashboard + analítica para médico/admin
const STAFF_ANALYTICS_LINKS = [
  { to: '/analytics', label: 'Analítica Epidemiológica', icon: '📊' },
  { to: '/heatmap',   label: 'Mapa de Calor',            icon: '🗺️' },
  { to: '/fhir',      label: 'Recursos FHIR',            icon: '📋' },
  { to: '/hl7',       label: 'Mensajería HL7',           icon: '🔬' },
];

// Gestión clínica de pacientes (médico/admin)
const STAFF_CLINICAL_LINKS = [
  { to: '/medical-history', label: 'Historiales',     icon: '📋' },
  { to: '/appointments',    label: 'Citas',            icon: '📅' },
  { to: '/prescriptions',   label: 'Recetas',          icon: '💊' },
  { to: '/lab-results',     label: 'Resultados Lab',   icon: '🔬' },
  { to: '/alerts',          label: 'Alertas Clínicas', icon: '🔔' },
  { to: '/referrals',       label: 'Derivaciones',     icon: '🔗' },
  { to: '/emergency',       label: 'Emergencias',      icon: '🚨' },
  { to: '/consents',        label: 'Consentimientos',  icon: '📝' },
];

/* ── Dropdown component ─────────────────────────────────────────────────────── */
function NavDropdown({ label, icon, links, activePathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = links.some(l => l.to === activePathname);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [activePathname]);

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        className={`nav-link nav-dropdown-btn ${isActive ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="nav-icon" aria-hidden="true">{icon}</span>
        <span>{label}</span>
        <span className={`nav-chevron ${open ? 'nav-chevron--open' : ''}`} aria-hidden="true">›</span>
      </button>
      {open && (
        <div className="nav-dropdown-menu" role="menu">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-dropdown-item ${activePathname === l.to ? 'active' : ''}`}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="nav-dropdown-item-icon" aria-hidden="true">{l.icon}</span>
              <span>{l.label}</span>
              {activePathname === l.to && <span className="nav-dropdown-active-dot" aria-hidden="true" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Navbar ─────────────────────────────────────────────────────────────── */
function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  const path = location.pathname;

  const isStaff  = ['doctor', 'admin'].includes(user?.role);
  const isAdmin  = user?.role === 'admin';
  const isPatient = user?.role === 'patient';

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setUserOpen(false); }, [path]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const userInitial  = user?.name ? user.name.charAt(0).toUpperCase() : '?';
  const roleLabel    = { patient: 'Paciente', doctor: 'Médico', admin: 'Administrador' }[user?.role] || user?.role || '';
  const roleBadgeClass = { patient: 'role--patient', doctor: 'role--doctor', admin: 'role--admin' }[user?.role] || '';

  return (
    <nav className="navbar" role="navigation" aria-label="Navegación principal">
      <div className="navbar-container">

        {/* ── Brand ── */}
        <Link to="/" className="navbar-brand" aria-label="RespiCare — Inicio">
          <span className="brand-icon" aria-hidden="true">🫁</span>
          <div className="brand-text">
            <span className="brand-name">RespiCare</span>
            <span className="brand-sub">Sistema Respiratorio</span>
          </div>
        </Link>

        {/* ── Navigation by role ── */}
        <div className="navbar-menu">

          {/* Inicio (chatbot) — todos */}
          <Link to="/" className={`nav-link ${path === '/' ? 'active' : ''}`}>
            <span className="nav-icon" aria-hidden="true">💬</span>
            <span>Chatbot</span>
          </Link>

          {/* ── PACIENTE ── */}
          {isAuthenticated && isPatient && (
            <NavDropdown
              label="Mi Salud"
              icon="❤️"
              links={PATIENT_HEALTH_LINKS}
              activePathname={path}
            />
          )}

          {/* ── MÉDICO / ADMIN ── */}
          {isAuthenticated && isStaff && (
            <>
              <Link to="/dashboard" className={`nav-link ${path === '/dashboard' ? 'active' : ''}`}>
                <span className="nav-icon" aria-hidden="true">⚙️</span>
                <span>Dashboard</span>
              </Link>

              <Link to="/monitoring" className={`nav-link nav-link--highlight ${path === '/monitoring' ? 'active' : ''}`}>
                <span className="nav-icon" aria-hidden="true">🩺</span>
                <span>Monitoreo</span>
                <span className="nav-live-dot" aria-hidden="true" title="Tiempo real" />
              </Link>

              <NavDropdown
                label="Analítica"
                icon="📊"
                links={STAFF_ANALYTICS_LINKS}
                activePathname={path}
              />

              <NavDropdown
                label="Clínica"
                icon="🏥"
                links={STAFF_CLINICAL_LINKS}
                activePathname={path}
              />

              {isAdmin && (
                <Link to="/admin" className={`nav-link nav-link--admin ${path === '/admin' ? 'active' : ''}`}>
                  <span className="nav-icon" aria-hidden="true">🛡️</span>
                  <span>Admin</span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* ── Right controls ── */}
        <div className="navbar-controls">
          <LanguageSelector className="navbar-lang" />
          <ThemeToggle className="navbar-theme" />

          {isAuthenticated ? (
            <div className="nav-user" ref={userRef}>
              <button
                className="nav-user-btn"
                onClick={() => setUserOpen(v => !v)}
                aria-expanded={userOpen}
                aria-haspopup="true"
                aria-label="Menú de usuario"
              >
                <span className="nav-user-avatar" aria-hidden="true">{userInitial}</span>
                <div className="nav-user-info-mini">
                  <span className="nav-user-name">{user?.name?.split(' ')[0] || 'Usuario'}</span>
                  <span className={`nav-user-role-badge ${roleBadgeClass}`}>{roleLabel}</span>
                </div>
                <span className={`nav-chevron ${userOpen ? 'nav-chevron--open' : ''}`} aria-hidden="true">›</span>
              </button>

              {userOpen && (
                <div className="nav-user-menu" role="menu" aria-label="Opciones de usuario">
                  <div className="nav-user-menu-header" role="none">
                    <div className="nav-user-avatar-lg" aria-hidden="true">{userInitial}</div>
                    <div>
                      <p className="nav-user-fullname">{user?.name}</p>
                      <p className="nav-user-email">{user?.email}</p>
                      <span className={`nav-user-role-badge ${roleBadgeClass}`}>{roleLabel}</span>
                    </div>
                  </div>
                  <div className="nav-user-divider" role="separator" />
                  <button
                    className="nav-logout-btn"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <span aria-hidden="true">🚪</span>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-link nav-link--cta">
              <span className="nav-icon" aria-hidden="true">🔑</span>
              <span>Iniciar sesión</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar);
