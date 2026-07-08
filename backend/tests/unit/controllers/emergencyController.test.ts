import * as controller from '../../../src/controllers/emergencyController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/emergencyService', () => ({
  emergencyService: {
    createEmergency: jest.fn(),
    getEmergencyStatus: jest.fn(),
    cancelEmergency: jest.fn(),
    getActiveEmergencies: jest.fn(),
    detectEmergencyFromSymptoms: jest.fn(),
  },
}));

jest.mock('../../../src/services/ambulanceService', () => ({
  ambulanceService: {
    getActiveAmbulances: jest.fn(),
  },
}));

jest.mock('../../../src/services/emergencyMedicalInfoService', () => ({
  emergencyMedicalInfoService: {
    getEmergencyMedicalInfo: jest.fn(),
    generateEmergencySummary: jest.fn(),
  },
}));

jest.mock('../../../src/services/hospitalCommunicationService', () => ({
  hospitalCommunicationService: {
    getHospitalNotifications: jest.fn(),
    transferPatientInfo: jest.fn(),
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

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

const runHandler = async (handler: any, req: any, res = buildRes(), next = jest.fn()) => {
  await handler(req, res, next);
  await flushMicrotasks();
  return { res, next };
};

const expectStatusError = (next: jest.Mock, code: number) => {
  expect(next).toHaveBeenCalled();
  const arg = next.mock.calls[0]?.[0];
  expect(arg).toBeInstanceOf(Error);
  expect(arg.statusCode).toBe(code);
};

const validBody = {
  emergencyType: 'respiratory_crisis',
  severity: 'high',
  description: 'Crisis respiratoria severa',
  location: { latitude: -18.0066, longitude: -70.2462, address: 'Tacna Centro' },
};

describe('emergencyController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createEmergency', () => {
    it('201 con emergencia creada', async () => {
      emergencyService.createEmergency.mockResolvedValue({ emergencyId: 'emg-1', status: 'dispatched' });
      const { res, next } = await runHandler(
        controller.createEmergency,
        buildReq({ body: validBody }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(emergencyService.createEmergency).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          emergencyType: 'respiratory_crisis',
          location: expect.objectContaining({ latitude: -18.0066 }),
        }),
      );
    });

    it('400 cuando faltan emergencyType/severity/description/location', async () => {
      for (const missing of ['emergencyType', 'severity', 'description', 'location']) {
        const body = { ...validBody } as any;
        delete body[missing];
        const { next } = await runHandler(
          controller.createEmergency,
          buildReq({ body }),
        );
        expectStatusError(next, 400);
      }
    });

    it('400 cuando location no tiene lat/lon', async () => {
      const { next } = await runHandler(
        controller.createEmergency,
        buildReq({ body: { ...validBody, location: { address: 'x' } } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando latitude está fuera de rango', async () => {
      const { next } = await runHandler(
        controller.createEmergency,
        buildReq({ body: { ...validBody, location: { latitude: 200, longitude: 0 } } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando longitude está fuera de rango', async () => {
      const { next } = await runHandler(
        controller.createEmergency,
        buildReq({ body: { ...validBody, location: { latitude: 0, longitude: 500 } } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      emergencyService.createEmergency.mockRejectedValue(new Error('svc down'));
      const { next } = await runHandler(
        controller.createEmergency,
        buildReq({ body: validBody }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getEmergencyStatus', () => {
    it('200 con el estado', async () => {
      emergencyService.getEmergencyStatus.mockResolvedValue({ emergencyId: 'e1', status: 'active' });
      const { res } = await runHandler(
        controller.getEmergencyStatus,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta emergencyId', async () => {
      const { next } = await runHandler(
        controller.getEmergencyStatus,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('404 cuando no existe', async () => {
      emergencyService.getEmergencyStatus.mockResolvedValue(null);
      const { next } = await runHandler(
        controller.getEmergencyStatus,
        buildReq({ params: { emergencyId: 'nope' } }),
      );
      expectStatusError(next, 404);
    });
  });

  describe('cancelEmergency', () => {
    it('200 al cancelar exitosamente', async () => {
      emergencyService.cancelEmergency.mockResolvedValue(true);
      const { res } = await runHandler(
        controller.cancelEmergency,
        buildReq({ params: { emergencyId: 'e1' }, body: { reason: 'false alarm' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta emergencyId', async () => {
      const { next } = await runHandler(
        controller.cancelEmergency,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });

    it('500 cuando el servicio retorna false', async () => {
      emergencyService.cancelEmergency.mockResolvedValue(false);
      const { next } = await runHandler(
        controller.cancelEmergency,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expectStatusError(next, 500);
    });
  });

  describe('getActiveEmergencies', () => {
    it('200 con lista de activas', async () => {
      emergencyService.getActiveEmergencies.mockReturnValue([{ id: 'e1' }, { id: 'e2' }]);
      const { res } = await runHandler(controller.getActiveEmergencies, buildReq());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('401 sin userId', async () => {
      const { next } = await runHandler(
        controller.getActiveEmergencies,
        buildReq({ user: null }),
      );
      expectStatusError(next, 401);
    });
  });

  describe('detectEmergency', () => {
    const validSymptomsBody = {
      symptoms: ['dificultad respiratoria'],
      location: { latitude: -18, longitude: -70 },
    };

    it('201 cuando detecta una emergencia', async () => {
      emergencyService.detectEmergencyFromSymptoms.mockResolvedValue({ emergencyId: 'e1' });
      const { res } = await runHandler(
        controller.detectEmergency,
        buildReq({ body: validSymptomsBody }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('200 cuando NO detecta emergencia crítica', async () => {
      emergencyService.detectEmergencyFromSymptoms.mockResolvedValue(null);
      const { res } = await runHandler(
        controller.detectEmergency,
        buildReq({ body: validSymptomsBody }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('401 sin usuario autenticado', async () => {
      const { next } = await runHandler(
        controller.detectEmergency,
        buildReq({ user: null, body: validSymptomsBody }),
      );
      expectStatusError(next, 401);
    });

    it('400 cuando symptoms no es array o está vacío', async () => {
      const { next } = await runHandler(
        controller.detectEmergency,
        buildReq({ body: { ...validSymptomsBody, symptoms: [] } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando location no trae coordenadas', async () => {
      const { next } = await runHandler(
        controller.detectEmergency,
        buildReq({ body: { symptoms: ['tos'], location: {} } }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('getAmbulanceInfo', () => {
    it('200 con ambulancias despachadas', async () => {
      ambulanceService.getActiveAmbulances.mockReturnValue([{ id: 'amb-1' }]);
      const { res } = await runHandler(
        controller.getAmbulanceInfo,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('200 con lista vacía cuando no hay ambulancias', async () => {
      ambulanceService.getActiveAmbulances.mockReturnValue([]);
      const { res } = await runHandler(
        controller.getAmbulanceInfo,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta emergencyId', async () => {
      const { next } = await runHandler(
        controller.getAmbulanceInfo,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('getEmergencyMedicalInfo', () => {
    it('200 usando patientId de query', async () => {
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue({ bloodType: 'A+' });
      const { res } = await runHandler(
        controller.getEmergencyMedicalInfo,
        buildReq({ params: { emergencyId: 'e1' }, query: { patientId: 'p1' } }),
      );
      expect(emergencyMedicalInfoService.getEmergencyMedicalInfo).toHaveBeenCalledWith('p1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('200 cae a emergencyId cuando no hay patientId', async () => {
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue({});
      const { res } = await runHandler(
        controller.getEmergencyMedicalInfo,
        buildReq({ params: { emergencyId: 'e1' }, query: {} }),
      );
      expect(emergencyMedicalInfoService.getEmergencyMedicalInfo).toHaveBeenCalledWith('e1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando no hay ni patientId ni emergencyId', async () => {
      const { next } = await runHandler(
        controller.getEmergencyMedicalInfo,
        buildReq({ params: {}, query: {} }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del servicio', async () => {
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockRejectedValue(new Error('err'));
      const { next } = await runHandler(
        controller.getEmergencyMedicalInfo,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getEmergencyMedicalSummary', () => {
    it('200 con summary generado', async () => {
      emergencyService.getEmergencyStatus.mockResolvedValue({
        emergencyId: 'e1',
        metadata: {
          patientId: 'p1',
          userId: 'user-1',
          emergencyType: 'medical',
          severity: 'high',
          description: 'x',
          location: { latitude: 0, longitude: 0 },
          symptoms: ['tos'],
        },
      });
      emergencyMedicalInfoService.generateEmergencySummary.mockResolvedValue({ text: 'summary' });

      const { res } = await runHandler(
        controller.getEmergencyMedicalSummary,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('404 cuando la emergencia no existe', async () => {
      emergencyService.getEmergencyStatus.mockResolvedValue(null);
      const { next } = await runHandler(
        controller.getEmergencyMedicalSummary,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expectStatusError(next, 404);
    });

    it('400 cuando la emergencia no identifica al paciente', async () => {
      emergencyService.getEmergencyStatus.mockResolvedValue({ emergencyId: 'e1', metadata: {} });
      const { next } = await runHandler(
        controller.getEmergencyMedicalSummary,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expectStatusError(next, 400);
    });

    it('propaga error del generador de summary', async () => {
      emergencyService.getEmergencyStatus.mockResolvedValue({
        emergencyId: 'e1',
        metadata: { patientId: 'p1' },
      });
      emergencyMedicalInfoService.generateEmergencySummary.mockRejectedValue(new Error('gen err'));
      const { next } = await runHandler(
        controller.getEmergencyMedicalSummary,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getHospitalNotifications', () => {
    it('200 con lista de notificaciones', async () => {
      hospitalCommunicationService.getHospitalNotifications.mockReturnValue([
        { hospitalId: 'h1' },
      ]);
      const { res } = await runHandler(
        controller.getHospitalNotifications,
        buildReq({ params: { emergencyId: 'e1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta emergencyId', async () => {
      const { next } = await runHandler(
        controller.getHospitalNotifications,
        buildReq({ params: {} }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('transferToHospital', () => {
    it('200 al transferir con éxito', async () => {
      hospitalCommunicationService.transferPatientInfo.mockResolvedValue(true);
      const { res } = await runHandler(
        controller.transferToHospital,
        buildReq({ params: { emergencyId: 'e1' }, body: { hospitalId: 'h1', patientId: 'p1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('400 cuando falta hospitalId', async () => {
      const { next } = await runHandler(
        controller.transferToHospital,
        buildReq({ params: { emergencyId: 'e1' }, body: { patientId: 'p1' } }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando falta patientId', async () => {
      const { next } = await runHandler(
        controller.transferToHospital,
        buildReq({ params: { emergencyId: 'e1' }, body: { hospitalId: 'h1' } }),
      );
      expectStatusError(next, 400);
    });

    it('500 cuando el servicio retorna false', async () => {
      hospitalCommunicationService.transferPatientInfo.mockResolvedValue(false);
      const { next } = await runHandler(
        controller.transferToHospital,
        buildReq({ params: { emergencyId: 'e1' }, body: { hospitalId: 'h1', patientId: 'p1' } }),
      );
      expectStatusError(next, 500);
    });

    it('propaga error del servicio', async () => {
      hospitalCommunicationService.transferPatientInfo.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.transferToHospital,
        buildReq({ params: { emergencyId: 'e1' }, body: { hospitalId: 'h1', patientId: 'p1' } }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
