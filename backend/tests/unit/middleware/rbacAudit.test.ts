import { auditRBAC, getRBACAuditReport, clearAuditLog } from '../../../src/middleware/rbacAudit';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const buildReq = (overrides: Partial<any> = {}): any => ({
  method: 'GET',
  path: '/test',
  route: { path: '/test' },
  ...overrides,
});

const buildRes = (): any => ({});

describe('rbacAudit middleware', () => {
  beforeEach(() => {
    clearAuditLog();
  });

  describe('auditRBAC', () => {
    it('llama a next()', () => {
      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      auditRBAC(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('registra entrada de auditoría cuando el usuario está autenticado', () => {
      const req = buildReq({ user: { _id: 'user-1', role: 'doctor' } });
      const res = buildRes();

      auditRBAC(req, res, jest.fn());

      const report = getRBACAuditReport();
      expect(report.total).toBe(1);
      expect(report.withAuth).toBe(1);
    });

    it('registra entrada de auditoría cuando no hay usuario', () => {
      const req = buildReq();
      const res = buildRes();

      auditRBAC(req, res, jest.fn());

      const report = getRBACAuditReport();
      expect(report.total).toBe(1);
      expect(report.withAuth).toBe(0);
    });

    it('registra el método HTTP correcto', () => {
      const req = buildReq({ method: 'POST', route: { path: '/api/patients' } });
      auditRBAC(req, buildRes(), jest.fn());

      const report = getRBACAuditReport();
      expect(report.total).toBe(1);
    });

    it('usa req.path cuando route no está disponible', () => {
      const req = buildReq({ route: undefined, path: '/fallback-path' });
      auditRBAC(req, buildRes(), jest.fn());

      const report = getRBACAuditReport();
      expect(report.total).toBe(1);
    });
  });

  describe('getRBACAuditReport', () => {
    it('retorna reporte vacío cuando no hay entradas', () => {
      const report = getRBACAuditReport();
      expect(report.total).toBe(0);
      expect(report.withAuth).toBe(0);
      expect(report.withRBAC).toBe(0);
      expect(report.unprotected).toEqual([]);
    });

    it('cuenta correctamente las entradas protegidas y no protegidas', () => {
      // 2 con auth, 1 sin auth
      auditRBAC(buildReq({ user: { _id: 'u1' } }), buildRes(), jest.fn());
      auditRBAC(buildReq({ user: { _id: 'u2' } }), buildRes(), jest.fn());
      auditRBAC(buildReq(), buildRes(), jest.fn());

      const report = getRBACAuditReport();
      expect(report.total).toBe(3);
      expect(report.withAuth).toBe(2);
      expect(report.unprotected).toHaveLength(1);
    });

    it('incluye ruta y método en las entradas no protegidas', () => {
      auditRBAC(
        buildReq({ method: 'DELETE', route: { path: '/admin/users' } }),
        buildRes(),
        jest.fn()
      );

      const report = getRBACAuditReport();
      expect(report.unprotected[0]).toEqual({ route: '/admin/users', method: 'DELETE' });
    });
  });

  describe('clearAuditLog', () => {
    it('limpia todas las entradas del log', () => {
      auditRBAC(buildReq(), buildRes(), jest.fn());
      auditRBAC(buildReq(), buildRes(), jest.fn());

      clearAuditLog();

      const report = getRBACAuditReport();
      expect(report.total).toBe(0);
    });
  });
});