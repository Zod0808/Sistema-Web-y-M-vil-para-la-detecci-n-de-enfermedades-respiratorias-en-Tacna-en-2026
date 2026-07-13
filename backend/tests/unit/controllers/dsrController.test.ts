import { exportUserData, deleteUserData } from '../../../src/controllers/dsrController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/utils/anonymization', () => ({
  anonymizeForAnalytics: jest.fn().mockImplementation((obj) => ({ ...obj, patientId: 'HASH' })),
}));

jest.mock('../../../src/models/MedicalHistory', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('../../../src/models/Appointment', () => ({
  __esModule: true,
  default: { find: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../../../src/models/Prescription', () => ({
  __esModule: true,
  default: { find: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: { find: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../../../src/models/AIAnalysis', () => ({
  __esModule: true,
  default: { find: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../../../src/models/WearableData', () => ({
  __esModule: true,
  WearableData: { find: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const MedicalHistory = require('../../../src/models/MedicalHistory').default;
const AppointmentModel = require('../../../src/models/Appointment').default;
const PrescriptionModel = require('../../../src/models/Prescription').default;
const AlertModel = require('../../../src/models/Alert').default;
const AIAnalysis = require('../../../src/models/AIAnalysis').default;
const { WearableData } = require('../../../src/models/WearableData');
const User = require('../../../src/models/User').default;

const queryChain = (data: any) => ({
  lean: jest.fn().mockResolvedValue(data),
  select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(data) }),
});

const setupMocks = (userId = 'user-1') => {
  User.findById.mockReturnValue(queryChain({ _id: userId, name: 'Test User' }));
  MedicalHistory.find.mockReturnValue(queryChain([]));
  AppointmentModel.find.mockReturnValue(queryChain([]));
  PrescriptionModel.find.mockReturnValue(queryChain([]));
  AlertModel.find.mockReturnValue(queryChain([]));
  AIAnalysis.find.mockReturnValue(queryChain([]));
  WearableData.find.mockReturnValue(queryChain([]));
};

const buildReq = (overrides: Partial<any> = {}): any => ({
  params: { userId: 'user-1' },
  query: {},
  body: {},
  get: jest.fn().mockReturnValue(''),
  headers: {},
  ...overrides,
});

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as any;
};

describe('dsrController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('exportUserData', () => {
    it('exporta datos del usuario con anonimización por defecto', async () => {
      const req = buildReq({ params: { userId: 'user-1' }, query: {} });
      const res = buildRes();

      await exportUserData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });

    it('incluye datos en raw cuando includeRaw=true', async () => {
      const req = buildReq({ query: { includeRaw: 'true' } });
      const res = buildRes();

      await exportUserData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna generatedAt en la respuesta', async () => {
      const req = buildReq();
      const res = buildRes();

      await exportUserData(req, res);

      const call = res.status().json.mock.calls[0]?.[0];
      expect(call?.data?.generatedAt).toBeDefined();
    });

    it('retorna 500 cuando falla la consulta', async () => {
      User.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const req = buildReq();
      const res = buildRes();

      await exportUserData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteUserData', () => {
    const buildDeleteReq = () => buildReq({
      get: jest.fn().mockImplementation((header: string) =>
        header === 'X-Confirm-Action' ? 'yes' : ''
      ),
      headers: { 'x-confirm-action': 'yes' },
      body: { confirm: true },
      query: {},
    });

    it('retorna 428 sin confirmación doble', async () => {
      const req = buildReq({ body: {}, get: jest.fn().mockReturnValue('') });
      const res = buildRes();

      await deleteUserData(req, res);

      expect(res.status).toHaveBeenCalledWith(428);
    });

    it('elimina datos del usuario con doble confirmación', async () => {
      User.findByIdAndUpdate.mockResolvedValue({ _id: 'user-1', name: 'REDACTED' });
      MedicalHistory.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]), select: jest.fn().mockReturnThis() });
      AppointmentModel.deleteMany.mockResolvedValue({ deletedCount: 2 });
      PrescriptionModel.deleteMany.mockResolvedValue({ deletedCount: 1 });
      AlertModel.deleteMany.mockResolvedValue({ deletedCount: 3 });
      AIAnalysis.deleteMany.mockResolvedValue({ deletedCount: 0 });
      WearableData.deleteMany.mockResolvedValue({ deletedCount: 1 });

      // Mock MedicalHistory.find para el select de IDs
      MedicalHistory.find.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue([]),
        select: jest.fn().mockReturnThis(),
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
      }));
      const { default: MH } = require('../../../src/models/MedicalHistory');
      MH.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });

      const req = buildDeleteReq();
      const res = buildRes();

      await deleteUserData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 cuando falla la eliminación', async () => {
      User.findByIdAndUpdate.mockRejectedValue(new Error('DB error'));

      const req = buildDeleteReq();
      const res = buildRes();

      await deleteUserData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});