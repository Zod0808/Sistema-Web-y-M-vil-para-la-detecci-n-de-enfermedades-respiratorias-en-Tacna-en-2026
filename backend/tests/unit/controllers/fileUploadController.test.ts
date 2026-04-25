/**
 * Tests for File Upload Controller
 */

import request from 'supertest';
import appInstance from '../../../src/index';
import { testUtils } from '../../setup';
import User, { UserDocument } from '../../../src/models/User';
import { FileUploadService, uploadFiles } from '../../../src/services/fileUploadService';
import { AppError } from '../../../src/utils/AppError';
import fs from 'fs/promises';
import path from 'path';

const app = appInstance.app;

jest.mock('../../../src/services/fileUploadService', () => {
  const actual = jest.requireActual('../../../src/services/fileUploadService');
  return {
    ...actual,
    uploadFiles: jest.fn((req, _res, next) => next()),
  };
});

const uploadFilesMock = uploadFiles as unknown as jest.Mock;

describe('File Upload Controller', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let adminId: string;
  let doctorId: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    jest.clearAllMocks();

    const admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    }) as UserDocument;
    adminId = admin._id.toString();
    adminToken = testUtils.generateTestToken({ userId: adminId, role: 'admin' });

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
  });

afterEach(() => {
  jest.restoreAllMocks();
});

  describe('POST /api/v1/upload/medical-files', () => {
    const imagesMock = [
      {
        fieldname: 'images',
        originalname: 'image1.png',
        mimetype: 'image/png',
        buffer: Buffer.alloc(1024 * 1024),
      },
    ] as unknown as Express.Multer.File[];

    const audioMock = [
      {
        fieldname: 'audioNotes',
        originalname: 'note.mp3',
        mimetype: 'audio/mpeg',
        buffer: Buffer.alloc(512 * 1024),
      },
    ] as unknown as Express.Multer.File[];

    it('carga archivos correctamente', async () => {
      uploadFilesMock.mockImplementation((req, _res, next) => {
        req.files = { images: imagesMock, audioNotes: audioMock };
        next();
      });

      const validateSpy = jest.spyOn(FileUploadService, 'validateFileSize').mockReturnValue(true);
      const processImagesSpy = jest.spyOn(FileUploadService, 'processImages').mockResolvedValue(['/uploads/images/processed.webp']);
      const processAudioSpy = jest.spyOn(FileUploadService, 'processAudio').mockResolvedValue('/uploads/audio/note.mp3');

      const response = await request(app)
        .post('/api/v1/upload/medical-files')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.images).toEqual(['/uploads/images/processed.webp']);
      expect(response.body.data.audioNotes).toBe('/uploads/audio/note.mp3');
      expect(validateSpy).toHaveBeenCalled();
      expect(processImagesSpy).toHaveBeenCalledWith(imagesMock);
      expect(processAudioSpy).toHaveBeenCalledWith(audioMock);
    });

    it('rechaza cargas cuando validateFileSize retorna false', async () => {
      uploadFilesMock.mockImplementation((req, _res, next) => {
        req.files = { images: imagesMock };
        next();
      });

      jest.spyOn(FileUploadService, 'validateFileSize').mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/upload/medical-files')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('excede el tamaño máximo');
    });

    it('propaga errores de FileUploadService', async () => {
      uploadFilesMock.mockImplementation((req, _res, next) => {
        req.files = { images: imagesMock };
        next();
      });

      jest.spyOn(FileUploadService, 'validateFileSize').mockReturnValue(true);
      jest.spyOn(FileUploadService, 'processImages').mockRejectedValue(new AppError('Error procesando imagen', 500));

      const response = await request(app)
        .post('/api/v1/upload/medical-files')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error procesando imagen');
    });

    it('rechaza solicitudes sin archivos adjuntos', async () => {
      uploadFilesMock.mockImplementation((req, _res, next) => {
        delete req.files;
        next();
      });

      const response = await request(app)
        .post('/api/v1/upload/medical-files')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No se encontraron archivos');
    });

    it('valida tamaño máximo del archivo de audio', async () => {
      uploadFilesMock.mockImplementation((req, _res, next) => {
        req.files = { audioNotes: audioMock };
        next();
      });

      jest.spyOn(FileUploadService, 'validateFileSize').mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/v1/upload/medical-files')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('audio');
    });

    it('requiere autenticación', async () => {
      await request(app)
        .post('/api/v1/upload/medical-files')
        .expect(401);
    });
  });

  describe('GET /api/v1/upload/file-info/:filePath', () => {
    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    const testFileRelativePath = '/uploads/images/test-info.txt';
    const encodedPath = encodeURIComponent(testFileRelativePath);

    beforeEach(async () => {
      await fs.mkdir(imagesDir, { recursive: true });
      await fs.writeFile(path.join(process.cwd(), testFileRelativePath), 'contenido');
    });

    afterEach(async () => {
      await fs.rm(path.join(process.cwd(), 'uploads'), { recursive: true, force: true });
    });

    it('devuelve información de un archivo existente', async () => {
      const response = await request(app)
        .get(`/api/v1/upload/file-info/${encodedPath}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toBe(testFileRelativePath);
      expect(response.body.data.size).toBeGreaterThan(0);
      expect(response.body.data.isFile).toBe(true);
    });

    it('devuelve 404 cuando el archivo no existe', async () => {
      await fs.rm(path.join(process.cwd(), testFileRelativePath));

      await request(app)
        .get(`/api/v1/upload/file-info/${encodedPath}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);
    });

    it('requiere autenticación', async () => {
      await request(app)
        .get(`/api/v1/upload/file-info/${encodedPath}`)
        .expect(401);
    });
  });

  describe('DELETE /api/v1/upload/file/:filePath', () => {
    const testFileRelativePath = '/uploads/images/delete-me.txt';
    const encodedPath = encodeURIComponent(testFileRelativePath);

    beforeEach(async () => {
      await fs.mkdir(path.join(process.cwd(), 'uploads', 'images'), { recursive: true });
      await fs.writeFile(path.join(process.cwd(), testFileRelativePath), 'contenido a eliminar');
    });

    afterEach(async () => {
      await fs.rm(path.join(process.cwd(), 'uploads'), { recursive: true, force: true });
    });

    it('elimina un archivo válido', async () => {
      const deleteSpy = jest.spyOn(FileUploadService, 'deleteFile').mockResolvedValue();

      const response = await request(app)
        .delete(`/api/v1/upload/file/${encodedPath}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith(testFileRelativePath);
    });

    it('propaga errores del servicio al eliminar archivos', async () => {
      jest.spyOn(FileUploadService, 'deleteFile').mockRejectedValue(new AppError('Fallo al eliminar', 500));

      const response = await request(app)
        .delete(`/api/v1/upload/file/${encodedPath}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Fallo al eliminar');
    });

    it('rechaza rutas inválidas', async () => {
      const invalidEncoded = encodeURIComponent('invalid-path');

      await request(app)
        .delete(`/api/v1/upload/file/${invalidEncoded}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('requiere autenticación', async () => {
      await request(app)
        .delete(`/api/v1/upload/file/${encodedPath}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/upload/cleanup', () => {
    it('ejecuta limpieza para admin', async () => {
      const cleanupSpy = jest.spyOn(FileUploadService, 'cleanupOldFiles').mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/upload/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daysOld: 30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(cleanupSpy).toHaveBeenCalledWith(30);
    });

    it('rechaza limpieza para roles no autorizados', async () => {
      await request(app)
        .post('/api/v1/upload/cleanup')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ daysOld: 30 })
        .expect(403);
    });

    it('valida parámetro daysOld', async () => {
      const response = await request(app)
        .post('/api/v1/upload/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daysOld: 500 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('días debe estar entre 1 y 365');
    });

    it('propaga errores durante la limpieza', async () => {
      jest.spyOn(FileUploadService, 'cleanupOldFiles').mockRejectedValue(new AppError('Limpieza fallida', 500));

      const response = await request(app)
        .post('/api/v1/upload/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daysOld: 10 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Limpieza fallida');
    });

    it('valida formato numérico de daysOld', async () => {
      const cleanupSpy = jest.spyOn(FileUploadService, 'cleanupOldFiles');

      const response = await request(app)
        .post('/api/v1/upload/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daysOld: 'treinta' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('El número de días debe estar entre 1 y 365');
      expect(cleanupSpy).not.toHaveBeenCalled();
    });

    it('requiere autenticación', async () => {
      const response = await request(app)
        .post('/api/v1/upload/cleanup')
        .send({ daysOld: 30 })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
    });
  });

  describe('GET /api/v1/upload/stats', () => {
    it('requiere privilegios de administrador', async () => {
      await request(app)
        .get('/api/v1/upload/stats')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('devuelve estadísticas para admin', async () => {
      const response = await request(app)
        .get('/api/v1/upload/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFiles');
    });

    it('requiere autenticación', async () => {
      const response = await request(app)
        .get('/api/v1/upload/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
    });
  });
});

