/**
 * HealthCenter Model
 * Directorio geolocalizado de centros de salud (RF-012) para búsqueda de
 * establecimientos cercanos ante una emergencia o consulta de rutina.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export type HealthCenterType = 'hospital' | 'centro_salud' | 'posta_medica' | 'clinica';

export interface HealthCenterDocument extends Document {
  name: string;
  type: HealthCenterType;
  address: string;
  district: string;
  phone?: string;
  hasEmergencyServices: boolean;
  hasRespiratoryCare: boolean;
  isActive: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthCenterNearbyResult {
  center: HealthCenterDocument;
  distanceMeters: number;
}

export interface HealthCenterModel extends Model<HealthCenterDocument> {
  findNearby(
    longitude: number,
    latitude: number,
    maxDistanceMeters?: number,
    filters?: { type?: HealthCenterType; respiratoryOnly?: boolean; limit?: number }
  ): Promise<HealthCenterNearbyResult[]>;
}

const HealthCenterSchema = new Schema<HealthCenterDocument, HealthCenterModel>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del centro de salud es obligatorio'],
      trim: true,
      maxlength: [200, 'El nombre no puede exceder 200 caracteres'],
    },
    type: {
      type: String,
      enum: {
        values: ['hospital', 'centro_salud', 'posta_medica', 'clinica'],
        message: 'El tipo debe ser hospital, centro_salud, posta_medica o clinica',
      },
      required: [true, 'El tipo de centro de salud es obligatorio'],
    },
    address: {
      type: String,
      required: [true, 'La dirección es obligatoria'],
      trim: true,
      maxlength: [300, 'La dirección no puede exceder 300 caracteres'],
    },
    district: {
      type: String,
      required: [true, 'El distrito es obligatorio'],
      trim: true,
      maxlength: [100, 'El distrito no puede exceder 100 caracteres'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'El teléfono no puede exceder 30 caracteres'],
    },
    hasEmergencyServices: {
      type: Boolean,
      default: false,
    },
    hasRespiratoryCare: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords: number[]) =>
            coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 &&
            coords[1] >= -90 && coords[1] <= 90,
          message: 'Las coordenadas deben tener formato [longitud, latitud] válido',
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

HealthCenterSchema.index({ location: '2dsphere' });
HealthCenterSchema.index({ district: 1 });
HealthCenterSchema.index({ isActive: 1 });

HealthCenterSchema.statics.findNearby = async function (
  longitude: number,
  latitude: number,
  maxDistanceMeters: number = 5000,
  filters: { type?: HealthCenterType; respiratoryOnly?: boolean; limit?: number } = {}
) {
  const query: Record<string, any> = { isActive: true };
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.respiratoryOnly) {
    query.hasRespiratoryCare = true;
  }

  const results = await this.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        query,
      },
    },
    { $limit: filters.limit ?? 20 },
  ]);

  return results.map((doc: any) => ({
    center: doc as HealthCenterDocument,
    distanceMeters: doc.distanceMeters,
  }));
};

export default mongoose.model<HealthCenterDocument, HealthCenterModel>(
  'HealthCenter',
  HealthCenterSchema
);
