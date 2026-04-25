import { OAuth2Service, createOAuth2Service } from '../../../src/services/oauth2Service';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-cert')),
}));

jest.mock('https', () => ({
  Agent: jest.fn().mockImplementation(() => ({})),
}));

// Mock axios at module level
const mockPost = jest.fn();
jest.mock('axios', () => {
  const axiosMock: any = jest.fn().mockImplementation(async (config: any) => {
    return mockPost(config);
  });
  axiosMock.create = jest.fn().mockReturnValue({ interceptors: { response: { use: jest.fn() } } });
  axiosMock.request = jest.fn();
  return axiosMock;
});

const axios = require('axios');

const buildConfig = (overrides: any = {}) => ({
  tokenUrl: 'https://auth.example.com/token',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scope: 'read write',
  ...overrides,
});

describe('OAuth2Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('obtiene token con client credentials flow', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'token-abc', token_type: 'Bearer', expires_in: 3600 },
      });

      const service = new OAuth2Service(buildConfig());
      const token = await service.getAccessToken();

      expect(token).toBe('token-abc');
      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://auth.example.com/token',
        })
      );
    });

    it('reutiliza token del caché si no ha expirado', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'cached-token', token_type: 'Bearer', expires_in: 3600 },
      });

      const service = new OAuth2Service(buildConfig());
      const token1 = await service.getAccessToken();
      const token2 = await service.getAccessToken();

      expect(token1).toBe(token2);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('fuerza refresh cuando forceRefresh=true', async () => {
      mockPost
        .mockResolvedValueOnce({ data: { access_token: 'token-1', token_type: 'Bearer', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { access_token: 'token-2', token_type: 'Bearer', expires_in: 3600 } });

      const service = new OAuth2Service(buildConfig());
      await service.getAccessToken();
      const newToken = await service.getAccessToken(true);

      expect(newToken).toBe('token-2');
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('lanza AppError 500 cuando no se recibe access_token', async () => {
      mockPost.mockResolvedValue({ data: { token_type: 'Bearer', expires_in: 3600 } });

      const service = new OAuth2Service(buildConfig());

      await expect(service.getAccessToken()).rejects.toMatchObject({ statusCode: 500 });
    });

    it('lanza AppError 500 cuando la petición HTTP falla', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const service = new OAuth2Service(buildConfig());

      await expect(service.getAccessToken()).rejects.toMatchObject({ statusCode: 500 });
    });

    it('incluye scope en los parámetros si está configurado', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'token', token_type: 'Bearer', expires_in: 3600 },
      });

      const service = new OAuth2Service(buildConfig({ scope: 'read write' }));
      await service.getAccessToken();

      const callArgs = mockPost.mock.calls[0][0];
      expect(callArgs.data).toContain('scope=read+write');
    });
  });

  describe('invalidateToken', () => {
    it('fuerza refetch en próxima llamada después de invalidar', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'token', token_type: 'Bearer', expires_in: 3600 },
      });

      const service = new OAuth2Service(buildConfig());
      await service.getAccessToken();
      service.invalidateToken();
      await service.getAccessToken();

      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('createAuthenticatedClient', () => {
    it('crea cliente HTTP con Authorization header', async () => {
      mockPost.mockResolvedValue({
        data: { access_token: 'token-xyz', token_type: 'Bearer', expires_in: 3600 },
      });
      axios.create.mockReturnValue({
        interceptors: { response: { use: jest.fn() } },
      });

      const service = new OAuth2Service(buildConfig());
      const client = await service.createAuthenticatedClient('https://api.example.com');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
          headers: expect.objectContaining({ Authorization: 'Bearer token-xyz' }),
        })
      );
      expect(client).toBeDefined();
    });
  });

  describe('mTLS configuration', () => {
    it('configura mTLS cuando está habilitado con cert y key', () => {
      const https = require('https');

      expect(() => {
        new OAuth2Service(buildConfig({
          enableMTLS: true,
          clientCertPath: '/path/to/cert.pem',
          clientKeyPath: '/path/to/key.pem',
        }));
      }).not.toThrow();

      expect(https.Agent).toHaveBeenCalled();
    });

    it('lanza AppError cuando falla la lectura del certificado', () => {
      const fs = require('fs');
      fs.readFileSync.mockImplementationOnce(() => {
        throw new Error('File not found');
      });

      expect(() => {
        new OAuth2Service(buildConfig({
          enableMTLS: true,
          clientCertPath: '/invalid/cert.pem',
          clientKeyPath: '/invalid/key.pem',
        }));
      }).toThrow();
    });
  });

  describe('createOAuth2Service factory', () => {
    it('crea instancia de OAuth2Service', () => {
      const service = createOAuth2Service(buildConfig());
      expect(service).toBeInstanceOf(OAuth2Service);
    });
  });
});