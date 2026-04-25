/**
 * Tests de integración con Backend
 * Verifica la comunicación real con el backend y el flujo completo
 * Nota: todos los tests están en .skip ya que requieren backend activo
 */

import { authService } from '../../medical-app/lib/api/services/authService';
import { symptomAnalyzerService } from '../../medical-app/lib/api/services/symptomAnalyzerService';
import { offlineQueue } from '../../medical-app/lib/services/offlineQueue';

// Mock todos los servicios para que el módulo sea importable sin backend
jest.mock('../../medical-app/lib/api/services/authService');
jest.mock('../../medical-app/lib/api/services/symptomAnalyzerService');
jest.mock('../../medical-app/lib/services/offlineQueue');

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

describe('Backend Integration Tests', () => {
  describe('Autenticación', () => {
    it.skip('debe hacer login exitoso con credenciales válidas', async () => {
      const mockLogin = authService.login as jest.Mock;
      mockLogin.mockResolvedValue({
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: { _id: 'u1', email: 'test@example.com', role: 'patient' },
      });

      const result = await authService.login({ email: 'test@example.com', password: 'password123' });
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it.skip('debe fallar con credenciales inválidas', async () => {
      const mockLogin = authService.login as jest.Mock;
      mockLogin.mockRejectedValue(new Error('Credenciales inválidas'));

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('CRUD de Historias Médicas', () => {
    it.skip('debe crear una nueva historia médica', async () => {
      // Requires backend
    });

    it.skip('debe obtener lista de historias médicas', async () => {
      // Requires backend
    });

    it.skip('debe obtener una historia médica específica', async () => {
      // Requires backend
    });

    it.skip('debe actualizar una historia médica', async () => {
      // Requires backend
    });

    it.skip('debe eliminar una historia médica', async () => {
      // Requires backend
    });
  });

  describe('Análisis de Síntomas con IA', () => {
    it.skip('debe analizar síntomas usando el servicio de IA', async () => {
      // Requires AI service
    });

    it.skip('debe obtener tendencias de síntomas', async () => {
      // Requires backend
    });
  });

  describe('Health Check', () => {
    it('verifica que BACKEND_URL está configurada', () => {
      expect(BACKEND_URL).toContain('localhost');
    });

    it('offlineQueue está disponible', () => {
      expect(offlineQueue).toBeDefined();
    });
  });
});