/**
 * HealthCenter Service
 * Búsqueda geoespacial de centros de salud cercanos (RF-012)
 */

import HealthCenterModel, { HealthCenterType } from '../models/HealthCenter';
import { AppError } from '../utils/AppError';

export interface NearbySearchParams {
  latitude: number;
  longitude: number;
  maxDistanceKm?: number;
  type?: HealthCenterType;
  respiratoryOnly?: boolean;
  limit?: number;
}

export class HealthCenterService {
  async findNearby(params: NearbySearchParams) {
    const { latitude, longitude, maxDistanceKm = 5, type, respiratoryOnly, limit } = params;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      throw new AppError('latitude y longitude son requeridos y deben ser numéricos', 400);
    }
    if (latitude < -90 || latitude > 90) {
      throw new AppError('latitude debe estar entre -90 y 90', 400);
    }
    if (longitude < -180 || longitude > 180) {
      throw new AppError('longitude debe estar entre -180 y 180', 400);
    }

    const results = await HealthCenterModel.findNearby(
      longitude,
      latitude,
      Math.max(maxDistanceKm, 0.1) * 1000,
      { type, respiratoryOnly, limit }
    );

    return results.map(({ center, distanceMeters }) => ({
      id: center._id,
      name: center.name,
      type: center.type,
      address: center.address,
      district: center.district,
      phone: center.phone,
      hasEmergencyServices: center.hasEmergencyServices,
      hasRespiratoryCare: center.hasRespiratoryCare,
      location: {
        latitude: center.location.coordinates[1],
        longitude: center.location.coordinates[0],
      },
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
    }));
  }
}

export const healthCenterService = new HealthCenterService();
export default healthCenterService;
