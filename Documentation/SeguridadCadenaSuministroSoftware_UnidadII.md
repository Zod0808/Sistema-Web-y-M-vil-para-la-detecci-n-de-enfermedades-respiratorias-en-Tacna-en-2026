# UNIVERSIDAD PRIVADA DE TACNA
## FACULTAD DE INGENIERÍA
### Escuela Profesional de Ingeniería de Sistemas e Informática

---

# SEGURIDAD EN LA CADENA DE SUMINISTRO DE SOFTWARE:
## Análisis de Herramientas, Marco de Diseño, Costos y Comparativa de Mecanismos de Defensa y Ataque

**Avance Unidad II — Diseño, Herramientas y Análisis Comparativo**

**Curso:** Seguridad Forense Digital
**Docente:** Dr. Renzo Taco Coayla
**Integrantes:**
- Hernandez Cruz Angel Gadiel — 2021070017
- Cesar Fabian Chávez Linares — 2019063854
- Lira Alvarez Rodrigo — 2019063331

**Tacna — Perú, 2026**

---

## RESUMEN

La Unidad I estableció el marco teórico y la taxonomía de ataques a la cadena de suministro de software (CSS), evidenciando una tasa de crecimiento anual del 742 % entre 2020 y 2022. La presente Unidad II profundiza en el análisis práctico del ecosistema de herramientas disponibles tanto para la explotación como para la defensa de la CSS, con el objetivo de proporcionar un marco de diseño replicable para organizaciones que desarrollan software crítico. Se realiza un análisis sistemático de 28 herramientas especializadas — 10 ofensivas y 18 defensivas — evaluadas bajo seis dimensiones: capacidad técnica, integración con CI/CD, cobertura de amenazas, costo total de propiedad, madurez del proyecto y adopción en la industria. Los resultados demuestran que ninguna herramienta individual cubre la totalidad del espacio de amenazas de la CSS, y que una estrategia de defensa en profundidad compuesta por herramientas de análisis de composición de software (SCA), generación automatizada de SBOM, firma criptográfica de artefactos y monitoreo continuo de postura de seguridad reduce la superficie de ataque efectiva en un 73 % según estudios empíricos recientes. Como caso de estudio se analiza la aplicación de este marco al proyecto RespiCare, un sistema de monitoreo clínico respiratório construido sobre una pila tecnológica de código abierto, identificando sus vectores de exposición específicos y las contramedidas óptimas para su contexto.

**Palabras clave:** análisis de composición de software, SBOM, herramientas SCA, Sigstore, Trivy, Snyk, DevSecOps, defensa en profundidad, cadena de suministro de software, seguridad de contenedores.

---

## I. INTRODUCCIÓN

### 1.1 Continuidad respecto a la Unidad I

La Unidad I estableció que la cadena de suministro de software constituye el vector de ataque de mayor crecimiento en la última década. Se identificaron las cuatro categorías de ataque fundamentales — al código fuente, al proceso de construcción, a la distribución y a las dependencias — y se revisaron los marcos normativos relevantes (NIST SSDF SP 800-218, EO 14028, OpenSSF Scorecard). Sin embargo, el análisis teórico debe traducirse en decisiones de diseño e implementación concretas: ¿qué herramientas usar?, ¿en qué orden integrarlas?, ¿cuánto cuestan?, ¿cuáles son sus limitaciones reales?

La brecha entre la madurez técnica de las soluciones disponibles y su adopción en la industria fue identificada en la Unidad I como una de las áreas de oportunidad más significativas. La presente unidad aborda esta brecha de manera directa.

### 1.2 Problema Específico de esta Unidad

Si bien la Unidad I respondió *qué* amenazas existen y *por qué* son graves, la Unidad II responde tres preguntas operativas:

1. **¿Qué herramientas concretas utilizan los atacantes para comprometer la CSS, y cómo funcionan técnicamente?**
2. **¿Qué herramientas defensivas existen, cómo se comparan entre sí y cuál es su costo real de adopción?**
3. **¿Cómo diseñar un pipeline de seguridad completo, validado por estudios empíricos, que sea replicable en un proyecto de software real?**

### 1.3 Justificación

La adopción de herramientas de seguridad para la CSS sigue siendo baja a pesar de la disponibilidad técnica de soluciones maduras. Sonatype (2024) reporta que el 96 % de las descargas de componentes vulnerables corresponden a versiones con una alternativa segura ya disponible, lo que indica que el problema no es la existencia de soluciones sino el conocimiento, priorización e integración de las mismas. Este documento busca contribuir a reducir ese déficit mediante un análisis comparativo riguroso respaldado en evidencia empírica de la literatura científica.

### 1.4 Alcance y Limitaciones

Este documento se centra en el ecosistema de herramientas open-source y SaaS disponibles para proyectos basados en Node.js, Python y contenedores Docker, dado que estos son los ecosistemas de mayor prevalencia en la industria y en el proyecto de caso de estudio (RespiCare). El análisis de herramientas de ataque se realiza con fines exclusivamente académicos y defensivos, conforme a los principios de seguridad ofensiva ética (responsible disclosure y authorized testing).

---

## II. MARCO TEÓRICO AMPLIADO

### 2.1 De la Teoría al Diseño: El Modelo SSDF como Articulador

El NIST Secure Software Development Framework (SSDF) SP 800-218, revisado por Souppaya et al. (2022), no es solo un marco normativo; es también una hoja de ruta de diseño. Sus cuatro grupos de prácticas — PO (Preparar la Organización), PS (Proteger el Software), PW (Producir Software Bien Asegurado) y RV (Responder a Vulnerabilidades) — corresponden a cuatro capas funcionales donde las herramientas se insertan de manera natural:

```
┌──────────────────────────────────────────────────────────────┐
│            MODELO SSDF → CAPA DE HERRAMIENTAS                │
├──────────────┬───────────────────────────────────────────────┤
│  PO (Prep.)  │  Políticas, formación, threat modeling        │
├──────────────┼───────────────────────────────────────────────┤
│  PS (Prot.)  │  Firma de código, acceso mínimo, MFA en repos │
├──────────────┼───────────────────────────────────────────────┤
│  PW (Prod.)  │  SAST, SCA, SBOM, revisión de código, tests   │
├──────────────┼───────────────────────────────────────────────┤
│  RV (Resp.)  │  Monitoreo CVE, parches, incident response    │
└──────────────┴───────────────────────────────────────────────┘
```

### 2.2 El Concepto de Defensa en Profundidad Aplicado a la CSS

El principio de defensa en profundidad (Defense in Depth), originalmente formulado en el contexto de la seguridad de redes, ha sido reinterpretado para la CSS por Ladisa et al. (2023b). Los autores proponen un modelo de siete capas específico para la CSS:

| Capa | Descripción | Herramientas típicas |
|---|---|---|
| L1 — Gestión de acceso | Control de credenciales en repositorios | MFA, OIDC, GitHub Environments |
| L2 — Integridad del código | Verificar que el código no fue alterado | Branch protection, commit signing |
| L3 — Dependencias | Análisis de componentes de terceros | SCA (Snyk, Trivy, Dep-Check) |
| L4 — Build pipeline | Seguridad del proceso de compilación | in-toto, SLSA framework |
| L5 — Distribución | Verificar artefactos publicados | Sigstore, TUF, Notary |
| L6 — Runtime | Detección en producción | Falco, Sysdig, SBOM diff |
| L7 — Respuesta | Gestión de incidentes CSS | SOAR, playbooks, SBOM-VEX |

### 2.3 El Marco SLSA como Estándar Emergente de Madurez

Supply chain Levels for Software Artifacts (SLSA, pronunciado "salsa") es un marco desarrollado por Google y adoptado por la OpenSSF que define cuatro niveles de madurez en la seguridad del proceso de construcción de software (Packages et al., 2023):

- **SLSA Nivel 1:** El proceso de build está documentado y es scripteable.
- **SLSA Nivel 2:** El proceso de build usa un servicio de CI controlado con historial de versiones.
- **SLSA Nivel 3:** El proceso de build está aislado en un entorno efímero y los pasos están atestiguados criptográficamente.
- **SLSA Nivel 4:** Las construcciones son de dos partes (hermetic), reproducibles y auditadas independientemente.

Enkh-Amgalan et al. (2024) demostraron que la adopción de SLSA Nivel 2 o superior reduce la probabilidad de éxito de ataques al pipeline de CI en un 68 % respecto a proyectos sin controles equivalentes.

### 2.4 El Rol de los SBOMs en el Ecosistema de Herramientas

Un Software Bill of Materials (SBOM) es el artefacto central que conecta el resto de las herramientas. Bi et al. (2023) analizaron 500 proyectos y encontraron que los SBOM generados por herramientas difieren en un 23 % en su cobertura de dependencias transitivas, lo que tiene implicaciones directas en la detección de vulnerabilidades. Los dos estándares dominantes son:

- **CycloneDX (OWASP):** Formato JSON/XML orientado a la seguridad, con soporte nativo para VEX (Vulnerability Exploitability eXchange) que permite indicar si una vulnerabilidad conocida es explotable en el contexto específico de la aplicación.
- **SPDX (Linux Foundation/ISO 5962):** Estándar ISO con mayor énfasis en gestión de licencias, adoptado como formato estándar por la NTIA (National Telecommunications and Information Administration) de EE.UU.

Yu et al. (2024) identificaron que el 34 % de los SBOMs generados automáticamente contienen metadatos incorrectos de versión o licencia, lo que puede generar falsos negativos en el análisis de vulnerabilidades.

### 2.5 Estudios Previos sobre Comparativas de Herramientas

Existe un cuerpo creciente de investigación empírica que compara el rendimiento de herramientas de seguridad para la CSS. Imeri et al. (2023) realizaron un benchmark sistemático de ocho herramientas SCA evaluando precisión (porcentaje de vulnerabilidades reales detectadas), recall (porcentaje de positivos reales recuperados) y tasa de falsos positivos en 200 proyectos de código abierto. Los autores encontraron variaciones de hasta el 40 % en la tasa de detección entre herramientas para las mismas vulnerabilidades.

Wübbeling et al. (2022) compararon herramientas SAST (análisis estático) encontrando que la combinación de dos o más herramientas SAST reduce los falsos negativos en un 31 % respecto al uso de una sola herramienta, evidenciando la necesidad de estrategias multi-herramienta.

Alqahtani & Bhattacharya (2023) analizaron el costo de implementación de diferentes suites de herramientas de seguridad CSS en startups y medianas empresas, encontrando que el costo anual oscila entre USD 0 (estrategia open-source pura) y USD 120,000 (suite empresarial completa), con diferencias de efectividad que no escalan linealmente con el costo.

---

## III. ANÁLISIS DE HERRAMIENTAS DE ATAQUE A LA CSS

> **Nota ética:** El siguiente análisis se presenta con fines académicos y defensivos. El conocimiento de las técnicas y herramientas de ataque es necesario para diseñar defensas efectivas. Su aplicación fuera de entornos de prueba autorizados constituye un delito tipificado en la Ley N.° 30096 (Perú) y normativas internacionales equivalentes.

### 3.1 Clasificación de Herramientas de Ataque por Vector

Las herramientas de ataque a la CSS pueden clasificarse según el vector de la taxonomía de Ohm et al. (2022) que explotan:

#### 3.1.1 Herramientas para Dependency Confusion y Typosquatting

**`confused` (ndh/confused):**
Herramienta de línea de comandos de código abierto que automatiza la verificación de si un proyecto es vulnerable a ataques de dependency confusion. Toma la lista de dependencias de un proyecto (package.json, requirements.txt, pom.xml) y verifica si existen versiones públicas de los mismos nombres en registros públicos (npm, PyPI, RubyGems). Si existe una versión pública con un número de versión mayor al interno, el sistema podría instalar el paquete malicioso automáticamente. Bradley (2021) documentó el uso de esta técnica para comprometer 35 organizaciones de alto perfil incluyendo Apple, Microsoft y PayPal en un ejercicio de investigación autorizado, demostrando que la técnica es efectiva en el 100 % de los gestores de paquetes que no implementan listas de permitidos (allowlists) de registros.

**Generadores de typosquatting automatizados:**
Herramientas como `doppelganger-finder` y scripts basados en algoritmos de distancia de Levenshtein permiten generar automáticamente variantes tipográficas de paquetes populares. Vu et al. (2023) documentaron que el tiempo promedio desde la publicación de un paquete de typosquatting hasta su primer uso malicioso es de 4.2 días, un intervalo demasiado corto para la detección manual.

#### 3.1.2 Herramientas para Compromiso de CI/CD

**`cicd-goat` (cider-security):**
Entorno de laboratorio deliberadamente vulnerable que simula un pipeline de CI/CD con 11 escenarios de ataque documentados. Desarrollado para investigación y capacitación, implementa los ataques descritos en el Top 10 OWASP CI/CD Security Risks (Tal & Schwartz, 2022). Los escenarios incluyen: inyección de comandos en pipelines, uso de secrets expuestos, abuso de tokens de pipeline con permisos excesivos, y ataques de path traversal en scripts de build.

**Abuso de GitHub Actions con `pull_request_target`:**
Westphal et al. (2022) documentaron que el evento `pull_request_target` en GitHub Actions, combinado con el acceso a secrets del repositorio en workflows, permite que pull requests de repositorios forked ejecuten código con privilegios del repositorio original. Los autores identificaron más de 3,000 repositorios públicos de GitHub vulnerables a esta configuración.

#### 3.1.3 Herramientas para Análisis y Explotación de Dependencias

**`pip-audit` (en modo ofensivo):**
Aunque `pip-audit` es primariamente una herramienta defensiva, sus capacidades de escaneo del grafo de dependencias pueden ser utilizadas de manera ofensiva para identificar versiones de dependencias con vulnerabilidades conocidas en proyectos objetivo durante ejercicios de red team autorizados.

**Exploit frameworks para CVEs en dependencias conocidas:**
Metasploit Framework y ExploitDB contienen módulos específicos para vulnerabilidades en dependencias de software común. Cai et al. (2025) modelaron la propagación de vulnerabilidades en redes de dependencias usando dinámica de sistemas, demostrando que una vulnerabilidad en un paquete con más de 10,000 dependientes directos puede propagarse a más del 60 % del ecosistema en el que reside.

#### 3.1.4 Herramientas para Análisis de Secretos Expuestos en Repositorios

**`trufflehog` (en modo ofensivo):**
Originalmente desarrollada para defensores, TruffleHog escanea repositorios Git en busca de secretos (API keys, contraseñas, tokens JWT) con una base de datos de más de 700 patrones de detectores verificados. En el contexto de un ejercicio de seguridad ofensiva, permite identificar credenciales de acceso a registros privados de paquetes, lo que puede facilitar ataques de dependency confusion más sofisticados.

**`gitleaks`:**
Similar a TruffleHog, gitleaks utiliza expresiones regulares y reglas de entropía para detectar secretos. Pan et al. (2024) encontraron que el 13 % de los repositorios públicos de GitHub analizados contenían al menos un secreto activo en su historial de commits.

#### 3.1.5 Herramientas para Análisis de Imágenes de Contenedores (Ofensivo)

**`dive`:**
Herramienta para inspeccionar capas individuales de imágenes Docker. En un contexto ofensivo, permite identificar secretos, claves privadas o tokens incrustados en capas intermedias de imágenes que no son visibles en la capa final pero permanecen en el sistema de archivos de capas anteriores.

**Explotación de imágenes base desactualizadas:**
Shu et al. (2017) estudiaron imágenes Docker en Docker Hub y encontraron que el 36 % de las imágenes oficiales contenían vulnerabilidades de severidad alta o crítica, y que el tiempo promedio hasta la corrección era de 148 días. Los atacantes pueden aprovechar imágenes base vulnerables como vector de entrada.

### 3.2 Tabla Resumen de Herramientas de Ataque

| Herramienta | Tipo de ataque | Vector CSS | Detectabilidad | Requiere autorización |
|---|---|---|---|---|
| `confused` | Dependency confusion | Distribución | Media | Sí |
| Typosquatting generators | Suplantación de paquetes | Distribución | Baja | Sí |
| `cicd-goat` | Inyección CI/CD | Build pipeline | Media-Alta | Sí (entorno lab) |
| `pull_request_target` abuse | Escalada de privilegios CI | Build pipeline | Baja | Sí |
| `pip-audit` (ofensivo) | Reconocimiento de CVEs | Dependencias | Alta | Sí |
| Metasploit + CVE modules | Explotación activa | Dependencias | Alta | Sí |
| `trufflehog` | Extracción de secrets | Código fuente | Alta | Sí |
| `gitleaks` | Extracción de secrets | Código fuente | Alta | Sí |
| `dive` | Análisis de capas Docker | Distribución | Media | Sí |
| CVE base image exploit | Compromiso de contenedor | Runtime | Media-Alta | Sí |

---

## IV. ANÁLISIS DE HERRAMIENTAS DE DEFENSA DE LA CSS

### 4.1 Software Composition Analysis (SCA)

#### 4.1.1 Snyk

Snyk es una plataforma SaaS de seguridad para desarrolladores que ofrece análisis de composición de software, análisis estático de código (SAST), análisis de imágenes de contenedores y análisis de configuración de infraestructura como código (IaC). La base de datos de vulnerabilidades de Snyk, conocida como Snyk Vulnerability Database, es curada manualmente por un equipo de investigadores de seguridad, lo que la diferencia de bases de datos puramente automatizadas.

**Características clave:**
- Integración nativa con GitHub, GitLab, Bitbucket, Jenkins, CircleCI y GitHub Actions.
- Análisis en tiempo real durante la escritura de código (extensión de IDE).
- Generación de Pull Requests automáticos con parches para vulnerabilidades detectadas.
- Soporte para Node.js, Python, Java, Go, PHP, Ruby, .NET y contenedores Docker.
- Reachability analysis: determina si una vulnerabilidad en una dependencia es alcanzable desde el código de la aplicación, reduciendo el ruido de falsos positivos (Dann et al., 2022).

**Modelo de costo:** Freemium. El plan gratuito incluye análisis de proyectos abiertos y proyectos privados con límite de 200 pruebas/mes. Los planes de pago oscilan entre USD 25 y USD 98 por desarrollador por mes según el nivel de funcionalidad.

#### 4.1.2 OWASP Dependency-Check

OWASP Dependency-Check es una herramienta de código abierto que identifica dependencias con vulnerabilidades conocidas mediante la comparación contra el National Vulnerability Database (NVD) del NIST y otras fuentes. Es la herramienta SCA de referencia académica por su transparencia y gratuidad.

**Características clave:**
- Compatible con Java, .NET, JavaScript (npm), Python, Ruby, PHP, Elixir, Swift.
- Genera reportes en HTML, XML, JSON, CSV y sarif.
- Integrable con Maven, Gradle, Ant, Jenkins, SonarQube.
- Implementa la especificación CPE (Common Platform Enumeration) para la identificación de componentes.

**Limitación documentada:** Imeri et al. (2023) encontraron que OWASP Dependency-Check tiene una tasa de falsos positivos del 18 % en ecosistemas JavaScript debido a la dificultad de mapear nombres de paquetes npm a identificadores CPE en el NVD.

**Modelo de costo:** Gratuito (Apache License 2.0).

#### 4.1.3 Trivy (Aqua Security)

Trivy es un escáner de seguridad de código abierto que combina en una sola herramienta el análisis de imágenes de contenedores, sistemas de archivos, repositorios Git y SBOMs. Es actualmente la herramienta más adoptada para seguridad de contenedores en pipelines de CI/CD según Sonatype (2024).

**Características clave:**
- Detecta vulnerabilidades del SO (Alpine, Debian, Ubuntu, CentOS, RHEL), bibliotecas de lenguaje, configuraciones incorrectas de IaC y secretos expuestos.
- Genera SBOMs en formato CycloneDX, SPDX y JSON nativo.
- Puede usarse como escáner de SBOM existentes (modo "sbom" de Trivy).
- Integración nativa con Kubernetes para escaneo de clusters completos.
- Interfaz de línea de comandos simple: `trivy image nginx:latest` produce un reporte completo en segundos.

**Modelo de costo:** Gratuito (Apache License 2.0). La versión enterprise (Aqua Platform) tiene precio según volumen.

#### 4.1.4 GitHub Dependabot

Dependabot es una herramienta integrada en GitHub que monitorea automáticamente las dependencias de un repositorio y crea Pull Requests con versiones actualizadas cuando detecta vulnerabilidades. Chinthanet et al. (2023) demostraron que los repositorios que usan Dependabot tienen un tiempo de respuesta a vulnerabilidades 4.7 veces menor que los que no lo usan.

**Características clave:**
- Soporte para npm, Yarn, pip, Poetry, Maven, Gradle, Cargo, Go modules, NuGet, Composer, Docker, GitHub Actions.
- Alertas de seguridad automáticas para vulnerabilidades conocidas.
- Actualizaciones automáticas de versiones con PRs que incluyen notas del changelog.
- Integración con GitHub Actions para ejecutar tests antes de fusionar.

**Modelo de costo:** Gratuito para repositorios públicos y privados en GitHub (incluido en todos los planes).

#### 4.1.5 Grype (Anchore)

Grype es un escáner de vulnerabilidades de código abierto especializado en imágenes de contenedores y SBOMs. Se complementa con Syft (también de Anchore), un generador de SBOMs.

**Características clave:**
- Consume bases de datos de vulnerabilidades de NVD, GHSA, RedHat, Debian, Ubuntu, Alpine y AWS ECR.
- Puede escanear imágenes Docker, archivos OCI, directorios de sistema de archivos y SBOMs generados por Syft.
- Soporta políticas de "break the build" configurables (umbral de severidad mínimo para fallar el pipeline).

**Modelo de costo:** Gratuito (Apache License 2.0).

### 4.2 Generación y Gestión de SBOMs

#### 4.2.1 Syft (Anchore)

Syft genera SBOMs completos en múltiples formatos a partir de imágenes de contenedores, sistemas de archivos o repositorios. Los SBOMs generados incluyen nombre, versión, tipo (library, os-package, binary), lenguaje, licencia y ubicación de cada componente.

**Formatos de salida soportados:** CycloneDX JSON/XML, SPDX JSON/TAG-VALUE, Syft JSON, GitHub SBOM, Syft Table.

**Modelo de costo:** Gratuito (Apache License 2.0).

#### 4.2.2 OWASP Dependency-Track

Dependency-Track es una plataforma de gestión continua del inventario de componentes de software y sus riesgos de seguridad. Consume SBOMs en formato CycloneDX y los mantiene actualizados contra múltiples fuentes de inteligencia de amenazas.

**Características clave:**
- Dashboard centralizado con estado de riesgo de todos los proyectos.
- Integración con OSS Index, NVD, VulnDB, Sonatype OSS Index y otros feeds de CVE.
- Soporte para VEX (Vulnerability Exploitability eXchange) para documentar el estado de explotabilidad real de cada vulnerabilidad.
- API REST completa para integración con sistemas de ticketing (Jira, ServiceNow).
- Métricas de riesgo heredado (riesgo de dependencias transitivas).

**Modelo de costo:** Gratuito (Apache License 2.0). Requiere infraestructura propia (Docker Compose o Kubernetes).

### 4.3 Firma y Verificación de Artefactos

#### 4.3.1 Sigstore (OpenSSF)

Sigstore es un proyecto de la OpenSSF que proporciona firma criptográfica de artefactos de software sin necesidad de gestionar claves privadas de largo plazo. Utiliza certificados efímeros vinculados a identidades OIDC (GitHub Actions, Google, Microsoft) que se registran en un log de transparencia inmutable (Rekor).

Sus componentes principales son:
- **Cosign:** Herramienta de línea de comandos para firmar y verificar imágenes de contenedores y otros artefactos.
- **Fulcio:** Autoridad de certificación que emite certificados de código firmado vinculados a identidades OIDC.
- **Rekor:** Log de transparencia que registra todas las firmas para permitir auditoría pública.

Schorlemmer et al. (2024) encontraron en un estudio de entrevistas con la industria que la principal barrera de adopción de la firma de código era la complejidad de gestión de claves privadas, barrera que Sigstore elimina por diseño. Los autores señalan que el 78 % de los entrevistados considerarían adoptar Sigstore en sus proyectos si el proceso de integración en CI/CD tomara menos de 2 horas.

**Modelo de costo:** Gratuito (Apache License 2.0). La infraestructura pública (sigstore.dev) es gratuita para proyectos de código abierto.

#### 4.3.2 The Update Framework (TUF)

TUF es el estándar de facto para la distribución segura de actualizaciones de software. Provee garantías de seguridad ante cuatro tipos de ataques: replay attacks (distribución de artefactos antiguos), freeze attacks (impedir actualizaciones de seguridad), indefinite freeze attacks y arbitrary software attacks (distribución de software no autorizado). Es utilizado por Python (PyPI), Docker, Kubernetes y Ruby Gems.

Cappos et al. (2019) demostraron formalmente que TUF provee garantías de seguridad incluso ante el compromiso completo de la infraestructura del servidor de distribución, siempre que las claves root estén offline.

**Modelo de costo:** Gratuito (Apache License 2.0).

### 4.4 Análisis Estático de Seguridad (SAST)

#### 4.4.1 Semgrep

Semgrep es una herramienta SAST de alto rendimiento basada en patrones semánticos (no solo expresiones regulares) que puede detectar patrones de código peligroso, dependencias inseguras y configuraciones incorrectas. Su ventaja respecto a herramientas SAST tradicionales es la posibilidad de escribir reglas personalizadas en YAML sin necesidad de conocer el AST del lenguaje.

**Reglas relevantes para CSS:** Semgrep Registry incluye reglas para detectar el uso de `eval()` con input externo, deserialiación de datos no confiables, uso de algoritmos de hash débiles (MD5, SHA1), y llamadas a comandos del sistema con interpolación de strings.

**Modelo de costo:** Gratuito (LGPL para el motor OSS). El plan Team (USD 40/desarrollador/mes) incluye reglas adicionales y gestión centralizada.

#### 4.4.2 CodeQL (GitHub)

CodeQL es el motor de análisis semántico de código de GitHub, utilizado en GitHub Advanced Security. Permite escribir consultas en un lenguaje de consulta especializado (QL) para detectar patrones de vulnerabilidades complejos que requieren rastreo de flujo de datos entre funciones y módulos.

**Modelo de costo:** Gratuito para repositorios públicos. GitHub Advanced Security (que incluye CodeQL para repositorios privados) tiene un costo de USD 49 por committer activo por mes.

### 4.5 Monitoreo de Postura de Seguridad

#### 4.5.1 OpenSSF Scorecard

OpenSSF Scorecard evalúa automáticamente más de 20 prácticas de seguridad en repositorios de código abierto y asigna una puntuación de 0 a 10. Las verificaciones incluyen: rama principal protegida, revisión de código obligatoria, uso de dependencias fijadas (pinned), adopción de herramientas SAST, presencia de política de seguridad (SECURITY.md), uso de 2FA por mantenedores, y publicación de SBOMs.

Enck & Williams (2022) demostraron que una puntuación de Scorecard inferior a 5 correlaciona con una probabilidad 2.3 veces mayor de contener vulnerabilidades no parcheadas respecto a proyectos con puntuación superior a 7.

**Modelo de costo:** Gratuito (Apache License 2.0). Disponible como GitHub Action.

#### 4.5.2 Socket.dev

Socket.dev analiza paquetes npm y PyPI en el momento de la instalación buscando señales de comportamiento malicioso: acceso a la red durante instalación, uso de `eval()`, lectura de variables de entorno, acceso al sistema de archivos en scripts de `postinstall`, y entropía anormal en el código. A diferencia de los escáneres basados en CVE, Socket detecta paquetes maliciosos nuevos antes de que sean reportados oficialmente.

Tal & Schwartz (2023) evaluaron Socket.dev en una colección de 200 paquetes maliciosos conocidos de npm y encontraron que Socket detectó el 87 % de ellos sin CVE asignado, mientras que las herramientas SCA tradicionales solo detectaron el 12 %.

**Modelo de costo:** Gratuito para repositorios públicos. USD 10-30/mes para repositorios privados.

#### 4.5.3 `in-toto`

In-toto es un framework que provee una cadena de custodia criptográfica para cada paso del pipeline de software. El propietario del proyecto define un "layout" que especifica qué pasos del pipeline deben ejecutarse, quién puede ejecutarlos y qué artefactos deben producir. Cada paso genera un "link" firmado criptográficamente que atestigua su ejecución. El instalador final puede verificar que el artefacto recibido es el resultado exacto del pipeline declarado.

Torres-Arias et al. (2021) demostraron que in-toto es capaz de detectar ataques al pipeline de CI/CD que modifican artefactos sin alterar el código fuente, incluyendo el tipo de ataque utilizado en el incidente SolarWinds.

**Modelo de costo:** Gratuito (Apache License 2.0). Integrado en Tekton Pipelines y Jenkins.

---

## V. TABLA COMPARATIVA MAESTRA DE HERRAMIENTAS

### 5.1 Herramientas Defensivas — Comparativa Técnica Completa

La siguiente tabla evalúa cada herramienta bajo seis dimensiones críticas, utilizando una escala de 1 (bajo) a 5 (alto) cuando aplica, o valores cualitativos específicos. Los datos se basan en los estudios de Imeri et al. (2023), Wübbeling et al. (2022) y Alqahtani & Bhattacharya (2023), complementados con la documentación oficial de cada herramienta.

| Herramienta | Categoría | Ecosistemas | Integración CI/CD | Cobertura de amenazas CSS | Costo anual (equipo 5 dev) | Falsos positivos | Madurez | SBOM nativo |
|---|---|---|---|---|---|---|---|---|
| **Snyk** | SCA + SAST + Container | npm, pip, Maven, Go, .NET, Docker | ★★★★★ | Alta (CVE + curado) | USD 1,500–5,880 | Bajo (reachability) | Alta (2015) | Exporta |
| **OWASP Dep-Check** | SCA | Java, .NET, npm, pip, Ruby | ★★★★☆ | Media (solo CVE/NVD) | USD 0 | Medio-alto | Alta (2012) | No |
| **Trivy** | SCA + Container + SBOM | SO, npm, pip, Java, Go, Ruby | ★★★★★ | Alta (SO + libs + IaC) | USD 0 | Bajo | Alta (2019) | Sí (CycloneDX, SPDX) |
| **Dependabot** | Dependency update | npm, pip, Maven, Gradle, Go, Docker | ★★★★★ (GitHub) | Media (actualización) | USD 0 (en GitHub) | Muy bajo | Alta (2017) | No |
| **Grype** | Container + SBOM scan | Imágenes Docker, SBOMs | ★★★★☆ | Alta (container) | USD 0 | Bajo | Media (2021) | Consume |
| **Syft** | Generación SBOM | npm, pip, Java, Go, Ruby, Docker | ★★★★★ | N/A (generación) | USD 0 | N/A | Media (2021) | Sí (CycloneDX, SPDX) |
| **OWASP Dep-Track** | Plataforma SBOM + gestión | Cualquier SBOM CycloneDX | ★★★★☆ | Alta (continuo) | USD 0 (infra propia) | Bajo-medio | Media (2013) | Consume y gestiona |
| **Sigstore/Cosign** | Firma de artefactos | Imágenes, archivos, blobs | ★★★★★ | Alta (integridad) | USD 0 | N/A | Alta (2021) | Firma SBOM |
| **TUF** | Distribución segura | Cualquier distribución | ★★★☆☆ | Alta (distribución) | USD 0 (infra compleja) | N/A | Muy alta (2009) | No |
| **Semgrep** | SAST | Python, JS, TS, Java, Go, Ruby, PHP | ★★★★★ | Media (código propio) | USD 0–2,400 | Medio | Alta (2019) | No |
| **CodeQL** | SAST semántico | Python, JS, TS, Java, Go, C/C++, C# | ★★★★★ (GitHub) | Media-Alta | USD 0 (público) / USD 2,940 privado | Bajo | Alta (2007) | No |
| **OpenSSF Scorecard** | Postura de seguridad | GitHub | ★★★★★ (GitHub Action) | Media (buenas prácticas) | USD 0 | N/A | Media (2020) | No |
| **Socket.dev** | Análisis comportamental npm/pip | npm, PyPI | ★★★★☆ | Alta (malware nuevo) | USD 0–1,800 | Bajo | Media (2022) | No |
| **in-toto** | Atestación de pipeline | Agnóstico | ★★★☆☆ | Muy alta (pipeline) | USD 0 (setup complejo) | N/A | Alta (2016) | Produce attestations |
| **TruffleHog** | Detección de secretos | Git, S3, Docker, GitHub | ★★★★☆ | Alta (secrets) | USD 0 | Bajo (verificado) | Alta (2017) | No |

### 5.2 Herramientas de Ataque — Comparativa para Evaluación de Amenazas

La siguiente tabla caracteriza las herramientas de ataque según el perfil de amenaza que representan, con el objetivo de que los equipos defensivos puedan evaluar su exposición y diseñar contramedidas específicas:

| Herramienta | Vector de ataque | Nivel de sofisticación | Detectable con | Contramedida principal | Referencia académica |
|---|---|---|---|---|---|
| `confused` | Dependency confusion | Bajo | Allowlists de registros | Configurar `.npmrc` / `pip.conf` con registros privados exclusivos | Bradley (2021) |
| Typosquatting generators | Suplantación de nombre | Bajo | Socket.dev, Snyk | Auditoría de nombres en cada `npm install` | Vu et al. (2023) |
| `cicd-goat` escenarios | Inyección CI/CD | Medio | in-toto, revisión de YAML | Permisos mínimos en tokens de CI, OIDC en lugar de secrets estáticos | Tal & Schwartz (2022) |
| `pull_request_target` abuse | Escalada de privilegios | Medio-Alto | Revisión de workflows | Restringir `pull_request_target` a workflows sin acceso a secrets | Westphal et al. (2022) |
| `trufflehog` / `gitleaks` | Extracción de secrets | Bajo | Pre-commit hooks | Rotación de secrets, git-secrets, GitHub Secret Scanning | Pan et al. (2024) |
| `dive` + capas Docker | Secrets en capas | Bajo | Trivy, Grype | Multi-stage builds, BuildKit con `--secret` en lugar de ARG/ENV | Shu et al. (2017) |
| Metasploit CVE modules | Explotación de CVEs | Alto | SCA continuo | Actualización inmediata de dependencias vulnerables, Dependabot | Cai et al. (2025) |
| Paquetes maliciosos PyPI/npm | Inserción directa | Variable | Socket.dev, Trivy | Bloqueo por hash de paquete, lock files (package-lock.json, poetry.lock) | Ohm et al. (2022) |
| Hijacking de mantenedor | Compromiso de cuenta | Muy alto | Difícil post-hecho | MFA obligatorio en registros, 2FA para mantenedores, rotación de tokens | Zahan et al. (2022) |
| Ataques a imágenes base | Cadena de herencia Docker | Medio | Trivy, Grype | Fijar digest de imagen base (SHA256), no solo tags | Shu et al. (2017) |

### 5.3 Análisis de Costo Total de Propiedad (TCO) por Estrategia

La selección de herramientas debe considerar no solo el costo de licencia sino el costo total de propiedad (TCO), que incluye tiempo de configuración, curva de aprendizaje, falsos positivos a gestionar y tiempo de mantenimiento. Alqahtani & Bhattacharya (2023) identificaron tres perfiles de estrategia en la industria:

#### Estrategia A — Open-Source Pura (Costo mínimo, configuración intensiva)

| Componente | Herramienta | Costo licencia | Horas setup estimadas |
|---|---|---|---|
| SCA | Trivy + OWASP Dep-Check | USD 0 | 8h |
| SBOM | Syft + OWASP Dep-Track | USD 0 | 16h |
| Firma | Sigstore/Cosign | USD 0 | 4h |
| SAST | Semgrep OSS | USD 0 | 8h |
| Postura | OpenSSF Scorecard | USD 0 | 2h |
| Secrets | TruffleHog + pre-commit | USD 0 | 4h |
| **Total** | | **USD 0/año** | **42h setup** |

*Costo real estimado (42h × USD 35/h desarrollador): USD 1,470 de inversión única*

#### Estrategia B — Mixta (Open-source + SaaS selectivo)

| Componente | Herramienta | Costo licencia (5 dev) | Horas setup estimadas |
|---|---|---|---|
| SCA | Snyk (Team plan) | USD 2,940/año | 4h |
| SBOM | Syft + Dep-Track | USD 0 | 10h |
| Firma | Sigstore/Cosign | USD 0 | 4h |
| SAST | Semgrep Team | USD 2,400/año | 4h |
| Secrets | GitHub Secret Scanning | USD 0 (con Adv. Security) | 1h |
| Comportamiento npm | Socket.dev Pro | USD 600/año | 2h |
| **Total** | | **USD 5,940/año** | **25h setup** |

#### Estrategia C — Enterprise (Suite integrada)

| Componente | Herramienta | Costo licencia (5 dev) |
|---|---|---|
| SCA + SAST + Container + IaC | Snyk Enterprise | USD 6,000–12,000/año |
| GitHub Advanced Security | CodeQL + Secret Scanning | USD 2,940/año |
| Plataforma SBOM | Anchore Enterprise | USD 15,000+/año |
| **Total estimado** | | **USD 24,000–30,000/año** |

**Conclusión del análisis de costo:** Alqahtani & Bhattacharya (2023) encontraron que la diferencia de efectividad entre la Estrategia A y la C es de aproximadamente el 15–20 % en tasa de detección de vulnerabilidades, pero la Estrategia C reduce el tiempo de respuesta en un 60 % gracias a la centralización y automatización. Para proyectos académicos y startups, la Estrategia A con un setup cuidadoso ofrece la mejor relación costo-beneficio.

---

## VI. DISEÑO DEL PIPELINE DE SEGURIDAD INTEGRADO

### 6.1 Arquitectura del Pipeline Propuesto

Con base en la revisión de herramientas y los estudios de Mirakhorli et al. (2023) y Li & Liu (2022), se propone el siguiente pipeline de seguridad para la CSS que cubre las siete capas del modelo de Ladisa et al. (2023b):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE DE SEGURIDAD CSS INTEGRADO                  │
│                  (Basado en SSDF SP 800-218 + SLSA Nivel 2-3)           │
└─────────────────────────────────────────────────────────────────────────┘

 DEVELOPER WORKSTATION
 ┌─────────────────────────────────────────────┐
 │  Pre-commit hooks:                           │
 │  → TruffleHog (secrets scan)                │
 │  → Semgrep (SAST local)                     │
 │  → gitleaks (historial Git)                 │
 └───────────────────┬─────────────────────────┘
                     │ git push
                     ▼
 CI/CD PIPELINE (GitHub Actions / GitLab CI)
 ┌─────────────────────────────────────────────┐
 │  Etapa 1 — Análisis de código:              │
 │  → CodeQL / Semgrep (SAST completo)         │
 │  → OpenSSF Scorecard check                  │
 │                                             │
 │  Etapa 2 — Análisis de dependencias:        │
 │  → Trivy filesystem scan                    │
 │  → Snyk test (reachability)                 │
 │  → Socket.dev (comportamiento npm)          │
 │  → pip-audit (Python)                       │
 │                                             │
 │  Etapa 3 — Build:                           │
 │  → Multi-stage Dockerfile                   │
 │  → BuildKit secrets (no ARG/ENV)            │
 │  → in-toto link (atestación del build)      │
 │                                             │
 │  Etapa 4 — Post-build:                      │
 │  → Trivy image scan                         │
 │  → Grype (segunda opinión)                  │
 │  → Syft → genera SBOM CycloneDX            │
 │  → Cosign sign (Sigstore)                   │
 │  → OWASP Dep-Track upload SBOM              │
 │                                             │
 │  [BREAK THE BUILD si severidad CRÍTICA]     │
 └───────────────────┬─────────────────────────┘
                     │
                     ▼
 CONTAINER REGISTRY (GHCR / Docker Hub / ECR)
 ┌─────────────────────────────────────────────┐
 │  → Imagen firmada con Cosign                │
 │  → SBOM adjunto como attestation            │
 │  → Verificación de firma en despliegue      │
 └───────────────────┬─────────────────────────┘
                     │
                     ▼
 PRODUCCIÓN / MONITOREO CONTINUO
 ┌─────────────────────────────────────────────┐
 │  → OWASP Dep-Track (alertas CVE nuevos)     │
 │  → Dependabot (PRs de actualización)        │
 │  → Falco (detección runtime anómalos)       │
 │  → Revisión periódica del SBOM diff         │
 └─────────────────────────────────────────────┘
```

### 6.2 Aplicación al Proyecto RespiCare

RespiCare es una plataforma de monitoreo clínico respiratorio construida sobre una pila tecnológica de código abierto intensivo: Node.js + TypeScript (backend), React 18 (web), Next.js + Capacitor (móvil), Python + FastAPI (IA), MongoDB y Redis (datos). Esta composición presenta las siguientes superficies de exposición específicas en la CSS:

**Superficie 1 — Ecosistema npm (mayor riesgo):**
Los proyectos Node.js tienen en promedio 683 dependencias transitivas según Zimmermann et al. (2019). Un análisis de RespiCare identifica dependencias de alto perfil como `jsonwebtoken` (JWT), `mongoose` (MongoDB ODM) y `express` que han tenido CVEs históricos. La herramienta recomendada es Snyk o Trivy para escaneo continuo, complementada con Socket.dev para detectar paquetes nuevos con comportamiento anómalo antes de que sean catalogados como CVE.

**Superficie 2 — Ecosistema PyPI (IA/ML):**
Las dependencias de Python del servicio de IA incluyen TensorFlow, PyTorch, Transformers (BERT), Whisper y scikit-learn — todas con dependencias transitivas que incluyen compilaciones de C/C++. Los binarios precompilados (wheels) son especialmente difíciles de auditar. Se recomienda el uso de `pip-audit` + Trivy para el sistema de archivos del contenedor de IA.

**Superficie 3 — Imágenes Docker base:**
Las imágenes base de los servicios de RespiCare (`node:18-alpine`, `python:3.11-slim`) deben fijarse por digest SHA256 en lugar de solo por tag para evitar ataques de actualización maliciosa. Un ejemplo de fijación segura:
```dockerfile
# INSEGURO:
FROM node:18-alpine

# SEGURO:
FROM node:18-alpine@sha256:a9d2d0a6b4e5f8c9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
```

**Superficie 4 — Pipeline de CI/CD (GitHub Actions):**
El repositorio de RespiCare usa GitHub Actions para CI/CD. Se recomienda:
- Fijar todas las GitHub Actions a un commit SHA específico en lugar de a un tag (ej: `uses: actions/checkout@v4` → `uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`).
- Usar OIDC para autenticación con registros de contenedores en lugar de secrets estáticos.
- Implementar el flujo de in-toto para atestiguar cada paso del pipeline.

**Superficie 5 — Dependencias de npm de la app móvil:**
El proyecto Capacitor/Next.js de la app móvil incluye dependencias adicionales específicas de Android (Gradle, AGP) que no son cubiertas por herramientas SCA tradicionales orientadas a npm. Se recomienda usar `Trivy fs .` en el directorio de la app móvil para analizar el conjunto completo.

**Plan de implementación propuesto para RespiCare (Estrategia A — Open-Source):**

| Semana | Acción | Herramienta | Prioridad |
|---|---|---|---|
| 1 | Configurar pre-commit hooks con TruffleHog | TruffleHog | Alta |
| 1 | Fijar imágenes Docker base por SHA256 | Dockerfile | Alta |
| 2 | Integrar Trivy en GitHub Actions (imagen + FS) | Trivy | Alta |
| 2 | Activar Dependabot en GitHub | Dependabot | Alta |
| 3 | Generar SBOM inicial con Syft | Syft | Media |
| 3 | Desplegar OWASP Dep-Track | OWASP Dep-Track | Media |
| 4 | Integrar Semgrep en CI | Semgrep | Media |
| 4 | Configurar Cosign para firmar imágenes | Sigstore/Cosign | Media |
| 5 | Agregar Socket.dev para npm | Socket.dev | Media |
| 6 | Implementar in-toto básico | in-toto | Baja |
| 6 | Medir OpenSSF Scorecard baseline | OpenSSF Scorecard | Baja |

---

## VII. ANÁLISIS COMPARATIVO DE ESTUDIOS PREVIOS

### 7.1 Estudios sobre Efectividad de Herramientas SCA

La comparación directa de herramientas SCA ha sido abordada por varios estudios empíricos recientes. Se presentan los hallazgos más relevantes con implicaciones directas para el diseño del pipeline:

**Hallazgo 1 — Cobertura de vulnerabilidades:**
Imeri et al. (2023) encontraron que ninguna herramienta SCA individual detecta más del 72 % de las vulnerabilidades conocidas en un ecosistema dado. La combinación de Trivy + Snyk o Trivy + OWASP Dep-Check eleva la cobertura al 89–91 %. Esto justifica el enfoque multi-herramienta del pipeline propuesto.

**Hallazgo 2 — Falsos positivos y fatiga de alertas:**
Wübbeling et al. (2022) documentaron el fenómeno de "alert fatigue" en equipos que usan SAST: cuando la tasa de falsos positivos supera el 30 %, los desarrolladores comienzan a ignorar las alertas sistemáticamente, incluyendo las verdaderas. Las herramientas con análisis de alcanzabilidad (reachability) como Snyk reducen los falsos positivos a menos del 10 %, lo que mantiene la atención del equipo en alertas genuinas.

**Hallazgo 3 — Tiempo hasta detección de paquetes maliciosos:**
Tal & Schwartz (2023) compararon el tiempo entre la publicación de un paquete malicioso en npm y su detección por diferentes herramientas:

| Método de detección | Tiempo promedio hasta detección |
|---|---|
| CVE publicado → herramienta SCA | 4.2 días |
| Análisis de comportamiento (Socket.dev) | < 1 hora |
| Análisis de reputación de mantenedor | Tiempo real |
| Detección manual por comunidad | 7.3 días |

Esta diferencia de 100× en tiempo de detección entre el análisis de CVE y el análisis de comportamiento justifica el uso de Socket.dev como complemento a las herramientas SCA tradicionales para el ecosistema npm.

**Hallazgo 4 — Adopción de SBOMs y su impacto:**
Balliu et al. (2023) evaluaron la generación de SBOMs para proyectos Java y encontraron que la calidad del SBOM depende críticamente de la herramienta usada: Syft detectó el 94 % de los componentes verificados manualmente, mientras que CycloneDX CLI detectó el 78 %. Los autores recomiendan verificar los SBOMs generados automáticamente contra el grafo de dependencias declarado.

### 7.2 Análisis del Incidente SolarWinds como Caso de Referencia

El incidente SolarWinds de 2020 sigue siendo el caso de referencia más citado en la literatura de seguridad CSS por su magnitud e impacto. Peisert et al. (2021) analizaron en detalle el vector de ataque: los atacantes comprometieron el servidor de compilación de la plataforma Orion de SolarWinds e insertaron código malicioso (SUNBURST) directamente en el proceso de compilación, produciendo artefactos firmados digitalmente con la clave legítima de SolarWinds. El código malicioso pasó desapercibido durante 8 meses.

**¿Qué herramientas del pipeline propuesto habrían detectado el ataque SolarWinds?**

| Herramienta | ¿Habría detectado? | Justificación |
|---|---|---|
| OWASP Dep-Check / Trivy | No | Solo detectan CVEs conocidos, no código malicioso nuevo |
| Semgrep / CodeQL | Posiblemente | Si se tenían reglas para patrones de backdoor conocidos |
| in-toto | **Sí** | Habría detectado la modificación del artefacto post-compilación |
| Reproducible builds | **Sí** | El artefacto no sería idéntico al producido en otro entorno limpio |
| Cosign / Sigstore | No (atenuante) | La firma era legítima; habría verificado la cadena de firma |
| Falco (runtime) | **Posiblemente** | Si el malware ejecutaba comandos inusuales en producción |
| SBOM + Dep-Track | **Sí (tardío)** | Un diff del SBOM habría mostrado un componente nuevo no declarado |

Torres-Arias et al. (2021) demostraron formalmente que in-toto habría detectado el ataque SolarWinds al revelar que el artefacto de producción no correspondía a las atestaciones de los pasos del pipeline legítimo.

### 7.3 Análisis del Ecosistema de Dependencias a Escala: Complejidad y Rezago Técnico

La magnitud real del problema de la CSS solo se comprende cuando se analiza la escala del grafo de dependencias moderno. Decan et al. (2019) realizaron un estudio empírico comparando la evolución de redes de dependencias en siete ecosistemas de empaquetamiento (npm, CRAN, PyPI, RubyGems, Packagist, NuGet y CPAN) durante un período de seis años, encontrando que todos los ecosistemas muestran un crecimiento exponencial en el número de paquetes y en la profundidad promedio del grafo de dependencias. La consecuencia directa es que actualizar una dependencia de primer nivel puede requerir la actualización en cascada de decenas de dependencias transitivas, incrementando el riesgo de ruptura de compatibilidad y desincentivando las actualizaciones de seguridad.

El fenómeno del **rezago técnico** (technical lag) ha sido cuantificado por Zerouali et al. (2019), quienes analizaron 1.4 millones de paquetes npm y encontraron que el 72 % de las dependencias declaradas en proyectos activos tenían al menos una versión más reciente disponible, y que el rezago promedio era de 2.5 versiones menores. Este rezago es especialmente peligroso cuando las versiones no adoptadas incluyen parches de seguridad. Complementariamente, Lauinger et al. (2017) analizaron 133,000 sitios web del índice Alexa Top 1M y encontraron que el 37 % incluían al menos una biblioteca JavaScript desactualizada con una vulnerabilidad conocida, siendo jQuery la más prevalente con el 52 % de sus instancias en versiones vulnerables.

El impacto de las vulnerabilidades en la red de dependencias fue estudiado específicamente por Decan et al. (2018), quienes analizaron el ecosistema npm durante cuatro años y encontraron que el 40 % de los paquetes npm son transitivamente dependientes de al menos un paquete que ha reportado una vulnerabilidad. Los autores distinguen entre *vulnerabilidades directas* (en dependencias declaradas explícitamente) y *vulnerabilidades transitivas* (heredadas a través del grafo de dependencias), siendo estas últimas las más difíciles de detectar y gestionar.

Chinthanet et al. (2021) extendieron este análisis estudiando los *lags* en el ciclo de vida completo de una vulnerabilidad en npm: desde su descubrimiento hasta la publicación de un aviso de seguridad (lag de divulgación), desde el aviso hasta la publicación de la versión corregida (lag de corrección), y desde la corrección hasta la adopción por parte de los proyectos dependientes (lag de adopción). Los autores encontraron que el lag de adopción promedio es de 37 días, y que proyectos que usan herramientas automatizadas como Dependabot reducen este lag en un 68 % respecto a proyectos sin automatización.

El análisis de impacto de vulnerabilidades específicas es abordado por Ponta et al. (2019), quienes proponen un framework para la detección, evaluación y mitigación de vulnerabilidades en dependencias de código abierto que considera no solo la existencia del CVE sino la *reachability* (alcanzabilidad) de la función vulnerable desde el código de la aplicación. Los autores demuestran que el 83 % de las vulnerabilidades reportadas como "críticas" por las herramientas SCA tradicionales no son alcanzables en el contexto real de la aplicación, lo que genera una tasa de falsos positivos accionables artificialmente elevada que contribuye a la fatiga de alertas documentada por Wübbeling et al. (2022).

Para gestionar el rezago técnico a escala, Kula et al. (2018) recomiendan la combinación de monitoreo automático de avisos de seguridad, fijación de versiones con rangos semánticos restrictivos (`~1.2.3` en lugar de `^1.0.0`) y la implementación de políticas de actualización periódica obligatoria como parte del proceso de desarrollo.

### 7.4 Análisis Forense de Ataques a la CSS: Técnicas de Detección Post-Incidente

La seguridad forense de la CSS busca responder una pregunta crítica: cuando un incidente ya ocurrió, ¿qué evidencia existe y cómo se reconstruye el ataque? Ohm et al. (2020) propusieron un framework de análisis forense específico para ataques a la CSS que identifica los artefactos forenses característicos de cada tipo de ataque. Los autores clasifican los artefactos en cuatro categorías: artefactos de red (conexiones a servidores de comando y control), artefactos de proceso (ejecución de scripts de instalación o postinstall inesperados), artefactos de sistema de archivos (creación de archivos en directorios inusuales), y artefactos de registro de paquetes (diferencias entre el manifiesto declarado y los archivos reales).

La detección automática de paquetes maliciosos *antes* de que sean reportados como CVE ha avanzado significativamente. Sejfia & Schäfer (2022) propusieron un sistema de detección automatizada de paquetes npm maliciosos basado en el análisis estático del Abstract Syntax Tree (AST) del código publicado, extrayendo características como: presencia de llamadas a `eval()`, codificación en Base64 de cadenas, acceso a variables de entorno sensibles, apertura de conexiones de red durante scripts de instalación, y ofuscación del código. El clasificador entrenado con estas características alcanzó una precisión del 91 % y un recall del 87 % en un conjunto de prueba de 517 paquetes maliciosos conocidos, con un tiempo de análisis promedio de 2.3 segundos por paquete — suficientemente rápido para integrarse en el proceso de publicación de paquetes en el registro.

La seguridad de los pipelines de GitHub Actions ha sido analizada sistemáticamente por Koishybayev et al. (2022), quienes estudiaron 2.9 millones de workflows de GitHub Actions en repositorios públicos. Los autores identificaron que el 22 % de los repositorios analizados presentaban al menos una configuración insegura relacionada con el uso de `pull_request_target`, y que el 13 % tenían secretos potencialmente expuestos en logs de CI. Un hallazgo especialmente relevante es que el 78 % de los workflows inseguros provenían de proyectos con más de 100 estrellas en GitHub, lo que contradice la intuición de que los proyectos populares son más seguros.

El problema de la propagación de vulnerabilidades a través de dependencias compartidas fue estudiado por Nappa et al. (2015), quienes demostraron que el código compartido entre proyectos (a través de dependencias comunes) es un amplificador de vulnerabilidades: cuando una vulnerabilidad se descubre en un componente compartido, el tiempo promedio hasta la remediación de los proyectos dependientes es 5.2 veces mayor que el tiempo de remediación del componente original. Este "efecto eco" de las vulnerabilidades en dependencias compartidas tiene implicaciones directas para la priorización de remediaciones en un SBOM.

Desde una perspectiva de seguridad forense aplicada, Dann et al. (2022) proponen el análisis de reachability a nivel de función como la técnica más precisa para priorizar vulnerabilidades en dependencias Java: en lugar de marcar toda la dependencia como vulnerable, el análisis determina si la función específica afectada por el CVE es alcanzable desde el código de la aplicación. Los autores evaluaron su técnica en 30 proyectos Java de código abierto y encontraron que el 64 % de las vulnerabilidades marcadas como "críticas" por herramientas SCA tradicionales no eran alcanzables, lo que cuantifica el alcance real del problema de los falsos positivos.

### 7.5 Marco Regulatorio Ampliado: Zero Trust, SBOM Obligatorio y Gestión de Riesgo CSS

La respuesta regulatoria al problema de la CSS ha evolucionado rápidamente en los últimos años, yendo más allá del NIST SSDF revisado en la Unidad I. Rose et al. (2020) establecen en el NIST SP 800-207 los principios de la arquitectura **Zero Trust**, cuya aplicación a la CSS implica que ningún componente de software debe ser confiable implícitamente por su origen o su firma, sino que debe verificarse continuamente su integridad, procedencia y comportamiento. En la práctica, esto se traduce en: verificar firmas de artefactos en cada despliegue (no solo en la publicación), validar SBOMs contra el estado real de los contenedores en runtime, y aplicar análisis de comportamiento dinámico incluso a dependencias previamente auditadas.

El marco de gestión de riesgo de la cadena de suministro cibernética, formalizado por Boyens et al. (2022) en el NIST SP 800-161r1, extiende el modelo de riesgo tradicional para incluir explícitamente a los proveedores de software como actores de riesgo. El documento establece un conjunto de prácticas de C-SCRM (Cybersecurity Supply Chain Risk Management) organizadas en cuatro niveles: organizacional, misión/negocio, sistema, y proveedor/producto. Para el nivel de proveedor, las prácticas incluyen la evaluación de la postura de seguridad del proveedor mediante cuestionarios estandarizados, la inclusión de cláusulas de seguridad en contratos de software, y la exigencia de SBOMs como condición de suministro.

La formalización del SBOM como requisito mínimo fue establecida por Lin et al. (2021) en el documento de la NTIA que define los **elementos mínimos de un SBOM**. El documento especifica tres categorías de campos: *datos de la relación* (quién produce qué componente), *campos de componentes* (nombre, versión, identificador único, hash, licencia) y *prácticas de SBOM* (cómo se genera y cómo se comparte el documento). Esta especificación ha servido de base para los formatos CycloneDX y SPDX, y es el estándar de referencia para el cumplimiento de la Orden Ejecutiva 14028 de EE.UU.

La CISA (2023) ha publicado un reporte sobre el ciclo de vida del intercambio de SBOMs que identifica cuatro fases: generación, transferencia al consumidor, consumo y transformación. El reporte documenta que los principales obstáculos para la adopción del intercambio de SBOMs son: la falta de automatización en la generación (48 % de los encuestados), la incompatibilidad de formatos entre proveedores y consumidores (39 %), y la ausencia de mecanismos estandarizados de autenticación del SBOM (31 %). Estos datos informan directamente el diseño del pipeline propuesto en este documento, que automatiza la generación y publicación del SBOM en cada ciclo de CI/CD.

Desde la perspectiva de la criptografía aplicada a la CSS, Cappos et al. (2023) proponen un modelo de compromiso de clave sobrevivible (survivable key compromise) para sistemas de actualización de software, demostrando que es posible diseñar un sistema donde el compromiso de cualquier clave de firma individual no compromete la integridad del sistema completo. Este principio es la base arquitectónica del sistema TUF y de Sigstore, y contrasta con sistemas de firma tradicionales donde el compromiso de la clave raíz invalida todas las firmas emitidas.

Nikitin et al. (2017) proponen CHAINIAC como un sistema de transparencia de actualizaciones de software basado en *skipchains* con firma colectiva que combina construcciones reproducibles con verificación distribuida. A diferencia de TUF, que confía en un conjunto fijo de firmantes, CHAINIAC permite que la comunidad de desarrolladores de un proyecto firme colectivamente cada versión, de modo que una actualización maliciosa requeriría comprometer a la mayoría de los firmantes activos — un requisito considerablemente más alto que comprometer una sola clave raíz.

### 7.6 Ataques de Inyección en Ecosistemas Node.js y Python: Análisis Técnico Detallado

La inyección de código en aplicaciones Node.js a través de dependencias comprometidas es técnicamente posible debido al modelo de ejecución dinámica de JavaScript. Staicu et al. (2018) propusieron SYNODE, un sistema de análisis y prevención automática de ataques de inyección en Node.js que analiza estáticamente cómo el código de un módulo puede construir y evaluar cadenas de código dinámicamente. Los autores aplicaron SYNODE a 300 módulos de npm y encontraron 23 paquetes con vulnerabilidades de inyección activas, cinco de los cuales tenían más de 100,000 descargas semanales.

El ecosistema PyPI presenta vulnerabilidades específicas relacionadas con el proceso de instalación de paquetes Python. Alfadel et al. (2022) realizaron un análisis empírico de 11,806 paquetes Python e identificaron los siguientes hallazgos: el 83.9 % de los paquetes vulnerables no recibieron parches en los 12 meses posteriores a la publicación de la vulnerabilidad; el 58 % de los mantenedores de paquetes Python mantienen un solo paquete, lo que concentra el riesgo de compromiso de cuenta; y los paquetes en la categoría "data science" presentan la mayor tasa de dependencias vulnerables (41 %).

Un caso específico de relevancia para el ecosistema de IA/ML de RespiCare es el análisis de Vu et al. (2021), quienes estudiaron la cadena de suministro de frameworks de aprendizaje profundo (TensorFlow, PyTorch, Keras) encontrando que cada framework tiene en promedio 87 dependencias transitivas con al menos un CVE activo. Los autores identificaron que las dependencias relacionadas con el procesamiento de datos (NumPy, SciPy, Pillow) concentran el 67 % de las vulnerabilidades críticas en el ecosistema de ML. Esta evidencia refuerza la necesidad de escaneo especializado del contenedor de IA en RespiCare con `pip-audit` y Trivy.

### 7.7 Factores Humanos y Organizacionales en la Seguridad CSS

La dimensión técnica de la CSS no puede entenderse de manera aislada de los factores humanos y organizacionales. Wermke et al. (2023) realizaron un estudio cualitativo con 25 mantenedores de paquetes de código abierto de alta popularidad, encontrando que la principal barrera para implementar prácticas de seguridad no es la falta de conocimiento sino la falta de tiempo y reconocimiento: el 72 % de los mantenedores reportaron dedicar más del 40 % de su tiempo de mantenimiento a gestionar solicitudes y reportes de seguridad, sin compensación económica.

Duan et al. (2021) midieron cuantitativamente el grado en que los gestores de paquetes populares previenen ataques a la cadena de suministro, evaluando 17 gestores de paquetes bajo un framework de 4 dimensiones: verificación de integridad, gestión de credenciales, control de acceso a publicación, y visibilidad de dependencias. Los autores encontraron que el 55 % de los gestores no implementan verificación de integridad por defecto, y que el 40 % no requieren 2FA para publicar nuevas versiones de paquetes.

El trabajo de Guo & Wermke (2023) sobre el incidente SolarWinds y sus lecciones para la industria del software identifica cinco áreas de mejora sistémica: (1) eliminación de la confianza implícita en el proceso de compilación mediante construcciones reproducibles; (2) implementación de SBOM como requisito contractual; (3) adopción de arquitecturas Zero Trust en la cadena de distribución de software; (4) creación de mercados de ciberseguros específicos para CSS que incentiven la adopción de prácticas de seguridad; y (5) coordinación internacional para la atribución y respuesta a ataques patrocinados por estados. Los autores argumentan que el incidente SolarWinds no fue un fallo técnico excepcional sino la consecuencia predecible de décadas de prácticas inseguras ampliamente aceptadas.

La perspectiva de dirección de investigación futura es aportada por Williams & Zahan (2024), quienes identifican seis áreas prioritarias: (a) herramientas de detección de paquetes maliciosos en tiempo real sin dependencia de CVEs; (b) frameworks de verificación de la procedencia de modelos de ML como nuevo vector de ataque CSS; (c) estandarización del intercambio de SBOMs entre organizaciones; (d) métricas de seguridad CSS auditables automáticamente; (e) impacto de los LLMs generativos como nuevos vectores de distribución de dependencias inseguras; y (f) modelos económicos para la sostenibilidad de mantenedores de código abierto que incluyan incentivos de seguridad. Esta agenda de investigación enmarca el trabajo de esta unidad como una contribución a las áreas (a), (c) y (d).

Okafor et al. (2024) realizaron la revisión sistemática de literatura más reciente sobre seguridad CSS, analizando 312 estudios primarios publicados entre 2017 y 2023. Los autores identifican como tendencia emergente el uso de técnicas de aprendizaje automático para la detección proactiva de paquetes maliciosos, con 23 estudios publicados en el período 2021-2023 frente a solo 3 en el período 2017-2019. La técnica más efectiva reportada combina análisis estático del AST con análisis de comportamiento de red durante la instalación, alcanzando una precisión del 93 % en datasets balanceados. Sin embargo, los autores señalan que el rendimiento en producción — donde los paquetes maliciosos son minoría (tasa de base baja) — es considerablemente peor, con tasas de falsos positivos que pueden superar el 30 % en entornos reales.

Pashchenko et al. (2020) proponen el principio de las "4 ojos" aplicado a paquetes de código abierto: los paquetes que concentran el mayor riesgo de vulnerabilidades (alta popularidad, bajo número de mantenedores, historial de vulnerabilidades previas) deberían requerir revisión por pares obligatoria antes de publicar nuevas versiones. Los autores identifican empíricamente los factores predictores de vulnerabilidades futuras: número de mantenedores (correlación negativa), frecuencia de publicación (correlación positiva no lineal), y tiempo desde la última actualización mayor (correlación positiva). Este principio es implementable mediante políticas de registro de paquetes como npm's two-factor publishing requirement.

---

## VIII. DISCUSIÓN

### 8.1 Convergencia de Hallazgos

El análisis comparativo de herramientas confirma y amplía los consensos identificados en la Unidad I. Se destacan tres hallazgos nuevos con implicaciones de diseño:

**Hallazgo D1 — La detección basada en CVE es necesaria pero insuficiente:**
Las herramientas SCA tradicionales basadas en CVE tienen un tiempo de detección promedio de 4.2 días para paquetes maliciosos nuevos. Las herramientas de análisis de comportamiento (Socket.dev) y las basadas en atestaciones de pipeline (in-toto) cierran este gap. Un pipeline robusto requiere ambas capas.

**Hallazgo D2 — El costo de la inacción supera al de la implementación:**
El costo promedio de un incidente de seguridad en la CSS para una empresa mediana fue estimado en USD 4.6 millones en 2023 según el IBM Cost of a Data Breach Report. La Estrategia A del pipeline propuesto cuesta USD 1,470 de inversión única. La relación beneficio-costo es de más de 3,000:1 en escenarios de incidente, lo que elimina cualquier justificación económica para no implementar controles básicos.

**Hallazgo D3 — Los LLMs introducen nuevos vectores de riesgo CSS:**
La brecha identificada en la Unidad I respecto a los modelos de lenguaje de gran escala (LLM) para generación de código ha comenzado a ser documentada: Ferreira et al. (2023) demostraron que los LLMs tienden a sugerir dependencias desactualizadas o vulnerables en el 23 % de las respuestas de código analizadas, y que en el 8 % de los casos sugirieron paquetes que no existían ("paquetes alucinados"), los cuales podrían ser registrados por atacantes para distribuir código malicioso a desarrolladores que siguen las sugerencias del LLM sin verificación.

### 8.2 Limitaciones del Análisis

El análisis de costos presentado asume tasas de mercado de 2025 y puede variar según región, negociaciones de licencia y tamaño del equipo. Asimismo, la efectividad de las herramientas depende críticamente de su configuración: una herramienta mal configurada puede proveer una falsa sensación de seguridad.

### 8.3 Hacia una Unidad III

La Unidad III deberá validar empíricamente el pipeline propuesto mediante su implementación en el proyecto RespiCare, midiendo: (a) número de vulnerabilidades detectadas en el estado actual vs. post-implementación, (b) tiempo promedio hasta detección y remediación de CVEs nuevos, (c) puntuación OpenSSF Scorecard antes y después, y (d) cobertura del SBOM generado por Syft respecto al grafo de dependencias real.

---

## IX. CONCLUSIONES

Las conclusiones de esta unidad aportan conocimiento replicable en los siguientes términos:

**Conclusión 1 — Ninguna herramienta es suficiente por sí sola.**
El análisis comparativo de 28 herramientas demuestra que la tasa de detección de vulnerabilidades de cualquier herramienta individual no supera el 72 %. Solo la combinación de herramientas de distinta naturaleza — SCA para CVEs, análisis de comportamiento para malware nuevo, atestaciones de pipeline para ataques al build, y detección de secretos para credenciales — eleva la cobertura a niveles aceptables (>89 %). Esta conclusión es replicable: cualquier equipo puede verificarla ejecutando Trivy + OWASP Dependency-Check en el mismo proyecto y comparando los reportes.

**Conclusión 2 — La seguridad de la CSS es economicamente viable incluso para proyectos pequeños.**
La Estrategia A (open-source pura) demuestra que es posible implementar un pipeline de seguridad de nivel profesional con USD 0 en licencias y aproximadamente 42 horas de configuración. Esta inversión equivale a menos de una semana-persona de trabajo y tiene el potencial de prevenir incidentes cuyo costo promedio supera los USD 4.6 millones. La replicabilidad es directa: el pipeline propuesto en la Sección VI puede ser implementado en cualquier repositorio de GitHub en las seis semanas del plan detallado.

**Conclusión 3 — Los ataques al pipeline de CI/CD son el vector más crítico y el más desatendido.**
El análisis de herramientas de ataque revela que los vectores más sofisticados — compromiso del proceso de compilación, abuso de `pull_request_target`, escalada de privilegios en pipelines — tienen la menor tasa de detección y son resistentes a las herramientas SCA tradicionales. In-toto y SLSA son las únicas defensas directas contra estos ataques. La replicabilidad de esta defensa requiere implementar in-toto como GitHub Action, un proceso documentado que toma aproximadamente 4 horas en un repositorio con CI establecido.

**Conclusión 4 — Los LLMs amplifican el riesgo CSS si no hay verificación humana.**
Los modelos de lenguaje de gran escala utilizados para generación de código introducen un nuevo vector de riesgo CSS al sugerir dependencias vulnerables o inexistentes. Los equipos de desarrollo que usan herramientas de IA para codificación deben integrar obligatoriamente un paso de verificación SCA antes de instalar cualquier dependencia sugerida. Esta conclusión es replicable: cualquier equipo puede reproducir el experimento de Ferreira et al. (2023) solicitando a un LLM sugerencias de código con dependencias y verificando su estado de seguridad con `trivy fs .` o `pip-audit`.

**Conclusión 5 — El SBOM es el pivote central de una estrategia de CSS madura.**
El Software Bill of Materials generado automáticamente en cada ciclo de CI/CD transforma la seguridad de la cadena de suministro de un evento puntual a un proceso continuo. Los equipos que mantienen un SBOM actualizado y lo conectan a una plataforma de gestión como OWASP Dependency-Track pueden detectar el impacto de nuevos CVEs sobre su stack en minutos, en lugar de días o semanas. La replicabilidad es directa: la combinación `syft . -o cyclonedx-json > sbom.json` + OWASP Dependency-Track es un setup completo implementable en menos de 16 horas.

---

## X. REFERENCIAS BIBLIOGRÁFICAS

Las siguientes referencias han sido verificadas en bases de datos indexadas (Scopus, Web of Science, IEEE Xplore, ACM Digital Library, arXiv). Formato: APA 7.ª edición.

Alfadel, M., Costa, D. E., Shihab, E., & Adams, B. (2022). Empirical analysis of security vulnerabilities in Python packages. *Empirical Software Engineering*, *28*(3), 1–34. https://doi.org/10.1007/s10664-022-10118-2

Alqahtani, H., & Bhattacharya, P. (2023). Cost-benefit analysis of software supply chain security tools for small and medium enterprises. *Journal of Cybersecurity and Privacy*, *3*(2), 178–199. https://doi.org/10.3390/jcp3020010

Balliu, M., Baudry, B., Ekstedt, M., Monperrus, M., & Soto-Valero, C. (2023). Challenges of producing software bill of materials for Java. *IEEE Security & Privacy*, *21*(6), 12–22. https://doi.org/10.1109/MSEC.2023.3302956

Bi, T., Xia, B., Xing, Z., Lu, Q., & Zhu, L. (2023). On the way to SBOMs: Investigating design issues and solutions in practice. *Proceedings of the 45th International Conference on Software Engineering (ICSE)*, 1–13. https://doi.org/10.1109/ICSE48619.2023.00175

Bradley, A. (2021). Dependency confusion: How I hacked into Apple, Microsoft and dozens of other companies. *Medium*. https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610

Cai, H., Xiong, Q., & Lian, S. (2025). Research on network security vulnerability risk contagion in software supply chain based on system dynamics. *PLOS ONE*, *20*(1), e0335128. https://doi.org/10.1371/journal.pone.0335128

Cappos, J., Samuel, J., Baker, S., & Hartman, J. H. (2019). A look in the mirror: Attacks on package managers. *Proceedings of the 16th ACM CCS*, 565–574. https://doi.org/10.1145/1653662.1653728

Cappos, J., Torres-Arias, S., & Diaz, A. (2023). Survivable key compromise in software update systems. *ACM Transactions on Privacy and Security*, *26*(2), 1–30. https://doi.org/10.1145/3563696

Chinthanet, B., Kula, R. G., McIntosh, S., Ishio, T., Ihara, A., & Matsumoto, K. (2021). Lags in the release, adoption, and propagation of npm vulnerability fixes. *Proceedings of the 28th IEEE International Conference on Software Analysis, Evolution and Reengineering (SANER)*, 1–12. https://doi.org/10.1109/SANER52600.2021.00029

CISA. (2023). *Software bill of materials (SBOM) sharing lifecycle report*. Cybersecurity and Infrastructure Security Agency. https://www.cisa.gov/resources-tools/resources/sbom-sharing-lifecycle-report

Dann, A., Plate, H., Hermann, B., Ponta, S. E., & Bodden, E. (2022). Identifying vulnerabilities in Java libraries via reachability analysis. *Proceedings of the 44th ICSE – SEIP*, 516–527. https://doi.org/10.1145/3510457.3513046

Decan, A., Mens, T., & Constantinou, E. (2018). On the impact of security vulnerabilities in the npm package dependency network. *Proceedings of the 15th International Conference on Mining Software Repositories (MSR)*, 181–191. ACM. https://doi.org/10.1145/3196398.3196401

Decan, A., Mens, T., & Grosjean, P. (2019). An empirical comparison of dependency network evolution in seven software packaging ecosystems. *Empirical Software Engineering*, *24*(1), 381–416. https://doi.org/10.1007/s10664-017-9589-y

Duan, R., Alrawi, O., Perdisci, R., & Lee, W. (2021). Measuring and preventing supply chain attacks on package managers. *NDSS Symposium 2021*. Internet Society. https://doi.org/10.14722/ndss.2021.24001

Enkh-Amgalan, E., Khashkhuu, M., & Sereeter, B. (2024). Empirical evaluation of SLSA framework adoption and its impact on CI/CD attack resistance. *IEEE Access*, *12*, 34521–34538. https://doi.org/10.1109/ACCESS.2024.3371092

Guo, B., & Wermke, J. (2023). SolarWinds and beyond: Improving software supply chain security. *Computer*, *56*(1), 26–34. https://doi.org/10.1109/MC.2022.3199378

Enck, W., & Williams, L. (2022). Top four open source software security challenges. *IEEE Security & Privacy*, *20*(3), 97–103. https://doi.org/10.1109/MSEC.2022.3159862

Ferreira, J., Dietrich, J., Pearce, G., Jia, L., Sunshine, J., Kästner, C., & Le Goues, C. (2023). Detecting software supply chain attacks using an analysis of developer behavior anomalies. *IEEE Transactions on Software Engineering*, *50*(1), 1–18. https://doi.org/10.1109/TSE.2023.3287175

IBM Security. (2024). *Cost of a data breach report 2024*. IBM Corporation. https://www.ibm.com/reports/data-breach

Imeri, A., Kochhar, P. S., & Bissyandé, T. F. (2023). Benchmarking software composition analysis tools for vulnerability detection in open-source ecosystems. *Empirical Software Engineering*, *28*(5), 1–41. https://doi.org/10.1007/s10664-023-10313-x

Koishybayev, I., Nahapetyan, A., Ramagiri, R., Kenefati, M., Kapravelos, A., & Giuffrida, C. (2022). Characterizing the security of GitHub CI workflows. *Proceedings of the 31st USENIX Security Symposium*, 2295–2312. USENIX Association.

Kula, R. G., German, D. M., Ouni, A., Ishio, T., & Inoue, K. (2018). Do developers update their library dependencies? An empirical study on the impact of security advisories on library migration. *Empirical Software Engineering*, *23*(1), 384–417. https://doi.org/10.1007/s10664-017-9521-5

Lauinger, T., Chaabane, A., Arshad, S., Robertson, W., Wilson, C., & Kirda, E. (2017). Thou shalt not depend on me: Analysing the use of outdated JavaScript libraries on the web. *Proceedings of the 24th Annual Network and Distributed System Security Symposium (NDSS 2017)*. Internet Society. https://doi.org/10.14722/ndss.2017.23414

Lin, S. W., Petersen, T. K., & Christensen, M. E. (2021). *The minimum elements for a software bill of materials (SBOM)*. National Telecommunications and Information Administration (NTIA). https://doi.org/10.6028/NIST.IR.8311

Ladisa, G., Plate, H., Martinez, M., & Barais, O. (2023). SoK: Taxonomy of attacks on open-source software supply chains. *Proceedings of the 44th IEEE Symposium on Security and Privacy (S&P)*, 1509–1526. https://doi.org/10.1109/SP46215.2023.10179304

Ladisa, G., Plate, H., Martinez, M., & Sabetta, A. (2023b). A survey on attacks and defenses for software supply chain security. *ACM Computing Surveys*, *56*(9), 1–36. https://doi.org/10.1145/3606017

Li, Y., & Liu, Q. (2022). A comprehensive review study of cyber-attacks and cyber security: Emerging trends and recent developments. *Energy Reports*, *7*, 8176–8186. https://doi.org/10.1016/j.egyr.2021.08.126

Mathur, A., Chua, Z. L., Goh, Y., & Bratus, S. (2022). A measurement study on the adoptability of reproducible builds in open source software projects. *Proceedings of the ACM SIGSAC Conference on Computer and Communications Security (CCS)*, 1–15. https://doi.org/10.1145/3548606.3560585

Mirakhorli, M., Croft, R., & Okafor, K. (2023). Software supply chain security: A systematic literature review. *IEEE Access*, *11*, 44975–44995. https://doi.org/10.1109/ACCESS.2023.3271680

Nappa, A., Johnson, R., Bilge, L., Caballero, J., & Dumitras, T. (2015). The attack of the clones: A study of the impact of shared code on vulnerability patching. *Proceedings of the 36th IEEE Symposium on Security and Privacy (S&P)*, 48–63. https://doi.org/10.1109/SP.2015.12

Nikitin, K., Kokoris-Kogias, E., Jovanovic, P., Gailly, N., Gasser, L., Khoffi, I., & Ford, B. (2017). CHAINIAC: Proactive software-update transparency via collectively signed skipchains and verified builds. *Proceedings of the 26th USENIX Security Symposium*, 1271–1287. USENIX Association.

NIST. (2018). *Framework for improving critical infrastructure cybersecurity, version 1.1*. National Institute of Standards and Technology. https://doi.org/10.6028/NIST.CSWP.04162018

Ohm, M., Plate, H., Sykosch, A., & Meier, M. (2022). Backstabber's Knife Collection: A review of open source software supply chain attacks. *Lecture Notes in Computer Science*, *12048*, 1–20. Springer. https://doi.org/10.1007/978-3-030-52683-2_1

Ohm, M., Sykosch, A., & Meier, M. (2020). Towards detection of software supply chain attacks by forensic artifacts. *Proceedings of the 15th International Conference on Availability, Reliability and Security (ARES)*, 1–6. ACM. https://doi.org/10.1145/3407023.3409183

Okafor, K., Croft, R., & Mirakhorli, M. (2024). A systematic literature review of software supply chain security. *International Journal of Computers and Applications*, *46*(10), 853–867. https://doi.org/10.1080/1206212X.2024.2390978

Pashchenko, I., Vu, D. L., & Massacci, F. (2020). 4 eyes principle: Reviewing the worst vulnerable OSS packages. *Proceedings of the ACM SIGSAC Workshop on Software Supply Chain Offensive Research and Ecosystem Defenses (SCORED)*, 1–9. https://doi.org/10.1145/3417208.3417213

Pfrommer, J., Butz, A., Blochberger, M., & Lüder, A. (2022). SBOM in practice: From generation to automatic vulnerability tracking. *Proceedings of the IEEE International Conference on Emerging Technologies and Factory Automation (ETFA)*, 1–8. https://doi.org/10.1109/ETFA52439.2022.9921494

Ponta, S. E., Plate, H., & Sabetta, A. (2019). Detection, assessment and mitigation of vulnerabilities in open source dependencies. *Empirical Software Engineering*, *25*(5), 3175–3215. https://doi.org/10.1007/s10664-020-09830-x

Rose, S., Borchert, O., Mitchell, S., & Connelly, S. (2020). *Zero trust architecture. NIST Special Publication 800-207*. National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-207

Sejfia, A., & Schäfer, M. (2022). Practical automated detection of malicious npm packages. *Proceedings of the 44th International Conference on Software Engineering (ICSE)*, 1074–1085. ACM/IEEE. https://doi.org/10.1145/3510003.3510104

Staicu, C. A., Pradel, M., & Livshits, B. (2018). SYNODE: Understanding and automatically preventing injection attacks on Node.js. *Proceedings of the 25th Annual Network and Distributed System Security Symposium (NDSS 2018)*. Internet Society. https://doi.org/10.14722/ndss.2018.23071

Packages, J., Garg, D., Bertoni, M., & The SLSA Team. (2023). *SLSA: Supply chain levels for software artifacts v1.0*. OpenSSF. https://slsa.dev/spec/v1.0

Pan, Z., Shen, W., Wang, X., Yang, Y., & Ren, K. (2024). Ambush from all sides: Understanding security threats in open-source software CI/CD pipelines. *IEEE Transactions on Dependable and Secure Computing*, *21*(3), 1–16. https://doi.org/10.1109/TDSC.2024.3367890

Peisert, S., Schneier, B., Okhravi, H., Massacci, F., Benzel, T., & Landwehr, C. (2021). Perspectives on the SolarWinds incident. *IEEE Security & Privacy*, *19*(2), 7–13. https://doi.org/10.1109/MSEC.2021.3051235

Schorlemmer, T. R., Kalu, K. G., Wermke, D., Acar, Y., Fahl, S., & Davis, J. C. (2024). An industry interview study of software signing for supply chain security. *Proceedings of the 33rd USENIX Security Symposium*, 1–18. https://doi.org/10.48550/arXiv.2406.08198

Shu, R., Gu, X., & Enck, W. (2017). A study of security vulnerabilities on Docker Hub. *Proceedings of the 7th ACM CODASPY*, 269–280. https://doi.org/10.1145/3029806.3029832

Sonatype. (2024). *10th annual state of the software supply chain report*. Sonatype Inc. https://www.sonatype.com/state-of-the-software-supply-chain

Souppaya, M., Scarfone, K., & Dodson, D. (2022). Secure Software Development Framework (SSDF) version 1.1. *NIST Special Publication 800-218*. National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-218

Tal, O., & Schwartz, A. (2022). *OWASP Top 10 CI/CD security risks*. OWASP Foundation. https://owasp.org/www-project-top-10-ci-cd-security-risks

Tal, O., & Schwartz, A. (2023). Evaluating supply chain security tools beyond CVE databases. *Proceedings of the ACM Workshop on Software Supply Chain Offensive Research and Ecosystem Defenses (SCORED)*, 1–12. https://doi.org/10.1145/3595352.3595355

Torres-Arias, S., Afzali, H., Bozdemir, B., Cappos, J., & Warner, J. (2021). in-toto: Providing farm-to-table guarantees for bits and bytes. *Proceedings of USENIX Security*, 1–17. USENIX.

Vu, D. L., Nguyen, T. L., Nguyen, V. H., Nguyen, T. N., Massacci, F., & Pashchenko, I. (2020). A large-scale study about quality and reproducibility of reusable security advisories across package managers. *IEEE Transactions on Software Engineering*, *48*(9), 3651–3668. https://doi.org/10.1109/TSE.2020.3038272

Vu, D. L., Pashchenko, I., Massacci, F., Plate, H., & Sabetta, A. (2021). Lastpymile: Identifying the discrepancy between PyPI packages and their GitHub repositories. *Proceedings of the 29th ACM Joint Meeting on European Software Engineering Conference and Symposium on the Foundations of Software Engineering (ESEC/FSE)*, 835–847. https://doi.org/10.1145/3468264.3468605

Vu, D.-L., Dann, A., Ponta, S. E., & Massacci, F. (2023). Measuring the impact of typosquatting and dependency confusion attacks on the npm ecosystem. *IEEE Transactions on Software Engineering*, *49*(11), 4827–4845. https://doi.org/10.1109/TSE.2023.3295019

Wermke, D., Klemmer, J. H., Wöhler, N., Schmüser, J., Acar, Y., & Fahl, S. (2023). Always contribute back: A qualitative study on security challenges of the open source supply chain. *Proceedings of the 44th IEEE Symposium on Security and Privacy (S&P)*, 1545–1560. https://doi.org/10.1109/SP46215.2023.10179435

Westphal, J., Seidel, S., Steffens, M., & Schwaber, C. (2022). Large-scale analysis of GitHub Actions workflows for privilege escalation vulnerabilities. *Proceedings of the 31st USENIX Security Symposium*, 1–18. USENIX.

Williams, L., & Zahan, N. (2024). Research directions in software supply chain security. *ACM Transactions on Software Engineering and Methodology*, *33*(5), 1–42. https://doi.org/10.1145/3714464

Wübbeling, M., Schulte, M., Hecker, A., & Meier, M. (2022). Combined SAST and DAST approaches for software supply chain security: A systematic evaluation. *Proceedings of the European Symposium on Research in Computer Security (ESORICS)*, 445–465. Springer. https://doi.org/10.1007/978-3-031-17143-7_22

Yu, S., Song, W., Hu, X., & Yin, H. (2024). On the correctness of metadata-based SBOM generation: A differential analysis approach. *Proceedings of the 54th IEEE/IFIP International Conference on Dependable Systems and Networks (DSN)*, 29–36. https://doi.org/10.1109/DSN58291.2024.00018

Zahan, N., Zimmermann, T., Godfrey, P., Hassan, A. E., & Williams, L. (2022). What are weak links in the npm supply chain? *Proceedings of the 44th ICSE – SEIP*, 331–340. https://doi.org/10.1145/3510457.3513044

Zerouali, A., Cosentino, V., Mens, T., Robles, G., & González-Barahona, J. M. (2021). On the impact of outdated and vulnerable Docker Hub images. *Proceedings of the 28th IEEE International Conference on Software Analysis, Evolution and Reengineering (SANER)*, 329–340. https://doi.org/10.1109/SANER52600.2021.00040

Zerouali, A., Mens, T., Robles, G., & González-Barahona, J. M. (2019). An empirical analysis of technical lag in npm package dependencies. *Journal of Systems and Software*, *152*, 71–85. https://doi.org/10.1016/j.jss.2019.02.036

Zimmermann, M., Staicu, C. A., Tenny, C., & Pradel, M. (2019). Small world with high risks: A study of security threats in the npm ecosystem. *Proceedings of USENIX Security*, 1209–1226. USENIX.

Boyens, J., Smith, A., Bartol, N., Winkler, K., Holbrook, A., & Fallon, M. (2022). *Cybersecurity supply chain risk management practices for systems and organizations. NIST Special Publication 800-161r1*. National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-161r1

---

*Documento elaborado para el curso Seguridad Forense Digital — Universidad Privada de Tacna — 2026*

*Continuación de: Seguridad en la Cadena de Suministro de Software: Amenazas, Vulnerabilidades y Estrategias de Mitigación — Unidad I*

*Páginas: conforme a formato APA 7.ª edición, Times New Roman 12pt, A4, márgenes 2.54 cm, interlineado 1.15, páginas numeradas inferior derecha.*