// Controlador de Historial Médico - Capa de Interfaz
import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { MedicalHistoryService } from '../../application/services/MedicalHistoryService';
import { ApiResponse } from '../dtos/ApiResponse';
import { CreateMedicalHistoryRequestDto } from '../dtos/CreateMedicalHistoryRequestDto';
import { MedicalHistoryResponseDto } from '../dtos/MedicalHistoryResponseDto';

export class MedicalHistoryController {
  constructor(private medicalHistoryService: MedicalHistoryService) {}

  async createMedicalHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const createRequest: CreateMedicalHistoryRequestDto = req.body;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      // Establecer el doctorId como el usuario autenticado
      createRequest.doctorId = userId;

      const result = await this.medicalHistoryService.createMedicalHistory(createRequest);
      
      const response: ApiResponse<MedicalHistoryResponseDto> = {
        success: true,
        message: 'Historial médico creado exitosamente',
        data: MedicalHistoryResponseDto.fromEntity(result.medicalHistory)
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al crear historial médico'
      } as ApiResponse);
    }
  }

  async getMedicalHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const result = await this.medicalHistoryService.getMedicalHistory({
        medicalHistoryId: id!,
        userId: userId!,
        userRole: userRole!
      });
      
      const response: ApiResponse<MedicalHistoryResponseDto> = {
        success: true,
        message: 'Historial médico obtenido exitosamente',
        data: MedicalHistoryResponseDto.fromEntity(result.medicalHistory)
      };

      res.status(200).json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('no encontrado') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener historial médico'
      } as ApiResponse);
    }
  }

  async getMedicalHistoriesByPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 10;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const result = await this.medicalHistoryService.getMedicalHistoriesByPatient(
        patientId!,
        userId,
        userRole,
        page,
        limit
      );
      
      const response: ApiResponse = {
        success: true,
        message: 'Historiales médicos obtenidos exitosamente',
        data: result.medicalHistories.map(mh => MedicalHistoryResponseDto.fromEntity(mh)),
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener historiales médicos'
      } as ApiResponse);
    }
  }

  async getMedicalHistoriesByDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { doctorId } = req.params;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 10;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const result = await this.medicalHistoryService.getMedicalHistoriesByDoctor(
        doctorId!,
        userId!,
        userRole!,
        page,
        limit
      );
      
      const response: ApiResponse = {
        success: true,
        message: 'Historiales médicos obtenidos exitosamente',
        data: result.medicalHistories.map(mh => MedicalHistoryResponseDto.fromEntity(mh)),
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener historiales médicos'
      } as ApiResponse);
    }
  }

  async getAllMedicalHistories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 10;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const filters = {
        patientId: req.query['patientId'] as string,
        doctorId: req.query['doctorId'] as string,
        syncStatus: req.query['syncStatus'] as string,
        isOffline: req.query['isOffline'] ? req.query['isOffline'] === 'true' : undefined,
        startDate: req.query['startDate'] as string,
        endDate: req.query['endDate'] as string
      };

      const result = await this.medicalHistoryService.getAllMedicalHistories(
        userRole,
        page,
        limit,
        filters
      );
      
      const response: ApiResponse = {
        success: true,
        message: 'Historiales médicos obtenidos exitosamente',
        data: result.medicalHistories.map(mh => MedicalHistoryResponseDto.fromEntity(mh)),
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener historiales médicos'
      } as ApiResponse);
    }
  }

  async searchMedicalHistories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 10;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Query de búsqueda es requerido'
        } as ApiResponse);
        return;
      }

      const result = await this.medicalHistoryService.searchMedicalHistories(
        query,
        userId,
        userRole,
        page,
        limit
      );
      
      const response: ApiResponse = {
        success: true,
        message: 'Búsqueda completada exitosamente',
        data: result.medicalHistories.map(mh => MedicalHistoryResponseDto.fromEntity(mh)),
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error en la búsqueda'
      } as ApiResponse);
    }
  }

  async getUrgentCases(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const urgentCases = await this.medicalHistoryService.getUrgentCases(userId, userRole);
      
      const response: ApiResponse = {
        success: true,
        message: 'Casos urgentes obtenidos exitosamente',
        data: urgentCases.map(mh => MedicalHistoryResponseDto.fromEntity(mh))
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener casos urgentes'
      } as ApiResponse);
    }
  }

  async getPendingSyncRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const pendingRecords = await this.medicalHistoryService.getPendingSyncRecords(userRole);
      
      const response: ApiResponse = {
        success: true,
        message: 'Registros pendientes de sincronización obtenidos exitosamente',
        data: pendingRecords.map(mh => MedicalHistoryResponseDto.fromEntity(mh))
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener registros pendientes'
      } as ApiResponse);
    }
  }

  async syncMedicalHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const syncedMedicalHistory = await this.medicalHistoryService.syncMedicalHistory(id!);
      
      const response: ApiResponse<MedicalHistoryResponseDto> = {
        success: true,
        message: 'Historial médico sincronizado exitosamente',
        data: MedicalHistoryResponseDto.fromEntity(syncedMedicalHistory)
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al sincronizar historial médico'
      } as ApiResponse);
    }
  }

  async getStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const statistics = await this.medicalHistoryService.getStatistics(userRole);
      
      const response: ApiResponse = {
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: statistics
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener estadísticas'
      } as ApiResponse);
    }
  }
}
