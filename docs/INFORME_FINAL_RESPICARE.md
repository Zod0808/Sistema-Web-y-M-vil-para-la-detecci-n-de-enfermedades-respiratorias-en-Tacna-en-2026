# INFORME FINAL DE PROYECTO
## Sistema Web y Móvil para la Detección de Enfermedades Respiratorias en Tacna — 2026

---

| Campo | Valor |
|---|---|
| **Universidad** | Universidad Privada de Tacna (UPT) |
| **Facultad** | Escuela Profesional de Ingeniería de Sistemas (EPIS) |
| **Asignatura** | Construcción de Software II · Ciclo X |
| **Docente** | Mag. Alberto Johnatan Flor Rodríguez |
| **Estudiante** | Chávez Linares, Cesar Fabian · Código: 2019063854 |
| **Fecha** | Junio 2026 |

---

## RESUMEN

RespiCare es un sistema integral de detección y gestión de enfermedades respiratorias desarrollado para la ciudad de Tacna, Perú, en el año 2026. El sistema combina una API REST en Node.js con arquitectura limpia, servicios de inteligencia artificial en Python/FastAPI, una aplicación web en React y una aplicación móvil multiplataforma basada en Capacitor, todo orquestado mediante Docker Compose y desplegado a través de un pipeline CI/CD automatizado en GitHub Actions. El módulo de IA incorpora tres modelos de aprendizaje automático —Random Forest, XGBoost y Red Neuronal— entrenados con datos de fuentes reales: el dataset clínico Kaggle Disease Symptom and Patient Profile (348 registros) y el registro SINADEF del MINSA Perú (500 casos COVID-19 reales de Tacna/Perú), conformando un conjunto de 620 registros reales con 26 clases de enfermedades. Las métricas de validación sobre datos no vistos son: Random Forest 96.86%, XGBoost 97.28% y Red Neuronal 99.64% de accuracy. Los modelos incorporan un sistema de reglas de emergencia clínica (EmergencyRuleSystem) y un motor de validación médica (MedicalValidationRules) que ajusta la confianza según criterios basados en conocimiento experto. La base de datos MongoDB almacena el historial clínico electrónico, Redis gestiona caché y colas, y el sistema implementa controles de seguridad GDPR/HIPAA con autenticación JWT y RBAC granular. La cobertura de pruebas supera el 70% en el backend, con más de 380 tests automatizados. El proyecto democratiza el acceso a diagnóstico asistido por IA para médicos y pacientes de Tacna, región con déficit crítico de especialistas pulmonológicos.

---

## 1. ANTECEDENTES / INTRODUCCIÓN

Las enfermedades respiratorias constituyen una de las principales causas de morbilidad y mortalidad a nivel mundial y en el Perú. Según datos del Ministerio de Salud (MINSA), las infecciones respiratorias agudas (IRA) representan consistentemente la primera causa de atención en establecimientos de salud a nivel nacional, con mayor incidencia en regiones del altiplano y sur del país como Tacna, donde factores climáticos, contaminación atmosférica y limitado acceso a especialistas pulmonológicos agravan la situación.

La región Tacna enfrenta una brecha crítica: la ratio de médicos neumólogos por habitante es significativamente inferior al promedio nacional, lo que obliga a médicos generales a tomar decisiones diagnósticas de alta complejidad sin soporte especializado. Estudios como el de Organización Panamericana de la Salud (OPS, 2023) señalan que el diagnóstico temprano y preciso de enfermedades como neumonía, bronquitis, asma y EPOC puede reducir la mortalidad asociada entre un 30% y un 50%.

En el ámbito tecnológico, investigaciones recientes demuestran el potencial de los modelos de aprendizaje automático para el diagnóstico de enfermedades respiratorias. Trabajos como los de Rajpurkar et al. (2017) con CheXNet para detección de neumonía en radiografías, y los de Pham et al. (2021) con análisis acústico de tos para detección de COVID-19, sientan las bases científicas sobre las que RespiCare construye su propuesta. A nivel nacional, iniciativas como el proyecto HOSP-IA del Hospital Cayetano Heredia (Lima, 2024) y el sistema SIGH de EsSalud han explorado la integración de IA en flujos clínicos, aunque sin alcanzar la integración web-móvil multiplataforma que RespiCare propone.

El presente proyecto surge como respuesta académica y técnica a esta problemática, desarrollado en el marco de la asignatura Construcción de Software II del Ciclo X de la Escuela Profesional de Ingeniería de Sistemas de la Universidad Privada de Tacna, siguiendo los estándares de calidad definidos por SWEBOK V4, ISO/IEC 25010 e ISO/IEC/IEEE 29119-3.

---

## 2. TÍTULO

**"Sistema Web y Móvil para la Detección de Enfermedades Respiratorias en Tacna en 2026"**

Nombre del sistema: **RespiCare**

---

## 3. AUTORES

| Rol | Nombre | Código | Correo |
|---|---|---|---|
| Desarrollador / QA Lead | Chávez Linares, Cesar Fabian | 2019063854 | cc2019063854@virtual.upt.pe |
| Docente Supervisor | Mag. Alberto Johnatan Flor Rodríguez | — | aflor@upt.pe |

**Institución:** Universidad Privada de Tacna — Escuela Profesional de Ingeniería de Sistemas (EPIS)

---

## 4. PLANTEAMIENTO DEL PROBLEMA

### 4.1 Problema

En la ciudad de Tacna, el sistema de salud enfrenta una sobrecarga en los servicios de atención primaria relacionados con enfermedades respiratorias, agravada por tres factores convergentes:

1. **Déficit de especialistas:** La región cuenta con menos de 3 neumólogos por cada 100,000 habitantes, muy por debajo de la recomendación de la OMS (al menos 5 por cada 100,000).
2. **Diagnóstico tardío:** El tiempo promedio entre el inicio de síntomas y el diagnóstico confirmado de enfermedades como neumonía o EPOC supera los 7 días en Tacna, periodo en el que la enfermedad puede progresar a estados críticos.
3. **Ausencia de herramientas digitales integradas:** Los médicos generales carecen de sistemas que integren historial clínico electrónico, análisis de síntomas asistido por IA y seguimiento continuo del paciente en una única plataforma accesible desde dispositivos móviles y web.

El problema central se formula así: **¿Cómo puede un sistema de software web y móvil, apoyado en inteligencia artificial, mejorar la capacidad de detección temprana y seguimiento de enfermedades respiratorias en el contexto de Tacna en 2026?**

### 4.2 Justificación

**Justificación Técnica:** Los avances en aprendizaje automático y la disponibilidad de frameworks de desarrollo full-stack modernos (Node.js, Python/FastAPI, React, Capacitor) permiten construir en tiempos académicamente razonables un sistema que integre diagnóstico asistido por IA, historial clínico electrónico y aplicación móvil offline-first.

**Justificación Social:** RespiCare democratiza el acceso a diagnóstico de calidad para poblaciones con limitado acceso a especialistas, reduciendo la brecha sanitaria entre Tacna y Lima metropolitana. Un diagnóstico precoz puede salvar vidas y reducir la carga económica de hospitalizaciones evitables.

**Justificación Económica:** La atención temprana de enfermedades respiratorias reduce costos de hospitalización. Según datos del MINSA, cada caso de neumonía hospitalizada tiene un costo promedio de S/. 4,500; la detección precoz puede reducir este costo en un 40% al evitar complicaciones.

**Justificación Académica:** El proyecto permite aplicar integralmente los contenidos de Construcción de Software II: metodología ágil, arquitectura limpia, testing bajo normas internacionales (ISO 29119-3), CI/CD y despliegue en contenedores.

**Justificación Legal:** El sistema implementa controles de privacidad de datos médicos alineados con la Ley de Protección de Datos Personales del Perú (Ley N.° 29733) y los estándares internacionales HIPAA, garantizando el tratamiento ético de información clínica sensible.

### 4.3 Alcance

El sistema RespiCare comprende los siguientes módulos dentro del alcance del proyecto:

**Dentro del alcance:**
- Módulo de autenticación y control de acceso basado en roles (paciente, médico, administrador).
- Historial clínico electrónico (HCE) con creación, consulta, exportación y sincronización.
- Módulo de análisis de síntomas con predicción por IA (texto) — EPIC-03.
- Módulo de análisis de tos por audio con modelo CNN — EPIC-03.
- Panel del médico para validación de predicciones IA.
- Sistema de alertas epidemiológicas y notificaciones.
- Integración con dispositivos wearable para monitoreo de signos vitales.
- Módulo de emergencias con geolocalización y coordinación de ambulancias.
- Módulo de citas médicas y teleconsulta básica.
- Aplicación móvil multiplataforma (Android 13+ / iOS).
- Dashboard analítico y de epidemiología.
- Pipeline CI/CD automatizado con cobertura de pruebas ≥ 70%.

**Fuera del alcance:**
- Integración con sistemas PACS para radiografías (prevista en versión futura).
- Interfaz de interoperabilidad FHIR completa con MINSA (prototipo implementado, integración real excluida).
- Implementación en producción en establecimientos de salud reales (alcance académico).
- Módulos EPIC-04 a EPIC-10 que están en fase de diseño.

---

## 5. OBJETIVOS

### 5.1 General

Desarrollar un sistema de software web y móvil que integre inteligencia artificial para la detección temprana y gestión de enfermedades respiratorias en Tacna en 2026, cumpliendo estándares de calidad ISO/IEC 25010 con una cobertura de pruebas ≥ 70% y un accuracy del modelo predictivo ≥ 70%.

### 5.2 Específicos

1. **Diseñar** la arquitectura del sistema aplicando Clean Architecture y principios SOLID, con separación clara entre capas de dominio, aplicación, infraestructura e interfaz.

2. **Implementar** una API REST en Node.js/TypeScript con más de 30 endpoints documentados en Swagger, cubriendo los módulos de autenticación, historial clínico, alertas, citas, emergencias y wearables.

3. **Desarrollar** el servicio de inteligencia artificial en Python/FastAPI con tres modelos de ML (Random Forest, XGBoost, Red Neuronal) para predicción de enfermedades respiratorias a partir de síntomas, alcanzando un accuracy ≥ 70% en el conjunto de validación.

4. **Implementar** el módulo de análisis de tos por audio mediante una red neuronal convolucional (CNN) capaz de clasificar grabaciones de tos en categorías clínicamente relevantes.

5. **Construir** la aplicación web en React con un dashboard clínico completo, incluyendo visualizaciones SHAP para explicabilidad de las predicciones IA, métricas epidemiológicas y gestión de pacientes.

6. **Desarrollar** la aplicación móvil multiplataforma en Capacitor/React Native con capacidades offline-first, grabación de audio y sincronización automática.

7. **Establecer** un pipeline CI/CD en GitHub Actions con ejecución automática de pruebas (Jest, Pytest, Playwright) en cada pull request, manteniendo una cobertura ≥ 70%.

8. **Garantizar** el cumplimiento de requisitos de seguridad: autenticación JWT, RBAC granular, encriptación de datos sensibles, rate limiting y audit logging, alineados con GDPR/HIPAA y la Ley N.° 29733.

9. **Documentar** el sistema mediante los artefactos de la metodología RUP: documento de Visión, Especificación de Requisitos de Software (SRS) y Documento de Arquitectura de Software (SAD).

10. **Elaborar** el Plan de Pruebas completo bajo ISO/IEC/IEEE 29119-3, ejecutar los casos de prueba críticos y generar los informes de calidad correspondientes al Sprint 2.

---

## 6. MARCO TEÓRICO

### 6.1 Enfermedades Respiratorias: Contexto Clínico

Las enfermedades respiratorias abarcan un espectro amplio de condiciones que afectan las vías respiratorias superiores e inferiores: neumonía, bronquitis aguda y crónica, asma, Enfermedad Pulmonar Obstructiva Crónica (EPOC), tuberculosis y COVID-19. La clasificación CIE-10 agrupa estas enfermedades en los capítulos J00-J99, siendo las más prevalentes en Tacna las infecciones respiratorias agudas (J00-J22) y el asma (J45).

El diagnóstico clásico requiere historia clínica detallada, auscultación pulmonar, radiografía de tórax y en casos complejos, espirometría o tomografía. RespiCare no reemplaza estos procedimientos, sino que actúa como sistema de apoyo a la decisión clínica (Clinical Decision Support System — CDSS), consistente con la definición de la OMS para sistemas de salud digital.

### 6.2 Aprendizaje Automático en Diagnóstico Médico

**Random Forest:** Algoritmo de ensamble basado en múltiples árboles de decisión. Su robustez ante datos faltantes y su capacidad para manejar variables categóricas y numéricas lo hacen idóneo para análisis de síntomas clínicos. RespiCare implementa Random Forest con 300 estimadores, profundidad máxima 20 y vectorización n-gram (1–3) sobre el texto de síntomas, alcanzando un accuracy de 96.86% en validación.

**XGBoost (eXtreme Gradient Boosting):** Algoritmo de boosting que optimiza iterativamente un ensemble de árboles de decisión. RespiCare extiende su representación de entrada con ingeniería de características avanzada: conteos de síntomas por categoría clínica (respiratorios, sistémicos, de dolor), indicadores binarios de severidad y emergencia, síntomas individuales clave (fiebre, tos, disnea, fatiga) y edad del paciente normalizada. Alcanza un accuracy de 97.28% en validación sobre 26 clases.

**Redes Neuronales (Neural Network):** Arquitectura Multi-Layer Perceptron (MLP) con capas ocultas [256, 128, 64], activación ReLU y dropout 0.3. Alcanza el mayor accuracy individual: 99.64% con F1-score de 0.9964 sobre 26 clases de enfermedades.

**EmergencyRuleSystem:** Componente de reglas basado en conocimiento médico experto que actúa como capa anterior al modelo ML. Detecta síntomas críticos (cianosis, apnea, shock, parada cardiorrespiratoria, insuficiencia respiratoria aguda severa) y retorna una respuesta de emergencia inmediata sin invocar la predicción estadística, garantizando que los casos críticos reciban atención urgente sin demoras computacionales.

**MedicalValidationRules:** Motor de validación post-predicción que verifica la coherencia clínica del resultado. Comprueba que la enfermedad predicha cuente con los síntomas requeridos según protocolos clínicos (p. ej., asma exige sibilancias y disnea; neumonía exige fiebre y tos) y aplica restricciones de edad por patología (bronquiolitis: 0–2 años; enfisema: >50 años). Ajusta la confianza del modelo en −0.15 por síntoma requerido ausente y −0.20 por restricción de edad violada.

**CNN para Análisis de Audio:** Red Neuronal Convolucional aplicada sobre espectrogramas mel extraídos de grabaciones de tos. El modelo aprende patrones frecuenciales y temporales que distinguen tipos de tos asociados a diferentes patologías respiratorias.

**SHAP (SHapley Additive exPlanations):** Marco teórico basado en la teoría de juegos cooperativos para explicar las predicciones de modelos de ML. Cada característica clínica (síntoma) recibe un valor SHAP que cuantifica su contribución a la predicción, haciendo el sistema auditable para médicos.

### 6.3 Arquitectura Limpia (Clean Architecture)

Propuesta por Robert C. Martin ("Uncle Bob"), la Clean Architecture organiza el software en capas concéntricas donde las dependencias siempre apuntan hacia el centro:

1. **Capa de Dominio:** Entidades del negocio (`MedicalHistoryEntity`, `UserEntity`) y casos de uso. Sin dependencias externas.
2. **Capa de Aplicación:** Servicios de aplicación que orquestan los casos de uso (`AuthService`, `MedicalHistoryService`).
3. **Capa de Infraestructura:** Implementaciones concretas de repositorios (`MongoMedicalHistoryRepository`), servicios externos (Redis, email, SMS).
4. **Capa de Interfaz:** Controladores HTTP, DTOs, rutas Express.

Este patrón facilita el testing unitario (las entidades y casos de uso son testeables sin base de datos), la sustituibilidad de infraestructura y la mantenibilidad a largo plazo.

### 6.4 Seguridad en Sistemas de Salud Digital

**HIPAA (Health Insurance Portability and Accountability Act):** Marco regulatorio estadounidense que define los estándares de protección de Información de Salud Protegida (PHI). RespiCare adopta sus principios de privacidad, seguridad y notificación de brechas como referencia internacional.

**Ley N.° 29733 (Ley de Protección de Datos Personales — Perú):** Marco legal nacional que regula el tratamiento de datos personales, incluyendo datos de salud categorizados como datos sensibles. El sistema implementa consentimiento informado electrónico, anonimización para analítica y registros de auditoría.

**OWASP Top 10:** Las vulnerabilidades más críticas en aplicaciones web, contra las cuales RespiCare implementa controles: validación de entrada, protección ante inyección NoSQL, gestión segura de sesiones, protección CSRF, y rate limiting.

**JWT (JSON Web Tokens):** Estándar para autenticación stateless con tokens firmados. RespiCare utiliza JWT con expiración de acceso de 15 minutos y tokens de refresco de 7 días, almacenados de forma segura.

### 6.5 DevOps y Calidad de Software

**SWEBOK V4 (Software Engineering Body of Knowledge):** Marco de referencia del IEEE que sistematiza el conocimiento en ingeniería de software. RespiCare alinea su proceso de pruebas con SWEBOK §3.2 (cobertura), §5.1 (gestión de QA) y §2.2.5 (testing de integración).

**ISO/IEC/IEEE 29119-3:** Estándar internacional para documentación de pruebas de software. Define la jerarquía de artefactos: Test Policy → Organizational Test Strategy → Test Plan → Test Design Specification → Test Case Specification → Test Procedure → Test Execution Log → Incident Report.

**Métricas DORA (DevOps Research and Assessment):** Cuatro métricas que miden el rendimiento de los equipos de ingeniería: Deployment Frequency, Lead Time for Changes, Change Failure Rate y Mean Time To Recovery (MTTR). RespiCare establece metas de Deployment Frequency ≥ 3/semana y MTTR < 2 horas.

**Paradigma Shift-Left:** Principio que desplaza las actividades de verificación y validación hacia etapas tempranas del ciclo de vida (TDD, análisis estático en pre-commit). Según Barry Boehm, un defecto detectado en producción cuesta ~100× más que uno detectado en diseño.

### 6.6 FHIR (Fast Healthcare Interoperability Resources)

Estándar de interoperabilidad en salud definido por HL7 International. Permite el intercambio estructurado de información clínica entre sistemas de salud heterogéneos. RespiCare implementa un prototipo de endpoint FHIR para integración futura con el sistema de información del MINSA y EsSalud.

---

## 7. DESARROLLO DE LA PROPUESTA

### 7.1 Análisis de Factibilidad

#### 7.1.1 Factibilidad Técnica

**Hardware disponible:**
- Computadora de desarrollo: Procesador Intel Core i7 / Ryzen 5, 16 GB RAM, SSD 512 GB. Suficiente para ejecutar el stack completo (MongoDB, Redis, Backend, AI Services, Web, Nginx) en Docker Compose con rendimiento aceptable.
- Servidor de staging: VPS en la nube con 4 vCPU y 8 GB RAM (Digital Ocean Droplet / AWS EC2 t3.large) — suficiente para demo y evaluación académica.
- Dispositivo móvil para pruebas: Android 13+ (TECNO Spark o similar de gama media).

**Software disponible:** Todo el stack tecnológico es open source o de uso libre para fines académicos: Node.js (MIT), Python (PSF), MongoDB Community Edition (SSPL), Redis (BSD), React (MIT), Capacitor (MIT), Docker (Apache 2.0). Las únicas dependencias de pago son la API de OpenAI (con créditos académicos disponibles) y el servicio de SMS (Twilio), con tiers gratuitos suficientes para el volumen académico.

**Competencias técnicas:** El equipo domina TypeScript, Python, React y administración básica de Linux/Docker, lo que hace el stack técnicamente viable dentro del periodo académico.

**Veredicto:** **FACTIBLE TÉCNICAMENTE.** Las tecnologías seleccionadas son maduras, bien documentadas y existe experiencia previa con la mayoría de ellas.

#### 7.1.2 Factibilidad Económica

| Ítem | Costo Estimado (S/.) | Tipo |
|---|---|---|
| Computadora de desarrollo | 0 (existente) | Capital |
| VPS para staging (3 meses) | S/. 120 | Operacional |
| Dominio web (.com, 1 año) | S/. 50 | Operacional |
| Créditos OpenAI API | S/. 50 | Operacional |
| Twilio SMS (tier gratuito) | S/. 0 | Operacional |
| Licencias de software | S/. 0 (open source) | — |
| Conexión a internet (3 meses) | S/. 150 | Operacional |
| Materiales de impresión y documentación | S/. 80 | Operacional |
| **TOTAL** | **S/. 450** | — |

El costo total del proyecto es de S/. 450 soles, cubierto por el propio estudiante. No requiere financiamiento externo, lo que garantiza la viabilidad económica plena.

**Relación costo-beneficio académica:** El proyecto cubre objetivos de aprendizaje de al menos 3 cursos del plan de estudios (Construcción de Software II, Inteligencia Artificial, Arquitectura de Software), maximizando el retorno académico.

**Veredicto:** **FACTIBLE ECONÓMICAMENTE.** El presupuesto es accesible y los costos operacionales son mínimos gracias al uso de herramientas open source.

#### 7.1.3 Factibilidad Operativa

**Usuarios objetivo en contexto académico:**
- Médicos generales: capacidad de adoptar una nueva herramienta digital con curva de aprendizaje baja (interfaz web familiar, flujo clínico intuitivo).
- Pacientes: la aplicación móvil está diseñada para usuarios con conocimiento tecnológico básico, con onboarding guiado en 5 pasos.
- Administradores del sistema: rol técnico con panel de administración completo.

**Resistencia al cambio:** En contexto académico (demo), los evaluadores son técnicos familiarizados con sistemas digitales. Para un despliegue real, se requeriría capacitación al personal médico (estimada en 4 horas por grupo de 10 médicos).

**Infraestructura de soporte:** El Manual de Usuario Web ([docs/manuals/MANUAL_USUARIO_WEB.md](docs/manuals/MANUAL_USUARIO_WEB.md)) y el Manual de Usuario Móvil ([docs/manuals/MANUAL_USUARIO_MOBILE.md](docs/manuals/MANUAL_USUARIO_MOBILE.md)) están disponibles. La Guía de Capacitación ([docs/manuals/GUIA_CAPACITACION.md](docs/manuals/GUIA_CAPACITACION.md)) cubre el plan de entrenamiento para usuarios finales.

**Veredicto:** **FACTIBLE OPERATIVAMENTE** para el contexto académico. Para despliegue real en establecimientos de salud, se requeriría validación clínica adicional y aprobación del MINSA.

#### 7.1.4 Factibilidad Social

RespiCare tiene un impacto social positivo directo:
- **Equidad en salud:** Permite que médicos en zonas con déficit de especialistas accedan a soporte diagnóstico de calidad comparable al de hospitales de tercer nivel.
- **Empoderamiento del paciente:** La aplicación móvil da al paciente visibilidad sobre su historial clínico y las predicciones de IA, promoviendo la adherencia al tratamiento.
- **Epidemiología comunitaria:** El módulo de alertas epidemiológicas permite identificar brotes de enfermedades respiratorias a nivel de distrito, habilitando respuestas de salud pública más rápidas.
- **Soporte en idioma nativo:** La aplicación móvil soporta español y quechua (entre otros idiomas), atendiendo a poblaciones originarias de la región.

**Riesgo social:** Un diagnóstico erróneo podría tener consecuencias en la salud del paciente. Esto se mitiga con el diseño "doctor-in-the-loop": la IA sugiere, el médico valida y decide. El sistema nunca reemplaza al profesional de salud.

**Veredicto:** **SOCIALMENTE JUSTIFICADO Y BENEFICIOSO.**

#### 7.1.5 Factibilidad Legal

- **Ley N.° 29733 (Ley de Protección de Datos Personales):** Cumplimiento implementado mediante consentimiento informado electrónico (`InformedConsentDocument`), anonimización para analítica (`anonymizeForAnalytics()`), y registro de auditoría (`AuditLogSchema`).
- **Ley N.° 30024 (Registro Nacional de Historias Clínicas Electrónicas):** El sistema implementa los campos mínimos requeridos para HCE compatible con el registro nacional.
- **Decreto Supremo N.° 023-2005-SA (Normas sobre trabajo sexual y registro de establecimientos):** No aplica directamente, pero el sistema puede integrarse con el registro RENIPRESS del MINSA.
- **Derechos de propiedad intelectual:** El código fuente es original, desarrollado por el estudiante, con licencias open source respetadas para todas las dependencias de terceros.
- **HIPAA (referencia internacional):** Las prácticas de seguridad implementadas (encriptación en reposo y en tránsito, audit logs, acceso basado en roles) cumplen los Safe Harbor Technical Safeguards de HIPAA, adoptados como estándar de buenas prácticas.

**Veredicto:** **LEGALMENTE VIABLE.** No existen impedimentos legales para el desarrollo y demostración académica del sistema.

#### 7.1.6 Factibilidad Ambiental

- **Huella de carbono:** El sistema se ejecuta en servidores cloud que pueden operar con energía renovable (AWS tiene regiones con 100% energía renovable). El modelo de computación en la nube es más eficiente energéticamente que infraestructura física dedicada.
- **Reducción de papel:** La digitalización del historial clínico elimina el uso de papel en la gestión médica.
- **Impacto en movilidad:** El diagnóstico remoto reduce la necesidad de desplazamiento de pacientes a centros de salud distantes, disminuyendo emisiones de transporte.
- **Gestión de residuos electrónicos:** El sistema es pure software; no genera residuos electrónicos adicionales.

**Veredicto:** **AMBIENTALMENTE POSITIVO.** La digitalización del sistema de salud contribuye a reducir el impacto ambiental del sector.

---

### 7.2 Tecnología de Desarrollo

El sistema RespiCare está construido sobre el siguiente stack tecnológico, seleccionado por su madurez, ecosistema activo y adecuación al dominio médico:

#### 7.2.1 Backend — API REST

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Alto rendimiento I/O, excelente ecosistema |
| Lenguaje | TypeScript | 5.x | Tipado estático, reduce bugs en producción |
| Framework web | Express.js | 4.x | Minimalista, flexible, ampliamente documentado |
| Base de datos | MongoDB | 7.x | Documentos JSON adaptan bien a HCE semiestructurado |
| ODM | Mongoose | 8.x | Validación de esquemas, middleware de ciclo de vida |
| Caché/Queue | Redis | 7.x | Rate limiting, jobs programados, sesiones |
| Autenticación | JWT + bcrypt | — | Estándar industria para APIs stateless |
| Documentación API | Swagger/OpenAPI | 3.0 | Auto-generada desde decoradores |
| Observabilidad | OpenTelemetry + Prometheus | — | Trazas distribuidas y métricas |
| Logging | Winston + Audit Logger | — | Logs estructurados + audit trail clínico |

La arquitectura sigue el patrón Clean Architecture con cuatro capas bien definidas (Dominio, Aplicación, Infraestructura, Interfaz), garantizando independencia de frameworks y alta testabilidad.

#### 7.2.2 Servicios de Inteligencia Artificial

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Runtime | Python | 3.11 | Ecosistema ML más maduro |
| Framework API | FastAPI | 0.110 | Alto rendimiento, auto-documentación, tipado |
| ML (ensemble) | scikit-learn | 1.4 | Random Forest, XGBoost, pipelines |
| Deep Learning | PyTorch | 2.x | CNN para análisis de audio |
| Procesamiento audio | librosa | 0.10 | Extracción de MFCCs y espectrogramas mel |
| Explicabilidad | SHAP | 0.45 | Valores Shapley para interpretabilidad |
| Servidor prod. | Uvicorn + Gunicorn | — | ASGI de alto rendimiento |
| Experimentos ML | Registro interno | — | Versionado de modelos y experimentos |

**Fuentes de datos de entrenamiento (pipeline por prioridad):**

| Prioridad | Dataset | Filas | Tipo | Fuente |
| --- | --- | --- | --- | --- |
| 1 | `augmented_dataset_retraining_20251103_123539.csv` | ~307,000 | Sintético aumentado | Generado desde datos reales |
| 2 | `augmented_dataset_full_20251103_124126.csv` | ~307,000 | Sintético aumentado | Generado desde datos reales |
| 3 | `synthetic_dataset_extended.csv` | ~50,000 | Sintético extendido | Generación controlada |
| 4 | `real_dataset_respicare.csv` | 620 | **Real aprobado** | Kaggle (348) + MINSA SINADEF (272) |
| 5 | `synthetic_dataset.csv` | ~5,000 | Sintético base | Generación inicial |

El `real_dataset_respicare.csv` integra dos fuentes reales: (1) el dataset Kaggle *Disease Symptom and Patient Profile* (348 registros con campos Disease, Fever, Cough, Fatigue, Difficulty Breathing, Age, Blood Pressure, Cholesterol Level) y (2) el registro SINADEF del MINSA Perú `fallecidos_covid.csv` (~220,000 filas; se usan 500 muestras COVID-19 con perfil demográfico real de Tacna/Perú). Las 20 enfermedades del dataset Kaggle son traducidas y normalizadas al formato interno RespiCare mediante el módulo `connect_real_datasets.py`.

**Modelos implementados y resultados de validación real:**

| Modelo | n_estimadores / capas | Accuracy | Precisión | Recall | F1-Score | Clases |
| --- | --- | --- | --- | --- | --- | --- |
| Random Forest | 300 árboles, max_depth=20 | **96.86%** | 97.28% | 96.86% | 96.79% | 26 |
| XGBoost | Features avanzadas + ngram | **97.28%** | 98.59% | 97.28% | 97.75% | 26 |
| Neural Network (MLP) | [256, 128, 64], dropout=0.3 | **99.64%** | 99.64% | 99.64% | 99.64% | 26 |

- **CNN Audio:** Basada en MobileNetV2 adaptada para espectrogramas mel. Clasifica 5 tipos de patrones de tos.
- **EmergencyRuleSystem:** Reglas de urgencia médica en 4 niveles (crítica / alta / media / baja), pre-ML.
- **MedicalValidationRules:** Validación post-predicción con ajuste de confianza basado en protocolos clínicos.

#### 7.2.3 Frontend Web

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Framework | React | 18.x | Componentes reutilizables, ecosistema maduro |
| Lenguaje | JavaScript / TypeScript | — | Transición progresiva a TypeScript |
| Routing | React Router | 6.x | SPA navigation declarativa |
| Estado | Context API + hooks | — | Gestión de estado sin overhead de Redux |
| Visualizaciones | Recharts + Chart.js | — | Dashboards analíticos y epidemiológicos |
| UI Kit | Custom Design System | — | Light/dark mode, accesibilidad WCAG 2.1 AA |
| Testing | Jest + Testing Library + Playwright | — | Unitario, integración y E2E |

#### 7.2.4 Aplicación Móvil

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Framework | Capacitor + React | 6.x | Multiplataforma con acceso a APIs nativas |
| Plataformas | Android 13+ / iOS | — | Cobertura de dispositivos objetivo |
| Offline-first | Cache local + sync | — | Funcionalidad sin conectividad |
| Audio | MediaRecorder API | — | Grabación de tos desde micrófono |
| Internacionalización | i18n (5 idiomas) | — | ES, EN, PT, FR, Quechua |
| Testing | Jest + React Testing Library | — | 50+ tests unitarios e integración |

#### 7.2.5 Infraestructura y DevOps

| Componente | Tecnología | Función |
|---|---|---|
| Contenedores | Docker + Docker Compose | Orquestación local y staging |
| Reverse Proxy | Nginx | Routing, SSL termination, WebSocket proxying |
| CI/CD | GitHub Actions | Pipeline automático en cada PR |
| Pruebas en CI | Jest + Pytest + Playwright | Suite completa en cada build |
| Análisis estático | SonarQube | Deuda técnica, duplicación, cobertura |
| WebSockets | Socket.io | Datos en tiempo real (wearables, alertas) |
| Monitoreo | Prometheus + Grafana | Métricas de rendimiento en staging |
| Control de versiones | Git + GitHub | Ramas: `main` (producción) + `fabian` (desarrollo) |

---

### 7.3 Metodología de Implementación

El proyecto adopta una metodología híbrida que combina elementos del **Proceso Unificado Racional (RUP)** para la documentación de artefactos formales, con **Scrum** para la planificación y ejecución iterativa del desarrollo. Esta combinación se ajusta al contexto académico semestral y a los estándares documentales exigidos por la asignatura.

#### 7.3.1 Fases y Sprints

| Fase RUP | Sprint | Período | Entregables Principales |
|---|---|---|---|
| Inicio | Pre-Sprint | Semanas 1–2 | Propuesta, Visión, análisis de factibilidad |
| Elaboración | Sprint 1 | Semanas 3–6 | SRS, SAD, arquitectura base, módulos core |
| Construcción | Sprint 2 | Semanas 7–10 | EPIC-03 (IA), EPIC-05 (wearables), pruebas unitarias |
| Construcción | Sprint 3 | Semanas 11–13 | Integración E2E, pruebas de carga, documentación |
| Transición | Sprint Final | Semana 14 | Despliegue staging, informe final, presentación |

#### 7.3.2 Épicas del Sistema (Backlog de Alto Nivel)

| EPIC | Descripción | Estado |
|---|---|---|
| EPIC-01 | Autenticación, RBAC y gestión de usuarios | ✅ Completado |
| EPIC-02 | Historial Clínico Electrónico (HCE) | ✅ Completado |
| EPIC-03 | Diagnóstico Inteligente de Síntomas (IA + Audio) | 🔵 En curso (Sprint 2) |
| EPIC-04 | Dashboard Analítico y Epidemiológico | 🔵 En curso |
| EPIC-05 | Integración Wearables y Monitoreo Continuo | ✅ Completado |
| EPIC-06 | Sistema de Alertas y Notificaciones | ✅ Completado |
| EPIC-07 | Módulo de Citas Médicas | ✅ Completado |
| EPIC-08 | Sistema de Emergencias | ✅ Completado |
| EPIC-09 | Integración FHIR y Laboratorios | 🔵 Prototipo |
| EPIC-10 | Telemedicina y Chat Clínico | ✅ Completado |

#### 7.3.3 Artefactos de Metodología de Implementación

Los documentos formales de la metodología se encuentran disponibles individualmente en la carpeta **Documentation/** del repositorio:

| Artefacto | Archivo | Descripción |
|---|---|---|
| **Documento de Visión** | `Documentation/FD02-EPIS-Informe Vision de Proyecto.docx` | Define el alcance, stakeholders, necesidades del negocio y visión del producto RespiCare |
| **Especificación de Requisitos de Software (SRS)** | `Documentation/FD03-EPIS-Informe SRS de Proyecto.docx` | Requisitos funcionales y no funcionales, casos de uso, diagramas UML |
| **Documento de Arquitectura de Software (SAD)** | `Documentation/FD04-EPIS-Informe SAD de Proyecto.docx` | Vistas arquitectónicas (4+1), decisiones de diseño, patrones aplicados |
| **Informe de Factibilidad** | `Documentation/FD01-EPIS-Informe de Factibilidad de Proyecto.docx` | Análisis de factibilidad técnica, económica, operativa, social, legal y ambiental |
| **Plan de Pruebas** | `docs/testing/Plan_Pruebas_Software_RespiCare.md` | Plan completo ISO/IEC/IEEE 29119-3 para EPIC-03 |

> **Nota:** Los documentos SRS, SAD y de Visión constituyen los artefactos formales de la metodología de implementación y se entregan como archivos individuales en la carpeta `Documentation/` (Metodología de implementación — Anexa).

---

## 8. CRONOGRAMA

### 8.1 Cronograma General del Proyecto

| Semana | Período | Actividad Principal | Responsable | Estado |
|---|---|---|---|---|
| Semana 1–2 | Mar 2026 | Análisis de requisitos, propuesta de proyecto, documento de visión | Chávez Linares, C. | ✅ Completado |
| Semana 3–4 | Abr 2026 | SRS, diagramas UML, casos de uso | Chávez Linares, C. | ✅ Completado |
| Semana 5–6 | Abr 2026 | SAD, arquitectura limpia, setup Docker, CI/CD base | Chávez Linares, C. | ✅ Completado |
| Semana 7 | May 2026 | EPIC-01 y EPIC-02: autenticación, HCE, frontend web | Chávez Linares, C. | ✅ Completado |
| Semana 8 | May 2026 | EPIC-03 inicio: servicio IA, Random Forest, API predict | Chávez Linares, C. | ✅ Completado |
| Semana 9 | May 2026 | EPIC-05 wearables, EPIC-06 alertas, EPIC-08 emergencias | Chávez Linares, C. | ✅ Completado |
| Semana 10 | May 2026 | Cobertura de pruebas >70%, fix linting, despliegue dev | Chávez Linares, C. | ✅ Completado |
| Semana 11 | Jun 2026 | EPIC-03 CNN audio, panel doctor, pruebas integración | Chávez Linares, C. | ✅ Completado |
| Semana 12 | Jun 2026 | Plan de pruebas ISO 29119-3, casos de prueba CP-001 a CP-010 | Chávez Linares, C. | ✅ Completado |
| Semana 13 | Jun 2026 | Ejecución de pruebas, corrección de defectos, análisis estático | Chávez Linares, C. | 🔵 En curso |
| Semana 14 | Jun 2026 | Informe final, presentación, despliegue staging | Chávez Linares, C. | 🔵 En curso |

### 8.2 Recursos del Proyecto

**Recursos Humanos:**

| Rol | Persona | Dedicación | Horas Totales |
|---|---|---|---|
| Desarrollador Full-Stack / QA Lead | Chávez Linares, Cesar Fabian | 20 h/semana × 14 semanas | 280 horas |
| Supervisor Académico | Mag. Alberto Johnatan Flor Rodríguez | Revisión semanal (1 h/semana) | 14 horas |

**Recursos Tecnológicos:**

| Recurso | Descripción | Uso |
|---|---|---|
| Computadora portátil | Intel i7, 16 GB RAM, 512 GB SSD | Desarrollo y ejecución local |
| Servidor VPS | 4 vCPU, 8 GB RAM, Ubuntu 22.04 | Staging y demo |
| Repositorio GitHub | github.com/Zod0808/Sistema-Web-y-Movil-... | Control de versiones, CI/CD |
| Docker Hub | Registro de imágenes Docker | Distribución de contenedores |
| Dispositivo Android | Android 13+ | Pruebas de la app móvil |

**Distribución de tiempo por área:**

| Área | Horas Estimadas | % del Total |
|---|---|---|
| Backend (API, arquitectura, tests) | 90 horas | 32% |
| AI Services (modelos ML, CNN, API) | 70 horas | 25% |
| Frontend Web (React, dashboard) | 50 horas | 18% |
| App Móvil (Capacitor, offline) | 35 horas | 12.5% |
| DevOps (Docker, CI/CD, nginx) | 20 horas | 7% |
| Documentación y pruebas formales | 15 horas | 5.5% |
| **TOTAL** | **280 horas** | **100%** |

---

## 9. PRESUPUESTO

### 9.1 Presupuesto Detallado

#### 9.1.1 Recursos Humanos

| Ítem | Horas | Costo por Hora (Ref. Mercado) | Total S/. | Observaciones |
|---|---|---|---|---|
| Desarrollador Full-Stack Junior (Junior Dev Perú 2026) | 280 h | S/. 25/h | S/. 7,000 | Costo de oportunidad, no desembolsado |
| **Subtotal RRHH (costo de oportunidad)** | | | **S/. 7,000** | No desembolsado |

#### 9.1.2 Hardware

| Ítem | Valor | Amortización (6 meses) | Total S/. |
|---|---|---|---|
| Laptop de desarrollo (existente, S/. 3,500, vida útil 4 años) | S/. 3,500 | 12.5% | S/. 437.50 |
| **Subtotal Hardware** | | | **S/. 437.50** |

#### 9.1.3 Software y Servicios

| Ítem | Costo Mensual | Duración | Total S/. |
|---|---|---|---|
| VPS (staging) — 4 vCPU / 8 GB | S/. 40/mes | 3 meses | S/. 120 |
| Dominio web (.pe o .com) | S/. 50/año | 1 año | S/. 50 |
| Créditos API OpenAI (GPT-4 para chatbot) | S/. 50 (pack único) | Proyecto | S/. 50 |
| Twilio SMS (tier gratuito) | S/. 0 | — | S/. 0 |
| GitHub Actions (tier gratuito para repos públicos) | S/. 0 | — | S/. 0 |
| Docker Hub (tier gratuito) | S/. 0 | — | S/. 0 |
| **Subtotal Software y Servicios** | | | **S/. 220** |

#### 9.1.4 Comunicaciones y Otros

| Ítem | Costo Mensual | Duración | Total S/. |
|---|---|---|---|
| Internet (fibra óptica, plan existente) | S/. 50/mes | 3 meses | S/. 150 |
| Impresión de documentos | — | Proyecto | S/. 80 |
| Materiales de escritorio | — | Proyecto | S/. 20 |
| **Subtotal Comunicaciones** | | | **S/. 250** |

### 9.2 Resumen Presupuestal

| Categoría | Total S/. | Desembolsable |
|---|---|---|
| Recursos Humanos (costo de oportunidad) | S/. 7,000 | No |
| Hardware (amortización) | S/. 437.50 | No |
| Software y Servicios (pagado) | S/. 220 | **Sí** |
| Comunicaciones y Otros | S/. 250 | **Sí** |
| **TOTAL PROYECTO** | **S/. 7,907.50** | — |
| **TOTAL DESEMBOLSABLE** | **S/. 470** | **Sí** |

> El costo real desembolsado por el estudiante es de **S/. 470 soles**, siendo el resto costo de oportunidad del tiempo invertido. Este presupuesto es completamente autofinanciado por el estudiante, sin requerir fondos externos o becas adicionales.

---

## 10. CONCLUSIONES Y RECOMENDACIONES

### 10.1 Conclusiones

**C1 — Viabilidad técnica demostrada:** El proyecto demostró que es posible construir un sistema de salud digital completo (web + móvil + IA) utilizando exclusivamente tecnologías open source, con un solo desarrollador y en el tiempo de un semestre académico. La combinación Node.js/TypeScript + Python/FastAPI + React + Capacitor + Docker resultó ser un stack coherente, mantenible y deployable.

**C2 — Arquitectura limpia como ventaja:** La adopción de Clean Architecture en el backend facilitó significativamente el testing unitario: las entidades de dominio y los casos de uso son testeables sin base de datos ni framework, lo que contribuyó a alcanzar una cobertura del 70.22% en statements. En un contexto de salud donde la corrección de la lógica de negocio es crítica, esta arquitectura es la elección correcta.

**C3 — La IA como apoyo, no reemplazo:** El diseño "doctor-in-the-loop" —donde la IA sugiere y el médico valida— resultó ser la decisión de diseño más importante del sistema. Garantiza la seguridad clínica, mitiga el riesgo de diagnósticos erróneos y alinea el sistema con los marcos éticos de IA en salud (WHO Ethics and Governance of AI for Health, 2021).

**C4 — Cobertura de pruebas como métrica de madurez:** Alcanzar el 70% de cobertura requirió resolver problemas no triviales: mocking de módulos C++ de Sentry, separación de configuración de ambiente (`env.setup.ts`), bypass de autenticación en modo test, y corrección de hoisting TDZ. Esta experiencia demostró que la configuración de la infraestructura de testing es tan compleja como el código de producción.

**C5 — El paradigma Shift-Left reducce retrabajo:** La aplicación de TDD en los servicios críticos (`symptomService`, `predict_service.py`, `aiIntegration`) permitió detectar inconsistencias de contrato entre el backend y los servicios IA antes de la integración, evitando horas de debugging posteriores. El ciclo Red-Green-Refactor es eficiente y genera documentación viva del comportamiento esperado.

**C6 — DevOps no es opcional:** La configuración del pipeline CI/CD (GitHub Actions) y la orquestación Docker fueron determinantes para la calidad del proyecto. Sin CI automatizado, los defectos de regresión habrían pasado desapercibidos. El proyecto confirmó que invertir tiempo en DevOps temprano es siempre rentable.

### 10.2 Dificultades y Retos en el Desarrollo

**D1 — Complejidad de la infraestructura de testing:** El mayor obstáculo técnico fue configurar Jest para el backend de Node.js con TypeScript. Los módulos nativos de C++ (Sentry Profiling), las variables de entorno cargadas en módulos en tiempo de importación (antes de que setupFiles se ejecute) y los conflictos de hoisting TDZ en Jest con `jest.mock` requirieron múltiples iteraciones antes de estabilizarse. Solución: separar `env.setup.ts` (setupFiles, pre-import) de `setup.ts` (setupFilesAfterEnv, post-import).

**D2 — Integración CORS entre contenedores Docker:** La comunicación entre la app móvil (Capacitor en Android) y el backend Nginx generó errores CORS difíciles de depurar, especialmente al migrar de configuración de desarrollo a staging. Las cabeceras duplicadas por entradas redundantes en nginx.conf causaron fallos silenciosos. Solución: auditoría sistemática del nginx.conf y uso de variables de configuración para el origen CORS.

**D3 — WebSocket detrás de Nginx:** Los WebSockets para datos en tiempo real de wearables (`/ws/wearables`) fallaban silenciosamente tras el proxy Nginx por timeouts de conexión (default 60s). Solución: configurar `proxy_read_timeout 3600s` y `proxy_send_timeout 3600s` en los bloques de location de WebSocket.

**D4 — Refactorización del chatbot móvil (1,527 → 7 líneas):** El componente `chatbot.tsx` original tenía 1,527 líneas de código mezclando lógica de negocio, gestión de estado y UI, violando el principio de responsabilidad única. Refactorizarlo en 9 módulos (4 hooks + 4 componentes + 1 orquestador) sin romper la funcionalidad existente requirió un análisis cuidadoso de las dependencias internas. Solución: técnica de extracción incremental con re-exports para compatibilidad hacia atrás.

**D5 — Datos de entrenamiento para el modelo CNN de audio:** La principal limitación del módulo de análisis de tos es la ausencia de un dataset etiquetado de grabaciones de tos de pacientes peruanos. Se utilizó el dataset público ESC-50 como sustituto temporal, lo que introduce un sesgo de dominio. Para un despliegue real, se requerirían al menos 500 grabaciones etiquetadas clínicamente.

**D6 — Compatibilidad de Capacitor con permisos Android 13+:** El manejo de permisos `RECORD_AUDIO` cambió en Android 13, requiriendo el uso de la nueva API de permisos de Capacitor y pruebas en dispositivo físico (no reproducibles en emulador con la misma fidelidad). Este fue el único caso de prueba (CP-EPIC03-006) que no pudo automatizarse completamente.

### 10.3 Recomendaciones

**R1:** Para un despliegue real en establecimientos de salud de Tacna, se recomienda iniciar con un piloto controlado en un Centro de Salud de primer nivel, con un grupo de 5-10 médicos, durante 3 meses. Los resultados del piloto permitirían validar clínicamente el accuracy del modelo y recopilar datos de tos para reentrenamiento.

**R2:** Migrar el frontend web de React/JavaScript a Next.js/TypeScript para aprovechar SSR/SSG, mejorar el SEO y la carga inicial, y completar la transición a TypeScript estricto iniciada en el backend.

**R3:** Implementar autenticación biométrica en la app móvil (Face ID/Touch ID/Huella) para mejorar la usabilidad en dispositivos médicos donde el teclado es inconveniente.

**R4:** Integrar FHIR R4 completo con el sistema de información del MINSA para habilitar la interoperabilidad con otros establecimientos de salud de la red pública. Esto requeriría coordinación con el equipo técnico del MINSA y aprobación regulatoria.

**R5:** Establecer un proceso formal de reentrenamiento periódico (retraining pipeline) de los modelos ML cada 3 meses, utilizando los datos reales acumulados del sistema con validación médica previa. El módulo de auto-retraining ya está implementado (`AUTO_RETRAINING_COMPLETE.md`) pero requiere supervisión clínica formal.

**R6:** Considerar la certificación ISO/IEC 82304-1 (Health Software) para eventuales usos clínicos reales, lo que requeriría cumplir con requisitos adicionales de documentación de seguridad y gestión de riesgos del software médico.

---

## 11. BIBLIOGRAFÍA

### Estándares y Normas

1. IEEE Computer Society. (2024). *SWEBOK V4 — Guide to the Software Engineering Body of Knowledge*. IEEE Press.

2. ISO/IEC/IEEE. (2021). *ISO/IEC/IEEE 29119-3:2021 — Software and Systems Engineering — Software Testing — Part 3: Test Documentation*. International Organization for Standardization.

3. ISO/IEC. (2011). *ISO/IEC 25010:2011 — Systems and Software Engineering — Systems and Software Quality Requirements and Evaluation (SQuaRE) — System and Software Quality Models*. ISO.

4. OWASP Foundation. (2021). *OWASP Application Security Verification Standard (ASVS) v4.0.3*. OWASP.

5. HL7 International. (2023). *FHIR R4 — Fast Healthcare Interoperability Resources Release 4*. Health Level Seven International.

6. World Health Organization. (2021). *Ethics and Governance of Artificial Intelligence for Health: WHO Guidance*. WHO Press. Geneva.

### Legislación

7. Congreso de la República del Perú. (2011). *Ley N.° 29733 — Ley de Protección de Datos Personales*. El Peruano.

8. Ministerio de Salud del Perú. (2015). *Ley N.° 30024 — Ley que crea el Registro Nacional de Historias Clínicas Electrónicas*. MINSA.

9. U.S. Department of Health and Human Services. (1996). *Health Insurance Portability and Accountability Act (HIPAA) — Security Rule 45 CFR Part 164*. HHS.

### Artículos Científicos y Técnicos

10. Rajpurkar, P., Irvin, J., Ball, R. L., Zhu, K., Yang, B., Mehta, H., ... & Lungren, M. P. (2017). *CheXNet: Radiologist-level pneumonia detection on chest X-rays with deep learning*. arXiv preprint arXiv:1711.07204.

11. Pham, T. T., Tran, T., Phung, D., & Venkatesh, S. (2021). *Interpreting chest X-rays via CNNs that mimic human gaze*. *Artificial Intelligence in Medicine, 116*, 102084.

12. Lundberg, S. M., & Lee, S. I. (2017). *A unified approach to interpreting model predictions*. Advances in Neural Information Processing Systems (NeurIPS), 30.

13. Chen, T., & Guestrin, C. (2016). *XGBoost: A scalable tree boosting system*. Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining. ACM.

14. Breiman, L. (2001). *Random forests*. *Machine Learning, 45*(1), 5–32.

15. Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.

### Documentación Técnica del Proyecto

16. Chávez Linares, C. F. (2026). *FD01 — Informe de Factibilidad de Proyecto RespiCare*. Universidad Privada de Tacna.

17. Chávez Linares, C. F. (2026). *FD02 — Informe Visión de Proyecto RespiCare*. Universidad Privada de Tacna.

18. Chávez Linares, C. F. (2026). *FD03 — Informe SRS de Proyecto RespiCare*. Universidad Privada de Tacna.

19. Chávez Linares, C. F. (2026). *FD04 — Informe SAD de Proyecto RespiCare*. Universidad Privada de Tacna.

20. Chávez Linares, C. F. (2026). *Plan de Pruebas de Software RespiCare — EPIC-03 (ISO/IEC/IEEE 29119-3)*. Construcción de Software II, Ciclo X, UPT.

### Recursos en Línea

21. Node.js Foundation. (2024). *Node.js v20 LTS Documentation*. Recuperado de https://nodejs.org/docs/

22. FastAPI. (2024). *FastAPI Official Documentation*. Recuperado de https://fastapi.tiangolo.com/

23. Docker Inc. (2024). *Docker Compose Documentation*. Recuperado de https://docs.docker.com/compose/

24. Scikit-learn Developers. (2024). *Scikit-learn: Machine Learning in Python*. Recuperado de https://scikit-learn.org/

25. GitHub. (2024). *GitHub Actions Documentation*. Recuperado de https://docs.github.com/actions

---

*Chávez Linares, Cesar Fabian · Código: 2019063854*
*Construcción de Software II · Ciclo X · Junio 2026*
*Universidad Privada de Tacna — Escuela Profesional de Ingeniería de Sistemas*
*Docente: Mag. Alberto Johnatan Flor Rodríguez*