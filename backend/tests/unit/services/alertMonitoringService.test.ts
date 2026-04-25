import alertMonitoringService from '../../../src/services/alertMonitoringService';
import AlertModel from '../../../src/models/Alert';
import { getRedisClient } from '../../../src/config/redisClient';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const redisMock = {
  zCard: jest.fn(),
  zRangeWithScores: jest.fn(),
  zRangeByScore: jest.fn(),
};

jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn(() => redisMock),
}));

const countDocumentsMock = jest.fn();
const findOneMock = jest.fn();
const findMock = jest.fn();

jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: {
    countDocuments: (...args: any[]) => countDocumentsMock(...args),
    findOne: (...args: any[]) => findOneMock(...args),
    find: (...args: any[]) => findMock(...args),
  },
}));

const buildChainableQuery = (result: any) => {
  const query = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return query;
};

describe('alertMonitoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(redisMock);
  });

  it('obtiene snapshot usando Redis cuando está disponible', async () => {
    const now = Date.now();
    redisMock.zCard.mockResolvedValueOnce(3);
    redisMock.zRangeWithScores.mockResolvedValueOnce([{ value: 'alert-1', score: now + 10_000 }]);
    redisMock.zRangeByScore.mockResolvedValueOnce(['alert-1', 'alert-2']);

    countDocumentsMock
      .mockResolvedValueOnce(4) // pending
      .mockResolvedValueOnce(6) // scheduled
      .mockResolvedValueOnce(2) // failed
      .mockResolvedValueOnce(5) // delivered today
      .mockResolvedValueOnce(1) // failed last 24h
      .mockResolvedValueOnce(2); // critical open

    findMock.mockReturnValue(
      buildChainableQuery([
        {
          _id: 'alert-failed',
          title: 'Entrega API fallida',
          userId: 'user-1',
          priority: 'high',
          lastError: 'Push channel unavailable',
          updatedAt: new Date(),
        },
      ])
    );

    const snapshot = await alertMonitoringService.getSnapshot();

    expect(snapshot.queue.scheduledSize).toBe(3);
    expect(snapshot.queue.nextScheduledAlertId).toBe('alert-1');
    expect(snapshot.queue.scheduledWithinHour).toBe(2);

    expect(snapshot.alerts).toEqual({
      pending: 4,
      scheduled: 6,
      failed: 2,
      deliveredToday: 5,
      failedLast24h: 1,
      criticalOpen: 2,
    });

    expect(snapshot.recentFailures).toHaveLength(1);
    expect(snapshot.recentFailures[0].id).toBe('alert-failed');
  });

  it('utiliza fallback a MongoDB cuando Redis no está disponible', async () => {
    (getRedisClient as jest.Mock).mockReturnValue(null);

    findOneMock.mockReturnValue(
      buildChainableQuery({
        _id: 'alert-scheduled',
        scheduledAt: new Date(Date.now() + 5_000),
      })
    );

    countDocumentsMock
      .mockResolvedValueOnce(6) // scheduledSize
      .mockResolvedValueOnce(3) // within hour
      .mockResolvedValue(0);

    findMock.mockReturnValue(buildChainableQuery([]));

    const snapshot = await alertMonitoringService.getSnapshot();

    expect(snapshot.queue.scheduledSize).toBe(6);
    expect(snapshot.queue.nextScheduledAlertId).toBe('alert-scheduled');
  });
});

