/**
 * Tests for brotliCompression middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { brotliDecompressSync } from 'zlib';

type MockResponse = Response & {
  body?: any;
  headers?: Record<string, any>;
  statusCode?: number;
};

const createMockResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {
    headersSent: false,
    headers: {},
    statusCode: 200,
    setHeader: jest.fn(function (this: MockResponse, key: string, value: any) {
      this.headers![key] = value;
    }),
    getHeader: jest.fn(function (this: MockResponse, key: string) {
      return this.headers![key];
    }),
    removeHeader: jest.fn(function (this: MockResponse, key: string) {
      delete this.headers![key];
    }),
    status: jest.fn(function (this: MockResponse, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (this: MockResponse, payload: unknown) {
      this.body = payload;
      return this;
    }),
    send: jest.fn(function (this: MockResponse, payload?: any) {
      this.body = payload;
      return this;
    })
  };

  return res as MockResponse;
};

const createNext = (): NextFunction => jest.fn();

describe('brotliCompression middleware', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('compresses responses when Accept-Encoding includes br and body exceeds threshold', () => {
    jest.isolateModules(() => {
      const { brotliCompression } = require('../../../src/middleware/brotliCompression') as typeof import('../../../src/middleware/brotliCompression');

      const req = {
        headers: {
          'accept-encoding': 'gzip, deflate, br'
        }
      } as Request;
      const res = createMockResponse();
      const next = createNext();

      const middleware = brotliCompression({ threshold: 32 });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      const payload = 'RespiCare compression payload '.repeat(5); // > threshold
      res.send(payload);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'br');
      expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Encoding');
      expect(Buffer.isBuffer(res.body)).toBe(true);

      const decompressed = brotliDecompressSync(res.body);
      expect(decompressed.toString()).toBe(payload);
    });
  });

  it('bypasses compression when Accept-Encoding does not include br', () => {
    jest.isolateModules(() => {
      const { brotliCompression } = require('../../../src/middleware/brotliCompression') as typeof import('../../../src/middleware/brotliCompression');

      const req = {
        headers: {
          'accept-encoding': 'gzip, deflate'
        }
      } as Request;
      const res = createMockResponse();
      const originalSend = res.send;
      const next = createNext();

      const middleware = brotliCompression();
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.send).toBe(originalSend);

      const payload = 'Short payload';
      res.send(payload);

      expect(res.getHeader('Content-Encoding')).toBeUndefined();
      expect(res.body).toBe(payload);
    });
  });

  it('does not compress bodies below threshold', () => {
    jest.isolateModules(() => {
      const { brotliCompression } = require('../../../src/middleware/brotliCompression') as typeof import('../../../src/middleware/brotliCompression');

      const req = {
        headers: {
          'accept-encoding': 'br'
        }
      } as Request;
      const res = createMockResponse();
      const next = createNext();

      const middleware = brotliCompression({ threshold: 1024 });
      middleware(req, res, next);

      const smallPayload = 'tiny payload';
      res.send(smallPayload);

      expect(res.getHeader('Content-Encoding')).toBeUndefined();
      expect(res.body).toBe(smallPayload);
    });
  });

  it('falls back gracefully when brotli compression fails', () => {
    jest.isolateModules(() => {
      jest.doMock('zlib', () => ({
        brotliCompressSync: jest.fn(() => {
          throw new Error('Compression failure');
        }),
        constants: {
          BROTLI_PARAM_QUALITY: 4,
          BROTLI_PARAM_MODE: 0,
          BROTLI_MODE_TEXT: 0
        }
      }));

      const { brotliCompression } = require('../../../src/middleware/brotliCompression') as typeof import('../../../src/middleware/brotliCompression');

      const req = {
        headers: {
          'accept-encoding': 'br'
        }
      } as Request;
      const res = createMockResponse();
      const next = createNext();

      const middleware = brotliCompression({ threshold: 1 });
      middleware(req, res, next);

      const payload = 'fallback payload';
      res.send(payload);

      expect(res.setHeader).toHaveBeenCalledWith('X-Brotli-Error', 'true');
      expect(res.getHeader('Content-Encoding')).toBeUndefined();
      expect(res.body).toBe(payload);
    });
  });

  it('respeta la cabecera X-No-Compression y preserva el payload original', () => {
    jest.isolateModules(() => {
      const { brotliCompression } = require('../../../src/middleware/brotliCompression') as typeof import('../../../src/middleware/brotliCompression');

      const req = {
        headers: {
          'accept-encoding': 'gzip, br',
          'x-no-compression': 'true'
        }
      } as Request;
      const res = createMockResponse();
      const originalSend = res.send;
      const next = createNext();

      const middleware = brotliCompression({ threshold: 1 });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.send).toBe(originalSend);

      const payload = 'payload sin compresión';
      res.send(payload);

      expect(res.getHeader('Content-Encoding')).toBeUndefined();
      expect(res.body).toBe(payload);
      expect(res.getHeader('X-No-Compression')).toBe('true');
    });
  });
});

