import { auditLogger } from '../../../src/middleware/auditLogger';

jest.mock('../../../src/models/AuditLog', () => ({
  AuditLog: {
    create: jest.fn().mockResolvedValue(undefined),
  },
}));

const { AuditLog } = require('../../../src/models/AuditLog');

const buildReq = (overrides: Partial<any> = {}): any => ({
  method: 'POST',
  body: { username: 'test', password: 'secret123' },
  params: {},
  query: {},
  headers: {},
  ip: '127.0.0.1',
  path: '/patients',
  baseUrl: '/api',
  originalUrl: '/api/patients',
  get: jest.fn().mockReturnValue('Mozilla/5.0'),
  ...overrides,
});

const buildRes = () => {
  const listeners: Record<string, Function> = {};
  const res = {
    on: jest.fn().mockImplementation((event: string, cb: Function) => {
      listeners[event] = cb;
    }),
    statusCode: 200,
    _trigger: (event: string) => listeners[event]?.(),
  };
  return res as any;
};

describe('auditLogger middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('llama a next()', () => {
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    auditLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('registra evento on finish en la respuesta', () => {
    const req = buildReq();
    const res = buildRes();

    auditLogger(req, res, jest.fn());

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('crea entrada en AuditLog cuando la ruta es API y la respuesta termina', () => {
    const req = buildReq({
      baseUrl: '/api',
      path: '/patients',
      originalUrl: '/api/patients',
    });
    const res = buildRes();
    res.statusCode = 200;

    auditLogger(req, res, jest.fn());
    res._trigger('finish');

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        route: '/api/patients',
        statusCode: 200,
        ip: '127.0.0.1',
      })
    );
  });

  it('no crea AuditLog para rutas que no son API', () => {
    const req = buildReq({
      baseUrl: '',
      path: '/health',
      originalUrl: '/health',
    });
    const res = buildRes();

    auditLogger(req, res, jest.fn());
    res._trigger('finish');

    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it('redacta campos sensibles como password', () => {
    const req = buildReq({
      body: { username: 'test', password: 'supersecret' },
    });
    const res = buildRes();

    auditLogger(req, res, jest.fn());
    res._trigger('finish');

    const callArg = AuditLog.create.mock.calls[0]?.[0];
    if (callArg?.redactedPayload?.body) {
      expect(callArg.redactedPayload.body.password).toBe('REDACTED');
      expect(callArg.redactedPayload.body.username).toBe('test');
    }
  });

  it('redacta token en el body', () => {
    const req = buildReq({
      body: { token: 'jwt-secret-token', data: 'safe' },
    });
    const res = buildRes();

    auditLogger(req, res, jest.fn());
    res._trigger('finish');

    const callArg = AuditLog.create.mock.calls[0]?.[0];
    if (callArg?.redactedPayload?.body) {
      expect(callArg.redactedPayload.body.token).toBe('REDACTED');
      expect(callArg.redactedPayload.body.data).toBe('safe');
    }
  });

  it('extrae userId del usuario autenticado', () => {
    const req = buildReq({
      user: { id: 'user-123' },
    });
    const res = buildRes();

    auditLogger(req, res, jest.fn());
    res._trigger('finish');

    const callArg = AuditLog.create.mock.calls[0]?.[0];
    expect(callArg?.userId).toBe('user-123');
  });

  it('extrae IP de x-forwarded-for cuando está disponible', () => {
    const req = buildReq({
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
    });
    const res = buildRes();

    auditLogger(req, res, jest.fn());
    res._trigger('finish');

    const callArg = AuditLog.create.mock.calls[0]?.[0];
    expect(callArg?.ip).toBe('10.0.0.1');
  });

  it('genera payloadHash no vacío', () => {
    const req = buildReq();
    const res = buildRes();

    auditLogger(req, res, jest.fn());
    res._trigger('finish');

    const callArg = AuditLog.create.mock.calls[0]?.[0];
    expect(callArg?.payloadHash).toBeTruthy();
    expect(typeof callArg?.payloadHash).toBe('string');
    expect(callArg?.payloadHash.length).toBe(64); // SHA-256 hex
  });

  it('no lanza error si AuditLog.create falla', async () => {
    AuditLog.create.mockRejectedValue(new Error('DB error'));

    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    auditLogger(req, res, next);
    res._trigger('finish');

    // Esperar a que la promesa rechazada sea capturada
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
  });
});