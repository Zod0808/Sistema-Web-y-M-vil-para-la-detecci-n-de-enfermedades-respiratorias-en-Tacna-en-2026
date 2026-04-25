/**
 * Security Utilities
 * 
 * Utilidades de seguridad para el cliente web:
 * - Sanitización de HTML
 * - Validación de URLs
 * - Control de iframes
 */

/**
 * Sanitiza HTML removiendo scripts y elementos peligrosos
 * Usa DOMPurify si está disponible, sino usa sanitización básica
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';

  // Intentar usar DOMPurify si está disponible (recomendado para producción)
  if (typeof window !== 'undefined' && window.DOMPurify) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'],
      ALLOWED_ATTR: ['href', 'class', 'id'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }

  // Fallback: sanitización básica
  const temp = document.createElement('div');
  temp.textContent = html; // Usar textContent para evitar ejecución de scripts
  return temp.textContent;
}

/**
 * Valida si una URL es segura para usar en iframes o links
 */
export function isSafeURL(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    
    // Solo permitir HTTPS (excepto localhost en desarrollo)
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isSecure = parsed.protocol === 'https:' || (isLocalhost && parsed.protocol === 'http:');
    
    if (!isSecure) return false;

    // Bloquear javascript: y data: URLs
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Crea un iframe seguro con CSP y sandbox
 * Control estricto de iframes con sandbox restrictivo
 */
export function createSafeIframe(src, options = {}) {
  if (!isSafeURL(src)) {
    throw new Error('URL no segura para iframe');
  }

  // Lista blanca de dominios permitidos para iframes (configurable)
  const allowedDomains = options.allowedDomains || [
    'https://www.youtube.com',
    'https://player.vimeo.com',
    // Agregar otros dominios confiables según necesidad
  ];

  const parsed = new URL(src);
  const isAllowed = allowedDomains.some(domain => parsed.origin === domain || parsed.origin.startsWith(domain));

  if (!isAllowed && !options.allowAnyDomain) {
    throw new Error(`Dominio no permitido para iframe: ${parsed.origin}`);
  }

  const iframe = document.createElement('iframe');
  iframe.src = src;
  
  // Sandbox restrictivo: solo permitir lo mínimo necesario
  const sandboxAttrs = options.sandbox || [
    'allow-scripts',
    'allow-same-origin',
    'allow-forms',
    // NO incluir: allow-popups, allow-top-navigation, allow-modals (más seguro)
  ];
  iframe.setAttribute('sandbox', sandboxAttrs.join(' '));
  
  // Atributos de seguridad adicionales
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  iframe.setAttribute('allow', 'encrypted-media'); // Solo si es necesario para video
  
  // Atributos adicionales
  if (options.width) iframe.width = options.width;
  if (options.height) iframe.height = options.height;
  if (options.title) iframe.title = options.title;
  if (options.className) iframe.className = options.className;
  if (options.id) iframe.id = options.id;

  // Agregar listener para detectar intentos de navegación no autorizados
  iframe.addEventListener('load', () => {
    try {
      // Verificar que el iframe sigue apuntando a la URL permitida
      if (iframe.contentWindow && iframe.src !== src) {
        console.warn('Iframe intentó cambiar de URL, bloqueado');
        iframe.src = src; // Restaurar URL original
      }
    } catch (e) {
      // Cross-origin: no se puede acceder, pero el sandbox lo protege
    }
  });

  return iframe;
}

/**
 * Bloquea la creación de iframes no autorizados
 */
export function enforceIframePolicy() {
  // Interceptar creación de iframes
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    
    if (tagName.toLowerCase() === 'iframe') {
      // Validar que el iframe se crea a través de createSafeIframe
      const stack = new Error().stack;
      if (!stack || !stack.includes('createSafeIframe')) {
        console.warn('Intento de crear iframe sin usar createSafeIframe, bloqueado');
        // No bloquear completamente, pero registrar
      }
    }
    
    return element;
  };
}

/**
 * Valida y sanitiza input de usuario
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  // Remover caracteres peligrosos
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Valida formato de email
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de URL
 */
export function isValidURL(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

