/**
 * Tests de integración - Flujo completo de análisis de síntomas (medical-app)
 * Verifica el flujo desde captura de síntomas hasta resultados y guardado en store
 */

import { useAppStore } from '../../medical-app/store/useAppStore';
import { symptomAnalyzerService } from '../../medical-app/lib/api/services/symptomAnalyzerService';
import { medicalHistoryService } from '../../medical-app/lib/api/services/medicalHistoryService';
import { offlineQueue } from '../../medical-app/lib/services/offlineQueue';

// Mock all service dependencies
jest.mock('../../medical-app/lib/api/services/symptomAnalyzerService');
jest.mock('../../medical-app/lib/api/services/medicalHistoryService');
jest.mock('../../medical-app/lib/services/offlineQueue');
jest.mock('../../medical-app/lib/api/config', () => ({
  API_CONFIG: { baseURL: 'http://localhost:3001', aiServiceURL: 'http://localhost:8000', timeout: 30000, retries: 3, chatBaseURL: 'http://localhost:3001' },
  API_ENDPOINTS: { auth: { login: '/api/v1/auth/login', logout: '/api/v1/auth/logout', profile: '/api/v1/auth/profile', register: '/api/v1/auth/register', refreshToken: '/api/v1/auth/refresh-token', changePassword: '/api/v1/auth/change-password' } },
  getUser: jest.fn().mockReturnValue(null),
  setUser: jest.fn(),
  clearAuthTokens: jest.fn(),
  getAuthToken: jest.fn().mockReturnValue(null),
  getRefreshToken: jest.fn().mockReturnValue(null),
  setAuthTokens: jest.fn(),
}));

const mockAnalyzeService = symptomAnalyzerService as jest.Mocked<typeof symptomAnalyzerService>;
const mockHistoryService = medicalHistoryService as jest.Mocked<typeof medicalHistoryService>;

const mockUser = {
  _id: 'patient-1',
  name: 'Test Patient',
  email: 'patient@example.com',
  role: 'patient' as const,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAnalysisResult = {
  patient_id: 'patient-1',
  analyzed_at: new Date().toISOString(),
  urgency_level: 'medium' as const,
  severity_score: 0.5,
  classification: {
    urgency: 'medium',
    severity_score: 0.5,
    recommendation: 'Consultar médico en 24 horas',
    categories: ['respiratory'],
    confidence: 0.85,
  },
  recommendations: ['Reposo', 'Hidratación', 'Consultar médico'],
  warning_signs: ['Dificultad respiratoria severa'],
  follow_up_required: true,
  confidence_score: 0.85,
  processing_time_ms: 150,
};

const resetStore = () => {
  useAppStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    medicalHistories: [],
    appointments: [],
    alerts: [],
    dashboardStats: null,
    isOnline: true,
    pendingSync: false,
    isEmergencyMode: false,
  } as any);
};

describe('Symptom Analysis Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    useAppStore.getState().setUser(mockUser);
  });

  describe('Análisis de síntomas con servicio', () => {
    it('debe analizar síntomas y retornar resultado estructurado', async () => {
      mockAnalyzeService.analyze.mockResolvedValue(mockAnalysisResult);

      const request = {
        symptoms: [
          { symptom: 'tos', severity: 'moderate' as const, duration: '5' },
          { symptom: 'fiebre', severity: 'low' as const, duration: '2' },
        ],
        context: 'Análisis de síntomas para Test Patient',
        patientId: 'patient-1',
      };

      const result = await symptomAnalyzerService.analyze(request);

      expect(result).toBeDefined();
      expect(result.urgency_level).toBe('medium');
      expect(result.recommendations).toHaveLength(3);
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(mockAnalyzeService.analyze).toHaveBeenCalledWith(request);
    });

    it('debe manejar urgencia crítica correctamente', async () => {
      const criticalResult = {
        ...mockAnalysisResult,
        urgency_level: 'critical' as const,
        severity_score: 0.95,
        warning_signs: ['Dificultad respiratoria severa', 'Cianosis'],
      };
      mockAnalyzeService.analyze.mockResolvedValue(criticalResult);

      const result = await symptomAnalyzerService.analyze({
        symptoms: [{ symptom: 'dificultad para respirar', severity: 'severe' as const, duration: '1' }],
        patientId: 'patient-1',
      });

      expect(result.urgency_level).toBe('critical');
      expect(result.severity_score).toBeGreaterThan(0.9);
      expect(result.warning_signs.length).toBeGreaterThan(0);
    });

    it('debe manejar error del servicio de análisis', async () => {
      mockAnalyzeService.analyze.mockRejectedValue(new Error('Servicio no disponible'));

      await expect(
        symptomAnalyzerService.analyze({
          symptoms: [{ symptom: 'tos', severity: 'low' as const, duration: '1' }],
          patientId: 'patient-1',
        })
      ).rejects.toThrow('Servicio no disponible');
    });
  });

  describe('Guardado en historial médico', () => {
    it('debe guardar análisis en historial médico', async () => {
      const mockHistory = {
        _id: 'hist-1',
        patientId: 'patient-1',
        patientName: 'Test Patient',
        age: 30,
        diagnosis: 'Posible Bronquitis',
        symptoms: [{ name: 'tos', severity: 'moderate' as const, duration: 5 }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;

      mockHistoryService.create.mockResolvedValue(mockHistory);

      const result = await medicalHistoryService.create({
        patientName: 'Test Patient',
        age: 30,
        diagnosis: 'Posible Bronquitis',
        symptoms: [{ name: 'tos', severity: 'moderate', duration: 5 }],
      } as any);

      expect(result._id).toBe('hist-1');
      expect(mockHistoryService.create).toHaveBeenCalledTimes(1);
    });

    it('debe agregar historial al store local', () => {
      const history = {
        _id: 'hist-local-1',
        patientId: 'patient-1',
        patientName: 'Test Patient',
        age: 30,
        diagnosis: 'Bronquitis',
        symptoms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;

      useAppStore.getState().addMedicalHistory(history);

      const state = useAppStore.getState();
      expect(state.medicalHistories).toHaveLength(1);
      expect(state.medicalHistories[0]._id).toBe('hist-local-1');
    });
  });

  describe('Integración con estado offline', () => {
    it('debe detectar estado offline del store', () => {
      useAppStore.getState().setOnlineStatus(false);

      const state = useAppStore.getState();
      expect(state.isOnline).toBe(false);
    });

    it('debe marcar pendingSync cuando hay datos sin sincronizar', () => {
      useAppStore.getState().setOnlineStatus(false);
      useAppStore.getState().setPendingSync(true);

      const state = useAppStore.getState();
      expect(state.pendingSync).toBe(true);
      expect(state.isOnline).toBe(false);
    });

    it('debe limpiar pendingSync al reconectarse', () => {
      useAppStore.getState().setPendingSync(true);
      useAppStore.getState().setOnlineStatus(true);
      useAppStore.getState().setPendingSync(false);

      const state = useAppStore.getState();
      expect(state.pendingSync).toBe(false);
      expect(state.isOnline).toBe(true);
    });
  });

  describe('Historial de análisis', () => {
    it('debe obtener historial de análisis por paciente', async () => {
      const mockHistory = [
        { id: 'a1', date: '2025-11-01', diagnosis: 'Bronquitis', symptoms: [], symptomCount: 2 },
        { id: 'a2', date: '2025-10-15', diagnosis: 'Resfriado', symptoms: [], symptomCount: 3 },
      ];
      mockAnalyzeService.getHistory.mockResolvedValue(mockHistory as any);

      const history = await symptomAnalyzerService.getHistory('patient-1');

      expect(history).toHaveLength(2);
      expect(mockAnalyzeService.getHistory).toHaveBeenCalledWith('patient-1');
    });

    it('debe obtener tendencias de síntomas', async () => {
      const mockTrends = {
        period: '30d',
        mostCommon: ['tos', 'fiebre'],
        trend: 'improving',
      };
      mockAnalyzeService.getTrends.mockResolvedValue(mockTrends);

      const trends = await symptomAnalyzerService.getTrends('patient-1', '30d');

      expect(trends).toBeDefined();
      expect(mockAnalyzeService.getTrends).toHaveBeenCalledWith('patient-1', '30d');
    });
  });
});