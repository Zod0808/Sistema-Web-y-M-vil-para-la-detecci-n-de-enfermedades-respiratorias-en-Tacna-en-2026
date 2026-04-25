import { referralService } from '../../../src/services/referralService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/models/Referral', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: { createAlert: jest.fn() },
}));

const ReferralModel = require('../../../src/models/Referral').default;
const UserModel = require('../../../src/models/User').default;
const { alertService } = require('../../../src/services/alertService');

const buildDoctor = (overrides: Partial<any> = {}) => ({
  _id: 'doctor-1',
  name: 'Dr. García',
  role: 'doctor',
  ...overrides,
});

const buildReferral = (overrides: Partial<any> = {}) => ({
  _id: 'referral-1',
  patientId: 'patient-1',
  patientName: 'Juan Pérez',
  referringDoctorId: 'doctor-1',
  referringDoctorName: 'Dr. García',
  status: 'pending',
  priority: 'medium',
  referralType: 'specialist',
  reason: 'Evaluación neumológica',
  accept: jest.fn().mockResolvedValue(undefined),
  reject: jest.fn().mockResolvedValue(undefined),
  complete: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('referralService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReferral', () => {
    const validPayload = {
      patientId: 'patient-1',
      patientName: 'Juan Pérez',
      referringDoctorId: 'doctor-1',
      referringDoctorName: 'Dr. García',
      referralType: 'specialist' as const,
      reason: 'Evaluación neumológica',
    };

    it('crea un referido exitosamente', async () => {
      UserModel.findById.mockResolvedValue(buildDoctor());
      const referral = buildReferral();
      ReferralModel.create.mockResolvedValue(referral);

      const result = await referralService.createReferral(validPayload);

      expect(ReferralModel.create).toHaveBeenCalledWith(expect.objectContaining({
        patientId: 'patient-1',
        status: 'pending',
      }));
      expect(result).toEqual(referral);
    });

    it('lanza error cuando el doctor que refiere no existe', async () => {
      UserModel.findById.mockResolvedValue(null);

      await expect(referralService.createReferral(validPayload)).rejects.toThrow(
        'El doctor que refiere no existe o no es válido'
      );
    });

    it('lanza error cuando el que refiere no tiene rol de doctor', async () => {
      UserModel.findById.mockResolvedValue(buildDoctor({ role: 'patient' }));

      await expect(referralService.createReferral(validPayload)).rejects.toThrow(
        'El doctor que refiere no existe o no es válido'
      );
    });

    it('valida el doctor destino cuando se especifica', async () => {
      UserModel.findById
        .mockResolvedValueOnce(buildDoctor()) // doctor que refiere
        .mockResolvedValueOnce(null);         // doctor destino no existe

      await expect(
        referralService.createReferral({ ...validPayload, referredToDoctorId: 'unknown-doctor' })
      ).rejects.toThrow('El doctor destino no existe o no es válido');
    });

    it('crea alerta para el doctor destino si se especifica', async () => {
      const destDoctor = buildDoctor({ _id: 'doctor-2', name: 'Dr. López' });
      UserModel.findById
        .mockResolvedValueOnce(buildDoctor())
        .mockResolvedValueOnce(destDoctor);
      ReferralModel.create.mockResolvedValue(buildReferral({ referredToDoctorId: 'doctor-2' }));
      alertService.createAlert.mockResolvedValue(undefined);

      await referralService.createReferral({ ...validPayload, referredToDoctorId: 'doctor-2' });

      expect(alertService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'doctor-2', category: 'referral' })
      );
    });
  });

  describe('listReferrals', () => {
    it('retorna lista paginada de referidos', async () => {
      const referrals = [buildReferral(), buildReferral({ _id: 'referral-2' })];
      ReferralModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(referrals),
          }),
        }),
      });
      ReferralModel.countDocuments.mockResolvedValue(2);

      const result = await referralService.listReferrals({ page: 1, limit: 10 });

      expect(result.referrals).toEqual(referrals);
      expect(result.total).toBe(2);
    });
  });

  describe('acceptReferral', () => {
    it('acepta un referido existente', async () => {
      const referral = buildReferral();
      const doctor = buildDoctor({ _id: 'doctor-2' });
      ReferralModel.findById.mockResolvedValue(referral);
      UserModel.findById.mockResolvedValue(doctor);
      alertService.createAlert.mockResolvedValue(undefined);

      await referralService.acceptReferral('referral-1', 'doctor-2');

      expect(referral.accept).toHaveBeenCalledWith('doctor-2', undefined);
    });

    it('lanza error cuando el referido no existe', async () => {
      ReferralModel.findById.mockResolvedValue(null);

      await expect(referralService.acceptReferral('nonexistent', 'doctor-2')).rejects.toThrow(
        'Referido no encontrado'
      );
    });
  });

  describe('rejectReferral', () => {
    it('rechaza un referido existente', async () => {
      const referral = buildReferral();
      ReferralModel.findById.mockResolvedValue(referral);
      alertService.createAlert.mockResolvedValue(undefined);

      await referralService.rejectReferral('referral-1', 'Sin disponibilidad');

      expect(referral.reject).toHaveBeenCalledWith('Sin disponibilidad');
    });

    it('lanza error cuando el referido no existe', async () => {
      ReferralModel.findById.mockResolvedValue(null);

      await expect(referralService.rejectReferral('nonexistent', 'razón')).rejects.toThrow(
        'Referido no encontrado'
      );
    });
  });

  describe('completeReferral', () => {
    it('completa un referido existente', async () => {
      const referral = buildReferral({ status: 'in_progress' });
      ReferralModel.findById.mockResolvedValue(referral);
      alertService.createAlert.mockResolvedValue(undefined);

      await referralService.completeReferral('referral-1', 'doctor-2', 'Consulta realizada');

      expect(referral.complete).toHaveBeenCalled();
    });
  });

  describe('cancelReferral', () => {
    it('cancela un referido existente', async () => {
      const referral = buildReferral();
      ReferralModel.findById.mockResolvedValue(referral);
      alertService.createAlert.mockResolvedValue(undefined);

      await referralService.cancelReferral('referral-1', 'doctor-1', 'Motivo');

      expect(referral.cancel).toHaveBeenCalled();
    });

    it('lanza error cuando el referido no existe', async () => {
      ReferralModel.findById.mockResolvedValue(null);

      await expect(referralService.cancelReferral('nonexistent', 'doctor-1')).rejects.toThrow(
        'Referido no encontrado'
      );
    });
  });
});