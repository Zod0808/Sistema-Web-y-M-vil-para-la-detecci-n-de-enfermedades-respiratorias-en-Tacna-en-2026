import * as controller from '../../../src/controllers/automaticReportController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/automaticReportService', () => ({
  automaticReportService: {
    getLatestReport: jest.fn(),
    generateReport: jest.fn(),
    exportReport: jest.fn(),
    getReportStats: jest.fn(),
    getReportsByType: jest.fn(),
  },
}));

jest.mock('../../../src/models/AutomaticReport', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

jest.mock('path', () => ({
  basename: jest.fn().mockReturnValue('report.pdf'),
}));

const { automaticReportService } = require('../../../src/services/automaticReportService');
const AutomaticReport = require('../../../src/models/AutomaticReport').default;

const buildReq = (overrides: Partial<any> = {}): any => ({
  user: { _id: 'admin-1', role: 'admin' },
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const download = jest.fn().mockImplementation((_path, _name, cb) => cb && cb());
  const type = jest.fn().mockReturnThis();
  const send = jest.fn();
  return { status, json, download, type, send, headersSent: false } as any;
};

const buildReport = (overrides: Partial<any> = {}) => ({
  _id: 'report-1',
  reportType: 'daily',
  status: 'completed',
  period: { startDate: new Date(), endDate: new Date() },
  metrics: { totalPatients: 100 },
  ...overrides,
});

describe('automaticReportController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAllReports', () => {
    it('retorna lista paginada de reportes', async () => {
      const reports = [buildReport(), buildReport({ _id: 'report-2' })];
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(reports) }),
          }),
        }),
      });
      AutomaticReport.countDocuments.mockResolvedValue(2);

      const req = buildReq({ query: { page: '1', limit: '20' } });
      const res = buildRes();

      await controller.getAllReports(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('filtra por tipo de reporte', async () => {
      AutomaticReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      });
      AutomaticReport.countDocuments.mockResolvedValue(0);

      const req = buildReq({ query: { type: 'daily' } });
      await controller.getAllReports(req, buildRes(), jest.fn());

      expect(AutomaticReport.find).toHaveBeenCalledWith(expect.objectContaining({ reportType: 'daily' }));
    });
  });

  describe('getReportById', () => {
    it('retorna reporte por ID', async () => {
      const report = buildReport();
      AutomaticReport.findById.mockResolvedValue(report);

      const req = buildReq({ params: { id: 'report-1' } });
      const res = buildRes();

      await controller.getReportById(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lanza 404 cuando el reporte no existe', async () => {
      AutomaticReport.findById.mockResolvedValue(null);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const next = jest.fn();

      await controller.getReportById(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('getLatestReport', () => {
    it('retorna el último reporte del tipo dado', async () => {
      const report = buildReport();
      automaticReportService.getLatestReport.mockResolvedValue(report);

      const req = buildReq({ params: { type: 'daily' } });
      const res = buildRes();

      await controller.getLatestReport(req, res, jest.fn());

      expect(automaticReportService.getLatestReport).toHaveBeenCalledWith('daily');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lanza 400 para tipo inválido', async () => {
      const req = buildReq({ params: { type: 'invalid_type' } });
      const next = jest.fn();

      await controller.getLatestReport(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('generateReport', () => {
    it('genera reporte como admin con fechas explícitas', async () => {
      const report = buildReport();
      automaticReportService.generateReport.mockResolvedValue(report);

      const req = buildReq({
        user: { _id: 'admin-1', role: 'admin' },
        body: {
          reportType: 'daily',
          startDate: '2026-04-01',
          endDate: '2026-04-02',
        },
      });
      const res = buildRes();

      await controller.generateReport(req, res, jest.fn());

      expect(automaticReportService.generateReport).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('genera reporte sin fechas (usa período automático)', async () => {
      automaticReportService.generateReport.mockResolvedValue(buildReport());

      const req = buildReq({
        user: { _id: 'admin-1', role: 'admin' },
        body: { reportType: 'weekly' },
      });

      await controller.generateReport(req, buildRes(), jest.fn());

      expect(automaticReportService.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: 'weekly', period: expect.any(Object) })
      );
    });

    it('lanza 403 cuando no es admin', async () => {
      const req = buildReq({
        user: { _id: 'doctor-1', role: 'doctor' },
        body: { reportType: 'daily' },
      });
      const next = jest.fn();

      await controller.generateReport(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('lanza 400 para tipo de reporte inválido', async () => {
      const req = buildReq({
        user: { _id: 'admin-1', role: 'admin' },
        body: { reportType: 'invalid' },
      });
      const next = jest.fn();

      await controller.generateReport(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('getReportStats', () => {
    it('retorna estadísticas para admin', async () => {
      const stats = { total: 50, daily: 10, weekly: 5, monthly: 2 };
      automaticReportService.getReportStats.mockResolvedValue(stats);

      const req = buildReq({ user: { _id: 'admin-1', role: 'admin' } });
      const res = buildRes();

      await controller.getReportStats(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lanza 403 para no-admin', async () => {
      const req = buildReq({ user: { _id: 'doc-1', role: 'doctor' } });
      const next = jest.fn();

      await controller.getReportStats(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  describe('getReportsByType', () => {
    it('retorna reportes del tipo dado', async () => {
      automaticReportService.getReportsByType.mockResolvedValue([buildReport()]);

      const req = buildReq({ params: { type: 'monthly' }, query: { limit: '10' } });
      const res = buildRes();

      await controller.getReportsByType(req, res, jest.fn());

      expect(automaticReportService.getReportsByType).toHaveBeenCalledWith('monthly', 10);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lanza 400 para tipo inválido', async () => {
      const req = buildReq({ params: { type: 'annual' } });
      const next = jest.fn();

      await controller.getReportsByType(req, buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });
});