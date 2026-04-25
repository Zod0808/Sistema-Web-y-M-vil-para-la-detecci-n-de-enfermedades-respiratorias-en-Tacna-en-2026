/**
 * Dashboard Controller
 * Handles dashboard analytics and statistics
 */

import { Response } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import User from '../models/User';
import MedicalHistory from '../models/MedicalHistory';
import aiIntegrationService from '../services/aiIntegration';

// Get dashboard overview for admin
export const getAdminDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Verify admin access
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  try {
    // Get user statistics
    const userStats = await User.getUserStats();
    
    // Get medical history statistics
    const medicalStats = await MedicalHistory.getStats();
    
    // Get top diagnoses
    const topDiagnoses = await MedicalHistory.getTopDiagnoses(10);
    
    // Get age statistics
    const ageStats = await MedicalHistory.getAgeStats();
    
    // Get AI service status
    const aiStatus = await aiIntegrationService.getServiceStatus();

    // Calculate growth metrics (last 30 days vs previous 30 days)
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [recentHistories, previousHistories] = await Promise.all([
      MedicalHistory.countDocuments({ createdAt: { $gte: last30Days } }),
      MedicalHistory.countDocuments({ 
        createdAt: { $gte: previous30Days, $lt: last30Days } 
      })
    ]);

    const historyGrowth = previousHistories > 0 
      ? ((recentHistories - previousHistories) / previousHistories) * 100 
      : 0;

    const dashboard = {
      overview: {
        totalUsers: Object.values(userStats).reduce((sum: number, stat: any) => sum + (stat?.total || 0), 0),
        activeUsers: Object.values(userStats).reduce((sum: number, stat: any) => sum + (stat?.active || 0), 0),
        totalMedicalHistories: medicalStats.total,
        pendingSync: medicalStats.pendingSync,
        aiServiceStatus: aiStatus.connected ? 'online' : 'offline'
      },
      userStats,
      medicalStats,
      topDiagnoses,
      ageStats,
      growth: {
        medicalHistories: {
          current: recentHistories,
          previous: previousHistories,
          growthPercentage: Math.round(historyGrowth * 100) / 100
        }
      },
      aiService: {
        connected: aiStatus.connected,
        lastCheck: aiStatus.lastCheck,
        responseTime: aiStatus.responseTime
      }
    };

    const response: ApiResponse = {
      success: true,
      message: 'Dashboard de administrador obtenido exitosamente',
      data: dashboard
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Admin dashboard retrieval failed', error);
    throw error;
  }
});

// Get dashboard overview for doctor
export const getDoctorDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const doctorId = req.user?._id;

  try {
    // Get doctor's medical histories
    const totalHistories = await MedicalHistory.countDocuments({ doctorId });
    
    // Get recent histories (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentHistories = await MedicalHistory.countDocuments({
      doctorId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get pending sync histories
    const pendingSync = await MedicalHistory.countDocuments({
      doctorId,
      syncStatus: 'pending'
    });

    // Get top diagnoses for this doctor
    const topDiagnoses = await MedicalHistory.aggregate([
      { $match: { doctorId } },
      {
        $group: {
          _id: '$diagnosis',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get patient statistics
    const patientStats = await MedicalHistory.aggregate([
      { $match: { doctorId } },
      {
        $group: {
          _id: '$patientId',
          visitCount: { $sum: 1 },
          lastVisit: { $max: '$date' }
        }
      },
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          avgVisitsPerPatient: { $avg: '$visitCount' }
        }
      }
    ]);

    // Get monthly statistics for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await MedicalHistory.aggregate([
      { 
        $match: { 
          doctorId,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const dashboard = {
      overview: {
        totalHistories,
        recentHistories,
        pendingSync,
        totalPatients: patientStats[0]?.totalPatients || 0,
        avgVisitsPerPatient: Math.round((patientStats[0]?.avgVisitsPerPatient || 0) * 100) / 100
      },
      topDiagnoses,
      monthlyStats,
      recentActivity: {
        last30Days: recentHistories,
        pendingSync
      }
    };

    const response: ApiResponse = {
      success: true,
      message: 'Dashboard de doctor obtenido exitosamente',
      data: dashboard
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Doctor dashboard retrieval failed', {
      doctorId,
      error: error.message
    });
    throw error;
  }
});

// Get dashboard overview for patient
export const getPatientDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const patientId = req.user?._id;

  try {
    // Get patient's medical histories
    const totalHistories = await MedicalHistory.countDocuments({ patientId });
    
    // Get recent histories (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentHistories = await MedicalHistory.countDocuments({
      patientId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get pending sync histories
    const pendingSync = await MedicalHistory.countDocuments({
      patientId,
      syncStatus: 'pending'
    });

    // Get recent medical histories with details
    const recentMedicalHistories = await MedicalHistory.find({ patientId })
      .select('diagnosis date symptoms')
      .sort({ date: -1 })
      .limit(5);

    // Get symptom statistics
    const symptomStats = await MedicalHistory.aggregate([
      { $match: { patientId } },
      { $unwind: '$symptoms' },
      {
        $group: {
          _id: '$symptoms.name',
          count: { $sum: 1 },
          avgSeverity: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$symptoms.severity', 'mild'] }, then: 1 },
                  { case: { $eq: ['$symptoms.severity', 'moderate'] }, then: 2 },
                  { case: { $eq: ['$symptoms.severity', 'severe'] }, then: 3 }
                ],
                default: 1
              }
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get monthly visit statistics
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyVisits = await MedicalHistory.aggregate([
      { 
        $match: { 
          patientId,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const dashboard = {
      overview: {
        totalHistories,
        recentHistories,
        pendingSync
      },
      recentMedicalHistories,
      symptomStats,
      monthlyVisits,
      healthSummary: {
        totalSymptoms: recentMedicalHistories.reduce((sum, history) => sum + history.symptoms.length, 0),
        mostCommonSymptom: symptomStats[0]?._id || 'N/A',
        lastVisit: recentMedicalHistories[0]?.date || null
      }
    };

    const response: ApiResponse = {
      success: true,
      message: 'Dashboard de paciente obtenido exitosamente',
      data: dashboard
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Patient dashboard retrieval failed', {
      patientId,
      error: error.message
    });
    throw error;
  }
});

// Get system health status
export const getSystemHealth = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseHealth();
    
    // Check AI service status
    const aiStatus = await aiIntegrationService.getServiceStatus();
    
    // Get system metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };

    const health = {
      status: dbStatus.connected && aiStatus.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        aiService: aiStatus
      },
      system: systemMetrics
    };

    const response: ApiResponse = {
      success: true,
      message: 'Estado del sistema obtenido exitosamente',
      data: health
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('System health check failed', error);
    throw error;
  }
});

// Helper function to check database health
async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  responseTime?: number;
  lastCheck: Date;
}> {
  const startTime = Date.now();
  
  try {
    // Simple database ping
    await MedicalHistory.findOne().limit(1);
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      responseTime,
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      connected: false,
      lastCheck: new Date()
    };
  }
}
