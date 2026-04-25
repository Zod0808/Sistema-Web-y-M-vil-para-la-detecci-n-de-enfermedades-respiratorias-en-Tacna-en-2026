# Taller Práctico: Deconstrucción Estratégica

| Campo | Detalle |
|:---|:---|
| **Proyecto** | RespiCare — Sistema de Gestión de Enfermedades Respiratorias |
| **Asignatura** | Construcción de Software II · Semana 5 |
| **Docente** | Mag. Alberto Johnatan Flor Rodríguez |
| **Estándar** | SWEBOK V4 — Fase de Construcción y Planificación de Iteraciones |
| **Equipo** | Grupo RespiCare · Universidad Privada de Tacna — EPIS |
| **Fecha** | Abril 2026 · Sprint: Iteración 2 |

---

## Contexto del Proyecto

RespiCare es un sistema integral de gestión de enfermedades respiratorias que combina inteligencia artificial, historial clínico electrónico e integración móvil para asistir a pacientes y médicos en el diagnóstico, monitoreo y tratamiento de patologías respiratorias.

> **Stack tecnológico:** Next.js 14 (Web) · Capacitor 6 (Android APK) · Node.js / TypeScript (Backend) · FastAPI / Python (IA) · MongoDB · Redis

---

## Paso 1 — Selección

> Extraer el elemento de **alta prioridad** del backlog basado en valor de negocio.

### Backlog Completo del Proyecto

| ID | Épica | Estado | Iteración |
|:---:|:---|:---:|:---:|
| EPIC-01 | Autenticación, Roles y Seguridad | ✅ Completado | Sprint 1 |
| EPIC-02 | Historial Clínico y Gestión de Pacientes | ✅ Completado | Sprint 1 |
| **EPIC-03** | **Sistema de Diagnóstico Inteligente de Síntomas Respiratorios** | 🔵 **En curso** | **Sprint 2** |
| EPIC-04 | Módulo de Citas Médicas y Agenda | ⬜ Pendiente | Sprint 3 |
| EPIC-05 | Sistema de Alertas y Notificaciones Críticas | ⬜ Pendiente | Sprint 3 |
| EPIC-06 | Integración con Laboratorios Externos (HL7) | ⬜ Pendiente | Sprint 4 |
| EPIC-07 | Módulo de Emergencias y Ambulancias | ⬜ Pendiente | Sprint 4 |
| EPIC-08 | Wearables y Monitoreo Continuo (SpO₂ / FC) | ⬜ Pendiente | Sprint 5 |
| EPIC-09 | Reportes, Analítica y Business Intelligence | ⬜ Pendiente | Sprint 5 |
| EPIC-10 | Teleconsulta y Chat Médico | ⬜ Pendiente | Sprint 6 |

### Épica Seleccionada para Sprint 2

| Campo | Detalle |
|:---|:---|
| **ID** | EPIC-03 |
| **Nombre** | Sistema de Diagnóstico Inteligente de Síntomas Respiratorios |
| **Prioridad** | 🔴 CRÍTICA |
| **Valor de Negocio** | Diferenciador central: sin IA, RespiCare es solo un historial clínico digital |
| **Impacto** | Pacientes reciben predicción preliminar antes de la consulta, reduciendo diagnósticos tardíos |
| **Riesgo si no se entrega** | La propuesta de valor queda nula — sin IA no hay diferenciación competitiva |

### Justificación de Selección — Criterios de Priorización

| Criterio | Peso | Puntuación | Score |
|:---|:---:|:---:|:---:|
| Impacto en el paciente | 30 % | 10 / 10 | 3.00 |
| Diferenciación del sistema | 25 % | 10 / 10 | 2.50 |
| Dependencia de otros módulos | 20 % | 8 / 10 | 1.60 |
| Complejidad técnica (inverso) | 15 % | 5 / 10 | 0.75 |
| Tiempo de entrega estimado | 10 % | 7 / 10 | 0.70 |
| **TOTAL** | **100 %** | | **8.55 / 10** |

### Árbol de Historias de Usuario

```text
EPIC-03: Sistema de Diagnóstico Inteligente de Síntomas Respiratorios
│
├── HU-03.1  Como paciente, quiero registrar mis síntomas respiratorios
│            para obtener una predicción preliminar de enfermedad.
│
├── HU-03.2  Como paciente, quiero grabar un audio de mi tos
│            para que la IA lo analice y detecte patrones anómalos.
│
└── HU-03.3  Como doctor, quiero ver las predicciones IA de mis pacientes
             para validarlas, ajustarlas y agregarlas al historial clínico.
```

---

## Paso 2 — Descomposición

> Fragmentar el requerimiento en **tareas específicas por dominio técnico**.

### HU-03.1 — Registro y Análisis de Síntomas

| ID | Tarea | Dominio | Entregable Funcional |
|:---:|:---|:---:|:---|
| T-01 | Diseñar esquema MongoDB `SymptomRecord` con índices temporales | 🗄️ Base de Datos | Colección con índice `{ patientId, createdAt }` |
| T-02 | Desarrollar endpoint `POST /api/symptoms` con validación Zod | ⚙️ Backend | API REST documentada en Swagger |
| T-03 | Implementar `POST /ai/predict/symptoms` con modelo Random Forest | 🤖 IA (Python) | Endpoint → `{ disease, confidence, recommendations }` |
| T-04 | Integrar cliente HTTP Backend → IA con circuit breaker | ⚙️ Backend | `AIIntegrationService.predictSymptoms()` |
| T-05 | Diseñar componente `SymptomForm` (Next.js) con pasos guiados | 🌐 Frontend | Formulario con validación en tiempo real |
| T-06 | Adaptar `SymptomForm` para mobile (Capacitor — touch, offline) | 📱 Mobile | Formulario funcional en APK Android |
| T-07 | Escribir pruebas unitarias del servicio de predicción | 🧪 Testing | Cobertura ≥ 80 % en `symptomService.ts` y `predict_service.py` |

### HU-03.2 — Análisis de Tos por Audio

| ID | Tarea | Dominio | Entregable Funcional |
|:---:|:---|:---:|:---|
| T-08 | Implementar grabación con `@capacitor/media` y `MediaRecorder API` | 📱 Mobile / 🌐 Frontend | Componente `AudioRecorder` que guarda WAV local |
| T-09 | Desarrollar `POST /ai/predict/cough` con modelo CNN en FastAPI | 🤖 IA (Python) | Endpoint recibe audio base64 → devuelve análisis espectral |
| T-10 | Conectar flujo: grabación → upload → resultado en UI | 🌐 Frontend / ⚙️ Backend | Flujo completo: grabar → enviar → mostrar resultado en < 5 s |
| T-11 | Pruebas de integración del flujo audio end-to-end | 🧪 Testing | Test de integración con audio mock de 3 segundos |

### HU-03.3 — Panel del Doctor

| ID | Tarea | Dominio | Entregable Funcional |
|:---:|:---|:---:|:---|
| T-12 | Desarrollar `GET /api/patients/:id/predictions` | ⚙️ Backend | API con paginación y filtros por fecha / enfermedad |
| T-13 | Diseñar vista `PredictionDashboard` con gráficos de tendencias | 🌐 Frontend | Dashboard Recharts — confianza IA vs. diagnóstico final |
| T-14 | Implementar validación: doctor acepta / rechaza / ajusta predicción IA | 🌐 Frontend / ⚙️ Backend | `PATCH /api/predictions/:id/validate` + UI modal |

---

## Paso 3 — Estimación de Esfuerzo

> Asignar horas considerando la **capacidad real del equipo**, no un escenario ideal.

### Capacity Planning Widget — Sprint 2 semanas (70 h disponibles)

```text
╔══════════════════════════════════════════════════════════════════╗
║            Capacity Planning — EPIC-03                          ║
╠══════════════╦═════════════════════════════════════╦════════════╣
║ ID · Tarea   ║ Esfuerzo                            ║    Horas   ║
╠══════════════╬═════════════════════════════════════╬════════════╣
║ T-01 MongoDB ║ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     2 h    ║
║ T-02 API POST║ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     6 h    ║
║ T-03 IA pred.║ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     8 h    ║
║ T-04 Circuit ║ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     4 h    ║
║ T-05 Form Web║ █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     5 h    ║
║ T-06 Mobile  ║ ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     3 h    ║
║ T-07 Tests   ║ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     4 h    ║
║ T-08 Audio   ║ █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     5 h    ║
║ T-09 CNN tos ║ ██████████░░░░░░░░░░░░░░░░░░░░░░░░ ║    10 h    ║
║ T-10 E2E flow║ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     6 h    ║
║ T-11 Int.test║ ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     3 h    ║
║ T-12 GET API ║ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     4 h    ║
║ T-13 Dashboard║ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     6 h    ║
║ T-14 Validar ║ █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║     5 h    ║
╠══════════════╬═════════════════════════════════════╬════════════╣
║              ║         LÍMITE CAPACIDAD: 70 h      ║   TOTAL    ║
║              ║  ─────────────────────────────────  ║   71 h ⚠  ║
╚══════════════╩═════════════════════════════════════╩════════════╝
  ⚠ 1 h sobre capacidad → buffer que absorbe imprevistos menores
```

### Tabla de Estimación Detallada

| ID | Tarea | Horas | Riesgo | Mitigación |
|:---:|:---|:---:|:---:|:---|
| T-01 | Esquema MongoDB | 2 h | 🟢 Bajo | Schema definido en diagrama de clases |
| T-02 | Endpoint POST /symptoms | 6 h | 🟡 Medio | Validación Zod puede extenderse |
| T-03 | FastAPI predict/symptoms | 8 h | 🔴 Alto | Modelo pre-entrenado disponible en repo |
| T-04 | Circuit breaker | 4 h | 🟡 Medio | Librería `cockatiel` ya en proyecto |
| T-05 | SymptomForm Web | 5 h | 🟢 Bajo | Componentes base `shadcn/ui` disponibles |
| T-06 | SymptomForm Mobile | 3 h | 🟡 Medio | Requiere prueba en dispositivo físico |
| T-07 | Pruebas unitarias | 4 h | 🟢 Bajo | Framework Jest configurado |
| T-08 | AudioRecorder | 5 h | 🔴 Alto | Permisos RECORD_AUDIO en Android 13+ variables |
| T-09 | FastAPI predict/cough | 10 h | 🔴 Alto | CNN requiere datos de entrenamiento de tos |
| T-10 | Flujo audio E2E | 6 h | 🔴 Alto | Latencia de upload en red móvil 3G |
| T-11 | Tests integración audio | 3 h | 🟡 Medio | Audio mock puede no reflejar casos reales |
| T-12 | GET predictions API | 4 h | 🟢 Bajo | Patrón de paginación ya implementado |
| T-13 | PredictionDashboard | 6 h | 🟡 Medio | Recharts con gráficos de series temporales |
| T-14 | Validación doctor | 5 h | 🟢 Bajo | Flujo CRUD estándar |
| | **TOTAL** | **71 h** | | |

---

## Paso 4 — Mapeo de Secuencia

> Parallelizar el trabajo sin causar **conflictos de integración**.

### Dependency String — Diagrama de Red

```text
 ┌─────────────────────────────────────────────────────────────────────┐
 │  HU-03.1 — Registro y Análisis de Síntomas                         │
 └─────────────────────────────────────────────────────────────────────┘

  D1        D3        D5        D7        D9        D11       D14
  │         │         │         │         │         │         │
  ▼         ▼         ▼         ▼         ▼         ▼         ▼
  ┌───────┐ ┌─────────────────┐ ┌─────────────┐
  │ T-01  │►│     T-02        │►│    T-04     │──────────────────────►
  │  2 h  │ │      6 h        │ │     4 h     │
  └───────┘ └─────────────────┘ └─────────────┘         ┌─────────┐
            ┌───────────────────────────────┐            │  T-07   │►◆
            │             T-03              │───────────►│   4 h   │
            │              8 h              │            └─────────┘
            └───────────────────────────────┘
  ┌─────────────────────────────────────────────┐  ┌──────────┐
  │                   T-05 · 5 h                │►│  T-06    │
  └─────────────────────────────────────────────┘  │   3 h   │
                                                    └──────────┘
  Dependencias fin-a-inicio:
    T-01 → T-02 · T-01 → T-03 · T-02 + T-03 + T-04 → T-07

 ┌─────────────────────────────────────────────────────────────────────┐
 │  HU-03.2 — Análisis de Tos por Audio                               │
 └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐   ┌──────────────────────┐   ┌──────────┐
  │    T-08 · 5 h   │──►│      T-10 · 6 h      │──►│ T-11·3h │►◆
  └─────────────────┘   └──────────────────────┘   └──────────┘
                   ┌────────────────────────────┐
                   │         T-09 · 10 h        │──►(desbloquea T-10)
                   └────────────────────────────┘

  Dependencias fin-a-inicio:  T-08 → T-10 · T-09 → T-10

 ┌─────────────────────────────────────────────────────────────────────┐
 │  HU-03.3 — Panel del Doctor  (inicia después de T-02)              │
 └─────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
  │  T-12 · 4 h  │──►│   T-13 · 6 h    │──►│  T-14 · 5 h │►◆
  └──────────────┘   └──────────────────┘   └──────────────┘

  Dependencias fin-a-inicio:  T-02 → T-12 → T-13 → T-14
```

### Tabla de Dependencias

| Tarea | Depende de | Puede iniciar en paralelo con |
|:---:|:---:|:---|
| T-01 | — *(inicio)* | T-05, T-08, T-09 |
| T-02 | T-01 | T-03 |
| T-03 | T-01 | T-02, T-05 |
| T-04 | T-02, T-03 | T-06 |
| T-05 | — *(inicio)* | T-01, T-08, T-09 |
| T-06 | T-05 | T-04, T-07 |
| T-07 | T-02, T-03, T-04 | T-06, T-11 |
| T-08 | — *(inicio)* | T-01, T-05 |
| T-09 | — *(inicio)* | T-01, T-02, T-05, T-08 |
| T-10 | T-08, T-09 | T-07 |
| T-11 | T-10 | T-07 |
| T-12 | T-02 | T-07, T-10 |
| T-13 | T-12 | T-11 |
| T-14 | T-12, T-13 | T-11 |

### Ruta Crítica — Critical Path

```text
  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
  │  T-01  │──►│  T-02  │──►│  T-12  │──►│  T-13  │──►│  T-14  │──►│   ◆   │
  │   2 h  │   │   6 h  │   │   4 h  │   │   6 h  │   │   5 h  │   │  FIN  │
  └────────┘   └────────┘   └────────┘   └────────┘   └────────┘   └────────┘
                                                      RUTA CRÍTICA = 23 h

  Cuellos de Botella:
  ⚠  T-09 (10 h · CNN tos) — alto riesgo: bloquea T-10 hasta completarse
  ⚠  T-10 (Flujo E2E)      — bloqueado por T-08 Y T-09 simultáneamente
  ⚠  T-04 (Circuit breaker)— desbloquea T-07; no puede retrasarse
```

### Cronograma del Sprint — Gantt 2 Semanas

| Rol | Lun S1 | Mar S1 | Mié S1 | Jue S1 | Vie S1 | Lun S2 | Mar S2 | Mié S2 | Jue S2 | Vie S2 |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Backend** | T-01 | T-02 | T-02 | T-04 | T-04 | T-12 | T-12 | T-14 | T-14 | buffer |
| **IA** | T-03 | T-03 | T-03 | T-09 | T-09 | T-09 | T-09 | T-09 | T-09 | T-09 |
| **Frontend** | T-05 | T-05 | T-08 | T-10 | T-10 | T-13 | T-13 | T-13 | T-07 | T-11 |
| **Mobile** | T-06 | T-06 | — | — | — | — | — | — | T-07 | — |

---

## Paso 5 — El Entregable Funcional

> Una tarea solo está terminada si es un **entregable 100 % funcional** y verificable por el usuario.

### Línea de Tiempo del Sprint

```text
  Día 1                                            Día 14
    │                                                 │
    ├── Semana 1 ────────────────── Semana 2 ─────────┤
    │                                                 │
    │  T-01 T-02 T-03 T-04 T-05 T-06                 │
    │  T-07 T-08 T-09 T-10 T-11                       │
    │  T-12 T-13 T-14                                 │
    │                                                 ◆
    │                                        Hito de Entrega
    │                                        Sprint 2 — EPIC-03
```

### Checklist del Arquitecto — Criterios de Éxito

| # | Criterio | Comando de Verificación | Responsable |
|:---:|:---|:---|:---:|
| ☐ 1 | Código sin errores de sintaxis | `npx tsc --noEmit` · `mypy ai-services/` → 0 errores | Dev |
| ☐ 2 | Cobertura de pruebas ≥ 80 % | `jest --coverage` · `pytest --cov` | QA |
| ☐ 3 | Build sin romper integración | `npm run build` exitoso en CI/CD | DevOps |
| ☐ 4 | Funcionalidad desplegable | APK instalable · Web en `/diagnostico` accesible | Mobile / Frontend |
| ☐ 5 | API documentada en Swagger | `GET /api/docs` muestra nuevos endpoints con ejemplos | Backend |
| ☐ 6 | Documentación actualizada | `diagrama-clases.puml` + `CATALOGO_PRUEBAS.md` v11.0 | Arquitecto |

### Definition of Done — Por Historia de Usuario

**HU-03.1 — El paciente puede diagnosticar síntomas**

- [x] Paciente ingresa síntomas → sistema devuelve predicción con confianza ≥ 70 %
- [x] Resultado visible en Web (Next.js) y Mobile (APK Android)
- [x] Predicción guardada en MongoDB y visible en historial clínico
- [x] Tiempo de respuesta < 3 segundos en red WiFi

**HU-03.2 — El paciente puede analizar su tos**

- [x] Paciente graba audio (mín. 3 s) → IA devuelve análisis espectral
- [x] Funciona en Chrome (Web) y Android 10+ (APK)
- [x] Funciona en red 3G (latencia tolerada hasta 8 s)
- [x] Manejo de error si el micrófono está denegado (mensaje claro al usuario)

**HU-03.3 — El doctor valida predicciones IA**

- [x] Doctor ve lista de predicciones de sus pacientes con filtros de fecha
- [x] Puede aceptar, rechazar o ajustar cada predicción desde un modal
- [x] Validación queda registrada en historial con firma del médico
- [x] Dashboard muestra gráfico de confianza IA vs. diagnóstico real

---

## Telemetría del Proyecto — Medición de la Construcción

> *"No se puede controlar lo que no se mide."* — SWEBOK V4

### Métricas de Calidad del Código — Sprint 2

| Métrica | Valor Inicial | Meta Sprint | Herramienta |
|:---|:---:|:---:|:---:|
| Complejidad Ciclomática Promedio | 12 | ≤ 10 | SonarQube |
| Cobertura de Pruebas | 49.37 % | ≥ 65 % | Jest + Pytest |
| Deuda Técnica Acumulada | 4.2 h | ≤ 3 h | SonarQube |
| Duplicación de Código | 8.3 % | ≤ 5 % | SonarQube |
| Líneas de Código Nuevas (Sprint) | — | ≈ 1 800 LOC | Git diff |

### Tasa de Fallos — Defect Rate por Semana

```text
  Bugs
   50 │
   40 │         ▓▓▓▓
   30 │  ▓▓▓▓   ▓▓▓▓                    ▓▓▓▓ Encontrados
   25 │  ▓▓▓▓   ▓▓▓▓   ░░░░
   20 │  ▓▓▓▓   ▓▓▓▓   ░░░░   ▓▓▓▓     ░░░░ Resueltos
   15 │  ░░░░   ░░░░   ░░░░   ░░░░
   10 │  ░░░░   ░░░░   ░░░░   ░░░░    ░░░░
    0 └──────────────────────────────────────
        SEM 1  SEM 2  SEM 3  SEM 4   META

  Objetivo: cerrar el sprint con resueltos ≥ encontrados
```

### Burn-down Chart — Horas Restantes Sprint 2

```text
  Horas
   71 ● ─────────────────────── Inicio Sprint
      │ ╲
   57 │  ╲ ● ─── Planificado
      │   ╲ ╲
   43 │    ╲  ● ─ ─ ─ ─ ─ ─ ─  Ejecutado (actualizar c/día)
      │     ╲  ╲
   28 │      ╲   ●
      │       ╲   ╲
   14 │        ╲    ●
      │         ╲    ╲
    0 │          ╲     ● ────── Hito de Entrega
      └───────────────────────────────────────────
       D1   D3   D6   D9   D12  D14
```

---

## Gestión de Incidencias — Resiliencia Táctica

> Los imprevistos (deuda técnica, dependencias bloqueadas) son inevitables. — SWEBOK V4

### Protocolo: Identificar → Evaluar → Adaptar

```text
  ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
  │   1. IDENTIFICAR     │       │   2. EVALUAR         │       │   3. ADAPTAR         │
  │                      │       │      (Assess)         │       │                      │
  │  Registrar la        │──────►│  Medir el impacto    │──────►│  Reasignar recursos  │
  │  incidencia en el    │       │  en plazos y         │       │  o renegociar el     │
  │  panel al detectarla │       │  viabilidad          │       │  alcance sin romper  │
  │                      │       │  del sprint          │       │  el entregable       │
  └──────────────────────┘       └──────────────────────┘       └──────────────────────┘
```

### Incidencias Anticipadas — EPIC-03

| ID | Incidencia | Prob. | Impacto | Plan de Adaptación |
|:---:|:---|:---:|:---:|:---|
| INC-01 | CNN tos (T-09) requiere más datos de entrenamiento | 🔴 Alta | T-09 +4 h → retrasa T-10 | Usar dataset público ESC-50 como sustituto temporal |
| INC-02 | Permisos `RECORD_AUDIO` rechazados en Android 13+ | 🟡 Media | T-08 bloqueado | Fallback a grabación web con `MediaRecorder API` |
| INC-03 | Latencia API IA > 5 s en red 3G | 🟡 Media | UX degradada | Spinner + timeout 10 s + retry automático |
| INC-04 | `cockatiel` incompatible con Node 20 | 🟢 Baja | T-04 rediseño +2 h | Implementación manual del circuit breaker |
| INC-05 | Random Forest confianza < 60 % | 🟡 Media | HU-03.1 sin valor | Ajustar hiperparámetros o migrar a XGBoost |

---

## El Lazo de Retroalimentación Empírica

> Los datos telemétricos del Sprint actual **alimentan directamente** el plan del siguiente.

```text
             ┌──────────────────────────────────────────────────────┐
             │          Control Empírico del Proceso                │
             └──────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           │                           │
  ┌───────────────┐                   │                   ┌───────────────┐
  │ PLANIFICACIÓN │◄──────────────────┘                   │   MEDICIÓN    │
  │   Sprint 3    │   Velocidad ajustada                  │  Telemetría   │
  │               │   según datos reales                  │               │
  └───────┬───────┘                                       └───────▲───────┘
          │                                                       │
          ▼                                                       │
  ┌───────────────┐                                               │
  │ CONSTRUCCIÓN  │───── Defect Rate · Burn-down · Complejidad ───┘
  │   Sprint 2    │
  │  14 tareas    │
  │    71 h       │
  └───────────────┘
```

### Ajuste de Velocidad — Lecciones para Sprint 3

| Observación del Sprint 2 | Decisión para Sprint 3 |
|:---|:---|
| T-09 real > estimado (+4 h) | Reducir carga IA de 18 h → 14 h |
| Defect Rate semana 2 pico en 40 bugs | Aumentar horas de testing: 7 h → 10 h |
| T-06 Mobile terminó en 2 h (estimado 3 h) | Equipo mobile disponible para tareas adicionales |
| Build CI/CD falló por `node_modules` desactualizado | Agregar tarea de mantenimiento de dependencias (1 h/sprint) |

---

## Trazabilidad SWEBOK — Garantía de Calidad

> Al finalizar el sprint, la **documentación debe evolucionar junto con el software**.

| Artefacto | Versión Actual | Actualización Requerida | Responsable |
|:---|:---:|:---|:---:|
| `docs/diagrama-clases.puml` | v1.0 | Agregar `SymptomRecord`, `CoughAnalysis`, `AIPrediction` | Arquitecto |
| `docs/diagrama-casos-de-uso.puml` | v1.0 | Verificar `UC_AI_SYM`, `UC_AI_COUGH`, `UC_AI_PRED` cubiertos | Arquitecto |
| `docs/CATALOGO_PRUEBAS.md` | v10.0 | → v11.0: sección pruebas IA (AI-01 a AI-14) | QA Lead |
| `README.md` | v1.0.17 | Documentar `/api/symptoms` y `/api/predictions` | Backend Dev |
| `backend/src/routes/` | — | Verificar rutas nuevas registradas en `index.ts` | Backend Dev |
| `ai-services/coverage.xml` | 49.37 % | Actualizar tras `pytest --cov` final del sprint | IA Dev |

---

*Documento ID: RESPICARE-TALLER-ITER-S5 · Estándar: SWEBOK V4 · Sprint: Iteración 2 · Revisión: 2.0*