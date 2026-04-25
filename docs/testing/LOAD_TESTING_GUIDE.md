# 🚀 Guía de Tests de Carga y Estrés

Esta guía explica cómo ejecutar y entender los tests de carga y estrés para el backend de RespiCare.

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Instalación de Herramientas](#instalación-de-herramientas)
3. [Tests de Carga con K6](#tests-de-carga-con-k6)
4. [Tests de Estrés con TypeScript](#tests-de-estrés-con-typescript)
5. [Interpretación de Resultados](#interpretación-de-resultados)
6. [Mejores Prácticas](#mejores-prácticas)
7. [Troubleshooting](#troubleshooting)

---

## Introducción

Los tests de carga y estrés son esenciales para:

- **Identificar cuellos de botella** antes del despliegue en producción
- **Validar la capacidad** del sistema bajo diferentes niveles de carga
- **Asegurar SLA** (Service Level Agreements) y tiempos de respuesta
- **Detectar problemas de escalabilidad** y optimización

### Tipos de Tests

1. **Tests de Carga (Load Testing)**: Simulan carga normal y esperada
2. **Tests de Estrés (Stress Testing)**: Empujan el sistema más allá de su capacidad normal
3. **Tests de Saturación (Spike Testing)**: Aumentan la carga abruptamente

---

## Instalación de Herramientas

### K6 (Tests de Carga)

K6 es una herramienta moderna de testing de carga escrita en Go.

#### Windows

```powershell
# Con Chocolatey
choco install k6

# O descargar desde: https://github.com/grafana/k6/releases
```

#### macOS

```bash
brew install k6
```

#### Linux

```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# O usar el script de instalación
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
```

#### Verificar Instalación

```bash
k6 version
```

### Dependencias para Tests de Estrés (TypeScript)

Los tests de estrés usan Jest y Axios, que ya están en las dependencias del proyecto:

```bash
cd backend
npm install
```

---

## Tests de Carga con K6

### ⚠️ IMPORTANTE: Antes de Ejecutar

**El backend DEBE estar corriendo antes de ejecutar los tests de carga.**

```bash
# Iniciar el backend
cd backend
npm run dev

# En otra terminal, verificar que esté activo
curl http://localhost:3001/health
```

### Ubicación

Los tests de carga están en: `backend/tests/load/k6-load-tests.js`

### Ejecución Básica

```bash
cd backend

# Asegúrate de que el backend esté corriendo primero
npm run dev

# En otra terminal, ejecuta los tests
npm run test:load

# O directamente con k6
k6 run tests/load/k6-load-tests.js
```

### Ejecución con Opciones Personalizadas

#### Especificar número de usuarios virtuales (VUs)

```bash
k6 run --vus 50 --duration 2m tests/load/k6-load-tests.js
```

#### Usar stages personalizados

```bash
k6 run --stage 30s:10,1m:50,30s:100,2m:100,30s:50,30s:0 tests/load/k6-load-tests.js
```

#### Cambiar URL base

```bash
k6 run --env BASE_URL=http://localhost:3001 tests/load/k6-load-tests.js
```

#### Ejecutar con más opciones

```bash
k6 run \
  --vus 100 \
  --duration 5m \
  --iterations 10000 \
  --env BASE_URL=https://api.respicare.com \
  tests/load/k6-load-tests.js
```

### Configuración de Stages

El archivo de test incluye stages predefinidos:

```javascript
stages: [
  { duration: '30s', target: 10 },   // Ramp-up: 10 usuarios en 30s
  { duration: '1m', target: 50 },    // Carga normal: 50 usuarios
  { duration: '30s', target: 100 },  // Ramp-up: 100 usuarios
  { duration: '2m', target: 100 },  // Carga alta: 100 usuarios
  { duration: '30s', target: 50 },  // Ramp-down: 50 usuarios
  { duration: '30s', target: 0 },    // Ramp-down: 0 usuarios
]
```

### Thresholds (Umbrales)

Los tests validan automáticamente:

- **95% de peticiones** completadas en menos de 500ms
- **99% de peticiones** completadas en menos de 1000ms
- **Menos del 1% de errores**
- **Más del 99% de checks pasados**

### Endpoints Probados

1. **POST /api/v1/auth/login** - Autenticación
2. **POST /api/v1/auth/register** - Registro de usuarios
3. **GET /api/v1/dashboard** - Dashboard
4. **GET /api/v1/medical-histories** - Listar historias médicas
5. **POST /api/v1/medical-histories** - Crear historia médica
6. **POST /api/v1/symptom-analyzer/analyze** - Análisis de síntomas
7. **GET /api/v1/alerts** - Alertas

### Salida de Ejemplo

```
     ✓ login status is 200
     ✓ login has token
     ✓ dashboard status is 200
     ✓ dashboard data returned
     ✓ get medical histories status is 200
     ✓ medical histories returned

     checks.........................: 99.5% ✓ 9950    ✗ 50
     data_received..................: 12 MB 200 kB/s
     data_sent......................: 2.1 MB 35 kB/s
     http_req_duration..............: avg=245ms min=120ms med=230ms max=850ms p(90)=420ms p(95)=480ms
     http_req_failed................: 0.50%  ✓ 50      ✗ 9950
     http_reqs......................: 10000  166.666667/s
     iteration_duration.............: avg=1.2s min=0.5s med=1.1s max=3.5s p(90)=2.1s p(95)=2.5s
     iterations.....................: 10000  166.666667/s
     vus............................: 50     min=10    max=100
     vus_max........................: 100    min=10    max=100
```

---

## Tests de Estrés con TypeScript

### Ubicación

Los tests de estrés están en: `backend/tests/stress/stress-scenarios.ts`

### Ejecución

```bash
cd backend
npm run test:stress
```

O con Jest directamente:

```bash
npm run test -- tests/stress/stress-scenarios.ts
```

### Configuración

Antes de ejecutar, asegúrate de tener variables de entorno configuradas:

```bash
# .env o variables de entorno
BASE_URL=http://localhost:3001
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test123456!
```

### Características

- **Ramp-up gradual**: Aumenta la carga progresivamente
- **Métricas detalladas**: P95, P99, promedio, min, max
- **Análisis de errores**: Agrupa errores por tipo y status code
- **Tests concurrentes**: Hasta 200 peticiones simultáneas

### Escenarios Incluidos

1. **POST /api/v1/auth/login** - 100 usuarios concurrentes
2. **GET /api/v1/medical-histories** - 200 usuarios concurrentes
3. **POST /api/v1/medical-histories** - 50 usuarios concurrentes
4. **POST /api/v1/symptom-analyzer/analyze** - 20 usuarios concurrentes
5. **GET /api/v1/dashboard** - 200 usuarios concurrentes
6. **GET /api/v1/alerts** - 200 usuarios concurrentes
7. **Test de saturación completa** - Múltiples endpoints simultáneos

### Salida de Ejemplo

```json
{
  "endpoint": "/api/v1/medical-histories",
  "totalRequests": 5000,
  "successfulRequests": 4850,
  "failedRequests": 150,
  "averageResponseTime": 450,
  "p95ResponseTime": 1200,
  "p99ResponseTime": 2500,
  "maxResponseTime": 5000,
  "minResponseTime": 120,
  "errors": [
    {
      "status": 429,
      "message": "Request failed with status code 429",
      "count": 100
    },
    {
      "status": 500,
      "message": "Request failed with status code 500",
      "count": 50
    }
  ]
}
```

---

## Interpretación de Resultados

### Métricas Clave

#### Tiempo de Respuesta

- **Promedio (avg)**: Tiempo promedio de respuesta
- **P95**: 95% de las peticiones completadas en este tiempo o menos
- **P99**: 99% de las peticiones completadas en este tiempo o menos
- **Max**: Tiempo máximo de respuesta

#### Tasas de Éxito

- **Success Rate**: Porcentaje de peticiones exitosas
- **Error Rate**: Porcentaje de peticiones fallidas

#### Throughput

- **Requests per second (RPS)**: Peticiones por segundo
- **Concurrent Users (VUs)**: Usuarios virtuales simultáneos

### Umbrales Recomendados

| Endpoint | Avg Response Time | P95 Response Time | P99 Response Time | Max Error Rate |
|----------|-------------------|-------------------|-------------------|----------------|
| Auth (login) | < 500ms | < 1000ms | < 2000ms | < 1% |
| GET endpoints | < 300ms | < 500ms | < 1000ms | < 0.5% |
| POST endpoints | < 500ms | < 1000ms | < 2000ms | < 1% |
| IA endpoints | < 3000ms | < 5000ms | < 10000ms | < 5% |

### Señales de Problemas

⚠️ **Cuellos de botella detectados si:**

- P95 o P99 exceden significativamente los umbrales
- Tasa de errores > 5%
- Tiempo de respuesta aumenta linealmente con la carga
- Errores 500 (Internal Server Error) frecuentes
- Errores 429 (Too Many Requests) indican rate limiting

✅ **Sistema saludable si:**

- Tiempos de respuesta estables bajo carga
- Tasa de errores < 1%
- Throughput constante
- Recuperación rápida después de picos

---

## Mejores Prácticas

### 1. Ejecutar Tests en Ambiente Aislado

Nunca ejecutes tests de carga en producción o en ambientes compartidos.

### 2. Empezar con Carga Baja

Incrementa gradualmente la carga para identificar el punto de quiebre.

### 3. Monitorear Recursos

Durante los tests, monitorea:

- **CPU**: Debe estar < 80%
- **Memoria**: Debe estar < 80%
- **Conexiones de base de datos**: No debe saturarse
- **Redis**: Latencia y uso de memoria

### 4. Documentar Resultados

Guarda los resultados de cada test para comparar mejoras:

```bash
k6 run --out json=results.json tests/load/k6-load-tests.js
```

### 5. Tests Regulares

Ejecuta tests de carga:

- Antes de cada release importante
- Después de cambios de infraestructura
- Mensualmente como parte de mantenimiento

### 6. Simular Comportamiento Real

Ajusta los tests para reflejar patrones de uso reales:

- Distribución de endpoints
- Tiempos entre peticiones
- Datos de prueba realistas

---

## Troubleshooting

### Problema: Puerto 3001 ya está en uso (EADDRINUSE)

**Síntomas**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Causa**: Otra instancia del backend (o otro proceso) está usando el puerto 3001.

**Solución**:

1. **Usar el script automático** (Windows):
   ```bash
   npm run kill-port
   ```

2. **O manualmente** (Windows):
   ```powershell
   # Encontrar el proceso
   netstat -ano | findstr :3001
   
   # Detener el proceso (reemplaza PID con el número encontrado)
   taskkill /F /PID <PID>
   ```

3. **O manualmente** (Linux/macOS):
   ```bash
   # Encontrar y detener el proceso
   lsof -ti:3001 | xargs kill -9
   ```

4. **O cambiar el puerto**:
   ```bash
   # En Windows PowerShell
   $env:PORT=3002; npm run dev
   
   # En Linux/macOS
   PORT=3002 npm run dev
   ```

### Problema: K6 no se encuentra

**Solución**: Verifica la instalación:

```bash
k6 version
```

Si no está instalado, sigue las instrucciones de [Instalación de K6](#instalación-de-herramientas).

### Problema: Tests fallan con errores de conexión (100% de errores)

**Síntomas**: 
- `http_req_failed: 100.00%`
- `checks: 0.00%`
- Todos los checks fallan

**Causa**: El backend no está corriendo o no es accesible.

**Solución**: 
1. **Verifica que el backend esté corriendo**:
   ```bash
   # Iniciar el backend
   cd backend
   npm run dev
   ```

2. **Verifica conectividad**:
   ```bash
   # Verificar que el backend esté activo
   curl http://localhost:3001/health
   # Debe devolver: {"status":"ok"} o similar
   ```

3. **Verifica el puerto**: Por defecto es `3001`. Si usas otro puerto:
   ```bash
   k6 run --env BASE_URL=http://localhost:TU_PUERTO tests/load/k6-load-tests.js
   ```

4. **Verifica que MongoDB y Redis estén corriendo** (si son requeridos):
   ```bash
   # MongoDB
   docker ps | grep mongo
   
   # Redis
   docker ps | grep redis
   ```

### Problema: Rate limiting (429 errors)

**Solución**: Ajusta los límites de rate limiting en el backend o reduce la carga del test:

```bash
# Reducir usuarios virtuales
k6 run --vus 20 --duration 1m tests/load/k6-load-tests.js
```

### Problema: Timeouts frecuentes

**Solución**: Aumenta el timeout en los tests o optimiza el backend:

```javascript
// En k6-load-tests.js
const params = {
  timeout: '60s', // Aumentar timeout
};
```

### Problema: Tests de estrés fallan por autenticación

**Solución**: Verifica las credenciales de prueba:

```bash
# Verificar variables de entorno
echo $TEST_USER_EMAIL
echo $TEST_USER_PASSWORD
```

### Problema: Resultados inconsistentes

**Solución**: 

1. Ejecuta múltiples veces y promedia los resultados
2. Asegúrate de que no haya otros procesos usando recursos
3. Ejecuta en un ambiente limpio y aislado

---

## Recursos Adicionales

- [Documentación oficial de K6](https://k6.io/docs/)
- [Guía de K6 para principiantes](https://k6.io/docs/getting-started/)
- [Best practices de load testing](https://k6.io/docs/test-types/)
- [Jest documentation](https://jestjs.io/docs/getting-started)

---

## Contacto y Soporte

Para preguntas o problemas con los tests de carga:

1. Revisa esta guía primero
2. Consulta los logs del backend
3. Verifica la configuración de rate limiting
4. Contacta al equipo de desarrollo

---

**Última actualización**: Diciembre 2024

