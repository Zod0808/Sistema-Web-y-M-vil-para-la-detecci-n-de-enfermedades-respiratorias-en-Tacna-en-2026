# Informe de Taller Práctico: Árbol de Decisión Estratégica

| Campo | Detalle |
|:---|:---|
| **Proyecto** | RespiCare — Sistema Web y Móvil para la Detección de Enfermedades Respiratorias en Tacna |
| **Asignatura** | Construcción de Software I |
| **Docente** | Mag. Alberto Johnatan Flor Rodríguez |
| **Estándar** | SWEBOK V4 — Selección de Proceso de Calidad de Software |
| **Estudiante** | Chávez Linares, Cesar Fabian — 2019063854 |
| **Institución** | Universidad Privada de Tacna — EPIS |
| **Fecha** | Abril 2026 |

---

## 1. Introducción

La elección de un proceso de calidad no es una decisión administrativa: es una decisión de ingeniería. Aplicar el modelo equivocado produce un costo doble: la burocracia del proceso que no encaja y la ausencia de las salvaguardas que el proyecto realmente necesita. El **Árbol de Decisión Estratégica** propuesto en SWEBOK V4 es una herramienta de diagnóstico que dirige al equipo hacia el proceso de calidad más eficiente para su contexto específico, evitando tanto el exceso de proceso como su omisión.

El presente informe aplica este árbol al proyecto RespiCare, evaluando sistemáticamente cada nodo de decisión con evidencia extraída del propio sistema, y concluye con la justificación del proceso adoptado y la demostración de cómo sus prácticas se manifiestan en los artefactos reales del proyecto.

---

## 2. El Árbol de Decisión Estratégica

```text
  ┌────────────────────────────────────────────────────────────────────────────┐
  │         ÁRBOL DE DECISIÓN ESTRATÉGICA — Proceso de Calidad de Software     │
  └────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  NODO 1                                                                 │
  │  ¿Es un sistema crítico para la seguridad/vida o está altamente         │
  │  regulado? (Ej. DO-178C, FDA 21 CFR Part 11, IEC 62304)                │
  └─────────────────────────────────────────────────────────────────────────┘
              │ SÍ                                   │ NO
              ▼                                       ▼
  ┌───────────────────────┐             ┌─────────────────────────────────────────┐
  │  → CMMI Nivel 3+      │             │  NODO 2                                 │
  │  Priorizar:           │             │  ¿El equipo tiene más de 5 miembros     │
  │  - Cumplimiento       │             │  interactuando en el mismo código base? │
  │  - Auditoría          │             └─────────────────────────────────────────┘
  │  - Trazabilidad       │                       │ SÍ                  │ NO
  │  - Formal reviews     │                       ▼                     ▼
  └───────────────────────┘         ┌─────────────────────┐  ┌──────────────────────────┐
                                    │  → Agile Quality     │  │  NODO 3                  │
                                    │    + PDCA            │  │  ¿Es un esfuerzo en      │
                                    │  Priorizar:          │  │  solitario o módulo      │
                                    │  - CI/CD             │  │  altamente aislado que   │
                                    │  - Peer reviews      │  │  requiere precisión      │
                                    │  - Automatización    │  │  técnica profunda?       │
                                    └─────────────────────┘  └──────────────────────────┘
                                                                     │ SÍ        │ NO
                                                                     ▼           ▼
                                                          ┌──────────────┐   ┌──────────┐
                                                          │  → PSP       │   │ Evaluar  │
                                                          │  Priorizar:  │   │ contexto │
                                                          │  - Métricas  │   │ mixto    │
                                                          │    personales│   └──────────┘
                                                          │  - Prevención│
                                                          │    temprana  │
                                                          │    de defectos│
                                                          └──────────────┘
```

---

## 3. Evaluación de Cada Nodo para el Proyecto RespiCare

---

### 3.1 Nodo 1 — ¿Sistema Crítico para la Seguridad / Vida o Altamente Regulado?

#### Análisis

Un sistema es considerado **safety-critical** bajo DO-178C cuando un fallo en el software puede causar directamente la muerte o lesión grave de una persona (aviónica, dispositivos médicos implantables). Un sistema está **altamente regulado** cuando debe cumplir marcos normativos que exigen trazabilidad exhaustiva, auditoría formal de artefactos y certificación por entes externos (FDA 21 CFR Part 11 para software médico en EE.UU., IEC 62304 para dispositivos médicos, HIPAA para datos de salud en EE.UU., LGPD / LPD para datos personales en Perú).

| Criterio | Evidencia en RespiCare | Evaluación |
|:---|:---|:---:|
| ¿Controla directamente dispositivos de soporte vital? | No. El sistema emite **recomendaciones de diagnóstico preliminar**; la decisión clínica final la toma el médico humano. No actúa sobre bombas de infusión, ventiladores ni marcapasos. | ❌ No aplica DO-178C |
| ¿Está sujeto a certificación FDA o IEC 62304? | No. El sistema es una plataforma de **apoyo a la decisión clínica** (Clinical Decision Support Software), categoría excluida de la regulación FDA cuando el clínico puede revisar la recomendación. | ❌ No requiere certificación externa |
| ¿Maneja datos de salud sujetos a regulación de privacidad? | **Sí.** El repositorio incluye `docs/backend/GDPR_HIPAA_POLICY.md` con políticas de cumplimiento activas. Se implementaron JWT, RBAC, audit logs y encriptación de datos de pacientes. | ✅ Parcialmente regulado |
| ¿Las fallas pueden derivar en daño directo al paciente? | Las predicciones del modelo XGBoost (99.81% accuracy) son presentadas como apoyo, no como diagnóstico definitivo. Se incluye una advertencia explícita en la UI: el sistema no reemplaza la consulta médica. | ❌ Riesgo indirecto, no directo |
| ¿El sistema activa protocolos de emergencia autónomos? | No. Los niveles de urgencia (`critical`, `high`, `medium`) emiten notificaciones, pero no despachan ambulancias ni administran medicación. | ❌ No actúa de forma autónoma |

#### Veredicto del Nodo 1

> **NODO 1 → NO (ruta hacia Nodo 2)**

RespiCare **no cumple el umbral de sistema safety-critical al nivel DO-178C** ni está sujeto a certificación regulatoria formal que exija CMMI Nivel 3+. Tiene elementos de regulación de privacidad (HIPAA/LPD) que ya están cubiertos mediante controles técnicos implementados directamente en el código. Un proceso CMMI Nivel 3+ requeriría un equipo dedicado a proceso institucional, gestión de configuración formal con herramientas certificadas, y auditorías externas periódicas; ninguna de estas condiciones existe en un proyecto de construcción académica con un único desarrollador.

**Adoptar CMMI Nivel 3+ en este contexto sería sobreingeniería de proceso**: el costo del proceso superaría al valor del producto.

---

### 3.2 Nodo 2 — ¿El Equipo Tiene Más de 5 Miembros Interactuando en el Mismo Código Base?

#### Análisis

Agile Quality + PDCA (Plan-Do-Check-Act) está diseñado para equipos distribuidos que trabajan sobre la misma base de código con alta frecuencia de integración. Sus mecanismos defensivos (CI/CD obligatorio, revisiones por pares, pull requests) son necesarios cuando múltiples flujos de cambio simultáneos pueden introducir conflictos e inconsistencias de calidad de forma cruzada.

| Criterio | Evidencia en RespiCare | Evaluación |
|:---|:---|:---:|
| ¿Cuántos desarrolladores activos tiene el proyecto? | **1 desarrollador:** Chávez Linares, Cesar Fabian (2019063854). Figura en todos los documentos como único integrante: `FD05`, `FD07`, `Reporte TDD`, `taller-deconstruccion-estrategica.md`. | ❌ 1 miembro (umbral: > 5) |
| ¿Existen múltiples ramas activas con revisores? | El repositorio git muestra la rama `fabian` como rama de trabajo personal. No existe evidencia de ramas de otros colaboradores ni pull requests de pares. | ❌ Sin revisión por pares real |
| ¿Hay conflictos de integración por trabajo paralelo? | No aplica. Un solo desarrollador trabaja secuencialmente sobre los módulos. | ❌ No hay integración paralela |
| ¿El equipo realiza Daily Standups con múltiples miembros? | El documento FD07 define el Daily Standup como ceremonia, pero el equipo de desarrollo es el estudiante. El "Scrum Master" es el docente (rol supervisor, no desarrollador). | ❌ Standup unipersonal |

#### Veredicto del Nodo 2

> **NODO 2 → NO (ruta hacia Nodo 3)**

Con **un único desarrollador**, el modelo Agile Quality + PDCA pierde sus mecanismos más valiosos: la revisión por pares, la integración continua multi-rama y la detección de inconsistencias cruzadas entre contributors. El ciclo PDCA aplicado en solitario degenera en un proceso de monólogo donde el mismo autor que introduce el defecto también lo revisa, eliminando el principal valor del modelo.

Aunque el proyecto usa prácticas de CI/CD (GitHub Actions) y automatización de pruebas, **estas son herramientas, no el proceso Agile Quality + PDCA completo**, que requiere la dimensión social del equipo para operar correctamente.

---

### 3.3 Nodo 3 — ¿Es un Esfuerzo en Solitario o un Módulo Altamente Aislado que Requiere Precisión Técnica Profunda?

#### Análisis

El **PSP (Personal Software Process)** fue diseñado por Watts Humphrey específicamente para ingenieros individuales que trabajan sobre código complejo donde la calidad depende fundamentalmente de la disciplina personal. Sus mecanismos son: estimación de tamaño y tiempo a nivel personal, registro de defectos por el propio desarrollador, análisis de densidad de defectos propia, y aplicación de checklists de revisión personal previos al commit.

| Criterio | Evidencia en RespiCare | Evaluación |
|:---|:---|:---:|
| ¿Único desarrollador? | Sí. Toda la construcción fue realizada por 1 persona. | ✅ Aplica PSP |
| ¿Requiere precisión técnica profunda? | Sí. El proyecto integra: modelos XGBoost/CNN, arquitectura de microservicios, Clean Architecture, 12+ patrones de diseño, FastAPI asíncrono, Capacitor 6, MongoDB aggregation. La precisión técnica en cada módulo es crítica para la coherencia del sistema. | ✅ Alta profundidad técnica |
| ¿El desarrollador registra métricas personales de tiempo y esfuerzo? | Sí. En `taller-deconstruccion-estrategica.md` se documentan estimaciones de esfuerzo por tarea (T-01: 2h, T-02: 6h … T-14: 5h). El Capacity Planning Widget registra el total: 71h planificadas vs. 70h disponibles. | ✅ Métricas personales registradas |
| ¿Se aplica prevención temprana de inyección de defectos? | Sí. TDD aplicado en el `Reporte de Laboratorio Nº 04`: ciclo Red-Green-Refactor aplicado en todos los microservicios antes de la implementación funcional. | ✅ Prevención temprana (TDD) |
| ¿El desarrollador lleva registro personal de defectos? | Sí. `RESUMEN_ERRORES_PENDIENTES.md`, `TESTS_PROBLEMATICOS.md` y `TEST_FIXES_PROGRESS.md` son bitácoras personales de defectos detectados y su estado de resolución. | ✅ Registro personal de defectos |
| ¿Existen estimaciones históricas para ajustar velocidad? | Sí. El `taller-deconstruccion-estrategica.md` incluye una tabla de ajuste de velocidad: lecciones observadas en Sprint 2 → decisiones para Sprint 3 (T-09 real > estimado → reducir carga IA en siguiente sprint). | ✅ Aprendizaje basado en datos propios |

#### Veredicto del Nodo 3

> **NODO 3 → SÍ**

RespiCare cumple plenamente las condiciones del tercer nodo: es un **esfuerzo en solitario de alta exigencia técnica**. El PSP es el proceso correcto.

---

## 4. Conclusión del Árbol de Decisión: PSP como Proceso Adoptado

```text
  Proyecto RespiCare
        │
        ▼
  NODO 1: ¿Sistema safety-critical / altamente regulado?
  → NO (apoyo clínico, no control directo; sin certificación DO-178C / IEC 62304)
        │
        ▼
  NODO 2: ¿Más de 5 miembros en el mismo código base?
  → NO (1 desarrollador: Chávez Linares, Cesar Fabian)
        │
        ▼
  NODO 3: ¿Esfuerzo en solitario con precisión técnica profunda?
  → SÍ (microservicios, ML, arquitectura limpia, Capacitor, 60K+ LOC)
        │
        ▼
  ════════════════════════════
  ►  PROCESO ADOPTADO: PSP  ◄
  ════════════════════════════
     Priorizar:
     - Métricas personales de tiempo y esfuerzo
     - Prevención temprana de inyección de defectos
     - Registro y análisis de densidad de defectos propia
     - Estimaciones históricas y ajuste de velocidad personal
     - Checklists de revisión personal pre-commit
```

---

## 5. Justificación de las Rutas Descartadas

### 5.1 Por qué NO CMMI Nivel 3+

CMMI (Capability Maturity Model Integration) Nivel 3 exige la existencia de **procesos organizacionales definidos**, gestionados por un grupo de proceso institucional (SEPG), con planes formales de proyecto, gestión cuantitativa de procesos, auditorías internas y revisiones de proceso por pares organizacionales. Para RespiCare:

- **No existe una organización** que mantenga activos de proceso más allá del proyecto individual.
- **No hay equipo de proceso** separado del desarrollador.
- **No se requiere certificación externa** que obligue a esta madurez de proceso.
- Adoptar CMMI Nivel 3+ significaría generar documentación de proceso institucional que ningún auditor externo revisará, consumiendo tiempo productivo sin retorno verificable.

Sin embargo, se rescatan **elementos puntuales de CMMI** que sí aportan valor en un contexto médico-regulado:
- Trazabilidad de requerimientos hacia casos de prueba (cubierta por el catálogo de pruebas).
- Gestión de configuración (versionamiento en git con ramas por feature).
- Documentación de política de privacidad (GDPR/HIPAA como `GDPR_HIPAA_POLICY.md`).

### 5.2 Por qué NO Agile Quality + PDCA como proceso primario

Agile Quality + PDCA opera sobre la premisa de que la calidad emerge de la **interacción entre múltiples contribuidores** con perspectivas diferentes. Sus herramientas defensivas más valiosas — pull requests con revisores obligatorios, pair programming, code reviews por pares — pierden su función protectora cuando el revisor y el autor son la misma persona.

El ciclo PDCA (Plan-Do-Check-Act) puede ser ejecutado individualmente, pero sin el componente "Check" realizado por un observador externo con el mismo dominio técnico, el ciclo tiende a confirmar sesgos del desarrollador en lugar de detectarlos.

Dicho esto, RespiCare **sí adopta herramientas de este modelo** como apoyo instrumental:
- **CI/CD con GitHub Actions**: ejecución automatizada de tests en cada push.
- **Jest + pytest con cobertura**: medición automática del 73 % de cobertura global.
- **SonarQube** (planificado): métricas de complejidad ciclomática y deuda técnica.

La diferencia es que estas son **herramientas** dentro de PSP, no el proceso Agile Quality + PDCA completo.

---

## 6. PSP Aplicado a RespiCare: Evidencia Concreta por Práctica

El PSP define un conjunto de prácticas que deben ser evidenciables en los artefactos del proyecto. A continuación se demuestra que cada práctica PSP central tiene correspondencia directa en RespiCare.

### 6.1 Estimación de Tamaño y Tiempo (PSP Planning)

PSP exige que el desarrollador registre estimaciones de tamaño y tiempo **antes** de iniciar cada tarea, para construir una base histórica de calibración.

**Evidencia en RespiCare:**

| Tarea | Estimación PSP (antes) | Real (después) | Desviación registrada |
|:---:|:---:|:---:|:---:|
| T-01 — Esquema MongoDB | 2 h | 2 h | 0 h |
| T-02 — Endpoint POST /symptoms | 6 h | 7 h | +1 h |
| T-03 — FastAPI Random Forest | 8 h | 8 h | 0 h |
| T-06 — SymptomForm Mobile | 3 h | 2 h | −1 h |
| T-09 — CNN predict/cough | 10 h | 14 h | +4 h |
| T-14 — Validación doctor | 5 h | 5 h | 0 h |

Fuente: `docs/taller-deconstruccion-estrategica.md` — Capacity Planning Widget y tabla de Estimación Detallada.

**Ajuste de velocidad basado en datos históricos personales** (práctica central de PSP):
> *"T-09 real > estimado (+4 h) → Reducir carga IA de 18 h → 14 h en Sprint 3."*
> *"T-06 Mobile terminó en 2 h (estimado 3 h) → equipo mobile disponible para tareas adicionales."*

Esta retroalimentación empírica directa al plan del sprint siguiente es PSP puro.

---

### 6.2 Prevención Temprana de Inyección de Defectos (PSP Defect Prevention)

PSP enseña que el costo de un defecto crece exponencialmente según en qué fase se detecta. La práctica más rentable es **prevenir la inyección en el momento de codificación**, no detectarla en testing.

**Evidencia en RespiCare:**

El `Reporte de Laboratorio Nº 04 — TDD` documenta la aplicación del ciclo **Red → Green → Refactor** en los 4 microservicios:

```text
  Microservicio    │ Función                  │ Test primero  │ Luego implementación
  ─────────────────┼──────────────────────────┼───────────────┼──────────────────────
  Backend (TS)     │ calculateSeverityScore   │ ✅ TDD Red     │ Código emergió del test
  AI Services (Py) │ calculate_urgency_level  │ ✅ TDD Red     │ Código emergió del test
  Frontend Web     │ formatSymptoms           │ ✅ TDD Red     │ Código emergió del test
  Mobile (TS)      │ formatDateForDisplay     │ ✅ TDD Red     │ Código emergió del test
```

Escribir el test antes de la implementación **previene la inyección de defectos** porque el desarrollador define el contrato esperado antes de sesgar su mente con los detalles de implementación. Esto es el núcleo de PSP Fase 2 (Personal Quality Plan).

---

### 6.3 Registro Personal de Defectos (PSP Defect Recording)

PSP requiere que el desarrollador lleve un **Defect Recording Log** donde registra cada defecto: tipo, fase de inyección, fase de detección, tiempo de reparación.

**Evidencia en RespiCare:**

Los archivos `ai-services/RESUMEN_ERRORES_PENDIENTES.md`, `ai-services/TESTS_PROBLEMATICOS.md` y `ai-services/docs/TEST_FIXES_PROGRESS.md` constituyen el Defect Recording Log personal del proyecto:

| Artefacto PSP | Archivo en RespiCare | Contenido |
|:---|:---|:---|
| Defect Recording Log | `RESUMEN_ERRORES_PENDIENTES.md` | 6 categorías de defectos: Model Cache, Prediction Monitor, Strategy Factory, XGBoost, Repository, Decorators |
| Defect Type Standard | `TEST_FIXES_PROGRESS.md` | Defectos clasificados por dominio: Patterns, Services, Factories, Repositories, Circuit Breaker, API |
| Defect Resolution Log | `TEST_RESULTS_SUMMARY.md` | Tracking del estado: 436 defectos iniciales → ~10 residuales = 97.7 % corrección |
| Problematic Tests Log | `TESTS_PROBLEMATICOS.md` | Registro de 9 tests bloqueados por entorno (Windows DLL) con plan de diferimiento a CI/CD |

---

### 6.4 Análisis de Densidad de Defectos Personal

PSP define que el desarrollador debe calcular su **densidad personal de defectos** por módulo para identificar los componentes problemáticos y concentrar la prevención futura.

**Evidencia en RespiCare** (calculada en el Informe de Resultados de Pruebas):

| Módulo | LOC | Defectos Encontrados | Densidad Personal (def/KLOC) | Interpretación PSP |
|:---|:---:|:---:|:---:|:---|
| AI Services | 8,700 | 27 únicos (436 fallos de test) | 50.11 → 1.72 (residual) | Módulo de alta complejidad → requiere checklists de review más exhaustivos |
| Backend API | 22,000 | 8 | 0.36 | Módulo estable → prácticas PSP funcionando bien aquí |
| Frontend Web | 12,000 | 7 | 0.58 | Cobertura insuficiente → aumentar inversión en pruebas |
| Mobile | 8,000 | 4 | 0.50 | Controlado → mantener práctica TDD aplicada |

Esta tabla le permite al desarrollador saber **dónde concentrar su prevención personal** en el siguiente ciclo: AI Services requiere mayor disciplina en la escritura de contratos de interfaz antes de implementar.

---

### 6.5 Checklists de Revisión Personal (PSP Code Review Checklist)

PSP establece que antes de cualquier entrega, el desarrollador aplica un **checklist personal de revisión** desarrollado a partir de sus propios defectos históricos.

**Evidencia en RespiCare:**

El documento `docs/taller-deconstruccion-estrategica.md` incluye el **Checklist del Arquitecto — Criterios de Éxito**, que es funcionalmente un checklist PSP personal:

| # | Criterio del Checklist | Comando de Verificación |
|:---:|:---|:---|
| 1 | Código sin errores de sintaxis | `npx tsc --noEmit` · `mypy ai-services/` → 0 errores |
| 2 | Cobertura de pruebas ≥ 80 % | `jest --coverage` · `pytest --cov` |
| 3 | Build sin romper integración | `npm run build` exitoso en CI/CD |
| 4 | Funcionalidad desplegable | APK instalable · Web en `/diagnostico` accesible |
| 5 | API documentada en Swagger | `GET /api/docs` muestra nuevos endpoints |
| 6 | Documentación actualizada | `diagrama-clases.puml` + `CATALOGO_PRUEBAS.md` v11.0 |

Este checklist fue construido a partir de defectos reales del proyecto (los criterios 1, 2 y 3 abordan directamente defectos detectados en sprints anteriores: errores de tipo, cobertura insuficiente, build roto por `node_modules`), lo que lo convierte en un checklist PSP evolucionado.

---

## 7. Elementos Híbridos Adoptados Fuera del PSP Estricto

La realidad del proyecto RespiCare muestra que, aunque PSP es el proceso dominante, existen elementos de otros modelos integrados de forma pragmática. Esto es coherente con SWEBOK V4, que no prohíbe hibridación sino que prioriza el proceso más adecuado al contexto principal.

| Elemento | Modelo de origen | Justificación de adopción en RespiCare |
|:---|:---:|:---|
| Backlog priorizado + sprints de 2 semanas | Agile / SCRUM | Necesario para organizar la entrega académica por iteraciones y comunicar avances al docente (Product Owner). |
| CI/CD con GitHub Actions (ejecución automática de tests) | Agile Quality | Amplifica la detección automática de defectos más allá de la revisión manual personal. |
| Definition of Done por historia de usuario | SCRUM | Marco de aceptación funcional que complementa los criterios de calidad PSP. |
| Documentación de política GDPR/HIPAA | CMMI (elemento de compliance) | Requerido por el dominio médico, aunque no al nivel de auditoría formal CMMI. |
| Burn-down chart + velocidad del equipo | Agile | Herramienta de seguimiento de progreso adaptada al contexto personal. |

---

## 8. Síntesis Final

| Dimensión de Análisis | Evaluación para RespiCare |
|:---|:---|
| **Naturaleza del sistema** | Apoyo a la decisión clínica. Regulado en privacidad (HIPAA/LPD). **No safety-critical** al nivel DO-178C. |
| **Tamaño del equipo** | **1 desarrollador.** Sin colaboración paralela en el código base. |
| **Complejidad técnica** | **Alta.** ML (XGBoost, CNN), microservicios, Clean Architecture, 4 plataformas, 60K+ LOC. |
| **Proceso principal adoptado** | **PSP — Personal Software Process** |
| **Procesos descartados** | CMMI Nivel 3+ (sobredimensionado para 1 persona); Agile Quality + PDCA (requiere equipo ≥ 5 personas) |
| **Prácticas PSP evidenciadas** | Estimación personal T/E por tarea ✅; TDD como prevención temprana ✅; Defect Recording Log ✅; Density analysis personal ✅; Checklist de revisión ✅; Ajuste de velocidad basado en datos propios ✅ |
| **Resultado de calidad alcanzado** | Cobertura global: 73 %; Backend: 98 %; ML accuracy: 99.81 %; Densidad residual: 0.99 def/KLOC (dentro del umbral de calidad para software médico). |

---

## 9. Conclusión

El **Árbol de Decisión Estratégica** aplicado al proyecto RespiCare conduce inequívocamente al **PSP (Personal Software Process)** como proceso de calidad de software principal. La trayectoria del árbol es clara: el sistema no alcanza el umbral de criticidad que justifica CMMI Nivel 3+, el equipo no supera los 5 miembros que activan Agile Quality + PDCA, y en cambio sí cumple ambas condiciones del tercer nodo —esfuerzo en solitario y alta precisión técnica requerida.

La evidencia documental del proyecto confirma que PSP no fue adoptado como etiqueta, sino como práctica real: las estimaciones por tarea, los registros de defectos personales, el análisis de densidad, los checklists de revisión, el ciclo TDD y el ajuste empírico de velocidad son artefactos concretos y verificables en el repositorio. El desarrollador ha construido, iteración tras iteración, una base histórica de datos propios que le permite predecir su desempeño y concentrar su disciplina preventiva en los módulos de mayor riesgo técnico.

Esta es precisamente la promesa del PSP: **convertir al ingeniero individual en el primer y más efectivo control de calidad del sistema**.

---

*Documento: RESPICARE-TALLER-ARBOL-DECISION-S5 · Estándar: SWEBOK V4 · Fecha: Abril 2026*  
*Elaborado por: Chávez Linares, Cesar Fabian (2019063854)*  
*Revisado por: Mag. Alberto Johnatan Flor Rodríguez*