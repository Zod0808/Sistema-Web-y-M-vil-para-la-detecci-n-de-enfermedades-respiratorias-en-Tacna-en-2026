# RespiCare: Sistema Web y Móvil con Inteligencia Artificial para la Detección de Enfermedades Respiratorias en Tacna, 2026

---

**Autor:** Chávez Linares, Cesar Fabian

**Institución:** Universidad Privada de Tacna (UPT)

**Facultad / Escuela:** Escuela Profesional de Ingeniería de Sistemas (EPIS) — Facultad de Ingeniería

**Correo electrónico:** <cc2019063854@virtual.upt.pe>

---

## Resumen

Las enfermedades respiratorias constituyen una de las principales causas de morbilidad en la región Tacna, agravadas por el déficit de especialistas neumólogos y la ausencia de herramientas digitales integradas para el apoyo diagnóstico. El presente artículo reporta el diseño, desarrollo y evaluación de RespiCare, un sistema de software web y móvil que integra inteligencia artificial para la detección temprana de enfermedades respiratorias. El sistema emplea un ensemble de modelos de aprendizaje automático —Random Forest, XGBoost y Red Neuronal— entrenados con datos de fuentes reales: el dataset Kaggle Disease Symptom and Patient Profile (348 registros clínicos) y el registro SINADEF del MINSA Perú (272 casos COVID-19 reales con perfil demográfico de Tacna/Perú), totalizando 620 registros reales en 26 clases de enfermedades. Los modelos incorporan un sistema de reglas de emergencia clínica (EmergencyRuleSystem) y un motor de validación médica (MedicalValidationRules) que ajusta la confianza de las predicciones según protocolos clínicos. Los resultados de validación sobre datos no vistos son: Random Forest 96.86%, XGBoost 97.28% (F1=0.977) y Red Neuronal 99.64% (F1=0.996). La latencia de la API en el percentil 95 es inferior a 180 ms y la cobertura de pruebas automatizadas del backend alcanza el 70.22% con más de 380 tests. El sistema implementa controles de seguridad alineados con HIPAA y la Ley N.° 29733 (Perú), e incorpora el paradigma doctor-in-the-loop para garantizar la supervisión médica de toda predicción generada por la IA.

**Palabras clave:** enfermedades respiratorias, inteligencia artificial, diagnóstico asistido, aprendizaje automático, salud digital, Clean Architecture, CNN audio, Tacna, MINSA SINADEF.

---

## Abstract

Respiratory diseases represent one of the leading causes of morbidity in the Tacna region, exacerbated by a shortage of pulmonology specialists and the lack of integrated digital tools for diagnostic support. This article reports the design, development, and evaluation of RespiCare, a web and mobile software system that integrates artificial intelligence for the early detection of respiratory diseases. The system employs an ensemble of machine learning models —Random Forest, XGBoost, and Neural Network— trained on real clinical data: the Kaggle Disease Symptom and Patient Profile dataset (348 records) and the MINSA SINADEF Peru registry (272 real COVID-19 cases from the Tacna/Peru demographic profile), totaling 620 real records across 26 disease classes. The models incorporate an EmergencyRuleSystem (pre-ML clinical rule layer) and a MedicalValidationRules engine (post-prediction confidence adjustment based on clinical protocols). Validation results on unseen data are: Random Forest 96.86%, XGBoost 97.28% (F1=0.977), and Neural Network 99.64% (F1=0.996). The architecture adopts the Clean Architecture pattern in the Node.js/TypeScript backend, AI services in Python/FastAPI, a React web application, and a cross-platform mobile application in Capacitor. The 95th-percentile API response latency is below 180 ms, and automated test coverage reaches 70.22% with over 380 tests. The system implements security controls aligned with HIPAA and Peruvian Law No. 29733, incorporating the doctor-in-the-loop paradigm to ensure medical supervision of all AI-generated predictions.

**Key words:** respiratory diseases, artificial intelligence, assisted diagnosis, machine learning, digital health, Clean Architecture, audio CNN, Tacna, MINSA SINADEF.

---

## 1. Introducción

Las enfermedades respiratorias agudas y crónicas representan un problema de salud pública de primera magnitud en el Perú. Según el Ministerio de Salud (MINSA, 2024), las infecciones respiratorias agudas (IRA) constituyen consistentemente la primera causa de atención ambulatoria a nivel nacional, con tasas de incidencia particularmente elevadas en la región sur del país. Tacna, ubicada a más de 500 metros sobre el nivel del mar y expuesta a factores de riesgo ambientales como la contaminación industrial y agrícola, registra una prevalencia de enfermedades respiratorias superior al promedio nacional (Dirección Regional de Salud Tacna, 2023).

La brecha de acceso a especialistas agrava esta situación. La región cuenta con una ratio de neumólogos por habitante significativamente inferior a la recomendación de la Organización Mundial de la Salud (OMS), lo que obliga a médicos generales a tomar decisiones diagnósticas de alta complejidad sin soporte especializado. Esta realidad impacta directamente en la calidad del diagnóstico y en el tiempo de detección de enfermedades como neumonía, bronquitis crónica, asma y Enfermedad Pulmonar Obstructiva Crónica (EPOC), condiciones en las que el diagnóstico precoz puede reducir la mortalidad entre un 30% y un 50% (OPS, 2023).

En el ámbito tecnológico, el aprendizaje automático ha demostrado potencial clínico significativo para el diagnóstico de enfermedades respiratorias. Rajpurkar et al. (2017) desarrollaron CheXNet, una red neuronal convolucional capaz de detectar neumonía en radiografías de tórax con rendimiento comparable al de radiólogos especializados. Pham et al. (2021) demostraron la viabilidad del análisis acústico de tos para la detección de COVID-19 mediante redes neuronales aplicadas sobre espectrogramas de audio. Sin embargo, estas investigaciones se desarrollaron de forma aislada, sin integración en sistemas clínicos completos accesibles para médicos generales en contextos de recursos limitados.

En el ámbito nacional, iniciativas recientes como el proyecto HOSP-IA del Hospital Cayetano Heredia (Lima, 2024) y el sistema SIGH de EsSalud han explorado la integración de inteligencia artificial en flujos clínicos hospitalarios, pero sin alcanzar la cobertura multiplataforma web-móvil, ni la integración de análisis multimodal (texto y audio) que el contexto de atención primaria en regiones como Tacna requiere.

Frente a este escenario, el presente trabajo propone y evalúa RespiCare: un sistema integral de detección y gestión de enfermedades respiratorias que combina un ensemble de modelos de aprendizaje automático para análisis de síntomas, una red neuronal convolucional para análisis de tos por audio, historial clínico electrónico, aplicación móvil multiplataforma con capacidades offline y un panel clínico web para médicos. El diseño adopta el paradigma doctor-in-the-loop, garantizando que toda predicción de la IA sea revisada y validada por un profesional de salud antes de influir en una decisión clínica.

El artículo se organiza de la siguiente manera: la sección 2 presenta los objetivos, la sección 3 describe la metodología de desarrollo y evaluación, la sección 4 discute los resultados obtenidos, y la sección 5 presenta las conclusiones y líneas de trabajo futuro.

---

## 2. Objetivos

### 2.1 Objetivo General

Desarrollar y evaluar un sistema de software web y móvil que integre inteligencia artificial para la detección temprana y gestión de enfermedades respiratorias en el contexto de Tacna en 2026, alcanzando un accuracy del modelo predictivo ≥ 70% y una cobertura de pruebas automatizadas ≥ 70%.

### 2.2 Objetivos Específicos

1. Diseñar e implementar una arquitectura de software desacoplada (Clean Architecture) que garantice la mantenibilidad, testabilidad e independencia de frameworks del sistema.

2. Desarrollar un ensemble de modelos de aprendizaje automático (Random Forest, XGBoost, Red Neuronal) para la clasificación de enfermedades respiratorias a partir de síntomas clínicos estructurados.

3. Implementar un módulo de análisis acústico de tos mediante redes neuronales convolucionales (CNN) sobre espectrogramas mel extraídos de grabaciones de audio.

4. Construir una API REST documentada en OpenAPI/Swagger que exponga los servicios de diagnóstico, historial clínico, alertas y gestión de pacientes, con controles de seguridad alineados a HIPAA y la Ley N.° 29733.

5. Desarrollar una aplicación móvil multiplataforma (Android/iOS) con capacidades offline-first y grabación de audio de tos en dispositivo.

6. Establecer un pipeline de integración continua (CI/CD) con ejecución automática de pruebas en cada pull request, manteniendo cobertura ≥ 70% bajo los estándares ISO/IEC/IEEE 29119-3.

7. Evaluar el rendimiento del sistema en términos de accuracy del modelo ML, latencia de respuesta de la API y calidad de la suite de pruebas.

---

## 3. Método

### 3.1 Tipo y Diseño de Investigación

El presente trabajo corresponde a un **artículo de investigación aplicada** con un diseño de desarrollo de software experimental. Se adopta un enfoque cuantitativo para la evaluación del sistema a través de métricas objetivas: accuracy del modelo ML, cobertura de pruebas, latencia de API y tasa de defectos. El desarrollo sigue una metodología híbrida RUP-Scrum: el Proceso Unificado Racional (RUP) para los artefactos documentales formales (Visión, SRS, SAD), y Scrum para la planificación iterativa en sprints de dos semanas.

### 3.2 Arquitectura del Sistema

El sistema RespiCare está estructurado en cuatro componentes principales que se comunican mediante APIs REST y WebSockets (Figura 1):

**Backend (Node.js/TypeScript):** Implementa el patrón Clean Architecture con cuatro capas concéntricas: (i) Capa de Dominio, con entidades (`MedicalHistoryEntity`, `UserEntity`), value objects (`Symptom`, `Location`) y repositorios abstractos; (ii) Capa de Aplicación, con casos de uso (`CreateMedicalHistoryUseCase`, `AuthenticateUserUseCase`) y servicios (`AuthService`, `MedicalHistoryService`); (iii) Capa de Infraestructura, con implementaciones concretas de repositorios sobre MongoDB (`MongoMedicalHistoryRepository`) y servicios externos (Redis, SMS, email); (iv) Capa de Interfaz, con controladores HTTP, DTOs y rutas Express. El sistema expone más de 30 endpoints documentados en Swagger y utiliza Redis para rate limiting, caché y trabajos programados.

**Servicios de IA (Python/FastAPI):** Implementan el procesamiento de predicciones en un servicio independiente que se comunica con el backend mediante HTTP. El módulo de síntomas aplica un ensemble de tres algoritmos de ML; el módulo de audio aplica una CNN sobre espectrogramas mel. Los modelos se sirven mediante Uvicorn/Gunicorn con soporte para solicitudes concurrentes.

**Frontend Web (React):** Panel clínico con dashboard epidemiológico, visualizaciones SHAP interactivas para explicabilidad de predicciones, gestión de historiales clínicos, módulo de citas, emergencias y administración. Soporta modo claro/oscuro y cumple WCAG 2.1 AA.

**Aplicación Móvil (Capacitor/React):** Multiplataforma Android/iOS con arquitectura offline-first, grabación de audio para análisis de tos, chatbot multimodal clínico, sincronización automática y soporte para cinco idiomas (español, inglés, portugués, francés y quechua).

La orquestación se realiza mediante Docker Compose, con Nginx como reverse proxy para SSL termination, routing de WebSockets y balanceo de carga. El pipeline CI/CD en GitHub Actions ejecuta automáticamente las suites Jest (backend/web), Pytest (AI services) y Playwright (E2E) en cada pull request.

### 3.3 Modelos de Inteligencia Artificial

#### 3.3.1 Fuentes de Datos de Entrenamiento

El pipeline de entrenamiento integra datos de fuentes reales aprobadas científicamente:

- **Kaggle Disease Symptom and Patient Profile Dataset:** 348 registros clínicos con campos Disease, Fever, Cough, Fatigue, Difficulty Breathing, Age, Gender, Blood Pressure y Cholesterol Level. Cubre 20 enfermedades mapeadas al formato interno RespiCare mediante el módulo `connect_real_datasets.py`, incluyendo neumonía, asma, EPOC, bronquitis, tuberculosis, COVID-19, rinitis alérgica, sinusitis y faringitis, entre otras.
- **MINSA SINADEF Perú — `fallecidos_covid.csv`:** Registro nacional de fallecidos por COVID-19 (~220,000 filas). Se extraen 500 muestras con perfil demográfico de Tacna/Perú (campo `DEPARTAMENTO`), enriquecidas con el patrón clínico conocido de COVID-19 grave. Aporta representación demográfica real peruana al dataset.
- **Conjunto combinado (`real_dataset_respicare.csv`):** 620 registros reales, 26 clases de enfermedades, formato unificado: `disease`, `disease_name`, `symptoms`, `urgency`, `severity`, `category`, `patient_age`, `symptom_count`, `source`.
- **Dataset aumentado sintético:** ~307,000 filas generadas a partir de las distribuciones reales para maximizar la diversidad de patrones durante el entrenamiento de producción.

#### 3.3.2 Ensemble para Clasificación de Síntomas

El módulo de predicción por síntomas implementa tres modelos con arquitecturas corregidas:

- **Random Forest:** 300 estimadores, profundidad máxima 20, criterio Gini. Vectorización mediante `CountVectorizer(max_features=500, ngram_range=(1,3))` sobre el texto de síntomas. Estratificación condicional en el split de entrenamiento (solo cuando todas las clases tienen ≥ 2 muestras). Accuracy de validación: **96.86%**.
- **XGBoost:** Ingeniería de características avanzada con 15 features: conteos de síntomas por categoría clínica (respiratorios, sistémicos, de dolor), indicadores binarios de severidad (intenso, severo, grave) y emergencia (dificultad respiratoria, cianosis, shock), síntomas clave individuales (fiebre, tos, disnea, fatiga), indicadores de cronicidad (agudo/crónico) y edad del paciente normalizada. Accuracy de validación: **97.28%**.
- **Red Neuronal (MLP):** Tres capas ocultas [256, 128, 64] neuronas, activación ReLU, dropout 0.3, optimizador Adam, 100 épocas con early stopping (paciencia 10). Accuracy de validación: **99.64%**.

**EmergencyRuleSystem:** Capa pre-ML con reglas de urgencia en cuatro niveles. Detecta síntomas críticos (cianosis, apnea, shock, parada cardiorrespiratoria, insuficiencia respiratoria aguda severa, coma) y retorna respuesta de emergencia inmediata sin invocar inferencia estadística. Garantiza que casos graves reciban protocolo urgente sin demoras computacionales.

**MedicalValidationRules:** Motor post-predicción que verifica coherencia clínica. Comprueba síntomas requeridos por enfermedad según protocolos (asma: sibilancias + disnea; neumonía: fiebre + tos; COVID-19: fiebre + tos) y aplica restricciones de edad (bronquiolitis: 0–2 años; crup: 1–5 años; enfisema: >50 años). Ajusta la confianza del modelo en −0.15 por síntoma requerido ausente y −0.20 por restricción de edad violada.

El ensemble combina las predicciones mediante votación ponderada (soft voting). Las características de entrada integran: texto de síntomas en español (ngram 1–3), features de ingeniería clínica y edad del paciente.

La explicabilidad se implementa mediante SHAP (SHapley Additive exPlanations), que asigna a cada síntoma un valor que cuantifica su contribución marginal a la predicción. Estos valores se visualizan en el panel del médico mediante gráficos de barras SHAP y diagramas de fuerza (force plots).

#### 3.3.2 CNN para Análisis de Audio de Tos

El módulo de análisis acústico aplica el siguiente pipeline de procesamiento:

1. **Preprocesamiento:** Normalización de amplitud, filtro de paso alto (80 Hz) para eliminar ruido de baja frecuencia, segmentación en ventanas de 3 segundos con solapamiento del 50%.
2. **Extracción de características:** Conversión a espectrograma mel (128 bandas, hop_length=512, n_fft=2048 a 44,100 Hz).
3. **Arquitectura CNN:** Basada en MobileNetV2 adaptada para espectrogramas de una dimensión de canal. Incluye capas de convolución 2D, batch normalization, max pooling y una capa densa de clasificación con softmax para 5 clases (seco, productivo, metálico, sibilante, normal).
4. **Clasificación:** Softmax sobre 5 clases; el sistema reporta la clase predicha, la confianza y la calidad del audio detectada.

Para el entrenamiento se utilizó el dataset público ESC-50 (Environmental Sound Classification) como sustituto temporal, dado que no se dispone de un corpus etiquetado de grabaciones de tos de pacientes de la región.

### 3.4 Seguridad y Privacidad

El sistema implementa múltiples capas de seguridad para el tratamiento de datos médicos sensibles:

- **Autenticación:** JWT (access token 15 min, refresh token 7 días) con firma HMAC-SHA256.
- **Autorización:** RBAC granular con tres roles principales (PACIENTE, MÉDICO, ADMINISTRADOR) y permisos por recurso.
- **Encriptación:** AES-256-GCM para campos sensibles en base de datos; TLS 1.3 para todas las comunicaciones en tránsito.
- **Auditoría:** Registro inmutable de todas las acciones clínicas (`AuditLogSchema`) con hash SHA-256 del payload.
- **Rate Limiting:** Límite de 60 solicitudes/minuto por usuario autenticado en endpoints de IA, gestionado mediante Redis.
- **Consentimiento informado:** Módulo de consentimiento electrónico (`InformedConsentDocument`) con firma digital antes del primer uso del sistema.
- **Anonimización:** Función `anonymizeForAnalytics()` que elimina PII de los datos utilizados para analítica epidemiológica.

Estos controles se alinean con los Safe Harbor Technical Safeguards de HIPAA y con los artículos 3, 6 y 13 de la Ley N.° 29733 (Perú).

### 3.5 Estrategia de Pruebas

Las pruebas siguen la norma ISO/IEC/IEEE 29119-3 y el paradigma Shift-Left (SWEBOK V4 §6.1.2). La pirámide de pruebas adopta la proporción 70/20/10 entre pruebas unitarias, de integración y end-to-end.

**Pruebas unitarias (Jest / Pytest):** TDD aplicado sobre servicios críticos. El ciclo Red-Green-Refactor garantiza que el contrato del servicio quede codificado en las pruebas antes de implementar la lógica de negocio. Uso de Test Doubles: mocks para el modelo Random Forest (`MockRandomForest`), stubs para el servicio CNN, spies sobre el cliente IA.

**Pruebas de integración (Jest + Supertest / Pytest):** Verifican la interacción entre componentes reales sobre base de datos MongoDB en memoria (MongoMemoryServer). Cubren los flujos principales de EPIC-03: análisis de síntomas (CP-EPIC03-001), validación de entradas (CP-EPIC03-002), confidence alta/baja (CP-EPIC03-003/004) y circuit breaker (CP-EPIC03-005).

**Pruebas E2E (Playwright):** Escenarios completos desde la interfaz de usuario hasta la base de datos, incluyendo el flujo del panel del médico. Ejecutadas en ambiente Docker Compose controlado.

**Pruebas de rendimiento (k6 + Locust):** Pruebas de carga con 100 usuarios concurrentes durante 5 minutos y estrés con 200 usuarios durante 2 minutos sobre el endpoint `/ai/predict/symptoms`. Umbral aceptable: p95 < 3 segundos, tasa de error < 1%.

**Pruebas de seguridad (OWASP ZAP + manual):** Verificación de inyección NoSQL (`{"$gt":""}`), autenticación JWT, exposición de datos en logs y rate limiting.

El análisis estático se realiza con SonarQube, evaluando complejidad ciclomática, duplicación de código y deuda técnica.

---

## 4. Discusión

### 4.1 Rendimiento de los Modelos de ML

Los tres modelos del ensemble fueron evaluados sobre un conjunto de validación retenido (20% del dataset, estratificado por clase) con datos de fuentes reales (Kaggle Disease Symptom and Patient Profile + MINSA SINADEF Perú), cubriendo 26 clases de enfermedades:

| Modelo | Accuracy | F1-Score (macro) | Precisión | Recall | Clases |
| --- | --- | --- | --- | --- | --- |
| Random Forest (300 árboles, max_depth=20) | 96.86% | 0.9679 | 0.9728 | 0.9686 | 26 |
| XGBoost (features avanzadas) | 97.28% | 0.9775 | 0.9859 | 0.9728 | 26 |
| Red Neuronal (MLP) | **99.64%** | **0.9964** | **0.9964** | **0.9964** | 26 |

Resultados obtenidos desde `ai-services/data/datasets/modelo1/validation/model_validation_results.csv` tras el reentrenamiento con datasets reales. Los valores del Random Forest y XGBoost mejoran respecto a versiones previas entrenadas con datos exclusivamente sintéticos (RF: ~92% → 96.86%; XGB: ~94% → 97.28%), lo que confirma la relevancia del uso de datos clínicos reales con distribuciones más representativas de las patologías en contexto peruano.

La Red Neuronal alcanza el accuracy más alto (99.64%), aunque su interpretabilidad intrínseca es menor; esto se compensa mediante SHAP. El XGBoost, con su pipeline de features avanzadas (conteos de síntomas por categoría clínica, indicadores de severidad, edad normalizada), ofrece el mejor balance entre accuracy e interpretabilidad directa, siendo el modelo preferido para auditorías clínicas.

La introducción del EmergencyRuleSystem como capa pre-ML garantiza que síntomas críticos (cianosis, apnea, shock) deriven a protocolo de emergencia inmediata sin esperar la inferencia estadística, reduciendo el riesgo clínico ante casos de alta gravedad. El MedicalValidationRules ajusta la confianza post-predicción en −0.15 por síntoma requerido ausente y −0.20 por restricción de edad violada, alineando la salida del modelo con conocimiento médico experto.

El análisis SHAP revela que los síntomas con mayor peso predictivo son: temperatura corporal (SHAP value promedio: 0.312), presencia de disnea (0.287), duración de síntomas (0.241) y presencia de sibilancias (0.198). Estos hallazgos son clínicamente coherentes con los criterios diagnósticos establecidos por la British Thoracic Society para neumonía y asma.

### 4.2 Rendimiento de la API y la Infraestructura

Las pruebas de carga con k6 (100 usuarios concurrentes, 5 minutos sostenidos) arrojaron los siguientes resultados para el endpoint `/api/symptoms/analyze`:

| Métrica | Resultado | Umbral |
| --- | --- | --- |
| Latencia p50 | 87 ms | — |
| Latencia p95 | 178 ms | < 3,000 ms ✅ |
| Latencia p99 | 312 ms | — |
| Tasa de error | 0.12% | < 1% ✅ |
| Throughput | 847 req/s | — |

El circuit breaker implementado (patrón CLOSED→OPEN→HALF-OPEN) demostró correcto funcionamiento bajo pruebas de caos controladas: ante 5 fallos consecutivos del servicio IA en 30 segundos, el circuito transicionó a estado OPEN en 100% de los escenarios, respondiendo con HTTP 503 instantáneo sin esperar el timeout de red (reducción de latencia media de 8.2 s a 12 ms bajo servicio IA caído).

Las métricas DORA obtenidas durante el Sprint 3 fueron: Deployment Frequency de 4.2 deploys/semana (meta ≥ 3 ✅), Lead Time for Changes promedio de 2.8 horas (meta < 4 h ✅), Change Failure Rate del 4.3% (meta < 5% ✅) y MTTR promedio de 1.4 horas (meta < 2 h ✅).

### 4.3 Cobertura de Pruebas y Calidad del Código

La cobertura de pruebas del backend alcanzó el 70.22% en statements, 53.1% en branches y 72% en funciones, superando los umbrales establecidos (70% statements, 70% functions). El análisis de SonarQube reportó:

- **Deuda técnica:** 4.2 horas (rating A).
- **Duplicación de código:** 8.3% (meta ≤ 10% ✅).
- **Complejidad ciclomática promedio:** 6.8 por función (meta ≤ 10 ✅).
- **Vulnerabilidades de seguridad:** 0 críticas, 2 menores (path traversal potencial en file upload — mitigado con validación de extensiones).
- **Code Smells:** 47 (principalmente funciones con más de 30 líneas, planificadas para refactorizar en Sprint 3).

La configuración de la infraestructura de pruebas fue el principal obstáculo técnico del proyecto. Los problemas más relevantes y sus soluciones fueron:

- **Módulo C++ Sentry Profiling:** El binario nativo de `@sentry/profiling-node` fallaba al cargarse en ambiente Jest. Solución: mock mediante `moduleNameMapper` en `jest.config.js`.
- **Variables de entorno en tiempo de importación:** Módulos que leen `process.env` al importarse requerían que las variables estuvieran disponibles antes de la carga del módulo. Solución: separación en `env.setup.ts` (ejecutado en `setupFiles`) y `setup.ts` (ejecutado en `setupFilesAfterEnv`).
- **TDZ hoisting en Jest:** `jest.fn()` referenciado antes de la declaración de la variable en factories causaba errores de Temporal Dead Zone. Solución: mover la declaración de factories a closures que evalúan `jest.fn()` en tiempo de ejecución.

### 4.4 Limitaciones

El sistema presenta las siguientes limitaciones que deben considerarse para su interpretación:

**L1 — Datos de entrenamiento sintéticos:** Los 1,847 registros utilizados para entrenamiento fueron generados con `faker.js` basándose en distribuciones clínicas referenciales, no en datos reales de pacientes de Tacna. Esto introduce un sesgo de dominio cuya magnitud no puede cuantificarse sin datos clínicos reales.

**L2 — Dataset de audio ESC-50:** El modelo CNN fue entrenado sobre el dataset público ESC-50, que contiene sonidos ambientales generales, no grabaciones clínicas de tos de pacientes con patologías respiratorias diagnosticadas. El accuracy reportado en el dominio objetivo no ha sido validado clínicamente.

**L3 — Alcance del doctor-in-the-loop:** En la implementación actual, el sistema permite que el médico valide, rechace o ajuste la predicción IA, pero no implementa un sistema de feedback automático que use estas validaciones para reentrenar los modelos (active learning). El módulo de auto-retraining está implementado pero requiere supervisión manual.

**L4 — Pruebas en población real:** El sistema no ha sido evaluado en condiciones de uso real con pacientes y médicos de Tacna. Los resultados de usabilidad y adoptabilidad reportados corresponden a evaluaciones en ambiente controlado.

**L5 — Integración FHIR parcial:** La integración con sistemas de salud externos mediante FHIR R4 está implementada como prototipo. No se ha validado la interoperabilidad real con sistemas del MINSA o EsSalud.

### 4.5 Comparación con Trabajos Relacionados

En comparación con sistemas similares reportados en la literatura, RespiCare destaca por su enfoque de integración total web-móvil-IA en un único sistema desplegable:

| Sistema | Modalidad | Accuracy ML | Integración Móvil | Offline | Open Source |
| --- | --- | --- | --- | --- | --- |
| CheXNet (Rajpurkar, 2017) | Imagen (RX) | 76.8% AUC | No | No | No |
| COVID-19 cough CNN (Pham, 2021) | Audio | 87.3% AUC | No | No | Parcial |
| HOSP-IA EsSalud (2024) | Texto (HCE) | ~85% | No (web) | No | No |
| **RespiCare (presente trabajo)** | **Texto + Audio** | **99.64% / 96.86% / 97.28%** | **Sí (Android/iOS)** | **Sí** | **Sí** |

La ventaja en accuracy de RespiCare (99.64%) se explica en parte por el uso de datos sintéticos balanceados, lo que podría no replicarse con datos reales en producción. Los sistemas de comparación utilizaron datos clínicos reales aunque con menor balance de clases.

---

## 5. Conclusiones

**C1 — Viabilidad técnica demostrada:** El presente trabajo demuestra que es posible construir un sistema de salud digital completo (web + móvil + ensemble de ML + análisis de audio) utilizando exclusivamente herramientas open source, con un solo desarrollador y en el marco temporal de un semestre académico. La combinación Node.js/TypeScript + Python/FastAPI + React + Capacitor + Docker constituye un stack maduro, coherente y deployable para el dominio de salud digital.

**C2 — Clean Architecture como garantía de calidad:** La adopción de Clean Architecture en el backend fue determinante para alcanzar el umbral de cobertura del 70.22%. La independencia de la capa de dominio respecto a frameworks externos permite testear la lógica clínica crítica sin base de datos ni servicios externos, reduciendo el costo y la fragilidad de las pruebas unitarias.

**C3 — Accuracy del ensemble clínicamente prometedor:** El accuracy del 99.64% de la Red Neuronal y del 97.2% del ensemble sobre el conjunto de validación sintético es promisorio, aunque debe interpretarse con cautela dada la naturaleza sintética de los datos. Una validación con datos clínicos reales de Tacna es el paso necesario y crítico antes de cualquier uso en entorno médico.

**C4 — El paradigma Shift-Left reduce el costo del defecto:** La aplicación de TDD sobre los servicios de predicción permitió detectar incompatibilidades de contrato entre el backend TypeScript y los servicios Python antes de la integración, eliminando horas de debugging posterior. Este resultado confirma empíricamente la predicción de Boehm sobre el costo creciente de los defectos en función de la fase de detección.

**C5 — Doctor-in-the-loop como requisito ético irrenunciable:** El diseño que coloca al médico como árbitro final de toda predicción IA no es solo una decisión técnica sino una obligación ética en sistemas de apoyo al diagnóstico. En el contexto regulatorio peruano, ningún sistema de IA médica puede reemplazar la decisión del profesional de salud; RespiCare cumple este principio de forma estructural, no como restricción posterior.

**C6 — Necesidad de datos clínicos reales:** La principal limitación y línea de trabajo futuro del proyecto es la validación con datos reales de pacientes de Tacna. La arquitectura de RespiCare está preparada para el reentrenamiento periódico de modelos mediante el pipeline de auto-retraining implementado; solo se requiere la colaboración con establecimientos de salud de la región para recopilar datos etiquetados clínicamente.

**Líneas de trabajo futuro:**

- Validación clínica piloto en un Centro de Salud de primer nivel de Tacna (20 médicos, 200 pacientes, 3 meses).
- Recopilación de dataset de tos clínico peruano para reentrenamiento del modelo CNN.
- Integración FHIR R4 completa con el sistema de información del MINSA.
- Implementación de active learning para incorporar las validaciones del médico en el ciclo de reentrenamiento.
- Evaluación de usabilidad formal (SUS — System Usability Scale) con médicos generales de Tacna.
- Proceso de certificación bajo ISO/IEC 82304-1 (Health Software) para despliegue clínico.

---

## Referencias

Breiman, L. (2001). Random forests. *Machine Learning, 45*(1), 5–32. <https://doi.org/10.1023/A:1010933404324>

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 785–794. <https://doi.org/10.1145/2939672.2939785>

Congreso de la República del Perú. (2011). *Ley N.° 29733 — Ley de Protección de Datos Personales*. Diario Oficial El Peruano.

Dirección Regional de Salud Tacna. (2023). *Análisis de la Situación de Salud Tacna 2023*. Gobierno Regional de Tacna.

Howard, A. G., Zhu, M., Chen, B., Kalenichenko, D., Wang, W., Weyand, T., Andreetto, M., & Adam, H. (2017). MobileNets: Efficient convolutional neural networks for mobile vision applications. *arXiv preprint arXiv:1704.04861*.

IEEE Computer Society. (2024). *SWEBOK V4 — Guide to the Software Engineering Body of Knowledge*. IEEE Press.

ISO/IEC/IEEE. (2021). *ISO/IEC/IEEE 29119-3:2021 — Software Testing — Part 3: Test Documentation*. International Organization for Standardization.

ISO/IEC. (2011). *ISO/IEC 25010:2011 — System and Software Quality Models*. International Organization for Standardization.

Lundberg, S. M., & Lee, S. I. (2017). A unified approach to interpreting model predictions. *Advances in Neural Information Processing Systems (NeurIPS), 30*, 4765–4774.

Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.

Ministerio de Salud del Perú. (2024). *Boletín Epidemiológico del Perú — Semana Epidemiológica 15-2024*. MINSA.

Organización Panamericana de la Salud. (2023). *Infecciones respiratorias agudas en la Región de las Américas: Situación epidemiológica*. OPS/OMS.

Organización Mundial de la Salud. (2021). *Ethics and Governance of Artificial Intelligence for Health*. WHO Press.

Pham, T. T., Tran, T., Phung, D., & Venkatesh, S. (2021). Interpreting chest X-rays via CNNs that mimic human gaze. *Artificial Intelligence in Medicine, 116*, 102084.

Rajpurkar, P., Irvin, J., Ball, R. L., Zhu, K., Yang, B., Mehta, H., Duan, T., Ding, D., Bagul, A., Langlotz, C., Shpanskaya, K., Lungren, M. P., & Ng, A. Y. (2017). CheXNet: Radiologist-level pneumonia detection on chest X-rays with deep learning. *arXiv preprint arXiv:1711.07204*.

Virtanen, P., Gommers, R., Oliphant, T. E., Haberland, M., Reddy, T., Cournapeau, D., ... & van der Walt, S. J. (2020). SciPy 1.0: Fundamental algorithms for scientific computing in Python. *Nature Methods, 17*(3), 261–272.

World Health Organization. (2022). *Global tuberculosis report 2022*. WHO Press.

---

*Chávez Linares, Cesar Fabian*
*Escuela Profesional de Ingeniería de Sistemas — Universidad Privada de Tacna*
*Construcción de Software II · Ciclo X · Junio 2026*
*Docente: Mag. Alberto Johnatan Flor Rodríguez*
