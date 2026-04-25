import axios, { AxiosInstance } from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

/**
 * Servicio OAuth2 para integraciones externas
 * Soporta client credentials flow y mTLS (mutual TLS)
 */

export interface OAuth2Config {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  // mTLS configuration
  clientCertPath?: string;
  clientKeyPath?: string;
  caCertPath?: string;
  enableMTLS?: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

export class OAuth2Service {
  private config: OAuth2Config;
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private httpsAgent: https.Agent | null = null;

  constructor(config: OAuth2Config) {
    this.config = config;

    // Configurar mTLS si está habilitado
    if (this.config.enableMTLS && this.config.clientCertPath && this.config.clientKeyPath) {
      try {
        const clientCert = fs.readFileSync(this.config.clientCertPath);
        const clientKey = fs.readFileSync(this.config.clientKeyPath);
        const caCert = this.config.caCertPath ? fs.readFileSync(this.config.caCertPath) : undefined;

        this.httpsAgent = new https.Agent({
          cert: clientCert,
          key: clientKey,
          ca: caCert,
          rejectUnauthorized: caCert !== undefined,
        });

        logger.info('mTLS configurado para OAuth2', {
          tokenUrl: this.config.tokenUrl,
        });
      } catch (error: any) {
        logger.error(`Error al configurar mTLS: ${error.message}`, {
          error: error.message,
        });
        throw new AppError(`Error al configurar mTLS: ${error.message}`, 500);
      }
    }
  }

  /**
   * Obtener token de acceso (client credentials flow)
   */
  async getAccessToken(forceRefresh = false): Promise<string> {
    // Verificar caché
    if (!forceRefresh && this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      if (this.config.scope) {
        params.append('scope', this.config.scope);
      }

      const axiosConfig: any = {
        method: 'POST',
        url: this.config.tokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: params.toString(),
      };

      // Agregar mTLS agent si está configurado
      if (this.httpsAgent) {
        axiosConfig.httpsAgent = this.httpsAgent;
      }

      const response = await axios<TokenResponse>(axiosConfig);

      if (!response.data.access_token) {
        throw new AppError('Token de acceso no recibido', 500);
      }

      // Guardar en caché
      const expiresIn = response.data.expires_in || 3600; // Default 1 hora
      this.tokenCache = {
        token: response.data.access_token,
        expiresAt: Date.now() + (expiresIn * 1000) - 60000, // Refresh 1 minuto antes
      };

      logger.info('Token OAuth2 obtenido exitosamente', {
        tokenUrl: this.config.tokenUrl,
        expiresIn,
      });

      return response.data.access_token;
    } catch (error: any) {
      logger.error(`Error al obtener token OAuth2: ${error.message}`, {
        tokenUrl: this.config.tokenUrl,
        error: error.message,
      });
      throw new AppError(`Error al obtener token OAuth2: ${error.message}`, 500);
    }
  }

  /**
   * Crear cliente HTTP autenticado
   */
  async createAuthenticatedClient(baseURL: string): Promise<AxiosInstance> {
    const token = await this.getAccessToken();

    const config: any = {
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    // Agregar mTLS agent si está configurado
    if (this.httpsAgent) {
      config.httpsAgent = this.httpsAgent;
    }

    const client = axios.create(config);

    // Interceptor para refrescar token si expira
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado, refrescar
          const newToken = await this.getAccessToken(true);
          error.config.headers['Authorization'] = `Bearer ${newToken}`;
          return axios.request(error.config);
        }
        return Promise.reject(error);
      },
    );

    return client;
  }

  /**
   * Invalidar token (forzar refresh en próxima llamada)
   */
  invalidateToken(): void {
    this.tokenCache = null;
  }
}

/**
 * Factory para crear servicios OAuth2 según configuración
 */
export function createOAuth2Service(config: OAuth2Config): OAuth2Service {
  return new OAuth2Service(config);
}

