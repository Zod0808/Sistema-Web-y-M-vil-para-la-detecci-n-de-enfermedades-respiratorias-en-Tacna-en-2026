**![C:\\Users\\EPIS\\Documents\\upt.png][image1]**

**UNIVERSIDAD PRIVADA DE TACNA**

**FACULTAD DE INGENIERÍA**

**Escuela Profesional de Ingeniería de Sistemas**

**Informe Final**   

**Proyecto *"Sistema Web y Móvil para la detección de enfermedades respiratorias en Tacna en 2025"***

Curso: *Construcción de Software I*

Docente: Alberto Flor Rodríguez

Integrantes:

***Chávez Linares, Cesar Fabian                  	(2019063854)***

**Tacna – Perú**  
***2025***

| CONTROL DE VERSIONES |  |  |  |  |  |
| :---: | :---: | :---: | :---: | :---: | ----- |
| Versión | Hecha por | Revisada por | Aprobada por | Fecha | Motivo |
| 1.0 | CFCL | AFR | AFR | 26/01/2025 | Versión Original |

# **ÍNDICE GENERAL**

1. Antecedentes									1  
2. Planteamiento del Problema							4  
   1. Problema  
   2. Justificación  
   3. Alcance  
3. Objetivos										6  
4. Marco Teórico									7  
5. Desarrollo de la Solución							9  
   1. Análisis de Factibilidad (técnico, económica, operativa, social, legal, ambiental)  
   2. Tecnología de Desarrollo  
   3. Metodología de implementación  
   4. Ejecución de la revisión de código base
6. Cronograma									11  
7. Presupuesto									12  
8. Conclusiones									13
9. Recomendaciones									14
10. Bibliografía									15
11. Anexos										16

---

# **1. ANTECEDENTES**

Las enfermedades respiratorias representan uno de los principales problemas de salud pública en el Perú, especialmente en regiones como Tacna, donde factores como la altitud, condiciones climáticas y factores ambientales contribuyen a la prevalencia de estas afecciones. Según datos del Centro Nacional de Epidemiología, Prevención y Control de Enfermedades (2016), las Infecciones Respiratorias Agudas (IRA) constituyen una de las principales causas de consulta médica y hospitalización en el país.

En el contexto de la pandemia de COVID-19, la necesidad de sistemas tecnológicos que faciliten la detección temprana, seguimiento y análisis de enfermedades respiratorias se ha vuelto aún más crítica. La implementación de herramientas de inteligencia artificial y machine learning en el sector salud ha demostrado ser efectiva para mejorar la precisión diagnóstica y optimizar los recursos médicos disponibles.

El proyecto "RespiCare Tacna" surge como respuesta a esta necesidad, integrando tecnologías modernas de desarrollo web, aplicaciones móviles y sistemas de inteligencia artificial para crear una plataforma integral que facilite la gestión y análisis de enfermedades respiratorias en la región de Tacna.

El sistema ha sido desarrollado siguiendo metodologías ágiles de desarrollo de software (SCRUM), aplicando principios de arquitectura limpia y buenas prácticas de ingeniería de software, resultando en una solución robusta, escalable y mantenible.

---

# **2. PLANTEAMIENTO DEL PROBLEMA**

## **2.1. Problema**

El diagnóstico tardío de enfermedades respiratorias en la región de Tacna representa un problema significativo de salud pública que afecta tanto a pacientes como al sistema de salud en general. Las principales dificultades identificadas incluyen:

1. **Detección Tardía**: La falta de herramientas tecnológicas accesibles para la detección temprana de síntomas respiratorios resulta en diagnósticos tardíos, lo que puede agravar las condiciones de los pacientes y aumentar los costos de tratamiento.

2. **Limitada Capacidad de Análisis**: Los sistemas de salud tradicionales carecen de herramientas avanzadas para analizar grandes volúmenes de datos clínicos, identificar patrones epidemiológicos y predecir tendencias de enfermedades respiratorias.

3. **Acceso Limitado a Servicios de Salud**: La población de Tacna enfrenta dificultades para acceder a servicios de salud especializados, especialmente en zonas rurales o alejadas de los centros médicos principales.

4. **Falta de Sistemas de Apoyo a la Decisión Médica**: Los profesionales de salud no cuentan con herramientas tecnológicas modernas que les permitan tomar decisiones informadas basadas en análisis de datos y predicciones de machine learning.

5. **Fragmentación de Información**: La información de salud se encuentra dispersa en diferentes sistemas, dificultando la integración y análisis integral de los datos de pacientes.

## **2.2. Justificación**

La implementación de un sistema web y móvil para la detección de enfermedades respiratorias en Tacna se justifica por las siguientes razones:

### **Impacto en Salud Pública**
- La detección temprana de enfermedades respiratorias puede salvar vidas y reducir significativamente los costos de tratamiento al prevenir complicaciones graves.
- El sistema permite identificar patrones epidemiológicos y tendencias que facilitan la planificación de recursos médicos y la implementación de políticas de salud preventiva.

### **Tecnología Accesible**
- Las tecnologías modernas de desarrollo web y móvil permiten crear herramientas accesibles tanto para profesionales de salud como para pacientes, mejorando la accesibilidad a servicios de salud.

### **Análisis de Datos Avanzado**
- La integración de sistemas de machine learning y análisis de datos permite identificar patrones complejos en los datos de salud que no serían evidentes mediante análisis tradicionales.

### **Educación y Concienciación**
- El sistema contribuye a la educación de la población sobre enfermedades respiratorias, síntomas de alerta y medidas preventivas.

### **Eficiencia del Sistema de Salud**
- La automatización de procesos y el análisis predictivo permiten optimizar el uso de recursos médicos, reducir tiempos de espera y mejorar la calidad de atención.

## **2.3. Alcance**

El proyecto "RespiCare Tacna" tiene el siguiente alcance:

### **Alcance Funcional**
- Sistema web para profesionales de salud con funcionalidades de gestión de historias médicas, análisis de síntomas, citas médicas, prescripciones y reportes.
- Aplicación móvil para pacientes con funcionalidades de consulta de síntomas, chatbot médico, gestión de citas, visualización de historial médico y notificaciones.
- Sistema de machine learning para clasificación de enfermedades respiratorias con alta precisión (>99%).
- Chatbot médico inteligente con capacidades de análisis multimodal (texto, voz, imágenes).
- Sistema de analytics y business intelligence para análisis de tendencias, predicción de brotes y detección de anomalías.
- Dashboards ejecutivos para autoridades de salud con visualizaciones interactivas y reportes automáticos.

### **Alcance Técnico**
- Arquitectura de microservicios escalable con separación de responsabilidades.
- Backend desarrollado en Node.js/TypeScript con arquitectura limpia.
- Servicios de IA desarrollados en Python/FastAPI con modelos de machine learning avanzados.
- Frontend web desarrollado en React con design system y temas.
- Aplicación móvil desarrollada en React Native/Expo con soporte offline-first.
- Integración con bases de datos MongoDB y Redis para almacenamiento y caché.
- Sistema de autenticación y autorización con JWT y control de acceso basado en roles (RBAC).

### **Alcance Geográfico**
- Implementación inicial enfocada en la región de Tacna, Perú.
- Diseño escalable para futura expansión a otras regiones del país.

### **Limitaciones**
- El sistema no reemplaza el diagnóstico médico profesional, sino que actúa como herramienta de apoyo.
- Requiere conexión a internet para funcionalidades en tiempo real (aunque la app móvil incluye soporte offline).
- La precisión del sistema de ML depende de la calidad y cantidad de datos de entrenamiento disponibles.

---

# **3. OBJETIVOS**

## **3.1. Objetivo General**

Desarrollar un sistema web y móvil integrado que permita la detección temprana, seguimiento y análisis de enfermedades respiratorias en Tacna utilizando técnicas de procesamiento de lenguaje natural, machine learning y tecnologías de desarrollo modernas.

## **3.2. Objetivos Específicos**

1. **Implementar una arquitectura de microservicios escalable** con tecnologías modernas (Node.js, Python, React, React Native) que permita el crecimiento y mantenimiento del sistema.

2. **Desarrollar un sistema de Machine Learning con alta precisión** (>99%) para clasificación de enfermedades respiratorias, utilizando modelos como XGBoost, Random Forest y Neural Networks, con explicabilidad SHAP integrada.

3. **Crear una interfaz web intuitiva** para profesionales de salud con funcionalidades completas de gestión clínica, analytics avanzados y dashboards ejecutivos.

4. **Desarrollar una aplicación móvil nativa** para acceso de pacientes con funcionalidades offline-first, chatbot médico multimodal y gestión de citas y prescripciones.

5. **Implementar sistema de analytics avanzados** con visualizaciones interactivas, predicción de tendencias, detección de anomalías y reportes automáticos para autoridades de salud.

6. **Aplicar metodología ágil SCRUM** para gestión del proyecto, asegurando entregas incrementales de valor y adaptabilidad a cambios durante el desarrollo.

7. **Garantizar calidad del software** mediante testing exhaustivo (cobertura >98%), análisis estático de código y documentación completa del sistema.

8. **Implementar medidas de seguridad** cumpliendo con estándares GDPR/HIPAA, incluyendo cifrado de datos sensibles, audit trails y gestión de derechos de sujetos de datos (DSR).

---

# **4. MARCO TEÓRICO**

## **4.1. Enfermedades Respiratorias**

Las enfermedades respiratorias constituyen un grupo diverso de afecciones que afectan el sistema respiratorio, incluyendo desde condiciones agudas como resfriados comunes hasta enfermedades crónicas como asma y EPOC (Enfermedad Pulmonar Obstructiva Crónica). Según la Organización Mundial de la Salud (OMS), las enfermedades respiratorias representan una de las principales causas de morbilidad y mortalidad a nivel mundial.

En el contexto peruano, especialmente en regiones de alta altitud como Tacna, factores como la disminución de la presión atmosférica, menor concentración de oxígeno y condiciones climáticas específicas pueden influir en la prevalencia y severidad de estas enfermedades.

## **4.2. Inteligencia Artificial en Salud**

La aplicación de técnicas de inteligencia artificial y machine learning en el sector salud ha demostrado ser efectiva para mejorar la precisión diagnóstica, optimizar recursos y facilitar la toma de decisiones médicas. Según estudios recientes (Shickel et al., 2018), el uso de deep learning y procesamiento de lenguaje natural en historias clínicas puede mejorar significativamente la eficiencia del diagnóstico.

### **Machine Learning en Diagnóstico Médico**

Los algoritmos de machine learning, particularmente Random Forest, XGBoost y Neural Networks, han demostrado alta precisión en tareas de clasificación médica. El proyecto implementa un sistema híbrido que combina múltiples modelos para alcanzar precisiones superiores al 99%.

### **Explicabilidad en IA Médica**

La explicabilidad es crucial en aplicaciones médicas de IA. SHAP (SHapley Additive exPlanations) proporciona un marco teórico sólido para explicar las predicciones de modelos de machine learning, permitiendo a los profesionales de salud entender los factores que influyen en cada diagnóstico.

## **4.3. Procesamiento de Lenguaje Natural**

El procesamiento de lenguaje natural (NLP) permite extraer información estructurada de texto no estructurado, como historias clínicas. Técnicas como Named Entity Recognition (NER), análisis de sentimiento y resumen automático son fundamentales para el procesamiento de datos médicos en español.

## **4.4. Arquitectura de Software**

### **Arquitectura de Microservicios**

La arquitectura de microservicios permite construir sistemas escalables y mantenibles mediante la separación de funcionalidades en servicios independientes. Esta arquitectura facilita el desarrollo, despliegue y escalado de diferentes componentes del sistema.

### **Clean Architecture**

Los principios de Clean Architecture, propuestos por Robert C. Martin, promueven la separación de responsabilidades y la independencia de frameworks, facilitando el testing y mantenimiento del código.

## **4.5. Metodologías Ágiles**

La metodología SCRUM proporciona un marco de trabajo ágil que permite la entrega incremental de valor, adaptabilidad a cambios y mejora continua mediante iteraciones cortas (sprints) y retroalimentación constante.

## **4.6. Desarrollo Basado en Pruebas (TDD)**

El Test-Driven Development (TDD) es una práctica de desarrollo que promueve escribir pruebas antes de implementar funcionalidades, mejorando la calidad del código y facilitando el mantenimiento.

---

# **5. DESARROLLO DE LA SOLUCIÓN**

## **5.1. Análisis de Factibilidad**

### **5.1.1. Factibilidad Técnica**

El proyecto es técnicamente factible debido a:

- **Tecnologías Maduras**: Se utilizan tecnologías ampliamente adoptadas y con gran comunidad de soporte (Node.js, Python, React, MongoDB).
- **Experiencia del Equipo**: El equipo de desarrollo cuenta con conocimientos en las tecnologías seleccionadas.
- **Recursos Disponibles**: Las herramientas de desarrollo son de código abierto o tienen versiones gratuitas disponibles.
- **Arquitectura Probada**: La arquitectura de microservicios y clean architecture son patrones probados en la industria.

**Resultado**: ✅ **FACTIBLE**

### **5.1.2. Factibilidad Económica**

El proyecto es económicamente factible porque:

- **Costo de Desarrollo**: Utiliza principalmente tecnologías de código abierto, reduciendo costos de licencias.
- **Infraestructura**: Puede desplegarse en infraestructura cloud con modelos de pago por uso, optimizando costos.
- **ROI Positivo**: El sistema puede generar ahorros significativos al optimizar recursos médicos y mejorar la eficiencia del sistema de salud.
- **Escalabilidad**: La arquitectura permite escalar gradualmente según demanda, controlando costos.

**Resultado**: ✅ **FACTIBLE**

### **5.1.3. Factibilidad Operativa**

El proyecto es operativamente factible considerando:

- **Capacitación**: El sistema está diseñado con interfaces intuitivas que requieren capacitación mínima.
- **Integración**: Puede integrarse con sistemas existentes mediante APIs estándar (HL7/FHIR).
- **Soporte**: La documentación completa y arquitectura modular facilitan el mantenimiento.
- **Despliegue**: Utiliza Docker y Kubernetes para facilitar el despliegue y gestión operativa.

**Resultado**: ✅ **FACTIBLE**

### **5.1.4. Factibilidad Social**

El proyecto es socialmente factible porque:

- **Aceptación**: Los sistemas de salud digital han demostrado alta aceptación entre profesionales y pacientes.
- **Accesibilidad**: La aplicación móvil y web son accesibles desde dispositivos comunes (smartphones, tablets, computadoras).
- **Beneficios Claros**: Los beneficios para pacientes y profesionales de salud son evidentes y medibles.
- **Educación**: El sistema contribuye a la educación en salud de la población.

**Resultado**: ✅ **FACTIBLE**

### **5.1.5. Factibilidad Legal**

El proyecto cumple con aspectos legales:

- **Protección de Datos**: Implementa medidas de seguridad y privacidad conforme a GDPR y estándares de protección de datos de salud.
- **Cumplimiento HIPAA**: Incluye controles de acceso, audit trails y gestión de consentimientos.
- **Propiedad Intelectual**: El código es desarrollado con licencias apropiadas.
- **Regulaciones Médicas**: El sistema actúa como herramienta de apoyo, no reemplaza diagnóstico médico profesional.

**Resultado**: ✅ **FACTIBLE**

### **5.1.6. Factibilidad Ambiental**

El proyecto es ambientalmente factible:

- **Reducción de Papel**: La digitalización reduce el uso de papel en historias clínicas.
- **Eficiencia Energética**: La optimización de recursos reduce desplazamientos innecesarios.
- **Cloud Computing**: El uso de infraestructura cloud puede ser más eficiente energéticamente que servidores locales.

**Resultado**: ✅ **FACTIBLE**

## **5.2. Tecnología de Desarrollo**

### **5.2.1. Stack Tecnológico Backend**

- **Node.js 18+** con **TypeScript**: Runtime y lenguaje para el backend principal
- **Express.js**: Framework web para APIs REST
- **MongoDB 6.0+**: Base de datos NoSQL para almacenamiento de datos
- **Mongoose**: ODM (Object Document Mapper) para MongoDB
- **Redis**: Sistema de caché en memoria para optimización de rendimiento
- **JWT (JSON Web Tokens)**: Sistema de autenticación y autorización
- **Clean Architecture**: Separación de capas (controllers, services, repositories, models)

### **5.2.2. Stack Tecnológico Servicios de IA**

- **Python 3.11+**: Lenguaje de programación para servicios de IA
- **FastAPI**: Framework web moderno y rápido para APIs asíncronas
- **XGBoost**: Algoritmo de machine learning para clasificación (99.81% accuracy)
- **scikit-learn**: Biblioteca de machine learning (Random Forest: 99.19% accuracy)
- **PyTorch**: Framework de deep learning para Neural Networks (99.64% accuracy)
- **SHAP**: Biblioteca para explicabilidad de modelos ML
- **spaCy**: Procesamiento de lenguaje natural médico
- **Transformers**: Modelos pre-entrenados (BERT médico)
- **Whisper (OpenAI)**: Transcripción de voz multilingüe
- **Librosa**: Análisis de características de audio

### **5.2.3. Stack Tecnológico Frontend Web**

- **React 18**: Biblioteca de JavaScript para interfaces de usuario
- **TypeScript**: Superset tipado de JavaScript
- **React Router 6**: Enrutamiento para aplicaciones SPA
- **Recharts/Chart.js**: Bibliotecas para visualizaciones de datos
- **Tailwind CSS**: Framework CSS utility-first para diseño
- **Zustand**: Gestión de estado global
- **Axios**: Cliente HTTP para comunicación con APIs
- **Leaflet**: Biblioteca para mapas interactivos

### **5.2.4. Stack Tecnológico Mobile**

- **React Native 0.79.5**: Framework para desarrollo móvil multiplataforma
- **Expo SDK 53**: Plataforma y herramientas para desarrollo React Native
- **TypeScript**: Tipado estático para mayor seguridad
- **React Navigation 6**: Navegación para aplicaciones móviles
- **AsyncStorage**: Almacenamiento local persistente
- **SQLite**: Base de datos local para funcionalidad offline
- **React Query**: Gestión de estado del servidor y caché

### **5.2.5. DevOps e Infraestructura**

- **Docker**: Containerización de aplicaciones
- **Docker Compose**: Orquestación de contenedores para desarrollo
- **Kubernetes**: Orquestación de contenedores para producción
- **Nginx**: Reverse proxy y load balancer
- **GitHub Actions**: CI/CD automatizado
- **Terraform**: Infrastructure as Code (IaC)
- **Structlog**: Logging estructurado

### **5.2.6. Testing y Calidad**

- **Jest**: Framework de testing para JavaScript/TypeScript
- **pytest**: Framework de testing para Python
- **Detox**: Framework de testing E2E para React Native
- **Cypress**: Framework de testing E2E para web
- **ESLint/Prettier**: Análisis estático de código y formateo
- **SonarQube**: Análisis de calidad de código

## **5.3. Metodología de Implementación**

### **5.3.1. Metodología Ágil SCRUM**

El proyecto fue desarrollado siguiendo una metodología ágil SCRUM adaptada, con las siguientes características:

#### **Roles del Equipo**
- **Product Owner (PO)**: Define requerimientos y prioridades del producto
- **Scrum Master**: Facilita el proceso ágil y elimina impedimentos
- **Development Team**: Equipo multidisciplinario de desarrollo

#### **Ceremonias Implementadas**
- **Sprint Planning**: Planificación de trabajo para cada sprint (2 semanas)
- **Daily Standups**: Reuniones diarias de sincronización
- **Sprint Review**: Demostración de funcionalidades completadas
- **Sprint Retrospective**: Retrospectiva para mejora continua

#### **Artefactos**
- **Product Backlog**: Lista priorizada de funcionalidades
- **Sprint Backlog**: Trabajo seleccionado para el sprint actual
- **Definition of Done (DoD)**: Criterios de completitud de tareas

### **5.3.2. Fases del Proyecto**

El proyecto se desarrolló en **15 fases principales** distribuidas en múltiples sprints:

#### **Fase 1: Fundamentos (Sprint 0)**
- Establecimiento de arquitectura base
- Configuración de microservicios
- Setup de Docker y CI/CD básico
- Estructura de base de datos inicial

#### **Fase 2: Dominios Core (Sprints 1-2)**
- Sistema de autenticación y autorización
- Gestión de historias médicas
- Sistema de citas médicas
- Gestión de prescripciones
- Sistema de alertas

#### **Fase 3: Analytics/ML Inicial (Sprints 3-4)**
- Modelos de machine learning básicos (Random Forest)
- Dashboard básico con métricas
- Integración ML en chatbot
- Sistema de explicabilidad SHAP

#### **Fase 4: Seguridad Base (Sprint 5)**
- Implementación de JWT
- Middlewares de seguridad
- Cifrado de datos sensibles
- Control de acceso basado en roles (RBAC)

#### **Fase 5: Testing y Calidad (Sprints 6-7)**
- Implementación de suites de testing
- Cobertura de código >98%
- Tests unitarios, de integración y E2E
- Análisis estático de código

#### **Fase 6: Optimización & Performance (Sprint 8)**
- Optimización de queries de base de datos
- Implementación de caché (Redis)
- Code splitting y lazy loading
- Optimización de imágenes y assets

#### **Fase 7: Funcionalidades Core (Sprints 9-10)**
- Completar funcionalidades de alertas
- Sistema de reportes automáticos
- Integración completa de prescripciones
- Mejoras en gestión de citas

#### **Fase 8: Integraciones Externas (Sprint 11)**
- Integración HL7/FHIR
- OAuth2 y mTLS para integraciones seguras
- APIs de medicamentos (FDA, RxNorm)
- Sincronización con sistemas de laboratorio

#### **Fase 9: Analytics & BI (Sprint 12)**
- Dashboard ejecutivo completo
- Predicción de tendencias
- Detección de anomalías
- Reportes automáticos avanzados

#### **Fase 10: Seguridad Avanzada (Sprint 13)**
- Hardening de seguridad
- WAF y protección DDoS
- GDPR/HIPAA compliance completo
- Gestión de derechos de sujetos de datos (DSR)

#### **Fase 11: UX/UI (Sprint 14)**
- Rediseño de interfaces
- Design system unificado
- Temas light/dark
- Accesibilidad WCAG 2.1 AA
- Mejoras en chatbot (multimodal)

#### **Fase 12: DevOps & Deployment (Sprint 15)**
- Pipelines de CI/CD completos
- Terraform para infraestructura
- Auto-scaling configurado
- Runbooks operacionales

#### **Fase 13: Escalabilidad & Arquitectura**
- Arquitectura de microservicios completa
- API Gateway (Kong)
- Service mesh
- Replicación y sharding de base de datos

#### **Fase 14: Documentación & Capacitación**
- Manuales de usuario completos
- Documentación técnica exhaustiva
- Guías de capacitación
- Runbooks y troubleshooting guides

#### **Fase 15: ML Avanzado**
- Modelos BERT médico
- Computer Vision para imágenes médicas
- Procesamiento de audio (Whisper, análisis de tos)
- Time Series Prediction
- Reinforcement Learning
- Federated Learning
- Optimización GPU

### **5.3.3. Desarrollo Basado en Pruebas (TDD)**

Se aplicó TDD en funcionalidades clave de todos los microservicios:

- **Backend**: Funciones de cálculo de severidad de síntomas
- **AI Services**: Funciones de cálculo de urgencia
- **Frontend Web**: Utilidades de formateo de datos
- **Frontend Mobile**: Utilidades de formateo de fechas

El ciclo TDD (Red-Green-Refactor) se aplicó consistentemente, resultando en:
- Cobertura de código >98% en backend
- Tests automatizados para todas las funcionalidades críticas
- Mejor calidad y mantenibilidad del código

### **5.3.4. Control de Calidad**

- **Cobertura de Tests**: >98% en backend, >80% en otros componentes
- **Análisis Estático**: ESLint, Prettier, SonarQube
- **Code Review**: Revisión de código antes de merge
- **Documentación**: READMEs completos, guías técnicas, manuales de usuario

## **5.4. Ejecución de la revisión de código base**

En el marco del curso de Construcción de Software I se formalizó el procedimiento de **revisión de código base**, orientando el trabajo hacia buenas prácticas y estándares de construcción de software. El objetivo es asegurar que los cambios críticos cumplan criterios de legibilidad, seguridad, mantenibilidad y trazabilidad antes de integrarse al repositorio principal.

### **5.4.1. Procedimiento**

Se ejecutó una revisión sistemática del código considerando buenas prácticas y estándares de construcción de software, siguiendo el siguiente checklist operativo:

| Paso | Actividad | Criterio de cumplimiento |
|------|-----------|--------------------------|
| 1 | **Seleccionar un módulo crítico del proyecto** | Priorizar componentes con alto impacto en seguridad, datos clínicos o continuidad del servicio |
| 2 | **Aplicar linters y análisis estático** | Ejecutar herramientas automatizadas sobre el módulo y corregir o justificar hallazgos |
| 3 | **Realizar un Pull Request con revisión por pares** | Todos los cambios integrados vía rama y PR, con al menos un revisor distinto al autor |
| 4 | **Documentar el feedback (comunicación efectiva — AG-I04)** | Dejar comentarios concretos en el PR, resumen de decisiones y seguimiento de observaciones |

**Módulo crítico seleccionado para la revisión profunda**: el subsistema **AI Services** (`ai-services`), implementado con **Python/FastAPI**. Este módulo concentra la lógica de predicción asistida, procesamiento de lenguaje natural, orquestación de modelos y exposición de APIs consumidas por backend, web y móvil; un defecto aquí tiene mayor riesgo para la interpretación clínica de soporte y para la confidencialidad de los datos procesados. Como contraste de capa de aplicación, también se revisó de forma periódica el **backend principal** (Node.js/TypeScript), por concentrar autenticación, reglas de negocio y persistencia.

### **5.4.2. Linters y análisis estático aplicados**

De acuerdo con la guía del proyecto (`docs/code-analysis/STATIC_CODE_ANALYSIS.md` y documentación relacionada), se utilizó un conjunto coherente de herramientas por stack:

- **Backend (Node.js/TypeScript)**: ESLint con reglas de complejidad y TypeScript estricto; verificación de tipos y auditoría de dependencias.
- **AI Services (Python)**: Pylint y Flake8 para estilo y calidad; **Bandit** para patrones inseguros; pruebas con **pytest** y seguimiento de cobertura donde aplica.
- **Frontend Web (React)**: ESLint orientado a React y buenas prácticas de componentes.
- **Mobile (React Native/Expo)**: ESLint/TypeScript con foco en consistencia y reducción de deuda técnica.

Los resultados agregados documentados en el repositorio sitúan la **calificación global de calidad de código en torno a A (9.1/10)**, con hallazgos mayoritariamente de severidad baja o media (estilo, longitud de línea, advertencias de tipos), y corrección iterativa en sprints posteriores.

### **5.4.3. Pull Request y revisión por pares**

El flujo adoptado replica prácticas estándar de la industria: rama de trabajo (`feature/` o `fix/`), commits atómicos cuando es posible, **Pull Request** descriptivo (contexto, riesgos, pruebas ejecutadas) y **revisión por pares** antes del merge a la rama principal. En entorno académico, el rol de “par” lo asumió el docente, un compañero de equipo o un integrante senior según disponibilidad, manteniendo el principio de que quien aprueba no es quien implementó el cambio de forma aislada.

### **5.4.4. Documentación del feedback (AG-I04)**

La retroalimentación se documentó de forma **explícita y rastreable**: comentarios en línea sobre fragmentos concretos de código, lista de cambios solicitados vs. resueltos, y un breve cierre en el cuerpo del PR (qué se acordó y qué quedó como mejora futura). Este registro permite demostrar **comunicación efectiva** entre autor y revisor: solicitudes claras, tono profesional, priorización (bloqueante vs. sugerido) y trazabilidad para auditorías académicas o técnicas.

---

# **6. CRONOGRAMA**

El proyecto se desarrolló durante un período de aproximadamente **6 meses**, organizado en **15 fases** distribuidas en múltiples sprints de 2 semanas cada uno.

## **Cronograma General**

| Fase | Descripción | Duración | Estado |
|------|-------------|----------|--------|
| 1 | Fundamentos | 2 semanas | ✅ Completado |
| 2 | Dominios Core | 4 semanas | ✅ Completado |
| 3 | Analytics/ML Inicial | 4 semanas | ✅ Completado |
| 4 | Seguridad Base | 2 semanas | ✅ Completado |
| 5 | Testing y Calidad | 4 semanas | ✅ Completado |
| 6 | Optimización & Performance | 2 semanas | ✅ Completado |
| 7 | Funcionalidades Core | 4 semanas | ✅ Completado |
| 8 | Integraciones Externas | 2 semanas | ✅ Completado |
| 9 | Analytics & BI | 2 semanas | ✅ Completado |
| 10 | Seguridad Avanzada | 2 semanas | ✅ Completado |
| 11 | UX/UI | 2 semanas | ✅ Completado |
| 12 | DevOps & Deployment | 2 semanas | ✅ Completado |
| 13 | Escalabilidad & Arquitectura | 2 semanas | ✅ Completado |
| 14 | Documentación & Capacitación | 2 semanas | ✅ Completado |
| 15 | ML Avanzado | 4 semanas | ✅ Completado |

**Total**: ~30 semanas (7.5 meses)

## **Hitos Principales**

- **MVP Funcional**: Finalización de Fase 2 (Sprint 4)
- **Sistema ML Operativo**: Finalización de Fase 3 (Sprint 6)
- **Sistema Completo**: Finalización de Fase 7 (Sprint 10)
- **Producción Ready**: Finalización de Fase 12 (Sprint 15)
- **Sistema Avanzado**: Finalización de Fase 15 (Sprint 19)

---

# **7. PRESUPUESTO**

## **7.1. Recursos Humanos**

| Recurso | Rol | Horas Estimadas | Costo/Hora | Total |
|---------|-----|-----------------|------------|-------|
| Desarrollador Full Stack | Desarrollo Backend/Frontend | 800 | S/. 50 | S/. 40,000 |
| Desarrollador ML/AI | Desarrollo Servicios IA | 600 | S/. 60 | S/. 36,000 |
| DevOps Engineer | Infraestructura y CI/CD | 200 | S/. 55 | S/. 11,000 |
| QA Engineer | Testing y Calidad | 300 | S/. 45 | S/. 13,500 |
| Product Owner | Gestión de Producto | 200 | S/. 50 | S/. 10,000 |
| **TOTAL RECURSOS HUMANOS** | | | | **S/. 110,500** |

## **7.2. Infraestructura y Herramientas**

| Recurso | Descripción | Costo Mensual | Meses | Total |
|---------|-------------|----------------|-------|-------|
| Servidores Cloud (Desarrollo) | AWS/GCP/Azure | S/. 500 | 6 | S/. 3,000 |
| Base de Datos MongoDB Atlas | Cluster básico | S/. 200 | 6 | S/. 1,200 |
| Redis Cloud | Caché en memoria | S/. 100 | 6 | S/. 600 |
| Dominio y SSL | Certificados SSL | S/. 200 | 1 | S/. 200 |
| Herramientas de Desarrollo | Licencias (opcional) | S/. 300 | 6 | S/. 1,800 |
| **TOTAL INFRAESTRUCTURA** | | | | **S/. 6,800** |

## **7.3. Software y Licencias**

| Recurso | Descripción | Costo |
|---------|-------------|-------|
| IDEs y Editores | VS Code (gratis), JetBrains (opcional) | S/. 0 - 1,000 |
| Herramientas de Testing | Jest, pytest (gratis) | S/. 0 |
| Servicios Cloud | Mayormente código abierto | S/. 0 |
| **TOTAL SOFTWARE** | | **S/. 0 - 1,000** |

## **7.4. Capacitación y Documentación**

| Recurso | Descripción | Costo |
|---------|-------------|-------|
| Capacitación de Usuarios | Sesiones de capacitación | S/. 2,000 |
| Documentación Impresa | Manuales y guías | S/. 500 |
| **TOTAL CAPACITACIÓN** | | **S/. 2,500** |

## **7.5. Contingencias**

| Concepto | Porcentaje | Monto Base | Total |
|----------|-----------|------------|-------|
| Contingencia | 10% | S/. 120,800 | S/. 12,080 |

## **7.6. Presupuesto Total**

| Concepto | Monto |
|---------|-------|
| Recursos Humanos | S/. 110,500 |
| Infraestructura | S/. 6,800 |
| Software | S/. 1,000 |
| Capacitación | S/. 2,500 |
| Subtotal | S/. 120,800 |
| Contingencias (10%) | S/. 12,080 |
| **TOTAL GENERAL** | **S/. 132,880** |

**Nota**: Los costos presentados son estimaciones para un proyecto académico. En un escenario de producción real, los costos podrían variar significativamente según la escala de implementación y los proveedores de servicios seleccionados.

---

# **8. CONCLUSIONES**

1. **Sistema Completo y Funcional**: Se ha desarrollado exitosamente un sistema integral web y móvil para la detección de enfermedades respiratorias en Tacna, cumpliendo con todos los objetivos planteados inicialmente.

2. **Alta Precisión en ML**: El sistema de machine learning alcanzó precisiones superiores al 99% en la clasificación de enfermedades respiratorias, utilizando modelos como XGBoost (99.81%), Random Forest (99.19%) y Neural Networks (99.64%).

3. **Arquitectura Escalable**: La implementación de arquitectura de microservicios y clean architecture permite que el sistema sea escalable, mantenible y adaptable a futuras necesidades.

4. **Metodología Ágil Exitosa**: La aplicación de metodología SCRUM permitió entregas incrementales de valor, adaptabilidad a cambios y mejora continua durante todo el desarrollo.

5. **Calidad del Software**: Se logró una cobertura de tests superior al 98% en el backend, garantizando alta calidad y confiabilidad del código desarrollado. Complementariamente, la **revisión de código base** (módulo crítico AI Services, linters y análisis estático, PR con revisión por pares y documentación del feedback según AG-I04) fortaleció el cumplimiento de estándares de construcción.

6. **Documentación Completa**: El proyecto cuenta con documentación exhaustiva que incluye manuales de usuario, guías técnicas, roadmaps y documentación de API, facilitando el mantenimiento y evolución del sistema.

7. **Funcionalidades Avanzadas**: Se implementaron funcionalidades avanzadas como análisis multimodal (texto, voz, imágenes), explicabilidad SHAP, analytics predictivos y soporte offline-first en la aplicación móvil.

8. **Cumplimiento de Estándares**: El sistema cumple con estándares de seguridad y privacidad (GDPR/HIPAA), incluyendo cifrado de datos, audit trails y gestión de derechos de sujetos de datos.

9. **Impacto Potencial**: El sistema tiene el potencial de mejorar significativamente la detección temprana de enfermedades respiratorias, optimizar recursos médicos y contribuir a la salud pública en la región de Tacna.

10. **Base para Expansión**: La arquitectura y diseño del sistema permiten su expansión a otras regiones del país y la integración con sistemas de salud existentes.

---

# **9. RECOMENDACIONES**

1. **Validación Médica Continua**: Se recomienda establecer un proceso continuo de validación médica de las predicciones del sistema de ML, recopilando feedback de profesionales de salud para mejorar los modelos mediante retraining.

2. **Expansión de Dataset**: Ampliar el dataset de entrenamiento con casos reales de la región de Tacna para mejorar la precisión y relevancia local de las predicciones.

3. **Integración con Sistemas Existentes**: Priorizar la integración con sistemas de salud existentes en Tacna (hospitales, centros de salud) mediante estándares HL7/FHIR para maximizar la adopción.

4. **Capacitación de Usuarios**: Implementar un programa de capacitación continuo para profesionales de salud y pacientes, asegurando el uso efectivo de todas las funcionalidades del sistema.

5. **Monitoreo y Mejora Continua**: Establecer un sistema de monitoreo de métricas de uso, rendimiento y satisfacción de usuarios para identificar áreas de mejora.

6. **Expansión Geográfica**: Considerar la expansión del sistema a otras regiones del Perú, adaptando los modelos de ML a las características específicas de cada región.

7. **Investigación y Desarrollo**: Continuar la investigación en técnicas avanzadas de ML (federated learning, transfer learning) para mejorar aún más la precisión y privacidad del sistema.

8. **Optimización de Costos**: Evaluar estrategias de optimización de costos en infraestructura cloud, como el uso de spot instances y auto-scaling agresivo, ya implementado parcialmente.

9. **Accesibilidad**: Continuar mejorando la accesibilidad del sistema para usuarios con discapacidades, cumpliendo completamente con estándares WCAG 2.1 AA.

10. **Colaboración Académica**: Establecer colaboraciones con instituciones académicas y de salud para validar científicamente el impacto del sistema en la mejora de la salud pública.

---

# **10. BIBLIOGRAFÍA**

Ver archivo completo de bibliografía en: `Documentation/bibliografia.md`

Las referencias principales incluyen:

- Aira, F., Casa, L., Romero, P. (2021). Aplicación y casos de uso de técnicas de inteligencia artificial contra el COVID-19.
- Alpaydin, E. (2020). *Introduction to Machine Learning* (4th ed.). MIT Press.
- Centro Nacional de Epidemiología, Prevención y Control de Enfermedades (2016). Vigilancia, prevención y control de la IRA.
- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press.
- Jurafsky, D., & Martin, J. H. (2019). *Speech and Language Processing* (3rd ed.). Pearson.
- Shickel, B., Tighe, P. J., Khoshgoftaar, T. M. (2018). Deep learning for healthcare: Review, opportunities and threats.

*(Ver archivo completo de bibliografía con 139 referencias en `Documentation/bibliografia.md`)*

---

# **11. ANEXOS**

## **Anexo 01: Informe de Factibilidad**
- Documento: `FD01-EPIS-Informe de Factibilidad de Proyecto.docx`
- Contiene análisis detallado de factibilidad técnica, económica, operativa, social, legal y ambiental.

## **Anexo 02: Documento de Visión**
- Documento: `FD02-EPIS-Informe Vision de Proyecto.docx`
- Define la visión, misión, objetivos del negocio y características principales del producto.

## **Anexo 03: Documento SRS (Software Requirements Specification)**
- Documento: `FD03-EPIS-Informe SRS de Proyecto.docx`
- Especificación completa de requisitos funcionales y no funcionales del sistema.

## **Anexo 04: Documento SAD (Software Architecture Document)**
- Documento: `FD04-EPIS-Informe SAD de Proyecto.docx`
- Documentación detallada de la arquitectura del sistema, componentes y decisiones de diseño.

## **Anexo 05: Informe Metodología Ágil SCRUM**
- Documento: `FD07-EPIS-Informe AGIL-SCRUM de Proyecto.md`
- Documentación completa de la metodología ágil aplicada, sprints, ceremonias y resultados.

## **Anexo 06: Reporte de Laboratorio TDD**
- Documento: `REPORTE_LABORATORIO_TDD.md`
- Reporte detallado de la aplicación de Test-Driven Development en el proyecto.

## **Anexo 07: Manuales y Documentación Técnica**
- **README Principal**: `README.md` - Documentación general del proyecto
- **Backend README**: `backend/README.md` - Documentación completa del backend
- **AI Services README**: `ai-services/README.md` - Documentación de servicios de IA
- **Mobile README**: `mobile/README.md` - Documentación de la aplicación móvil
- **Guías Técnicas**: Documentación en `docs/` incluyendo:
  - Guías de despliegue
  - Guías de testing
  - Guías de seguridad
  - Manuales de usuario
  - Roadmaps del proyecto

## **Anexo 08: Diagramas del Sistema**
- Diagramas en formato PNG ubicados en `Documentation/Diagramas/`:
  - Diagrama de Arquitectura General
  - Diagrama de Arquitectura en Capas (Clean Architecture)
  - Diagrama de Base de Datos - MongoDB
  - Diagrama de Microservicios
  - Diagramas de Flujo (Autenticación, Chatbot, Análisis de Síntomas)
- Diagramas Mermaid: `DIAGRAMAS_MERMAID.md`

## **Anexo 09: Estructura de Presentación**
- Documento: `ESTRUCTURA_PRESENTACION_DIAPOSITIVAS.md`
- Estructura completa para presentación del proyecto en diapositivas.

---

**FIN DEL DOCUMENTO**

[image1]: <data:image/png;base64,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>
