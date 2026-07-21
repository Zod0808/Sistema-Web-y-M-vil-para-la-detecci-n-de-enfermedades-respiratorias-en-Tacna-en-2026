import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../types';

type Role = 'patient' | 'doctor' | 'admin';

const roleHierarchy: Record<Role, number> = {
  patient: 1,
  doctor: 2,
  admin: 3
};

export function requireRole(minRole: Role): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    const ok = roleHierarchy[user.role as Role] >= roleHierarchy[minRole];
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    next();
  };
}

// Permisos por acción; fácilmente extensible por módulo
const permissionsByRole: Record<Role, Set<string>> = {
  admin: new Set([
    'reports:read',
    'reports:stats',
    'reports:generate',
    'reports:export',
    'dsr:export',
    'dsr:delete',
    'users:manage',
    'alerts:manage',
    'prescriptions:validate',
    'prescriptions:create',
    'prescriptions:read',
    'prescriptions:update',
    'prescriptions:delete',
    'appointments:manage',
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:delete',
    'medical-histories:read',
    'medical-histories:create',
    'medical-histories:update',
    'medical-histories:delete',
    'analytics:read',
    'analytics:admin',
    'bi:export',
    'uploads:manage',
    'uploads:read',
    'uploads:delete',
    'fhir:read',
    'fhir:create',
    'fhir:update',
    'fhir:delete',
    'integrations:manage',
    'drugs:read',
  ]),
  doctor: new Set([
    'reports:read',
    'reports:export',
    'prescriptions:validate',
    'prescriptions:create',
    'prescriptions:read',
    'appointments:manage',
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'medical-histories:read',
    'medical-histories:create',
    'medical-histories:update',
    'analytics:read',
    'bi:export',
    'uploads:read',
    'fhir:read',
    'fhir:create',
    'fhir:update',
    'drugs:read',
  ]),
  patient: new Set([
    'prescriptions:read',
    'appointments:read',
    'appointments:create',
    'medical-histories:read',
    'medical-histories:create',
    'uploads:read',
    'lab:read',        // Ver sus propios resultados de laboratorio
    'referrals:read',  // Ver sus propios referidos
    'alerts:read',     // Ver sus propias alertas
    'fhir:read',       // Acceso FHIR para resultados de lab
  ])
};

export function requirePermission(permission: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    const role = (user.role || 'patient') as Role;
    const allowed = permissionsByRole[role]?.has(permission);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Permiso insuficiente' });
    }
    next();
  };
}


