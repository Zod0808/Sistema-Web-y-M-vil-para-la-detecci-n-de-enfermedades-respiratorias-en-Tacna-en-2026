import React, { memo, useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { t, getCurrentLanguage } from '../services/i18nService';
import './Navbar.css';

function Navbar() {
  const location = useLocation();
  const [language, setLanguage] = useState(getCurrentLanguage());

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const NAV_LINKS = useMemo(
    () => [
      { to: '/', labelKey: 'nav.home', icon: '🏠' },
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: '⚙️' },
      { to: '/analytics', labelKey: 'nav.analytics', icon: '📊' },
      { to: '/heatmap', labelKey: 'nav.map', icon: '🗺️' },
      { to: '/fhir', labelKey: 'nav.fhir', icon: '📋' },
      { to: '/hl7', labelKey: 'nav.hl7', icon: '🔬' }
    ],
    []
  );

  const links = NAV_LINKS.map(link => ({
    ...link,
    label: t(link.labelKey),
    isActive: location.pathname === link.to
  }));

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="brand-icon" aria-hidden="true">🏥</span>
          <span className="brand-name">{t('nav.brandName')}</span>
          <span className="brand-subtitle">{t('nav.brandSubtitle')}</span>
        </div>
        <div className="navbar-menu">
          {links.map(link => (
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
          <LanguageSelector className="navbar-language-selector" />
          <ThemeToggle className="navbar-theme-toggle" />
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar);

