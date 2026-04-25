# 📖 Manual de Usuario - Consola Web RespiCare Tacna

Guía completa para usuarios de la consola web de RespiCare, incluyendo dashboards, reportes, administración y todas las funcionalidades disponibles.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Dashboard Principal](#dashboard-principal)
4. [Gestión de Historias Médicas](#gestión-de-historias-médicas)
5. [Sistema de Citas](#sistema-de-citas)
6. [Prescripciones](#prescripciones)
7. [Reportes Médicos](#reportes-médicos)
8. [Analytics y Dashboards](#analytics-y-dashboards)
9. [Chatbot Médico](#chatbot-médico)
10. [Administración](#administración)
11. [Integraciones FHIR](#integraciones-fhir)

---

## Introducción

La consola web de RespiCare Tacna es una plataforma completa para la gestión de enfermedades respiratorias, diseñada para médicos, administradores y personal de salud.

### Roles Disponibles

- **Paciente**: Acceso limitado a su propia información
- **Médico**: Acceso completo a pacientes asignados
- **Admin DIRESA**: Acceso de lectura a todas las áreas
- **Admin Principal**: Acceso completo al sistema

---

## Acceso al Sistema

### Iniciar Sesión

1. Navegar a la URL del sistema: `https://respicare.tacna.gob.pe`
2. Ingresar email y contraseña
3. Hacer clic en "Iniciar Sesión"

### Recuperar Contraseña

1. En la pantalla de login, hacer clic en "¿Olvidaste tu contraseña?"
2. Ingresar el email registrado
3. Revisar el correo electrónico para el enlace de recuperación
4. Seguir las instrucciones para crear una nueva contraseña

### Primer Acceso

Al acceder por primera vez, verás:
- Tutorial interactivo (opcional)
- Pantalla de consentimiento GDPR/HIPAA
- Dashboard principal

---

## Dashboard Principal

### Vista General

El dashboard muestra:

#### Métricas Principales
- **Total de Pacientes**: Número total de pacientes registrados
- **Citas del Día**: Citas programadas para hoy
- **Alertas Activas**: Alertas que requieren atención
- **Análisis Pendientes**: Análisis de síntomas pendientes de revisión

#### Gráficos y Tendencias
- **Tendencias Temporales**: Gráfico de líneas mostrando casos por día/semana/mes
- **Distribución por Diagnóstico**: Gráfico de barras con diagnósticos más comunes
- **Mapa de Calor Geográfico**: Mapa interactivo mostrando distribución geográfica de casos

#### Accesos Rápidos
- Botones para crear nueva historia médica
- Acceso rápido a citas del día
- Link a reportes recientes

### Personalización

- **Filtros**: Filtrar por fecha, diagnóstico, ubicación
- **Exportación**: Exportar datos a CSV/PDF
- **Vista de Tabla**: Cambiar entre vista de tarjetas y tabla

---

## Gestión de Historias Médicas

### Ver Historias Médicas

1. Navegar a **"Historias Médicas"** en el menú principal
2. Ver lista de historias con filtros:
   - Por paciente
   - Por fecha
   - Por diagnóstico
   - Por médico

### Crear Nueva Historia Médica

1. Hacer clic en **"Nueva Historia"**
2. Completar formulario:
   - **Datos del Paciente**: Seleccionar paciente existente o crear nuevo
   - **Síntomas**: Lista de síntomas con severidad
   - **Examen Físico**: Observaciones del examen
   - **Diagnóstico**: Diagnóstico principal y secundarios
   - **Tratamiento**: Plan de tratamiento
   - **Notas**: Notas adicionales
3. Hacer clic en **"Guardar"**

### Editar Historia Médica

1. Seleccionar historia de la lista
2. Hacer clic en **"Editar"**
3. Modificar campos necesarios
4. Guardar cambios

### Análisis con IA

1. Al crear/editar historia, hacer clic en **"Analizar con IA"**
2. El sistema analizará los síntomas y mostrará:
   - **Predicción ML**: Enfermedad más probable con confianza
   - **Diagnósticos Alternativos**: Top 3 diagnósticos alternativos
   - **Explicabilidad SHAP**: Factores clave que influyeron en la predicción
   - **Recomendaciones**: Recomendaciones basadas en el análisis
3. Revisar y aceptar o modificar según criterio médico

### Visualización SHAP

- **Waterfall Plot**: Muestra cómo cada síntoma contribuye a la predicción
- **Bar Chart**: Factores más importantes ordenados
- **Summary Plot**: Vista general de todos los factores

---

## Sistema de Citas

### Ver Citas

1. Navegar a **"Citas"** en el menú
2. Ver calendario o lista de citas
3. Filtrar por:
   - Fecha
   - Médico
   - Paciente
   - Estado (programada, completada, cancelada)

### Crear Nueva Cita

1. Hacer clic en **"Nueva Cita"**
2. Completar:
   - **Paciente**: Seleccionar paciente
   - **Médico**: Seleccionar médico
   - **Fecha y Hora**: Seleccionar fecha y hora disponible
   - **Motivo**: Motivo de la cita
   - **Tipo**: Consulta, Seguimiento, Emergencia
3. Guardar

### Gestionar Citas

- **Reprogramar**: Cambiar fecha/hora
- **Cancelar**: Cancelar cita con motivo
- **Completar**: Marcar como completada
- **Ver Detalles**: Ver información completa de la cita

### Recordatorios

- El sistema envía recordatorios automáticos:
  - 24 horas antes
  - 2 horas antes (opcional)
- Los recordatorios se envían por email y notificaciones push (si está habilitado)

---

## Prescripciones

### Ver Prescripciones

1. Navegar a **"Prescripciones"**
2. Ver lista de prescripciones activas
3. Filtrar por paciente, médico o fecha

### Crear Prescripción

1. Hacer clic en **"Nueva Prescripción"**
2. Seleccionar paciente
3. Agregar medicamentos:
   - **Medicamento**: Buscar en base de datos o ingresar manualmente
   - **Dosis**: Cantidad y frecuencia
   - **Duración**: Días de tratamiento
   - **Instrucciones**: Instrucciones especiales
4. **Verificar Interacciones**: El sistema verificará automáticamente interacciones entre medicamentos
5. **Validar**: Médico valida la prescripción
6. Guardar

### Verificación de Interacciones

El sistema muestra:
- **Interacciones Severas**: Medicamentos que no deben combinarse
- **Interacciones Moderadas**: Precauciones necesarias
- **Interacciones Leves**: Interacciones menores

### Compartir Prescripción

- Generar PDF de la prescripción
- Compartir por email o WhatsApp
- Imprimir directamente

---

## Reportes Médicos

### Generar Reporte

1. Navegar a **"Reportes"**
2. Hacer clic en **"Nuevo Reporte"**
3. Seleccionar:
   - **Tipo de Reporte**: Historial completo, Resumen, Por período
   - **Paciente**: Seleccionar paciente
   - **Período**: Rango de fechas (opcional)
4. Hacer clic en **"Generar"**

### Tipos de Reportes

#### Historial Completo
- Todas las historias médicas del paciente
- Todas las citas
- Todas las prescripciones
- Análisis de IA realizados

#### Resumen Ejecutivo
- Resumen de diagnósticos principales
- Tendencias de salud
- Medicamentos actuales
- Próximas citas

#### Reporte por Período
- Información dentro de un rango de fechas específico
- Útil para seguimientos o evaluaciones periódicas

### Firma Digital

1. Al generar reporte, hacer clic en **"Firmar"**
2. Ingresar credenciales
3. El reporte se marca como firmado digitalmente
4. Descargar PDF con firma

### Compartir Reportes

- **Email**: Enviar por correo electrónico
- **WhatsApp**: Compartir vía WhatsApp (si está configurado)
- **Descargar PDF**: Descargar archivo PDF
- **Imprimir**: Imprimir directamente

---

## Analytics y Dashboards

### Dashboard Ejecutivo

Accesible para administradores, muestra:

#### KPIs Principales
- Total de pacientes
- Casos por diagnóstico
- Tasa de seguimiento
- Tiempo promedio de atención

#### Gráficos Avanzados
- **Tendencias Temporales**: Evolución de casos en el tiempo
- **Distribución Geográfica**: Mapa de calor con casos por ubicación
- **Análisis por Edad**: Distribución de casos por grupos de edad
- **Análisis por Género**: Distribución por género

#### Detección de Anomalías
- Alertas automáticas de patrones anómalos
- Picos inusuales de casos
- Cambios significativos en tendencias

### Dashboard SHAP

Muestra análisis de explicabilidad ML:

- **Factores más Importantes**: Síntomas que más influyen en predicciones
- **Comparación de Modelos**: Comparación entre diferentes modelos ML
- **Distribución de Confianza**: Distribución de niveles de confianza en predicciones
- **Análisis de Errores**: Casos donde el modelo tuvo baja confianza

### Exportación de Datos

- **CSV**: Exportar datos para análisis en Excel
- **PDF**: Reportes formateados
- **JSON**: Datos estructurados para integraciones
- **OData**: Para herramientas BI (Power BI, Tableau)

---

## Chatbot Médico

### Acceso al Chatbot

1. Navegar a **"Chatbot"** en el menú
2. El chatbot se abre en un panel lateral o página completa

### Funcionalidades

#### Análisis de Síntomas
1. Describir síntomas en texto
2. El chatbot analiza y proporciona:
   - Predicción de enfermedad
   - Nivel de urgencia
   - Recomendaciones
   - Factores clave (SHAP)

#### Modo Voz
1. Hacer clic en el ícono de micrófono
2. Hablar los síntomas
3. El sistema transcribe y analiza

#### Visualización SHAP
- Después del análisis, hacer clic en **"Ver Explicación"**
- Ver gráficos interactivos de factores clave
- Comparar con análisis previos

### Historial de Conversaciones

- Ver conversaciones anteriores
- Buscar en historial
- Exportar conversaciones

---

## Administración

### Gestión de Usuarios

#### Ver Usuarios
1. Navegar a **"Administración" > "Usuarios"**
2. Ver lista de todos los usuarios
3. Filtrar por rol, estado, fecha de registro

#### Crear Usuario
1. Hacer clic en **"Nuevo Usuario"**
2. Completar:
   - Nombre completo
   - Email
   - Contraseña temporal
   - Rol (Paciente, Médico, Admin)
   - Permisos específicos
3. Guardar

#### Editar Usuario
- Cambiar información personal
- Modificar permisos
- Activar/desactivar cuenta
- Resetear contraseña

### Gestión de Médicos

- Ver lista de médicos
- Asignar pacientes
- Ver carga de trabajo
- Gestionar disponibilidad

### Configuración del Sistema

#### Alertas
- Configurar umbrales de alertas
- Definir reglas de notificación
- Gestionar canales de notificación

#### Reportes Automáticos
- Configurar reportes automáticos (diarios, semanales, mensuales)
- Definir destinatarios
- Configurar formato y contenido

#### Integraciones
- Configurar integraciones externas
- Gestionar APIs de terceros
- Configurar sincronización

### Logs y Auditoría

- Ver logs del sistema
- Audit logs de acciones de usuarios
- Búsqueda de eventos específicos
- Exportación de logs

---

## Integraciones FHIR

### Consultar Recursos FHIR

1. Navegar a **"Integraciones" > "FHIR"**
2. Seleccionar tipo de recurso:
   - Patient
   - Observation
   - DiagnosticReport
   - Medication
   - Condition
3. Buscar con parámetros:
   - Por ID
   - Por paciente
   - Por fecha
   - Por código
4. Ver resultados en formato estructurado

### Visualizar Recursos

- Ver recursos en formato JSON estructurado
- Expandir/colapsar secciones
- Buscar dentro del recurso
- Exportar recurso

### Importar desde HL7

1. Navegar a **"Integraciones" > "Laboratorio"**
2. Hacer clic en **"Importar HL7"**
3. Pegar mensaje HL7
4. El sistema parsea y convierte a FHIR
5. Revisar y confirmar importación

---

## Consejos y Mejores Prácticas

### Navegación Rápida

- **Atajos de Teclado**: Usar atajos para acciones frecuentes
- **Búsqueda Global**: Usar búsqueda en la barra superior
- **Filtros Guardados**: Guardar filtros frecuentemente usados

### Trabajo Eficiente

- **Pestañas Múltiples**: Abrir múltiples pestañas para comparar
- **Exportación Regular**: Exportar datos importantes regularmente
- **Notificaciones**: Configurar notificaciones para no perder alertas

### Seguridad

- **Cerrar Sesión**: Siempre cerrar sesión al terminar
- **No Compartir Credenciales**: Nunca compartir usuario/contraseña
- **Reportar Problemas**: Reportar cualquier comportamiento sospechoso

---

## Solución de Problemas

### No Puedo Iniciar Sesión

1. Verificar que el email y contraseña sean correctos
2. Verificar que la cuenta esté activa
3. Intentar recuperar contraseña
4. Contactar al administrador

### El Dashboard no Carga

1. Refrescar la página (F5)
2. Limpiar caché del navegador
3. Verificar conexión a internet
4. Contactar soporte técnico

### Los Reportes no se Generan

1. Verificar que haya datos en el período seleccionado
2. Intentar con un período diferente
3. Verificar permisos de usuario
4. Contactar soporte técnico

### El Chatbot no Responde

1. Verificar conexión a internet
2. Refrescar la página
3. Verificar que el servicio de IA esté disponible
4. Contactar soporte técnico

---

## Soporte

### Contacto

- **Email**: soporte@respicare.tacna.gob.pe
- **Teléfono**: +51 XXX XXX XXX
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM

### Recursos Adicionales

- **Video Tutoriales**: Disponibles en el portal de capacitación
- **FAQ**: Preguntas frecuentes en la sección de ayuda
- **Documentación Técnica**: Para desarrolladores e integradores

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

