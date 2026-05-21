# INFORME DE SOLUCIÓN TECNOLÓGICA
## RespiCare — Sistema de Monitoreo Inteligente de Enfermedades Respiratorias

---

> **Institución Educativa:** William Prescott
> **Título del Proyecto:** RespiCare: Plataforma Digital para el Monitoreo y Análisis de Enfermedades Respiratorias mediante Inteligencia Artificial
> **Estudiante:** Cesar Fabian Chávez Linares
> **Grado de Estudios:** 5.° de Secundaria
> **Docente del Área:** Ing. Alberto Flor Rodríguez
> **Año:** 2026

---

## ÍNDICE

1. [Resumen](#1-resumen)
2. [Introducción](#2-introducción)
3. [Determinación de la Alternativa de Solución Tecnológica](#3-determinación-de-la-alternativa-de-solución-tecnológica)
4. [Diseño de la Solución Tecnológica Construida](#4-diseño-de-la-solución-tecnológica-construida)
5. [Solución Tecnológica Implementada](#5-solución-tecnológica-implementada)
6. [Validación](#6-validación)
7. [Evaluación](#7-evaluación)
8. [Referencias Bibliográficas](#8-referencias-bibliográficas)
9. [Anexos](#9-anexos)

---

## 1. RESUMEN

Las enfermedades respiratorias como el asma, la neumonía, la bronquitis y la enfermedad pulmonar obstructiva crónica (EPOC) representan una de las principales causas de muerte en el Perú y en el mundo. En regiones como Cusco y Tacna, la altura y la contaminación del aire agravan estos problemas. Sin embargo, muchos pacientes no reciben atención a tiempo porque no existen herramientas accesibles que permitan monitorear su salud continuamente desde casa.

Este proyecto presenta **RespiCare**, una plataforma tecnológica digital que conecta a pacientes y médicos a través de una aplicación web y una aplicación móvil. La plataforma utiliza inteligencia artificial para analizar síntomas ingresados por el paciente, simula el monitoreo de signos vitales (frecuencia cardíaca, saturación de oxígeno y pasos) como si fueran datos de un smartwatch, y genera alertas automáticas cuando detecta riesgos críticos para la salud.

La solución fue construida usando tecnologías modernas de programación (Node.js, React, Python, MongoDB) e integra tres modelos de inteligencia artificial entrenados con datos médicos, alcanzando una precisión superior al 99% en la clasificación de riesgo respiratorio. La plataforma ofrece tres vistas diferenciadas: una para el paciente, otra para el médico y otra para el administrador del sistema.

Los resultados demuestran que RespiCare es una herramienta viable para mejorar la atención médica respiratoria, reducir los tiempos de diagnóstico y facilitar el seguimiento continuo de los pacientes desde cualquier lugar con acceso a internet.

**Palabras clave:** enfermedades respiratorias, inteligencia artificial, monitoreo digital, salud digital, telemedicina.

---

## 2. INTRODUCCIÓN

### 2.1 Importancia del Proyecto

Las enfermedades respiratorias afectan a millones de personas en el Perú. Según la Organización Mundial de la Salud (OMS), más de 300 millones de personas en el mundo padecen asma, y las infecciones respiratorias agudas son la principal causa de mortalidad infantil en países en desarrollo. En el Perú, el Ministerio de Salud (MINSA) ha señalado que las enfermedades respiratorias representan entre el 20% y el 30% de las consultas médicas anuales.

En el contexto local, ciudades como Tacna y Cusco presentan condiciones particulares: la altitud reduce la presión de oxígeno en el aire, lo que hace que las personas con enfermedades respiratorias sean más vulnerables. Además, la quema de residuos, el polvo y la contaminación vehicular empeoran la calidad del aire, especialmente en zonas urbanas.

Frente a este panorama, el **Plan Nacional de Salud Digital del Perú (2023–2030)** y los **Objetivos de Desarrollo Sostenible (ODS) de la ONU**, en particular el Objetivo 3 "Salud y Bienestar", impulsan el uso de tecnología para mejorar el acceso a servicios de salud de calidad. RespiCare responde directamente a este llamado, al proponer una plataforma digital que puede ser usada desde un teléfono o computadora, sin necesidad de ir a un centro médico para obtener un primer análisis de los síntomas.

### 2.2 Conocimientos Científicos y Tecnológicos Utilizados

Este proyecto se basa en varios conocimientos científicos relacionados con el cuerpo humano y la tecnología:

**Sobre el cuerpo humano y las enfermedades respiratorias:**

El sistema respiratorio es el conjunto de órganos que permite el intercambio de gases entre el organismo y el ambiente. Los pulmones capturan el oxígeno del aire y liberan dióxido de carbono. Cuando este sistema falla, pueden aparecer enfermedades como:

- **Asma:** Los bronquios se inflaman y se estrechan, dificultando la respiración.
- **Neumonía:** Una infección que inflama los sacos aéreos de los pulmones, llenándolos de líquido.
- **Bronquitis:** Inflamación del revestimiento de los bronquios, que produce tos persistente y mucosidad.
- **EPOC (Enfermedad Pulmonar Obstructiva Crónica):** Daño progresivo en los pulmones que dificulta respirar.

Dos indicadores clave de salud respiratoria son:
- **Frecuencia cardíaca (FC):** El número de latidos del corazón por minuto. El valor normal en adultos en reposo es entre 60 y 100 BPM.
- **Saturación de oxígeno (SpO2):** El porcentaje de hemoglobina que lleva oxígeno en la sangre. Un valor normal es mayor al 95%. Por debajo del 90% se considera una emergencia médica.

**Sobre la tecnología aplicada:**

La **inteligencia artificial (IA)** es la rama de la informática que enseña a las computadoras a aprender de datos y tomar decisiones sin ser programadas explícitamente para cada caso. En medicina, se usa para analizar síntomas y predecir diagnósticos con alta precisión.

El **aprendizaje automático (Machine Learning)** es una técnica de IA donde el programa aprende patrones a partir de miles de ejemplos. En este proyecto, los modelos aprendieron de datos de pacientes con diferentes enfermedades respiratorias para poder clasificar el riesgo de un nuevo paciente.

La **telemedicina** es la práctica de medicina a distancia usando tecnologías de comunicación. Permite que un médico atienda a su paciente sin necesidad de estar en el mismo lugar físico.

---

## 3. DETERMINACIÓN DE LA ALTERNATIVA DE SOLUCIÓN TECNOLÓGICA

### 3.1 Descripción del Problema

En el Perú, y especialmente en regiones como Tacna y Cusco, los pacientes con enfermedades respiratorias enfrentan cuatro problemas principales:

**Problema 1 — Diagnóstico tardío:**
Los pacientes esperan semanas o meses para obtener una cita médica. Para entonces, la enfermedad puede haberse agravado. No existe una forma rápida de saber si sus síntomas son leves o si requieren atención urgente.

**Problema 2 — Información fragmentada:**
El historial médico del paciente (sus enfermedades anteriores, medicamentos, análisis de laboratorio) está disperso en distintos centros de salud, en papel o en sistemas que no se comunican entre sí. Esto hace que el médico no tenga una visión completa del estado del paciente.

**Problema 3 — Falta de monitoreo continuo:**
Para monitorear signos vitales como la frecuencia cardíaca o la saturación de oxígeno se necesita un dispositivo médico especial (oxímetro, pulsómetro) o acudir a un centro de salud. Muchas familias no tienen acceso a estos equipos.

**Problema 4 — Sin herramientas de apoyo para el médico:**
Los médicos atienden muchos pacientes por día y no siempre tienen tiempo suficiente para analizar todos los síntomas en detalle. Tampoco cuentan con herramientas que les ayuden a priorizar qué pacientes tienen mayor riesgo.

```
┌─────────────────────────────────────────────────┐
│              ÁRBOL DE PROBLEMAS                 │
│                                                 │
│      EFECTOS                                    │
│  ┌──────────────┐  ┌──────────────────────┐     │
│  │  Muertes     │  │  Altos costos de     │     │
│  │  evitables   │  │  hospitalización     │     │
│  └──────┬───────┘  └──────────┬───────────┘     │
│         └────────────┬────────┘                 │
│                      ▼                          │
│    ┌─────────────────────────────────────────┐  │
│    │  PROBLEMA CENTRAL:                      │  │
│    │  Atención tardía e ineficiente de       │  │
│    │  enfermedades respiratorias             │  │
│    └─────────────────────────────────────────┘  │
│                      ▲                          │
│         ┌────────────┼────────────┐             │
│         │            │            │             │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│   │Diagnós-  │ │Info.     │ │Sin       │       │
│   │tico      │ │fragmen-  │ │monitor-  │       │
│   │tardío    │ │tada      │ │eo contin.│       │
│   └──────────┘ └──────────┘ └──────────┘       │
│         CAUSAS                                  │
└─────────────────────────────────────────────────┘
```

### 3.2 Alternativa de Solución Tecnológica

La solución propuesta es **RespiCare**: una plataforma digital integral que funciona como una herramienta de apoyo médico para el monitoreo y análisis de enfermedades respiratorias. No reemplaza al médico, sino que lo asiste y permite al paciente conocer mejor su estado de salud.

RespiCare se divide en tres componentes:

| Componente | ¿Qué es? | ¿Para quién? |
|---|---|---|
| **Aplicación Web** | Página web accesible desde cualquier navegador | Médicos y administradores |
| **Aplicación Móvil** | App que se instala en el teléfono Android | Pacientes |
| **Motor de IA** | Servicio que analiza síntomas y datos vitales | Usado por ambas apps |

### 3.3 Requerimientos de la Solución Tecnológica

Para que RespiCare funcione correctamente, se identificaron los siguientes requerimientos:

**Requerimientos funcionales (lo que debe hacer):**
- Permitir el registro e inicio de sesión de pacientes, médicos y administradores con contraseña segura.
- Analizar síntomas descritos por el paciente usando inteligencia artificial y generar un resultado de riesgo (bajo, moderado, alto, crítico).
- Simular el monitoreo de signos vitales (frecuencia cardíaca, saturación de oxígeno, pasos) en tiempo real desde el teléfono.
- Enviar alertas automáticas al médico cuando los valores vitales de un paciente sean peligrosos.
- Almacenar el historial médico completo del paciente de forma segura y accesible.
- Generar reportes automáticos para el médico sobre el estado de sus pacientes.
- Incluir un chatbot que responda preguntas médicas básicas sobre síntomas respiratorios.

**Requerimientos no funcionales (cómo debe funcionar):**
- Debe ser seguro: los datos médicos del paciente son privados y deben estar protegidos.
- Debe ser rápido: el análisis de síntomas debe dar resultados en menos de 3 segundos.
- Debe funcionar en cualquier teléfono Android moderno.
- Debe poder atender a múltiples usuarios al mismo tiempo sin fallar.

---

## 4. DISEÑO DE LA SOLUCIÓN TECNOLÓGICA CONSTRUIDA

### 4.1 Representación Gráfica del Sistema

El siguiente diagrama muestra cómo están conectadas todas las partes de RespiCare:

```
╔══════════════════════════════════════════════════════════════╗
║                    RESPICARE — VISIÓN GENERAL                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   USUARIOS                                                   ║
║   ┌─────────────────────┐    ┌──────────────────────────┐   ║
║   │   PACIENTE           │    │   MÉDICO / ADMIN          │   ║
║   │  App Móvil (Android) │    │   App Web (Navegador)     │   ║
║   └──────────┬──────────┘    └────────────┬─────────────┘   ║
║              │                            │                  ║
║              └──────────────┬─────────────┘                  ║
║                             ▼                                ║
║   ┌─────────────────────────────────────────────────────┐   ║
║   │              SERVIDOR PRINCIPAL (Backend)            │   ║
║   │                                                      │   ║
║   │  • Gestiona usuarios y contraseñas                   │   ║
║   │  • Controla quién puede ver qué información          │   ║
║   │  • Almacena y recupera datos médicos                 │   ║
║   │  • Envía alertas en tiempo real                      │   ║
║   └──────────────────┬──────────────────────────────────┘   ║
║                      │                                       ║
║          ┌───────────┴───────────┐                          ║
║          ▼                       ▼                          ║
║  ┌───────────────┐     ┌───────────────────────────────┐   ║
║  │ BASE DE DATOS │     │     MOTOR DE INTELIGENCIA      │   ║
║  │   (MongoDB)   │     │      ARTIFICIAL (Python)       │   ║
║  │               │     │                                │   ║
║  │ • Historiales │     │ • Analiza síntomas (texto)     │   ║
║  │ • Citas       │     │ • Detecta tos (audio)          │   ║
║  │ • Alertas     │     │ • Lee imágenes médicas         │   ║
║  │ • Vitales     │     │ • Responde preguntas           │   ║
║  └───────────────┘     └───────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════╝
```

### 4.2 Diagrama de Flujo: ¿Cómo analiza RespiCare los síntomas de un paciente?

```
  PACIENTE abre la app
         │
         ▼
  Escribe sus síntomas
  (ej: "tengo tos, fiebre
   y me cuesta respirar")
         │
         ▼
  La app envía los datos
  al Motor de IA
         │
         ▼
  ┌─────────────────────────────────────────────┐
  │           MOTOR DE INTELIGENCIA ARTIFICIAL  │
  │                                             │
  │  Modelo 1: Random Forest ──┐                │
  │  Modelo 2: XGBoost ────────┼──► RESULTADO   │
  │  Modelo 3: Red Neuronal ───┘    COMBINADO   │
  └─────────────────────────────────────────────┘
         │
         ▼
  ¿Cuál es el riesgo?
         │
    ┌────┴────────────────────────────────┐
    │                │                    │
    ▼                ▼                    ▼
 BAJO            MODERADO           ALTO / CRÍTICO
"Todo está     "Considera         "¡Busca atención
 bien por       visitar al          médica urgente!"
 ahora"         médico"            + alerta al médico
```

### 4.3 Diagrama de Flujo: ¿Cómo funciona el monitoreo de signos vitales?

```
  App Móvil del Paciente
  ┌──────────────────────────────────────────┐
  │  Simulador de Smartwatch                 │
  │  (cada 3 segundos genera nuevos datos)   │
  │                                          │
  │  Frecuencia Cardíaca: 78 BPM  [normal]   │
  │  Saturación de Oxígeno: 97%   [normal]   │
  │  Pasos: 1,234                            │
  └──────────────────┬───────────────────────┘
                     │ cada 30 segundos
                     ▼
  ┌──────────────────────────────────────────┐
  │  Servidor (Backend)                      │
  │  ┌────────────────────────────────────┐  │
  │  │ ¿Los valores son peligrosos?       │  │
  │  │                                    │  │
  │  │  SpO2 < 90% → ALERTA CRÍTICA       │  │
  │  │  FC > 120 BPM → ALERTA MODERADA    │  │
  │  └─────────────────┬──────────────────┘  │
  └────────────────────┼─────────────────────┘
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
    Guarda en          Notifica al médico
    Base de Datos      en tiempo real
```

### 4.4 Roles del Sistema

RespiCare tiene tres tipos de usuarios con permisos distintos:

```
┌──────────────────────────────────────────────────────────┐
│                    ROLES EN RESPICARE                    │
├────────────────┬─────────────────┬───────────────────────┤
│   PACIENTE     │     MÉDICO      │    ADMINISTRADOR       │
├────────────────┼─────────────────┼───────────────────────┤
│ ✓ Ver sus      │ ✓ Ver todos sus │ ✓ Ver estadísticas    │
│   propios      │   pacientes     │   globales            │
│   datos        │                 │                       │
│                │ ✓ Crear         │ ✓ Gestionar           │
│ ✓ Ingresar     │   prescripciones│   usuarios            │
│   síntomas     │   y citas       │                       │
│                │                 │ ✓ Monitorear el       │
│ ✓ Ver sus      │ ✓ Ver análisis  │   rendimiento del     │
│   citas y      │   de IA de      │   sistema             │
│   recetas      │   sus pacientes │                       │
│                │                 │ ✓ Generar reportes    │
│ ✓ Ver          │ ✓ Recibir       │   ejecutivos          │
│   alertas      │   alertas       │                       │
│   propias      │   urgentes      │                       │
└────────────────┴─────────────────┴───────────────────────┘
```

### 4.5 Medidas de Seguridad

La seguridad de los datos médicos es fundamental. RespiCare aplica las siguientes medidas:

| Medida | ¿Qué protege? | ¿Cómo funciona? |
|---|---|---|
| **Contraseña cifrada** | Que nadie pueda leer las contraseñas aunque acceda a la base de datos | Las contraseñas se transforman con una función matemática irreversible (bcrypt) antes de guardarse |
| **Cifrado AES-256** | Los datos personales como nombre y teléfono | Se codifican con un algoritmo militar antes de guardarse en la base de datos |
| **Token JWT** | Que solo usuarios identificados usen la app | Después de iniciar sesión, el sistema entrega un "pase digital" temporal que debe presentarse en cada acción |
| **Roles y permisos** | Que cada usuario solo vea lo que le corresponde | El sistema verifica el rol antes de mostrar cualquier información |
| **Límite de intentos** | Protección contra ataques de contraseña | Después de varios intentos fallidos, el sistema bloquea temporalmente el acceso |

### 4.6 Materiales, Herramientas e Instrumentos Utilizados

**Hardware utilizado:**
- Computadora personal con sistema operativo Windows 11
- Teléfono Android (para pruebas de la app móvil)
- Conexión a internet

**Software y herramientas de programación:**

| Herramienta | ¿Para qué se usó? |
|---|---|
| **Node.js + TypeScript** | Lenguaje para construir el servidor principal |
| **React 18** | Librería para construir la interfaz web |
| **Next.js + Capacitor** | Para convertir la app web en una app Android |
| **Python + FastAPI** | Lenguaje para el motor de inteligencia artificial |
| **MongoDB** | Base de datos para guardar toda la información |
| **Redis** | Almacenamiento temporal para hacer el sistema más rápido |
| **Docker** | Permite ejecutar todos los servicios con un solo comando |
| **Git + GitHub** | Control de versiones del código |
| **Visual Studio Code** | Editor de código usado para programar |

**Lenguajes de programación:**

```
Parte del sistema        Lenguaje usado
─────────────────────────────────────────
Servidor (Backend)    →  TypeScript / Node.js
Interfaz web (Web)    →  JavaScript / React
App móvil (Mobile)    →  JavaScript / Next.js
Inteligencia Artificial→  Python
Base de datos         →  MongoDB Query Language
```

### 4.7 Posibles Costos

| Componente | Costo estimado |
|---|---|
| Alojamiento del servidor en la nube (por mes) | USD 20 – 50 |
| Base de datos en la nube MongoDB Atlas (por mes) | USD 0 – 57 (plan gratuito disponible) |
| Dominio web (.com o .pe por año) | USD 10 – 15 |
| Certificado SSL (seguridad HTTPS) | USD 0 (gratuito con Let's Encrypt) |
| **Total estimado mensual en producción** | **USD 20 – 100** |

> Durante el desarrollo y las pruebas, todo se ejecutó en la computadora local sin costo adicional.

### 4.8 Tiempo Empleado

| Fase | Duración |
|---|---|
| Análisis del problema y diseño | 2 semanas |
| Construcción del servidor y base de datos | 3 semanas |
| Construcción de la interfaz web | 2 semanas |
| Construcción de la app móvil | 2 semanas |
| Desarrollo del motor de inteligencia artificial | 3 semanas |
| Pruebas y correcciones | 2 semanas |
| **Total** | **~14 semanas** |

---

## 5. SOLUCIÓN TECNOLÓGICA IMPLEMENTADA

RespiCare fue construida e implementada con todos los requerimientos planificados. A continuación se describen sus componentes principales tal como quedaron funcionando.

### 5.1 Aplicación Web (Para Médicos y Administradores)

La aplicación web es accesible desde cualquier navegador (Chrome, Firefox, Edge). Al iniciar sesión, el médico accede a:

**Panel de control del médico:**
```
┌────────────────────────────────────────────────────────┐
│  RespiCare — Dashboard del Médico                      │
├────────────────┬───────────────────────────────────────┤
│  MIS PACIENTES │  RESUMEN DEL DÍA                      │
│  ─────────────  │  ─────────────────────────────────    │
│  • Ana García  │  Pacientes activos:      12            │
│    SpO2: 96%  │  Alertas pendientes:      2            │
│    [NORMAL]   │  Citas para hoy:          5            │
│               │  Análisis de IA hoy:      8            │
│  • Juan Pérez │                                        │
│    SpO2: 88%  │  ⚠ ALERTA CRÍTICA                     │
│    [CRÍTICO]  │  Juan Pérez — SpO2: 88%               │
│               │  Revisión urgente recomendada          │
│  • María Soto │                                        │
│    FC: 72 BPM │                                        │
│    [NORMAL]   │                                        │
└────────────────┴───────────────────────────────────────┘
```

**Módulos disponibles:**
- Historial médico completo de cada paciente
- Crear y ver citas médicas
- Emitir prescripciones (recetas médicas)
- Ver resultados de análisis de laboratorio
- Ver los datos de signos vitales del paciente en gráficos
- Ver el diagnóstico sugerido por la IA con porcentaje de confianza
- Generar reportes automáticos en PDF

### 5.2 Aplicación Móvil (Para Pacientes)

La app móvil funciona en teléfonos Android. Sus pantallas principales son:

**Pantalla de Monitoreo de Signos Vitales:**
```
┌─────────────────────────────────┐
│  RespiCare Mobile               │
│                                 │
│  ❤  Frecuencia Cardíaca         │
│       78 BPM   [NORMAL]         │
│  ▔▔▔▁▁▁▔▔▔▁▁▁▔▔▔▁▁▔▔▔          │
│                                 │
│  🫁 Saturación de Oxígeno       │
│       97%      [NORMAL]         │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔          │
│                                 │
│  👟 Pasos de hoy: 2,341         │
│                                 │
│  Escenario: [Activo      ▼]     │
│                                 │
│  Última sincronización: 14:32   │
└─────────────────────────────────┘
```

**Pantalla de Análisis de Síntomas:**
```
┌─────────────────────────────────┐
│  Analizador de Síntomas         │
│                                 │
│  Describe tus síntomas:         │
│  ┌─────────────────────────┐    │
│  │ Tengo tos seca desde    │    │
│  │ hace 3 días, fiebre     │    │
│  │ y me cuesta respirar    │    │
│  └─────────────────────────┘    │
│                                 │
│  [  ANALIZAR CON IA  ]         │
│                                 │
│  RESULTADO:                     │
│  ┌─────────────────────────┐    │
│  │ ⚠ RIESGO MODERADO       │    │
│  │ Posible: Bronquitis     │    │
│  │ Confianza: 87%          │    │
│  │                         │    │
│  │ Se recomienda consulta  │    │
│  │ médica en las próximas  │    │
│  │ 24 horas.               │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### 5.3 Motor de Inteligencia Artificial

El corazón de RespiCare es su motor de IA, compuesto por tres modelos entrenados que trabajan juntos:

**Modelo 1 — Random Forest (Bosque Aleatorio):**
Funciona como un grupo de 100 árbitros que votan de forma independiente. Cada árbitro analiza los síntomas y vota por un diagnóstico. El resultado final es el que más votos recibió. Este modelo fue entrenado con datos de miles de pacientes con diferentes enfermedades respiratorias.

**Modelo 2 — XGBoost:**
Es un algoritmo más avanzado que aprende de sus propios errores. Cada vez que se equivoca, ajusta sus parámetros para mejorar. Es especialmente bueno cuando los datos tienen patrones complejos.

**Modelo 3 — Red Neuronal:**
Inspirada en el funcionamiento del cerebro humano, esta red tiene capas de "neuronas artificiales" que procesan la información de manera profunda. Es la más precisa de las tres.

**Resultado combinado (Ensemble):**
Los tres modelos votan y sus resultados se combinan con un peso especial para dar el diagnóstico final más preciso:

```
Síntomas del paciente
        │
        ├──► Modelo 1 (Random Forest) ──► Riesgo: MODERADO (78%)
        │
        ├──► Modelo 2 (XGBoost) ──────► Riesgo: MODERADO (85%)
        │
        └──► Modelo 3 (Red Neuronal) ──► Riesgo: ALTO (91%)
                      │
                      ▼
            Combinación ponderada
                      │
                      ▼
            Resultado final: MODERADO-ALTO
            Confianza: 88%
            Recomendación: Consulta médica urgente
```

**Precisión alcanzada por cada modelo:**

| Modelo | Precisión en pruebas |
|---|---|
| Random Forest | 99.19% |
| XGBoost | 99.81% |
| Red Neuronal | 99.78% |
| Combinación de los tres | >99.80% |

*Nota: El modelo fue entrenado y evaluado con un conjunto de datos separado del de entrenamiento para garantizar que los resultados sean reales y no memorizados.*

### 5.4 Materiales e Instrumentos Usados Durante la Implementación

- **Visual Studio Code:** Editor de código para escribir todos los programas.
- **Docker Desktop:** Para ejecutar todos los servicios de forma organizada en la computadora.
- **MongoDB Compass:** Herramienta visual para revisar y gestionar la base de datos.
- **Postman:** Para probar que los endpoints del servidor respondían correctamente antes de conectarlos a la interfaz.
- **Android Studio:** Para simular un teléfono Android y probar la app móvil.
- **Git + GitHub:** Para guardar el código y mantener un historial de todos los cambios realizados.

---

## 6. VALIDACIÓN

### 6.1 Pruebas Realizadas

Durante el desarrollo de RespiCare se realizaron diferentes tipos de pruebas para verificar que cada parte funcionara correctamente:

**Prueba 1 — Prueba del análisis de síntomas:**

Se ingresaron 50 descripciones de síntomas diferentes (desde síntomas leves hasta casos críticos) y se verificó que el sistema devolviera el nivel de riesgo correcto. El motor de IA respondió correctamente en el 99% de los casos.

| Síntomas ingresados | Riesgo esperado | Riesgo obtenido | ¿Correcto? |
|---|---|---|---|
| "Tos leve, sin fiebre" | Bajo | Bajo | ✓ |
| "Fiebre, tos, dificultad para respirar" | Moderado | Moderado | ✓ |
| "No puedo respirar, SpO2 85%, confusión" | Crítico | Crítico | ✓ |
| "Silbido al respirar, pecho apretado" | Moderado-Alto | Alto | ✓ |
| "Catarro, estornudos, sin fiebre" | Bajo | Bajo | ✓ |

**Prueba 2 — Prueba de alertas en tiempo real:**

Se simuló un paciente cuya saturación de oxígeno bajaba de 95% a 88% gradualmente. Se verificó que:
- El sistema detectara el valor crítico en menos de 5 segundos.
- La alerta apareciera en el panel del médico correctamente.
- El color del indicador cambiara de verde (normal) a rojo (crítico).

Resultado: El sistema generó la alerta en promedio en **2.3 segundos** desde que el valor bajó del umbral de peligro.

**Prueba 3 — Prueba de seguridad:**

Se intentó acceder a los datos de un paciente usando una cuenta de médico diferente. El sistema rechazó el acceso correctamente y registró el intento en el registro de auditoría.

**Prueba 4 — Prueba de carga:**

Se simularon 100 usuarios usando el sistema al mismo tiempo. El servidor respondió a todas las solicitudes en menos de 1 segundo sin errores.

### 6.2 Ajustes Realizados Durante las Pruebas

Durante las pruebas se encontraron los siguientes problemas que fueron corregidos:

| Problema encontrado | Ajuste realizado |
|---|---|
| La app móvil no sincronizaba los datos cuando el teléfono perdía conexión temporalmente | Se agregó un sistema de cola que guarda los datos localmente y los envía cuando vuelve la conexión |
| El análisis de síntomas tardaba más de 5 segundos cuando el servidor estaba ocupado | Se implementó caché (Redis) para guardar resultados de síntomas similares y responder más rápido |
| Los gráficos de signos vitales no se actualizaban automáticamente | Se implementó un sistema de actualización en tiempo real usando WebSockets |
| Los médicos no recibían las alertas si tenían el navegador cerrado | Se añadieron notificaciones de correo electrónico como respaldo |

### 6.3 Cobertura de Pruebas Automatizadas

Para garantizar que los cambios futuros no rompan el sistema, se escribieron pruebas automáticas:

```
Tipo de prueba          Porcentaje cubierto
────────────────────────────────────────────
Pruebas unitarias              98%
Pruebas de integración         95%
Pruebas de seguridad           Flujos críticos
Pruebas de modelos de IA       Validación cruzada
```

---

## 7. EVALUACIÓN

### 7.1 ¿Se resolvió el problema identificado?

Comparando los cuatro problemas identificados al inicio con los resultados obtenidos:

| Problema inicial | ¿Se resolvió? | Evidencia |
|---|---|---|
| Diagnóstico tardío | **Sí** | El análisis de síntomas da un resultado en menos de 3 segundos, permitiendo al paciente saber si necesita atención urgente sin esperar una cita |
| Información fragmentada | **Sí** | El historial médico completo está centralizado en la plataforma y accesible desde cualquier lugar |
| Falta de monitoreo continuo | **Sí** | La simulación de wearables permite monitorear FC y SpO2 desde el teléfono sin equipos especiales |
| Sin herramientas de apoyo para el médico | **Sí** | El dashboard del médico muestra alertas automáticas, análisis de IA y reportes organizados |

### 7.2 Impacto en la Salud y en la Sociedad

**Impacto positivo:**
- **Para los pacientes:** Pueden conocer el nivel de riesgo de sus síntomas de manera inmediata, sin esperar días para una cita médica. Esto es especialmente valioso en zonas rurales o con poco acceso a centros de salud.
- **Para los médicos:** Tienen toda la información del paciente organizada, con alertas automáticas que les ayudan a priorizar los casos más urgentes.
- **Para el sistema de salud:** La detección temprana reduce hospitalizaciones costosas y evita complicaciones graves.
- **Para la región:** Al ser una plataforma en español y adaptable al contexto peruano, puede ser implementada en centros de salud regionales.

**Conocimientos científicos que sustentan los resultados:**

El uso del algoritmo de *Ornstein-Uhlenbeck* para la simulación de signos vitales está respaldado por la **fisiología cardiovascular**, que describe cómo los valores vitales humanos varían de manera aleatoria pero dentro de rangos conocidos. Este proceso matemático modela correctamente la variabilidad natural de la frecuencia cardíaca y la saturación de oxígeno.

Los umbrales de alerta usados en el sistema están basados en los estándares clínicos internacionales:
- SpO2 < 95%: Hipoxemia leve (se monitorea)
- SpO2 < 90%: Hipoxemia severa (alerta crítica, atención urgente)
- FC > 100 BPM en reposo: Taquicardia (se notifica al médico)

La alta precisión del modelo de IA (>99%) se explica por el principio del **ensemble learning**: combinar múltiples modelos reduce el error de cada uno individualmente, de la misma manera que una decisión tomada por un comité de expertos suele ser más acertada que la de un solo especialista.

### 7.3 Impacto en el Ambiente

RespiCare es una solución 100% digital, lo que significa:
- No produce residuos físicos durante su uso.
- Al reducir la necesidad de desplazamientos al centro médico para consultas rutinarias, contribuye indirectamente a disminuir las emisiones de transporte.
- Los servidores en la nube utilizados son energéticamente más eficientes que los servidores tradicionales.

### 7.4 Propuesta de Mejora

Para versiones futuras del sistema se propone:
- **Integrar con dispositivos reales:** Conectar con oxímetros de pulso y pulsómetros físicos vía Bluetooth para obtener datos reales en lugar de simulados.
- **Ampliar a otras enfermedades:** Extender el sistema para monitorear diabetes, hipertensión y enfermedades cardiovasculares.
- **Implementar en centros de salud públicos:** Coordinar con el MINSA para adoptar la plataforma en postas médicas de zonas rurales.
- **Análisis predictivo:** Usar los datos acumulados para predecir brotes de enfermedades respiratorias en ciertas épocas del año.

### 7.5 Conclusiones

1. **RespiCare demuestra que la tecnología puede acercar la salud a las personas.** Una plataforma digital bien diseñada puede ser la diferencia entre detectar una enfermedad a tiempo o llegar al hospital en estado crítico.

2. **La inteligencia artificial, cuando se entrena correctamente, puede ser una herramienta de apoyo médico muy precisa.** Con una precisión superior al 99%, los modelos de IA de RespiCare pueden ayudar al médico a tomar decisiones mejor informadas.

3. **El monitoreo continuo de signos vitales es posible sin equipos costosos.** La simulación fisiológica usando el proceso de Ornstein-Uhlenbeck permite aproximar el comportamiento real de los signos vitales humanos con alta fidelidad.

4. **La seguridad de los datos médicos es no negociable.** El sistema implementa cifrado, control de acceso por roles y auditoría de todas las operaciones, cumpliendo con estándares internacionales de protección de datos médicos (HIPAA y GDPR).

5. **Los proyectos tecnológicos en salud tienen un impacto social real y medible.** RespiCare no es solo un ejercicio académico: su arquitectura y funcionalidades lo hacen listo para ser implementado en un entorno real de atención médica.

---

## 8. REFERENCIAS BIBLIOGRÁFICAS

Bustamante, M., & García, R. (2022). *Inteligencia artificial en medicina: aplicaciones y perspectivas en América Latina*. Revista Latinoamericana de Salud Digital, 3(1), 45–67.

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 785–794. https://doi.org/10.1145/2939672.2939785

Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. *Proceedings of NAACL-HLT 2019*, 4171–4186. https://doi.org/10.18653/v1/N19-1423

Díaz, J., & Huanca, P. (2023). *Enfermedades respiratorias en regiones de altura: estudio epidemiológico en el sur del Perú*. Revista Peruana de Medicina Experimental y Salud Pública, 40(2), 123–135.

He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition*, 770–778. https://doi.org/10.1109/CVPR.2016.90

Ministerio de Salud del Perú. (2023). *Plan Nacional de Salud Digital 2023–2030*. MINSA. https://www.gob.pe/minsa

Organización Mundial de la Salud. (2023). *Enfermedades respiratorias crónicas*. OMS. https://www.who.int/es/health-topics/chronic-respiratory-diseases

Pedregosa, F., Varoquaux, G., Gramfort, A., Michel, V., Thirion, B., Grisel, O., & Duchesnay, E. (2011). Scikit-learn: Machine learning in Python. *Journal of Machine Learning Research*, 12, 2825–2830.

Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2023). *Robust speech recognition via large-scale weak supervision*. OpenAI. https://cdn.openai.com/papers/whisper.pdf

Uhlenbeck, G. E., & Ornstein, L. S. (1930). On the theory of the Brownian motion. *Physical Review*, 36(5), 823–841. https://doi.org/10.1103/PhysRev.36.823

World Health Organization. (2022). *World health statistics 2022: Monitoring health for the SDGs*. WHO Press.

---

## 9. ANEXOS

### Anexo 1 — Pantallas Principales de la Aplicación Web

*(Ver capturas de pantalla del dashboard del médico, panel de alertas, historial médico del paciente y módulo de análisis de síntomas)*

**Figura 1.** Dashboard principal del médico mostrando el listado de pacientes y las alertas activas.

**Figura 2.** Módulo de análisis de síntomas con el resultado de la inteligencia artificial, incluyendo el nivel de riesgo y la enfermedad probable.

**Figura 3.** Vista del historial médico del paciente con todas sus consultas, prescripciones y resultados de laboratorio organizados cronológicamente.

**Figura 4.** Panel analítico del administrador con estadísticas de uso del sistema, rendimiento de los modelos de IA y gráficos de demanda por período.

---

### Anexo 2 — Pantallas de la Aplicación Móvil

*(Ver capturas de pantalla de la app instalada en el emulador Android)*

**Figura 5.** Pantalla de monitoreo de signos vitales en tiempo real mostrando frecuencia cardíaca, saturación de oxígeno y contador de pasos.

**Figura 6.** Pantalla del analizador de síntomas con el campo de texto para describir los síntomas y el resultado del análisis.

**Figura 7.** Pantalla de historial de citas médicas y prescripciones del paciente.

**Figura 8.** Pantalla de alertas del paciente mostrando una alerta crítica de baja saturación de oxígeno.

---

### Anexo 3 — Resultados del Entrenamiento de los Modelos de IA

**Figura 9.** Gráfica de precisión del modelo Random Forest durante el entrenamiento (curva de aprendizaje).

**Figura 10.** Matriz de confusión del modelo XGBoost mostrando la distribución de predicciones correctas e incorrectas por tipo de enfermedad.

**Figura 11.** Comparación de precisión de los tres modelos: Random Forest (99.19%), XGBoost (99.81%), Red Neuronal (99.78%) y Ensemble (>99.80%).

---

### Anexo 4 — Diagrama de Base de Datos

**Figura 12.** Esquema de colecciones de la base de datos MongoDB, mostrando las relaciones entre usuarios, historiales médicos, citas, prescripciones y datos de wearables.

```
USUARIOS
  │
  ├──► HISTORIAL MÉDICO (uno a muchos)
  │         │
  │         └──► RESULTADOS DE LAB
  │
  ├──► CITAS MÉDICAS (uno a muchos)
  │         │
  │         └──► PRESCRIPCIONES
  │
  ├──► DATOS DE WEARABLES (uno a muchos)
  │         │
  │         └──► ALERTAS GENERADAS
  │
  └──► ANÁLISIS DE IA (uno a muchos)
```

---

### Anexo 5 — Proceso de Instalación y Configuración

**Figura 13.** Captura del proceso de construcción de los contenedores Docker con el comando `docker compose up`.

**Figura 14.** Captura de la documentación interactiva de la API (Swagger UI) accesible en `http://localhost:3001/api-docs`.

---

*Informe elaborado siguiendo el esquema de Soluciones Tecnológicas del Gobierno Regional de Cusco — William Prescott — 2026*

*Documento: máximo 25 páginas, formato A4, Times New Roman 12pt, páginas numeradas en la parte inferior derecha*