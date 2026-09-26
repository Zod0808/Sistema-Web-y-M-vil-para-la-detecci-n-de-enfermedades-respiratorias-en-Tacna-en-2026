# Plan de Iteración — Sprint 13: API de Interoperabilidad MINSA/SINADEF e Integración Wearables-IA

> Proyecto RespiCare — Sistema Web y Móvil para la detección de enfermedades respiratorias en Tacna
> Sprint 13 de 14 — extensión de alcance sobre las 13 iteraciones originales (Sprint 0 a Sprint 12, ya cerradas)
> **ESTADO: EN EJECUCIÓN** (implementación funcional de backend/ai-services completa; documentación de cierre y despliegue del portal de integración pendientes) — no forma parte del SRS/Visión original (FD02/FD03)

## Control de Versiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| v1.0 | 11/09/2026 | Cesar Fabian Chavez Linares | Plan de Iteración — Sprint 13 (PENDIENTE): API de Interoperabilidad MINSA/SINADEF e Integración Wearables-IA |
| v1.1 | 11/09/2026 | Cesar Fabian Chavez Linares | Actualización de avance: implementación funcional de ambos flujos (API institucional y vitales de wearables como capa de validación clínica), con tests en verde. Documentación de cierre (OpenAPI dedicado, README/ROADMAP/Matriz) pendiente. |

## 1. Información General

| Campo | Valor |
|---|---|
| Laboratorio | Construcción de Software I — Proyecto RespiCare |
| Iteración | Sprint 13 (PENDIENTE): API de Interoperabilidad MINSA/SINADEF e Integración Wearables-IA |
| Fecha Inicio | Semana 27 (planificada) |
| Fecha Fin | Semana 28 (planificada) |
| Líder | Cesar Fabian Chavez Linares |
| Equipo | Product Owner, Scrum Master, 2 Backend Developers (Node.js/TypeScript), 1 Frontend Developer (React), 1-2 AI/ML Engineers (Python/FastAPI), 1 DevOps Engineer (Docker/CI-CD) |

## 2. Objetivo de la Iteración

Cerrar dos brechas identificadas en la revisión de requerimientos, objetivos y avances del proyecto frente al SRS/Visión original: (1) proveer una API institucional para que MINSA/DIRESA Tacna y el Sistema Informático Nacional de Defunciones (SINADEF) puedan enviar y recibir información de RespiCare de forma estandarizada, y (2) conectar los datos de wearables ya capturados en la app móvil con el motor de predicción de IA para enriquecer la precisión diagnóstica. Ninguna de las dos brechas forma parte del alcance original (FD02/FD03); ambas fueron detectadas fuera de los 13 sprints ya cerrados (Sprint 0 a Sprint 12).

## 3. Alcance

**Incluye:**

- API de interoperabilidad MINSA/SINADEF: endpoints REST autenticados (API Key / OAuth2 client credentials) para envío de datos epidemiológicos agregados en formato HL7 FHIR Bundle y recepción de actualizaciones externas (catálogo de centros de salud, alertas sanitarias regionales)
- Documentación OpenAPI 3.0 dedicada para el consumidor externo (portal de integración MINSA/DIRESA)
- Extensión del pipeline backend → ai-services para transmitir señales de wearables (frecuencia cardíaca, SpO2, frecuencia respiratoria) capturadas vía BLE junto con el reporte de síntomas
- Incorporación de features de wearables en el feature engineering de los modelos ML (Random Forest/XGBoost/MLP), con fallback automático al modelo actual si no hay datos disponibles
- Tests de integración end-to-end para ambos flujos nuevos
- Actualización de README.md, ROADMAP y Matriz de Trazabilidad con el nuevo alcance

**Excluye:**

- Entregables de las 13 iteraciones originales (Sprint 0 a Sprint 12), ya cerradas y completadas al 100%; diagnóstico médico definitivo, prescripción de medicamentos y telemedicina en tiempo real (fuera de alcance del proyecto según el SRS).

**Nota de alcance (ajuste durante la ejecución):** el motor de predicción de síntomas (`symptom_ml_analyzer.py`) es un clasificador de texto (TF-IDF + SHAP sobre listas de síntomas), no un modelo tabular entrenado con variables numéricas como feature. Reentrenar los modelos para usar vitales como feature de entrenamiento excedía el alcance razonable de este sprint. Los vitales de wearables se incorporaron en su lugar como una **capa adicional de validación clínica basada en reglas** (extensión del patrón de coherencia médica RF-005, `MedicalValidationRules`), que ajusta confianza y puede escalar la urgencia de una predicción cuando los signos vitales indican riesgo, con degradación automática al comportamiento actual si no hay datos de wearables. Este ajuste no reduce el entregable original (fallback opcional con degradación controlada), solo precisa el mecanismo técnico usado para cumplirlo.

**Nota de trazabilidad (formalización posterior de RF-013/RF-014):** los dos entregables de este sprint se documentaron inicialmente en el SRS/SAD como extensiones de requerimientos preexistentes (RF-002/005/007/008/009). Al cerrar la documentación del sprint se formalizaron como dos requerimientos funcionales propios y dedicados, **RF-013** (interoperabilidad institucional) y **RF-014** (wearables como validación clínica), con sus propios casos de uso (CU-015/CU-016 en el SRS, CU-006/CU-007 en el SAD) y sus propias filas en `Matriz_Trazabilidad_RespiCare.xlsx`. Ambas framings coexisten intencionalmente: RF-013/RF-014 identifican el requerimiento como unidad propia del catálogo, mientras que las extensiones citadas arriba documentan el mecanismo técnico compartido con los módulos preexistentes sobre los que se construyeron.

**Requerimientos Funcionales relacionados** (Documentation/trazabilidad/Matriz_Trazabilidad_RespiCare.xlsx):

- **RF-013**: Interoperabilidad institucional (MINSA/DIRESA/SINADEF) — requerimiento nuevo dedicado a este sprint (FD03 §Tabla de RF; CU-015 en FD03, CU-006 en FD04), formalizado a partir del entregable "API de interoperabilidad MINSA/SINADEF" de esta misma tabla
- **RF-014**: Wearables como capa de validación clínica — requerimiento nuevo dedicado a este sprint (FD03 §Tabla de RF; CU-016 en FD03, CU-007 en FD04), formalizado a partir del entregable de validación de vitales de esta misma tabla
- **RF-005**: Validación de coherencia médica — extensión — validación con vitales de wearables (mecanismo compartido con RF-014)
- **RF-002**: Diagnóstico inteligente de síntomas — extensión — capa de validación con vitales
- **RF-007**: Panel del doctor — monitoreo en tiempo real de vitales del paciente
- **RF-008**: Historial clínico electrónico — extensión — interoperabilidad institucional MINSA/SINADEF (mecanismo compartido con RF-013)
- **RF-009**: Sistema de alertas y notificaciones — asociado temáticamente — alertas sanitarias regionales del API institucional

**Requerimientos No Funcionales relacionados** (FD03-EPIS-Informe SRS de Proyecto.docx, Cuadro de Requerimientos No Funcionales):

- **RNF-008**: Interoperabilidad
- **RNF-004**: Seguridad

## 4. Entregables Esperados

Entregables comprometidos para el Sprint 13 (avance a la fecha):

| Entregable | Descripción | Aceptado |
|---|---|---|
| API de interoperabilidad MINSA/SINADEF | Endpoints REST autenticados por API Key (`InstitutionalApiClient` + header `X-API-Key`, scopes granulares) para exportación epidemiológica agregada, sincronización del catálogo de centros de salud y recepción de alertas sanitarias regionales | Sí |
| Documentación OpenAPI 3.0 dedicada para el consumidor externo (portal de integración MINSA/DIRESA) | Publicado `backend/openapi/institutional-api.yaml` (OpenAPI 3.0.3 independiente del spec interno, cubre los 3 endpoints con esquemas, ejemplos y respuestas de error) | Sí |
| Extensión del pipeline backend → ai-services para transmitir señales de wearables (frecuencia cardíaca, SpO2, frecuencia respiratoria) capturadas vía BLE junto con el reporte de síntomas | Implementado en `symptomAnalyzerController.ts` (`getRecentVitalsForPatient`, ventana de frescura de 6 horas) y `aiIntegration.ts` | Sí |
| Incorporación de features de wearables en el feature engineering de los modelos ML (Random Forest/XGBoost/MLP), con fallback automático al modelo actual si no hay datos disponibles | Incorporados como capa de validación clínica basada en reglas (`MedicalValidationRules.validate_vitals`), no como feature de entrenamiento ML — ver nota de alcance arriba. Fallback automático (`vitals=None`) verificado por tests | Sí (alcance ajustado) |
| Tests de integración end-to-end para ambos flujos nuevos | `institutional.integration.test.ts` (10 tests), `institutionalAuth.test.ts` (8 tests) en backend; `test_medical_validation_rules.py`, `test_symptom_ml_analyzer_endpoints.py` en ai-services — todos en verde | Sí |
| Actualización de README.md, ROADMAP y Matriz de Trazabilidad con el nuevo alcance | README.md (secciones de backend/frontend + nueva subsección "Sprint 13"), `docs/roadmaps/PROJECT_ROADMAP.md` (Fase 18.4 nueva, Fase 22.2 actualizada), `docs/roadmaps/BACKEND_ROADMAP.md` y `docs/roadmaps/AI_SERVICES_ROADMAP.md` (sección Sprint 13 agregada), `Documentation/trazabilidad/Matriz_Trazabilidad_RespiCare.xlsx` (RF-002/RF-005/RF-007/RF-008/RF-009 ampliados con el alcance de Sprint 13; RF-013 y RF-014 agregados como bloques propios de 6 filas cada uno, según la nota de trazabilidad de esta sección) | Sí |

## 5. Cronograma y Actividades

Ceremonias y actividades planificadas para el Sprint 13 (Semana 27 a Semana 28, aún no iniciadas):

| ID | Actividad | Responsable | Inicio | Fin | Estado |
|---|---|---|---|---|---|
| A1 | Sprint Planning | Scrum Master + equipo | Semana 27 | Semana 27 | Pendiente |
| A2 | Desarrollo e implementación | Equipo de desarrollo | Semana 27 | Semana 28 | Pendiente |
| A3 | Code review y testing | Equipo de desarrollo | Semana 28 | Semana 28 | Pendiente |
| A4 | Sprint Review (Demo) | Product Owner + equipo | Semana 28 | Semana 28 | Pendiente |
| A5 | Retrospectiva | Scrum Master + equipo | Semana 28 | Semana 28 | Pendiente |

## 6. Recursos Requeridos

Personal, infraestructura y software requeridos para este Sprint:

- **Equipo**: Product Owner, Scrum Master, 2 Backend Developers (Node.js/TypeScript), 1 Frontend Developer (React), 1-2 AI/ML Engineers (Python/FastAPI), 1 DevOps Engineer (Docker/CI-CD)
- **Infraestructura**: Docker/Docker Compose, MongoDB, Redis, GitHub Actions (CI/CD)
- **Software**: Node.js/TypeScript (backend), Python/FastAPI (ai-services), Capacitor/BLE (mobile)
- **Dependencia externa**: definición de contrato de datos con MINSA/DIRESA Tacna para el endpoint de interoperabilidad (no controlada por el equipo de desarrollo)

## 7. Riesgos y Mitigaciones

Riesgos identificados para el Sprint 13:

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Ausencia de un contrato de datos formal por parte de MINSA/DIRESA para el intercambio de información | Medio | Diseñar el endpoint sobre el estándar HL7 FHIR ya adoptado (fhirService.ts) en vez de un formato ad-hoc, minimizando el riesgo de incompatibilidad futura |
| Heterogeneidad y calidad variable de las señales de wearables entre dispositivos BLE | Medio | Tratar los features de wearables como opcionales en el pipeline de IA, con degradación controlada al modelo sin wearables cuando los datos no estén disponibles o sean de baja calidad |
| Exposición de un endpoint público a un consumidor externo institucional sin controles suficientes | Medio | Autenticación dedicada (API Key/OAuth2 client credentials), rate limiting y logs de auditoría específicos para el tráfico MINSA/SINADEF, separados del resto de la API |

## 8. Criterios de Aceptación

El Sprint 13 se considerará exitoso cuando se cumpla lo siguiente:

- Endpoint MINSA/SINADEF autenticado, documentado en OpenAPI y probado con al menos un caso de envío (export epidemiológico) y uno de recepción (actualización externa)
- Pipeline wearables→IA validado end-to-end (BLE → backend → ai-services → predicción enriquecida) con al menos un caso de prueba
- Tests de integración en verde para ambos flujos
- Cobertura de tests >80% mantenida (DoD del proyecto)
- Documentación actualizada (README, ROADMAP, METODOLOGIA_AGIL_PROYECTO.md, Matriz de Trazabilidad)

## 9. Evidencias

Fuentes documentales que sustentan este Sprint como extensión de alcance:

| Evidencia | Ubicación | Responsable |
|---|---|---|
| Sección "Sprint 13 (Propuesto — Pendiente de Ejecución)" documentada | Documentation/METODOLOGIA_AGIL_PROYECTO.md | Cesar Fabian Chavez Linares |
| Gap de integración institucional MINSA/SINADEF no ejecutado (Fase 4 del Documento de Visión) | Documentation/FD02-EPIS-Informe Vision de Proyecto.docx, §8 | Cesar Fabian Chavez Linares |
| Gap de integración wearables-IA verificado en código (captura BLE en mobile sin consumo en ai-services) | mobile/medical-app (captura BLE) vs ai-services (sin features de wearables) | Cesar Fabian Chavez Linares |
| API institucional MINSA/SINADEF (controlador, autenticación por API Key) | `backend/src/controllers/institutionalController.ts`, `backend/src/middleware/institutionalAuth.ts` | Cesar Fabian Chavez Linares |
| Pipeline de vitales de wearables backend → ai-services | `backend/src/controllers/symptomAnalyzerController.ts` (`getRecentVitalsForPatient`), `backend/src/services/aiIntegration.ts` | Cesar Fabian Chavez Linares |
| Capa de validación clínica basada en reglas con vitales de wearables | `ai-services/services/medical_validation_rules.py` (`validate_vitals`) | Cesar Fabian Chavez Linares |
| Tests de integración end-to-end de ambos flujos | `backend/tests/integration/institutional.integration.test.ts`, `backend/tests/unit/middleware/institutionalAuth.test.ts`, `ai-services/tests/services/test_medical_validation_rules.py`, `ai-services/tests/api/test_symptom_ml_analyzer_endpoints.py` | Cesar Fabian Chavez Linares |

**Evidencia de código (extractos reales verificados del repositorio):**

*Entregable: Extensión del pipeline backend → ai-services para vitales de wearables*

`backend/src/controllers/symptomAnalyzerController.ts` (líneas 29-43):

```typescript
async function getRecentVitalsForPatient(patientId?: string): Promise<SymptomVitalsInput | undefined> {
  if (!patientId) {
    return undefined;
  }

  try {
    const latest = await WearableData.findOne({ patientId }).sort({ timestamp: -1 }).lean();
    if (!latest) {
      return undefined;
    }

    const isFresh = Date.now() - new Date(latest.timestamp).getTime() <= WEARABLE_VITALS_FRESHNESS_MS;
    if (!isFresh) {
      return undefined;
    }
```

*Entregable: API de interoperabilidad MINSA/SINADEF*

`backend/src/controllers/institutionalController.ts` (líneas 39-47):

```typescript
export const getEpidemiologicalExport = asyncHandler(async (req: InstitutionalRequest, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : undefined;
  const data = await institutionalIntegrationService.getEpidemiologicalExport({ days });

  logger.info('Exportación epidemiológica institucional solicitada', {
    clientId: req.institutionalClient?.id,
    clientName: req.institutionalClient?.name,
  });

  res.status(200).json({ success: true, data });
});
```

## 10. Indicadores de Éxito

Métricas que evidenciarán el resultado del Sprint 13 una vez ejecutado:

| Indicador | Meta | Resultado | Estado |
|---|---|---|---|
| Entregables completados | 6/6 | 6/6 completos (100%) | 🟢 Cerrado |
| Story Points | Por estimar en Sprint Planning | N/A | 🔲 Pendiente |
| Definition of Done | Todos los criterios de DoD cumplidos | Tests de integración e2e en verde para ambos flujos; documentación de cierre (OpenAPI dedicado, README/ROADMAP/Matriz de Trazabilidad) completa | 🟢 Cerrado |

## 11. Seguimiento y Control

Ceremonias Scrum planificadas para este Sprint, siguiendo el mismo formato usado en los Sprints 0-12: Daily Standups (15 min, diarios), Sprint Review (demo del incremento) y Retrospectiva (formato Start-Stop-Continue) al cierre del Sprint.

Sprint cerrado: implementación funcional de ambos flujos completa (backend + ai-services), con tests de integración en verde, y documentación de cierre completa (OpenAPI dedicado para el consumidor externo, README, ROADMAP, Matriz de Trazabilidad). Queda como dependencia externa, fuera del control del equipo de desarrollo y no bloqueante para este cierre: gestionar el contrato de datos formal con MINSA/DIRESA Tacna para la puesta en producción del consumo real del API (el endpoint ya está implementado, documentado y probado contra el contrato de datos asumido en este Sprint).

## 12. Lecciones Aprendidas y Cierre

Cierre del Sprint 13:

Sprint identificado como extensión de alcance tras una revisión de requerimientos, objetivos y avances del proyecto frente al SRS/Visión original (FD02/FD03), una vez cerrados los 13 sprints originales (Sprint 0 a Sprint 12, 100% completados). Durante la ejecución se ajustó el mecanismo técnico del entregable de wearables-IA: en vez de reentrenar los modelos ML con vitales como feature (lo cual hubiera requerido rediseñar el pipeline de un clasificador de texto a uno tabular), se optó por una capa de validación clínica basada en reglas que cumple el mismo objetivo funcional (enriquecer la predicción con datos de wearables, con fallback controlado) sin ese costo. Lección: al planificar sprints de integración de nuevas señales en un modelo ML existente, verificar primero la naturaleza del modelo (texto vs. tabular) antes de comprometer "feature engineering" como entregable literal.

Como parte del cierre de documentación se rediseñó también el Panel del médico (`web/src/pages/PatientMonitoringPage.js`) sobre la infraestructura de tiempo real ya existente (WebSocket `/ws/doctor`, `vitalsEmitter.ts`), añadiendo clasificación clínica de 4 niveles (crítico/alto/medio/bajo), tabla de pacientes bajo seguimiento y tendencia de SpO2 de 7 días — verificado extremo a extremo contra una base de datos real. Ese trabajo expuso y corrigió un bug real en `backend/src/dev/medicalHistoriesDev.ts`: el filtrado de `GET /api/v1/medical-histories` para el rol `doctor` usaba incorrectamente el id del propio médico como `patientId`, devolviendo siempre una lista vacía. Lección: la verificación end-to-end contra datos reales (no solo contra mocks) sigue siendo la forma más efectiva de encontrar este tipo de bug de filtrado silencioso.

Con este entregable, el Sprint 13 queda formalmente cerrado: 6/6 entregables aceptados, ambos flujos (interoperabilidad institucional y wearables-IA) probados en verde, y documentación de cierre (OpenAPI dedicado, README, ROADMAP, Matriz de Trazabilidad) completa.
