import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const CLINICAL_LINK_DEFS = [
  { to: '/medical-history', labelKey: 'nav.medicalHistory', icon: '📋' },
  { to: '/appointments',    labelKey: 'nav.appointments',   icon: '📅' },
  { to: '/prescriptions',   labelKey: 'nav.prescriptions',  icon: '💊' },
  { to: '/emergency',       labelKey: 'nav.emergency',      icon: '🚨' },
  { to: '/lab-results',     labelKey: 'nav.labResults',     icon: '🔬' },
  { to: '/alerts',          labelKey: 'nav.alerts',         icon: '🔔' },
  { to: '/consents',        labelKey: 'nav.consents',       icon: '📝' },
  { to: '/referrals',       labelKey: 'nav.referrals',      icon: '🔗' },
];

const NAV_LINK_DEFS = [
  { to: '/',          labelKey: 'nav.home',      icon: '🏠' },
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: '⚙️' },
  { to: '/analytics', labelKey: 'nav.analytics', icon: '📊' },
  { to: '/heatmap',   labelKey: 'nav.map',       icon: '🗺️' },
  { to: '/fhir',      labelKey: 'nav.fhir',      icon: '📋' },
  { to: '/hl7',       labelKey: 'nav.hl7',       icon: '🔬' },
];

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();
  const [clinicOpen, setClinicOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const clinicRef = useRef(null);
  const userRef = useRef(null);

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

  const links = useMemo(
    () =>
      NAV_LINK_DEFS.map((def) => ({
        ...def,
        label: t(def.labelKey),
        isActive: location.pathname === def.to,
      })),
    [t, location.pathname]
  );

  const clinicalLinks = useMemo(
    () =>
      CLINICAL_LINK_DEFS.map((def) => ({
        ...def,
        label: t(def.labelKey),
        isActive: location.pathname === def.to,
      })),
    [t, location.pathname]
  );

  const isClinicalActive = clinicalLinks.some((l) => l.isActive);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <nav className="navbar" role="navigation" aria-label={t('nav.brandName')}>
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
                aria-label={t('nav.clinicalManagement')}
              >
                <span className="nav-icon" aria-hidden="true">🏥</span>
                <span>{t('nav.clinicalManagement')}</span>
                <span className="dropdown-arrow" aria-hidden="true">{clinicOpen ? '▲' : '▼'}</span>
              </button>
              {clinicOpen && (
                <div className="nav-dropdown-menu" role="menu" aria-label={t('nav.clinicalManagement')}>
                  {clinicalLinks.map((cl) => (
                    <Link
                      key={cl.to}
                      to={cl.to}
                      className={`nav-dropdown-item ${cl.isActive ? 'active' : ''}`}
                      role="menuitem"
                      aria-current={cl.isActive ? 'page' : undefined}
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
                      aria-current={location.pathname === '/admin' ? 'page' : undefined}
                    >
                      <span aria-hidden="true">⚙️</span>
                      <span>{t('nav.admin')}</span>
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
                aria-haspopup="true"
                aria-label={t('nav.userMenu')}
              >
                <span className="nav-user-avatar" aria-hidden="true">{userInitial}</span>
                <span className="nav-user-name">{user?.name?.split(' ')[0] || 'Usuario'}</span>
                <span className="dropdown-arrow" aria-hidden="true">{userOpen ? '▲' : '▼'}</span>
              </button>
              {userOpen && (
                <div className="nav-user-menu" role="menu" aria-label={t('nav.userMenu')}>
                  <div className="nav-user-info" role="none">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                    <span className="nav-user-role">{user?.role || '—'}</span>
                  </div>
                  <hr className="nav-user-divider" role="separator" />
                  <button
                    className="nav-logout-btn"
                    onClick={handleLogout}
                    role="menuitem"
                    aria-label={t('nav.logout')}
                  >
                    <span aria-hidden="true">🚪</span> {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-link nav-login-btn" aria-label={t('nav.login')}>
              <span className="nav-icon" aria-hidden="true">🔑</span>
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar);
