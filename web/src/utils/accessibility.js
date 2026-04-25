/**
 * Accessibility Utilities
 * 
 * Utilidades para mejorar accesibilidad (WCAG 2.1 AA)
 */

/**
 * Agrega atributos ARIA a un elemento
 */
export function addAriaAttributes(element, attributes) {
  if (!element || !attributes) return;
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key.startsWith('aria-') || key === 'role') {
      element.setAttribute(key, value);
    }
  });
}

/**
 * Crea un anuncio para lectores de pantalla
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remover después de que el lector de pantalla lo haya anunciado
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Verifica contraste de colores (WCAG AA)
 */
export function checkContrast(foreground, background) {
  // Convertir hex a RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calcular luminancia relativa
  const getLuminance = (rgb) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) return null;

  const fgLum = getLuminance(fgRgb);
  const bgLum = getLuminance(bgRgb);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  const contrast = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: contrast,
    meetsAA: contrast >= 4.5, // WCAG AA para texto normal
    meetsAAA: contrast >= 7, // WCAG AAA para texto normal
    meetsAALarge: contrast >= 3, // WCAG AA para texto grande
  };
}

/**
 * Maneja navegación por teclado (trap focus)
 */
export function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTab = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTab);

  // Focus en el primer elemento
  if (firstElement) {
    firstElement.focus();
  }

  // Cleanup
  return () => {
    element.removeEventListener('keydown', handleTab);
  };
}

/**
 * Crea un skip link para navegación por teclado
 */
export function createSkipLink(targetId, label = 'Saltar al contenido principal') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'skip-link';
  skipLink.setAttribute('aria-label', label);
  
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  return skipLink;
}

/**
 * Agrega indicadores de foco visible
 */
export function enhanceFocusIndicators() {
  const style = document.createElement('style');
  style.textContent = `
    *:focus-visible {
      outline: 2px solid var(--color-primary, #1976d2);
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--color-primary, #1976d2);
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      z-index: 1000;
    }
    
    .skip-link:focus {
      top: 0;
    }
    
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Inicializa mejoras de accesibilidad
 */
export function initAccessibility() {
  enhanceFocusIndicators();
  
  // Agregar skip link si no existe
  if (!document.querySelector('.skip-link')) {
    const skipLink = createSkipLink('main-content', 'Saltar al contenido principal');
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
  
  // Agregar landmark roles si no existen
  const main = document.querySelector('main');
  if (main && !main.getAttribute('role')) {
    main.setAttribute('role', 'main');
    main.setAttribute('id', 'main-content');
  }
  
  const nav = document.querySelector('nav');
  if (nav && !nav.getAttribute('role')) {
    nav.setAttribute('role', 'navigation');
  }
}

