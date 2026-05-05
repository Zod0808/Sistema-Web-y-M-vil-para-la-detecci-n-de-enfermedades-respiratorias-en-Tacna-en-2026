import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { t, getCurrentLanguage } from '../services/i18nService';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const CLINICAL_LINKS = [
  { to: '/medical-history', label: 'Historias Médicas', icon: '📋' },
  { to: '/appointments', label: 'Citas Médicas', icon: '📅' },
  { to: '/prescriptions', label: 'Prescripciones', icon: '💊' },
  { to: '/emergency', label: 'Emergencias', icon: '🚨' },
  { to: '/lab-results', label: 'Laboratorio', icon: '🔬' },
  { to: '/alerts', label: 'Alertas', icon: '🔔' },
  { to: '/consents', label: 'Consentimientos', icon: '📝' },
  { to: '/referrals', label: 'Referidos', icon: '🔗' },
];

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [language, setLanguage] = useState(getCurrentLanguage());
  const [clinicOpen, setClinicOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const clinicRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clinicRef.current && !clinicRef.current.contains(e.target)) {
        setClinicOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setClinicOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  const NAV_LINKS = useMemo(
    () => [
      { to: '/', labelKey: 'nav.home', icon: '🏠' },
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: '⚙️' },
      { to: '/analytics', labelKey: 'nav.analytics', icon: '📊' },
      { to: '/heatmap', labelKey: 'nav.map', icon: '🗺️' },
      { to: '/fhir', labelKey: 'nav.fhir', icon: '📋' },
      { to: '/hl7', labelKey: 'nav.hl7', icon: '🔬' },
    ],
    []
  );

  const links = NAV_LINKS.map((link) => ({
    ...link,
    label: t(link.labelKey),
    isActive: location.pathname === link.to,
  }));

  const isClinicalActive = CLINICAL_LINKS.some((l) => location.pathname === l.to);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="brand-icon" aria-hidden="true">🏥</span>
          <span className="brand-name">{t('nav.brandName')}</span>
          <span className="brand-subtitle">{t('nav.brandSubtitle')}</span>
        </div>

        <div className="navbar-menu">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${link.isActive ? 'active' : ''}`}
              aria-current={link.isActive ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}

          {/* Dropdown Gestión Clínica */}
          {isAuthenticated && (
            <div className="nav-dropdown" ref={clinicRef}>
              <button
                className={`nav-link nav-dropdown-btn ${isClinicalActive ? 'active' : ''}`}
                onClick={() => setClinicOpen((v) => !v)}
                aria-expanded={clinicOpen}
                aria-haspopup="true"
              >
                <span className="nav-icon" aria-hidden="true">🏥</span>
                <span>Gestión Clínica</span>
                <span className="dropdown-arrow">{clinicOpen ? '▲' : '▼'}</span>
              </button>
              {clinicOpen && (
                <div className="nav-dropdown-menu" role="menu">
                  {CLINICAL_LINKS.map((cl) => (
                    <Link
                      key={cl.to}
                      to={cl.to}
                      className={`nav-dropdown-item ${location.pathname === cl.to ? 'active' : ''}`}
                      role="menuitem"
                    >
                      <span aria-hidden="true">{cl.icon}</span>
                      <span>{cl.label}</span>
                    </Link>
                  ))}
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`nav-dropdown-item ${location.pathname === '/admin' ? 'active' : ''}`}
                      role="menuitem"
                    >
                      <span aria-hidden="true">⚙️</span>
                      <span>Administración</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          <LanguageSelector className="navbar-language-selector" />
          <ThemeToggle className="navbar-theme-toggle" />

          {/* Sesión de usuario */}
          {isAuthenticated ? (
            <div className="nav-user" ref={userRef}>
              <button
                className="nav-user-btn"
                onClick={() => setUserOpen((v) => !v)}
                aria-expanded={userOpen}
                aria-label="Menú de usuario"
              >
                <span className="nav-user-avatar">{userInitial}</span>
                <span className="nav-user-name">{user?.name?.split(' ')[0] || 'Usuario'}</span>
                <span className="dropdown-arrow">{userOpen ? '▲' : '▼'}</span>
              </button>
              {userOpen && (
                <div className="nav-user-menu" role="menu">
                  <div className="nav-user-info">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                    <span className="nav-user-role">{user?.role || '—'}</span>
                  </div>
                  <hr className="nav-user-divider" />
                  <button className="nav-logout-btn" onClick={handleLogout} role="menuitem">
                    🚪 Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-link nav-login-btn">
              <span className="nav-icon" aria-hidden="true">🔑</span>
              <span>Iniciar Sesión</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar);