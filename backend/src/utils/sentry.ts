/**
 * Sentry Error Tracking Integration
 * 
 * Configuración e inicialización de Sentry para tracking de errores
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

let isInitialized = false;

export const initSentry = (): void => {
  if (isInitialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const enabled = process.env.SENTRY_ENABLED === 'true';

  if (!enabled || !dsn) {
    console.log('Sentry disabled or DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      integrations: [
        new ProfilingIntegration(),
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }), // Se inicializa después
        new Sentry.Integrations.Mongo({ useMongoose: true }),
      ],
      // Performance Monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% en prod, 100% en dev
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      
      // Release tracking
      release: process.env.APP_VERSION || '1.0.0',
      
      // Before send hook para filtrar/redactar datos sensibles
      beforeSend(event, hint) {
        // Redactar información sensible
        if (event.request) {
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
          if (event.request.data) {
            // Redactar campos sensibles del body
            const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'jwt'];
            if (typeof event.request.data === 'object') {
              const redactSensitive = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return obj;
                const redacted = { ...obj };
                for (const key in redacted) {
                  if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    redacted[key] = '[REDACTED]';
                  } else if (typeof redacted[key] === 'object') {
                    redacted[key] = redactSensitive(redacted[key]);
                  }
                }
                return redacted;
              };
              event.request.data = redactSensitive(event.request.data);
            }
          }
        }
        return event;
      },
      
      // Ignorar ciertos errores
      ignoreErrors: [
        'NetworkError',
        'TimeoutError',
        'ECONNREFUSED',
        'ECONNRESET',
      ],
    });

    isInitialized = true;
    console.log('✅ Sentry initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
};

export const setSentryUser = (user: { id: string; email?: string; role?: string }): void => {
  if (!isInitialized) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    role: user.role,
  });
};

export const clearSentryUser = (): void => {
  if (!isInitialized) return;
  Sentry.setUser(null);
};

export const captureException = (error: Error, context?: Record<string, any>): void => {
  if (!isInitialized) return;
  
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void => {
  if (!isInitialized) return;
  
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
};

export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
  if (!isInitialized) return;
  Sentry.addBreadcrumb(breadcrumb);
};

export const startTransaction = (name: string, op: string = 'http.server'): Sentry.Transaction | undefined => {
  if (!isInitialized) return undefined;
  return Sentry.startTransaction({ name, op });
};

export { Sentry };
export default Sentry;

