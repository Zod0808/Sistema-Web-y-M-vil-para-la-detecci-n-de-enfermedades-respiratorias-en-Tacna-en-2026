/**
 * Language Selector Component
 * 
 * Componente para seleccionar el idioma de la aplicación
 */

import React, { useState, useEffect, useRef } from 'react';
import { t, setLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES } from '../services/i18nService';
import './LanguageSelector.css';

const LanguageSelector = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setCurrentLang(event.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
    // No recargar la página, solo disparar el evento
    // Los componentes que escuchan el evento se actualizarán automáticamente
  };

  const currentLanguageName = SUPPORTED_LANGUAGES[currentLang] || 'Español';

  return (
    <div className={`language-selector ${className}`} ref={dropdownRef}>
      <button
        className="language-selector__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('common.selectLanguage') || 'Seleccionar idioma'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="language-selector__icon">🌐</span>
        <span className="language-selector__text">{currentLanguageName}</span>
        <span className={`language-selector__arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="language-selector__dropdown">
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <button
              key={code}
              className={`language-selector__option ${currentLang === code ? 'active' : ''}`}
              onClick={() => handleLanguageSelect(code)}
              aria-label={`Seleccionar ${name}`}
            >
              <span className="language-selector__option-flag">
                {code === 'es' ? '🇪🇸' : code === 'en' ? '🇺🇸' : code === 'pt' ? '🇧🇷' : code === 'fr' ? '🇫🇷' : '🇵🇪'}
              </span>
              <span className="language-selector__option-name">{name}</span>
              {currentLang === code && (
                <span className="language-selector__option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

