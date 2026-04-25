import request from 'supertest';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';
import MedicalHistory from '../../src/models/MedicalHistory';
import mongoose from 'mongoose';
import * as cacheService from '../../src/services/cacheService';

const app = appInstance.app;

describe('Medical History Controller Advanced Integration', () => {
  let doctor: UserDocument;
  let otherDoctor: UserDocument;
  let doctorToken: string;
  let otherDoctorToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    doctor = await User.create({
      name: 'Advanced Doctor',
      email: 'advanced-doctor@test.com',
      password: 'Password123!',
      role: 'doctor',
      isActive: true
    }) as UserDocument;

    otherDoctor = await User.create({
      name: 'Other Doctor',
      email: 'other-doctor@test.com',
      password: 'Password123!',
      role: 'doctor',
      isActive: true
    }) as UserDocument;

    doctorToken = testUtils.generateTestToken({ userId: doctor._id.toString(), role: doctor.role });
    otherDoctorToken = testUtils.generateTestToken({ userId: otherDoctor._id.toString(), role: otherDoctor.role });

    const baseDate = new Date();
    const histories = [];
    for (let index = 0; index < 4; index++) {
      histories.push({
        patientId: new mongoose.Types.ObjectId(),
        doctorId: new mongoose.Types.ObjectId(doctor._id),
        patientName: `Paciente ${index}`,
        age: 30 + index,
        diagnosis: `Diagnóstico ${index}`,
        symptoms: [
          { name: 'tos', severity: 'moderate', duration: '2 weeks' }
        ],
        description: 'Historia avanzada',
        isOffline: index % 2 === 0,
        syncStatus: index % 2 === 0 ? 'synced' : 'pending',
        date: new Date(baseDate.getTime() - index * 86400000)
      });
    }
    await MedicalHistory.insertMany(histories);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('aplica filtros avanzados y actualiza cache en miss', async () => {
    const setCacheSpy = jest.spyOn(cacheService, 'setCachedValue');

    const response = await request(app)
      .get('/api/v1/medical-histories')
      .query({
        page: 1,
        limit: 3,
        search: 'Pa',
        sort: 'patientName',
        order: 'asc',
        syncStatus: 'pending',
        isOffline: false,
        startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
        endDate: new Date().toISOString()
      })
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    expect(response.headers['x-cache-status']).toBe('MISS');
    expect(setCacheSpy).toHaveBeenCalled();
    expect(response.body.pagination.limit).toBeLessThanOrEqual(3);
  });

  it('devuelve respuesta cacheada cuando getCachedValue provee datos', async () => {
    const cachedPayload = {
      success: true,
      message: 'Cached result',
      data: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 }
    };
    jest.spyOn(cacheService, 'getCachedValue').mockResolvedValueOnce(cachedPayload);
    const setCacheSpy = jest.spyOn(cacheService, 'setCachedValue');

    const response = await request(app)
      .get('/api/v1/medical-histories')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    expect(response.headers['x-cache-status']).toBe('HIT');
    expect(response.body.message).toBe('Cached result');
    expect(setCacheSpy).not.toHaveBeenCalled();
  });

  it('sincroniza historias offline, reporta errores y limpia caches', async () => {
    const invalidateSpy = jest.spyOn(cacheService, 'invalidateCacheByPattern').mockResolvedValue(undefined);

    const validHistory = {
      patientId: new mongoose.Types.ObjectId().toString(),
      patientName: 'Offline Patient',
      age: 25,
      diagnosis: 'Resfriado',
      symptoms: [
        { name: 'fiebre', severity: 'mild', duration: '3 días' }
      ],
      date: new Date().toISOString()
    };

    const invalidHistory = {
      patientId: 'invalid-object-id',
      patientName: 'Invalid',
      age: 40,
      diagnosis: 'Diagnóstico',
      symptoms: [
        { name: 'tos', severity: 'moderate', duration: '1 semana' }
      ],
      date: new Date().toISOString()
    };

    const originalCreate = MedicalHistory.create.bind(MedicalHistory);
    jest
      .spyOn(MedicalHistory, 'create')
      .mockImplementationOnce((data: any) => originalCreate(data))
      .mockImplementationOnce(async () => {
        throw new Error('Fallo forzado');
      });

    const response = await request(app)
      .post('/api/v1/medical-histories/sync')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        histories: [validHistory, invalidHistory]
      })
      .expect(200);

    expect(response.body.data.synced.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.errors.length).toBeGreaterThanOrEqual(1);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('maneja errores de validación y permisos en rutas especiales', async () => {
    await request(app)
      .post('/api/v1/medical-histories/sync')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ histories: 'no-array' })
      .expect(400);

    const history = await MedicalHistory.findOne({ doctorId: doctor._id });
    await request(app)
      .get(`/api/v1/medical-histories/${history?._id}`)
      .set('Authorization', `Bearer ${otherDoctorToken}`)
      .expect(403);
  });

  it('responde desde cache para estadísticas y valida errores de parámetros', async () => {
    const cachedStats = {
      success: true,
      message: 'Stats cache',
      data: { total: 0 }
    };
    jest.spyOn(cacheService, 'getCachedValue')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(cachedStats);

    await request(app)
      .get('/api/v1/medical-histories/stats')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    const cacheHitResponse = await request(app)
      .get('/api/v1/medical-histories/age-stats')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    expect(cacheHitResponse.body.message).toBe('Stats cache');

    await request(app)
      .get('/api/v1/medical-histories/location')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(400);

    await request(app)
      .get('/api/v1/medical-histories/date-range')
      .query({ startDate: new Date().toISOString() })
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(400);
  });
});


