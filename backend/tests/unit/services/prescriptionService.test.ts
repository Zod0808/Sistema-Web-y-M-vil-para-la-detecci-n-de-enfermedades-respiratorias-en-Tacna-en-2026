import prescriptionService from '../../../src/services/prescriptionService';
import PrescriptionModel from '../../../src/models/Prescription';
import { alertService } from '../../../src/services/alertService';
import drugInteractionService from '../../../src/services/drugInteractionService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/models/Prescription', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    findByPatient: jest.fn(),
    findByDoctor: jest.fn(),
  },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: {
    scheduleMedicationReminder: jest.fn(),
    scheduleFollowUpAlert: jest.fn(),
  },
}));

jest.mock('../../../src/services/drugInteractionService', () => ({
  __esModule: true,
  default: {
    checkInteractions: jest.fn(),
    evaluateDosage: jest.fn(),
  },
}));

const prescriptionModelMock = PrescriptionModel as jest.Mocked<typeof PrescriptionModel>;
const alertServiceMock = alertService as jest.Mocked<typeof alertService>;
const drugInteractionMock = drugInteractionService as jest.Mocked<typeof drugInteractionService>;

describe('prescriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea una prescripción aplicando dosificación inteligente y recordatorios', async () => {
    drugInteractionMock.checkInteractions.mockResolvedValue([]);
    drugInteractionMock.evaluateDosage.mockResolvedValue({
      recommended: '5ml',
      rationale: 'Basado en peso',
    });

    const createdPrescription = {
      _id: 'prescription-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
    } as any;
    (prescriptionModelMock.create as jest.Mock).mockResolvedValue(createdPrescription);

    await prescriptionService.createPrescription({
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      createdBy: 'doctor-1',
      diagnosis: 'Resfrío severo',
      medications: [
        {
          name: 'Jarabe X',
          dosage: '10ml',
          frequencyPerDay: 3,
          durationDays: 7,
          reminderTimes: ['08:00', '16:00'],
        },
      ],
    });

    expect(drugInteractionMock.evaluateDosage).toHaveBeenCalledWith(
      { name: 'Jarabe X', dosage: '10ml' },
      undefined
    );
    expect(prescriptionModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        medications: [
          expect.objectContaining({
            name: 'Jarabe X',
            smartDosage: expect.objectContaining({
              recommended: '5ml',
              rationale: 'Basado en peso',
            }),
          }),
        ],
      })
    );
    expect(alertServiceMock.scheduleMedicationReminder).toHaveBeenCalledTimes(2);
  });

  it('lanza error si se detecta interacción severa', async () => {
    drugInteractionMock.checkInteractions.mockResolvedValue([
      {
        medicationA: 'A',
        medicationB: 'B',
        severity: 'major',
      },
    ] as any);

    await expect(
      prescriptionService.validatePrescriptionInput({
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        createdBy: 'doctor-1',
        medications: [
          {
            name: 'Medicamento A',
            dosage: '10mg',
            frequencyPerDay: 1,
            durationDays: 3,
          },
        ],
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});

