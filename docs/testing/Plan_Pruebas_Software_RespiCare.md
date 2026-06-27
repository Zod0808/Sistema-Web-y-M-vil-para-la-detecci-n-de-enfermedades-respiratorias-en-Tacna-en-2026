# PLAN DE PRUEBAS DE SOFTWARE
## Arquitectura, Documentación y Ejecución
### EPIC-03: Sistema de Diagnóstico Inteligente de Síntomas Respiratorios

---

| Campo | Valor |
|---|---|
| **Universidad** | Universidad Privada de Tacna (UPT) |
| **Facultad** | Escuela Profesional de Ingeniería de Sistemas (EPIS) |
| **Asignatura** | Construcción de Software II · Ciclo X |
| **Unidad / Semana** | Unidad III: Entrega y Mantenimiento del Software · Semana 13 |
| **Docente** | Mag. Alberto Johnatan Flor Rodríguez |
| **Proyecto** | RespiCare — Sistema de Gestión de Enfermedades Respiratorias |
| **Estudiante** | Chávez Linares, Cesar Fabian · Código: 2019063854 |
| **Rol Operativo Simulado** | QA Lead |
| **Normativa Base** | SWEBOK V4 & ISO/IEC/IEEE 29119-3 |
| **Fecha** | Junio 2026 |

---

## 2. Contexto del Proyecto y Alcance del Plan

### 2.1 Descripción de RespiCare

RespiCare es un sistema integral de gestión de enfermedades respiratorias que combina inteligencia artificial clínica, historial clínico electrónico (HCE) e integración móvil multiplataforma. El sistema sirve a pacientes y profesionales médicos en el contexto de la ciudad de Tacna (2026), ofreciendo diagnóstico asistido por IA, seguimiento continuo mediante wearables, teleconsulta y alertas epidemiológicas.

El propósito principal de este Plan de Pruebas es garantizar que la **EPIC-03** — el módulo de diagnóstico inteligente — cumpla los requisitos de calidad, seguridad y rendimiento antes de su integración con las épicas pendientes (EPIC-04 a EPIC-10).

### 2.2 Stack Tecnológico

| Capa | Tecnología | Versión | Rol en EPIC-03 |
|---|---|---|---|
| Frontend Web | Next.js + TypeScript | 14.x | Formulario de síntomas, panel doctor |
| Mobile App | Capacitor + React | 6.x | Grabación de audio, envío de síntomas |
| Backend API | Node.js + TypeScript | 20 LTS | Orquestación, circuit breaker |
| Servicio IA | FastAPI + Python | 3.11 | Random Forest, CNN audio |
| Base de datos | MongoDB | 7.x | Historial, resultados predicciones |
| Caché / Queue | Redis | 7.x | Rate limiting, jobs de audio |
| CI/CD | GitHub Actions | — | Pipeline automatizado de pruebas |
| Infraestructura | Docker Compose / Nginx | — | Ambiente local y staging |

### 2.3 Alcance del Plan — EPIC-03

| ID | Historia de Usuario | Módulo Técnico | Estado |
|---|---|---|---|
| HU-03.1 | Registro y análisis de síntomas | `symptomService.ts` + `predict_service.py` | 🔵 En curso |
| HU-03.2 | Análisis de tos por audio (CNN) | `AudioAnalysisService` + `cnn_model.py` | 🔵 En curso |
| HU-03.3 | Panel del doctor — validación IA | `DoctorDashboard` + `validationRouter.ts` | 🔵 En curso |

Quedan fuera de alcance las EPIC-01 y EPIC-02 (ya validadas) y las EPIC-04 a EPIC-10 (pendientes de desarrollo).

### 2.4 Ruta Crítica EPIC-03

La ruta crítica identificada comprende **23 horas** de trabajo encadenado:

```
T-01 (Modelo RF) → T-02 (API predict) → T-12 (Panel doctor UI)
→ T-13 (Validación predicción) → T-14 (Auditoría y logs)
```

Cualquier bloqueo en este camino impacta directamente la fecha de integración del Sprint 2.

---

## 3. Estrategias de Pruebas en el Despliegue

Alineadas con el paradigma DevOps y referenciadas en **SWEBOK V4 §2.2.5** (Integration Testing), las estrategias se dividen en tres fases temporales.

### 3.1 Fase de Integración — DevOps Pipeline

La integración continua (CI) se implementa mediante GitHub Actions. Cada pull request a la rama `fabian` o `main` dispara la siguiente cadena de verificación:

```yaml
# .github/workflows/ci.yml (resumen)
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test -- --coverage
      - run: npx jest --testPathPattern=epic03
  test-ai:
    runs-on: ubuntu-latest
    steps:
      - run: pip install -r requirements.txt
      - run: pytest tests/epic03/ --cov=app --cov-report=xml
```

- **Pruebas de regresión automática:** Jest (backend/web) + Pytest (AI). Se ejecutan las suites completas, no solo las nuevas.
- **Umbral de calidad:** Cobertura ≥ 65% en Sprint 2; fallo del pipeline si cae por debajo (SWEBOK §2.2.5).
- **Integración de SonarQube:** Análisis estático post-prueba para detectar deuda técnica y duplicación de código.

### 3.2 En la Frontera del Despliegue — Canary & Dark Launch

Previo a la promoción a producción, los endpoints críticos de IA son validados mediante técnicas de despliegue progresivo:

- **Canary Testing:** El 10% del tráfico de staging es dirigido a la nueva versión del endpoint `/ai/predict/symptoms`. Se monitorean error rate y latencia durante 15 minutos antes de promover al 100%.
- **Dark Launch:** Los endpoints `/ai/predict/cough` (CNN) reciben peticiones reales en paralelo, sin devolver la respuesta al cliente. Permite validar la carga real sin exposición al usuario.

```yaml
# docker-compose.prod.yml — configuración canary (extracto)
services:
  ai-canary:
    image: respicare/ai-services:canary
    deploy:
      replicas: 1
  ai-stable:
    image: respicare/ai-services:stable
    deploy:
      replicas: 9
```

### 3.3 Validación en Vivo — Métricas DORA

| Métrica DORA | Definición | Meta RespiCare | Herramienta |
|---|---|---|---|
| MTTR | Mean Time To Recovery tras incidente | < 2 horas | Prometheus + Alertmanager |
| Change Failure Rate | % deploys que causan incidente | < 5% | GitHub Actions metrics |
| Deployment Frequency | Frecuencia de deploys exitosos | ≥ 3/semana | GitHub Insights |
| Lead Time for Changes | Commit → Producción | < 4 horas | Pipeline timing |

---

## 4. Fundamentos de Planificación — Paradigma Shift-Left

### 4.1 Definición y Fundamento (SWEBOK V4 §6.1.2)

El paradigma **Shift-Left** implica desplazar las actividades de verificación y validación hacia las etapas más tempranas del ciclo de vida. En RespiCare, esto se materializa mediante TDD (Test-Driven Development) sobre los servicios de predicción, transformando la QA de una fase reactiva de detección de errores a una actividad constructiva integrada en el diseño.

La ecuación de costo de defectos de Barry Boehm —donde el costo de corrección aumenta exponencialmente por fase— justifica esta decisión: un error detectado en la fase de codificación cuesta ~10× menos que uno detectado en producción.

### 4.2 TDD Aplicado a `symptomService.ts`

El ciclo Red-Green-Refactor se aplica al servicio TypeScript de síntomas:

```typescript
// 1. RED — escribir la prueba que falla
describe('SymptomService.predict()', () => {
  it('debe retornar predicción con confidence >= 0 y <= 1', async () => {
    const svc = new SymptomService(mockRepo, mockAIClient);
    const result = await svc.predict({ fever: true, cough: true, dyspnea: false });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// 2. GREEN — implementación mínima que satisface la prueba
// 3. REFACTOR — optimizar sin romper la prueba
```

- **Beneficio principal:** El contrato del servicio queda explícito en las pruebas antes de escribir una sola línea de lógica de negocio.
- **Cobertura objetivo:** ≥ 90% de ramas lógicas en `symptomService.ts` mediante pruebas unitarias TDD.

### 4.3 TDD Aplicado a `predict_service.py`

```python
# Python / Pytest — ciclo TDD para el servicio IA
def test_predict_returns_valid_schema():
    svc = PredictService(model=MockRandomForest())
    result = svc.predict({'fever':1, 'cough':1, 'dyspnea':0, 'wheezing':0})
    assert 0.0 <= result['confidence'] <= 1.0
    assert result['disease'] in VALID_DISEASES
    assert 'timestamp' in result
```

- **Mock del modelo RF:** Se inyecta un `MockRandomForest` que retorna respuestas deterministas, eliminando la varianza del modelo real en el test unitario.
- **Contrato de interfaz:** La prueba codifica el contrato JSON de salida del endpoint, que el schema de FastAPI debe satisfacer.

### 4.4 Impacto en la Cultura QA

| Indicador | Antes (reactivo) | Después (Shift-Left) | Variación |
|---|---|---|---|
| Costo promedio por defecto | Alto (post-deploy) | Bajo (pre-commit) | ↓ ~10x |
| Tiempo de detección | Días / semanas | Minutos (CI local) | ↓ ~95% |
| Confianza del desarrollador | Baja | Alta (safety net) | ↑ |
| Documentación viva | Ausente | Tests como spec | ↑ |

---

## 5. Arquitectura Estratégica del Plan de Pruebas

El Plan de Pruebas de RespiCare se sostiene sobre **tres pilares estratégicos** definidos en SWEBOK V4 §5.

### 5.1 Pilar I — Gestión de Personal y Cultura QA

#### Independencia del Equipo QA

La independencia del tester respecto del desarrollador es un principio fundamental (SWEBOK §5.1.1). Esquema de roles:

| Rol Simulado | Responsabilidad Principal | Artefactos Generados |
|---|---|---|
| QA Lead (Estudiante) | Diseño de plan, revisión de casos, métricas | Plan de Pruebas, Reportes |
| Dev Backend | Implementación y pruebas unitarias propias | Unit Tests Jest/Pytest |
| Dev IA | Validación de modelos, pruebas integración AI | Model Accuracy Reports |
| Dev Mobile | Pruebas en dispositivo físico Android 13+ | Device Test Logs |

#### Egoless Programming (SWEBOK §5.1.1)

Se adopta revisión de código entre pares: ningún desarrollador revisa exclusivamente su propio código. Las pull requests requieren aprobación de al menos un miembro diferente al autor antes de fusión. Esto aplica especialmente a los módulos de predicción IA, donde los errores tienen impacto clínico directo.

### 5.2 Pilar II — Objetivos de Prueba (Test Targets)

| Dimensión de Calidad | Métrica | Umbral Aceptable | Referencia |
|---|---|---|---|
| Conformidad Funcional IA | Accuracy Random Forest | ≥ 70% en dataset de validación | ISO 25010 §4.2.1 |
| Confiabilidad | Circuit Breaker activación | < 1% de peticiones normales | SWEBOK §5.2 |
| Usabilidad (formulario síntomas) | Task Completion Rate | ≥ 90% en prueba de usuario | ISO 9241-11 |
| Rendimiento WiFi | Tiempo respuesta `/predict` | < 3 segundos (P95) | SWEBOK §4.1 |
| Rendimiento 3G | Tiempo respuesta `/predict` | < 8 segundos (P95) | SWEBOK §4.1 |
| Seguridad | OWASP Top 10 críticos | 0 vulnerabilidades críticas | OWASP ASVS 3.0 |
| Cobertura de Código | Statement Coverage | ≥ 80% (Sprint 3) | SWEBOK §3.2 |

### 5.3 Pilar III — Criterios de Finalización (Stopping Rules)

Basados en **SWEBOK V4 §1.2.1** (Risk Analysis):

- **Criterio de Completitud:** Cobertura ≥ 80% de sentencias + 100% de casos de prueba críticos (CP-EPIC03-001 a 010) ejecutados con resultado documentado.
- **Criterio de Calidad:** Tasa de defectos residuales aceptable: ≤ 2 defectos de severidad Alta/Media sin resolver por módulo.
- **Criterio de Riesgo:** Ningún defecto de severidad Crítica abierto. Los defectos Críticos bloquean el avance al siguiente sprint.
- **Criterio de Tiempo:** Si se alcanza el deadline del Sprint 2 sin cumplir cobertura, se documenta la deuda técnica y se escala al Sprint 3.
- **Criterio de Suspensión:** Si el ambiente de prueba falla (Docker Compose inaccesible, MongoDB down), se suspende la ejecución y se registra un Incident Report.

---

## 6. Jerarquía Documental ISO/IEC/IEEE 29119-3

La norma ISO/IEC/IEEE 29119-3 define una jerarquía de **tres niveles** para la documentación de pruebas.

### 6.1 Nivel Organizacional — Políticas y Estrategia

| Artefacto ISO 29119-3 | Contenido RespiCare | Ubicación |
|---|---|---|
| Test Policy | Política de calidad del software RespiCare: toda funcionalidad clínica debe tener cobertura ≥ 80% antes de producción. | `CLAUDE.md` + `docs/testing/TESTING_STRATEGY.md` |
| Organizational Test Strategy | Estrategia multi-nivel: Unit → Integration → E2E → Performance → Security. Pirámide de pruebas con 70/20/10. | `docs/testing/TESTING_STRATEGY.md` |

### 6.2 Nivel de Gestión — Plan y Seguimiento

| Artefacto ISO 29119-3 | Contenido RespiCare | Estado |
|---|---|---|
| Test Plan (este documento) | Plan específico Sprint 2, EPIC-03. Define alcance, recursos, cronograma y stopping rules. | 🔵 En elaboración |
| Test Status Report | Reporte semanal: casos ejecutados, defectos encontrados/resueltos, cobertura actual. | ⬜ Pendiente sprint |
| Test Completion Report | Informe final del sprint con métricas consolidadas y dictamen del QA Lead. | ⬜ Fin de sprint |

### 6.3 Nivel Dinámico — Especificación y Ejecución

| Artefacto ISO 29119-3 | Contenido RespiCare | Referencia |
|---|---|---|
| Test Design Specification | Técnicas aplicadas: partición equivalencias, valores límite, tabla decisión. | Sección 7 |
| Test Case Specification | 10 casos de prueba detallados (CP-EPIC03-001 a 010). | Sección 8 |
| Test Procedure Specification | Pasos secuenciales de ejecución para cada caso, incluyendo setup Docker. | Sección 10 |
| Test Environment Requirements | Especificación del ambiente sandbox con Docker Compose. | Sección 9 |
| Test Execution Log | Registro de ejecución: fecha, ejecutor, resultado, evidencia. | A generar en ejecución |
| Incident Report | Formulario de reporte de defecto con clasificación ODC. | Sección 11 |

---

## 7. Metodología de Diseño — Funcionales vs. No Funcionales

### 7.1 Pruebas Funcionales (Caja Negra)

#### 7.1.1 Partición de Equivalencias — Inputs de Síntomas (HU-03.1)

| Campo | Clase Válida | Clase Inválida | Valor de Prueba (Inválido) |
|---|---|---|---|
| `fever` (boolean) | `true` / `false` | null, string, número | `'yes'`, `7`, `null` |
| `cough` (boolean) | `true` / `false` | undefined | `undefined` |
| `duration_days` (int) | 1 — 365 | 0, negativo, > 365, decimal | `0`, `-1`, `500`, `1.5` |
| `temperature_c` (float) | 35.0 — 42.0 | < 35, > 45, string | `34.9`, `45.1`, `'alta'` |
| `severity` (1-10) | 1 — 10 | 0, 11, decimal | `0`, `11`, `5.5` |

#### 7.1.2 Análisis de Valores Límite — Confidence Score

| Límite | Valor | Comportamiento Esperado | Prueba |
|---|---|---|---|
| Mínimo absoluto | 0.00 | Mostrar `⚠️ Sin confianza — consultar médico` | CP-EPIC03-004 |
| Umbral bajo | 0.59 | Mostrar advertencia + botón ajuste manual | CP-EPIC03-005 |
| Umbral aceptable | 0.60 | Mostrar diagnóstico con confianza moderada | CP-EPIC03-004 |
| Umbral alto | 0.85 | Mostrar diagnóstico con alta confianza | CP-EPIC03-003 |
| Máximo absoluto | 1.00 | Marcar como determinístico (caso borde) | Exploratoria |

#### 7.1.3 Tabla de Decisión — Flujo de Predicción

| Condición / Acción | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| Síntomas completos (≥ 4 campos) | ✅ | ✅ | ❌ | ❌ |
| Servicio IA disponible | ✅ | ❌ | ✅ | ❌ |
| Confidence ≥ 60% | ✅ | N/A | N/A | N/A |
| **— ACCIONES —** | | | | |
| Mostrar diagnóstico | ✅ | ❌ | ❌ | ❌ |
| Activar circuit breaker | ❌ | ✅ | ❌ | ✅ |
| Mostrar error validación form | ❌ | ❌ | ✅ | ✅ |
| Enviar a revisión médica manual | ❌ | ✅ | ❌ | ✅ |

### 7.2 Pruebas No Funcionales

#### 7.2.1 Pruebas de Carga y Estrés — Endpoint IA (k6)

```javascript
// k6/load-test-predict.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50  }, // ramp up
    { duration: '5m', target: 100 }, // carga sostenida
    { duration: '2m', target: 200 }, // estres
    { duration: '1m', target: 0   }, // ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // < 3s P95
    'http_req_failed':   ['rate<0.01'],  // < 1% errores
  },
};
```

- **Locust (Python):** Para el servicio FastAPI, se utiliza Locust para simular usuarios concurrentes con patrones de uso clínico real.
- **Escenario de estrés:** 300 usuarios concurrentes durante 10 minutos. Meta: sin degradación de accuracy del modelo.

#### 7.2.2 Confiabilidad del Circuit Breaker

| Estado | Condición de Transición | Prueba |
|---|---|---|
| CLOSED → OPEN | ≥ 5 fallos en 30 segundos | Simular 5 timeouts consecutivos |
| OPEN → HALF-OPEN | Pasados 60 segundos | Esperar 60s + enviar 1 petición |
| HALF-OPEN → CLOSED | 1 petición exitosa | IA recuperada: petición OK |
| HALF-OPEN → OPEN | Petición falla | IA aún caída: reiniciar ciclo |

#### 7.2.3 Seguridad — Datos Médicos (HIPAA / LPD Perú)

- **Autenticación JWT:** Verificar que todos los endpoints de EPIC-03 rechacen peticiones sin token válido (CP-EPIC03-009).
- **Inyección NoSQL:** Enviar payloads maliciosos: `{"$gt": ""}`, `{"$where": "..."}`.
- **Data Masking en logs:** Verificar que los logs de aplicación no expongan datos de pacientes en texto plano.
- **Rate Limiting:** Endpoint `/ai/predict/symptoms` limitado a 60 req/min por usuario autenticado.

---

## 8. Plantilla Oficial de Casos de Prueba — EPIC-03

> Formato basado en ISO/IEC/IEEE 29119-3 §7.2 (Test Case Specification)

---

### CP-EPIC03-001 — Registro de síntomas válidos y predicción exitosa

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-001 |
| **Historia de Usuario** | HU-03.1 |
| **Descripción** | Registro de síntomas válidos y obtención de predicción exitosa |
| **Precondiciones** | Usuario autenticado con rol PACIENTE. Servicio IA activo (Docker up). MongoDB disponible. |
| **Pasos de Ejecución** | 1. Navegar a `/symptoms/new` · 2. Completar formulario: fiebre=Sí, tos=Sí, disnea=No, duración=3 días, temperatura=38.2°C, severidad=6 · 3. Pulsar "Analizar Síntomas" · 4. Esperar respuesta del endpoint `POST /api/symptoms` |
| **Datos de Entrada** | `{ fever:true, cough:true, dyspnea:false, duration_days:3, temperature_c:38.2, severity:6 }` |
| **Resultado Esperado (Oráculo)** | HTTP 200. Respuesta JSON con campos: `disease` (string), `confidence` (0.0–1.0), `recommendations` (array). UI muestra diagnóstico en < 3 segundos. Registro guardado en MongoDB. |
| **Resultado Obtenido** | ✅ CUBIERTO — `backend/tests/integration/symptomAnalyzer.integration.test.ts` (POST /analyze → 200/503) + `mobile/__tests__/components/symptomAnalyzer.test.tsx` (flujo UI). Ejecución: `npx jest tests/integration/symptomAnalyzer.integration.test.ts` |

---

### CP-EPIC03-002 — Registro de síntomas con campos inválidos

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-002 |
| **Historia de Usuario** | HU-03.1 |
| **Descripción** | Validación frontend ante inputs inválidos |
| **Precondiciones** | Usuario autenticado. Formulario de síntomas cargado. |
| **Pasos de Ejecución** | 1. Ingresar `duration_days = -1` · 2. Ingresar `temperature_c = 50.0` · 3. Dejar `severity` vacío · 4. Pulsar "Analizar Síntomas" |
| **Datos de Entrada** | `{ duration_days:-1, temperature_c:50.0, severity:undefined }` |
| **Resultado Esperado (Oráculo)** | HTTP 400 o error de validación frontend. Mensajes de error visibles junto a cada campo inválido. No se realiza llamada al endpoint `/ai/predict`. Sin datos en MongoDB. |
| **Resultado Obtenido** | ✅ CUBIERTO — `backend/tests/integration/symptomAnalyzer.integration.test.ts` (400 sin symptoms/vacío/severity inválida). Ejecución: `npx jest tests/integration/symptomAnalyzer.integration.test.ts -t "400"` |

---

### CP-EPIC03-003 — Predicción IA con confidence alta (≥ 0.85)

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-003 |
| **Historia de Usuario** | HU-03.1 |
| **Descripción** | Flujo nominal con alta certeza diagnóstica |
| **Precondiciones** | Modelo Random Forest entrenado y cargado. Servicio IA activo. Síntomas representativos de Neumonía. |
| **Pasos de Ejecución** | 1. Enviar `POST /ai/predict/symptoms` con síntomas de alta certeza · 2. Verificar respuesta JSON · 3. Verificar UI: badge de confianza alta en verde |
| **Datos de Entrada** | `{ fever:true, cough:true, dyspnea:true, wheezing:false, duration_days:5, severity:8, temperature_c:39.5 }` |
| **Resultado Esperado (Oráculo)** | `confidence >= 0.85`. `disease = 'Pneumonia'`. UI muestra badge verde "✅ Alta confianza". Botón "Enviar a doctor" habilitado. |
| **Resultado Obtenido** | ✅ CUBIERTO — `ai-services/tests/services/test_symptom_analysis_service.py` + `ai-services/tests/llm/test_response_quality.py` (GD-001 Neumonía crítica → urgency=critical, confidence verificado). Ejecución: `pytest tests/services/test_symptom_analysis_service.py -v` |

---

### CP-EPIC03-004 — Predicción IA con confidence baja (< 0.60)

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-004 |
| **Historia de Usuario** | HU-03.1 |
| **Descripción** | Advertencia al usuario ante confianza insuficiente |
| **Precondiciones** | Modelo RF con síntomas ambiguos que producen confianza baja. |
| **Pasos de Ejecución** | 1. Enviar `POST /ai/predict/symptoms` con síntomas ambiguos · 2. Verificar respuesta JSON · 3. Verificar UI: advertencia visible |
| **Datos de Entrada** | `{ fever:false, cough:true, dyspnea:false, wheezing:true, duration_days:1, severity:2 }` |
| **Resultado Esperado (Oráculo)** | `confidence < 0.60`. UI muestra advertencia amber: "⚠️ Confianza insuficiente — se recomienda evaluación médica". Botón "Ajuste Manual" del doctor activado. |
| **Resultado Obtenido** | ✅ CUBIERTO — `ai-services/tests/llm/test_hallucinations.py` (H9: monotonicidad urgencia, síntomas ambiguos → confidence bajo) + `ai-services/tests/llm/test_response_quality.py` (GD-003 síntomas leves → urgency=low/medium). Ejecución: `pytest tests/llm/test_response_quality.py -v -k "TestUrgency"` |

---

### CP-EPIC03-005 — Circuit breaker activado cuando servicio IA no responde

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-005 |
| **Historia de Usuario** | EPIC-03 (transversal) |
| **Descripción** | Verificación del ciclo CLOSED → OPEN → HALF-OPEN del circuit breaker |
| **Precondiciones** | Backend Node.js activo. Servicio IA detenido (`docker stop ai-services`). |
| **Pasos de Ejecución** | 1. Detener contenedor `ai-services` · 2. Enviar 5 peticiones POST `/api/symptoms` consecutivas · 3. Verificar respuesta en la 6.ª petición · 4. Reiniciar `ai-services` · 5. Esperar 60 segundos · 6. Enviar nueva petición |
| **Datos de Entrada** | `{ fever:true, cough:true, dyspnea:true, duration_days:2 }` (repetir 6 veces) |
| **Resultado Esperado (Oráculo)** | Peticiones 1–5: HTTP 503 con `{error:'AI service unavailable', fallback:true}`. Petición 6 (circuit OPEN): HTTP 503 instantáneo sin timeout. Tras reinicio (60s): HTTP 200 normal — circuit CLOSED. |
| **Resultado Obtenido** | ✅ CUBIERTO — `backend/tests/unit/services/aiIntegration.test.ts` (circuit breaker: analyzeSymptoms con timeouts, CLOSED→OPEN). Ejecución: `npx jest tests/unit/services/aiIntegration.test.ts -v` |

---

### CP-EPIC03-006 — Grabación de audio de tos en Android 13+

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-006 |
| **Historia de Usuario** | HU-03.2 |
| **Descripción** | Flujo exitoso de grabación de audio en dispositivo físico |
| **Precondiciones** | App Capacitor instalada en dispositivo/emulador Android 13+. Permiso `RECORD_AUDIO` concedido. |
| **Pasos de Ejecución** | 1. Navegar a sección Análisis de Tos · 2. Pulsar botón "Grabar Tos" · 3. Toser durante 3 segundos · 4. Pulsar "Detener grabación" · 5. Verificar UI |
| **Datos de Entrada** | Audio real de tos ~3s. Formato WAV/WebM. Tamaño estimado 48 KB. |
| **Resultado Esperado (Oráculo)** | Grabación inicia sin error. Duración >= 2s detectada. Preview de audio reproducible. Botón "Analizar" habilitado. Sin errores de permiso en Logcat. |
| **Resultado Obtenido** | ⚠️ PARCIALMENTE CUBIERTO — Permisos RECORD_AUDIO: `mobile/__tests__/components/audioPermissions.test.tsx` (18 tests: granted/denied/NotAllowedError/Android 13+ prompt-denied-granted). Flujo completo en dispositivo físico: **MANUAL — requiere Android 13+ API 33+** (INC-02). Ejecución automatizada: `cd mobile && npx jest __tests__/components/audioPermissions.test.tsx` |

---

### CP-EPIC03-007 — Análisis CNN con audio de tos válido

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-007 |
| **Historia de Usuario** | HU-03.2 |
| **Descripción** | Predicción exitosa del modelo CNN ante audio de calidad |
| **Precondiciones** | Servicio FastAPI activo. Modelo CNN cargado (o dataset ESC-50 como sustituto). Audio de tos >= 2s disponible. |
| **Pasos de Ejecución** | 1. Subir archivo de audio de tos (WAV, 3s, 44100Hz) · 2. `POST /ai/predict/cough` con audio en `multipart/form-data` · 3. Verificar respuesta JSON · 4. Verificar UI |
| **Datos de Entrada** | Archivo: `cough_sample.wav`, 44100Hz, mono, 3 segundos, 129 KB |
| **Resultado Esperado (Oráculo)** | HTTP 200. JSON: `{ disease: string, confidence: float, audio_quality: 'good', duration_ms: int }`. UI muestra resultado en < 5s. |
| **Resultado Obtenido** | ✅ CUBIERTO — `ai-services/tests/api/test_audio_analyzer_endpoints.py` (POST /audio/analyze con audio válido → transcripción y detección tos) + `ai-services/tests/services/test_audio_transcription_service.py`. Ejecución: `pytest tests/api/test_audio_analyzer_endpoints.py -v` |

---

### CP-EPIC03-008 — Análisis CNN con audio corrupto o silencio

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-008 |
| **Historia de Usuario** | HU-03.2 |
| **Descripción** | Manejo de error ante audio inválido |
| **Precondiciones** | Servicio FastAPI activo. Archivo de audio inválido preparado. |
| **Pasos de Ejecución** | 1. Subir archivo de audio corrupto (0 bytes o silencio) · 2. `POST /ai/predict/cough` · 3. Verificar respuesta |
| **Datos de Entrada** | Archivo: `silence.wav` (0.5s de silencio) o `corrupted_audio.bin` |
| **Resultado Esperado (Oráculo)** | HTTP 422 o 400. Body: `{ error: 'AUDIO_QUALITY_INSUFFICIENT', message: 'Audio muy corto o sin voz detectada', min_duration_ms: 2000 }`. UI muestra instrucciones para re-grabar. |
| **Resultado Obtenido** | ✅ CUBIERTO — `ai-services/tests/api/test_audio_analyzer_endpoints.py` (audio silencio/corrupto → 400/422 con mensaje de error de calidad) + `ai-services/tests/ml_models/test_advanced_ml_edge_cases.py` (inputs límite). Ejecución: `pytest tests/api/test_audio_analyzer_endpoints.py -v -k "corrupted or silence"` |

---

### CP-EPIC03-009 — Panel del doctor — visualización de predicciones pendientes

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-009 |
| **Historia de Usuario** | HU-03.3 |
| **Descripción** | El doctor visualiza correctamente las predicciones pendientes de validación |
| **Precondiciones** | Usuario autenticado con rol DOCTOR. Existen ≥ 3 predicciones IA pendientes en MongoDB. |
| **Pasos de Ejecución** | 1. Navegar a `/doctor/dashboard` · 2. Verificar lista de predicciones pendientes · 3. Seleccionar una predicción · 4. Verificar detalle |
| **Datos de Entrada** | Token JWT con `role='doctor'`. MongoDB con documentos en collection `predictions` con `status='pending'`. |
| **Resultado Esperado (Oráculo)** | UI carga en < 2s. Lista muestra: nombre paciente, fecha, enfermedad predicha, confidence (verde ≥0.85, amber 0.60–0.84, rojo <0.60). Detalle incluye síntomas originales y recomendaciones IA. |
| **Resultado Obtenido** | ✅ CUBIERTO — `web/cypress/e2e/doctor-validation.cy.js` (CP-009-01 a CP-009-11: carga < 2s, badges verde/amber/rojo, detalle síntomas/recomendaciones, empty state, error 500/401). Ejecución: `npx cypress run --spec "cypress/e2e/doctor-validation.cy.js"` |

---

### CP-EPIC03-010 — Validación de predicción por el doctor (aceptar/rechazar/ajustar)

| Campo | Detalle |
|---|---|
| **ID** | CP-EPIC03-010 |
| **Historia de Usuario** | HU-03.3 |
| **Descripción** | Flujo completo de validación médica sobre una predicción IA |
| **Precondiciones** | Doctor autenticado en panel. Predicción pendiente seleccionada. |
| **Pasos de Ejecución** | **Caso A:** Pulsar "Aceptar Diagnóstico" · **Caso B:** Pulsar "Rechazar" + ingresar diagnóstico correcto · **Caso C:** Pulsar "Ajustar" + modificar enfermedad + agregar nota clínica |
| **Datos de Entrada** | Caso B: `{ overrideDiagnosis: 'Bronchitis', reason: 'Síntomas no coinciden con Pneumonia' }` · Caso C: `{ adjustedDisease: 'Asthma', clinicalNote: 'Patrón asmático previo' }` |
| **Resultado Esperado (Oráculo)** | Caso A: `status='validated'`, `doctorApproved=true` en MongoDB. Caso B: `status='rejected'`, `overrideDiagnosis` guardado. Caso C: `status='adjusted'`, nota clínica registrada. Todos: notificación enviada al paciente + audit log generado. |
| **Resultado Obtenido** | ✅ CUBIERTO — `web/cypress/e2e/doctor-validation.cy.js` (CP-010-01 a CP-010-10: Caso A aceptar+doctorId+audit, Caso B rechazar+overrideDiagnosis+reason, Caso C ajustar+clinicalNote, error 500 con mensaje reintento). Ejecución: `npx cypress run --spec "cypress/e2e/doctor-validation.cy.js"` |

---

## 9. Infraestructura Científica — Ambientes y Datos Controlados

### 9.1 Ambiente Controlado (Sandbox)

El ambiente de pruebas es una réplica fiel del ambiente de producción, aislada mediante Docker Compose (SWEBOK §5.2.3):

```bash
# Levantar el SUT (System Under Test) para EPIC-03
docker compose -f docker-compose.dev.yml up \
  backend ai-services mongodb redis nginx --build -d

# Verificar salud de todos los servicios
docker compose ps  # todos deben estar 'healthy'

# Sembrar datos de prueba
npm run seed:test --workspace=backend
```

#### Test Doubles (SWEBOK §5.2.3)

| Tipo | Descripción | Uso en EPIC-03 |
|---|---|---|
| Mock | Objeto con comportamiento pre-programado | `MockRandomForest` para TDD unitario |
| Stub | Respuesta cableada sin lógica | Stub del CNN para pruebas de integración |
| Spy | Registra llamadas sin alterar comportamiento | `SpyOnAIClient` para verificar parámetros |
| Fake | Implementación simplificada funcional | `FakeCircuitBreaker` en pruebas de backend |

### 9.2 Gestión de Datos Representativos

#### Clases de Equivalencia para Datos Clínicos

| Perfil Clínico | Características | Cantidad Registros | Uso |
|---|---|---|---|
| Neumonía confirmada | Fiebre alta, tos productiva, disnea | 50 pacientes | Training + Validation |
| Bronquitis aguda | Tos seca, fiebre moderada, sin disnea | 40 pacientes | Training + Validation |
| Asma | Sibilancias, disnea, sin fiebre | 35 pacientes | Training + Validation |
| Paciente sano (control) | Sin síntomas o síntomas leves | 30 pacientes | Prueba de especificidad |

#### Data Masking — Protección PII (SWEBOK §2.2.9 / LPD Perú Art. 3)

```javascript
// scripts/seed/mask-patients.js
const masked = realPatient => ({
  ...realPatient,
  name:  faker.person.fullName(),
  dni:   faker.string.numeric(8),
  dob:   faker.date.birthdate({ min:18, max:80, mode:'age' }),
  phone: faker.phone.number(),
  // sintomas clinicos: SE MANTIENEN (no son PII)
});
```

- **Datos sintéticos para CNN:** Dataset público ESC-50 (INC-01) como sustituto mientras no hay datos reales suficientes.
- **Volumetría para estrés:** 10,000 registros sintéticos con faker para pruebas de carga en MongoDB.

---

## 10. Fase Operativa — Ejecución Dinámica de Pruebas

El ciclo de ejecución comprende **4 fases secuenciales** (SWEBOK V4 §3.3 + ISO 29119-3 §7.4).

### 10.1 Fase 1 — Despliegue en Ambiente (Setup)

```bash
# 1. Cambiar a rama de prueba
git checkout fabian && git pull origin fabian

# 2. Levantar infraestructura completa
docker compose -f docker-compose.dev.yml up -d --build

# 3. Esperar health checks (max 120s)
docker compose ps  # verificar 'healthy' en todos

# 4. Sembrar base de datos con fixture EPIC-03
npm run seed:epic03 --workspace=backend

# 5. Verificar endpoints clave
curl http://localhost:3001/health   # backend
curl http://localhost:8000/health   # ai-services
```

### 10.2 Fase 2 — Ejecución Procedimental

| Orden | Caso | Modo Ejecución | Herramienta |
|---|---|---|---|
| 1 | CP-EPIC03-005 (Circuit Breaker) — Mayor riesgo | Manual + Automatizado | Jest + curl |
| 2 | CP-EPIC03-001 (Flujo nominal) | Automatizado | Jest/Supertest |
| 3 | CP-EPIC03-002 (Validación form) | Automatizado | Jest + Testing Library |
| 4 | CP-EPIC03-003 (Confidence alta) | Automatizado | Pytest |
| 5 | CP-EPIC03-004 (Confidence baja) | Automatizado | Pytest |
| 6 | CP-EPIC03-006 (Audio Android) | **Manual** | Dispositivo físico |
| 7 | CP-EPIC03-007 (CNN válido) | Automatizado | Pytest + audio fixture |
| 8 | CP-EPIC03-008 (Audio corrupto) | Automatizado | Pytest |
| 9 | CP-EPIC03-009 (Panel doctor) | Automatizado | Playwright E2E |
| 10 | CP-EPIC03-010 (Validación doctor) | Automatizado | Playwright E2E |

> **Pruebas exploratorias:** Se aplican heurísticas SFDIPOT durante 30 minutos por módulo (SWEBOK §3.3.2).

### 10.3 Fase 3 — Evaluación (El Oráculo)

- **Oráculo de especificación:** El resultado esperado documentado en cada caso (Sección 8).
- **Oráculo de regresión:** Comparación con el comportamiento de la versión validada en Sprint 1.
- **Oráculo estadístico:** Para el modelo IA: accuracy ≥ 70% medida sobre el conjunto de validación retenido (20% del dataset).

### 10.4 Fase 4 — Automatización e Integración CI

```bash
# Ejecutar suite completa EPIC-03
npm run test:epic03 --workspace=backend   # Jest
pytest tests/epic03/ -v --tb=short        # Pytest
npx playwright test tests/e2e/epic03/     # Playwright

# Reporte de cobertura
npm run coverage:report --workspace=backend
pytest --cov=app --cov-report=html tests/epic03/
```

---

## 11. Trazabilidad y Seguimiento — Ciclo de Vida del Defecto

### 11.1 Definiciones SWEBOK V4 §5.2.5

| Término | Definición SWEBOK | Ejemplo en RespiCare |
|---|---|---|
| Error (Mistake) | Acción humana que produce un resultado incorrecto | Developer codifica confidence como porcentaje (0–100) en vez de fracción (0–1) |
| Defecto (Fault/Bug) | Manifestación de un error en el código | `random_forest.predict_proba()` retorna `[85, 15]` en vez de `[0.85, 0.15]` |
| Falla (Failure) | Comportamiento incorrecto observable en ejecución | UI muestra "85% confianza" y la comparación `> 0.60` falla porque 85 > 0.60 es true pero el valor es erróneo |

### 11.2 Flujo del Ciclo de Vida del Defecto

```
NUEVO → EN ANÁLISIS → CONFIRMADO → ASIGNADO → EN CORRECCIÓN → CORREGIDO
                   ↘ RECHAZADO (no es defecto / duplicado)

CORREGIDO → RE-PROBADO → PASS → CERRADO
                       → FAIL → EN CORRECCIÓN (reabierto)
```

| Estado | Responsable | Criterio de Salida | SLA |
|---|---|---|---|
| NUEVO | QA Lead | Defecto documentado con pasos reproducibles | < 4 horas |
| EN ANÁLISIS | Tech Lead | Causa raíz identificada (5 Whys) | < 8h (crítico < 2h) |
| EN CORRECCIÓN | Dev asignado | Fix en rama `feature/` + unit test que reproduce el defecto | Según severidad |
| CORREGIDO | Dev asignado | PR aprobado y mergeado a `fabian` | — |
| RE-PROBADO | QA Lead | Ejecutar caso original + regresión | < 2h post-deploy |
| CERRADO | QA Lead | PASS en re-test. Prueba de regresión añadida al CI. | — |

### 11.3 Clasificación ODC — Defectos de IA (EPIC-03)

| Tipo ODC | Descripción | Ejemplos en EPIC-03 |
|---|---|---|
| Function | Defecto en lógica de negocio principal | Confidence threshold incorrecto, disease mapping erróneo |
| Algorithm | Defecto en lógica computacional | Error en normalización de features, bug en cross-validation |
| Interface | Incompatibilidad entre módulos | Formato JSON entre backend y FastAPI no coincide |
| Timing/Serialization | Problemas de concurrencia o secuencia | Race condition en circuit breaker bajo alta carga |
| Build/Package/Merge | Defecto introducido en integración | Versión incorrecta de scikit-learn en imagen Docker |

### 11.4 Incidencias Anticipadas — Risk Register EPIC-03

| ID | Incidencia | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| INC-01 | CNN tos: datos de entrenamiento insuficientes | Alta | Alto | Dataset ESC-50 como sustituto temporal |
| INC-02 | Permisos `RECORD_AUDIO` en Android 13+ | Media | Medio | Fallback a MediaRecorder API web |
| INC-03 | Latencia API IA > 5s en 3G | Media | Alto | Spinner + timeout 10s + retry x2 |
| INC-04 | cockatiel incompatible con Node 20 | Alta | Medio | Circuit breaker manual implementado |
| INC-05 | RF confidence < 60% sistemáticamente | Media | Alto | Ajuste hiperparámetros o migrar a XGBoost |

---

## 12. Guía Práctica de Elaboración — Las 4 Fases

### Fase I — Elaboración del Plan Estratégico

- **Alcance definido:** EPIC-03 completa (HU-03.1, HU-03.2, HU-03.3). Excluidas EPIC-01/02 (validadas) y EPIC-04+ (no desarrolladas).
- **Balance automatización/manual:** 70% automatizado (Jest, Pytest, Playwright, k6) + 30% manual (dispositivo físico Android, exploratorias, usabilidad).
- **Recursos QA:** 1 QA Lead + 3 desarrolladores con responsabilidad de sus pruebas unitarias. Tiempo total: 16 horas para el Sprint 2.
- **Stopping Rules:** Definidas en Sección 5.3.

### Fase II — Establecer Casos de Prueba

| Técnica | Aplicación en EPIC-03 | Casos Generados |
|---|---|---|
| Partición de Equivalencias | Inputs de síntomas (Sección 7.1.1) | CP-001, CP-002 |
| Análisis de Valores Límite | Confidence scores 0.0, 0.59, 0.60, 0.85, 1.0 | CP-003, CP-004 |
| Tabla de Decisión | Flujo predicción (síntomas × disponibilidad IA) | CP-001, CP-005 |
| Prueba de Estado | Circuit breaker: CLOSED→OPEN→HALF-OPEN | CP-005 |
| Exploratoria (SFDIPOT) | Heurísticas sobre módulos de audio y panel doctor | CP-006 a CP-010 |

### Fase III — Ambientes y Selección de Datos

- **Paridad de ambientes:** Docker Compose dev usa las mismas imágenes base que producción. Variables diferenciadas por `.env.test`.
- **Control de versiones:** Scripts de seed versionados en `/scripts/seed/`, reproducibles con `npm run seed:test`.
- **Datos sintéticos:** faker.js genera 10,000 pacientes para pruebas de carga. ESC-50 provee 2,000 muestras de audio.
- **Data masking:** PII enmascarada según `mask-patients.js`. Cumplimiento LPD Perú Art. 3.
- **Aislamiento:** Base de datos de prueba separada: `respicare_test`. Sin acceso a `respicare_prod` desde QA.

### Fase IV — Ejecución Dinámica y Reportes

| Artefacto | Contenido | Generado con |
|---|---|---|
| Test Execution Log | Timestamp, ejecutor, caso, resultado, evidencia | Jest reporter + Pytest JUnit XML |
| Incident Report | Defectos con clasificación ODC | Template Sección 11 |
| Coverage Report | Cobertura por módulo, delta vs. sprint anterior | Istanbul (JS) + Coverage.py (Python) |
| Performance Report | P50/P95 latencias, error rate, throughput | k6 HTML report + Locust stats |
| Test Status Report | Resumen ejecutivo semanal para el docente | Consolidado de los anteriores |

---

## 13. Métricas de Calidad y Telemetría

### 13.1 Dashboard de Métricas — Sprint 2

| Métrica | Referencia | Sprint 1 (Real) | Meta Sprint 2 | Meta Sprint 3 | Herramienta |
|---|---|---|---|---|---|
| Cobertura de pruebas | SWEBOK §3.2 | 49.37% | ≥ 65% | ≥ 80% | Istanbul / Coverage.py |
| Complejidad ciclomática | McCabe CC | Varios > 15 | CC ≤ 10 (nuevos) | CC ≤ 10 global | SonarQube |
| Deuda técnica (horas) | SQALE Model | 4.2 h | ≤ 3 h | ≤ 2 h | SonarQube |
| Duplicación de código | DRY Principle | 8.3% | ≤ 5% | ≤ 3% | SonarQube |
| Accuracy RF (validation) | ISO 25010 §4.2 | N/A (nuevo) | ≥ 70% | ≥ 80% | sklearn metrics |
| Latencia P95 `/predict` | SLA rendimiento | N/A | < 3s (WiFi) | < 3s (WiFi) | k6 / Prometheus |
| Defect Escape Rate | IEEE 1044 | No medido | < 10% | < 5% | GitHub Issues |

### 13.2 Evolución de Cobertura — Hoja de Ruta EPIC-03

```
Cobertura por módulo (meta Sprint 2):

  backend/symptomService.ts     : 49% → 75% (+26%)
  backend/circuitBreaker.ts     : 20% → 80% (+60%)  [critico]
  ai/predict_service.py         : 55% → 70% (+15%)
  ai/cnn_audio_service.py       : 30% → 60% (+30%)  [dificil: requiere audio]
  web/SymptomForm.tsx           : 60% → 75% (+15%)
  web/DoctorDashboard.tsx       : 40% → 70% (+30%)
  ─────────────────────────────────────────────────────
  TOTAL EPIC-03                 : ~42% → 65% (meta)
```

### 13.3 Defect Rate Semanal

| Semana | Encontrados | Resueltos | Acumulado Abiertos | Estado |
|---|---|---|---|---|
| Semana 10 | 8 | 5 | 3 | 🟡 Aceptable |
| Semana 11 | 12 | 10 | 5 | 🟡 Aceptable |
| Semana 12 | 6 | 7 | 4 | 🟢 Mejorando |
| Semana 13 (actual) | — | — | — | ⬜ En ejecución |
| **Meta Semana 13** | ≤ 8 | ≥ 8 | ≤ 4 | 🎯 Objetivo |

### 13.4 Clasificación de Defectos por Severidad (Acumulado Sprint 1)

| Severidad | Descripción | Total | Resueltos | Residuales | Bloqueo |
|---|---|---|---|---|---|
| 🔴 Crítica | Sistema inoperable, pérdida de datos | 1 | 1 | 0 | ✅ Limpio |
| 🟠 Alta | Función principal afectada sin workaround | 4 | 3 | 1 | ⚠️ 1 abierto |
| 🟡 Media | Función afectada con workaround disponible | 9 | 7 | 2 | ✅ Dentro del límite |
| 🟢 Baja | Cosmético o minor usability | 12 | 10 | 2 | ✅ Aceptable |

---

## 14. Dictamen del QA Lead — Conclusión Holística

### 14.1 Las Pruebas como Mitigación de Riesgo

La conclusión fundamental de este plan de pruebas trasciende la búsqueda de errores: **las pruebas de software son, en esencia, un mecanismo de mitigación de riesgo clínico**. En el contexto de RespiCare —un sistema que asiste en el diagnóstico de enfermedades respiratorias en pacientes reales de Tacna— un defecto no detectado no es solo deuda técnica: puede derivar en un diagnóstico erróneo.

Esta realidad eleva el rigor de la QA a una obligación ética. Cada caso de prueba ejecutado, cada punto porcentual de cobertura ganado, cada circuit breaker validado, representa una decisión consciente de no comprometer la seguridad del paciente en aras de la velocidad de entrega.

### 14.2 Síntesis del Sprint 2 — EPIC-03

| Dimensión | Estado al Inicio del Plan | Meta al Final del Sprint 2 |
|---|---|---|
| Cobertura EPIC-03 | ~42% (estimado pre-sprint) | ≥ 65% |
| Casos de prueba documentados | 0 (EPIC-03 nueva) | 10 casos formales + exploratorios |
| Circuit Breaker validado | No (implementación nueva) | CP-EPIC03-005 PASSED |
| Modelo RF accuracy | No medido | ≥ 70% en validación |
| Ambiente sandbox IA | No configurado | Docker Compose EPIC-03 estable |
| Pipeline CI EPIC-03 | Parcial | Tests automáticos en GitHub Actions |

### 14.3 Transición a Semana 14 — Base para Mantenimiento

- **Suite de regresión:** Los casos de EPIC-03 que alcancen estado PASS se convierten en pruebas de regresión permanentes. Cualquier cambio futuro debe pasar esta suite antes de fusionarse.
- **Baseline de métricas:** La cobertura del 65% documentada en el Sprint 2 es el piso a partir del cual el Sprint 3 construye. No se acepta degradación.
- **Conocimiento transferido:** Este plan, archivado en `docs/testing/`, sirve como contrato de calidad para futuros integrantes del equipo que mantengan EPIC-03.
- **EPIC-04 en adelante:** Las lecciones aprendidas (INC-01 a INC-05, ODC classification, circuit breaker manual) informan el diseño de pruebas de las épicas pendientes.

### 14.4 Principio Rector Final

> *"La calidad no se inspecciona: se diseña estructuralmente y se valida matemáticamente."*

El presente plan establece que la QA de RespiCare no es una fase final de validación, sino un proceso continuo integrado desde el primer commit. Shift-Left, TDD, Canary Deployments, métricas DORA y la clasificación ODC de defectos son las herramientas con las que el equipo convierte la calidad de un deseo en una propiedad medible y rastreable del sistema.

---

*Chávez Linares, Cesar Fabian · QA Lead (Rol Simulado) · Código: 2019063854*
*Construcción de Software II · Ciclo X · Junio 2026*
*Universidad Privada de Tacna — Escuela Profesional de Ingeniería de Sistemas*
*Normativa: SWEBOK V4 & ISO/IEC/IEEE 29119-3*