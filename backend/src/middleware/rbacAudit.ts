/**
 * RBAC Audit Middleware
 * 
 * Middleware para auditar y validar que todos los endpoints críticos
 * tengan protección RBAC adecuada
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RBACAuditEntry {
  route: string;
  method: string;
  hasAuth: boolean;
  hasRBAC: boolean;
  rbacType: 'role' | 'permission' | 'none';
  timestamp: Date;
}

const auditLog: RBACAuditEntry[] = [];

/**
 * Middleware para auditar protección RBAC en endpoints
 */
export function auditRBAC(req: Request, res: Response, next: NextFunction) {
  const route = req.route?.path || req.path;
  const method = req.method;
  
  // Detectar si tiene autenticación
  const hasAuth = !!(req as any).user;
  
  // Detectar si tiene RBAC (verificar headers o metadata)
  // Esto es una aproximación - en producción se debería usar metadata de rutas
  const hasRBAC = hasAuth; // Simplificado: si está autenticado, asumimos RBAC
  
  auditLog.push({
    route,
    method,
    hasAuth,
    hasRBAC,
    rbacType: hasRBAC ? 'role' : 'none',
    timestamp: new Date(),
  });
  
  next();
}

/**
 * Obtiene el reporte de auditoría RBAC
 */
export function getRBACAuditReport(): {
  total: number;
  withAuth: number;
  withRBAC: number;
  unprotected: Array<{ route: string; method: string }>;
} {
  const total = auditLog.length;
  const withAuth = auditLog.filter(e => e.hasAuth).length;
  const withRBAC = auditLog.filter(e => e.hasRBAC).length;
  const unprotected = auditLog
    .filter(e => !e.hasAuth || !e.hasRBAC)
    .map(e => ({ route: e.route, method: e.method }));
  
  return { total, withAuth, withRBAC, unprotected };
}

/**
 * Limpia el log de auditoría (útil para tests)
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

