// Servicio de Tokens - Capa de Aplicación
export interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface TokenService {
  generateToken(userId: string): string;
  generateRefreshToken(userId: string): string;
  verifyToken(token: string): TokenPayload | null;
  verifyRefreshToken(refreshToken: string): TokenPayload | null;
}

export class JWTTokenService implements TokenService {
  private readonly secret: string;
  private readonly refreshSecret: string;
  private readonly expiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    secret: string,
    refreshSecret: string,
    expiresIn: string = '7d',
    refreshExpiresIn: string = '30d'
  ) {
    this.secret = secret;
    this.refreshSecret = refreshSecret;
    this.expiresIn = expiresIn;
    this.refreshExpiresIn = refreshExpiresIn;
  }

  generateToken(userId: string): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId }, this.secret, { expiresIn: this.expiresIn });
  }

  generateRefreshToken(userId: string): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId }, this.refreshSecret, { expiresIn: this.refreshExpiresIn });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(refreshToken: string): TokenPayload | null {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
