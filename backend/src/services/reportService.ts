/**
 * Report Service
 * Genera reportes médicos profesionales, administra historial y firmas digitales
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateMedicalPdf, PdfSection } from '../utils/pdfGenerator';
import { logger } from '../utils/logger';

type ReportTemplate = {
  id: string;
  name: string;
  description?: string;
  sections: Array<{
    title: string;
    body: (context: ReportContext) => string | string[];
  }>;
};

type ReportContext = {
  patient: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
  };
  doctor: {
    id: string;
    name: string;
    specialization?: string;
  };
  observations?: string;
  diagnosis?: string;
  recommendations?: string[];
  metrics?: Record<string, any>;
};

export type GenerateReportOptions = ReportContext & {
  templateId: string;
  shareWith?: string[];
  footer?: string;
};

type ReportRecord = {
  id: string;
  patientId: string;
  doctorId: string;
  templateId: string;
  title: string;
  filePath: string;
  sharedWith: string[];
  createdAt: string;
  signedBy?: string;
  signedAt?: string;
};

class ReportService {
  private readonly templates: ReportTemplate[] = [
    {
      id: 'clinical-summary',
      name: 'Resumen Clínico',
      description: 'Resumen general de consulta médica',
      sections: [
        {
          title: 'Diagnóstico',
          body: (ctx) => ctx.diagnosis ?? 'Sin diagnóstico registrado.',
        },
        {
          title: 'Observaciones',
          body: (ctx) => ctx.observations ?? 'Sin observaciones adicionales.',
        },
        {
          title: 'Recomendaciones',
          body: (ctx) =>
            ctx.recommendations && ctx.recommendations.length
              ? ctx.recommendations
              : ['Seguir indicaciones del especialista.'],
        },
      ],
    },
    {
      id: 'treatment-plan',
      name: 'Plan de Tratamiento',
      description: 'Detalles del plan terapéutico',
      sections: [
        {
          title: 'Diagnóstico',
          body: (ctx) => ctx.diagnosis ?? '—',
        },
        {
          title: 'Plan terapéutico',
          body: (ctx) => ctx.recommendations ?? ['Sin plan establecido'],
        },
        {
          title: 'Notas del especialista',
          body: (ctx) => ctx.observations ?? '—',
        },
      ],
    },
  ];

  private readonly storageDir = path.join(process.cwd(), 'reports');
  private readonly historyFile = path.join(this.storageDir, 'history.json');
  private history: ReportRecord[] = [];

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    fs.mkdirSync(this.storageDir, { recursive: true });
    if (fs.existsSync(this.historyFile)) {
      try {
        const raw = fs.readFileSync(this.historyFile, 'utf8');
        this.history = JSON.parse(raw);
      } catch (error) {
        logger.warn('No se pudo cargar historial de reportes, se reiniciará', { error });
        this.history = [];
      }
    }
  }

  private persistHistory() {
    fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2), 'utf8');
  }

  listTemplates(): ReportTemplate[] {
    return this.templates;
  }

  async generateReport(options: GenerateReportOptions): Promise<ReportRecord> {
    const template = this.templates.find((t) => t.id === options.templateId);
    if (!template) {
      throw new Error(`La plantilla ${options.templateId} no existe`);
    }

    const reportId = uuidv4();
    const sections: PdfSection[] = template.sections.map((section) => ({
      title: section.title,
      content: section.body(options),
    }));

    const buffer = await generateMedicalPdf({
      patient: options.patient,
      doctor: options.doctor,
      report: {
        title: template.name,
        generatedAt: new Date(),
        sections,
        footer: options.footer ?? 'Generado automáticamente por RespiCare',
      },
      outputPath: path.join(this.storageDir, `${reportId}.pdf`),
    });

    fs.writeFileSync(path.join(this.storageDir, `${reportId}.pdf`), buffer);

    const record: ReportRecord = {
      id: reportId,
      patientId: options.patient.id,
      doctorId: options.doctor.id,
      templateId: template.id,
      title: template.name,
      filePath: path.join(this.storageDir, `${reportId}.pdf`),
      sharedWith: options.shareWith ?? [],
      createdAt: new Date().toISOString(),
    };

    this.history.unshift(record);
    this.persistHistory();

    return record;
  }

  listReportsForPatient(patientId: string): ReportRecord[] {
    return this.history.filter((record) => record.patientId === patientId);
  }

  listReportsForDoctor(doctorId: string): ReportRecord[] {
    return this.history.filter((record) => record.doctorId === doctorId);
  }

  getReport(reportId: string): ReportRecord | undefined {
    return this.history.find((record) => record.id === reportId);
  }

  shareReport(reportId: string, doctorId: string): ReportRecord {
    const report = this.getReport(reportId);
    if (!report) {
      throw new Error('El reporte no existe');
    }

    if (!report.sharedWith.includes(doctorId)) {
      report.sharedWith.push(doctorId);
      this.persistHistory();
    }

    return report;
  }

  signReport(reportId: string, doctorId: string): ReportRecord {
    const report = this.getReport(reportId);
    if (!report) {
      throw new Error('El reporte no existe');
    }

    report.signedBy = doctorId;
    report.signedAt = new Date().toISOString();
    this.persistHistory();
    return report;
  }
}

export const reportService = new ReportService();

export default reportService;

