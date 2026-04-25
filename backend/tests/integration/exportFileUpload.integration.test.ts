import path from 'path';
import fs from 'fs/promises';
import request from 'supertest';
import appInstance from '../../src/index';
import User, { UserDocument } from '../../src/models/User';
import MedicalHistory from '../../src/models/MedicalHistory';
import mongoose from 'mongoose';
import { testUtils } from '../setup';
import { FileUploadService } from '../../src/services/fileUploadService';

jest.mock('../../src/services/fileUploadService', () => {
  const actual = jest.requireActual('../../src/services/fileUploadService');
  return {
    ...actual,
    uploadFiles: jest.fn((req, _res, next) => {
      req.files = {
        images: [
          {
            fieldname: 'images',
            originalname: 'xray.png',
            mimetype: 'image/png',
            buffer: Buffer.from('image-buffer'),
            size: 1024
          }
        ],
        audioNotes: [
          {
            fieldname: 'audioNotes',
            originalname: 'note.mp3',
            mimetype: 'audio/mpeg',
            buffer: Buffer.from('audio-buffer'),
            size: 1024
          }
        ]
      };
      next();
    })
  };
});

const app = appInstance.app;

describe('Export & File Upload Controllers Integration', () => {
  let doctor: UserDocument;
  let patient: UserDocument;
  let admin: UserDocument;
  let doctorToken: string;
  let patientToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    doctor = await User.create({
      name: 'Export Doctor',
      email: 'export-doctor@test.com',
      password: 'Password123!',
      role: 'doctor',
      isActive: true
    }) as UserDocument;

    patient = await User.create({
      name: 'Export Patient',
      email: 'export-patient@test.com',
      password: 'Password123!',
      role: 'patient',
      isActive: true
    }) as UserDocument;

    admin = await User.create({
      name: 'Export Admin',
      email: 'export-admin@test.com',
      password: 'Password123!',
      role: 'admin',
      isActive: true
    }) as UserDocument;

    doctorToken = testUtils.generateTestToken({ userId: doctor._id.toString(), role: doctor.role });
    patientToken = testUtils.generateTestToken({ userId: patient._id.toString(), role: patient.role });
    adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: admin.role });

    await MedicalHistory.create({
      patientId: new mongoose.Types.ObjectId(patient._id),
      doctorId: new mongoose.Types.ObjectId(doctor._id),
      patientName: 'Paciente Exportable',
      age: 40,
      diagnosis: 'Asma',
      symptoms: [{ name: 'tos', severity: 'moderate', duration: '2 weeks' }],
      description: 'Historia para exportación',
      date: new Date()
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Export controller', () => {
    it('permite exportar historias médicas en JSON y valida headers', async () => {
      const processImagesSpy = jest.spyOn(FileUploadService, 'processImages').mockResolvedValue(['/uploads/images/mock-image.webp']);
      const processAudioSpy = jest.spyOn(FileUploadService, 'processAudio').mockResolvedValue('/uploads/audio/mock-audio.mp3');

      const response = await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ format: 'json', includeImages: true })
        .expect(200);

      expect(processImagesSpy).not.toHaveBeenCalled(); // Export doesn't process files
      expect(processAudioSpy).not.toHaveBeenCalled();
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.exportInfo.totalRecords).toBeGreaterThan(0);
    });

    it('rechaza formatos inválidos y valida permisos de pacientes', async () => {
      await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ format: 'xml' })
        .expect(400);

      await request(app)
        .post('/api/v1/export/medical-histories')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ format: 'json', patientId: new mongoose.Types.ObjectId().toString() })
        .expect(403);
    });

    it('exporta estadísticas solo para administradores', async () => {
      await request(app)
        .post('/api/v1/export/user-statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .post('/api/v1/export/user-statistics')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });

  describe('File upload controller', () => {
    it('procesa cargas médicas y devuelve rutas generadas', async () => {
      const processImagesSpy = jest.spyOn(FileUploadService, 'processImages').mockResolvedValue(['/uploads/images/mock-image.webp']);
      const processAudioSpy = jest.spyOn(FileUploadService, 'processAudio').mockResolvedValue('/uploads/audio/mock-audio.mp3');
      jest.spyOn(FileUploadService, 'validateFileSize').mockReturnValue(true);

      const response = await request(app)
        .post('/api/v1/upload/medical-files')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(processImagesSpy).toHaveBeenCalled();
      expect(processAudioSpy).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.images)).toBe(true);
      expect(response.body.data.audioNotes).toContain('/uploads/audio');
    });

    it('rechaza cargas cuando el archivo excede el tamaño permitido', async () => {
      jest.spyOn(FileUploadService, 'processImages').mockResolvedValue(['/uploads/images/mock-image.webp']);
      jest.spyOn(FileUploadService, 'processAudio').mockResolvedValue('/uploads/audio/mock-audio.mp3');
      const validateSpy = jest.spyOn(FileUploadService, 'validateFileSize');
      validateSpy.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/v1/upload/medical-files')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('excede el tamaño máximo');
    });

    it('permite recuperar información de un archivo existente', async () => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'images');
      await fs.mkdir(uploadDir, { recursive: true });
      const relativePath = '/uploads/images/info-file.txt';
      await fs.writeFile(path.join(process.cwd(), relativePath), 'contenido de prueba');

      const encodedPath = encodeURIComponent(relativePath);
      jest.spyOn(FileUploadService, 'getFileSizeMB');

      const response = await request(app)
        .get(`/api/v1/upload/file-info/${encodedPath}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toBe(relativePath);
    });

    it('ejecuta limpieza y eliminación solo para administradores', async () => {
      const relativePath = '/uploads/images/to-delete.txt';
      const deleteSpy = jest.spyOn(FileUploadService, 'deleteFile').mockResolvedValue(undefined);
      const cleanupSpy = jest.spyOn(FileUploadService, 'cleanupOldFiles').mockResolvedValue(undefined);

      await request(app)
        .delete(`/api/v1/upload/file/${encodeURIComponent(relativePath)}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(deleteSpy).toHaveBeenCalledWith(relativePath);

      await request(app)
        .post('/api/v1/upload/cleanup')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ daysOld: 10 })
        .expect(403);

      await request(app)
        .post('/api/v1/upload/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daysOld: 10 })
        .expect(200);

      expect(cleanupSpy).toHaveBeenCalledWith(10);
    });
  });
});


