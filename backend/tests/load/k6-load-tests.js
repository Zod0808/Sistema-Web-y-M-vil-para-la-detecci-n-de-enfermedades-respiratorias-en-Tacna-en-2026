/**
 * Tests de Carga con K6 para RespiCare Backend
 * 
 * Este script prueba la capacidad del backend bajo diferentes niveles de carga.
 * 
 * Instalación de K6:
 * - Windows: choco install k6
 * - macOS: brew install k6
 * - Linux: https://k6.io/docs/getting-started/installation/
 * 
 * Ejecución:
 * k6 run tests/load/k6-load-tests.js
 * 
 * Con opciones:
 * k6 run --vus 50 --duration 2m tests/load/k6-load-tests.js
 * k6 run --stage 30s:100,1m:200,30s:0 tests/load/k6-load-tests.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Configuración base
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp-up: 10 usuarios en 30s
    { duration: '1m', target: 50 },    // Carga normal: 50 usuarios
    { duration: '30s', target: 100 },  // Ramp-up: 100 usuarios
    { duration: '2m', target: 100 },    // Carga alta: 100 usuarios
    { duration: '30s', target: 50 },    // Ramp-down: 50 usuarios
    { duration: '30s', target: 0 },     // Ramp-down: 0 usuarios
  ],
  thresholds: {
    // 95% de las peticiones deben completarse en menos de 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Menos del 1% de errores
    http_req_failed: ['rate<0.01'],
    // Más del 99% de checks deben pasar
    checks: ['rate>0.99'],
  },
};

// Variables de entorno (pueden ser sobrescritas con --env)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_VERSION = '/api/v1';

// Métricas personalizadas
const loginDuration = new Trend('login_duration');
const registerDuration = new Trend('register_duration');
const medicalHistoryDuration = new Trend('medical_history_duration');
const symptomAnalyzerDuration = new Trend('symptom_analyzer_duration');
const dashboardDuration = new Trend('dashboard_duration');
const errorRate = new Rate('errors');
const requestCounter = new Counter('total_requests');

// Datos de prueba
const testUsers = [
  { email: 'test1@example.com', password: 'Test123456!' },
  { email: 'test2@example.com', password: 'Test123456!' },
  { email: 'test3@example.com', password: 'Test123456!' },
];

// Función para verificar conectividad del backend
function checkBackendHealth() {
  const healthUrl = `${BASE_URL}/health`;
  try {
    const healthResponse = http.get(healthUrl, { timeout: '5s' });
    return healthResponse.status === 200;
  } catch (error) {
    console.error(`[ERROR] No se puede conectar al backend en ${BASE_URL}`);
    console.error(`[ERROR] Asegúrate de que el backend esté corriendo: npm run dev`);
    return false;
  }
}

// Función para obtener token de autenticación
function getAuthToken(user) {
  const loginUrl = `${BASE_URL}${API_VERSION}/auth/login`;
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  };

  const loginResponse = http.post(loginUrl, loginPayload, loginParams);
  
  // Verificar si hay error de conexión
  if (loginResponse.status === 0) {
    console.error(`[ERROR] No se pudo conectar a ${loginUrl}`);
    console.error(`[ERROR] Verifica que el backend esté corriendo en ${BASE_URL}`);
    errorRate.add(1);
    return null;
  }

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data && body.data.token;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    // Log del error para debugging
    if (loginResponse.status !== 200) {
      console.error(`[ERROR] Login falló con status ${loginResponse.status}`);
      console.error(`[ERROR] Response: ${loginResponse.body.substring(0, 200)}`);
    }
    errorRate.add(1);
    return null;
  }

  try {
    const body = JSON.parse(loginResponse.body);
    loginDuration.add(loginResponse.timings.duration);
    return body.data.token;
  } catch (e) {
    console.error(`[ERROR] Error parseando respuesta de login: ${e.message}`);
    errorRate.add(1);
    return null;
  }
}

// Función para registrar un nuevo usuario
function registerUser() {
  const registerUrl = `${BASE_URL}${API_VERSION}/auth/register`;
  const timestamp = Date.now();
  const userData = {
    email: `loadtest_${timestamp}@example.com`,
    password: 'Test123456!',
    firstName: 'Load',
    lastName: 'Test',
    role: 'patient',
  };

  const registerParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const registerResponse = http.post(registerUrl, JSON.stringify(userData), registerParams);
  const registerSuccess = check(registerResponse, {
    'register status is 201': (r) => r.status === 201,
    'register returns user': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && body.data && body.data.user;
    },
  });

  if (!registerSuccess) {
    errorRate.add(1);
    return null;
  }

  registerDuration.add(registerResponse.timings.duration);
  const body = JSON.parse(registerResponse.body);
  return body.data.token;
}

// Función para crear una historia médica
function createMedicalHistory(token) {
  const medicalHistoryUrl = `${BASE_URL}${API_VERSION}/medical-histories`;
  const medicalHistoryData = {
    patientName: 'Test Patient',
    age: 30,
    gender: 'M',
    diagnosis: 'Bronquitis',
    symptoms: [
      { name: 'Tos', severity: 'moderate', duration: 3 },
      { name: 'Fiebre', severity: 'mild', duration: 1 },
    ],
    treatment: 'Reposo y medicación',
    date: new Date().toISOString(),
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = http.post(medicalHistoryUrl, JSON.stringify(medicalHistoryData), params);
  const success = check(response, {
    'medical history status is 201': (r) => r.status === 201,
    'medical history created': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && body.data && body.data._id;
    },
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  medicalHistoryDuration.add(response.timings.duration);
  const body = JSON.parse(response.body);
  return body.data._id;
}

// Función para obtener historias médicas
function getMedicalHistories(token) {
  const medicalHistoryUrl = `${BASE_URL}${API_VERSION}/medical-histories`;
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = http.get(medicalHistoryUrl, params);
  const success = check(response, {
    'get medical histories status is 200': (r) => r.status === 200,
    'medical histories returned': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && Array.isArray(body.data);
    },
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  medicalHistoryDuration.add(response.timings.duration);
  return true;
}

// Función para analizar síntomas
function analyzeSymptoms(token) {
  const analyzeUrl = `${BASE_URL}${API_VERSION}/symptom-analyzer/analyze`;
  const symptomsData = {
    symptoms: [
      { name: 'Tos seca', severity: 'moderate', duration: 3 },
      { name: 'Fiebre', severity: 'mild', duration: 1 },
      { name: 'Dificultad para respirar', severity: 'mild', duration: 2 },
    ],
    patientId: 'test-patient-id',
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    timeout: '30s', // Timeout más largo para análisis de IA
  };

  const response = http.post(analyzeUrl, JSON.stringify(symptomsData), params);
  const success = check(response, {
    'symptom analyzer status is 200': (r) => r.status === 200,
    'symptom analysis returned': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && body.data;
    },
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  symptomAnalyzerDuration.add(response.timings.duration);
  return true;
}

// Función para obtener dashboard
function getDashboard(token) {
  const dashboardUrl = `${BASE_URL}${API_VERSION}/dashboard`;
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = http.get(dashboardUrl, params);
  const success = check(response, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard data returned': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && body.data;
    },
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  dashboardDuration.add(response.timings.duration);
  return true;
}

// Función para obtener alertas
function getAlerts(token) {
  const alertsUrl = `${BASE_URL}${API_VERSION}/alerts`;
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = http.get(alertsUrl, params);
  const success = check(response, {
    'alerts status is 200': (r) => r.status === 200,
    'alerts returned': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && Array.isArray(body.data);
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  return success;
}

// Función principal de test
export default function () {
  requestCounter.add(1);

  // Verificar conectividad al inicio (solo una vez por VU)
  if (__VU === 1 && __ITER === 0) {
    const isHealthy = checkBackendHealth();
    if (!isHealthy) {
      console.error(`[ERROR] Backend no disponible en ${BASE_URL}`);
      console.error(`[ERROR] Por favor, inicia el backend con: npm run dev`);
      return;
    }
  }

  // Seleccionar usuario aleatorio
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // 1. Autenticación (70% de las veces login, 30% registro)
  let token;
  if (Math.random() < 0.7) {
    token = getAuthToken(user);
  } else {
    token = registerUser();
  }

  if (!token) {
    // Si no hay token, no continuar con las demás peticiones
    sleep(1);
    return;
  }

  sleep(0.5);

  // 2. Obtener dashboard (40% de probabilidad)
  if (Math.random() < 0.4) {
    getDashboard(token);
    sleep(0.5);
  }

  // 3. Obtener historias médicas (50% de probabilidad)
  if (Math.random() < 0.5) {
    getMedicalHistories(token);
    sleep(0.5);
  }

  // 4. Crear historia médica (30% de probabilidad)
  if (Math.random() < 0.3) {
    createMedicalHistory(token);
    sleep(1);
  }

  // 5. Analizar síntomas (20% de probabilidad - más pesado)
  if (Math.random() < 0.2) {
    analyzeSymptoms(token);
    sleep(1);
  }

  // 6. Obtener alertas (30% de probabilidad)
  if (Math.random() < 0.3) {
    getAlerts(token);
    sleep(0.5);
  }

  sleep(1);
}

// Función de setup (opcional, se ejecuta una vez al inicio)
export function setup() {
  console.log('Iniciando tests de carga...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Verificar conectividad antes de empezar
  const healthUrl = `${BASE_URL}/health`;
  try {
    const healthResponse = http.get(healthUrl, { timeout: '5s' });
    if (healthResponse.status === 200) {
      console.log(`✓ Backend está disponible en ${BASE_URL}`);
    } else {
      console.error(`✗ Backend responde con status ${healthResponse.status}`);
      console.error(`Por favor, verifica que el backend esté corriendo correctamente.`);
    }
  } catch (error) {
    console.error(`✗ No se puede conectar al backend en ${BASE_URL}`);
    console.error(`Por favor, inicia el backend con: npm run dev`);
    console.error(`Error: ${error.message}`);
  }
  
  return { baseUrl: BASE_URL };
}

// Función de teardown (opcional, se ejecuta una vez al final)
export function teardown(data) {
  console.log('Tests de carga completados');
  console.log(`Base URL utilizada: ${data.baseUrl}`);
}

