# Informe de Resultados del Plan de Iteraciones

| Campo | Detalle |
|:---|:---|
| **Proyecto** | RespiCare — Sistema Web y Móvil para la Detección de Enfermedades Respiratorias en Tacna |
| **Asignatura** | Construcción de Software I |
| **Docente** | Mag. Alberto Johnatan Flor Rodríguez |
| **Estándar** | SWEBOK V4 — Fase de Construcción y Planificación de Iteraciones |
| **Estudiante** | Chávez Linares, Cesar Fabian — 2019063854 |
| **Institución** | Universidad Privada de Tacna — EPIS |
| **Fecha** | Julio 2026 |

---

## 1. Introducción

El presente informe documenta los resultados obtenidos durante la ejecución del Plan de Iteraciones del proyecto RespiCare, desarrollado bajo la metodología ágil SCRUM. Se registra, por cada requerimiento del backlog, el estado de construcción alcanzado, las desviaciones de tiempo y esfuerzo respecto a las estimaciones originales, y la decisión de aprobación emitida por el proceso de Aseguramiento de la Calidad del Software (SQA).

La construcción se organizó en dos iteraciones principales. La **Iteración 1 (Sprint 1)** abarcó los módulos de autenticación e historial clínico (EPIC-01 y EPIC-02). La **Iteración 2 (Sprint 2)** —ya ejecutada— abarcó el sistema de diagnóstico inteligente de síntomas respiratorios (EPIC-03), compuesto por 14 tareas técnicas distribuidas en tres historias de usuario.

---

## 2. Resultados — Iteración 1 (Sprint 1)

### Épicas cubiertas: EPIC-01 y EPIC-02

**Capacidad del equipo:** 70 h disponibles  
**Esfuerzo ejecutado:** 39 SP  
**Velocidad registrada:** 39 SP (100 % completado)

| ID Requerimiento | Nombre del Requerimiento | Estado de Construcción | Esfuerzo Estimado | Esfuerzo Real | Desviaciones de Tiempo / Esfuerzo | Decisión de Aprobación SQA |
|:---:|:---|:---:|:---:|:---:|:---|:---:|
| **EPIC-01** | **Autenticación, Roles y Seguridad** | ✅ Completado | 21 SP | 21 SP | Sin desviación. El sistema de autenticación JWT, gestión de roles (Admin, Doctor, Paciente) y middleware de seguridad se entregaron dentro del tiempo planificado. El scaffold inicial con Docker aceleró la configuración del entorno. | ✅ Aprobado |
| HU-01.1 | Registro de usuario con correo y contraseña segura | ✅ Completado | — | — | Sin desviación. Formulario `RegisterPage` implementado con validaciones en frontend y backend (TypeScript + Zod). | ✅ Aprobado |
| HU-01.2 | Inicio de sesión con JWT y refresh tokens | ✅ Completado | — | — | Sin desviación. `LoginPage` y contexto `AuthContext` implementados. Tokens almacenados de forma segura con rotación automática. | ✅ Aprobado |
| HU-01.3 | Control de acceso por roles (RBAC) con rutas protegidas | ✅ Completado | — | — | Sin desviación. Componente `ProtectedRoute` implementado. Redirección automática según rol del usuario autenticado. | ✅ Aprobado |
| **EPIC-02** | **Historial Clínico y Gestión de Pacientes** | ✅ Completado | 18 SP | 18 SP | Sin desviación. Los módulos de historial médico, citas, prescripciones, resultados de laboratorio, consentimientos y derivaciones se entregaron en tiempo. La reutilización de patrones Repository redujo el tiempo de implementación del backend. | ✅ Aprobado |
| HU-02.1 | Visualización del historial clínico del paciente | ✅ Completado | — | — | Sin desviación. `MedicalHistoryPage` implementada con vista cronológica de eventos clínicos. | ✅ Aprobado |
| HU-02.2 | Gestión de citas médicas y agenda | ✅ Completado | — | — | Sin desviación. `AppointmentsPage` implementada con calendario funcional y estados de cita. | ✅ Aprobado |
| HU-02.3 | Gestión de prescripciones médicas | ✅ Completado | — | — | Sin desviación. `PrescriptionsPage` con CRUD completo y validación de campos clínicos. | ✅ Aprobado |
| HU-02.4 | Visualización de resultados de laboratorio | ✅ Completado | — | — | Sin desviación. `LabResultsPage` con soporte de visualización de valores fuera de rango. | ✅ Aprobado |
| HU-02.5 | Gestión de consentimientos informados | ✅ Completado | — | — | Sin desviación. `ConsentsPage` con registro y firma digital de consentimientos. | ✅ Aprobado |
| HU-02.6 | Gestión de derivaciones a especialistas | ✅ Completado | — | — | Sin desviación. `ReferralsPage` implementada con estado de derivación y trazabilidad. | ✅ Aprobado |

---

## 3. Resultados — Iteración 2 (Sprint 2)

### Épica cubierta: EPIC-03 — Sistema de Diagnóstico Inteligente de Síntomas Respiratorios

**Capacidad del equipo:** 70 h disponibles  
**Esfuerzo planificado:** 71 h (1 h sobre capacidad — dentro del buffer de imprevistos)  
**Esfuerzo real ejecutado:** 76 h (+5 h de desviación total)  
**Ruta crítica:** T-01 → T-02 → T-12 → T-13 → T-14 (23 h)

---

### 3.1 Historia de Usuario HU-03.1 — Registro y Análisis de Síntomas

*Como paciente, quiero registrar mis síntomas respiratorios para obtener una predicción preliminar de enfermedad.*

| ID Requerimiento | Nombre del Requerimiento | Dominio | Estado de Construcción | Estimado | Real | Desviaciones de Tiempo / Esfuerzo | Decisión de Aprobación SQA |
|:---:|:---|:---:|:---:|:---:|:---:|:---|:---:|
| **T-01** | Diseñar esquema MongoDB `SymptomRecord` con índices temporales | Base de Datos | ✅ Completado | 2 h | 2 h | Sin desviación. El esquema se definió previamente en el diagrama de clases v1.0, lo que permitió implementar el índice compuesto `{ patientId, createdAt }` sin retrasos. | ✅ Aprobado |
| **T-02** | Endpoint `POST /api/symptoms` con validación Zod | Backend | ✅ Completado | 6 h | 7 h | **+1 h.** La definición de los esquemas Zod para validar 23 campos de síntomas respiratorios tomó más tiempo del estimado. Se añadieron mensajes de error descriptivos para el frontend, lo que extendió el ciclo de revisión de código. Desviación menor, absorbida por el buffer del sprint. | ✅ Aprobado |
| **T-03** | Endpoint `POST /ai/predict/symptoms` con modelo Random Forest en FastAPI | IA (Python) | ✅ Completado | 8 h | 8 h | Sin desviación. El modelo Random Forest pre-entrenado (99.19% accuracy) fue reutilizado directamente del repositorio. La integración con FastAPI siguió el patrón Strategy ya establecido en el servicio de IA, reduciendo el riesgo técnico. | ✅ Aprobado |
| **T-04** | Integrar cliente HTTP Backend → IA con circuit breaker (`cockatiel`) | Backend | ✅ Completado | 4 h | 5 h | **+1 h.** Se detectó una incompatibilidad menor entre la versión de `cockatiel` y Node 20 (INC-04), que requirió actualizar la librería y ajustar la configuración del timeout. La solución fue directa pero consumió tiempo de depuración adicional. | ✅ Aprobado |
| **T-05** | Componente `SymptomForm` en Next.js con pasos guiados | Frontend | ✅ Completado | 5 h | 5 h | Sin desviación. Los componentes base de `shadcn/ui` ya estaban disponibles en el proyecto, lo que aceleró el diseño del formulario multi-paso con validación en tiempo real. | ✅ Aprobado |
| **T-06** | Adaptación de `SymptomForm` para mobile (Capacitor — touch, offline) | Mobile | ✅ Completado | 3 h | 2 h | **−1 h (adelanto).** El equipo mobile tenía experiencia previa con Capacitor 6 del sprint anterior. La reutilización del componente `SymptomForm` web con mínimas adaptaciones CSS redujo el tiempo de implementación. El formulario funciona correctamente en APK Android con soporte offline. | ✅ Aprobado |
| **T-07** | Pruebas unitarias del servicio de predicción | Testing | ✅ Completado | 4 h | 4 h | Sin desviación. El framework Jest ya estaba configurado con los mocks necesarios. La cobertura final fue del 82 % en `symptomService.ts` y 84 % en `predict_service.py`, superando el umbral mínimo del 80 % requerido por el DoD. | ✅ Aprobado |

---

### 3.2 Historia de Usuario HU-03.2 — Análisis de Tos por Audio

*Como paciente, quiero grabar un audio de mi tos para que la IA lo analice y detecte patrones anómalos.*

| ID Requerimiento | Nombre del Requerimiento | Dominio | Estado de Construcción | Estimado | Real | Desviaciones de Tiempo / Esfuerzo | Decisión de Aprobación SQA |
|:---:|:---|:---:|:---:|:---:|:---:|:---|:---:|
| **T-08** | Implementar grabación de audio con `@capacitor/media` y `MediaRecorder API` | Mobile / Frontend | ✅ Completado | 5 h | 6 h | **+1 h.** Los permisos `RECORD_AUDIO` en Android 13+ presentaron comportamiento diferente al documentado (INC-02). Se implementó un fallback automático a `MediaRecorder API` del navegador cuando el permiso nativo es rechazado, lo que incrementó el alcance de la tarea y el tiempo de pruebas en dispositivo físico. | ⚠️ Aprobado con observación |
| **T-09** | Endpoint `POST /ai/predict/cough` con modelo CNN en FastAPI | IA (Python) | ✅ Completado | 10 h | 14 h | **+4 h (desviación principal del sprint).** El modelo CNN requería datos de entrenamiento específicos de patrones de tos que no estaban disponibles en el repositorio (INC-01). Se optó por el dataset público ESC-50 como sustituto temporal para el entrenamiento, lo que demandó tiempo adicional de preprocesamiento de audio, ajuste de hiperparámetros y validación de resultados espectrales. Esta tarea fue el principal cuello de botella del sprint, bloqueando el inicio de T-10 por 2 días hábiles. | ⚠️ Aprobado con observación |
| **T-10** | Flujo completo: grabación → upload → resultado en UI (< 5 s en WiFi) | Frontend / Backend | ✅ Completado | 6 h | 7 h | **+1 h.** La latencia de upload superó los 5 s en red 3G durante pruebas (INC-03). Se implementó un spinner de carga con timeout configurable de 10 s y mecanismo de reintento automático, ajustando la métrica de aceptación a 8 s para red móvil según el DoD aprobado de HU-03.2. Esta tarea inició con retraso de 2 días por dependencia bloqueada con T-09. | ✅ Aprobado |
| **T-11** | Pruebas de integración del flujo audio end-to-end | Testing | ✅ Completado | 3 h | 3 h | Sin desviación. Se crearon tests de integración con archivo de audio mock WAV de 3 segundos. La suite de pruebas cubre: grabación correcta, subida al backend, análisis por la IA y visualización del resultado espectral en UI. | ✅ Aprobado |

---

### 3.3 Historia de Usuario HU-03.3 — Panel del Doctor

*Como doctor, quiero ver las predicciones IA de mis pacientes para validarlas, ajustarlas y agregarlas al historial clínico.*

| ID Requerimiento | Nombre del Requerimiento | Dominio | Estado de Construcción | Estimado | Real | Desviaciones de Tiempo / Esfuerzo | Decisión de Aprobación SQA |
|:---:|:---|:---:|:---:|:---:|:---:|:---|:---:|
| **T-12** | Endpoint `GET /api/patients/:id/predictions` con paginación y filtros | Backend | ✅ Completado | 4 h | 4 h | Sin desviación. El patrón de paginación con cursores ya estaba implementado en el proyecto para otros endpoints. Su reutilización directa mediante el patrón Repository permitió desarrollar los filtros por fecha y enfermedad sin sobrecosto. | ✅ Aprobado |
| **T-13** | Vista `PredictionDashboard` con gráficos de tendencias (Recharts) | Frontend | ✅ Completado | 6 h | 6 h | Sin desviación. Los componentes de Recharts para series temporales ya habían sido utilizados en el módulo de analytics del Sprint anterior, lo que redujo la curva de aprendizaje. El gráfico de confianza IA vs. diagnóstico final quedó funcional con filtros interactivos de fecha. | ✅ Aprobado |
| **T-14** | Validación médica: aceptar / rechazar / ajustar predicción IA | Frontend / Backend | ✅ Completado | 5 h | 5 h | Sin desviación. El flujo CRUD con modal de validación siguió el patrón estándar del proyecto. El endpoint `PATCH /api/predictions/:id/validate` registra la firma del médico y actualiza el historial clínico del paciente en tiempo real. | ✅ Aprobado |

---

## 4. Resumen Consolidado de la Iteración 2

| Métrica | Valor Planificado | Valor Real | Variación |
|:---|:---:|:---:|:---:|
| Horas totales del sprint | 71 h | 76 h | +5 h (+7 %) |
| Tareas completadas | 14 / 14 | 14 / 14 | 0 tareas pendientes |
| Tareas con desviación positiva (retraso) | — | 5 tareas | T-02, T-04, T-08, T-09, T-10 |
| Tareas con desviación negativa (adelanto) | — | 1 tarea | T-06 |
| Tareas sin desviación | — | 8 tareas | T-01, T-03, T-05, T-07, T-11, T-12, T-13, T-14 |
| Cobertura de pruebas alcanzada | ≥ 80 % | 83 % promedio | +3 % |
| Tarea con mayor desviación | — | T-09 | +4 h (+40 %) |
| Desviación total acumulada | 0 h | +5 h | Dentro del buffer permitido |

---

## 5. Resumen Global del Plan de Iteraciones

| ID Requerimiento | Nombre | Iteración | Estado de Construcción | Esfuerzo Estimado | Esfuerzo Real | Desviación | Decisión SQA |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| EPIC-01 | Autenticación, Roles y Seguridad | Sprint 1 | ✅ Completado | 21 SP | 21 SP | 0 | ✅ Aprobado |
| EPIC-02 | Historial Clínico y Gestión de Pacientes | Sprint 1 | ✅ Completado | 18 SP | 18 SP | 0 | ✅ Aprobado |
| EPIC-03 / HU-03.1 | Registro y Análisis de Síntomas | Sprint 2 | ✅ Completado | 28 h | 29 h | +1 h | ✅ Aprobado |
| EPIC-03 / HU-03.2 | Análisis de Tos por Audio | Sprint 2 | ✅ Completado | 24 h | 30 h | +6 h | ⚠️ Aprobado con observación |
| EPIC-03 / HU-03.3 | Panel de Validación del Doctor | Sprint 2 | ✅ Completado | 15 h | 15 h | 0 | ✅ Aprobado |
| EPIC-04 | Módulo de Citas Médicas y Agenda | Sprint 3 | ⏳ Pospuesto | — | — | — | ⏸️ Pendiente |
| EPIC-05 | Sistema de Alertas y Notificaciones Críticas | Sprint 3 | ⏳ Pospuesto | — | — | — | ⏸️ Pendiente |
| EPIC-06 | Integración con Laboratorios Externos (HL7) | Sprint 4 | ⏳ Pospuesto | — | — | — | ⏸️ Pendiente |
| EPIC-07 | Módulo de Emergencias y Ambulancias | Sprint 4 | ⏳ Pospuesto | — | — | — | ⏸️ Pendiente |
| EPIC-08 | Wearables y Monitoreo Continuo (SpO₂ / FC) | Sprint 5 | ⏳ Pospuesto | — | — | — | ⏸️ Pendiente |
| EPIC-09 | Reportes, Analítica y Business Intelligence | Sprint 5 | ⏳ Pospuesto | — | — | — | ⏸️ Pendiente |
| EPIC-10 | Teleconsulta y Chat Médico | Sprint 6 | ⏳ Pospuesto | — | — | — | ⏸️ Pendiente |

---

## 6. Análisis de Desviaciones

### 6.1 Causas de las Desviaciones Registradas en Sprint 2

| ID Incidencia | Tarea Afectada | Causa de la Desviación | Horas de Impacto | Resolución Aplicada |
|:---:|:---:|:---|:---:|:---|
| INC-01 | T-09 | El modelo CNN para análisis de tos requirió datos de entrenamiento específicos no disponibles en el repositorio inicial. El conjunto de datos de tos propietario era insuficiente para alcanzar la precisión requerida. | +4 h | Se utilizó el dataset público ESC-50 como sustituto temporal. Se realizó preprocesamiento de audio con Librosa y reentrenamiento del modelo CNN. Precisión alcanzada: 91.3 % (dentro del umbral aceptable). |
| INC-02 | T-08 | Los permisos `RECORD_AUDIO` en Android 13+ presentaron comportamiento diferente al de versiones anteriores de Android, rechazando la solicitud de permisos en el primer intento sin mostrar el diálogo nativo. | +1 h | Se implementó un fallback automático a `MediaRecorder API` del navegador. Se añadió un mensaje informativo al usuario cuando el micrófono nativo está denegado. |
| INC-03 | T-10 | La latencia de upload en red 3G superó el umbral de 5 s establecido inicialmente en el DoD de HU-03.2, llegando a 6.8 s en condiciones de red real. | +1 h | Se acordó con el equipo ajustar la métrica de aceptación a ≤ 8 s en red móvil 3G, manteniendo el umbral de < 5 s exclusivamente para red WiFi. Se implementó spinner de espera, timeout de 10 s y retry automático. |
| INC-04 | T-02 | Incompatibilidad menor entre `cockatiel` y el ambiente Node 20 del proyecto al actualizar dependencias. | +1 h | Actualización de `cockatiel` a la versión compatible con Node 20. No requirió rediseño del circuit breaker. |
| — | T-02 | La definición de los esquemas Zod para 23 campos de síntomas respiratorios fue más extensa de lo estimado, incluyendo mensajes de error descriptivos para UX. | +1 h | Implementación completada sin cambio de alcance. Absorbida por el buffer del sprint. |

### 6.2 Impacto en la Ruta Crítica

La desviación de **+4 h en T-09** bloqueó el inicio de T-10 durante **2 días hábiles**, dado que T-10 depende de la finalización conjunta de T-08 y T-09. Esto desplazó las pruebas de integración de HU-03.2 hacia los últimos días del sprint, comprimiendo el tiempo disponible para T-11. El buffer de 1 h sobre capacidad, combinado con el adelanto de −1 h en T-06, permitió absorber parcialmente el impacto. El hito de entrega del Sprint 2 se cumplió con una desviación final de +5 h (+7 %), dentro del margen de tolerancia aceptable.

---

## 7. Decisiones de Aprobación SQA

### Criterios de Evaluación Aplicados

| Criterio | Umbral Mínimo | Resultado Sprint 2 | Cumplimiento |
|:---|:---:|:---:|:---:|
| Código sin errores de sintaxis (`tsc --noEmit` + `mypy`) | 0 errores | 0 errores | ✅ |
| Cobertura de pruebas | ≥ 80 % | 83 % promedio | ✅ |
| Build sin romper integración (CI/CD) | Build verde | Build verde* | ✅ |
| API documentada en Swagger (`GET /api/docs`) | 100 % endpoints | 100 % | ✅ |
| Funcionalidad desplegable (Web + APK) | Funcional | Funcional | ✅ |
| Documentación actualizada (diagramas + catálogo pruebas) | v11.0 | v11.0 | ✅ |
| Precisión del modelo IA (CNN tos) | ≥ 90 % | 91.3 % | ✅ |
| Latencia API predicción síntomas | < 3 s WiFi | 2.1 s WiFi | ✅ |

*El build CI/CD presentó un fallo inicial por `node_modules` desactualizado que requirió un paso adicional de actualización de dependencias. Resuelto en el mismo día.

### Decisiones Finales por Historia de Usuario

| Historia de Usuario | Criterios DoD Cumplidos | Observaciones SQA | Decisión Final |
|:---|:---:|:---|:---:|
| **HU-03.1** — Registro y Análisis de Síntomas | 4 / 4 | Todos los criterios del DoD cumplidos. Predicción con confianza ≥ 70 % validada. Guardado en MongoDB y visible en historial clínico confirmado. | ✅ **Aprobado** |
| **HU-03.2** — Análisis de Tos por Audio | 4 / 4 | Se ajustó la métrica de latencia a ≤ 8 s para red 3G (inicialmente 5 s). El dataset CNN utilizado (ESC-50) es temporal; se recomienda reentrenar con datos clínicos reales en Sprint 3 para mejorar la precisión por encima del 95 %. | ⚠️ **Aprobado con observación** |
| **HU-03.3** — Panel del Doctor | 4 / 4 | Todos los criterios del DoD cumplidos. Validación médica con firma registrada en historial. Dashboard de tendencias funcional. | ✅ **Aprobado** |

---

## 8. Lecciones Aprendidas y Ajustes para Sprint 3

| Observación del Sprint 2 | Decisión para Sprint 3 |
|:---|:---|
| T-09 (CNN tos) excedió el estimado en +4 h por dependencia de datos | Reducir la carga de tareas IA de 18 h → 14 h. Priorizar la adquisición de datasets clínicos reales antes del inicio del sprint. |
| El pico de defects en la semana 2 alcanzó 40 bugs detectados | Aumentar las horas dedicadas a testing de 7 h → 10 h por sprint. |
| T-06 (Mobile) terminó en 2 h (estimado: 3 h) | El equipo mobile tiene capacidad disponible; se puede asignar tareas adicionales de adaptación móvil en el Sprint 3. |
| Build CI/CD falló por `node_modules` desactualizado | Agregar una tarea de mantenimiento de dependencias (1 h/sprint) al Sprint 3 para evitar fallos en CI/CD. |
| T-10 fue bloqueado 2 días por T-09 | En tareas con dependencias externas de alto riesgo, iniciar la preparación de la integración en paralelo desde el día 1 del sprint. |

---

## 9. Conclusión

El Plan de Iteraciones del proyecto RespiCare demuestra una ejecución controlada y dentro de los parámetros establecidos por el marco SWEBOK V4. La **Iteración 1** completó EPIC-01 y EPIC-02 al 100 % sin desviaciones, sentando la base técnica del sistema. La **Iteración 2** completó íntegramente las 14 tareas de EPIC-03 con una desviación agregada de +5 h (+7 %), originada principalmente por la complejidad del entrenamiento del modelo CNN (T-09) y las restricciones de permisos de audio en Android 13+ (T-08).

Todas las historias de usuario de la Iteración 2 fueron aprobadas por SQA, con HU-03.2 recibiendo aprobación condicional sujeta a la mejora del modelo CNN con datos clínicos reales en sprints posteriores. La ruta crítica (23 h) fue sostenida sin interrupción permanente, garantizando la entrega del hito de Sprint 2 dentro del plazo acordado.

---

*Documento: RESPICARE-ITER-RESULTADOS-S5 · Estándar: SWEBOK V4 · Iteración: Sprint 1 y Sprint 2 · Fecha: Julio 2026*  
*Elaborado por: Chávez Linares, Cesar Fabian (2019063854)*  
*Revisado por: Mag. Alberto Johnatan Flor Rodríguez*