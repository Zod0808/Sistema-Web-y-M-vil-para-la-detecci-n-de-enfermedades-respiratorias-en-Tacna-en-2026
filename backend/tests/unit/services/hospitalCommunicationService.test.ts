import { HospitalCommunicationService } from '../../../src/services/hospitalCommunicationService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/emergencyMedicalInfoService', () => ({
  emergencyMedicalInfoService: {
    getEmergencyMedicalInfo: jest.fn(),
  },
}));

jest.mock('../../../src/services/hospitalSyncService', () => ({
  hospitalSyncService: {
    getRegisteredHospitals: jest.fn(),
    syncToExternal: jest.fn().mockResolvedValue(undefined),
  },
}));

const { emergencyMedicalInfoService } = require('../../../src/services/emergencyMedicalInfoService');
const { hospitalSyncService } = require('../../../src/services/hospitalSyncService');

const buildEmergencyRequest = (overrides: any = {}): any => ({
  patientId: 'patient-1',
  emergencyType: 'medical',
  severity: 'high',
  description: 'Dolor torácico severo',
  location: { address: 'Av. Principal 123, Lima' },
  symptoms: ['dolor torácico', 'disnea'],
  ...overrides,
});

const buildPatientInfo = () => ({
  patientId: 'patient-1',
  patientName: 'Juan Pérez',
  age: 45,
  gender: 'male',
  bloodType: 'O+',
  allergies: ['Penicilina'],
  chronicConditions: ['Hipertensión'],
  currentMedications: [],
});

describe('HospitalCommunicationService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('notifyHospitals', () => {
    it('retorna [] cuando el servicio está deshabilitado', async () => {
      const service = new HospitalCommunicationService({ enabled: false });

      const result = await service.notifyHospitals(buildEmergencyRequest());

      expect(result).toEqual([]);
      expect(emergencyMedicalInfoService.getEmergencyMedicalInfo).not.toHaveBeenCalled();
    });

    it('retorna [] cuando notifyOnEmergency es false', async () => {
      const service = new HospitalCommunicationService({ enabled: true, notifyOnEmergency: false });

      const result = await service.notifyHospitals(buildEmergencyRequest());

      expect(result).toEqual([]);
    });

    it('retorna [] cuando no hay hospitales registrados', async () => {
      hospitalSyncService.getRegisteredHospitals.mockReturnValue([]);
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue(buildPatientInfo());

      const service = new HospitalCommunicationService({ enabled: true, notifyOnEmergency: true });
      const result = await service.notifyHospitals(buildEmergencyRequest());

      expect(result).toEqual([]);
    });

    it('notifica a hospitales registrados', async () => {
      const hospitals = [
        { name: 'Hospital Central', id: 'h1' },
        { name: 'Clínica San Juan', id: 'h2' },
      ];
      hospitalSyncService.getRegisteredHospitals.mockReturnValue(hospitals);
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue(buildPatientInfo());

      const service = new HospitalCommunicationService({ enabled: true, notifyOnEmergency: true });
      const result = await service.notifyHospitals(buildEmergencyRequest());

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        status: 'notified',
        emergencyDetails: expect.objectContaining({
          type: 'medical',
          severity: 'high',
        }),
      });
    });

    it('notifica como máximo 3 hospitales', async () => {
      const hospitals = Array.from({ length: 6 }, (_, i) => ({ name: `Hospital ${i}`, id: `h${i}` }));
      hospitalSyncService.getRegisteredHospitals.mockReturnValue(hospitals);
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue(buildPatientInfo());

      const service = new HospitalCommunicationService({ enabled: true, notifyOnEmergency: true });
      const result = await service.notifyHospitals(buildEmergencyRequest());

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('usa hospitales preferidos cuando están configurados', async () => {
      const hospitals = [
        { name: 'Hospital Central', id: 'h1' },
        { name: 'Clínica Preferida', id: 'h2' },
      ];
      hospitalSyncService.getRegisteredHospitals.mockReturnValue(hospitals);
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue(buildPatientInfo());

      const service = new HospitalCommunicationService({
        enabled: true,
        notifyOnEmergency: true,
        preferredHospitals: ['Clínica Preferida'],
      });
      const result = await service.notifyHospitals(buildEmergencyRequest());

      expect(result.some(n => n.hospitalName === 'Clínica Preferida')).toBe(true);
    });

    it('usa todos los hospitales cuando ninguno coincide con los preferidos', async () => {
      const hospitals = [{ name: 'Hospital Central', id: 'h1' }];
      hospitalSyncService.getRegisteredHospitals.mockReturnValue(hospitals);
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue(buildPatientInfo());

      const service = new HospitalCommunicationService({
        enabled: true,
        notifyOnEmergency: true,
        preferredHospitals: ['Hospital No Existente'],
      });
      const result = await service.notifyHospitals(buildEmergencyRequest());

      expect(result.length).toBe(1);
    });

    it('lanza AppError 500 cuando falla getEmergencyMedicalInfo', async () => {
      hospitalSyncService.getRegisteredHospitals.mockReturnValue([{ name: 'Hospital', id: 'h1' }]);
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockRejectedValue(new Error('FHIR error'));

      const service = new HospitalCommunicationService({ enabled: true, notifyOnEmergency: true });

      await expect(service.notifyHospitals(buildEmergencyRequest())).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('getHospitalNotifications', () => {
    it('retorna [] cuando no hay notificaciones activas', () => {
      const service = new HospitalCommunicationService({ enabled: true });

      const result = service.getHospitalNotifications('emg-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('transferPatientInfo', () => {
    it('transfiere información del paciente al hospital', async () => {
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockResolvedValue({
        ...buildPatientInfo(),
        chronicConditions: ['Hipertensión'],
        allergies: ['Penicilina'],
      });

      const service = new HospitalCommunicationService({ enabled: true });
      const result = await service.transferPatientInfo('hospital-1', 'patient-1', 'emg-1');

      expect(result).toBe(true);
      expect(hospitalSyncService.syncToExternal).toHaveBeenCalledWith(
        'hospital-1',
        'patient-1',
        expect.any(Array)
      );
    });

    it('lanza AppError 500 cuando falla la transferencia', async () => {
      emergencyMedicalInfoService.getEmergencyMedicalInfo.mockRejectedValue(new Error('DB error'));

      const service = new HospitalCommunicationService({ enabled: true });

      await expect(
        service.transferPatientInfo('hospital-1', 'patient-1', 'emg-1')
      ).rejects.toMatchObject({ statusCode: 500 });
    });
  });
});