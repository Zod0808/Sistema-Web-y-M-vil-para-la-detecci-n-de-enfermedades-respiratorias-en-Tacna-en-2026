import mongoose from 'mongoose';
import HealthCenter from '../../../src/models/HealthCenter';

const buildCenterData = (overrides: Partial<Record<string, any>> = {}) => ({
  name: 'Hospital de Prueba',
  type: 'hospital',
  address: 'Av. Siempre Viva 123',
  district: 'Tacna',
  hasEmergencyServices: true,
  hasRespiratoryCare: true,
  location: { type: 'Point', coordinates: [-70.2444, -18.0114] },
  ...overrides,
});

describe('HealthCenter model', () => {
  afterEach(async () => {
    await HealthCenter.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones de campos requeridos', () => {
    it('crea un centro de salud válido', async () => {
      const center = await HealthCenter.create(buildCenterData());
      expect(center._id).toBeDefined();
      expect(center.name).toBe('Hospital de Prueba');
      expect(center.isActive).toBe(true);
    });

    it('rechaza un tipo inválido', async () => {
      await expect(
        HealthCenter.create(buildCenterData({ type: 'clinica_invalida' }))
      ).rejects.toThrow();
    });

    it('rechaza coordenadas fuera de rango', async () => {
      await expect(
        HealthCenter.create(
          buildCenterData({ location: { type: 'Point', coordinates: [-200, -18] } })
        )
      ).rejects.toThrow();
    });
  });

  describe('findNearby', () => {
    it('retorna los centros más cercanos ordenados por distancia', async () => {
      await HealthCenter.create([
        buildCenterData({ name: 'Cercano', location: { type: 'Point', coordinates: [-70.2444, -18.0114] } }),
        buildCenterData({ name: 'Lejano', location: { type: 'Point', coordinates: [-70.35, -18.10] } }),
      ]);

      const results = await HealthCenter.findNearby(-70.2445, -18.0115, 5000);

      expect(results.length).toBe(1);
      expect(results[0].center.name).toBe('Cercano');
      expect(results[0].distanceMeters).toBeLessThan(5000);
    });

    it('filtra por atención respiratoria cuando se solicita', async () => {
      await HealthCenter.create([
        buildCenterData({ name: 'Con respiratorio', hasRespiratoryCare: true }),
        buildCenterData({ name: 'Sin respiratorio', hasRespiratoryCare: false }),
      ]);

      const results = await HealthCenter.findNearby(-70.2444, -18.0114, 5000, {
        respiratoryOnly: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].center.name).toBe('Con respiratorio');
    });

    it('excluye centros inactivos', async () => {
      await HealthCenter.create(buildCenterData({ isActive: false }));

      const results = await HealthCenter.findNearby(-70.2444, -18.0114, 5000);

      expect(results.length).toBe(0);
    });
  });
});
