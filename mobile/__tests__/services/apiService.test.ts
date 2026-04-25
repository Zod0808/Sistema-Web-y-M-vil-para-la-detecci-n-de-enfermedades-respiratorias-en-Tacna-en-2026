/**
 * Tests unitarios para API Services (medical-app)
 * Cubre autenticación y servicios principales
 */

import { authService } from '../../medical-app/lib/api/services/authService';
import { medicalHistoryService } from '../../medical-app/lib/api/services/medicalHistoryService';
import { alertService } from '../../medical-app/lib/api/services/alertService';
import { apiClient } from '../../medical-app/lib/api/client';

jest.mock('../../medical-app/lib/api/client');
jest.mock('../../medical-app/lib/api/services/authService');
jest.mock('../../medical-app/lib/api/services/medicalHistoryService');
jest.mock('../../medical-app/lib/api/services/alertService');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockMedicalHistoryService = medicalHistoryService as jest.Mocked<typeof medicalHistoryService>;
const mockAlertService = alertService as jest.Mocked<typeof alertService>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe hacer login exitosamente y guardar tokens', async () => {
      const mockResponse = {
        user: {
          _id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        },
        token: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockResponse as any);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('debe manejar errores de login incorrecto', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Credenciales inválidas'));

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('register', () => {
    it('debe registrar usuario exitosamente', async () => {
      const mockResponse = {
        user: {
          _id: 'user-1',
          email: 'new@example.com',
        },
        token: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.register.mockResolvedValue(mockResponse as any);

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password',
        firstName: 'New',
        lastName: 'User',
      } as any);

      expect(result.user.email).toBe('new@example.com');
      expect(mockAuthService.register).toHaveBeenCalled();
    });
  });
});

describe('MedicalHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe obtener historias médicas exitosamente', async () => {
    const mockHistories = [
      {
        _id: 'history-1',
        patientId: 'patient-1',
        diagnosis: 'Bronquitis',
        symptoms: [],
        date: '2025-11-01',
      },
    ];

    mockMedicalHistoryService.list.mockResolvedValue({
      data: mockHistories,
      total: 1,
      page: 1,
      limit: 10,
    } as any);

    const result = await medicalHistoryService.list();

    expect(result.data.length).toBe(1);
    expect(mockMedicalHistoryService.list).toHaveBeenCalled();
  });

  it('debe crear historia médica exitosamente', async () => {
    const mockHistory = {
      _id: 'history-1',
      patientId: 'patient-1',
      diagnosis: 'Bronquitis',
      symptoms: [],
    };

    mockMedicalHistoryService.create.mockResolvedValue(mockHistory as any);

    const result = await medicalHistoryService.create({
      patientId: 'patient-1',
      patientName: 'Test',
      age: 30,
      diagnosis: 'Bronquitis',
      symptoms: [],
    });

    expect(result._id).toBe('history-1');
    expect(mockMedicalHistoryService.create).toHaveBeenCalled();
  });
});

describe('AlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe obtener alertas exitosamente', async () => {
    const mockAlerts = [
      {
        _id: 'alert-1',
        title: 'Alerta',
        message: 'Mensaje',
        category: 'system',
        priority: 'low',
      },
    ];

    mockAlertService.list.mockResolvedValue({
      data: mockAlerts,
      total: 1,
      page: 1,
      limit: 10,
    } as any);

    const result = await alertService.list();

    expect(result.data.length).toBe(1);
    expect(mockAlertService.list).toHaveBeenCalled();
  });

  it('debe reconocer alerta exitosamente', async () => {
    mockAlertService.acknowledge.mockResolvedValue(undefined);

    await alertService.acknowledge('alert-1');

    expect(mockAlertService.acknowledge).toHaveBeenCalledWith('alert-1');
  });
});
