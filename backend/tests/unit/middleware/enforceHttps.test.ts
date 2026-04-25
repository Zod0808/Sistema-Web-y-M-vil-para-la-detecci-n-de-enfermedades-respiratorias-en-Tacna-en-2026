import { enforceHttps } from '../../../src/middleware/enforceHttps';

const buildReq = (overrides: Partial<any> = {}): any => ({
  headers: {},
  originalUrl: '/api/test',
  ...overrides,
});

const buildRes = () => {
  const redirect = jest.fn();
  return { redirect } as any;
};

describe('enforceHttps middleware', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('llama a next() en entorno de desarrollo', () => {
    process.env.NODE_ENV = 'development';
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    enforceHttps(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('llama a next() en entorno de test', () => {
    process.env.NODE_ENV = 'test';
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    enforceHttps(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirige a HTTPS en producción cuando la petición es HTTP', () => {
    process.env.NODE_ENV = 'production';
    const req = buildReq({
      headers: { 'x-forwarded-proto': 'http', host: 'example.com' },
      originalUrl: '/api/patients',
    });
    const res = buildRes();
    const next = jest.fn();

    enforceHttps(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/patients');
    expect(next).not.toHaveBeenCalled();
  });

  it('llama a next() en producción cuando la petición ya es HTTPS', () => {
    process.env.NODE_ENV = 'production';
    const req = buildReq({
      headers: { 'x-forwarded-proto': 'https', host: 'example.com' },
      originalUrl: '/api/patients',
    });
    const res = buildRes();
    const next = jest.fn();

    enforceHttps(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('es insensible a mayúsculas en x-forwarded-proto', () => {
    process.env.NODE_ENV = 'production';
    const req = buildReq({
      headers: { 'x-forwarded-proto': 'HTTPS', host: 'example.com' },
    });
    const res = buildRes();
    const next = jest.fn();

    enforceHttps(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirige cuando no hay header x-forwarded-proto en producción', () => {
    process.env.NODE_ENV = 'production';
    const req = buildReq({
      headers: { host: 'example.com' },
      originalUrl: '/api/data',
    });
    const res = buildRes();
    const next = jest.fn();

    enforceHttps(req, res, next);

    // Sin x-forwarded-proto, proto es vacío y no coincide con 'https'
    expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/data');
  });
});