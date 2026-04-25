import * as controller from '../../../src/controllers/smsMetricsController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/smsMetricsService', () => ({
  smsMetricsService: {
    getMetrics: jest.fn(),
    getCosts: jest.fn(),
  },
}));

jest.mock('../../../src/services/smsService', () => ({
  smsService: {
    getRateLimitStats: jest.fn(),
  },
}));

jest.mock('../../../src/middleware/rbac', () => ({
  requireRole: jest.fn().mockReturnValue(jest.fn()),
}));

const { smsMetricsService } = require('../../../src/services/smsMetricsService');
const { smsService } = require('../../../src/services/smsService');

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
  return { status, json } as any;
};

describe('smsMetricsController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getSMSMetrics', () => {
    it('retorna métricas sin filtro de proveedor', async () => {
      const metrics = { totalSent: 100, totalDelivered: 90, successRate: 90 };
      smsMetricsService.getMetrics.mockResolvedValue(metrics);

      const req = buildReq({ query: {} });
      const res = buildRes();

      await controller.getSMSMetrics(req, res, jest.fn());

      expect(smsMetricsService.getMetrics).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: metrics })
      );
    });

    it('filtra por proveedor cuando se especifica', async () => {
      smsMetricsService.getMetrics.mockResolvedValue({});

      const req = buildReq({ query: { provider: 'twilio' } });
      await controller.getSMSMetrics(req, buildRes(), jest.fn());

      expect(smsMetricsService.getMetrics).toHaveBeenCalledWith('twilio');
    });

    it('propaga error al next', async () => {
      smsMetricsService.getMetrics.mockRejectedValue(new Error('Redis error'));

      const next = jest.fn();
      await controller.getSMSMetrics(buildReq(), buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getSMSCosts', () => {
    it('retorna costos sin filtros', async () => {
      const costs = { total: 0.75, byProvider: {}, records: [] };
      smsMetricsService.getCosts.mockResolvedValue(costs);

      const req = buildReq({ query: {} });
      const res = buildRes();

      await controller.getSMSCosts(req, res, jest.fn());

      expect(smsMetricsService.getCosts).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: costs })
      );
    });

    it('convierte fechas de string a Date', async () => {
      smsMetricsService.getCosts.mockResolvedValue({});

      const req = buildReq({
        query: {
          startDate: '2026-01-01',
          endDate: '2026-04-01',
          provider: 'twilio',
        },
      });

      await controller.getSMSCosts(req, buildRes(), jest.fn());

      expect(smsMetricsService.getCosts).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'twilio'
      );
    });

    it('propaga error al next', async () => {
      smsMetricsService.getCosts.mockRejectedValue(new Error('Costs error'));

      const next = jest.fn();
      await controller.getSMSCosts(buildReq(), buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getRateLimitStats', () => {
    it('retorna estadísticas de rate limiting', async () => {
      const stats = { current: { minute: 5, hour: 50, day: 200 }, limits: {} };
      smsService.getRateLimitStats.mockResolvedValue(stats);

      const res = buildRes();
      await controller.getRateLimitStats(buildReq(), res, jest.fn());

      expect(smsService.getRateLimitStats).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: stats })
      );
    });

    it('propaga error al next', async () => {
      smsService.getRateLimitStats.mockRejectedValue(new Error('Stats error'));

      const next = jest.fn();
      await controller.getRateLimitStats(buildReq(), buildRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});