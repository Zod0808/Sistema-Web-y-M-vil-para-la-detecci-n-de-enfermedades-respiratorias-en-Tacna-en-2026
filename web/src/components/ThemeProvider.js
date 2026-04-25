/**
 * Theme Provider
 * 
 * Proveedor de tema para toda la aplicación con soporte light/dark
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTheme } from '../theme/theme';

const ThemeContext = createContext();

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode');
      return saved || 'light';
    }
    return 'light';
  });

  const [theme, setThemeState] = useState(() => getTheme(mode));

  useEffect(() => {
    const currentTheme = getTheme(mode);
    setThemeState(currentTheme);
    
    // Aplicar tema al documento
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentTheme.palette.primary.main);
    root.style.setProperty('--color-background', currentTheme.palette.background.default);
    root.style.setProperty('--color-text-primary', currentTheme.palette.text.primary);
    root.style.setProperty('--color-text-secondary', currentTheme.palette.text.secondary);
    root.style.setProperty('--color-divider', currentTheme.palette.divider);
    
    // Agregar clase al body para estilos CSS
    document.body.className = `theme-${mode}`;
  }, [mode]);

  // Escuchar cambios en preferencia del sistema
  useEffect(() => {
    if (mode === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        const newTheme = getTheme(e.matches ? 'dark' : 'light');
        setThemeState(newTheme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode]);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', newMode);
    }
  };

  const setTheme = (newMode) => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', newMode);
    }
  };

  const value = {
    theme,
    mode,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

