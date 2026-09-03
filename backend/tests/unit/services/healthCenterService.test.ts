import { healthCenterService } from '../../../src/services/healthCenterService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/models/HealthCenter', () => ({
  __esModule: true,
  default: {
    findNearby: jest.fn(),
  },
}));

const HealthCenterModel = require('../../../src/models/HealthCenter').default;

const buildCenterResult = (overrides: Partial<any> = {}) => ({
  center: {
    _id: 'center-1',
    name: 'Hospital de Prueba',
    type: 'hospital',
    address: 'Av. Siempre Viva 123',
    district: 'Tacna',
    phone: '(052) 411000',
    hasEmergencyServices: true,
    hasRespiratoryCare: true,
    location: { type: 'Point', coordinates: [-70.2444, -18.0114] },
  },
  distanceMeters: 1234,
  ...overrides,
});

describe('HealthCenterService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza coordenadas faltantes o no numéricas', async () => {
    await expect(
      healthCenterService.findNearby({ latitude: NaN, longitude: -70.24 })
    ).rejects.toThrow(AppError);
  });

  it('rechaza latitude fuera de rango', async () => {
    await expect(
      healthCenterService.findNearby({ latitude: 95, longitude: -70.24 })
    ).rejects.toThrow(AppError);
  });

  it('rechaza longitude fuera de rango', async () => {
    await expect(
      healthCenterService.findNearby({ latitude: -18.01, longitude: -200 })
    ).rejects.toThrow(AppError);
  });

  it('convierte maxDistanceKm a metros al consultar el modelo', async () => {
    HealthCenterModel.findNearby.mockResolvedValue([buildCenterResult()]);

    await healthCenterService.findNearby({
      latitude: -18.0114,
      longitude: -70.2444,
      maxDistanceKm: 10,
    });

    expect(HealthCenterModel.findNearby).toHaveBeenCalledWith(
      -70.2444,
      -18.0114,
      10000,
      { type: undefined, respiratoryOnly: undefined, limit: undefined }
    );
  });

  it('mapea los resultados a la forma esperada por el cliente', async () => {
    HealthCenterModel.findNearby.mockResolvedValue([buildCenterResult()]);

    const results = await healthCenterService.findNearby({
      latitude: -18.0114,
      longitude: -70.2444,
    });

    expect(results).toEqual([
      {
        id: 'center-1',
        name: 'Hospital de Prueba',
        type: 'hospital',
        address: 'Av. Siempre Viva 123',
        district: 'Tacna',
        phone: '(052) 411000',
        hasEmergencyServices: true,
        hasRespiratoryCare: true,
        location: { latitude: -18.0114, longitude: -70.2444 },
        distanceKm: 1.23,
      },
    ]);
  });
});
