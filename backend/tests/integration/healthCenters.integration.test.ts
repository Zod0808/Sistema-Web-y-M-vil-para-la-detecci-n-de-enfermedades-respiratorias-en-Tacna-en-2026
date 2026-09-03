/**
 * Integration tests for health center search endpoint (RF-012)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';
import HealthCenterModel from '../../src/models/HealthCenter';

describe('Health Centers Endpoints Integration', () => {
  let authToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    authToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'patient',
    });

    await HealthCenterModel.create([
      {
        name: 'Hospital Cercano',
        type: 'hospital',
        address: 'Av. Bolognesi 1801',
        district: 'Tacna',
        hasEmergencyServices: true,
        hasRespiratoryCare: true,
        location: { type: 'Point', coordinates: [-70.2444, -18.0114] },
      },
      {
        name: 'Posta Lejana',
        type: 'posta_medica',
        address: 'Sector Alto',
        district: 'Alto de la Alianza',
        hasEmergencyServices: false,
        hasRespiratoryCare: false,
        location: { type: 'Point', coordinates: [-70.35, -18.10] },
      },
    ]);
  });

  it('rechaza la petición sin autenticación', async () => {
    await request(app).get('/api/v1/health-centers/nearby?latitude=-18.0114&longitude=-70.2444').expect(401);
  });

  it('rechaza coordenadas faltantes', async () => {
    const response = await request(app)
      .get('/api/v1/health-centers/nearby')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('retorna centros de salud cercanos ordenados por distancia', async () => {
    const response = await request(app)
      .get('/api/v1/health-centers/nearby?latitude=-18.0114&longitude=-70.2444&maxDistanceKm=5')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Hospital Cercano');
    expect(response.body.data[0]).toHaveProperty('distanceKm');
  });

  it('filtra por atención respiratoria', async () => {
    const response = await request(app)
      .get('/api/v1/health-centers/nearby?latitude=-18.0114&longitude=-70.2444&maxDistanceKm=50&respiratoryOnly=true')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data.every((c: any) => c.hasRespiratoryCare)).toBe(true);
  });
});
