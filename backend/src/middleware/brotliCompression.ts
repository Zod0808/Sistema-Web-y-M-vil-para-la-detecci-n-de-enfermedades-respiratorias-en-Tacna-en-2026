import { NextFunction, Request, Response } from 'express';
import { brotliCompressSync, constants } from 'zlib';

interface BrotliOptions {
  threshold?: number;
}

const DEFAULT_THRESHOLD = 1024; // 1KB

export const brotliCompression = (options: BrotliOptions = {}) => {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  return (req: Request, res: Response, next: NextFunction): void => {
    const acceptEncoding = req.headers['accept-encoding'] || '';

    const disableCompression = req.headers['x-no-compression'];
    if (typeof disableCompression !== 'undefined' && disableCompression !== 'false') {
      res.setHeader('X-No-Compression', 'true');
      return next();
    }

    if (!acceptEncoding.toString().includes('br')) {
      return next();
    }

    const originalSend = res.send.bind(res);

    res.send = (body?: any): Response => {
      if (res.headersSent) {
        return originalSend(body);
      }

      const contentEncoding = res.getHeader('Content-Encoding');
      if (contentEncoding && contentEncoding !== 'identity') {
        return originalSend(body);
      }

      let buffer: Buffer;

      if (Buffer.isBuffer(body)) {
        buffer = body;
      } else if (typeof body === 'string') {
        buffer = Buffer.from(body, 'utf-8');
      } else if (body !== undefined) {
        buffer = Buffer.from(JSON.stringify(body));
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
      } else {
        buffer = Buffer.alloc(0);
      }

      if (buffer.length < threshold) {
        return originalSend(body);
      }

      try {
        const compressed = brotliCompressSync(buffer, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 5,
            [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT
          }
        });

        res.removeHeader('Content-Length');
        res.setHeader('Content-Encoding', 'br');
        res.setHeader('Vary', 'Accept-Encoding');

        return originalSend(compressed);
      } catch (error) {
        res.setHeader('X-Brotli-Error', 'true');
        return originalSend(body);
      }
    };

    next();
  };
};

