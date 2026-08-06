import mongoose from 'mongoose';
import AlertModel from '../../../src/models/Alert';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any) => {},
}));

const buildAlertData = (overrides: Partial<Record<string, any>> = {}) => ({
  userId: new mongoose.Types.ObjectId().toString(),
  patientId: new mongoose.Types.ObjectId().toString(),
  title: 'Alerta de prueba',
  message: 'Mensaje de prueba para el test',
  category: 'critical_symptom',
  priority: 'high',
  status: 'pending',
  channels: ['in_app', 'push'],
  trigger: {
    source: 'symptom_analysis',
    referenceId: new mongoose.Types.ObjectId().toString(),
  },
  ...overrides,
});

describe('Alert model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones de campos requeridos', () => {
    it('crea una alerta válida con todos los campos requeridos', async () => {
      const data = buildAlertData();
      const alert = await AlertModel.create(data);

      expect(alert._id).toBeDefined();
      expect(alert.userId).toBe(data.userId);
      expect(alert.title).toBe('Alerta de prueba');
      expect(alert.status).toBe('pending');
      expect(alert.priority).toBe('high');
    });

    // userId falls back to patientId (see Alert.ts fillLegacyFields), so both
    // must be absent for the "required" validator to actually trigger.
    it('falla al crear sin userId ni patientId', async () => {
      const data = buildAlertData({ userId: undefined, patientId: undefined });
      await expect(AlertModel.create(data)).rejects.toThrow();
    });

    it('asigna userId desde patientId cuando falta userId', async () => {
      const data = buildAlertData({ userId: undefined });
      const alert = await AlertModel.create(data);
      expect(alert.userId).toBe(data.patientId);
    });

    // title falls back to message, so both must be absent to trigger the
    // "required" validator.
    it('falla al crear sin title ni message', async () => {
      const data = buildAlertData({ title: undefined, message: undefined });
      await expect(AlertModel.create(data)).rejects.toThrow();
    });

    it('asigna title desde message cuando falta title', async () => {
      const data = buildAlertData({ title: undefined });
      const alert = await AlertModel.create(data);
      expect(alert.title).toBe(data.message.slice(0, 140));
    });

    it('falla al crear sin message', async () => {
      const data = buildAlertData({ message: undefined });
      await expect(AlertModel.create(data)).rejects.toThrow();
    });

    it('falla con status inválido', async () => {
      const data = buildAlertData({ status: 'unknown_status' });
      await expect(AlertModel.create(data)).rejects.toThrow();
    });

    it('falla con priority inválida', async () => {
      const data = buildAlertData({ priority: 'ultra' });
      await expect(AlertModel.create(data)).rejects.toThrow();
    });

    it('falla con category inválida', async () => {
      const data = buildAlertData({ category: 'unknown_category' });
      await expect(AlertModel.create(data)).rejects.toThrow();
    });
  });

  describe('Valores por defecto', () => {
    it('asigna status pending por defecto', async () => {
      const data = buildAlertData({ status: undefined });
      const alert = await AlertModel.create(data);
      expect(alert.status).toBe('pending');
    });

    it('asigna channels por defecto cuando no se especifican', async () => {
      const data = buildAlertData({ channels: undefined });
      const alert = await AlertModel.create(data);
      expect(alert.channels).toBeDefined();
      expect(Array.isArray(alert.channels)).toBe(true);
    });
  });

  describe('Virtual: priorityWeight', () => {
    it('retorna peso 4 para critical', async () => {
      const alert = await AlertModel.create(buildAlertData({ priority: 'critical' }));
      expect((alert as any).priorityWeight).toBe(4);
    });

    it('retorna peso 3 para high', async () => {
      const alert = await AlertModel.create(buildAlertData({ priority: 'high' }));
      expect((alert as any).priorityWeight).toBe(3);
    });

    it('retorna peso 2 para medium', async () => {
      const alert = await AlertModel.create(buildAlertData({ priority: 'medium' }));
      expect((alert as any).priorityWeight).toBe(2);
    });

    it('retorna peso 1 para low', async () => {
      const alert = await AlertModel.create(buildAlertData({ priority: 'low' }));
      expect((alert as any).priorityWeight).toBe(1);
    });
  });

  describe('Métodos de instancia', () => {
    it('markAsDispatched cambia status a delivered', async () => {
      const alert = await AlertModel.create(buildAlertData());
      await alert.markAsDispatched();
      const updated = await AlertModel.findById(alert._id);
      expect(updated?.status).toBe('delivered');
    });

    it('markAsFailed cambia status a failed', async () => {
      const alert = await AlertModel.create(buildAlertData());
      await alert.markAsFailed('Error de conexión');
      const updated = await AlertModel.findById(alert._id);
      expect(updated?.status).toBe('failed');
    });

    it('markAsAcknowledged cambia status a acknowledged', async () => {
      const alert = await AlertModel.create(buildAlertData({ status: 'sent' }));
      await alert.markAsAcknowledged();
      const updated = await AlertModel.findById(alert._id);
      expect(updated?.status).toBe('acknowledged');
    });

    it('isDue retorna true cuando la alerta está pendiente sin scheduledAt', async () => {
      const alert = await AlertModel.create(buildAlertData({ status: 'pending' }));
      expect(alert.isDue()).toBe(true);
    });

    it('isDue retorna true cuando scheduledAt está en el pasado', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const alert = await AlertModel.create(buildAlertData({ scheduledAt: pastDate }));
      expect(alert.isDue()).toBe(true);
    });

    it('isDue retorna false cuando scheduledAt está en el futuro', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const alert = await AlertModel.create(buildAlertData({ scheduledAt: futureDate }));
      expect(alert.isDue()).toBe(false);
    });
  });

  describe('Métodos estáticos', () => {
    it('findDueAlerts retorna alertas pendientes pasadas', async () => {
      const pastDate = new Date(Date.now() - 60000);
      await AlertModel.create(buildAlertData({ scheduledAt: pastDate, status: 'pending' }));
      await AlertModel.create(buildAlertData({ status: 'acknowledged' }));

      const due = await AlertModel.findDueAlerts();
      expect(due.length).toBeGreaterThanOrEqual(1);
      expect(due.every(a => ['pending', 'scheduled'].includes(a.status))).toBe(true);
    });

    it('getDashboardMetrics retorna métricas agrupadas', async () => {
      await AlertModel.create(buildAlertData({ priority: 'critical', status: 'pending' }));
      await AlertModel.create(buildAlertData({ priority: 'high', status: 'acknowledged' }));

      const metrics = await AlertModel.getDashboardMetrics();
      expect(metrics).toHaveProperty('byStatus');
      expect(metrics).toHaveProperty('byPriority');
      expect(metrics).toHaveProperty('byCategory');
      expect(typeof metrics.pendingForToday).toBe('number');
      expect(typeof metrics.criticalOpen).toBe('number');
    });
  });
});