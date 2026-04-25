/**
 * Revised unit/integration tests for Export Controller
 */

import request from 'supertest';
import appInstance from '../../../src/index';
import { testUtils } from '../../setup';
import User, { UserDocument } from '../../../src/models/User';
import MedicalHistory from '../../../src/models/MedicalHistory';
import mongoose from 'mongoose';
import { ExportService } from '../../../src/services/exportService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/services/exportService', () => ({
  ExportService: {
    validateExportOptions: jest.fn(),
    exportMedicalHistories: jest.fn(),
    exportUserStats: jest.fn(),
    getAvailableFormats: jest.fn(),
  },
}));

const app = appInstance.app;
const mockedExportService = ExportService as jest.Mocked<typeof ExportService>;

describe('Export Controller', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let doctorId: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    jest.clearAllMocks();

    const doctor = await User.create({
      name: 'Test Doctor',
      email: 'doctor@test.com',
      password: 'password123',
      role: 'doctor',
      isActive: true,
    }) as UserDocument;
    doctorId = doctor._id.toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

    const patient = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: 'password123',
      role: 'patient',
      isActive: true,
    }) as UserDocument;
    patientId = patient._id.toString();
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });

    const admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    }) as UserDocument;
    adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });

    await MedicalHistory.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      patientName: 'Test Patient',
      age: 45,
      diagnosis: 'Bronquitis',
      symptoms: [{ name: 'tos', severity: 'moderate', duration: '2 weeks' }],
      date: new Date(),
    });

    mockedExportService.validateExportOptions.mockImplementation(() => undefined);
    mockedExportService.exportMedicalHistories.mockImplementation(async (res, options) => {
      res.status(200).json({
        success: true,
        message: 'Exportación completada',
        data: { options },
      });
    });
    mockedExportService.getAvailableFormats.mockReturnValue(['json', 'csv', 'pdf']);
    mockedExportService.exportUserStats.mockImplementation(async (res) => {
      res.status(200).json({
        success: true,
        message: 'Estadísticas exportadas',
        data: { totalUsers: 10 },
      });
    });
  });

  describe('POST /api/v1/export/medical-histories', () => {
    it('exporta historias médicas en JSON para un doctor', async () => {
      const payload = { format: 'json', includeImages: true };

      const response = await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload)
        .expect(200);

      expect(mockedExportService.validateExportOptions).toHaveBeenCalledWith(expect.objectContaining(payload));
      expect(mockedExportService.exportMedicalHistories).toHaveBeenCalledTimes(1);
      expect(response.body.success).toBe(true);
      expect(response.body.data.options.doctorId).toBe(doctorId);
    });

    it('requiere autenticación', async () => {
      const response = await request(app)
        .post('/api/v1/export/medical-histories')
        .send({ format: 'json' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
      expect(mockedExportService.validateExportOptions).not.toHaveBeenCalled();
    });

    it('valida formatos permitidos antes de llegar al controlador', async () => {
      const response = await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ format: 'xml' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('El formato debe ser json, csv o pdf');
      expect(mockedExportService.validateExportOptions).not.toHaveBeenCalled();
    });

    it('permite a un paciente exportar sus propios datos', async () => {
      const response = await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ format: 'json' })
        .expect(200);

      expect(mockedExportService.exportMedicalHistories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ patientId })
      );
      expect(response.body.success).toBe(true);
    });

    it('rechaza a un paciente que intenta exportar datos de otro paciente', async () => {
      const otherPatientId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ format: 'json', patientId: otherPatientId })
        .expect(403);

      expect(mockedExportService.exportMedicalHistories).not.toHaveBeenCalled();
    });

    it('rechaza a un doctor exportando datos de otro doctor', async () => {
      const otherDoctorId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ format: 'json', doctorId: otherDoctorId })
        .expect(403);

      expect(mockedExportService.exportMedicalHistories).not.toHaveBeenCalled();
    });

    it('propaga errores de validación del servicio', async () => {
      mockedExportService.validateExportOptions.mockImplementation(() => {
        throw new AppError('Formato inválido', 400);
      });

      const response = await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ format: 'json' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Formato inválido');
      expect(mockedExportService.exportMedicalHistories).not.toHaveBeenCalled();
    });

    it('propaga errores lanzados por exportMedicalHistories', async () => {
      mockedExportService.exportMedicalHistories.mockImplementationOnce(async () => {
        throw new AppError('Error exportando', 500);
      });

      const response = await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ format: 'json' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error exportando');
    });

    it('aplica formato json por defecto cuando no se especifica', async () => {
      await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({})
        .expect(200);

      const [options] = mockedExportService.validateExportOptions.mock.calls[0];
      expect(options.format).toBe('json');
      expect(options.includeImages).toBe(false);
      expect(options.includeAudio).toBe(false);
    });
  });

  describe('POST /api/v1/export/user-statistics', () => {
    it('exporta estadísticas de usuarios para admin', async () => {
      const response = await request(app)
        .post('/api/v1/export/user-statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockedExportService.exportUserStats).toHaveBeenCalledTimes(1);
      expect(response.body.data.totalUsers).toBe(10);
    });

    it('rechaza estadísticas de usuarios para no admin', async () => {
      await request(app)
        .post('/api/v1/export/user-statistics')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      expect(mockedExportService.exportUserStats).not.toHaveBeenCalled();
    });

    it('requiere autenticación', async () => {
      const response = await request(app)
        .post('/api/v1/export/user-statistics')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
      expect(mockedExportService.exportUserStats).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/export/formats', () => {
    it('devuelve la lista de formatos disponibles', async () => {
      mockedExportService.getAvailableFormats.mockReturnValue(['json', 'csv', 'pdf']);

      const response = await request(app)
        .get('/api/v1/export/formats')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.formats).toEqual(['json', 'csv', 'pdf']);
      expect(response.body.data.descriptions.pdf).toContain('PDF');
    });

    it('requiere autenticación', async () => {
      const response = await request(app)
        .get('/api/v1/export/formats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
    });
  });

  describe('GET /api/v1/export/history', () => {
    it('retorna historial placeholder', async () => {
      const response = await request(app)
        .get('/api/v1/export/history')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exports).toEqual([]);
    });

    it('requiere autenticación', async () => {
      const response = await request(app)
        .get('/api/v1/export/history')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
    });

    it('valida parámetros de paginación', async () => {
      const response = await request(app)
        .get('/api/v1/export/history?page=0')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('La página debe ser un número entero mayor a 0');
    });
  });
});

