const express = require('express');
const router = express.Router();

const SymptomReport = require('../models/SymptomReport');
const ChatConversation = require('../models/ChatConversation');

// GET /api/analytics/dashboard - Get comprehensive dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Verificar si MongoDB está conectado
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (!isMongoConnected) {
      // No retornar datos mock - solo error
      console.error('MongoDB no está conectado');
      return res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado. No se pueden obtener datos del dashboard.',
        error: 'Database connection unavailable'
      });
    }

    const overviewPromise = Promise.all([
      SymptomReport.countDocuments().exec(),
      SymptomReport.countDocuments({ 
        $or: [
          { reportedAt: { $gte: sevenDaysAgo, $lte: now } },
          { createdAt: { $gte: sevenDaysAgo, $lte: now } }
        ]
      }).exec(),
      SymptomReport.countDocuments({ 
        $or: [
          { status: 'urgent' },
          { overallSeverity: 'high' }
        ]
      }).exec(),
      ChatConversation.countDocuments().exec(),
      ChatConversation.countDocuments({ 
        $or: [
          { startedAt: { $gte: sevenDaysAgo, $lte: now } },
          { createdAt: { $gte: sevenDaysAgo, $lte: now } }
        ]
      }).exec(),
    ]);

    const severityDistributionPromise = SymptomReport.aggregate([
      {
        $group: {
          _id: '$overallSeverity',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const categoryDistributionPromise = SymptomReport.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const severitySwitch = {
      $switch: {
        branches: [
          { case: { $eq: ['$overallSeverity', 'low'] }, then: 1 },
          { case: { $eq: ['$overallSeverity', 'medium'] }, then: 2 },
          { case: { $eq: ['$overallSeverity', 'high'] }, then: 3 },
        ],
        default: 1,
      },
    };

    const topDistrictsPromise = SymptomReport.aggregate([
      {
        $match: {
          'location.district': { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$location.district',
          count: { $sum: 1 },
          avgSeverity: { $avg: severitySwitch },
        },
      },
      { $match: { count: { $gt: 0 } } }, // Filtrar distritos con count > 0
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const recentActivityPromise = SymptomReport.find()
      .sort({ reportedAt: -1, createdAt: -1 })
      .limit(10)
      .select(['location', 'symptoms', 'overallSeverity', 'category', 'reportedAt', 'createdAt'])
      .lean();

    const [
      overviewCounts,
      severityDistribution,
      categoryDistribution,
      topDistricts,
      recentActivityRaw,
    ] = await Promise.all([
      overviewPromise,
      severityDistributionPromise,
      categoryDistributionPromise,
      topDistrictsPromise,
      recentActivityPromise,
    ]);

    const [
      totalReports,
      recentReports,
      urgentReports,
      totalConversations,
      recentConversations,
    ] = overviewCounts;

    const formatSeverityLevel = (value) => {
      if (value >= 2.5) return 'high';
      if (value >= 1.5) return 'medium';
      return 'low';
    };

    const dashboardData = {
      overview: {
        totalReports,
        recentReports,
        urgentReports,
        totalConversations,
        recentConversations,
      },
      distributions: {
        severity: severityDistribution.map((item) => ({
          _id: item._id,
          count: item.count,
        })),
        category: categoryDistribution.map((item) => ({
          _id: item._id,
          count: item.count,
        })),
      },
      topDistricts: topDistricts
        .filter(district => district && district._id && district.count > 0) // Filtrar distritos válidos
        .map((district) => ({
          _id: String(district._id || '').trim(),
          count: Number(district.count || 0),
          avgSeverity: Number((district.avgSeverity || 0).toFixed(2)),
          severityLevel: formatSeverityLevel(district.avgSeverity ?? 1),
        })),
      recentActivity: recentActivityRaw.map((report) => ({
        district: report.location?.district ?? 'Sin distrito',
        symptoms: (report.symptoms || []).slice(0, 4),
        severityLevel: report.overallSeverity ?? 'low',
        category: report.category ?? 'respiratory',
        reportedAt: report.reportedAt || report.createdAt,
      })),
      lastUpdated: now,
      dataSource: 'database',
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    // No retornar datos mock - solo error
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data from database',
      error: error.message,
    });
  }
});

// GET /api/analytics/temporal-trends - Get temporal trends data from database
router.get('/temporal-trends', async (req, res) => {
  try {
    const { period = '30d', district, category } = req.query;
    
    // Verificar si MongoDB está conectado
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (!isMongoConnected) {
      console.error('MongoDB no está conectado');
      return res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado. No se pueden obtener datos de tendencias temporales.',
        error: 'Database connection unavailable'
      });
    }

    const now = new Date();
    const periodToDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const days = periodToDays[period] || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Construir filtro base
    const baseFilter = {
      $or: [
        { reportedAt: { $gte: startDate, $lte: now } },
        { createdAt: { $gte: startDate, $lte: now } }
      ]
    };

    if (district && district !== 'all') {
      baseFilter['location.district'] = district;
    }

    if (category && category !== 'all') {
      baseFilter.category = category;
    }

    // Daily trends - agrupar por día y severidad
    const dailyTrends = await SymptomReport.aggregate([
      { $match: baseFilter },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $ifNull: ['$reportedAt', '$createdAt'] }
            }
          },
          severity: '$overallSeverity'
        }
      },
      {
        $group: {
          _id: { date: '$date', severity: '$severity' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          data: {
            $push: {
              severity: '$_id.severity',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]).exec();

    // Weekly trends
    const weeklyTrends = await SymptomReport.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: {
            year: { $year: { $ifNull: ['$reportedAt', '$createdAt'] } },
            week: { $week: { $ifNull: ['$reportedAt', '$createdAt'] } }
          },
          count: { $sum: 1 },
          avgSeverity: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$overallSeverity', 'low'] }, then: 1 },
                  { case: { $eq: ['$overallSeverity', 'medium'] }, then: 2 },
                  { case: { $eq: ['$overallSeverity', 'high'] }, then: 3 }
                ],
                default: 1
              }
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]).exec();

    // Top symptoms
    const topSymptoms = await SymptomReport.aggregate([
      { $match: baseFilter },
      { $unwind: '$symptoms' },
      {
        $group: {
          _id: '$symptoms.name',
          totalCount: { $sum: 1 }
        }
      },
      { $sort: { totalCount: -1 } },
      { $limit: 10 }
    ]).exec();

    res.status(200).json({
      success: true,
      data: {
        dailyTrends: dailyTrends.map(item => ({
          _id: item._id,
          data: item.data,
          total: item.total
        })),
        weeklyTrends: weeklyTrends.map(item => ({
          _id: item._id,
          count: item.count,
          avgSeverity: Math.round(item.avgSeverity * 100) / 100
        })),
        topSymptoms: topSymptoms.map(item => ({
          _id: item._id,
          totalCount: item.totalCount,
          dailyData: []
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching temporal trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching temporal trends from database',
      error: error.message
    });
  }
});

// GET /api/analytics/disease-reports - Get disease reports data
router.get('/disease-reports', async (req, res) => {
  try {
    // Verificar si MongoDB está conectado
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (!isMongoConnected) {
      // No retornar datos mock - solo error
      console.error('MongoDB no está conectado');
      return res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado. No se pueden obtener datos de enfermedades.',
        error: 'Database connection unavailable'
      });
    }

    const { district, period = '30d' } = req.query;

    const periodToDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const days = periodToDays[period] || 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const symptomFilter = {
      createdAt: { $gte: startDate, $lte: now }
    };

    if (district && district !== 'all') {
      symptomFilter['location.district'] = district;
    }

    const symptomSeveritySwitch = {
      $switch: {
        branches: [
          { case: { $eq: ["$symptoms.severity", "mild"] }, then: 1 },
          { case: { $eq: ["$symptoms.severity", "moderate"] }, then: 2 },
          { case: { $eq: ["$symptoms.severity", "severe"] }, then: 3 }
        ],
        default: 1
      }
    };

    const symptomAnalysis = await SymptomReport.aggregate([
      { $match: symptomFilter },
      { $unwind: "$symptoms" },
      {
        $group: {
          _id: "$symptoms.name",
          count: { $sum: 1 },
          avgSeverity: { $avg: symptomSeveritySwitch },
          districts: { $addToSet: "$location.district" },
          categories: { $addToSet: "$category" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const chatDiseaseAnalysis = await ChatConversation.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: now } } },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.role": "bot",
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$messages.metadata.detectedDiseases", []] },
                    as: "disease",
                    cond: { $ne: ["$$disease", null] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      { $unwind: "$messages.metadata.detectedDiseases" },
      {
        $group: {
          _id: "$messages.metadata.detectedDiseases",
          count: { $sum: 1 },
          avgConfidence: { $avg: "$messages.metadata.confidence" },
          avgUrgency: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ["$messages.metadata.urgencyLevel", "very_low"] }, then: 1 },
                  { case: { $eq: ["$messages.metadata.urgencyLevel", "low"] }, then: 2 },
                  { case: { $eq: ["$messages.metadata.urgencyLevel", "medium"] }, then: 3 },
                  { case: { $eq: ["$messages.metadata.urgencyLevel", "high"] }, then: 4 },
                  { case: { $eq: ["$messages.metadata.urgencyLevel", "critical"] }, then: 5 }
                ],
                default: 1
              }
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const districtDiseaseDistribution = await SymptomReport.aggregate([
      { $match: symptomFilter },
      { $unwind: "$symptoms" },
      {
        $group: {
          _id: {
            district: "$location.district",
            symptom: "$symptoms.name"
          },
          count: { $sum: 1 },
          severity: { $avg: symptomSeveritySwitch }
        }
      },
      {
        $group: {
          _id: "$_id.district",
          symptoms: {
            $push: {
              name: "$_id.symptom",
              count: "$count",
              severity: "$severity"
            }
          },
          totalReports: { $sum: "$count" }
        }
      },
      { $sort: { totalReports: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        symptomAnalysis,
        chatDiseaseAnalysis,
        districtDistribution: districtDiseaseDistribution,
        period,
        dateRange: {
          start: startDate,
          end: now
        }
      }
    });
  } catch (error) {
    console.error('Error fetching disease reports:', error);
    
    // No retornar datos mock - solo error
    res.status(500).json({
      success: false,
      message: 'Error fetching disease reports from database',
      error: error.message
    });
  }
});

module.exports = router;
