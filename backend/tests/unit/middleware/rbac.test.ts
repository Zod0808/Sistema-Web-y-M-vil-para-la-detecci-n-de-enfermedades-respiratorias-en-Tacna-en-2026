import { requireRole, requirePermission } from '../../../src/middleware/rbac';

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as any;
};

const buildNext = () => jest.fn();

describe('rbac middleware', () => {
  describe('requireRole', () => {
    it('retorna 401 cuando no hay usuario en el request', () => {
      const middleware = requireRole('patient');
      const req: any = {};
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.status().json).toHaveBeenCalledWith({ success: false, message: 'No autenticado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('permite acceso cuando el rol cumple el mínimo requerido', () => {
      const middleware = requireRole('patient');
      const req: any = { user: { role: 'patient' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('permite acceso cuando el rol supera el mínimo (jerarquía)', () => {
      const middleware = requireRole('patient');
      const req: any = { user: { role: 'admin' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('permite acceso a doctor cuando se requiere doctor', () => {
      const middleware = requireRole('doctor');
      const req: any = { user: { role: 'doctor' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('permite acceso a admin cuando se requiere doctor', () => {
      const middleware = requireRole('doctor');
      const req: any = { user: { role: 'admin' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('retorna 403 cuando el rol es insuficiente', () => {
      const middleware = requireRole('doctor');
      const req: any = { user: { role: 'patient' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.status().json).toHaveBeenCalledWith({ success: false, message: 'Acceso denegado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 403 cuando paciente intenta acceder a ruta de admin', () => {
      const middleware = requireRole('admin');
      const req: any = { user: { role: 'patient' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 403 cuando doctor intenta acceder a ruta de admin', () => {
      const middleware = requireRole('admin');
      const req: any = { user: { role: 'doctor' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('retorna 401 cuando no hay usuario en el request', () => {
      const middleware = requirePermission('reports:read');
      const req: any = {};
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.status().json).toHaveBeenCalledWith({ success: false, message: 'No autenticado' });
    });

    it('permite acceso cuando el admin tiene todos los permisos', () => {
      const permisos = [
        'reports:read', 'reports:stats', 'reports:generate', 'reports:export',
        'dsr:export', 'dsr:delete', 'users:manage', 'alerts:manage',
        'analytics:admin', 'bi:export', 'integrations:manage',
      ];

      for (const permiso of permisos) {
        const middleware = requirePermission(permiso);
        const req: any = { user: { role: 'admin' } };
        const res = buildRes();
        const next = buildNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
      }
    });

    it('permite acceso a doctor con permisos de doctor', () => {
      const middleware = requirePermission('prescriptions:create');
      const req: any = { user: { role: 'doctor' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('permite acceso a paciente con permiso de lectura de recetas', () => {
      const middleware = requirePermission('prescriptions:read');
      const req: any = { user: { role: 'patient' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('retorna 403 cuando el paciente no tiene permiso de eliminar DSR', () => {
      const middleware = requirePermission('dsr:delete');
      const req: any = { user: { role: 'patient' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.status().json).toHaveBeenCalledWith({ success: false, message: 'Permiso insuficiente' });
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 403 cuando el doctor no tiene permiso de admin analytics', () => {
      const middleware = requirePermission('analytics:admin');
      const req: any = { user: { role: 'doctor' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 403 cuando el paciente no tiene permiso de gestión de usuarios', () => {
      const middleware = requirePermission('users:manage');
      const req: any = { user: { role: 'patient' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('trata rol desconocido como patient (sin permisos especiales)', () => {
      const middleware = requirePermission('dsr:delete');
      const req: any = { user: { role: 'unknown_role' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('permite al paciente crear citas propias', () => {
      const middleware = requirePermission('appointments:create');
      const req: any = { user: { role: 'patient' } };
      const res = buildRes();
      const next = buildNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});