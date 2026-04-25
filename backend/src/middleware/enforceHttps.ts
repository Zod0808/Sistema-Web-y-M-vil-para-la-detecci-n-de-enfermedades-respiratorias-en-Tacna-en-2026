import { Request, Response, NextFunction } from 'express';

export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  // Permitir HTTP en desarrollo/local
  if (process.env.NODE_ENV !== 'production') return next();
  const proto = (req.headers['x-forwarded-proto'] as string) || '';
  if (proto.toLowerCase() !== 'https') {
    const host = req.headers.host;
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  next();
}


