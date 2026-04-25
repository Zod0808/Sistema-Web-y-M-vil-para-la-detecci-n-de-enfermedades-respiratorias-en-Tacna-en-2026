/**
 * Tests de Estrés para Endpoints Críticos
 * 
 * Este archivo contiene escenarios de estrés para probar los límites del sistema
 * bajo condiciones extremas de carga.
 * 
 * Ejecución:
 * npm run test:stress
 * 
 * O con Jest directamente:
 * jest tests/stress/stress-scenarios.ts
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../src/config/config';

// Configuración
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_VERSION = '/api/v1';
const MAX_CONCURRENT_REQUESTS = 200;
const STRESS_TEST_DURATION_MS = 60000; // 1 minuto
const RAMP_UP_INTERVAL_MS = 1000; // Aumentar carga cada segundo

interface StressTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: Array<{ status?: number; message: string; count: number }>;
}

interface RequestMetrics {
  responseTime: number;
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * Clase para ejecutar tests de estrés
 */
class StressTester {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Autenticación para obtener token
   */
  async authenticate(): Promise<void> {
    try {
      const response = await this.axiosInstance.post(`${API_VERSION}/auth/login`, {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'Test123456!',
      });

      if (response.data.success && response.data.data?.token) {
        this.authToken = response.data.data.token;
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
      } else {
        throw new Error('No se pudo obtener token de autenticación');
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      throw error;
    }
  }

  /**
   * Ejecutar múltiples peticiones concurrentes
   */
  async executeConcurrentRequests(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    numRequests: number,
    requestData?: any
  ): Promise<RequestMetrics[]> {
    const requests: Promise<RequestMetrics>[] = [];

    for (let i = 0; i < numRequests; i++) {
      const request = this.executeRequest(endpoint, method, requestData);
      requests.push(request);
    }

    return Promise.all(requests);
  }

  /**
   * Ejecutar una petición individual
   */
  private async executeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<RequestMetrics> {
    const startTime = Date.now();

    try {
      let response;
      switch (method) {
        case 'GET':
          response = await this.axiosInstance.get(endpoint);
          break;
        case 'POST':
          response = await this.axiosInstance.post(endpoint, data);
          break;
        case 'PUT':
          response = await this.axiosInstance.put(endpoint, data);
          break;
        case 'DELETE':
          response = await this.axiosInstance.delete(endpoint);
          break;
      }

      const responseTime = Date.now() - startTime;
      return {
        responseTime,
        success: response.status >= 200 && response.status < 300,
        status: response.status,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;

      return {
        responseTime,
        success: false,
        status: axiosError.response?.status,
        error: axiosError.message,
      };
    }
  }

  /**
   * Calcular métricas de percentiles
   */
  private calculatePercentiles(responseTimes: number[], percentile: number): number {
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
  }

  /**
   * Analizar resultados de estrés
   */
  analyzeResults(endpoint: string, metrics: RequestMetrics[]): StressTestResult {
    const responseTimes = metrics.map((m) => m.responseTime);
    const successful = metrics.filter((m) => m.success);
    const failed = metrics.filter((m) => !m.success);

    // Agrupar errores
    const errorMap = new Map<string, number>();
    failed.forEach((m) => {
      const key = `${m.status || 'unknown'}:${m.error || 'unknown'}`;
      errorMap.set(key, (errorMap.get(key) || 0) + 1);
    });

    const errors = Array.from(errorMap.entries()).map(([key, count]) => {
      const [status, message] = key.split(':');
      return {
        status: status !== 'unknown' ? parseInt(status, 10) : undefined,
        message: message !== 'unknown' ? message : 'Error desconocido',
        count,
      };
    });

    return {
      endpoint,
      totalRequests: metrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: this.calculatePercentiles(responseTimes, 95),
      p99ResponseTime: this.calculatePercentiles(responseTimes, 99),
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      errors,
    };
  }

  /**
   * Test de estrés con ramp-up gradual
   */
  async stressTestWithRampUp(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    maxConcurrent: number,
    durationMs: number,
    requestData?: any
  ): Promise<StressTestResult> {
    const startTime = Date.now();
    const allMetrics: RequestMetrics[] = [];
    let currentConcurrent = 1;

    console.log(`Iniciando test de estrés para ${endpoint}...`);
    console.log(`Duración: ${durationMs}ms, Max concurrente: ${maxConcurrent}`);

    while (Date.now() - startTime < durationMs) {
      const batchSize = Math.min(currentConcurrent, maxConcurrent);
      const batchMetrics = await this.executeConcurrentRequests(
        endpoint,
        method,
        batchSize,
        requestData
      );

      allMetrics.push(...batchMetrics);

      // Ramp-up gradual
      if (currentConcurrent < maxConcurrent) {
        currentConcurrent = Math.min(currentConcurrent + 5, maxConcurrent);
      }

      // Pequeña pausa para evitar saturación inmediata
      await new Promise((resolve) => setTimeout(resolve, RAMP_UP_INTERVAL_MS));
    }

    return this.analyzeResults(endpoint, allMetrics);
  }
}

/**
 * Escenarios de estrés
 */
describe('Tests de Estrés - Endpoints Críticos', () => {
  let stressTester: StressTester;

  beforeAll(async () => {
    stressTester = new StressTester(BASE_URL);
    await stressTester.authenticate();
  }, 30000);

  describe('POST /api/v1/auth/login', () => {
    it('debe manejar carga alta de autenticaciones', async () => {
      const result = await stressTester.stressTestWithRampUp(
        `${API_VERSION}/auth/login`,
        'POST',
        100,
        STRESS_TEST_DURATION_MS,
        {
          email: 'test@example.com',
          password: 'Test123456!',
        }
      );

      console.log('Resultados de estrés para /auth/login:', JSON.stringify(result, null, 2));

      expect(result.successfulRequests).toBeGreaterThan(result.failedRequests);
      expect(result.averageResponseTime).toBeLessThan(2000); // Menos de 2 segundos en promedio
      expect(result.p95ResponseTime).toBeLessThan(3000); // P95 menos de 3 segundos
    }, 120000);
  });

  describe('GET /api/v1/medical-histories', () => {
    it('debe manejar carga alta de consultas de historias médicas', async () => {
      const result = await stressTester.stressTestWithRampUp(
        `${API_VERSION}/medical-histories`,
        'GET',
        MAX_CONCURRENT_REQUESTS,
        STRESS_TEST_DURATION_MS
      );

      console.log('Resultados de estrés para /medical-histories:', JSON.stringify(result, null, 2));

      expect(result.successfulRequests).toBeGreaterThan(result.failedRequests);
      expect(result.averageResponseTime).toBeLessThan(1000); // Menos de 1 segundo en promedio
      expect(result.p95ResponseTime).toBeLessThan(2000); // P95 menos de 2 segundos
    }, 120000);
  });

  describe('POST /api/v1/medical-histories', () => {
    it('debe manejar carga alta de creación de historias médicas', async () => {
      const medicalHistoryData = {
        patientName: 'Stress Test Patient',
        age: 30,
        gender: 'M',
        diagnosis: 'Bronquitis',
        symptoms: [
          { name: 'Tos', severity: 'moderate', duration: 3 },
        ],
        treatment: 'Reposo',
        date: new Date().toISOString(),
      };

      const result = await stressTester.stressTestWithRampUp(
        `${API_VERSION}/medical-histories`,
        'POST',
        50,
        STRESS_TEST_DURATION_MS,
        medicalHistoryData
      );

      console.log('Resultados de estrés para POST /medical-histories:', JSON.stringify(result, null, 2));

      expect(result.successfulRequests).toBeGreaterThan(result.failedRequests);
      expect(result.averageResponseTime).toBeLessThan(1500);
      expect(result.p95ResponseTime).toBeLessThan(3000);
    }, 120000);
  });

  describe('POST /api/v1/symptom-analyzer/analyze', () => {
    it('debe manejar carga de análisis de síntomas con IA', async () => {
      const symptomsData = {
        symptoms: [
          { name: 'Tos seca', severity: 'moderate', duration: 3 },
          { name: 'Fiebre', severity: 'mild', duration: 1 },
        ],
        patientId: 'test-patient-id',
      };

      const result = await stressTester.stressTestWithRampUp(
        `${API_VERSION}/symptom-analyzer/analyze`,
        'POST',
        20, // Menos concurrente porque es más pesado
        STRESS_TEST_DURATION_MS,
        symptomsData
      );

      console.log('Resultados de estrés para /symptom-analyzer/analyze:', JSON.stringify(result, null, 2));

      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(5000); // Menos de 5 segundos (análisis de IA)
      expect(result.p95ResponseTime).toBeLessThan(10000); // P95 menos de 10 segundos
    }, 120000);
  });

  describe('GET /api/v1/dashboard', () => {
    it('debe manejar carga alta de consultas al dashboard', async () => {
      const result = await stressTester.stressTestWithRampUp(
        `${API_VERSION}/dashboard`,
        'GET',
        MAX_CONCURRENT_REQUESTS,
        STRESS_TEST_DURATION_MS
      );

      console.log('Resultados de estrés para /dashboard:', JSON.stringify(result, null, 2));

      expect(result.successfulRequests).toBeGreaterThan(result.failedRequests);
      expect(result.averageResponseTime).toBeLessThan(2000);
      expect(result.p95ResponseTime).toBeLessThan(4000);
    }, 120000);
  });

  describe('GET /api/v1/alerts', () => {
    it('debe manejar carga alta de consultas de alertas', async () => {
      const result = await stressTester.stressTestWithRampUp(
        `${API_VERSION}/alerts`,
        'GET',
        MAX_CONCURRENT_REQUESTS,
        STRESS_TEST_DURATION_MS
      );

      console.log('Resultados de estrés para /alerts:', JSON.stringify(result, null, 2));

      expect(result.successfulRequests).toBeGreaterThan(result.failedRequests);
      expect(result.averageResponseTime).toBeLessThan(1000);
      expect(result.p95ResponseTime).toBeLessThan(2000);
    }, 120000);
  });

  describe('Test de saturación completa', () => {
    it('debe mantener estabilidad bajo saturación extrema', async () => {
      const endpoints = [
        { path: `${API_VERSION}/medical-histories`, method: 'GET' as const },
        { path: `${API_VERSION}/dashboard`, method: 'GET' as const },
        { path: `${API_VERSION}/alerts`, method: 'GET' as const },
      ];

      const results = await Promise.all(
        endpoints.map((endpoint) =>
          stressTester.stressTestWithRampUp(
            endpoint.path,
            endpoint.method,
            50,
            STRESS_TEST_DURATION_MS
          )
        )
      );

      results.forEach((result) => {
        console.log(`Resultados para ${result.endpoint}:`, JSON.stringify(result, null, 2));
        expect(result.successfulRequests).toBeGreaterThan(0);
        expect(result.failedRequests / result.totalRequests).toBeLessThan(0.5); // Menos del 50% de errores
      });
    }, 180000);
  });
});

