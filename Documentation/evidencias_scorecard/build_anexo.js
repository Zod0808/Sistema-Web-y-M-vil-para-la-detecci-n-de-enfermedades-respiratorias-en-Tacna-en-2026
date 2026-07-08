const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageOrientation, PageBreak, PageNumber, Header, Footer,
  LevelFormat, TabStopType, TabStopPosition,
} = require('C:/Users/User/AppData/Local/Temp/docx-build/node_modules/docx');

const OUT = 'Documentation/Anexo_Evidencias_CSS_UnidadIII.docx';
const IMG_PRS = 'Documentation/evidencias_scorecard/figura_dependabot_prs.png';
const IMG_SC  = 'Documentation/evidencias_scorecard/figura_scorecard_5_2.png';

const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };

const CONTENT_W = 9360; // Letter with 1" margins

function P(text, opts={}) {
  return new Paragraph({
    ...opts,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color })]
  });
}
function H(level, text) {
  const HL = {1:HeadingLevel.HEADING_1, 2:HeadingLevel.HEADING_2, 3:HeadingLevel.HEADING_3}[level];
  return new Paragraph({ heading: HL, children: [new TextRun(text)] });
}
function Bul(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, children:[new TextRun(text)] });
}
function Cap(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER,
    children:[new TextRun({ text, italics:true, size:20, color:"555555" })],
    spacing: { before: 60, after: 240 }
  });
}

function tableRow(cells, opts={}) {
  const nCols = cells.length;
  const colW = Math.floor(CONTENT_W / nCols);
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      borders,
      width: { size: colW, type: WidthType.DXA },
      shading: opts.header ? { fill: "3B4B72", type: ShadingType.CLEAR } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({
          text: c,
          bold: opts.header || false,
          color: opts.header ? "FFFFFF" : "000000",
          size: 20
        })]
      })]
    }))
  });
}
function T(headers, rows) {
  const nCols = headers.length;
  const colW = Math.floor(CONTENT_W / nCols);
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: Array(nCols).fill(colW),
    rows: [ tableRow(headers, { header: true }), ...rows.map(r => tableRow(r)) ]
  });
}
function Img(filePath, w, h, caption) {
  const buf = fs.readFileSync(filePath);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: "png",
        data: buf,
        transformation: { width: w, height: h },
        altText: { title: caption, description: caption, name: path.basename(filePath) }
      })]
    }),
    Cap(caption)
  ];
}

const children = [];

// PORTADA
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children:[new TextRun({ text:"", size:24 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children:[new TextRun({ text:"ANEXO DE EVIDENCIAS MEDIDAS", bold:true, size:48 })]
}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing:{ after:120 },
  children:[new TextRun({ text:"Seguridad de la Cadena de Suministro de Software — Unidad III", size:28 })]
}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing:{ after:120 },
  children:[new TextRun({ text:"Complemento a las Secciones 4.2.2 y 5.3 del informe principal", italics:true, size:22, color:"555555" })]
}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing:{ before:480, after:240 },
  children:[new TextRun({ text:"Proyecto RespiCare", bold:true, size:26 })]
}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children:[new TextRun({ text:"Repositorio: github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026", size:18, color:"555555" })]
}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing:{ before:120 },
  children:[new TextRun({ text:"Fecha de recolección: 2026-07-07", size:20 })]
}));
children.push(new Paragraph({ children:[new PageBreak()] }));

// ---- 1. Resumen ejecutivo ----
children.push(H(1, "1. Resumen ejecutivo"));
children.push(P("Este anexo consolida las evidencias empíricas recolectadas después de la publicación del informe principal, correspondientes a dos rubros que quedaron declarados como PENDIENTE o como proyección:", { spacing:{ after:120 } }));
children.push(Bul("Sec 4.2.2 — Actividad real de los Pull Requests generados por Dependabot."));
children.push(Bul("Sec 5.3 — Postura del repositorio medida por OpenSSF Scorecard (reemplazo de la proyección de la Tabla 8)."));
children.push(P("Las mediciones se obtuvieron mediante la API pública de GitHub (github.com/repos), la API pública de OpenSSF Scorecard (api.scorecard.dev) y la ejecución del workflow oficial de OpenSSF Scorecard en el repositorio. Los resultados son reproducibles a partir de los commits indicados en cada sección.", { spacing:{ after:240 } }));

children.push(H(2, "Cambios de código incorporados para lograr las mediciones"));
children.push(T(
  ["Commit","Cambio","Efecto"],
  [
    ["a3e3996","Habilita workflow OpenSSF Scorecard; añade allowlist a gitleaks; migra hook de TruffleHog a Docker","Habilita medición continua y desbloquea pre-commit en Windows"],
    ["a119517","Declara top-level permissions: contents: read en 19 workflows","Prepara la mejora del check Token-Permissions"],
    ["6cccb51","Amplía el filtro de rutas del trigger de Scorecard","Re-medición automática al modificar cualquier workflow"],
    ["b1d39c1","Mueve security-events: write y contents: write a job-level en 5 workflows","Token-Permissions 0/10 → 10/10; score agregado 4.4 → 5.2"],
  ]
));
children.push(new Paragraph({ children:[new PageBreak()] }));

// ---- 2. Evidencia Sec 4.2.2 ----
children.push(H(1, "2. Evidencia Sec 4.2.2 — Dependabot"));
children.push(P("El informe principal declaró la evidencia de los Pull Requests generados por Dependabot como diferida, con una ventana esperada de 24–48 horas después del push de dependabot.yml, siguiendo la referencia de Chinthanet et al. (2021). La medición empírica sobre el propio repositorio muestra un comportamiento sensiblemente más rápido.", { spacing:{ after:180 } }));

children.push(H(2, "2.1 Cronología medida"));
children.push(T(
  ["Métrica","Valor medido"],
  [
    ["Push de .github/dependabot.yml (commit 0ac879c)","2026-07-04 12:36:59 UTC"],
    ["Primer Pull Request creado por dependabot[bot]","2026-07-04 12:49:27 UTC"],
    ["Último Pull Request del lote inicial","2026-07-04 12:51:04 UTC"],
    ["Lag push → primer PR","~12 minutos"],
    ["Ventana total de generación (42 PRs)","~2 minutos"],
    ["Total PRs generados por Dependabot","42"],
    ["Estado al 2026-07-07","42 / 42 abiertos"],
  ]
));

children.push(H(2, "2.2 Distribución por ecosistema"));
children.push(T(
  ["Directorio","PRs","Ecosistema"],
  [
    ["/web","11","npm (React)"],
    ["/backend","11","npm (Node/Express)"],
    ["/ai-services","7","pip (Python)"],
    ["/mobile/medical-app","6","npm (Capacitor/Next)"],
    ["/","6","github-actions"],
    ["/nginx","1","docker"],
    ["Total","42","6 ecosistemas"],
  ]
));
children.push(P("Distribución complementaria por naturaleza de la dependencia: 34 producción / 8 desarrollo.", { spacing:{ before:120, after:180 } }));

children.push(H(2, "2.3 Evidencia visual"));
children.push(...Img(IMG_PRS, 480, 848, "Figura 1. Panel /pulls de GitHub filtrado por author:app/dependabot (42 PRs abiertos)."));

children.push(H(2, "2.4 Interpretación"));
children.push(P("El lag empírico de ~12 minutos es aproximadamente 200 veces menor que la cota inferior del rango 24–48 h reportado por Chinthanet et al. (2021). La diferencia se atribuye a dos factores: (a) la integración nativa Dependabot–GitHub Actions vigente desde 2023, que ejecuta el escaneo inmediatamente al detectar cambios en dependabot.yml, y (b) la disponibilidad continua del catálogo de advisories de GitHub, sin necesidad de sincronización nocturna. En términos prácticos, el pipeline de RespiCare habilita respuesta a nuevos CVEs en la escala de minutos y no de días, superando el objetivo declarado en el informe principal.", { spacing:{ after:180 } }));

children.push(H(2, "2.5 URLs verificables"));
children.push(Bul("https://github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026/pulls?q=is%3Apr+author%3Aapp%2Fdependabot"));
children.push(Bul("Archivo adjunto: dependabot_prs_2026-07-04.csv (listado completo de los 42 PRs con timestamp, tipo, directorio y paquete)."));
children.push(new Paragraph({ children:[new PageBreak()] }));

// ---- 3. Evidencia Sec 5.3 ----
children.push(H(1, "3. Evidencia Sec 5.3 — OpenSSF Scorecard"));
children.push(P("El informe principal presentó en la Tabla 8 una proyección de puntuación agregada de 7/10, obtenida a partir de la ejecución headless local que reportó 0.0/10 por checks en error. Con la publicación del workflow oficial de OpenSSF Scorecard en el repositorio, ahora se cuenta con la medición completa firmada por scorecard.dev.", { spacing:{ after:180 } }));

children.push(H(2, "3.1 Progresión de mediciones"));
children.push(T(
  ["Run","Commit","Fecha UTC","Score","Cambio principal"],
  [
    ["#1","a3e3996","2026-07-07 20:15","4.1 / 10","Baseline post-habilitación del workflow"],
    ["#2","a119517","2026-07-07 20:43","4.4 / 10","Packaging N/A → 10 (re-scan)"],
    ["#3","b1d39c1","2026-07-07 21:07","5.2 / 10","Token-Permissions 0 → 10"],
  ]
));

children.push(H(2, "3.2 Desglose de la medición final (5.2 / 10)"));
children.push(T(
  ["Check","Severidad","Score","Nota"],
  [
    ["Dangerous-Workflow","Critical","10/10","Sin patrones peligrosos"],
    ["Dependency-Update-Tool","High","10/10","Dependabot activo (confirma Sec 4.2.2)"],
    ["License","Low","10/10","LICENSE presente"],
    ["Packaging","Medium","10/10","Metadatos de release detectados"],
    ["SAST","Medium","10/10","Semgrep en pipeline (confirma Sec 4.5)"],
    ["Security-Policy","Medium","10/10","SECURITY.md publicado"],
    ["Token-Permissions","High","10/10","Todos los workflows con permissions mínimos"],
    ["Binary-Artifacts","High","7/10","Presencia de binarios (assets del informe)"],
    ["Pinned-Dependencies","Medium","3/10","Actions pineadas por SHA; npm/pip por versión"],
    ["Branch-Protection","High","0/10","No hay reglas de protección de rama"],
    ["CII-Best-Practices","Low","0/10","Sin badge OpenSSF Best Practices"],
    ["Code-Review","High","0/10","Proyecto unipersonal, 0/30 changesets con approval"],
    ["Contributors","Low","0/10","0 organizaciones contribuyentes"],
    ["Fuzzing","Medium","0/10","Fuera de alcance"],
    ["Maintained","High","0/10","Repo con antigüedad < 90 días"],
    ["Vulnerabilities","High","0/10","258 CVEs vivos detectados"],
    ["CI-Tests","Low","N/A","No hay PRs para evaluar (0 changesets)"],
    ["Signed-Releases","High","N/A","Sin releases publicados aún"],
  ]
));

children.push(H(2, "3.3 Comparación proyección vs. medición real"));
children.push(T(
  ["Dimensión","Proyección informe","Medido real","Delta"],
  [
    ["Score agregado","7.0 / 10","5.2 / 10","−1.8"],
    ["Token-Permissions","alto (previsto)","10 / 10","cumplido"],
    ["Pinned-Dependencies","alto (previsto)","3 / 10","brecha por npm/pip"],
    ["Vulnerabilities","moderado (previsto)","0 / 10","258 CVEs"],
  ]
));
children.push(P("La brecha de −1.8 puntos entre proyección y medición se explica principalmente por dos checks que el equipo no dimensionó en el ejercicio de proyección: Vulnerabilities, que aporta 25% del peso total y en el estado actual está en 0/10 por los 258 CVEs vivos aportados por dependencias transitivas, y Branch-Protection, que exige configuración manual desde la UI de GitHub y no puede derivarse del código. Esta observación es material para la Discusión de la Unidad: la evaluación a priori de OpenSSF Scorecard tiende a subestimar el efecto de checks que dependen de estado remoto no versionado.", { spacing:{ after:180 } }));

children.push(H(2, "3.4 Evidencia visual"));
children.push(...Img(IMG_SC, 480, 680, "Figura 2. Reporte OpenSSF Scorecard v5.0.0 en scorecard.dev — score agregado 5.2/10, commit b1d39c1, generado 2026-07-07 21:07:12 UTC."));

children.push(H(2, "3.5 URLs verificables"));
children.push(Bul("https://scorecard.dev/viewer/?uri=github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026"));
children.push(Bul("https://api.scorecard.dev/projects/github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026"));
children.push(new Paragraph({ children:[new PageBreak()] }));

// ---- 4. Trabajo futuro ----
children.push(H(1, "4. Ruta cuantificada para elevar el score agregado"));
children.push(P("A partir del desglose por check, se identifican cuatro palancas ordenadas por relación esfuerzo/puntos:", { spacing:{ after:120 } }));
children.push(T(
  ["Palanca","Acción concreta","Δ estimado","Esfuerzo"],
  [
    ["Branch-Protection","Activar Rulesets en Settings → Branches para main/fabian","+0.6","10 min manual"],
    ["Vulnerabilities","Mergear los 42 PRs de Dependabot que no rompan build (Tarea 4)","+1.5 a +2.0","2–4 h"],
    ["Pinned-Dependencies","Usar package-lock.json pinning estricto + integridad SRI","+0.5","1 h"],
    ["Signed-Releases","Publicar primer release firmado con Sigstore","+0.5","30 min tras release"],
  ]
));
children.push(P("Escenario objetivo tras aplicar las cuatro palancas: 5.2 → aproximadamente 7.8 / 10, superando la proyección original del informe (7/10).", { spacing:{ before:120, after:180 } }));

// ---- 5. Metodología ----
children.push(H(1, "5. Metodología de recolección"));
children.push(Bul("PRs de Dependabot: consulta GET /repos/{owner}/{repo}/pulls?state=all&per_page=100 filtrada por user.login=='dependabot[bot]'."));
children.push(Bul("Timestamp de push de dependabot.yml: obtenido con git log --follow --format=%ai sobre .github/dependabot.yml (commit 0ac879c)."));
children.push(Bul("Score de OpenSSF Scorecard: obtenido del workflow oficial ossf/scorecard-action@v2.4.0 fijado por SHA en .github/workflows/scorecard.yml, y consultado por API en api.scorecard.dev."));
children.push(Bul("Todas las Actions utilizadas en el nuevo workflow están fijadas por SHA (commit hash), contribuyendo directamente al check Pinned-Dependencies."));
children.push(P("La totalidad de los datos es públicamente verificable a través de las URLs incluidas y los timestamps de los commits mencionados.", { spacing:{ before:180 } }));

// ---- Documento ----
const doc = new Document({
  creator: "RespiCare",
  title: "Anexo de Evidencias — CSS Unidad III",
  description: "Evidencias medidas para las Secciones 4.2.2 y 5.3",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:32, bold:true, font:"Arial", color:"1F3864" },
        paragraph:{ spacing:{ before:280, after:180 }, outlineLevel:0 } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:26, bold:true, font:"Arial", color:"2E528F" },
        paragraph:{ spacing:{ before:220, after:120 }, outlineLevel:1 } },
      { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:23, bold:true, font:"Arial", color:"365F91" },
        paragraph:{ spacing:{ before:180, after:80 }, outlineLevel:2 } },
    ]
  },
  numbering: {
    config: [{ reference:"bullets", levels: [{
      level:0, format:LevelFormat.BULLET, text:"•", alignment: AlignmentType.LEFT,
      style:{ paragraph:{ indent:{ left:720, hanging:360 } } }
    }]}]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children:[new Paragraph({
        alignment: AlignmentType.RIGHT,
        children:[new TextRun({ text:"Anexo de Evidencias — CSS Unidad III", italics:true, size:18, color:"777777" })]
      })]})
    },
    footers: {
      default: new Footer({ children:[new Paragraph({
        alignment: AlignmentType.CENTER,
        children:[new TextRun({ text:"Página ", size:18, color:"777777" }),
                  new TextRun({ children:[PageNumber.CURRENT], size:18, color:"777777" }),
                  new TextRun({ text:" de ", size:18, color:"777777" }),
                  new TextRun({ children:[PageNumber.TOTAL_PAGES], size:18, color:"777777" })]
      })]})
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log(`OK: ${OUT} (${buf.length} bytes)`);
}).catch(err => { console.error(err); process.exit(1); });
