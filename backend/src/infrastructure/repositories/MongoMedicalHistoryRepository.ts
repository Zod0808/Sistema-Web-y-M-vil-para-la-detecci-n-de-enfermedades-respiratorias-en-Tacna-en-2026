// Implementación de Repositorio de Historial Médico con MongoDB - Capa de Infraestructura
import { MedicalHistoryEntity, SyncStatus } from '../../domain/entities/MedicalHistory';
import { MedicalHistoryRepository } from '../../domain/repositories/MedicalHistoryRepository';
import { SymptomValueObject, SymptomSeverity } from '../../domain/value-objects/Symptom';
import { LocationValueObject } from '../../domain/value-objects/Location';
import mongoose, { Document, Schema } from 'mongoose';

interface SymptomDocument {
  name: string;
  severity: string;
  duration: string;
  description?: string;
}

interface LocationDocument {
  latitude: number;
  longitude: number;
  address: string;
}

interface MedicalHistoryDocument extends Document {
  patientId: string;
  doctorId: string;
  patientName: string;
  age: number;
  diagnosis: string;
  symptoms: SymptomDocument[];
  description?: string;
  date: Date;
  location?: LocationDocument;
  images?: string[];
  audioNotes?: string;
  isOffline: boolean;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

const SymptomSchema = new Schema<SymptomDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  severity: {
    type: String,
    enum: Object.values(SymptomSeverity),
    required: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, { _id: true });

const LocationSchema = new Schema<LocationDocument>({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  }
});

const MedicalHistorySchema = new Schema<MedicalHistoryDocument>({
  patientId: {
    type: String,
    required: true,
    trim: true
  },
  doctorId: {
    type: String,
    required: true,
    trim: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 150
  },
  diagnosis: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  symptoms: {
    type: [SymptomSchema],
    default: [],
    validate: {
      validator: function(symptoms: SymptomDocument[]) {
        return symptoms.length <= 20;
      },
      message: 'No se pueden registrar más de 20 síntomas'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  location: {
    type: LocationSchema,
    required: false
  },
  images: [{
    type: String,
    trim: true
  }],
  audioNotes: {
    type: String,
    trim: true
  },
  isOffline: {
    type: Boolean,
    default: false
  },
  syncStatus: {
    type: String,
    enum: Object.values(SyncStatus),
    default: SyncStatus.PENDING
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
MedicalHistorySchema.index({ patientId: 1 });
MedicalHistorySchema.index({ doctorId: 1 });
MedicalHistorySchema.index({ date: -1 });
MedicalHistorySchema.index({ syncStatus: 1 });
MedicalHistorySchema.index({ isOffline: 1 });
MedicalHistorySchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
MedicalHistorySchema.index({ diagnosis: 'text', patientName: 'text', description: 'text' });

const MedicalHistoryModel = mongoose.model<MedicalHistoryDocument>('MedicalHistory', MedicalHistorySchema);

export class MongoMedicalHistoryRepository implements MedicalHistoryRepository {
  async findById(id: string): Promise<MedicalHistoryEntity | null> {
    const medicalHistory = await MedicalHistoryModel.findById(id);
    return medicalHistory ? this.toEntity(medicalHistory) : null;
  }

  async findAll(): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find();
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async save(medicalHistory: MedicalHistoryEntity): Promise<MedicalHistoryEntity> {
    const medicalHistoryDoc = new MedicalHistoryModel({
      _id: medicalHistory.id,
      patientId: medicalHistory.patientId,
      doctorId: medicalHistory.doctorId,
      patientName: medicalHistory.patientName,
      age: medicalHistory.age,
      diagnosis: medicalHistory.diagnosis,
      symptoms: medicalHistory.symptoms.map(s => ({
        name: s.name,
        severity: s.severity,
        duration: s.duration,
        description: s.description
      })),
      description: medicalHistory.description,
      date: medicalHistory.date,
      location: medicalHistory.location ? {
        latitude: medicalHistory.location.latitude,
        longitude: medicalHistory.location.longitude,
        address: medicalHistory.location.address
      } : undefined,
      images: medicalHistory.images,
      audioNotes: medicalHistory.audioNotes,
      isOffline: medicalHistory.isOffline,
      syncStatus: medicalHistory.syncStatus,
      createdAt: medicalHistory.createdAt,
      updatedAt: medicalHistory.updatedAt
    });

    const savedMedicalHistory = await medicalHistoryDoc.save();
    return this.toEntity(savedMedicalHistory);
  }

  async update(medicalHistory: MedicalHistoryEntity): Promise<MedicalHistoryEntity> {
    const updatedMedicalHistory = await MedicalHistoryModel.findByIdAndUpdate(
      medicalHistory.id,
      {
        patientId: medicalHistory.patientId,
        doctorId: medicalHistory.doctorId,
        patientName: medicalHistory.patientName,
        age: medicalHistory.age,
        diagnosis: medicalHistory.diagnosis,
        symptoms: medicalHistory.symptoms.map(s => ({
          name: s.name,
          severity: s.severity,
          duration: s.duration,
          description: s.description
        })),
        description: medicalHistory.description,
        date: medicalHistory.date,
        location: medicalHistory.location ? {
          latitude: medicalHistory.location.latitude,
          longitude: medicalHistory.location.longitude,
          address: medicalHistory.location.address
        } : undefined,
        images: medicalHistory.images,
        audioNotes: medicalHistory.audioNotes,
        isOffline: medicalHistory.isOffline,
        syncStatus: medicalHistory.syncStatus,
        updatedAt: medicalHistory.updatedAt
      },
      { new: true }
    );

    if (!updatedMedicalHistory) {
      throw new Error('Historial médico no encontrado');
    }

    return this.toEntity(updatedMedicalHistory);
  }

  async delete(id: string): Promise<void> {
    await MedicalHistoryModel.findByIdAndDelete(id);
  }

  async findByPatient(patientId: string): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({ patientId }).sort({ date: -1 });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async findByDoctor(doctorId: string): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({ doctorId }).sort({ date: -1 });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1 });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async findByLocation(latitude: number, longitude: number, radiusKm: number): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({
      'location.latitude': {
        $gte: latitude - (radiusKm / 111),
        $lte: latitude + (radiusKm / 111)
      },
      'location.longitude': {
        $gte: longitude - (radiusKm / 111),
        $lte: longitude + (radiusKm / 111)
      }
    });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async findPendingSync(): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({ syncStatus: SyncStatus.PENDING });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async findBySyncStatus(status: SyncStatus): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({ syncStatus: status });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async findOfflineRecords(): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({ isOffline: true });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async searchByDiagnosis(diagnosis: string): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({
      diagnosis: { $regex: diagnosis, $options: 'i' }
    });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async searchBySymptoms(symptoms: string[]): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({
      'symptoms.name': { $in: symptoms }
    });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async findUrgentCases(): Promise<MedicalHistoryEntity[]> {
    const medicalHistories = await MedicalHistoryModel.find({
      'symptoms.severity': SymptomSeverity.SEVERE
    });
    return medicalHistories.map(mh => this.toEntity(mh));
  }

  async getStats(): Promise<{
    total: number;
    pendingSync: number;
    synced: number;
    errors: number;
    offline: number;
  }> {
    const stats = await MedicalHistoryModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pendingSync: {
            $sum: { $cond: [{ $eq: ['$syncStatus', SyncStatus.PENDING] }, 1, 0] }
          },
          synced: {
            $sum: { $cond: [{ $eq: ['$syncStatus', SyncStatus.SYNCED] }, 1, 0] }
          },
          errors: {
            $sum: { $cond: [{ $eq: ['$syncStatus', SyncStatus.ERROR] }, 1, 0] }
          },
          offline: {
            $sum: { $cond: [{ $eq: ['$isOffline', true] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      pendingSync: 0,
      synced: 0,
      errors: 0,
      offline: 0
    };
  }

  async getTopDiagnoses(limit: number): Promise<Array<{ diagnosis: string; count: number }>> {
    const diagnoses = await MedicalHistoryModel.aggregate([
      {
        $group: {
          _id: '$diagnosis',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      }
    ]);

    return diagnoses.map(d => ({
      diagnosis: d._id,
      count: d.count
    }));
  }

  async getAgeStats(): Promise<Array<{ ageGroup: string; count: number; avgAge: number }>> {
    const ageStats = await MedicalHistoryModel.aggregate([
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 18] }, then: '0-17' },
                { case: { $lt: ['$age', 30] }, then: '18-29' },
                { case: { $lt: ['$age', 45] }, then: '30-44' },
                { case: { $lt: ['$age', 60] }, then: '45-59' },
                { case: { $lt: ['$age', 75] }, then: '60-74' }
              ],
              default: '75+'
            }
          },
          count: { $sum: 1 },
          avgAge: { $avg: '$age' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return ageStats.map(stat => ({
      ageGroup: stat._id,
      count: stat.count,
      avgAge: Math.round(stat.avgAge)
    }));
  }

  async findPaginated(page: number, limit: number, filters?: any): Promise<{
    medicalHistories: MedicalHistoryEntity[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters) {
      if (filters.patientId) query.patientId = filters.patientId;
      if (filters.doctorId) query.doctorId = filters.doctorId;
      if (filters.syncStatus) query.syncStatus = filters.syncStatus;
      if (filters.isOffline !== undefined) query.isOffline = filters.isOffline;
      if (filters.startDate && filters.endDate) {
        query.date = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }
    }

    const medicalHistories = await MedicalHistoryModel.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MedicalHistoryModel.countDocuments(query);

    return {
      medicalHistories: medicalHistories.map(mh => this.toEntity(mh)),
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async getCasesByMonth(): Promise<Array<{ month: string; count: number }>> {
    const cases = await MedicalHistoryModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    return cases.map(c => ({
      month: `${c._id.year}-${c._id.month.toString().padStart(2, '0')}`,
      count: c.count
    }));
  }

  async getCasesByLocation(): Promise<Array<{ location: string; count: number }>> {
    const cases = await MedicalHistoryModel.aggregate([
      {
        $match: {
          'location.address': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$location.address',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return cases.map(c => ({
      location: c._id,
      count: c.count
    }));
  }

  private toEntity(medicalHistoryDoc: MedicalHistoryDocument): MedicalHistoryEntity {
    const symptoms = medicalHistoryDoc.symptoms.map(s => {
      const symptomVO = new SymptomValueObject(s.name, s.severity as SymptomSeverity, s.duration, s.description);
      const symptom: { name: string; severity: SymptomSeverity; duration: string; description?: string } = {
        name: symptomVO.name,
        severity: symptomVO.severity,
        duration: symptomVO.duration
      };
      
      if (symptomVO.description !== undefined) {
        symptom.description = symptomVO.description;
      }
      
      return symptom;
    });

    const location = medicalHistoryDoc.location ? 
      new LocationValueObject(
        medicalHistoryDoc.location.latitude,
        medicalHistoryDoc.location.longitude,
        medicalHistoryDoc.location.address
      ) : undefined;

    return new MedicalHistoryEntity(
      (medicalHistoryDoc._id as any).toString(),
      medicalHistoryDoc.patientId,
      medicalHistoryDoc.doctorId,
      medicalHistoryDoc.patientName,
      medicalHistoryDoc.age,
      medicalHistoryDoc.diagnosis,
      symptoms,
      medicalHistoryDoc.description,
      medicalHistoryDoc.date,
      location,
      medicalHistoryDoc.images,
      medicalHistoryDoc.audioNotes,
      medicalHistoryDoc.isOffline,
      medicalHistoryDoc.syncStatus as SyncStatus,
      medicalHistoryDoc.createdAt,
      medicalHistoryDoc.updatedAt
    );
  }
}
