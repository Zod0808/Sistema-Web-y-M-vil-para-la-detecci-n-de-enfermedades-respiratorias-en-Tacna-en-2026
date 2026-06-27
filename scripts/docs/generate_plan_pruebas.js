"use strict";
const path = require("path");
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, PageNumberElement, NumberFormat,
  UnderlineType, VerticalAlign,
  PageBreak,
} = require("docx");

// ─── COLOR PALETTE ────────────────────────────────────────────────────────────
const C = {
  darkBlue:   "1F3864",
  medBlue:    "2E75B6",
  accentBlue: "1F4E79",
  rowAlt:     "D6E4F0",
  white:      "FFFFFF",
  green:      "00B050",
  red:        "FF0000",
  amber:      "FFC000",
  lightGray:  "F2F2F2",
  black:      "000000",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const bold  = (text, size=24, color=C.black) => new TextRun({ text, bold:true, size, color, font:"Calibri" });
const normal= (text, size=24, color=C.black) => new TextRun({ text, size, color, font:"Calibri" });
const code  = (text) => new TextRun({ text, font:"Consolas", size:20, color:"C7254E" });
const br    = () => new TextRun({ break:1 });

const para = (children, opts={}) => new Paragraph({
  children: Array.isArray(children) ? children : [normal(children)],
  spacing:{ after:120, before:opts.before||0 },
  alignment: opts.align || AlignmentType.JUSTIFIED,
  ...opts,
});

const heading1 = (text) => new Paragraph({
  children:[new TextRun({ text, bold:true, size:32, color:C.white, font:"Calibri" })],
  heading: HeadingLevel.HEADING_1,
  spacing:{ before:400, after:200 },
  shading:{ type:ShadingType.CLEAR, fill:C.darkBlue, color:C.darkBlue },
  indent:{ left:200 },
});

const heading2 = (text) => new Paragraph({
  children:[new TextRun({ text, bold:true, size:26, color:C.white, font:"Calibri" })],
  heading: HeadingLevel.HEADING_2,
  spacing:{ before:300, after:160 },
  shading:{ type:ShadingType.CLEAR, fill:C.medBlue, color:C.medBlue },
  indent:{ left:160 },
});

const heading3 = (text) => new Paragraph({
  children:[new TextRun({ text, bold:true, size:24, color:C.accentBlue, font:"Calibri" })],
  heading: HeadingLevel.HEADING_3,
  spacing:{ before:240, after:120 },
  border:{ bottom:{ style:BorderStyle.SINGLE, size:4, color:C.medBlue } },
});

const bullet = (text, level=0) => new Paragraph({
  children:[normal(text)],
  bullet:{ level },
  spacing:{ after:80 },
});

const bulletBold = (label, rest) => new Paragraph({
  children:[bold(label+": "), normal(rest)],
  bullet:{ level:0 },
  spacing:{ after:80 },
});

// ─── TABLE HELPERS ────────────────────────────────────────────────────────────
const cell = (text, opts={}) => new TableCell({
  children:[new Paragraph({
    children: opts.bold
      ? [new TextRun({ text, bold:true, size:opts.size||22, color:opts.color||C.black, font:"Calibri" })]
      : [new TextRun({ text, size:opts.size||22, color:opts.color||C.black, font:"Calibri" })],
    alignment: opts.align || AlignmentType.LEFT,
    spacing:{ before:60, after:60 },
  })],
  shading: opts.fill ? { type:ShadingType.CLEAR, fill:opts.fill, color:opts.fill } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  margins:{ top:80, bottom:80, left:120, right:120 },
  columnSpan: opts.span,
  width: opts.width ? { size:opts.width, type:WidthType.DXA } : undefined,
});

const headerRow = (...labels) => new TableRow({
  children: labels.map(l => cell(l, { bold:true, color:C.white, fill:C.darkBlue, size:22 })),
  tableHeader: true,
});

const dataRow = (cells, isAlt=false) => new TableRow({
  children: cells.map(c =>
    typeof c === "string"
      ? cell(c, { fill: isAlt ? C.rowAlt : C.white })
      : cell(c.text, { fill: isAlt ? C.rowAlt : C.white, bold:c.bold, color:c.color, align:c.align })
  ),
});

const makeTable = (rows, widths=[]) => new Table({
  rows,
  width:{ size:9360, type:WidthType.DXA },
  columnWidths: widths.length ? widths : undefined,
  borders:{
    top:   { style:BorderStyle.SINGLE, size:4, color:C.medBlue },
    bottom:{ style:BorderStyle.SINGLE, size:4, color:C.medBlue },
    left:  { style:BorderStyle.SINGLE, size:4, color:C.medBlue },
    right: { style:BorderStyle.SINGLE, size:4, color:C.medBlue },
    insideH:{ style:BorderStyle.SINGLE, size:2, color:"BFBFBF" },
    insideV:{ style:BorderStyle.SINGLE, size:2, color:"BFBFBF" },
  },
});

// ─── CODE BLOCK ───────────────────────────────────────────────────────────────
const codeBlock = (lines) => {
  const runs = [];
  lines.forEach((line, i) => {
    runs.push(new TextRun({ text: line, font:"Consolas", size:18, color:"1F4E79" }));
    if (i < lines.length-1) runs.push(new TextRun({ break:1 }));
  });
  return new Paragraph({
    children: runs,
    spacing:{ before:80, after:80 },
    shading:{ type:ShadingType.CLEAR, fill:C.lightGray, color:C.lightGray },
    border:{ left:{ style:BorderStyle.SINGLE, size:12, color:C.medBlue } },
    indent:{ left:300 },
  });
};

// ─── STATUS RUNS ─────────────────────────────────────────────────────────────
const statusPass = () => new TextRun({ text:"✅ PASSED", bold:true, color:C.green, font:"Calibri", size:20 });
const statusFail = () => new TextRun({ text:"❌ FAILED", bold:true, color:C.red, font:"Calibri", size:20 });
const statusPend = () => new TextRun({ text:"⬜ PENDIENTE", bold:true, color:C.amber, font:"Calibri", size:20 });

// ─── PAGE BREAK ───────────────────────────────────────────────────────────────
const pgBreak = () => new Paragraph({ children:[new PageBreak()] });

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — PORTADA
// ═══════════════════════════════════════════════════════════════════════════════
const portada = [
  new Paragraph({ spacing:{ before:600, after:200 } }),
  new Paragraph({
    children:[new TextRun({ text:"UNIVERSIDAD PRIVADA DE TACNA", bold:true, size:36, color:C.darkBlue, font:"Calibri" })],
    alignment:AlignmentType.CENTER, spacing:{ after:80 },
  }),
  new Paragraph({
    children:[new TextRun({ text:"Escuela Profesional de Ingeniería de Sistemas", size:26, color:C.medBlue, font:"Calibri" })],
    alignment:AlignmentType.CENTER, spacing:{ after:400 },
  }),
  new Paragraph({
    children:[new TextRun({ text:"────────────────────────────────────────", color:C.medBlue, font:"Calibri", size:22 })],
    alignment:AlignmentType.CENTER, spacing:{ after:400 },
  }),
  new Paragraph({
    children:[new TextRun({ text:"PLAN DE PRUEBAS DE SOFTWARE", bold:true, size:48, color:C.darkBlue, font:"Calibri" })],
    alignment:AlignmentType.CENTER, spacing:{ after:160 },
  }),
  new Paragraph({
    children:[new TextRun({ text:"Arquitectura, Documentación y Ejecución", size:28, color:C.medBlue, font:"Calibri", italics:true })],
    alignment:AlignmentType.CENTER, spacing:{ after:80 },
  }),
  new Paragraph({
    children:[new TextRun({ text:"EPIC-03: Sistema de Diagnóstico Inteligente de Síntomas Respiratorios", size:24, color:C.accentBlue, font:"Calibri", bold:true })],
    alignment:AlignmentType.CENTER, spacing:{ after:400 },
  }),
  new Paragraph({
    children:[new TextRun({ text:"────────────────────────────────────────", color:C.medBlue, font:"Calibri", size:22 })],
    alignment:AlignmentType.CENTER, spacing:{ after:400 },
  }),
  makeTable([
    dataRow([ {text:"Proyecto",bold:true,color:C.accentBlue}, "RespiCare — Sistema de Gestión de Enfermedades Respiratorias" ]),
    dataRow([ {text:"Asignatura",bold:true,color:C.accentBlue}, "Construcción de Software II · Ciclo X" ], true),
    dataRow([ {text:"Unidad / Semana",bold:true,color:C.accentBlue}, "Unidad III: Entrega y Mantenimiento · Semana 13" ]),
    dataRow([ {text:"Docente",bold:true,color:C.accentBlue}, "Mag. Alberto Johnatan Flor Rodríguez" ], true),
    dataRow([ {text:"Estudiante",bold:true,color:C.accentBlue}, "Chávez Linares, Cesar Fabian · Cód. 2019063854" ]),
    dataRow([ {text:"Rol Operativo",bold:true,color:C.accentBlue}, "QA Lead (simulado)" ], true),
    dataRow([ {text:"Normativa Base",bold:true,color:C.accentBlue}, "SWEBOK V4 & ISO/IEC/IEEE 29119-3" ]),
    dataRow([ {text:"Fecha",bold:true,color:C.accentBlue}, "Junio 2026" ], true),
  ], [2200, 7160]),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — CONTEXTO Y ALCANCE
// ═══════════════════════════════════════════════════════════════════════════════
const seccion2 = [
  heading1("2. Contexto del Proyecto y Alcance del Plan"),
  heading2("2.1 Descripción de RespiCare"),
  para("RespiCare es un sistema integral de gestión de enfermedades respiratorias que combina inteligencia artificial clínica, historial clínico electrónico (HCE) e integración móvil multiplataforma. El sistema sirve a pacientes y profesionales médicos en el contexto de la ciudad de Tacna (2026), ofreciendo diagnóstico asistido por IA, seguimiento continuo mediante wearables, teleconsulta y alertas epidemiológicas."),
  para("El propósito principal de este Plan de Pruebas es garantizar que la EPIC-03 — el módulo de diagnóstico inteligente — cumpla los requisitos de calidad, seguridad y rendimiento antes de su integración con las épicas pendientes (EPIC-04 a EPIC-10)."),

  heading2("2.2 Stack Tecnológico"),
  makeTable([
    headerRow("Capa", "Tecnología", "Versión", "Rol en EPIC-03"),
    dataRow(["Frontend Web","Next.js + TypeScript","14.x","Formulario de síntomas, panel doctor"], false),
    dataRow(["Mobile App","Capacitor + React","6.x","Grabación de audio, envío de síntomas"], true),
    dataRow(["Backend API","Node.js + TypeScript","20 LTS","Orquestación, circuit breaker"], false),
    dataRow(["Servicio IA","FastAPI + Python","3.11","Random Forest, CNN audio"], true),
    dataRow(["Base de datos","MongoDB","7.x","Historial, resultados predicciones"], false),
    dataRow(["Caché / Queue","Redis","7.x","Rate limiting, jobs de audio"], true),
    dataRow(["CI/CD","GitHub Actions","—","Pipeline automatizado de pruebas"], false),
    dataRow(["Infraestructura","Docker Compose / Nginx","—","Ambiente local y staging"], true),
  ], [2200, 2400, 1600, 3160]),

  heading2("2.3 Alcance del Plan — EPIC-03"),
  para("El alcance se restringe a las tres historias de usuario de la EPIC-03:"),
  makeTable([
    headerRow("ID", "Historia de Usuario", "Módulo Técnico", "Estado"),
    dataRow(["HU-03.1","Registro y análisis de síntomas","symptomService.ts + predict_service.py","🔵 En curso"], false),
    dataRow(["HU-03.2","Análisis de tos por audio (CNN)","AudioAnalysisService + cnn_model.py","🔵 En curso"], true),
    dataRow(["HU-03.3","Panel del doctor — validación IA","DoctorDashboard + validationRouter.ts","🔵 En curso"], false),
  ], [1400, 3600, 3000, 1360]),
  para("Quedan fuera de alcance las EPIC-01 y EPIC-02 (ya validadas) y las EPIC-04 a EPIC-10 (pendientes de desarrollo)."),

  heading2("2.4 Ruta Crítica EPIC-03"),
  para("La ruta crítica identificada comprende 23 horas de trabajo encadenado:"),
  codeBlock([
    "T-01 (Modelo RF) → T-02 (API predict) → T-12 (Panel doctor UI)",
    "→ T-13 (Validación predicción) → T-14 (Auditría y logs)",
  ]),
  para("Cualquier bloqueo en este camino impacta directamente la fecha de integración del Sprint 2."),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 3 — ESTRATEGIAS EN EL DESPLIEGUE
// ═══════════════════════════════════════════════════════════════════════════════
const seccion3 = [
  heading1("3. Estrategias de Pruebas en el Despliegue"),
  para("Alineadas con el paradigma DevOps y referenciadas en SWEBOK V4 §2.2.5 (Integration Testing), las estrategias se dividen en tres fases temporales:"),

  heading2("3.1 Fase de Integración — DevOps Pipeline"),
  para("La integración continua (CI) se implementa mediante GitHub Actions. Cada pull request a la rama 'fabian' o 'main' dispara la siguiente cadena de verificación:"),
  codeBlock([
    "# .github/workflows/ci.yml (resumen)",
    "jobs:",
    "  test-backend:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - run: npm ci && npm test -- --coverage",
    "      - run: npx jest --testPathPattern=epic03",
    "  test-ai:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: pip install -r requirements.txt",
    "      - run: pytest tests/epic03/ --cov=app --cov-report=xml",
  ]),
  bulletBold("Pruebas de regresión automática", "Jest (backend/web) + Pytest (AI). Se ejecutan las suites completas, no solo las nuevas."),
  bulletBold("Umbral de calidad", "Cobertura ≥ 65% en Sprint 2; fallo del pipeline si cae por debajo (SWEBOK §2.2.5)."),
  bulletBold("Integración de SonarQube", "Análisis estático post-prueba para detectar deuda técnica y duplicación de código."),

  heading2("3.2 En la Frontera del Despliegue — Canary & Dark Launch"),
  para("Previo a la promoción a producción, los endpoints críticos de IA son validados mediante técnicas de despliegue progresivo:"),
  bulletBold("Canary Testing", "El 10% del tráfico de staging es dirigido a la nueva versión del endpoint /ai/predict/symptoms. Se monitorean error rate y latencia durante 15 minutos antes de promover al 100%."),
  bulletBold("Dark Launch", "Los endpoints /ai/predict/cough (CNN) reciben peticiones reales en paralelo, sin devolver la respuesta al cliente. Permite validar la carga real sin exposición al usuario."),
  codeBlock([
    "# docker-compose.prod.yml — configuración canary (extracto)",
    "services:",
    "  ai-canary:",
    "    image: respicare/ai-services:canary",
    "    deploy:",
    "      replicas: 1",
    "  ai-stable:",
    "    image: respicare/ai-services:stable",
    "    deploy:",
    "      replicas: 9",
  ]),

  heading2("3.3 Validación en Vivo — Métricas DORA"),
  para("Una vez en producción, se monitorizan las métricas DORA mediante OpenTelemetry + Prometheus:"),
  makeTable([
    headerRow("Métrica DORA", "Definición", "Meta RespiCare", "Herramienta"),
    dataRow(["MTTR","Mean Time To Recovery tras incidente","< 2 horas","Prometheus + Alertmanager"], false),
    dataRow(["Change Failure Rate","% deploys que causan incidente","< 5%","GitHub Actions metrics"], true),
    dataRow(["Deployment Frequency","Frecuencia de deploys exitosos","≥ 3/semana","GitHub Insights"], false),
    dataRow(["Lead Time for Changes","Commit → Producción","< 4 horas","Pipeline timing"], true),
  ], [2400, 3000, 2200, 1760]),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 4 — SHIFT-LEFT / TDD
// ═══════════════════════════════════════════════════════════════════════════════
const seccion4 = [
  heading1("4. Fundamentos de Planificación — Paradigma Shift-Left"),

  heading2("4.1 Definición y Fundamento (SWEBOK V4 §6.1.2)"),
  para("El paradigma Shift-Left implica desplazar las actividades de verificación y validación hacia las etapas más tempranas del ciclo de vida. En RespiCare, esto se materializa mediante TDD (Test-Driven Development) sobre los servicios de predicción, transformando la QA de una fase reactiva de detección de errores a una actividad constructiva integrada en el diseño."),
  para("La ecuación de costo de defectos de Barry Boehm —donde el costo de corrección aumenta exponencialmente por fase— justifica esta decisión: un error detectado en la fase de codificación cuesta ~10× menos que uno detectado en producción."),

  heading2("4.2 TDD Aplicado a symptomService.ts"),
  para("El ciclo Red-Green-Refactor se aplica al servicio TypeScript de síntomas:"),
  codeBlock([
    "// 1. RED — escribir la prueba que falla",
    "describe('SymptomService.predict()', () => {",
    "  it('debe retornar predicción con confidence >= 0 y <= 1', async () => {",
    "    const svc = new SymptomService(mockRepo, mockAIClient);",
    "    const result = await svc.predict({ fever: true, cough: true, dyspnea: false });",
    "    expect(result.confidence).toBeGreaterThanOrEqual(0);",
    "    expect(result.confidence).toBeLessThanOrEqual(1);",
    "  });",
    "});",
    "",
    "// 2. GREEN — implementación mínima que satisface la prueba",
    "// 3. REFACTOR — optimizar sin romper la prueba",
  ]),
  bulletBold("Beneficio principal", "El contrato del servicio queda explícito en las pruebas antes de escribir una sola línea de lógica de negocio."),
  bulletBold("Cobertura objetivo", "≥ 90% de ramas lógicas en symptomService.ts mediante pruebas unitarias TDD."),

  heading2("4.3 TDD Aplicado a predict_service.py"),
  codeBlock([
    "# Python / Pytest — ciclo TDD para el servicio IA",
    "def test_predict_returns_valid_schema():",
    "    svc = PredictService(model=MockRandomForest())",
    "    result = svc.predict({'fever':1, 'cough':1, 'dyspnea':0, 'wheezing':0})",
    "    assert 0.0 <= result['confidence'] <= 1.0",
    "    assert result['disease'] in VALID_DISEASES",
    "    assert 'timestamp' in result",
  ]),
  bulletBold("Mock del modelo RF", "Se inyecta un MockRandomForest que retorna respuestas deterministas, eliminando la varianza del modelo real en el test unitario."),
  bulletBold("Contrato de interfaz", "La prueba codifica el contrato JSON de salida del endpoint, que el schema de FastAPI debe satisfacer."),

  heading2("4.4 Impacto en la Cultura QA"),
  para("La adopción de Shift-Left en EPIC-03 produce los siguientes efectos medibles sobre el proceso:"),
  makeTable([
    headerRow("Indicador","Antes (reactivo)","Después (Shift-Left)","Variación"),
    dataRow(["Costo promedio por defecto","Alto (post-deploy)","Bajo (pre-commit)","↓ ~10x"], false),
    dataRow(["Tiempo de detección","Días / semanas","Minutos (CI local)","↓ ~95%"], true),
    dataRow(["Confianza del desarrollador","Baja","Alta (safety net)","↑"], false),
    dataRow(["Documentación viva","Ausente","Tests como spec","↑"], true),
  ], [3000, 2400, 2400, 1560]),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 5 — ARQUITECTURA ESTRATÉGICA
// ═══════════════════════════════════════════════════════════════════════════════
const seccion5 = [
  heading1("5. Arquitectura Estratégica del Plan de Pruebas"),
  para("El Plan de Pruebas de RespiCare se sostiene sobre tres pilares estratégicos definidos en SWEBOK V4 §5, adaptados al contexto de un sistema médico con componentes de IA."),

  heading2("5.1 Pilar I — Gestión de Personal y Cultura QA"),
  heading3("Independencia del Equipo QA"),
  para("La independencia del tester respecto del desarrollador es un principio fundamental (SWEBOK §5.1.1). En el contexto académico-simulado de RespiCare, se adopta el siguiente esquema de roles:"),
  makeTable([
    headerRow("Rol Simulado","Responsabilidad Principal","Artefactos Generados"),
    dataRow(["QA Lead (Estudiante)","Diseño de plan, revisión de casos, métricas","Plan de Pruebas, Reportes"],false),
    dataRow(["Dev Backend","Implementación y pruebas unitarias propias","Unit Tests Jest/Pytest"],true),
    dataRow(["Dev IA","Validación de modelos, pruebas de integración AI","Model Accuracy Reports"],false),
    dataRow(["Dev Mobile","Pruebas en dispositivo físico Android 13+","Device Test Logs"],true),
  ], [2400, 4000, 2960]),
  heading3("Egoless Programming (SWEBOK §5.1.1)"),
  para("Se adopta la filosofía de revisión de código entre pares sin ego: ningún desarrollador revisa exclusivamente su propio código. Las pull requests requieren aprobación de al menos un miembro diferente al autor antes de fusión. Esto aplica especialmente a los módulos de predicción IA, donde los errores tienen impacto clínico directo."),

  heading2("5.2 Pilar II — Objetivos de Prueba (Test Targets)"),
  para("Los objetivos se definen de forma cuantitativa y verificable:"),
  makeTable([
    headerRow("Dimensión de Calidad","Métrica","Umbral Aceptable","Referencia"),
    dataRow(["Conformidad Funcional IA","Accuracy Random Forest","≥ 70% en dataset de validación","ISO 25010 §4.2.1"],false),
    dataRow(["Confiabilidad","Circuit Breaker activación","< 1% de peticiones normales","SWEBOK §5.2"],true),
    dataRow(["Usabilidad (formulario síntomas)","Task Completion Rate","≥ 90% en prueba de usuario","ISO 9241-11"],false),
    dataRow(["Rendimiento WiFi","Tiempo respuesta /predict","< 3 segundos (P95)","SWEBOK §4.1"],true),
    dataRow(["Rendimiento 3G","Tiempo respuesta /predict","< 8 segundos (P95)","SWEBOK §4.1"],false),
    dataRow(["Seguridad","OWASP Top 10 críticos","0 vulnerabilidades críticas","OWASP ASVS 3.0"],true),
    dataRow(["Cobertura de Código","Statement Coverage","≥ 80% (Sprint 3)","SWEBOK §3.2"],false),
  ], [2800, 2600, 2200, 1760]),

  heading2("5.3 Pilar III — Criterios de Finalización (Stopping Rules)"),
  para("Basados en SWEBOK V4 §1.2.1 (Risk Analysis), se definen las condiciones bajo las cuales el proceso de prueba se considera terminado o debe detenerse:"),
  bulletBold("Criterio de Completitud", "Cobertura ≥ 80% de sentencias + 100% de casos de prueba críticos (CP-EPIC03-001 a CP-EPIC03-010) ejecutados con resultado documentado."),
  bulletBold("Criterio de Calidad", "Tasa de defectos residuales aceptable: ≤ 2 defectos de severidad Alta/Media sin resolver por módulo."),
  bulletBold("Criterio de Riesgo", "Ningún defecto de severidad Crítica abierto. Los defectos Críticos bloquean el avance al siguiente sprint."),
  bulletBold("Criterio de Tiempo", "Agotamiento del tiempo asignado: si se alcanza el deadline del Sprint 2 sin cumplir cobertura, se documenta la deuda técnica y se escala al Sprint 3."),
  bulletBold("Criterio de Suspensión", "Si el ambiente de prueba falla (Docker Compose inaccesible, MongoDB down), se suspende la ejecución y se registra un Incident Report."),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 6 — JERARQUÍA ISO 29119-3
// ═══════════════════════════════════════════════════════════════════════════════
const seccion6 = [
  heading1("6. Jerarquía Documental ISO/IEC/IEEE 29119-3"),
  para("La norma ISO/IEC/IEEE 29119-3 define una jerarquía de tres niveles para la documentación de pruebas. A continuación se mapea cada nivel al proyecto RespiCare:"),

  heading2("6.1 Nivel Organizacional — Políticas y Estrategia"),
  makeTable([
    headerRow("Artefacto ISO 29119-3","Contenido RespiCare","Ubicación"),
    dataRow(["Test Policy","Política de calidad del software RespiCare: toda funcionalidad clínica debe tener cobertura ≥ 80% antes de producción.","CLAUDE.md + docs/testing/TESTING_STRATEGY.md"],false),
    dataRow(["Organizational Test Strategy","Estrategia multi-nivel: Unit → Integration → E2E → Performance → Security. Pirámide de pruebas con 70/20/10.","docs/testing/TESTING_STRATEGY.md"],true),
  ], [2600, 4800, 2160]),

  heading2("6.2 Nivel de Gestión — Plan y Seguimiento"),
  makeTable([
    headerRow("Artefacto ISO 29119-3","Contenido RespiCare","Estado"),
    dataRow(["Test Plan (este documento)","Plan específico Sprint 2, EPIC-03. Define alcance, recursos, cronograma y stopping rules.","🔵 En elaboración"],false),
    dataRow(["Test Status Report","Reporte semanal: casos ejecutados, defectos encontrados/resueltos, cobertura actual.","⬜ Pendiente sprint"],true),
    dataRow(["Test Completion Report","Informe final del sprint con métricas consolidadas y dictamen del QA Lead.","⬜ Fin de sprint"],false),
  ], [2800, 4800, 1760]),

  heading2("6.3 Nivel Dinámico — Especificación y Ejecución"),
  makeTable([
    headerRow("Artefacto ISO 29119-3","Contenido RespiCare","Referencia"),
    dataRow(["Test Design Specification","Técnicas aplicadas: partición equivalencias, valores límite, tabla decisión.","Sección 7 de este documento"],false),
    dataRow(["Test Case Specification","10 casos de prueba detallados para EPIC-03 (CP-EPIC03-001 a 010).","Sección 8 de este documento"],true),
    dataRow(["Test Procedure Specification","Pasos secuenciales de ejecución para cada caso, incluyendo setup Docker.","Sección 10 de este documento"],false),
    dataRow(["Test Environment Requirements","Especificación del ambiente sandbox con Docker Compose.","Sección 9 de este documento"],true),
    dataRow(["Test Execution Log","Registro de ejecución: fecha, ejecutor, resultado, evidencia.","A generar en ejecución"],false),
    dataRow(["Incident Report","Formulario de reporte de defecto con clasificación ODC.","Sección 11 de este documento"],true),
  ], [2800, 4800, 1760]),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 7 — METODOLOGÍA DE DISEÑO
// ═══════════════════════════════════════════════════════════════════════════════
const seccion7 = [
  heading1("7. Metodología de Diseño — Funcionales vs. No Funcionales"),

  heading2("7.1 Pruebas Funcionales (Caja Negra)"),
  heading3("7.1.1 Partición de Equivalencias — Inputs de Síntomas (HU-03.1)"),
  para("Los inputs del formulario de síntomas se clasifican en clases de equivalencia válidas e inválidas:"),
  makeTable([
    headerRow("Campo","Clase Válida","Clase Inválida","Valor de Prueba (Inválido)"),
    dataRow(["fever (boolean)","true / false","null, string, número","'yes', 7, null"],false),
    dataRow(["cough (boolean)","true / false","undefined","undefined"],true),
    dataRow(["duration_days (int)","1 — 365","0, negativo, > 365, decimal","0, -1, 500, 1.5"],false),
    dataRow(["temperature_c (float)","35.0 — 42.0","< 35, > 45, string","34.9, 45.1, 'alta'"],true),
    dataRow(["severity (1-10)","1 — 10","0, 11, decimal","0, 11, 5.5"],false),
  ], [2000, 2400, 2400, 2760]),

  heading3("7.1.2 Análisis de Valores Límite — Confidence Score"),
  para("El confidence score de la predicción IA tiene límites críticos que determinan el flujo de la aplicación:"),
  makeTable([
    headerRow("Límite","Valor","Comportamiento Esperado","Prueba"),
    dataRow(["Mínimo absoluto","0.00","Mostrar '⚠️ Sin confianza — consultar médico'","CP-EPIC03-004"],false),
    dataRow(["Umbral bajo","0.59","Mostrar advertencia + botón ajuste manual","CP-EPIC03-005"],true),
    dataRow(["Umbral aceptable","0.60","Mostrar diagnóstico con confianza moderada","CP-EPIC03-004"],false),
    dataRow(["Umbral alto","0.85","Mostrar diagnóstico con alta confianza","CP-EPIC03-003"],true),
    dataRow(["Máximo absoluto","1.00","Marcar como determinístico (caso borde)","Prueba exploratoria"],false),
  ], [2200, 1600, 4000, 1560]),

  heading3("7.1.3 Tabla de Decisión — Flujo de Predicción"),
  makeTable([
    headerRow("Condición / Acción","R1","R2","R3","R4"),
    dataRow(["Síntomas completos (≥ 4 campos)","✅","✅","❌","❌"],false),
    dataRow(["Servicio IA disponible","✅","❌","✅","❌"],true),
    dataRow(["Confidence ≥ 60%","✅","N/A","N/A","N/A"],false),
    dataRow(["─── ACCIONES ───","","","",""],true),
    dataRow(["Mostrar diagnóstico","✅","❌","❌","❌"],false),
    dataRow(["Activar circuit breaker","❌","✅","❌","✅"],true),
    dataRow(["Mostrar error validación form","❌","❌","✅","✅"],false),
    dataRow(["Enviar a revisión médica manual","❌","✅","❌","✅"],true),
  ], [3200, 1540, 1540, 1540, 1540]),

  heading2("7.2 Pruebas No Funcionales"),
  heading3("7.2.1 Pruebas de Carga y Estrés — Endpoint IA"),
  para("Se utiliza k6 para pruebas de carga sobre el endpoint /ai/predict/symptoms:"),
  codeBlock([
    "// k6/load-test-predict.js",
    "import http from 'k6/http';",
    "import { check, sleep } from 'k6';",
    "export const options = {",
    "  stages: [",
    "    { duration: '2m', target: 50  }, // ramp up",
    "    { duration: '5m', target: 100 }, // carga sostenida",
    "    { duration: '2m', target: 200 }, // estres",
    "    { duration: '1m', target: 0   }, // ramp down",
    "  ],",
    "  thresholds: {",
    "    'http_req_duration': ['p(95)<3000'], // < 3s P95",
    "    'http_req_failed':   ['rate<0.01'], // < 1% errores",
    "  },",
    "};",
  ]),
  bulletBold("Locust (Python)", "Para el servicio FastAPI, se utiliza Locust para simular usuarios concurrentes con patrones de uso clínico real."),
  bulletBold("Escenario de estrés", "300 usuarios concurrentes durante 10 minutos. Meta: sin degradación de accuracy del modelo."),

  heading3("7.2.2 Confiabilidad del Circuit Breaker"),
  para("RespiCare implementa un circuit breaker manual (INC-04: incompatibilidad cockatiel con Node 20). Las pruebas de confiabilidad verifican la transición de estados:"),
  makeTable([
    headerRow("Estado","Condición de Transición","Prueba"),
    dataRow(["CLOSED → OPEN","≥ 5 fallos en 30 segundos","Simular 5 timeouts consecutivos"],false),
    dataRow(["OPEN → HALF-OPEN","Pasados 60 segundos","Esperar 60s + enviar 1 petición"],true),
    dataRow(["HALF-OPEN → CLOSED","1 petición exitosa","IA recuperada: petición OK"],false),
    dataRow(["HALF-OPEN → OPEN","Petición falla","IA aún caída: reiniciar ciclo"],true),
  ], [2400, 3800, 3160]),

  heading3("7.2.3 Seguridad — Datos Médicos (HIPAA / LPD Perú)"),
  bulletBold("Autenticación JWT", "Verificar que todos los endpoints de EPIC-03 rechacen peticiones sin token válido (CP-EPIC03-009)."),
  bulletBold("Inyección NoSQL", "Enviar payloads maliciosos en campos de síntomas: {\"$gt\": \"\"}, {\"$where\": \"...\"}."),
  bulletBold("Data Masking en logs", "Verificar que los logs de aplicación no expongan datos de pacientes en texto plano."),
  bulletBold("Rate Limiting", "Endpoint /ai/predict/symptoms limitado a 60 req/min por usuario autenticado."),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 8 — CASOS DE PRUEBA
// ═══════════════════════════════════════════════════════════════════════════════
const cpTable = (id, desc, pre, steps, input, expected) => [
  new Paragraph({
    children:[new TextRun({ text:`Caso de Prueba: ${id}`, bold:true, size:24, color:C.white, font:"Calibri" })],
    shading:{ type:ShadingType.CLEAR, fill:C.accentBlue, color:C.accentBlue },
    spacing:{ before:240, after:0 },
    indent:{ left:160 },
  }),
  makeTable([
    dataRow([{text:"ID del Caso",bold:true,color:C.accentBlue}, id, {text:"Descripción",bold:true,color:C.accentBlue}, desc],false),
    dataRow([{text:"Precondiciones",bold:true,color:C.accentBlue}, {text:pre,align:AlignmentType.LEFT}, {text:"Módulo",bold:true,color:C.accentBlue}, id.includes("03.1")||id.endsWith("001")||id.endsWith("002")||id.endsWith("003")||id.endsWith("004")||id.endsWith("005") ? "HU-03.1" : id.endsWith("006")||id.endsWith("007")||id.endsWith("008") ? "HU-03.2" : id.endsWith("009")||id.endsWith("010") ? "HU-03.3" : "EPIC-03"],true),
    dataRow([{text:"Pasos de Ejecución",bold:true,color:C.accentBlue,align:AlignmentType.LEFT}, {text:steps, align:AlignmentType.LEFT}, {text:"Datos de Entrada",bold:true,color:C.accentBlue}, {text:input}],false),
    dataRow([{text:"Resultado Esperado (Oráculo)",bold:true,color:C.accentBlue}, {text:expected,align:AlignmentType.LEFT}, {text:"Resultado Obtenido",bold:true,color:C.accentBlue}, "⬜ PENDIENTE"],true),
  ], [2300, 4200, 1600, 1260]),
  new Paragraph({ spacing:{ after:160 } }),
];

const seccion8 = [
  heading1("8. Plantilla Oficial de Casos de Prueba — EPIC-03"),
  para("Los siguientes 10 casos de prueba cubren las tres historias de usuario de la EPIC-03, diseñados según la norma ISO/IEC/IEEE 29119-3 §7.2 (Test Case Specification)."),

  ...cpTable(
    "CP-EPIC03-001",
    "Registro de síntomas válidos y obtención de predicción exitosa",
    "Usuario autenticado con rol PACIENTE. Servicio IA activo (Docker up). MongoDB disponible.",
    "1. Navegar a /symptoms/new\n2. Completar formulario: fiebre=Sí, tos=Sí, disnea=No, duración=3 días, temperatura=38.2°C, severidad=6\n3. Pulsar 'Analizar Síntomas'\n4. Esperar respuesta del endpoint POST /api/symptoms",
    "{ fever:true, cough:true, dyspnea:false, duration_days:3, temperature_c:38.2, severity:6 }",
    "HTTP 200. Respuesta JSON con campos: disease (string), confidence (0.0-1.0), recommendations (array). UI muestra diagnóstico en < 3 segundos. Registro guardado en MongoDB."
  ),

  ...cpTable(
    "CP-EPIC03-002",
    "Registro de síntomas con campos inválidos — validación frontend",
    "Usuario autenticado. Formulario de síntomas cargado.",
    "1. Ingresar duration_days = -1\n2. Ingresar temperature_c = 50.0\n3. Dejar severity vacío\n4. Pulsar 'Analizar Síntomas'",
    "{ duration_days:-1, temperature_c:50.0, severity:undefined }",
    "HTTP 400 o error de validación frontend. Mensajes de error visibles junto a cada campo inválido. No se realiza llamada al endpoint /ai/predict. Sin datos en MongoDB."
  ),

  ...cpTable(
    "CP-EPIC03-003",
    "Predicción IA con confidence score alta (≥ 0.85) — flujo nominal",
    "Modelo Random Forest entrenado y cargado. Servicio IA activo. Datos de síntomas representativos de Neumonía.",
    "1. Enviar POST /ai/predict/symptoms con síntomas de alta certeza\n2. Verificar respuesta JSON\n3. Verificar UI: badge de confianza alta en verde",
    "{ fever:true, cough:true, dyspnea:true, wheezing:false, duration_days:5, severity:8, temperature_c:39.5 }",
    "confidence >= 0.85. disease = 'Pneumonia' (u enfermedad adecuada al dataset). UI muestra badge verde '✅ Alta confianza'. Botón 'Enviar a doctor' habilitado."
  ),

  ...cpTable(
    "CP-EPIC03-004",
    "Predicción IA con confidence score baja (< 0.60) — advertencia al usuario",
    "Modelo RF con síntomas ambiguos que producen confianza baja.",
    "1. Enviar POST /ai/predict/symptoms con síntomas ambiguos\n2. Verificar respuesta JSON\n3. Verificar UI: advertencia visible",
    "{ fever:false, cough:true, dyspnea:false, wheezing:true, duration_days:1, severity:2 }",
    "confidence < 0.60. UI muestra advertencia amber: '⚠️ Confianza insuficiente — se recomienda evaluación médica'. Botón 'Ajuste Manual' del doctor activado."
  ),

  ...cpTable(
    "CP-EPIC03-005",
    "Circuit breaker activado cuando servicio IA no responde",
    "Backend Node.js activo. Servicio IA detenido (docker stop ai-services).",
    "1. Detener contenedor ai-services\n2. Enviar 5 peticiones POST /api/symptoms consecutivas\n3. Verificar respuesta en la 6.ª petición\n4. Reiniciar ai-services\n5. Esperar 60 segundos\n6. Enviar nueva petición",
    "{ fever:true, cough:true, dyspnea:true, duration_days:2 } (repetir 6 veces)",
    "Peticiones 1-5: HTTP 503 con body {error:'AI service unavailable', fallback:true}. Petición 6 (circuit OPEN): HTTP 503 instantáneo sin timeout. Tras reinicio (60s): HTTP 200 normal — circuit CLOSED."
  ),

  ...cpTable(
    "CP-EPIC03-006",
    "Grabación de audio de tos — flujo exitoso en Android 13+",
    "App Capacitor instalada en dispositivo/emulador Android 13+. Permiso RECORD_AUDIO concedido.",
    "1. Navegar a sección Análisis de Tos\n2. Pulsar botón 'Grabar Tos'\n3. Toser durante 3 segundos\n4. Pulsar 'Detener grabación'\n5. Verificar UI",
    "Audio real de tos ~3s. Formato WAV/WebM. Tamaño estimado 48 KB.",
    "Grabación inicia sin error. Duración >= 2s detectada. Preview de audio reproducible. Botón 'Analizar' habilitado. Sin errores de permiso en consola Logcat."
  ),

  ...cpTable(
    "CP-EPIC03-007",
    "Análisis CNN con audio de tos válido — predicción exitosa",
    "Servicio FastAPI activo. Modelo CNN cargado (o dataset ESC-50 como sustituto). Audio de tos >= 2s disponible.",
    "1. Subir archivo de audio de tos (WAV, 3s, 44100Hz)\n2. POST /ai/predict/cough con audio en multipart/form-data\n3. Verificar respuesta JSON\n4. Verificar UI",
    "Archivo: cough_sample.wav, 44100Hz, mono, 3 segundos, 129 KB",
    "HTTP 200. JSON: { disease: string, confidence: float, audio_quality: 'good'|'poor', duration_ms: int }. confidence refleja la calidad del audio. UI muestra resultado en < 5s."
  ),

  ...cpTable(
    "CP-EPIC03-008",
    "Análisis CNN con audio corrupto/silencio — manejo de error",
    "Servicio FastAPI activo. Archivo de audio inválido preparado.",
    "1. Subir archivo de audio corrupto (0 bytes o silencio)\n2. POST /ai/predict/cough\n3. Verificar respuesta",
    "Archivo: silence.wav, 0.5s de silencio, o corrupted_audio.bin",
    "HTTP 422 o 400. Body: { error: 'AUDIO_QUALITY_INSUFFICIENT', message: 'Audio muy corto o sin voz detectada', min_duration_ms: 2000 }. UI muestra instrucciones para re-grabar."
  ),

  ...cpTable(
    "CP-EPIC03-009",
    "Panel del doctor — visualización de predicciones pendientes de validación",
    "Usuario autenticado con rol DOCTOR. Existen >= 3 predicciones IA pendientes de validación en MongoDB.",
    "1. Navegar a /doctor/dashboard\n2. Verificar lista de predicciones pendientes\n3. Seleccionar una predicción\n4. Verificar detalle",
    "Token JWT con role='doctor'. MongoDB con documentos en collection 'predictions' con status='pending'.",
    "UI carga en < 2s. Lista muestra: nombre paciente, fecha, enfermedad predicha, confidence (con color: verde ≥0.85, amber 0.60-0.84, rojo <0.60). Detalle incluye síntomas originales y recomendaciones IA."
  ),

  ...cpTable(
    "CP-EPIC03-010",
    "Validación de predicción por doctor — flujo aceptar/rechazar/ajustar",
    "Doctor autenticado en panel. Predicción pendiente seleccionada.",
    "1. Visualizar predicción pendiente\n2. Caso A: Pulsar 'Aceptar Diagnóstico'\n3. Caso B: Pulsar 'Rechazar' + ingresar diagnóstico correcto\n4. Caso C: Pulsar 'Ajustar' + modificar enfermedad + agregar nota clínica\n5. Confirmar cada acción",
    "Caso A: sin cambios. Caso B: { overrideDiagnosis: 'Bronchitis', reason: 'Síntomas no coinciden con Pneumonia' }. Caso C: { adjustedDisease: 'Asthma', clinicalNote: 'Patrón asmático previo' }",
    "Caso A: status='validated', doctorApproved=true en MongoDB. Caso B: status='rejected', overrideDiagnosis guardado. Caso C: status='adjusted', nota clínica registrada. Todos: notificación enviada al paciente. Audit log generado."
  ),

  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 9 — INFRAESTRUCTURA Y DATOS
// ═══════════════════════════════════════════════════════════════════════════════
const seccion9 = [
  heading1("9. Infraestructura Científica — Ambientes y Datos Controlados"),

  heading2("9.1 Ambiente Controlado (Sandbox)"),
  para("El ambiente de pruebas es una réplica fiel del ambiente de producción, aislada mediante Docker Compose. Esto cumple con el principio SWEBOK §5.2.3 de ambiente controlado y reproducible:"),
  codeBlock([
    "# Levantar el SUT (System Under Test) para EPIC-03",
    "docker compose -f docker-compose.dev.yml up \\",
    "  backend ai-services mongodb redis nginx --build -d",
    "",
    "# Verificar salud de todos los servicios",
    "docker compose ps  # todos deben estar 'healthy'",
    "",
    "# Sembrar datos de prueba",
    "npm run seed:test --workspace=backend",
  ]),
  bulletBold("Test Doubles (SWEBOK §5.2.3)", "Se utilizan los siguientes sustitutos para aislar el SUT:"),
  makeTable([
    headerRow("Tipo","Descripción","Uso en EPIC-03"),
    dataRow(["Mock","Objeto con comportamiento pre-programado","MockRandomForest para TDD unitario"],false),
    dataRow(["Stub","Respuesta cableada sin lógica","Stub del CNN para pruebas de integración"],true),
    dataRow(["Spy","Registra llamadas sin alterar comportamiento","SpyOnAIClient para verificar parámetros"],false),
    dataRow(["Fake","Implementación simplificada funcional","FakeCircuitBreaker en pruebas de backend"],true),
  ], [1600, 3800, 3960]),

  heading2("9.2 Gestión de Datos Representativos"),
  heading3("Clases de Equivalencia para Datos Clínicos"),
  para("Se definen cuatro categorías de pacientes para representar la diversidad clínica de Tacna:"),
  makeTable([
    headerRow("Perfil Clínico","Características","Cantidad Registros","Uso"),
    dataRow(["Neumonía confirmada","Fiebre alta, tos productiva, disnea","50 pacientes","Training + Validation"],false),
    dataRow(["Bronquitis aguda","Tos seca, fiebre moderada, sin disnea","40 pacientes","Training + Validation"],true),
    dataRow(["Asma","Sibilancias, disnea, sin fiebre","35 pacientes","Training + Validation"],false),
    dataRow(["Paciente sano (control)","Sin síntomas o síntomas leves","30 pacientes","Prueba de especificidad"],true),
  ], [2400, 3000, 2200, 1760]),

  heading3("Data Masking — Protección de Datos Médicos (SWEBOK §2.2.9)"),
  para("Los datos reales de pacientes nunca se utilizan directamente en el ambiente de pruebas. Se aplican las siguientes técnicas de enmascaramiento:"),
  codeBlock([
    "// scripts/seed/mask-patients.js",
    "const masked = realPatient => ({",
    "  ...realPatient,",
    "  name:  faker.person.fullName(),",
    "  dni:   faker.string.numeric(8),",
    "  dob:   faker.date.birthdate({ min:18, max:80, mode:'age' }),",
    "  phone: faker.phone.number(),",
    "  // síntomas clínicos: SE MANTIENEN (no son PII)",
    "});",
  ]),
  bulletBold("Datos sintéticos", "Para el modelo CNN (audio de tos), se utiliza el dataset público ESC-50 (INC-01) como sustituto mientras no hay datos reales suficientes."),
  bulletBold("Volumetría para estrés", "Se generan 10,000 registros sintéticos con faker para pruebas de carga en MongoDB. Índices verificados en campo patientId + date."),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 10 — EJECUCIÓN DINÁMICA
// ═══════════════════════════════════════════════════════════════════════════════
const seccion10 = [
  heading1("10. Fase Operativa — Ejecución Dinámica de Pruebas"),
  para("El ciclo de ejecución dinámica de RespiCare comprende 4 fases secuenciales, referenciadas en SWEBOK V4 §3.3 y la norma ISO 29119-3 §7.4."),

  heading2("10.1 Fase 1 — Despliegue en Ambiente (Setup)"),
  codeBlock([
    "# 1. Clonar repo y cambiar a rama de prueba",
    "git checkout fabian",
    "git pull origin fabian",
    "",
    "# 2. Levantar infraestructura completa",
    "docker compose -f docker-compose.dev.yml up -d --build",
    "",
    "# 3. Esperar health checks (máx. 120s)",
    "docker compose ps  # verificar 'healthy' en todos",
    "",
    "# 4. Sembrar base de datos con fixture EPIC-03",
    "npm run seed:epic03 --workspace=backend",
    "",
    "# 5. Verificar endpoints clave",
    "curl http://localhost:3001/health        # backend",
    "curl http://localhost:8000/health        # ai-services",
  ]),

  heading2("10.2 Fase 2 — Ejecución Procedimental"),
  para("La ejecución sigue el orden definido en la Test Procedure Specification, priorizando los casos de mayor riesgo (severidad Alta primero):"),
  makeTable([
    headerRow("Orden","Caso","Tipo","Modo Ejecución","Herramienta"),
    dataRow(["1","CP-EPIC03-005 (Circuit Breaker)","Funcional","Manual + Automatizado","Jest + curl"],false),
    dataRow(["2","CP-EPIC03-001 (Flujo nominal)","Funcional","Automatizado","Jest/Supertest"],true),
    dataRow(["3","CP-EPIC03-002 (Validación form)","Funcional","Automatizado","Jest + Testing Library"],false),
    dataRow(["4","CP-EPIC03-003 (Confidence alta)","Funcional","Automatizado","Pytest"],true),
    dataRow(["5","CP-EPIC03-004 (Confidence baja)","Funcional","Automatizado","Pytest"],false),
    dataRow(["6","CP-EPIC03-006 (Audio Android)","Funcional","Manual","Dispositivo físico"],true),
    dataRow(["7","CP-EPIC03-007 (CNN válido)","Funcional","Automatizado","Pytest + audio fixture"],false),
    dataRow(["8","CP-EPIC03-008 (Audio corrupto)","Funcional","Automatizado","Pytest"],true),
    dataRow(["9","CP-EPIC03-009 (Panel doctor)","Funcional","Automatizado","Playwright E2E"],false),
    dataRow(["10","CP-EPIC03-010 (Validación doctor)","Funcional","Automatizado","Playwright E2E"],true),
  ], [800, 2200, 1600, 2200, 2560]),

  para("Pruebas exploratorias: Se aplican heurísticas SFDIPOT (Structure, Function, Data, Interfaces, Platform, Operations, Time) durante 30 minutos por módulo (SWEBOK §3.3.2)."),

  heading2("10.3 Fase 3 — Evaluación (El Oráculo)"),
  para("Tras cada ejecución, el resultado obtenido se contrasta con el oráculo definido en la especificación. El oráculo para EPIC-03 se compone de:"),
  bulletBold("Oráculo de especificación", "El resultado esperado documentado en cada caso (Sección 8)."),
  bulletBold("Oráculo de regresión", "Comparación con el comportamiento de la versión anterior validada en el Sprint 1."),
  bulletBold("Oráculo estadístico", "Para el modelo IA: accuracy ≥ 70% medida sobre el conjunto de validación retenido (20% del dataset)."),
  para("El resultado de cada comparación se registra en el Test Execution Log con timestamp, ejecutor, resultado (PASS/FAIL) y evidencia (screenshot o log adjunto)."),

  heading2("10.4 Fase 4 — Automatización e Integración CI"),
  codeBlock([
    "# Ejecutar suite completa EPIC-03 localmente",
    "npm run test:epic03 --workspace=backend      # Jest",
    "pytest tests/epic03/ -v --tb=short           # Pytest",
    "npx playwright test tests/e2e/epic03/        # Playwright",
    "",
    "# Reporte de cobertura",
    "npm run coverage:report --workspace=backend",
    "pytest --cov=app --cov-report=html tests/epic03/",
  ]),
  para("Las pruebas exitosas se integran automáticamente en el pipeline de GitHub Actions. Cualquier caso que alcance estado PASS se convierte en prueba de regresión permanente para sprints futuros."),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 11 — CICLO DE VIDA DEL DEFECTO
// ═══════════════════════════════════════════════════════════════════════════════
const seccion11 = [
  heading1("11. Trazabilidad y Seguimiento — Ciclo de Vida del Defecto"),

  heading2("11.1 Definiciones SWEBOK V4 §5.2.5"),
  makeTable([
    headerRow("Término","Definición SWEBOK","Ejemplo en RespiCare"),
    dataRow(["Error (Mistake)","Acción humana que produce un resultado incorrecto","Developer codifica confidence como porcentaje (0-100) en vez de fracción (0-1)"],false),
    dataRow(["Defecto (Fault/Bug)","Manifestación de un error en el código","random_forest.predict_proba() retorna [85, 15] en vez de [0.85, 0.15]"],true),
    dataRow(["Falla (Failure)","Comportamiento incorrecto observable en ejecución","UI muestra '85% confianza' pero debería ser '85.0%' — panic en el cliente al hacer comparación"],false),
  ], [2000, 3800, 3560]),

  heading2("11.2 Flujo del Ciclo de Vida del Defecto"),
  para("Cada defecto encontrado durante la ejecución de pruebas de EPIC-03 sigue el siguiente flujo:"),
  codeBlock([
    "NUEVO → EN ANÁLISIS → [CONFIRMADO → ASIGNADO → EN CORRECCIÓN → CORREGIDO]",
    "                   ↘ [RECHAZADO (no es defecto / duplicado)]",
    "CORREGIDO → RE-PROBADO → [PASS → CERRADO]",
    "                       → [FAIL → EN CORRECCIÓN (reabierto)]",
  ]),
  makeTable([
    headerRow("Estado","Responsable","Criterio de Salida","SLA"),
    dataRow(["NUEVO","QA Lead","Defecto documentado con pasos reproducibles","< 4 horas"],false),
    dataRow(["EN ANÁLISIS","Tech Lead","Causa raíz identificada (5 Whys)","< 8 horas (crítico < 2h)"],true),
    dataRow(["EN CORRECCIÓN","Dev asignado","Fix en rama feature/ + unit test que reproduce el defecto","Según severidad"],false),
    dataRow(["CORREGIDO","Dev asignado","PR aprobado y mergeado a fabian","—"],true),
    dataRow(["RE-PROBADO","QA Lead","Ejecutar caso de prueba original + regresión","< 2 horas post-deploy"],false),
    dataRow(["CERRADO","QA Lead","PASS en re-test. Prueba de regresión añadida al CI.","—"],true),
  ], [2000, 1800, 3800, 1760]),

  heading2("11.3 Clasificación ODC — Defectos de IA (EPIC-03)"),
  para("Se aplica Orthogonal Defect Classification (ODC) a los defectos encontrados en el módulo de IA, para análisis causal estructurado:"),
  makeTable([
    headerRow("Tipo ODC","Descripción","Ejemplos en EPIC-03"),
    dataRow(["Function","Defecto en lógica de negocio principal","confidence threshold incorrecto, disease mapping erróneo"],false),
    dataRow(["Algorithm","Defecto en lógica computacional","Error en normalización de features, bug en cross-validation"],true),
    dataRow(["Interface","Incompatibilidad entre módulos","Formato JSON entre backend y FastAPI no coincide"],false),
    dataRow(["Timing/Serialization","Problemas de concurrencia o secuencia","Race condition en circuit breaker bajo alta carga"],true),
    dataRow(["Build/Package/Merge","Defecto introducido en integración","Versión incorrecta de scikit-learn en imagen Docker"],false),
  ], [2400, 3000, 4160]),

  heading2("11.4 Incidencias Anticipadas (Risk Register EPIC-03)"),
  makeTable([
    headerRow("ID","Incidencia","Probabilidad","Impacto","Mitigación"),
    dataRow(["INC-01","CNN tos: datos insuficientes","Alta","Alto","Dataset ESC-50 como sustituto temporal"],false),
    dataRow(["INC-02","RECORD_AUDIO Android 13+","Media","Medio","Fallback a MediaRecorder API web"],true),
    dataRow(["INC-03","Latencia IA > 5s en 3G","Media","Alto","Spinner + timeout 10s + retry x2"],false),
    dataRow(["INC-04","cockatiel incompatible Node 20","Alta","Medio","Circuit breaker manual implementado"],true),
    dataRow(["INC-05","RF confidence < 60%","Media","Alto","Ajuste hiperparámetros o migrar a XGBoost"],false),
  ], [1000, 3200, 1600, 1400, 3160]),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 12 — GUÍA PRÁCTICA 4 FASES
// ═══════════════════════════════════════════════════════════════════════════════
const seccion12 = [
  heading1("12. Guía Práctica de Elaboración — Las 4 Fases"),

  heading2("Fase I — Elaboración del Plan Estratégico"),
  para("La primera fase del proceso de planificación establece los cimientos del plan de pruebas. Para EPIC-03:"),
  bulletBold("Alcance definido", "EPIC-03 completa (HU-03.1, HU-03.2, HU-03.3). Excluidas: EPIC-01, EPIC-02 (ya validadas), EPIC-04+ (no desarrolladas)."),
  bulletBold("Balance automatización/manual", "70% automatizado (Jest, Pytest, Playwright, k6) + 30% manual (pruebas de dispositivo físico Android, exploratorias, usabilidad). Las pruebas de grabación de audio en dispositivo físico no pueden automatizarse completamente."),
  bulletBold("Recursos QA", "1 QA Lead (rol simulado), 3 desarrolladores con responsabilidad de sus propias pruebas unitarias. Tiempo total estimado: 16 horas para el Sprint 2."),
  bulletBold("Stopping Rules", "Definidas en Sección 5.3: cobertura ≥ 80%, ≤ 2 defectos Alta/Media residuales, 0 defectos Críticos."),

  heading2("Fase II — Establecer Casos de Prueba"),
  para("La segunda fase mapea requerimientos a condiciones lógicas y diseña los casos de prueba:"),
  makeTable([
    headerRow("Técnica","Aplicación en EPIC-03","Casos Generados"),
    dataRow(["Partición de Equivalencias","Inputs de síntomas (Sección 7.1.1)","CP-001, CP-002"],false),
    dataRow(["Análisis de Valores Límite","Confidence scores 0.0, 0.59, 0.60, 0.85, 1.0","CP-003, CP-004"],true),
    dataRow(["Tabla de Decisión","Flujo predicción (síntomas × disponibilidad IA)","CP-001, CP-005"],false),
    dataRow(["Prueba de Estado","Circuit breaker: CLOSED→OPEN→HALF-OPEN","CP-005"],true),
    dataRow(["Exploratoria (SFDIPOT)","Heurísticas sobre módulos de audio y panel doctor","CP-006 a CP-010"],false),
  ], [2600, 4400, 2360]),

  heading2("Fase III — Ambientes y Selección de Datos"),
  para("La tercera fase garantiza que el ambiente sea un reflejo fiel de producción y los datos sean representativos:"),
  bulletBold("Paridad de ambientes", "Docker Compose dev usa las mismas imágenes base que producción. Variables de entorno diferenciadas por archivo .env.test."),
  bulletBold("Control de versiones de datos", "Los scripts de seed están versionados en /scripts/seed/ y son reproducibles con npm run seed:test."),
  bulletBold("Datos sintéticos", "faker.js genera 10,000 pacientes para pruebas de carga. Dataset ESC-50 provee 2,000 muestras de audio para CNN."),
  bulletBold("Data masking", "PII enmascarada según script mask-patients.js (Sección 9.2). Cumplimiento LPD Perú Art. 3."),
  bulletBold("Aislamiento de datos", "Base de datos de prueba separada: respicare_test (MongoDB). Sin acceso a respicare_prod desde el ambiente de QA."),

  heading2("Fase IV — Ejecución Dinámica y Reportes"),
  para("La cuarta fase es la ejecución propiamente dicha y la generación de reportes:"),
  makeTable([
    headerRow("Artefacto","Contenido","Generado con"),
    dataRow(["Test Execution Log","Timestamp, ejecutor, caso, resultado, evidencia","Jest reporter + Pytest JUnit XML"],false),
    dataRow(["Incident Report","Defectos encontrados con clasificación ODC","Template Sección 11"],true),
    dataRow(["Coverage Report","Cobertura por módulo, delta vs. sprint anterior","Istanbul (JS) + Coverage.py (Python)"],false),
    dataRow(["Performance Report","P50/P95 latencias, error rate, throughput","k6 HTML report + Locust stats"],true),
    dataRow(["Test Status Report","Resumen ejecutivo semanal para el docente","Generado manualmente en base a los anteriores"],false),
  ], [2400, 4000, 2960]),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 13 — MÉTRICAS DE CALIDAD
// ═══════════════════════════════════════════════════════════════════════════════
const seccion13 = [
  heading1("13. Métricas de Calidad y Telemetría"),
  para("Las métricas de calidad de RespiCare Sprint 2 se monitorean mediante SonarQube (análisis estático) y OpenTelemetry (métricas de runtime). A continuación el estado actual y las metas:"),

  heading2("13.1 Dashboard de Métricas — Sprint 2"),
  makeTable([
    headerRow("Métrica","Referencia","Sprint 1 (Real)","Meta Sprint 2","Meta Sprint 3","Herramienta"),
    dataRow(["Cobertura de pruebas","SWEBOK §3.2","49.37%","≥ 65%","≥ 80%","Istanbul / Coverage.py"],false),
    dataRow(["Complejidad ciclomática","McCabe CC","Varios módulos > 15","CC ≤ 10 nuevos","CC ≤ 10 global","SonarQube"],true),
    dataRow(["Deuda técnica (horas)","SQALE Model","4.2 h","≤ 3 h","≤ 2 h","SonarQube"],false),
    dataRow(["Duplicación de código","DRY Principle","8.3%","≤ 5%","≤ 3%","SonarQube"],true),
    dataRow(["Accuracy RF (validation)","ISO 25010 §4.2","N/A (nuevo)","≥ 70%","≥ 80%","Sklearn metrics"],false),
    dataRow(["Latencia P95 /predict","SLA rendimiento","N/A","< 3s (WiFi)","< 3s (WiFi)","k6 / Prometheus"],true),
    dataRow(["Defect Escape Rate","IEEE 1044","No medido","< 10%","< 5%","JIRA / GitHub Issues"],false),
  ], [2600, 1800, 1600, 1600, 1600, 1560]),

  heading2("13.2 Evolución de Cobertura — Hoja de Ruta"),
  codeBlock([
    "Cobertura por módulo (meta Sprint 2):",
    "",
    "  backend/symptomService.ts     : 49% → 75% (+26%)",
    "  backend/circuitBreaker.ts     : 20% → 80% (+60%)  [crítico]",
    "  ai/predict_service.py         : 55% → 70% (+15%)",
    "  ai/cnn_audio_service.py       : 30% → 60% (+30%)  [difícil: requiere audio]",
    "  web/SymptomForm.tsx           : 60% → 75% (+15%)",
    "  web/DoctorDashboard.tsx       : 40% → 70% (+30%)",
    "  ────────────────────────────────────────────────────",
    "  TOTAL EPIC-03                 : ~42% → 65% meta",
  ]),

  heading2("13.3 Defect Rate Semanal — Semana 13"),
  makeTable([
    headerRow("Semana","Defectos Encontrados","Defectos Resueltos","Acumulado Abiertos","Estado"),
    dataRow(["Semana 10","8","5","3","🟡 Aceptable"],false),
    dataRow(["Semana 11","12","10","5","🟡 Aceptable"],true),
    dataRow(["Semana 12","6","7","4","🟢 Mejorando"],false),
    dataRow(["Semana 13 (actual)","—","—","—","⬜ En ejecución"],true),
    dataRow(["Meta Semana 13","≤ 8","≥ 8","≤ 4","🎯 Objetivo"],false),
  ], [1800, 2400, 2400, 2400, 1560]),

  heading2("13.4 Clasificación de Defectos por Severidad (Acumulado)"),
  makeTable([
    headerRow("Severidad","Descripción","Cantidad Sprint 1","Resueltos","Residuales","Bloqueo"),
    dataRow(["🔴 Crítica","Sistema inoperable, pérdida de datos","1","1","0","✅ Limpio"],false),
    dataRow(["🟠 Alta","Función principal afectada sin workaround","4","3","1","⚠️ 1 abierto"],true),
    dataRow(["🟡 Media","Función afectada con workaround disponible","9","7","2","✅ Dentro del límite"],false),
    dataRow(["🟢 Baja","Cosmético o minor usability","12","10","2","✅ Aceptable"],true),
  ], [1200, 3000, 2000, 1800, 1800, 1560]),
  pgBreak(),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 14 — DICTAMEN DEL QA LEAD
// ═══════════════════════════════════════════════════════════════════════════════
const seccion14 = [
  heading1("14. Dictamen del QA Lead — Conclusión Holística"),

  heading2("14.1 Las Pruebas como Mitigación de Riesgo"),
  para("La conclusión fundamental de este plan de pruebas trasciende la búsqueda de errores: las pruebas de software son, en esencia, un mecanismo de mitigación de riesgo empresarial y clínico. En el contexto de RespiCare —un sistema que asiste en el diagnóstico de enfermedades respiratorias en pacientes reales de Tacna— un defecto no detectado no es solo una deuda técnica: puede derivar en un diagnóstico erróneo."),
  para("Esta realidad eleva el rigor de la QA a una obligación ética. Cada caso de prueba ejecutado, cada coverage percentage ganado, cada circuit breaker validado, representa una decisión consciente de no comprometer la seguridad del paciente en aras de la velocidad de entrega."),

  heading2("14.2 Síntesis del Sprint 2 — EPIC-03"),
  makeTable([
    headerRow("Dimensión","Estado al Inicio del Plan","Meta al Final del Sprint 2"),
    dataRow(["Cobertura EPIC-03","~42% (estimado pre-sprint)","≥ 65%"],false),
    dataRow(["Casos de prueba documentados","0 (EPIC-03 nueva)","10 casos formales + exploratorios"],true),
    dataRow(["Circuit Breaker validado","No (implementación nueva)","CP-EPIC03-005 PASSED"],false),
    dataRow(["Modelo RF accuracy","No medido","≥ 70% en validación"],true),
    dataRow(["Ambiente sandbox IA","No configurado","Docker Compose EPIC-03 estable"],false),
    dataRow(["Pipeline CI EPIC-03","Parcial","Tests automáticos en GitHub Actions"],true),
  ], [2800, 3600, 2960]),

  heading2("14.3 Transición a Semana 14 — Base para Mantenimiento"),
  para("El sistema empíricamente validado al final del Sprint 2 constituye la base sólida para la fase de mantenimiento (Semana 14). Específicamente:"),
  bulletBold("Suite de regresión", "Los 10 casos de prueba de EPIC-03 que alcancen estado PASS se convierten en pruebas de regresión permanentes. Cualquier cambio futuro sobre este módulo debe pasar esta suite antes de fusionarse."),
  bulletBold("Baseline de métricas", "La cobertura del 65% documentada en el Sprint 2 es el piso a partir del cual el Sprint 3 construye. No se aceptará degradación."),
  bulletBold("Conocimiento transferido", "Este plan de pruebas, una vez archivado en docs/testing/, sirve como contrato de calidad para futuros integrantes del equipo que mantengan EPIC-03."),
  bulletBold("EPIC-04 en adelante", "Las lecciones aprendidas (INC-01 a INC-05, ODC classification, circuit breaker manual) informan el diseño de pruebas de las épicas pendientes."),

  heading2("14.4 Principio Rector Final"),
  new Paragraph({
    children:[
      new TextRun({ text:"\"La calidad no se inspecciona: se diseña estructuralmente", italics:true, size:26, color:C.darkBlue, font:"Calibri", bold:true }),
      new TextRun({ text:" y se valida matemáticamente.\"", italics:true, size:26, color:C.medBlue, font:"Calibri" }),
    ],
    alignment:AlignmentType.CENTER,
    spacing:{ before:200, after:200 },
    border:{
      top:{ style:BorderStyle.SINGLE, size:4, color:C.medBlue },
      bottom:{ style:BorderStyle.SINGLE, size:4, color:C.medBlue },
      left:{ style:BorderStyle.SINGLE, size:16, color:C.darkBlue },
    },
    indent:{ left:400, right:400 },
  }),
  para("El presente plan de pruebas establece que la QA de RespiCare no es una fase final de validación, sino un proceso continuo integrado desde el primer commit. Shift-Left, TDD, Canary Deployments, métricas DORA y el análisis ODC de defectos son las herramientas con las que el equipo convierte la calidad de un deseo en una propiedad medible y rastreable del sistema.", { before:160 }),

  new Paragraph({ spacing:{ before:400, after:80 } }),
  new Paragraph({
    children:[bold("Chávez Linares, Cesar Fabian", 24, C.darkBlue)],
    alignment:AlignmentType.RIGHT,
  }),
  new Paragraph({
    children:[normal("QA Lead (Rol Simulado) · Código: 2019063854", 22, C.medBlue)],
    alignment:AlignmentType.RIGHT,
  }),
  new Paragraph({
    children:[normal("Construcción de Software II · Ciclo X · Junio 2026", 22, C.medBlue)],
    alignment:AlignmentType.RIGHT,
  }),
  new Paragraph({
    children:[normal("Universidad Privada de Tacna — EPIS", 22, C.accentBlue)],
    alignment:AlignmentType.RIGHT,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
//  ASSEMBLE DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles:{
    default:{
      document:{
        run:{ font:"Calibri", size:24, color:C.black },
      },
    },
  },
  sections:[{
    properties:{
      page:{
        size:{ width:11906, height:16838 },
        margin:{ top:1440, bottom:1440, left:1440, right:1440 },
      },
      pageNumberStart:1,
    },
    headers:{
      default: new Header({
        children:[new Paragraph({
          children:[
            new TextRun({ text:"RespiCare · Plan de Pruebas de Software", bold:true, color:C.darkBlue, font:"Calibri", size:18 }),
            new TextRun({ text:"  |  EPIC-03: Sistema de Diagnóstico Inteligente", color:C.medBlue, font:"Calibri", size:18 }),
          ],
          border:{ bottom:{ style:BorderStyle.SINGLE, size:4, color:C.medBlue } },
        })],
      }),
    },
    footers:{
      default: new Footer({
        children:[new Paragraph({
          children:[
            new TextRun({ text:"Página ", font:"Calibri", size:18, color:C.accentBlue }),
            new PageNumberElement({ pageNumber: PageNumber.CURRENT }),
            new TextRun({ text:"  |  SWEBOK V4 & ISO/IEC/IEEE 29119-3  |  UPT · EPIS · Junio 2026", font:"Calibri", size:18, color:C.accentBlue }),
          ],
          alignment:AlignmentType.CENTER,
          border:{ top:{ style:BorderStyle.SINGLE, size:4, color:C.medBlue } },
        })],
      }),
    },
    children:[
      ...portada,
      ...seccion2,
      ...seccion3,
      ...seccion4,
      ...seccion5,
      ...seccion6,
      ...seccion7,
      ...seccion8,
      ...seccion9,
      ...seccion10,
      ...seccion11,
      ...seccion12,
      ...seccion13,
      ...seccion14,
    ],
  }],
});

// ─── OUTPUT ──────────────────────────────────────────────────────────────────
const outDir = path.resolve(__dirname, "../../docs/testing");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "Plan_Pruebas_Software_RespiCare.docx");

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`✅ Documento generado exitosamente.`);
  console.log(`   Ruta : ${outPath}`);
  console.log(`   Tamaño: ${kb} KB`);
  console.log(`   Páginas estimadas: ~35-40`);
}).catch(err => {
  console.error("❌ Error al generar el documento:", err);
  process.exit(1);
});