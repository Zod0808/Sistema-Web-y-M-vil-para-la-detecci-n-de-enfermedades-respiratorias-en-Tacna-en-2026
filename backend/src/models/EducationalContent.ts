import mongoose, { Document, Model, Schema } from 'mongoose';
import { EducationalContent as IEducationalContent, EducationalContentCategory } from '../types';

const EDUCATIONAL_CONTENT_CATEGORIES: EducationalContentCategory[] = [
  'asma',
  'epoc',
  'covid19',
  'influenza',
  'neumonia',
  'prevencion',
  'general',
];

export interface EducationalContentDocument extends Omit<IEducationalContent, '_id'>, Document {
  incrementViewCount(): Promise<void>;
}

export interface EducationalContentModel extends Model<EducationalContentDocument> {
  findRelevantFor(params: {
    conditions: string[];
    age?: number;
  }): Promise<EducationalContentDocument[]>;
}

const EducationalContentSchema = new Schema<EducationalContentDocument, EducationalContentModel>(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [150, 'El título no puede exceder 150 caracteres'],
    },
    summary: {
      type: String,
      required: [true, 'El resumen es obligatorio'],
      trim: true,
      maxlength: [300, 'El resumen no puede exceder 300 caracteres'],
    },
    content: {
      type: String,
      required: [true, 'El contenido es obligatorio'],
      trim: true,
    },
    category: {
      type: String,
      enum: EDUCATIONAL_CONTENT_CATEGORIES,
      required: true,
      index: true,
    },
    // Vacío = contenido general, visible para cualquier perfil (ver CU-007, flujo alterno 3a)
    targetConditions: {
      type: [String],
      default: [],
      index: true,
    },
    targetAgeRange: {
      min: { type: Number, min: 0, max: 150 },
      max: { type: Number, min: 0, max: 150 },
    },
    tags: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

EducationalContentSchema.index({ isActive: 1, category: 1 });
EducationalContentSchema.index({ title: 'text', summary: 'text', content: 'text' });

// Normalizado a minúsculas para que el matching contra el perfil del paciente
// (diagnósticos/síntomas, también normalizados) sea insensible a mayúsculas.
EducationalContentSchema.pre<EducationalContentDocument>('validate', function normalizeConditions(next) {
  if (Array.isArray(this.targetConditions)) {
    this.targetConditions = this.targetConditions.map((condition) => condition.toLowerCase().trim());
  }
  next();
});

EducationalContentSchema.methods.incrementViewCount = async function incrementViewCount(
  this: EducationalContentDocument
): Promise<void> {
  this.viewCount += 1;
  await this.save();
};

EducationalContentSchema.statics.findRelevantFor = function findRelevantFor(
  this: EducationalContentModel,
  { conditions, age }: { conditions: string[]; age?: number }
): Promise<EducationalContentDocument[]> {
  const normalizedConditions = conditions.map((condition) => condition.toLowerCase());

  const ageMatch =
    typeof age === 'number'
      ? {
          $or: [
            { targetAgeRange: { $exists: false } },
            {
              $and: [
                { $or: [{ 'targetAgeRange.min': { $exists: false } }, { 'targetAgeRange.min': { $lte: age } }] },
                { $or: [{ 'targetAgeRange.max': { $exists: false } }, { 'targetAgeRange.max': { $gte: age } }] },
              ],
            },
          ],
        }
      : {};

  return this.find({
    isActive: true,
    $or: [
      { targetConditions: { $size: 0 } },
      { targetConditions: { $in: normalizedConditions } },
    ],
    ...ageMatch,
  })
    .sort({ createdAt: -1 })
    .exec();
};

export const EducationalContentModel: EducationalContentModel =
  (mongoose.models.EducationalContent as EducationalContentModel) ??
  mongoose.model<EducationalContentDocument, EducationalContentModel>(
    'EducationalContent',
    EducationalContentSchema
  );

export default EducationalContentModel;
