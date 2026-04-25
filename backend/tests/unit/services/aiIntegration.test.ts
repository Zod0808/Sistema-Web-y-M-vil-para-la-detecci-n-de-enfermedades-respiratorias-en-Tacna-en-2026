import { AppError } from '../../../src/utils/AppError';

describe('AIIntegrationService', () => {
  let aiIntegrationService: typeof import('../../../src/services/aiIntegration').aiIntegrationService;
  let mockAxiosInstance: {
    interceptors: {
      request: { use: jest.Mock };
      response: { use: jest.Mock };
    };
    get: jest.Mock;
    post: jest.Mock;
  };
  let axiosCreateMock: jest.Mock;
  let loggerMock: {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  const loadModule = () => {
    jest.resetModules();

    mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      get: jest.fn(),
      post: jest.fn()
    };

    axiosCreateMock = jest.fn(() => mockAxiosInstance);

    jest.doMock('axios', () => ({
      create: axiosCreateMock
    }));

    loggerMock = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    jest.doMock('../../../src/utils/logger', () => ({
      logger: loggerMock
    }));

    jest.doMock('../../../src/config/config', () => ({
      config: {
        ai: {
          serviceUrl: 'http://mock-ai-service'
        }
      }
    }));

    jest.isolateModules(() => {
      ({ aiIntegrationService } = require('../../../src/services/aiIntegration'));
    });
  };

  beforeEach(() => {
    loadModule();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('configura axios con timeout y baseURL esperados', () => {
    expect(axiosCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://mock-ai-service',
        timeout: 30000,
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('checkHealth devuelve true cuando el servicio responde 200', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });

    const isHealthy = await aiIntegrationService.checkHealth();

    expect(isHealthy).toBe(true);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/health');
  });

  it('checkHealth devuelve false y registra error cuando la petición falla', async () => {
    const error = new Error('timeout');
    mockAxiosInstance.get.mockRejectedValueOnce(error);

    const isHealthy = await aiIntegrationService.checkHealth();

    expect(isHealthy).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith('AI Service Health Check Failed', error);
  });

  it('checkHealth maneja errores de timeout y desactiva la conexión', async () => {
    const timeoutError = Object.assign(new Error('timeout exceeded'), {
      code: 'ECONNABORTED'
    });
    mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

    const result = await aiIntegrationService.checkHealth();

    expect(result).toBe(false);
    expect((aiIntegrationService as any).isConnected).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith('AI Service Health Check Failed', timeoutError);
  });

  it('permite reintentar checkHealth tras un fallo previo', async () => {
    mockAxiosInstance.get
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ status: 200 });

    const firstAttempt = await aiIntegrationService.checkHealth();
    const secondAttempt = await aiIntegrationService.checkHealth();

    expect(firstAttempt).toBe(false);
    expect(secondAttempt).toBe(true);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    expect((aiIntegrationService as any).isConnected).toBe(true);
  });

  it('processMedicalHistory realiza chequeo de salud y retorna la respuesta procesada', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const aiResponse = {
      patient_id: 'patient-123',
      processed_at: '2024-01-01T00:00:00Z',
      entities: [],
      symptoms: [],
      diagnosis_suggestions: [],
      risk_factors: [],
      recommendations: [],
      confidence_score: 0.95,
      processing_time_ms: 120
    };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: aiResponse });

    const requestPayload = { patient_id: 'patient-123', text: 'Historia clínica' };

    const result = await aiIntegrationService.processMedicalHistory(requestPayload);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/health');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/medical-history/process',
      requestPayload
    );
    expect(result).toEqual(aiResponse);
  });

  it('processMedicalHistory traduce errores 503 a AppError específico', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const serviceError = {
      message: 'Service unavailable',
      response: { status: 503 }
    };
    mockAxiosInstance.post.mockRejectedValueOnce(serviceError);

    await expect(
      aiIntegrationService.processMedicalHistory({ patient_id: 'p1', text: '...' })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 503,
        message: 'Servicio de IA temporalmente no disponible'
      })
    );

    expect(loggerMock.error).toHaveBeenCalledWith('AI Medical History Processing Failed', {
      patientId: 'p1',
      error: serviceError.message
    });
  });

  it('processMedicalHistory lanza AppError cuando el servicio no está disponible tras reintento', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 503 });

    await expect(
      aiIntegrationService.processMedicalHistory({ patient_id: 'p2', text: '...' })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 500,
        message: 'Error interno del servicio de IA'
      })
    );

    expect(mockAxiosInstance.post).not.toHaveBeenCalled();
  });

  it('processMedicalHistory reutiliza conexión activa sin invocar checkHealth', async () => {
    (aiIntegrationService as any).isConnected = true;
    const aiResponse = { patient_id: 'p3', processed_at: 'now', entities: [], symptoms: [] };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: aiResponse });

    const result = await aiIntegrationService.processMedicalHistory({ patient_id: 'p3', text: '...' });

    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    expect(mockAxiosInstance.post).toHaveBeenCalled();
    expect(result).toEqual(aiResponse);
  });

  it('analyzeSymptomsML aplica valores por defecto y parámetros esperados', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const mlResponse = {
      disease: 'Influenza',
      confidence: 0.88,
      urgency_level: 'medium',
      timestamp: '2024-01-01T00:00:00Z'
    };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: mlResponse });

    const result = await aiIntegrationService.analyzeSymptomsML({
      symptoms: ['tos', 'fiebre']
    });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/ml-analyze',
      {
        symptoms: ['tos', 'fiebre'],
        patient_age: 35,
        risk_factors: [],
        include_explanation: true,
        apply_personalization: true
      },
      {
        params: {
          use_ensemble: 'true'
        }
      }
    );
    expect(result).toEqual(mlResponse);
  });

  it('getServiceStatus retorna estado y tiempo de respuesta cuando el servicio está disponible', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_045);

    const status = await aiIntegrationService.getServiceStatus();

    expect(status.connected).toBe(true);
    expect(status.responseTime).toBe(45);
    expect(status.lastCheck).toBeInstanceOf(Date);

    nowSpy.mockRestore();
  });

  it('getServiceStatus retorna desconectado y sin tiempo cuando checkHealth falla', async () => {
    mockAxiosInstance.get.mockRejectedValueOnce(new Error('network failure'));
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValueOnce(5_000).mockReturnValueOnce(5_150);

    const status = await aiIntegrationService.getServiceStatus();

    expect(status.connected).toBe(false);
    expect(status.responseTime).toBeUndefined();
    expect(status.lastCheck).toBeInstanceOf(Date);

    nowSpy.mockRestore();
  });

  it('processMedicalHistory lanza AppError 400 cuando la IA rechaza los datos', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const serviceError = {
      message: 'Invalid payload',
      response: { status: 400 }
    };
    mockAxiosInstance.post.mockRejectedValueOnce(serviceError);

    await expect(
      aiIntegrationService.processMedicalHistory({ patient_id: 'invalid', text: '---' })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 400,
        message: 'Datos de entrada inválidos para procesamiento de IA'
      })
    );

    expect(loggerMock.error).toHaveBeenCalledWith('AI Medical History Processing Failed', {
      patientId: 'invalid',
      error: serviceError.message
    });
  });

  it('interceptor de petición registra presencia o ausencia de payload', () => {
    const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];

    loggerMock.debug.mockClear();
    requestInterceptor({ method: 'post', url: '/ai', data: { foo: 'bar' } });
    expect(loggerMock.debug).toHaveBeenLastCalledWith(
      'AI Service Request',
      expect.objectContaining({
        method: 'POST',
        url: '/ai',
        data: 'Present'
      })
    );

    loggerMock.debug.mockClear();
    requestInterceptor({ method: 'get', url: '/ai' });
    expect(loggerMock.debug).toHaveBeenLastCalledWith(
      'AI Service Request',
      expect.objectContaining({
        method: 'GET',
        url: '/ai',
        data: 'None'
      })
    );
  });

  it('analyzeSymptoms procesa correctamente las solicitudes válidas', async () => {
    const requestPayload = {
      patient_id: 'sym-1',
      symptoms: [
        { symptom: 'tos', severity: 'moderate', duration: '3d' }
      ]
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const analysisResponse = {
      patient_id: 'sym-1',
      analyzed_at: '2024-03-01T00:00:00Z',
      urgency_level: 'low',
      severity_score: 0.25,
      classification: {
        urgency: 'low',
        severity_score: 0.25,
        recommendation: 'Descanso',
        categories: ['respiratorio'],
        confidence: 0.82
      },
      recommendations: ['Hidratación'],
      warning_signs: [],
      follow_up_required: false,
      confidence_score: 0.82,
      processing_time_ms: 85
    };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: analysisResponse });

    const result = await aiIntegrationService.analyzeSymptoms(requestPayload);

    expect(mockAxiosInstance.post).toHaveBeenLastCalledWith(
      '/api/v1/symptom-analyzer/analyze',
      requestPayload
    );
    expect(result).toEqual(analysisResponse);
  });

  it('analyzeSymptoms lanza AppError 503 cuando el servicio no está disponible', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const serviceError = { message: 'AI down', response: { status: 503 } };
    mockAxiosInstance.post.mockRejectedValueOnce(serviceError);

    await expect(
      aiIntegrationService.analyzeSymptoms({
        patient_id: 'sym-2',
        symptoms: [{ symptom: 'fiebre', severity: 'high', duration: '1d' }]
      })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 503,
        message: 'Servicio de IA temporalmente no disponible'
      })
    );
  });

  it('analyzeSymptoms lanza AppError 400 cuando los datos son inválidos', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const badRequest = { message: 'Bad request', response: { status: 400 } };
    mockAxiosInstance.post.mockRejectedValueOnce(badRequest);

    await expect(
      aiIntegrationService.analyzeSymptoms({
        patient_id: 'sym-3',
        symptoms: [{ symptom: 'dolor', severity: 'low', duration: '2d' }]
      })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 400,
        message: 'Datos de síntomas inválidos para análisis de IA'
      })
    );
  });

  it('analyzeSymptomsML lanza AppError 503 cuando el sistema ML falla', async () => {
    (aiIntegrationService as any).isConnected = true;
    const serviceError = { message: 'Service unavailable', response: { status: 503 } };
    mockAxiosInstance.post.mockRejectedValueOnce(serviceError);

    await expect(
      aiIntegrationService.analyzeSymptomsML({ symptoms: ['cansancio'] })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 503,
        message: 'Servicio de IA temporalmente no disponible'
      })
    );
  });

  it('analyzeSymptomsML lanza AppError 400 con datos inválidos', async () => {
    (aiIntegrationService as any).isConnected = true;
    const badRequest = { message: 'Invalid symptoms', response: { status: 400 } };
    mockAxiosInstance.post.mockRejectedValueOnce(badRequest);

    await expect(
      aiIntegrationService.analyzeSymptomsML({ symptoms: ['dolor de cabeza'] })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 400,
        message: 'Datos de síntomas inválidos para análisis ML'
      })
    );
  });

  it('getSymptomTrends devuelve tendencias utilizando el periodo por defecto', async () => {
    mockAxiosInstance.get
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ data: { trend_data: [1, 2, 3] } });

    const result = await aiIntegrationService.getSymptomTrends('patient-xyz');

    expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/symptom-analyzer/trends/patient-xyz?period=30d'
    );
    expect(result).toEqual({ trend_data: [1, 2, 3] });
  });

  it('getSymptomTrends lanza AppError 404 cuando no hay datos', async () => {
    mockAxiosInstance.get
      .mockResolvedValueOnce({ status: 200 })
      .mockRejectedValueOnce({ message: 'not found', response: { status: 404 } });

    await expect(aiIntegrationService.getSymptomTrends('patient-missing')).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 404,
        message: 'No se encontraron tendencias para el paciente'
      })
    );
  });

  it('getGeneralRecommendations retorna recomendaciones', async () => {
    (aiIntegrationService as any).isConnected = true;
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { tos: ['reposo'] } });

    const result = await aiIntegrationService.getGeneralRecommendations();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/symptom-analyzer/recommendations');
    expect(result).toEqual({ tos: ['reposo'] });
  });

  it('getGeneralRecommendations lanza AppError cuando la IA falla', async () => {
    (aiIntegrationService as any).isConnected = true;
    mockAxiosInstance.get.mockRejectedValueOnce(new Error('network error'));

    await expect(aiIntegrationService.getGeneralRecommendations()).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 500,
        message: 'Error al obtener recomendaciones generales'
      })
    );
  });

  it('searchMedicalHistories devuelve resultados de búsqueda', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    const histories = [{ patient_id: 'p1', diagnosis: 'asma' }];
    mockAxiosInstance.post.mockResolvedValueOnce({ data: histories });

    const result = await aiIntegrationService.searchMedicalHistories({ diagnosis: 'asma' });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/medical-history/search',
      { diagnosis: 'asma' }
    );
    expect(result).toEqual(histories);
  });

  it('searchMedicalHistories lanza AppError cuando la búsqueda falla', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
    mockAxiosInstance.post.mockRejectedValueOnce(new Error('timeout'));

    await expect(
      aiIntegrationService.searchMedicalHistories({ patient_id: 'p1' })
    ).rejects.toEqual(
      expect.objectContaining<AppError>({
        statusCode: 500,
        message: 'Error en búsqueda de historias médicas'
      })
    );
  });
});

