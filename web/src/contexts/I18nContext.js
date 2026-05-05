import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  t as tService,
  setLanguage as setLangService,
  getCurrentLanguage,
  SUPPORTED_LANGUAGES,
} from '../services/i18nService';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getCurrentLanguage);

  useEffect(() => {
    const handler = (e) => setLanguageState(e.detail.language);
    window.addEventListener('languageChanged', handler);
    return () => window.removeEventListener('languageChanged', handler);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((langCode) => {
    setLangService(langCode);
  }, []);

  // t recreated on each language change → consumers re-render automatically
  const t = useCallback((key, params) => tService(key, params), [language]);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage, SUPPORTED_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      t: tService,
      language: getCurrentLanguage(),
      setLanguage: setLangService,
      SUPPORTED_LANGUAGES,
    };
  }
  return ctx;
}
