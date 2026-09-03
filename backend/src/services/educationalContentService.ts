/**
 * Educational Content Service
 * Personaliza y gestiona el contenido educativo preventivo (RF-011, CU-007)
 */

import { AppError } from '../utils/AppError';
import EducationalContentModel, { EducationalContentDocument } from '../models/EducationalContent';
import EducationalContentViewModel from '../models/EducationalContentView';
import MedicalHistoryModel from '../models/MedicalHistory';
import { EducationalContent, EducationalContentCategory } from '../types';

type PatientProfile = {
  conditions: string[];
  age?: number;
};

type CreateEducationalContentPayload = Pick<
  EducationalContent,
  'title' | 'summary' | 'content' | 'category'
> &
  Partial<Pick<EducationalContent, 'targetConditions' | 'targetAgeRange' | 'tags' | 'imageUrl'>>;

type UpdateEducationalContentPayload = Partial<CreateEducationalContentPayload> & {
  isActive?: boolean;
};

type ListFilters = {
  category?: EducationalContentCategory;
  isActive?: boolean;
};

class EducationalContentService {
  /**
   * Construye el perfil del paciente a partir de su historial médico más
   * reciente. Si no hay historial (CU-007, flujo alterno 3a) se retorna un
   * perfil vacío, que `filterByProfile` resuelve mostrando solo contenido
   * general (targetConditions vacío).
   */
  private async buildProfileFromHistory(userId: string): Promise<PatientProfile> {
    const latestHistory = await MedicalHistoryModel.findOne({ patientId: userId })
      .sort({ date: -1 })
      .exec();

    if (!latestHistory) {
      return { conditions: [] };
    }

    const conditions = [
      latestHistory.diagnosis,
      ...(latestHistory.symptoms ?? []).map((symptom) => symptom.name),
    ].filter((value): value is string => Boolean(value));

    return {
      conditions,
      age: latestHistory.age,
    };
  }

  async filterByProfile(profile: PatientProfile): Promise<EducationalContentDocument[]> {
    return EducationalContentModel.findRelevantFor(profile);
  }

  async getPersonalizedContent(userId: string): Promise<EducationalContentDocument[]> {
    if (!userId) {
      throw new AppError('El usuario es obligatorio para personalizar el contenido', 400);
    }

    const profile = await this.buildProfileFromHistory(userId);
    return this.filterByProfile(profile);
  }

  async getContentById(contentId: string, userId: string): Promise<EducationalContentDocument> {
    const content = await EducationalContentModel.findOne({ _id: contentId, isActive: true });

    if (!content) {
      throw new AppError('El contenido educativo no existe o no está disponible', 404);
    }

    await content.incrementViewCount();
    await EducationalContentViewModel.create({ userId, contentId: content._id });

    return content;
  }

  async listContent(filters: ListFilters = {}): Promise<EducationalContentDocument[]> {
    const query: Record<string, unknown> = {};
    if (filters.category) {
      query.category = filters.category;
    }
    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    }
    return EducationalContentModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async createContent(payload: CreateEducationalContentPayload): Promise<EducationalContentDocument> {
    return EducationalContentModel.create(payload);
  }

  async updateContent(
    contentId: string,
    payload: UpdateEducationalContentPayload
  ): Promise<EducationalContentDocument> {
    const content = await EducationalContentModel.findByIdAndUpdate(contentId, payload, {
      new: true,
      runValidators: true,
    });

    if (!content) {
      throw new AppError('El contenido educativo no existe', 404);
    }

    return content;
  }

  async deleteContent(contentId: string): Promise<void> {
    const result = await EducationalContentModel.findByIdAndDelete(contentId);
    if (!result) {
      throw new AppError('El contenido educativo no existe', 404);
    }
  }
}

export const educationalContentService = new EducationalContentService();

export default educationalContentService;
