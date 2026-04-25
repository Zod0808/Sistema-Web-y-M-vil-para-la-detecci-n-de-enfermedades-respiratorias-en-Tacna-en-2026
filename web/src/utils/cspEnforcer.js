/**
 * CSP Enforcer
 * 
 * Refuerza Content Security Policy en el cliente
 * Detecta y previene violaciones de CSP
 */

/**
 * Inicializa el enforcement de CSP en el cliente
 */
export function initCSPEnforcement() {
  // Detectar violaciones de CSP
  if (typeof document !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error('CSP Violation:', {
        violatedDirective: e.violatedDirective,
        blockedURI: e.blockedURI,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber,
      });
      
      // Enviar a analytics/error tracking si está disponible
      if (window.analyticsService) {
        window.analyticsService.logEvent('security.csp_violation', {
          directive: e.violatedDirective,
          blockedURI: e.blockedURI,
        });
      }
    });
  }

  // Prevenir eval() y Function() (aunque CSP debería bloquearlo)
  if (typeof window !== 'undefined') {
    const originalEval = window.eval;
    window.eval = function(code) {
      console.warn('eval() bloqueado por política de seguridad');
      throw new Error('eval() no está permitido por razones de seguridad');
    };

    // Prevenir Function constructor
    if (window.Function) {
      const OriginalFunction = window.Function;
      window.Function = function(...args) {
        console.warn('Function() constructor bloqueado por política de seguridad');
        throw new Error('Function() constructor no está permitido por razones de seguridad');
      };
    }
  }
}

/**
 * Valida que un script sea seguro antes de ejecutarlo
 */
export function validateScript(scriptContent) {
  // Lista de patrones peligrosos
  const dangerousPatterns = [
    /document\.cookie/i,
    /localStorage/i,
    /sessionStorage/i,
    /XMLHttpRequest/i,
    /fetch\(/i,
    /eval\(/i,
    /Function\(/i,
    /<script/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(scriptContent)) {
      throw new Error(`Script contiene patrón peligroso: ${pattern}`);
    }
  }

  return true;
}

