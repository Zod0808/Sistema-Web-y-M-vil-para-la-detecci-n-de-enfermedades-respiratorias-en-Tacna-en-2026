import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'refreshToken',
  'patientName',
  'address',
  'audioNotes',
  'description',
]);

function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(k)) {
      out[k] = 'REDACTED';
    } else if (v && typeof v === 'object') {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function hashPayload(obj: any): string {
  try {
    const json = JSON.stringify(obj);
    return crypto.createHash('sha256').update(json).digest('hex');
  } catch {
    return '';
  }
}

export function auditLogger(req: Request, res: Response, next: NextFunction) {
  const startHr = process.hrtime.bigint();
  const redacted = redact({ body: req.body, params: req.params, query: req.query });
  const payloadHash = hashPayload(redacted);
  const userId = (req as any).user?.id || (req as any).userId;
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
  const ua = req.get('user-agent') || '';

  res.on('finish', () => {
    const statusCode = res.statusCode;
    // Solo auditamos rutas API
    if (!route.startsWith('/api/')) return;
    AuditLog.create({
      userId,
      method: req.method,
      route,
      statusCode,
      ip,
      userAgent: ua,
      payloadHash,
      redactedPayload: redacted,
      createdAt: new Date()
    }).catch(() => {
      // Evitar romper el request por fallo de auditoría
    });
  });

  next();
}


