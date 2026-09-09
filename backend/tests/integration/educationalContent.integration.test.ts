/**
 * Integration tests for educational content endpoints (RF-011, CU-007)
 *
 * Cierra el gap CP-011-I documentado en
 * Documentation/pruebas/Catalogo_de_Pruebas_RespiCare.xlsx: la suite existente
 * (tests/unit/controllers/educationalContentController.test.ts) prueba el
 * controlador con dependencias simuladas; esta suite ejercita el flujo
 * completo HTTP -> rutas -> controlador -> servicio -> Mongo real de pruebas,
 * incluyendo la personalización por historial clínico y el control de roles.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';
import User from '../../src/models/User';
import MedicalHistory from '../../src/models/MedicalHistory';
import EducationalContentModel from '../../src/models/EducationalContent';
import EducationalContentViewModel from '../../src/models/EducationalContentView';

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${new mongoose.Types.ObjectId().toHexString()}@test.com`;

describe('Educational Content Endpoints Integration', () => {
  let doctorToken: string;
  let adminToken: string;
  let patientToken: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    const admin = await User.create({
      name: 'Admin Educativo',
      email: uniqueEmail('admin-edu'),
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true,
    });
    const doctor = await User.create({
      name: 'Dr. Educativo',
      email: uniqueEmail('dr-edu'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    });
    const patient = await User.create({
      name: 'Paciente Educativo',
      email: uniqueEmail('patient-edu'),
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true,
    });

    patientId = patient._id.toString();

    doctorToken = testUtils.generateTestToken({ userId: doctor._id.toString(), role: 'doctor' });
    adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
  });

  const buildContentPayload = (overrides: any = {}) => ({
    title: 'Cómo reconocer una crisis asmática',
    summary: 'Señales de alerta y primeros pasos ante una crisis de asma',
    content: 'Contenido educativo detallado sobre manejo de crisis asmáticas...',
    category: 'asma',
    targetConditions: ['asma'],
    ...overrides,
  });

  describe('GET /api/v1/educational-content — contenido personalizado', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app).get('/api/v1/educational-content').expect(401);
    });

    it('retorna solo contenido general cuando el paciente no tiene historial clínico', async () => {
      await EducationalContentModel.create(buildContentPayload({ targetConditions: ['asma'] }));
      const general = await EducationalContentModel.create(
        buildContentPayload({ title: 'Prevención respiratoria general', targetConditions: [] })
      );

      const response = await request(app)
        .get('/api/v1/educational-content')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const ids = response.body.data.map((item: any) => item._id);
      expect(ids).toEqual([general._id.toString()]);
    });

    it('personaliza el contenido según el diagnóstico más reciente del historial clínico', async () => {
      const relevant = await EducationalContentModel.create(
        buildContentPayload({ title: 'Manejo de neumonía', category: 'neumonia', targetConditions: ['neumonia'] })
      );
      const unrelated = await EducationalContentModel.create(
        buildContentPayload({ title: 'Manejo de EPOC', category: 'epoc', targetConditions: ['epoc'] })
      );

      await MedicalHistory.create({
        patientId,
        doctorId: new mongoose.Types.ObjectId().toHexString(),
        patientName: 'Paciente Educativo',
        age: 40,
        diagnosis: 'neumonia',
        symptoms: [{ name: 'tos', severity: 'moderate', duration: '3 días' }],
        date: new Date(),
      });

      const response = await request(app)
        .get('/api/v1/educational-content')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      const ids = response.body.data.map((item: any) => item._id);
      expect(ids).toContain(relevant._id.toString());
      expect(ids).not.toContain(unrelated._id.toString());
    });
  });

  describe('GET /api/v1/educational-content/:id — detalle y registro de consulta', () => {
    it('retorna 404 para contenido inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();

      await request(app)
        .get(`/api/v1/educational-content/${fakeId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('retorna el contenido, incrementa viewCount y registra la consulta en el historial de actividad', async () => {
      const content = await EducationalContentModel.create(buildContentPayload());

      const response = await request(app)
        .get(`/api/v1/educational-content/${content._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.data.viewCount).toBe(1);

      const persisted = await EducationalContentModel.findById(content._id);
      expect(persisted?.viewCount).toBe(1);

      const views = await EducationalContentViewModel.find({ contentId: content._id });
      expect(views).toHaveLength(1);
      expect(views[0].userId).toBe(patientId);
    });
  });

  describe('POST /api/v1/educational-content — gestión de contenido (roles clínicos/admin)', () => {
    it('crea contenido con éxito (doctor)', async () => {
      const response = await request(app)
        .post('/api/v1/educational-content')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildContentPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('asma');

      const persisted = await EducationalContentModel.findById(response.body.data._id);
      expect(persisted).not.toBeNull();
    });

    it('retorna 403 para pacientes', async () => {
      await request(app)
        .post('/api/v1/educational-content')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(buildContentPayload())
        .expect(403);
    });

    it('retorna 400 con categoría inválida', async () => {
      await request(app)
        .post('/api/v1/educational-content')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildContentPayload({ category: 'categoria_invalida' }))
        .expect(400);
    });
  });

  describe('PATCH /api/v1/educational-content/:id — actualizar contenido', () => {
    it('actualiza contenido con éxito (admin)', async () => {
      const content = await EducationalContentModel.create(buildContentPayload());

      const response = await request(app)
        .patch(`/api/v1/educational-content/${content._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Título actualizado' })
        .expect(200);

      expect(response.body.data.title).toBe('Título actualizado');
    });

    it('retorna 403 para pacientes', async () => {
      const content = await EducationalContentModel.create(buildContentPayload());

      await request(app)
        .patch(`/api/v1/educational-content/${content._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ title: 'Intento no autorizado' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/educational-content/:id — eliminar contenido', () => {
    it('retorna 403 para doctores (solo admin puede eliminar)', async () => {
      const content = await EducationalContentModel.create(buildContentPayload());

      await request(app)
        .delete(`/api/v1/educational-content/${content._id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('elimina contenido con éxito (admin)', async () => {
      const content = await EducationalContentModel.create(buildContentPayload());

      await request(app)
        .delete(`/api/v1/educational-content/${content._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const persisted = await EducationalContentModel.findById(content._id);
      expect(persisted).toBeNull();
    });
  });

  describe('Ciclo completo: crear → consultar → actualizar → eliminar', () => {
    it('ciclo completo de gestión de contenido educativo (admin)', async () => {
      const createRes = await request(app)
        .post('/api/v1/educational-content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildContentPayload({ targetConditions: [] }))
        .expect(201);

      const contentId = createRes.body.data._id;

      const getRes = await request(app)
        .get(`/api/v1/educational-content/${contentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);
      expect(getRes.body.data.viewCount).toBe(1);

      const updateRes = await request(app)
        .patch(`/api/v1/educational-content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);
      expect(updateRes.body.data.isActive).toBe(false);

      await request(app)
        .delete(`/api/v1/educational-content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const persisted = await EducationalContentModel.findById(contentId);
      expect(persisted).toBeNull();
    });
  });
});
