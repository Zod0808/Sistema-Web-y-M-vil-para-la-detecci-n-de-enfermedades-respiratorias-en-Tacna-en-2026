# 🎓 Guía de Capacitación - RespiCare Tacna

Guía completa para capacitación de usuarios, desarrolladores y administradores del sistema RespiCare.

---

## 📋 Índice

1. [Capacitación para Usuarios](#capacitación-para-usuarios)
2. [Capacitación para Desarrolladores](#capacitación-para-desarrolladores)
3. [Capacitación para Administradores](#capacitación-para-administradores)
4. [Materiales de Formación](#materiales-de-formación)
5. [Programa de Onboarding](#programa-de-onboarding)

---

## Capacitación para Usuarios

### Pacientes

#### Módulo 1: Introducción (30 minutos)
- ¿Qué es RespiCare?
- Cómo descargar e instalar la app
- Registro y primer acceso
- Tutorial interactivo

#### Módulo 2: Funcionalidades Básicas (45 minutos)
- Analizar síntomas con el chatbot
- Ver historial médico
- Solicitar citas
- Ver prescripciones y recordatorios

#### Módulo 3: Funcionalidades Avanzadas (30 minutos)
- Chatbot multimodal (imágenes y audio)
- Análisis de tos
- Reconocimiento de voz
- Uso offline

#### Materiales
- [Manual de Usuario Mobile](MANUAL_USUARIO_MOBILE.md)
- Video tutorial: "Primeros pasos en RespiCare"
- Video tutorial: "Usando el chatbot multimodal"

### Médicos

#### Módulo 1: Introducción (30 minutos)
- Acceso a la consola web
- Dashboard médico
- Navegación básica

#### Módulo 2: Gestión Clínica (60 minutos)
- Crear y editar historias médicas
- Usar análisis de IA como referencia
- Interpretar explicabilidad SHAP
- Gestionar citas
- Crear prescripciones

#### Módulo 3: Analytics y Reportes (45 minutos)
- Dashboard ejecutivo
- Generar reportes médicos
- Exportar datos
- Interpretar métricas

#### Materiales
- [Manual de Usuario Web](MANUAL_USUARIO_WEB.md)
- Video tutorial: "Gestión de historias médicas"
- Video tutorial: "Usando análisis de IA en diagnóstico"

### Administradores

#### Módulo 1: Administración Básica (60 minutos)
- Gestión de usuarios
- Gestión de médicos
- Configuración de alertas
- Configuración de reportes automáticos

#### Módulo 2: Administración Avanzada (90 minutos)
- Logs y auditoría
- Integraciones externas
- Configuración FHIR
- Troubleshooting básico

#### Materiales
- [Manual de Usuario Web](MANUAL_USUARIO_WEB.md) (sección Administración)
- [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)

---

## Capacitación para Desarrolladores

### Onboarding de Nuevos Desarrolladores

#### Semana 1: Fundamentos
- **Día 1-2**: Setup del entorno de desarrollo
  - Instalar dependencias
  - Configurar Docker
  - Clonar repositorio
  - Ejecutar proyecto localmente

- **Día 3-4**: Arquitectura del sistema
  - Clean Architecture
  - Microservicios
  - Flujo de datos
  - Estructura de código

- **Día 5**: Primeras contribuciones
  - Crear branch
  - Hacer cambios simples
  - Ejecutar tests
  - Crear PR

#### Semana 2: Desarrollo Profundo
- **Día 1-2**: Backend
  - Endpoints y controladores
  - Servicios y repositorios
  - Tests unitarios e integración

- **Día 3-4**: AI Services
  - Modelos ML
  - Endpoints de predicción
  - Caching y optimización

- **Día 5**: Frontend (Web/Mobile)
  - Componentes React/React Native
  - Estado global
  - Integración con APIs

#### Materiales
- [QUICKSTART.md](../QUICKSTART.md)
- [backend/SETUP.md](../backend/SETUP.md)
- [backend/CLEAN_ARCHITECTURE.md](../backend/CLEAN_ARCHITECTURE.md)
- [TESTING_SETUP_GUIDE.md](TESTING_SETUP_GUIDE.md)

### Capacitación Continua

#### Code Reviews
- Cómo hacer code reviews efectivos
- Checklist de revisión
- Mejores prácticas

#### Testing
- Estrategia de testing
- Cómo escribir buenos tests
- Cobertura de código

#### Performance
- Performance Playbook
- Optimizaciones comunes
- Profiling y debugging

---

## Capacitación para Administradores

### DevOps y SRE

#### Módulo 1: Infraestructura (4 horas)
- Kubernetes básico
- Despliegues
- Rollbacks
- Escalado

#### Módulo 2: Monitoreo (3 horas)
- Prometheus y Grafana
- Logs (ELK Stack)
- Alertas
- Dashboards

#### Módulo 3: Troubleshooting (4 horas)
- Diagnóstico de problemas
- Recuperación de fallos
- Performance tuning
- Incidentes

#### Materiales
- [RUNBOOKS.md](RUNBOOKS.md)
- [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
- [DEPLOYMENT.md](../DEPLOYMENT.md)
- [SCALABILITY_ARCHITECTURE.md](SCALABILITY_ARCHITECTURE.md)

---

## Materiales de Formación

### Videos Tutoriales

#### Para Pacientes
1. **"Bienvenido a RespiCare"** (5 min)
   - Descarga e instalación
   - Registro
   - Primer acceso

2. **"Analizar Síntomas"** (10 min)
   - Chatbot de texto
   - Chatbot con imágenes
   - Chatbot con audio

3. **"Gestionar Citas"** (8 min)
   - Solicitar cita
   - Ver citas
   - Cancelar/reprogramar

#### Para Médicos
1. **"Dashboard Médico"** (10 min)
   - Navegación
   - Métricas principales
   - Accesos rápidos

2. **"Crear Historia Médica"** (15 min)
   - Formulario completo
   - Uso de IA como referencia
   - Interpretar SHAP

3. **"Generar Reportes"** (12 min)
   - Tipos de reportes
   - Firma digital
   - Compartir reportes

### Presentaciones

- **Introducción al Sistema**: Presentación general (30 slides)
- **Funcionalidades ML**: Explicación de modelos y predicciones (25 slides)
- **Seguridad y Privacidad**: Políticas GDPR/HIPAA (20 slides)

### Guías Rápidas

- **Cheat Sheet Web**: Atajos y funciones principales (1 página)
- **Cheat Sheet Mobile**: Funcionalidades principales (1 página)
- **Cheat Sheet Administración**: Comandos y procedimientos (2 páginas)

---

## Programa de Onboarding

### Onboarding de Usuarios (Pacientes y Médicos)

#### Día 1: Introducción
- Sesión de bienvenida (30 min)
- Tutorial interactivo en la app
- Q&A

#### Día 2-3: Práctica Guiada
- Sesiones de práctica con casos reales
- Soporte en tiempo real
- Feedback y ajustes

#### Semana 1: Seguimiento
- Revisión de uso
- Resolución de dudas
- Optimización de flujos

### Onboarding de Desarrolladores

#### Semana 1: Setup y Fundamentos
- Setup completo del entorno
- Revisión de arquitectura
- Primeras contribuciones guiadas

#### Semana 2: Desarrollo Activo
- Asignación de tareas reales
- Pair programming
- Code reviews

#### Mes 1: Integración Completa
- Contribuciones independientes
- Participación en decisiones técnicas
- Mentoría continua

### Onboarding de Administradores

#### Semana 1: Infraestructura
- Acceso a sistemas
- Revisión de configuración
- Procedimientos básicos

#### Semana 2: Operaciones
- Despliegues
- Monitoreo
- Troubleshooting básico

#### Mes 1: Autonomía
- On-call rotation
- Resolución de incidentes
- Mejoras continuas

---

## Evaluación y Certificación

### Evaluación de Usuarios

#### Pacientes
- Quiz de funcionalidades básicas (10 preguntas)
- Práctica: Analizar síntomas y solicitar cita
- Evaluación: 80% para aprobar

#### Médicos
- Quiz de funcionalidades clínicas (15 preguntas)
- Práctica: Crear historia médica con IA
- Evaluación: 85% para aprobar

### Certificación de Desarrolladores

#### Nivel 1: Desarrollador Junior
- Completar onboarding
- 5 PRs aprobados
- Tests pasando
- Code review positivo

#### Nivel 2: Desarrollador
- 20+ PRs aprobados
- Contribuciones significativas
- Mentoría a nuevos desarrolladores
- Conocimiento profundo de arquitectura

#### Nivel 3: Desarrollador Senior
- Liderazgo técnico
- Diseño de features
- Mejoras de arquitectura
- Mentoría avanzada

---

## Recursos Adicionales

### Documentación Técnica
- [README Principal](../README.md)
- [Índice de Documentación](DOCUMENTATION_INDEX.md)
- [Roadmaps](../docs/roadmaps/)

### Comunidad
- **Slack**: #respicare-dev
- **Email**: dev@respicare.tacna.gob.pe
- **Wiki Interna**: [URL]

### Soporte
- **Soporte Técnico**: soporte@respicare.tacna.gob.pe
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM
- **Emergencias**: [contacto]

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

