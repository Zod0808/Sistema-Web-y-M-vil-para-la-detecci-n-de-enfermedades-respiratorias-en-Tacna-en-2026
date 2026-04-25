/**
 * Tests unitarios para Offline Queue (medical-app)
 * Cubre almacenamiento offline, sincronización y gestión de cola
 */

import { offlineQueue } from '../../medical-app/lib/services/offlineQueue';
import { createMedicalHistoryOffline } from '../../medical-app/lib/services/offlineOperations';
import { medicalHistoryService } from '../../medical-app/lib/api/services/medicalHistoryService';

// Solo mockear el servicio HTTP — offlineQueue y offlineOperations usan la implementación real
jest.mock('../../medical-app/lib/api/services/medicalHistoryService');
jest.mock('../../medical-app/lib/api/config', () => ({
  API_CONFIG: { baseURL: 'http://localhost:3001', aiServiceURL: 'http://localhost:8000', timeout: 30000, retries: 3, chatBaseURL: 'http://localhost:3001' },
  API_ENDPOINTS: {
    medicalHistories: { list: '/api/v1/medical-histories', create: '/api/v1/medical-histories', get: (id: string) => `/api/v1/medical-histories/${id}`, update: (id: string) => `/api/v1/medical-histories/${id}`, delete: (id: string) => `/api/v1/medical-histories/${id}`, sync: '/api/v1/medical-histories/sync', stats: '/api/v1/medical-histories/stats' },
  },
  getUser: jest.fn().mockReturnValue(null),
  setUser: jest.fn(),
  clearAuthTokens: jest.fn(),
  getAuthToken: jest.fn().mockReturnValue(null),
  getRefreshToken: jest.fn().mockReturnValue(null),
  setAuthTokens: jest.fn(),
}));

describe('OfflineQueue - operaciones básicas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    offlineQueue.clearAll();
  });

  it('agrega operación a la cola', () => {
    const operationId = offlineQueue.enqueue('create_medical_history', {
      patientId: 'p1',
      patientName: 'Test',
      age: 30,
      diagnosis: 'Dx',
      symptoms: [],
    });

    expect(operationId).toBeDefined();
    expect(offlineQueue.getPendingCount()).toBe(1);
  });

  it('obtiene estadísticas de la cola', () => {
    offlineQueue.enqueue('create_medical_history', {});
    const stats = offlineQueue.getStats();
    expect(stats.pending).toBeGreaterThan(0);
    expect(stats.total).toBeGreaterThan(0);
  });

  it('obtiene operaciones pendientes', () => {
    offlineQueue.enqueue('create_medical_history', {});
    const pending = offlineQueue.getPendingOperations();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].status).toBe('pending');
  });

  it('marca operación como completada', () => {
    const id = offlineQueue.enqueue('create_medical_history', {});
    offlineQueue.markAsCompleted(id);
    const stats = offlineQueue.getStats();
    expect(stats.completed).toBeGreaterThan(0);
  });

  it('marca operación como fallida después de MAX_RETRIES', () => {
    const id = offlineQueue.enqueue('create_medical_history', {});
    for (let i = 0; i < 3; i++) {
      offlineQueue.markAsFailed(id, 'Error de red');
    }
    const stats = offlineQueue.getStats();
    expect(stats.failed).toBeGreaterThan(0);
  });
});

describe('OfflineOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    offlineQueue.clearAll();
  });

  it('crea historia médica offline cuando no hay conexión', async () => {
    const historyData = {
      patientId: 'p1',
      patientName: 'Test',
      age: 30,
      diagnosis: 'Dx',
      symptoms: [],
    } as any;

    const result = await createMedicalHistoryOffline(historyData, false);

    expect(result.isOffline).toBe(true);
    expect(result.id).toBeDefined();
    expect(offlineQueue.getPendingCount()).toBe(1);
  });

  it('crea historia médica online cuando hay conexión', async () => {
    const historyData = {
      patientId: 'p1',
      patientName: 'Test',
      age: 30,
      diagnosis: 'Dx',
      symptoms: [],
    } as any;

    (medicalHistoryService.create as jest.Mock).mockResolvedValue({
      _id: 'history-123',
    });

    const result = await createMedicalHistoryOffline(historyData, true);

    expect(result.isOffline).toBe(false);
    expect(medicalHistoryService.create).toHaveBeenCalledWith(historyData);
  });
});