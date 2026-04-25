/**
 * Localized Error Messages
 * 
 * Mensajes de error localizables y amigables para UIs
 */

export interface LocalizedError {
  code: string;
  message: string;
  userMessage: string; // Mensaje amigable para el usuario
  technicalMessage?: string; // Mensaje técnico para logs
  field?: string; // Campo relacionado (para validación)
  suggestions?: string[]; // Sugerencias para resolver el error
}

export const errorMessages: Record<string, LocalizedError> = {
  // Autenticación
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required',
    userMessage: 'Debes iniciar sesión para acceder a esta función',
    suggestions: ['Inicia sesión con tu cuenta', 'Verifica que tu sesión no haya expirado'],
  },
  AUTH_INVALID_TOKEN: {
    code: 'AUTH_INVALID_TOKEN',
    message: 'Invalid authentication token',
    userMessage: 'Tu sesión ha expirado o es inválida',
    suggestions: ['Cierra sesión y vuelve a iniciar sesión', 'Verifica tu conexión a internet'],
  },
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    userMessage: 'Correo electrónico o contraseña incorrectos',
    suggestions: ['Verifica que tu correo y contraseña sean correctos', 'Intenta recuperar tu contraseña'],
  },
  
  // Validación
  VALIDATION_REQUIRED: {
    code: 'VALIDATION_REQUIRED',
    message: 'Field is required',
    userMessage: 'Este campo es obligatorio',
  },
  VALIDATION_INVALID_EMAIL: {
    code: 'VALIDATION_INVALID_EMAIL',
    message: 'Invalid email format',
    userMessage: 'El formato del correo electrónico no es válido',
    suggestions: ['Verifica que el correo tenga el formato correcto (ej: usuario@dominio.com)'],
  },
  VALIDATION_INVALID_FORMAT: {
    code: 'VALIDATION_INVALID_FORMAT',
    message: 'Invalid format',
    userMessage: 'El formato de los datos no es válido',
  },
  VALIDATION_OUT_OF_RANGE: {
    code: 'VALIDATION_OUT_OF_RANGE',
    message: 'Value out of range',
    userMessage: 'El valor está fuera del rango permitido',
  },
  
  // Recursos
  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    message: 'Resource not found',
    userMessage: 'No se encontró el recurso solicitado',
    suggestions: ['Verifica que la URL sea correcta', 'El recurso puede haber sido eliminado'],
  },
  RESOURCE_ALREADY_EXISTS: {
    code: 'RESOURCE_ALREADY_EXISTS',
    message: 'Resource already exists',
    userMessage: 'Este recurso ya existe',
    suggestions: ['Intenta con un nombre o identificador diferente'],
  },
  RESOURCE_ACCESS_DENIED: {
    code: 'RESOURCE_ACCESS_DENIED',
    message: 'Access denied to resource',
    userMessage: 'No tienes permiso para acceder a este recurso',
    suggestions: ['Contacta al administrador si crees que esto es un error'],
  },
  
  // Operaciones
  OPERATION_FAILED: {
    code: 'OPERATION_FAILED',
    message: 'Operation failed',
    userMessage: 'La operación no pudo completarse',
    suggestions: ['Intenta nuevamente en unos momentos', 'Verifica tu conexión a internet'],
  },
  OPERATION_TIMEOUT: {
    code: 'OPERATION_TIMEOUT',
    message: 'Operation timeout',
    userMessage: 'La operación tardó demasiado tiempo',
    suggestions: ['Intenta nuevamente', 'Verifica tu conexión a internet'],
  },
  OPERATION_CONFLICT: {
    code: 'OPERATION_CONFLICT',
    message: 'Operation conflict',
    userMessage: 'Hay un conflicto con esta operación',
    suggestions: ['Refresca la página y vuelve a intentar'],
  },
  
  // Servidor
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    userMessage: 'Ocurrió un error en el servidor',
    technicalMessage: 'Internal server error',
    suggestions: ['Intenta nuevamente en unos momentos', 'Si el problema persiste, contacta al soporte'],
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service unavailable',
    userMessage: 'El servicio no está disponible en este momento',
    suggestions: ['Intenta nuevamente más tarde', 'Verifica el estado del servicio'],
  },
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded',
    userMessage: 'Has realizado demasiadas solicitudes. Por favor espera un momento',
    suggestions: ['Espera unos segundos antes de intentar nuevamente'],
  },
};

/**
 * Obtiene un mensaje de error localizado
 */
export function getLocalizedError(code: string, field?: string): LocalizedError {
  const error = errorMessages[code] || errorMessages.SERVER_ERROR;
  
  if (field && error.field === undefined) {
    return {
      ...error,
      field,
      userMessage: `${error.userMessage} (${field})`,
    };
  }
  
  return error;
}

/**
 * Formatea un error para respuesta API
 */
export function formatErrorResponse(
  code: string,
  field?: string,
  technicalDetails?: any
): {
  success: false;
  error: {
    code: string;
    message: string;
    userMessage: string;
    field?: string;
    suggestions?: string[];
    technicalDetails?: any;
  };
} {
  const localized = getLocalizedError(code, field);
  
  return {
    success: false,
    error: {
      code: localized.code,
      message: localized.message,
      userMessage: localized.userMessage,
      ...(localized.field && { field: localized.field }),
      ...(localized.suggestions && { suggestions: localized.suggestions }),
      ...(technicalDetails && { technicalDetails }),
    },
  };
}

/**
 * Traduce código de error a mensaje localizado (i18n)
 */
export function translateError(code: string, locale: string = 'es'): string {
  const error = errorMessages[code];
  if (!error) return errorMessages.SERVER_ERROR.userMessage;
  
  // Por ahora retornamos el mensaje en español
  // En el futuro se puede integrar con i18n
  return error.userMessage;
}

