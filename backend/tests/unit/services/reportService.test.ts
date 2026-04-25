import reportService from '../../../src/services/reportService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock fs para evitar escritura real en disco
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue('[]'),
  writeFileSync: jest.fn(),
}));

// Mock uuid para IDs deterministas
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('report-uuid-123') }));

// Mock pdfGenerator
jest.mock('../../../src/utils/pdfGenerator', () => ({
  generateMedicalPdf: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
}));

const buildContext = (overrides: any = {}) => ({
  templateId: 'clinical-summary',
  patient: { id: 'patient-1', name: 'Juan Pérez', age: 45, gender: 'male' },
  doctor: { id: 'doctor-1', name: 'Dr. López', specialization: 'Pulmonología' },
  diagnosis: 'EPOC moderado',
  observations: 'Paciente con mejoría progresiva',
  recommendations: ['Evitar tabaco', 'Oxigenoterapia nocturna'],
  ...overrides,
});

describe('ReportService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listTemplates', () => {
    it('retorna al menos una plantilla disponible', () => {
      const templates = reportService.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('cada plantilla tiene id, name y sections', () => {
      const templates = reportService.listTemplates();
      templates.forEach(t => {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(Array.isArray(t.sections)).toBe(true);
        expect(t.sections.length).toBeGreaterThan(0);
      });
    });

    it('incluye plantilla clinical-summary', () => {
      const templates = reportService.listTemplates();
      expect(templates.some(t => t.id === 'clinical-summary')).toBe(true);
    });

    it('incluye plantilla treatment-plan', () => {
      const templates = reportService.listTemplates();
      expect(templates.some(t => t.id === 'treatment-plan')).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('genera reporte con plantilla válida', async () => {
      const record = await reportService.generateReport(buildContext());

      expect(record.id).toBe('report-uuid-123');
      expect(record.patientId).toBe('patient-1');
      expect(record.doctorId).toBe('doctor-1');
      expect(record.templateId).toBe('clinical-summary');
      expect(record.sharedWith).toEqual([]);
      expect(record.createdAt).toBeDefined();
    });

    it('lanza error cuando la plantilla no existe', async () => {
      await expect(
        reportService.generateReport(buildContext({ templateId: 'nonexistent-template' }))
      ).rejects.toThrow('no existe');
    });

    it('incluye shareWith en el registro', async () => {
      const record = await reportService.generateReport(
        buildContext({ shareWith: ['doctor-2', 'doctor-3'] })
      );

      expect(record.sharedWith).toContain('doctor-2');
      expect(record.sharedWith).toContain('doctor-3');
    });

    it('persiste el reporte en el historial', async () => {
      await reportService.generateReport(buildContext());

      const records = reportService.listReportsForPatient('patient-1');
      expect(records.some(r => r.id === 'report-uuid-123')).toBe(true);
    });

    it('genera reporte con plantilla treatment-plan', async () => {
      const record = await reportService.generateReport(buildContext({ templateId: 'treatment-plan' }));

      expect(record.templateId).toBe('treatment-plan');
    });
  });

  describe('listReportsForPatient', () => {
    it('retorna sólo reportes del paciente indicado', async () => {
      await reportService.generateReport(buildContext({ patient: { id: 'p-A', name: 'A', age: 30 } }));
      await reportService.generateReport(buildContext({ patient: { id: 'p-B', name: 'B', age: 40 } }));

      const patientAReports = reportService.listReportsForPatient('p-A');
      expect(patientAReports.every(r => r.patientId === 'p-A')).toBe(true);
    });

    it('retorna array vacío cuando el paciente no tiene reportes', () => {
      const reports = reportService.listReportsForPatient('no-patient');
      expect(reports).toEqual([]);
    });
  });

  describe('listReportsForDoctor', () => {
    it('retorna sólo reportes del doctor indicado', async () => {
      await reportService.generateReport(
        buildContext({ doctor: { id: 'dr-X', name: 'Dr. X', specialization: 'Medicina General' } })
      );

      const doctorReports = reportService.listReportsForDoctor('dr-X');
      expect(doctorReports.every(r => r.doctorId === 'dr-X')).toBe(true);
    });
  });

  describe('getReport', () => {
    it('retorna el reporte por id', async () => {
      await reportService.generateReport(buildContext());

      const report = reportService.getReport('report-uuid-123');
      expect(report).toBeDefined();
      expect(report!.id).toBe('report-uuid-123');
    });

    it('retorna undefined cuando el id no existe', () => {
      const report = reportService.getReport('nonexistent-id');
      expect(report).toBeUndefined();
    });
  });

  describe('shareReport', () => {
    it('agrega doctor al sharedWith del reporte', async () => {
      await reportService.generateReport(buildContext());

      const report = reportService.shareReport('report-uuid-123', 'doctor-shared');
      expect(report.sharedWith).toContain('doctor-shared');
    });

    it('no duplica doctor si ya está compartido', async () => {
      await reportService.generateReport(buildContext());
      reportService.shareReport('report-uuid-123', 'doctor-shared');
      const report = reportService.shareReport('report-uuid-123', 'doctor-shared');

      const count = report.sharedWith.filter(d => d === 'doctor-shared').length;
      expect(count).toBe(1);
    });

    it('lanza error cuando el reporte no existe', () => {
      expect(() => reportService.shareReport('nonexistent', 'doctor-1')).toThrow('no existe');
    });
  });

  describe('signReport', () => {
    it('firma el reporte con el doctorId y establece signedAt', async () => {
      await reportService.generateReport(buildContext());

      const report = reportService.signReport('report-uuid-123', 'doctor-signer');
      expect(report.signedBy).toBe('doctor-signer');
      expect(report.signedAt).toBeDefined();
    });

    it('lanza error cuando el reporte no existe', () => {
      expect(() => reportService.signReport('nonexistent', 'doctor-1')).toThrow('no existe');
    });
  });
});