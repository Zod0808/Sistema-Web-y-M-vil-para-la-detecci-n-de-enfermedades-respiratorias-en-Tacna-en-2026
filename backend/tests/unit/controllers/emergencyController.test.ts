import * as emergencyController from '../../../src/controllers/emergencyController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/emergencyService', () => ({
  emergencyService: {
    createEmergency: jest.fn(),
    getEmergencyStatus: jest.fn(),
    cancelEmergency: jest.fn(),
    getActiveEmergencies: jest.fn(),
  },
}));

jest.mock('../../../src/services/ambulanceService', () => ({
  ambulanceService: {
    dispatchAmbulance: jest.fn(),
    getDispatchStatus: jest.fn(),
    cancelDispatch: jest.fn(),
  },
}));

jest.mock('../../../src/services/emergencyMedicalInfoService', () => ({
  emergencyMedicalInfoService: {
    getEmergencyMedicalInfo: jest.fn(),
  },
}));

jest.mock('../../../src/services/hospitalCommunicationService', () => ({
  hospitalCommunicationService: {
    notifyHospitals: jest.fn(),
    getAvailableHospitals: jest.fn(),
  },
}));

const { emergencyService } = require('../../../src/services/emergencyService');
const { ambulanceService } = require('../../../src/services/ambulanceService');
const { emergencyMedicalInfoService } = require('../../../src/services/emergencyMedicalInfoService');
const { hospitalCommunicationService } = require('../../../src/services/hospitalCommunicationService');

const buildReq = (overrides: Partial<any> = {}): any => ({
  user: { _id: 'user-1', name: 'Juan Pérez', role: 'patient' },
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

const buildNext = () => jest.fn();

describe('emergencyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmergency', () => {
    const validBody = {
      emergencyType: 'respiratory_crisis',
      severity: 'high',
      description: 'Dificultad respiratoria severa, requiere atención inmediata',
      location: { latitude: -18.0066, longitude: -70.2462, address: 'Tacna Centro' },
    };

    it('crea emergencia exitosamente con datos válidos', async () => {
      const emergencyResult = {
        emergencyId: 'emg-1',
        status: 'dispatched',
        estimatedArrival: new Date(),
      };
      emergencyService.createEmergency.mockResolvedValue(emergencyResult);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.createEmergency(req, res, next);

      expect(emergencyService.createEmergency).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          emergencyType: 'respiratory_crisis',
          severity: 'high',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: emergencyResult })
      );
    });

    it('lanza AppError cuando falta emergencyType', async () => {
      const req = buildReq({
        body: { severity: 'high', description: 'test', location: { latitude: -18, longitude: -70 } },
      });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.createEmergency(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('lanza AppError cuando falta severity', async () => {
      const req = buildReq({
        body: { emergencyType: 'medical', description: 'test', location: { latitude: -18, longitude: -70 } },
      });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.createEmergency(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('lanza AppError cuando falta location', async () => {
      const req = buildReq({
        body: { emergencyType: 'medical', severity: 'high', description: 'test' },
      });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.createEmergency(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('lanza AppError cuando falta latitude en location', async () => {
      const req = buildReq({
        body: { ...validBody, location: { longitude: -70.2462 } },
      });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.createEmergency(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('usa _id del usuario autenticado como userId', async () => {
      emergencyService.createEmergency.mockResolvedValue({ emergencyId: 'emg-1', status: 'dispatched' });

      const req = buildReq({ body: validBody, user: { _id: 'user-99', name: 'Test', role: 'patient' } });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.createEmergency(req, res, next);

      expect(emergencyService.createEmergency).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-99' })
      );
    });

    it('propaga error del servicio al next', async () => {
      emergencyService.createEmergency.mockRejectedValue(new Error('Servicio no disponible'));

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.createEmergency(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getEmergencyStatus', () => {
    it('retorna estado de emergencia activa', async () => {
      const status = { emergencyId: 'emg-1', status: 'in_transit' };
      emergencyService.getEmergencyStatus.mockResolvedValue(status);

      const req = buildReq({ params: { emergencyId: 'emg-1' } });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.getEmergencyStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: status })
      );
    });

    it('lanza AppError cuando la emergencia no existe', async () => {
      emergencyService.getEmergencyStatus.mockResolvedValue(null);

      const req = buildReq({ params: { emergencyId: 'nonexistent' } });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.getEmergencyStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('cancelEmergency', () => {
    it('cancela emergencia exitosamente', async () => {
      const cancelled = { emergencyId: 'emg-1', status: 'cancelled' };
      emergencyService.cancelEmergency.mockResolvedValue(cancelled);

      const req = buildReq({ params: { emergencyId: 'emg-1' } });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.cancelEmergency(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getEmergencyMedicalInfo', () => {
    it('retorna información médica del paciente', async () => {
      const info = { patientId: 'patient-1', bloodType: 'A+', allergies: ['penicilina'] };
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue(info);

      const req = buildReq({ params: { patientId: 'patient-1' } });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.getEmergencyMedicalInfo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: info })
      );
    });
  });

  describe('getNearbyHospitals', () => {
    it('retorna hospitales disponibles cercanos', async () => {
      const hospitals = [{ name: 'Hospital Regional', distance: 2.5 }];
      hospitalCommunicationService.getAvailableHospitals.mockResolvedValue(hospitals);

      const req = buildReq({ query: { latitude: '-18.0066', longitude: '-70.2462' } });
      const res = buildRes();
      const next = buildNext();

      await emergencyController.getNearbyHospitals(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: hospitals })
      );
    });
  });
});