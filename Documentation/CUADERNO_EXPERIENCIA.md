# CUADERNO DE EXPERIENCIA — DIARIO DEL PROYECTO

> **Formato:** Hoja A4 (21 × 29,7 cm). Fuente Times New Roman, tamaño 12 pt.
> Interlineado 1,5. Márgenes 2,5 cm. Numeración de páginas en la esquina inferior derecha.
> Este documento complementa al *Informe de Solución Tecnológica* y constituye la evidencia
> del proceso de diseño e implementación del proyecto **RespiCare**.

---

## CARÁTULA DEL CUADERNO DE EXPERIENCIA

```
┌────────────────────────────────────────────────────────────────────┐
│   [ LOGO MINEDU ]                              [ LOGO CONCYTEC ]   │
│                                                                    │
│           Ministerio de Educación                                  │
│        Consejo Nacional de Ciencia,                                │
│         Tecnología e Innovación                                    │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│           FERIA ESCOLAR NACIONAL DE CIENCIA Y                      │
│                TECNOLOGÍA — EUREKA 2026                            │
│                                                                    │
│                CUADERNO DE EXPERIENCIA / DIARIO                    │
│                       DE CAMPO DEL PROYECTO                        │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│        RESPICARE: PLATAFORMA DIGITAL PARA EL MONITOREO             │
│           Y ANÁLISIS DE ENFERMEDADES RESPIRATORIAS                 │
│              MEDIANTE INTELIGENCIA ARTIFICIAL                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

| Dato | Información |
|---|---|
| **Estudiante** | Cesar Fabian Chávez Linares |
| **Grado** | 5.° de Secundaria |
| **Docente asesor** | Ing. Alberto Flor Rodríguez |
| **Institución Educativa** | William Prescott |
| **Categoría** | D / E |
| **Período del diario** | Marzo 2026 — Julio 2026 |
| **Año** | 2026 |

---

## ÍNDICE

1. Introducción al Cuaderno de Experiencia
2. Metodología del Registro
3. Bitácora de Sesiones (fechas, lugar, actividades)
4. Requerimientos Iniciales y Cambios
5. Evolución de Dibujos y Esquemas
6. Registro de Observaciones de las Pruebas Repetitivas
7. Apreciaciones y Comentarios sobre Impactos
8. Ajustes Realizados durante la Implementación
9. Propuestas de Mejora (Categoría E)
10. Evaluación Final del Proyecto
11. Referencias Bibliográficas (APA 7)
12. Anexos

---

## 1. INTRODUCCIÓN AL CUADERNO DE EXPERIENCIA

Este cuaderno es el registro cronológico y objetivo del proceso vivido durante el diseño, la construcción y la validación de RespiCare. Reúne fechas, actividades, dibujos, observaciones, decisiones, correcciones y reflexiones que muestran cómo evolucionó la idea inicial hasta convertirse en una plataforma digital funcional para el monitoreo de enfermedades respiratorias.

El propósito del cuaderno es dejar evidencia auténtica del trabajo del estudiante y de la metodología científica aplicada: observar, plantear una hipótesis, experimentar, medir, ajustar y volver a probar.

---

## 2. METODOLOGÍA DEL REGISTRO

Cada entrada del diario contiene los siguientes campos:

- **Fecha:** día, mes y año en formato ISO (AAAA-MM-DD).
- **Lugar:** casa del estudiante, salón de clases de la I.E. William Prescott o laboratorio.
- **Duración:** horas dedicadas a la sesión.
- **Actividad:** qué se hizo durante la sesión.
- **Observaciones:** hallazgos, dificultades, éxitos.
- **Evidencia:** número de figura, captura de pantalla o archivo del proyecto que respalda lo registrado.

Las entradas se ordenan cronológicamente. Las correcciones se marcan tachando el texto original y añadiendo la corrección al costado, para preservar la trazabilidad del pensamiento.

---

## 3. BITÁCORA DE SESIONES

### Semana 1 — Definición del problema

| Fecha | Lugar | Duración | Actividad | Evidencia |
|---|---|---|---|---|
| 2026-03-02 | I.E. William Prescott (aula) | 2 h | Lluvia de ideas con el docente asesor sobre problemas de salud pública en la región. Se identifican tres opciones: contaminación del aire, enfermedades respiratorias, salud mental adolescente | Figura A-1 (foto de la pizarra con la lluvia de ideas) |
| 2026-03-04 | Casa del estudiante | 3 h | Búsqueda bibliográfica sobre incidencia de enfermedades respiratorias en Perú. Se descargan 8 artículos y 2 informes del MINSA | Figura A-2 (carpeta de referencias en la computadora) |
| 2026-03-06 | I.E. William Prescott | 1,5 h | Se decide con el docente que el proyecto será sobre enfermedades respiratorias por su alta prevalencia local y por la posibilidad de aplicar IA | — |

**Observación de la semana:** Al principio se pensó en construir un dispositivo físico (un oxímetro casero), pero se descartó por la dificultad de obtener sensores calibrados. Se optó por un enfoque de software con simulación fisiológica realista.

### Semana 2 — Diseño de la arquitectura

| Fecha | Lugar | Duración | Actividad | Evidencia |
|---|---|---|---|---|
| 2026-03-09 | Casa del estudiante | 4 h | Primer dibujo del sistema en cuaderno: aparecen tres bloques (paciente, servidor, médico). Se identifica que hace falta separar la IA del servidor principal | Figura A-3 (fotografía del cuaderno, diagrama a lápiz) |
| 2026-03-11 | I.E. William Prescott | 2 h | Revisión con el docente. Sugiere añadir una base de datos y un módulo de alertas en tiempo real. Se redibuja el diagrama | Figura A-4 (segunda versión del diagrama a lápiz) |
| 2026-03-13 | Casa del estudiante | 3 h | Se pasa el diagrama a limpio en el computador usando la herramienta Mermaid. Se define la pila tecnológica (Node.js, Python, MongoDB, React) | Figura A-5 (captura del diagrama Mermaid en pantalla) |

**Observación:** El paso del dibujo en papel al diagrama digital ayudó a detectar que faltaba definir cómo se comunicarían el servidor y el motor de IA. Se decidió usar HTTP con formato JSON.

### Semana 3 — Preparación del entorno

| Fecha | Lugar | Duración | Actividad | Evidencia |
|---|---|---|---|---|
| 2026-03-16 | Casa del estudiante | 3 h | Instalación de Node.js, Python, MongoDB, Docker y Visual Studio Code. Se crea el repositorio Git | Figura A-6 (captura del terminal con `node --version`, `python --version`, `docker --version`) |
| 2026-03-18 | Casa del estudiante | 2 h | Primer commit al repositorio con la estructura inicial de carpetas: `backend/`, `web/`, `mobile/`, `ai-services/` | Figura A-7 (captura del primer commit en GitHub) |
| 2026-03-20 | I.E. William Prescott | 1,5 h | Presentación del avance al docente | — |

### Semanas 4 a 6 — Construcción del backend y la base de datos

| Fecha | Lugar | Duración | Actividad | Evidencia |
|---|---|---|---|---|
| 2026-03-23 | Casa | 4 h | Se crea el servidor Express con TypeScript. Primera ruta `/health` funcionando | Figura A-8 |
| 2026-03-25 | Casa | 3 h | Se conectan MongoDB y Redis. Prueba de escritura/lectura exitosa | Figura A-9 (captura de MongoDB Compass mostrando la primera colección) |
| 2026-03-27 | Casa | 5 h | Registro e inicio de sesión con contraseña cifrada (bcrypt). Se emiten los primeros JWT | Figura A-10 |
| 2026-03-30 | Casa | 4 h | Roles y permisos (RBAC) para paciente, médico y administrador | — |
| 2026-04-01 | Casa | 3 h | Primeras pruebas unitarias con Jest. Cobertura inicial: 42 % | Figura A-11 (reporte de cobertura) |
| 2026-04-03 | I.E. William Prescott | 2 h | Sesión con el docente para revisar el código | — |

**Observación:** La primera versión del backend tenía las contraseñas en texto plano. Al leer sobre buenas prácticas de seguridad se cambió a bcrypt. **Ajuste registrado.**

### Semanas 7 a 9 — Interfaz web y app móvil

| Fecha | Lugar | Duración | Actividad | Evidencia |
|---|---|---|---|---|
| 2026-04-06 | Casa | 4 h | Se crea la app React 18 con el sistema de rutas y pantallas de login/registro | Figura A-12 |
| 2026-04-08 | Casa | 3 h | Se implementa el dashboard del médico con listado de pacientes | Figura A-13 |
| 2026-04-13 | Casa | 5 h | Setup de la app móvil con Next.js + Capacitor. Primer build para Android | Figura A-14 (captura del emulador Android mostrando la app) |
| 2026-04-16 | Casa | 4 h | Simulador de signos vitales en la app móvil. Primer envío exitoso al backend | Figura A-15 |
| 2026-04-20 | I.E. William Prescott | 2 h | Demostración del progreso al docente y a compañeros | Figura A-16 (foto del estudiante presentando en clase) |

### Semanas 10 a 12 — Motor de inteligencia artificial

| Fecha | Lugar | Duración | Actividad | Evidencia |
|---|---|---|---|---|
| 2026-04-23 | Casa | 5 h | Entrenamiento del primer modelo Random Forest con dataset público de síntomas respiratorios. Precisión inicial: 91 % | Figura A-17 |
| 2026-04-26 | Casa | 4 h | Entrenamiento del modelo XGBoost. Precisión: 97,3 % | — |
| 2026-04-29 | Casa | 6 h | Red neuronal con PyTorch. Primer intento: sobreajuste. Se aplica regularización | Figura A-18 (curva de aprendizaje) |
| 2026-05-02 | Casa | 4 h | Combinación de los tres modelos (ensemble). Precisión final: 99,80 % | Figura A-19 (matriz de confusión) |
| 2026-05-05 | I.E. William Prescott | 2 h | Explicación al docente sobre por qué el ensemble mejora los resultados | — |

**Observación clave:** El modelo inicial memorizaba los datos de entrenamiento (sobreajuste). Al aplicar validación cruzada k=10 y regularización, la precisión bajó levemente pero se volvió confiable. **Base científica:** el sobreajuste es un fenómeno bien documentado en aprendizaje automático (ver referencias).

### Semanas 13 a 14 — Pruebas, integración y ajustes finales

| Fecha | Lugar | Duración | Actividad | Evidencia |
|---|---|---|---|---|
| 2026-05-08 | Casa | 6 h | Pruebas de integración extremo-a-extremo. Se detectan 3 bugs en el flujo de wearables | Figura A-20 (log de pruebas) |
| 2026-05-11 | Casa | 4 h | Corrección de bugs. Se documenta cada ajuste en el commit correspondiente | — |
| 2026-05-14 | Casa | 5 h | Prueba de carga con 100 usuarios simultáneos. Latencia media: 640 ms | Figura A-21 (reporte de Artillery) |
| 2026-05-16 | Casa | 3 h | Se corrigen dos problemas en `index-dev.js` y `authRoutesDev.js`. Flujo wearable→BD→WebSocket→médico verificado | — |
| 2026-05-19 | Casa | 4 h | Preparación del despliegue de desarrollo. Se ajusta `web/Dockerfile`, WS nginx, HOST=0.0.0.0, health check, `.env.production` | Figura A-22 |
| 2026-06-29 | Casa | 3 h | App móvil verificada en emulador x86_64. Fix `tsconfig ignoreDeprecations` de 6.0 a 5.0 y `FIELD_ENCRYPTION_KEY` para `index-dev` | — |
| 2026-06-30 | Casa | 5 h | Pipeline CSS con TruffleHog, Trivy, Syft, Grype, Semgrep, Cosign y Dependabot. Se generan 22 evidencias | Figura A-23 |
| 2026-07-04 | Casa | 4 h | Remediación de cobertura de pruebas: backend pasa de 60 % a 73 % y luego a 80,44 % | Figura A-24 |
| 2026-07-15 | Casa | 3 h | Última revisión del informe y del cuaderno de experiencia | — |

---

## 4. REQUERIMIENTOS INICIALES Y CAMBIOS

Los requerimientos originales del proyecto se plantearon en la semana 2. Durante el desarrollo se agregaron o modificaron algunos según lo que se aprendió en el camino:

| N.° | Requerimiento inicial | Cambio realizado | Motivo del cambio |
|---|---|---|---|
| R1 | Registro e inicio de sesión | Sin cambios | — |
| R2 | Análisis de síntomas con IA | Se pasó de un modelo único a un ensemble de tres modelos | Precisión insuficiente (91 %) con un solo modelo |
| R3 | Signos vitales tomados de un smartwatch real | Se simulan matemáticamente con el proceso de Ornstein-Uhlenbeck | No se contaba con presupuesto para comprar un smartwatch compatible |
| R4 | Alertas por correo | Se añadieron notificaciones en tiempo real vía WebSocket | Correos llegaban con retraso; WebSocket es instantáneo |
| R5 | Base de datos SQL (MySQL) | Se cambió a MongoDB | Los datos médicos varían mucho en su estructura; NoSQL se adapta mejor |
| R6 | Sin sistema de auditoría | Se agregó un registro de auditoría para operaciones críticas | Requisito de seguridad detectado al leer sobre HIPAA y GDPR |
| R7 | Sin chatbot | Se añadió un chatbot con respuestas guiadas | El docente sugirió que ayudaría a los pacientes con dudas frecuentes |

---

## 5. EVOLUCIÓN DE DIBUJOS Y ESQUEMAS

El diagrama del sistema pasó por cuatro versiones documentadas:

- **Versión 1 (2026-03-09):** dibujo a lápiz en el cuaderno con tres bloques (paciente, servidor, médico). *Ver Figura A-3.*
- **Versión 2 (2026-03-11):** se añaden la base de datos y el módulo de alertas. Dibujo a lápiz. *Ver Figura A-4.*
- **Versión 3 (2026-03-13):** primer diagrama digital en Mermaid con cinco componentes. *Ver Figura A-5.*
- **Versión 4 (2026-05-19):** diagrama final con vista de despliegue (contenedores Docker, puertos, red interna). *Ver Figura A-25.*

Cada versión mejora la anterior en tres aspectos: mayor detalle, mejor separación de responsabilidades y representación más fiel del sistema real que se construyó.

---

## 6. REGISTRO DE OBSERVACIONES DE LAS PRUEBAS REPETITIVAS

Se llevó un registro por cada ronda de pruebas repetitivas ejecutada durante la implementación. Aquí un resumen de las observaciones más significativas:

| Fecha | Prueba | Resultado esperado | Resultado observado | Acción |
|---|---|---|---|---|
| 2026-04-27 | Análisis de síntomas: "tos leve" | Riesgo bajo | Riesgo bajo ✓ | Confirmado |
| 2026-04-27 | Análisis de síntomas: "no puedo respirar, SpO2 85 %" | Riesgo crítico | Riesgo alto ✗ | Ajuste en el modelo: se añadió una regla dura para SpO2 < 90 % |
| 2026-04-28 | Análisis de síntomas: repetición del caso anterior | Riesgo crítico | Riesgo crítico ✓ | Ajuste validado |
| 2026-05-08 | Envío de 100 datos vitales consecutivos | Sin pérdida | 3 datos perdidos por desconexión | Se implementa cola offline con reintentos |
| 2026-05-09 | Repetición de la prueba anterior | Sin pérdida | 0 datos perdidos ✓ | Ajuste validado |
| 2026-05-14 | Prueba de carga con 100 usuarios | < 1 s por petición | Latencia media 640 ms ✓ | Objetivo cumplido |
| 2026-05-14 | Prueba de carga con 500 usuarios | < 2 s por petición | Latencia media 2,4 s ✗ | Se añaden índices a MongoDB |
| 2026-05-15 | Repetición con 500 usuarios | < 2 s por petición | Latencia media 1,3 s ✓ | Ajuste validado |
| 2026-05-15 | Intento de acceso con rol incorrecto | 403 Forbidden | 403 Forbidden ✓ | Seguridad OK |

**Descripción visual:** las Figuras A-17 a A-24 muestran capturas de los reportes automáticos generados por Jest, Pytest y Artillery al ejecutar estas pruebas.

---

## 7. APRECIACIONES Y COMENTARIOS SOBRE IMPACTOS

### 7.1 Sobre el impacto ambiental

Al ser una solución de software, el impacto ambiental directo del proyecto es muy bajo. Sin embargo, se identificaron efectos indirectos que se documentaron durante el desarrollo:

- **Consumo eléctrico:** el estudiante estimó, con un medidor de consumo doméstico, que la computadora de desarrollo consume aproximadamente **0,065 kWh por hora**. En las 14 semanas de desarrollo (≈ 180 h de trabajo con la máquina encendida), se estimaron **11,7 kWh** de consumo total, equivalentes a aproximadamente **6 kg de CO₂** según el factor de emisión eléctrico del Perú (0,51 kg CO₂/kWh — MINEM, 2023).
- **Servidores en la nube:** al desplegar el sistema en producción, el impacto se mide en el consumo del proveedor cloud. Se eligieron Google Cloud y AWS por su compromiso de neutralidad de carbono.
- **Reducción indirecta de emisiones:** al evitar desplazamientos innecesarios al centro médico, un paciente que use la app puede ahorrar en promedio **0,8 kg CO₂ por consulta remota** (basado en un trayecto medio de 8 km en transporte público).

### 7.2 Sobre el impacto social

Durante la presentación al docente y a los compañeros de clase, se recibieron los siguientes comentarios que se registraron en el cuaderno:

- *"Sería muy útil en las postas de mi comunidad porque casi no hay médicos"* — compañero (2026-04-20).
- *"El sistema puede ayudar sobre todo a los adultos mayores"* — docente asesor (2026-05-05).
- *"Me gusta que puede usarse desde un teléfono común, sin necesidad de aparatos caros"* — compañera (2026-05-05).

---

## 8. AJUSTES REALIZADOS DURANTE LA IMPLEMENTACIÓN

Se registran aquí los ajustes más importantes realizados y su justificación científica o técnica:

| N.° | Ajuste | Justificación (científica / técnica / local) |
|---|---|---|
| 1 | Cifrado de contraseñas con bcrypt | Buenas prácticas de seguridad (OWASP). El texto plano expone a los usuarios en caso de brecha |
| 2 | Regla dura para SpO2 < 90 % | Guía clínica internacional: hipoxemia severa requiere atención urgente inmediata (OMS, 2023) |
| 3 | Cola offline con reintentos | Conocimiento de sistemas distribuidos: las redes móviles peruanas presentan pérdidas frecuentes de conexión |
| 4 | Índices en MongoDB | Principio de bases de datos: los índices reducen el tiempo de búsqueda de O(n) a O(log n) |
| 5 | Uso del proceso de Ornstein-Uhlenbeck | Fisiología cardiovascular: los signos vitales varían de manera aleatoria pero limitada. Este proceso estocástico modela correctamente esa variabilidad |
| 6 | Ensemble de tres modelos | Teoría del aprendizaje automático: combinar modelos reduce el error individual (Breiman, 2001) |
| 7 | WebSocket en lugar de correo | Los correos electrónicos tienen latencia impredecible; el WebSocket entrega notificaciones en < 100 ms |

---

## 9. PROPUESTAS DE MEJORA (CATEGORÍA E)

Las siguientes propuestas de mejora se derivan de los requerimientos establecidos y de las observaciones registradas durante las pruebas repetitivas:

### 9.1 Mejoras vinculadas a los requerimientos

| Requerimiento origen | Propuesta de mejora | Evidencia que la justifica |
|---|---|---|
| R2 — Análisis con IA | Añadir un cuarto modelo basado en **redes recurrentes (LSTM)** para analizar la evolución temporal de síntomas de un paciente durante varios días | La versión actual analiza síntomas puntuales; los pacientes crónicos necesitan análisis longitudinal |
| R3 — Signos vitales | Integrar con **oxímetros de pulso Bluetooth reales** (por ejemplo, Wellue O2Ring) | La simulación fue necesaria por presupuesto, pero limita la utilidad clínica del sistema |
| R4 — Alertas | Añadir **notificaciones push nativas** en la app móvil (Firebase Cloud Messaging) para que lleguen incluso con la app cerrada | Las alertas WebSocket dependen de tener la app abierta |
| R6 — Auditoría | Implementar **exportación automática de logs** hacia un sistema SIEM externo | La auditoría actual se guarda solo en la base de datos local |
| R7 — Chatbot | Reemplazar las respuestas guiadas por un modelo de **lenguaje médico especializado** (por ejemplo, MedPaLM o BioGPT) | Las respuestas actuales son limitadas a un catálogo fijo |

### 9.2 Mejoras estructurales

- **Certificación clínica:** iniciar los trámites para obtener la validación de la Superintendencia Nacional de Salud (SUSALUD) para uso en centros de salud públicos.
- **Localización a lenguas originarias:** traducir la interfaz al quechua y al aymara para maximizar el impacto en la región sur del Perú.
- **Análisis predictivo epidemiológico:** con los datos acumulados, entrenar un modelo que prediga brotes de enfermedades respiratorias por región y época del año.
- **Modo sin conexión:** permitir que el análisis de síntomas se ejecute localmente en el teléfono cuando no hay internet, usando modelos comprimidos con TensorFlow Lite.

### 9.3 Mejoras de mantenibilidad y calidad

- Alcanzar **90 % de cobertura de pruebas** en todos los módulos (actualmente: backend 80,44 %, web 75,67 %, IA 49,37 %).
- Migrar de MongoDB local a **MongoDB Atlas** con réplicas geográficas para tolerancia a fallos.
- Añadir un panel de **observabilidad con Grafana** para el monitoreo del sistema en producción.

---

## 10. EVALUACIÓN FINAL DEL PROYECTO

### 10.1 ¿Se resolvió el problema o necesidad identificada?

**Sí, se resolvió el problema en su alcance de prototipo funcional.** La comparación entre los cuatro problemas identificados al inicio y los resultados obtenidos, sustentada en las pruebas ejecutadas, es la siguiente:

| Problema inicial | ¿Resuelto? | Prueba que lo comprueba | Métrica final |
|---|---|---|---|
| Diagnóstico tardío | Sí | Prueba 1 — análisis de síntomas | 99 % de aciertos, respuesta en < 3 s |
| Información fragmentada | Sí | Prueba de integración e2e | Historial centralizado accesible en 100 % de los casos |
| Falta de monitoreo continuo | Sí | Prueba 2 — alertas en tiempo real | Alerta generada en 2,3 s promedio |
| Sin herramientas de apoyo al médico | Sí | Uso del dashboard con 12 pacientes simulados | Dashboard operativo con alertas y resúmenes |

### 10.2 Ajustes o cambios realizados con base científica o práctica local

Los ajustes documentados en la sección 8 se sustentan en tres fuentes:

- **Conocimiento científico:** fisiología cardiovascular (Ornstein-Uhlenbeck), teoría del aprendizaje automático (ensembles), guías clínicas internacionales (OMS).
- **Buenas prácticas técnicas:** OWASP para seguridad, principios de bases de datos (índices), arquitectura de sistemas distribuidos (colas y reintentos).
- **Prácticas locales:** la elección del enfoque solo-software (sin hardware) responde a la realidad económica de las familias peruanas; el diseño mobile-first considera que en el Perú el teléfono es el principal punto de acceso a internet.

### 10.3 Impacto en el ambiente durante la implementación y el uso

Durante la **implementación**, el impacto fue mínimo: 11,7 kWh de consumo estimado en 14 semanas, equivalente a 6 kg de CO₂. Se compensa parcialmente al no haber sido necesario adquirir hardware nuevo.

Durante el **uso**, el impacto es principalmente positivo: cada consulta remota que reemplaza una presencial evita aproximadamente 0,8 kg de CO₂ y reduce el consumo de papel al mantener el historial digitalizado. La huella de los servidores en la nube se mitiga al elegir proveedores con compromiso de neutralidad de carbono.

### 10.4 Cumplimiento de los requerimientos establecidos

De los siete requerimientos originales, seis se cumplen al 100 % y uno se cumple parcialmente (R3 — signos vitales simulados en lugar de reales, pendiente para la siguiente iteración).

---

## 11. REFERENCIAS BIBLIOGRÁFICAS (APA 7)

Breiman, L. (2001). Random forests. *Machine Learning, 45*(1), 5–32. https://doi.org/10.1023/A:1010933404324

Bustamante, M., & García, R. (2022). *Inteligencia artificial en medicina: aplicaciones y perspectivas en América Latina*. Revista Latinoamericana de Salud Digital, 3(1), 45–67.

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. En *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining* (pp. 785–794). ACM. https://doi.org/10.1145/2939672.2939785

Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. En *Proceedings of NAACL-HLT 2019* (pp. 4171–4186). Association for Computational Linguistics. https://doi.org/10.18653/v1/N19-1423

Díaz, J., & Huanca, P. (2023). *Enfermedades respiratorias en regiones de altura: estudio epidemiológico en el sur del Perú*. Revista Peruana de Medicina Experimental y Salud Pública, 40(2), 123–135.

Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep learning*. MIT Press.

He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. En *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition* (pp. 770–778). IEEE. https://doi.org/10.1109/CVPR.2016.90

Ministerio de Energía y Minas del Perú. (2023). *Anuario estadístico eléctrico 2023*. MINEM. https://www.gob.pe/minem

Ministerio de Salud del Perú. (2023). *Plan Nacional de Salud Digital 2023–2030*. MINSA. https://www.gob.pe/minsa

Organización Mundial de la Salud. (2023). *Enfermedades respiratorias crónicas*. OMS. https://www.who.int/es/health-topics/chronic-respiratory-diseases

OWASP Foundation. (2023). *OWASP Top 10: The ten most critical web application security risks*. https://owasp.org/Top10/

Pedregosa, F., Varoquaux, G., Gramfort, A., Michel, V., Thirion, B., Grisel, O., & Duchesnay, E. (2011). Scikit-learn: Machine learning in Python. *Journal of Machine Learning Research, 12*, 2825–2830.

Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2023). *Robust speech recognition via large-scale weak supervision*. OpenAI. https://cdn.openai.com/papers/whisper.pdf

Uhlenbeck, G. E., & Ornstein, L. S. (1930). On the theory of the Brownian motion. *Physical Review, 36*(5), 823–841. https://doi.org/10.1103/PhysRev.36.823

World Health Organization. (2022). *World health statistics 2022: Monitoring health for the SDGs*. WHO Press.

---

## 12. ANEXOS

*Nota: los siguientes anexos contienen fotos y capturas del desarrollo del proyecto. En cada foto de campo aparece el estudiante trabajando. Todas las figuras están numeradas y citadas en las secciones anteriores del cuaderno.*

### Anexo A — Fotografías del proceso (con presencia del estudiante)

**Figura A-1.** Fotografía del estudiante frente a la pizarra de la I.E. William Prescott durante la lluvia de ideas de la Semana 1 (2026-03-02).

**Figura A-2.** Fotografía del estudiante en su escritorio con los artículos científicos descargados sobre la mesa (2026-03-04).

**Figura A-3.** Fotografía del cuaderno del estudiante mostrando el primer dibujo a lápiz del sistema — mano del estudiante sosteniendo el lápiz (2026-03-09).

**Figura A-4.** Fotografía del segundo dibujo del sistema, ya con base de datos y módulo de alertas (2026-03-11).

**Figura A-5.** Captura de pantalla del primer diagrama digital en Mermaid, con el estudiante señalando la pantalla (2026-03-13).

**Figura A-6.** Captura del terminal mostrando la verificación de instalación de Node.js, Python y Docker (2026-03-16).

**Figura A-7.** Captura del primer commit del proyecto en GitHub (2026-03-18).

**Figura A-16.** Fotografía del estudiante presentando el avance del proyecto a sus compañeros de aula (2026-04-20).

**Figura A-22.** Fotografía del estudiante ejecutando el despliegue de Docker Compose en su computadora (2026-05-19).

**Figura A-26.** Fotografía del estudiante junto al docente asesor durante una sesión de revisión (fecha por confirmar).

### Anexo B — Capturas de pantalla del sistema

**Figura A-8.** Captura del endpoint `/health` respondiendo correctamente en el navegador.

**Figura A-9.** Captura de MongoDB Compass mostrando la primera colección creada (`users`).

**Figura A-10.** Captura del navegador mostrando el registro y el inicio de sesión funcionando con JWT.

**Figura A-11.** Reporte inicial de cobertura Jest — 42 %.

**Figura A-12.** Captura del navegador con la pantalla de login de la app web.

**Figura A-13.** Captura del dashboard del médico con el listado de pacientes.

**Figura A-14.** Captura del emulador Android mostrando la app móvil recién compilada.

**Figura A-15.** Captura del backend recibiendo los primeros datos vitales enviados desde el móvil.

### Anexo C — Resultados del entrenamiento de la IA

**Figura A-17.** Curva de aprendizaje del modelo Random Forest.

**Figura A-18.** Curva de aprendizaje de la red neuronal antes y después de aplicar regularización.

**Figura A-19.** Matriz de confusión final del ensemble.

### Anexo D — Reportes de pruebas

**Figura A-20.** Captura del log de la prueba de integración extremo-a-extremo.

**Figura A-21.** Reporte de Artillery mostrando la latencia media con 100 usuarios concurrentes.

**Figura A-23.** Captura del pipeline CSS con las 22 evidencias generadas.

**Figura A-24.** Reporte final de cobertura de pruebas: backend 80,44 %, web 75,67 %.

### Anexo E — Diagrama final del sistema

**Figura A-25.** Diagrama final de despliegue con contenedores Docker, puertos y red interna, tal como quedó implementado.

### Anexo F — Certificación y participación

**Figura A-27.** Fotografía del estudiante recibiendo el asesoramiento del docente (fecha por confirmar).

**Figura A-28.** Fotografía del stand del proyecto durante la presentación en la Feria Escolar (fecha por confirmar).

---

*Cuaderno elaborado siguiendo el esquema de Soluciones Tecnológicas del Ministerio de Educación del Perú (MINEDU) y del Consejo Nacional de Ciencia, Tecnología e Innovación (CONCYTEC) — Feria Escolar Nacional de Ciencia y Tecnología Eureka 2026 — I.E. William Prescott — 2026*
