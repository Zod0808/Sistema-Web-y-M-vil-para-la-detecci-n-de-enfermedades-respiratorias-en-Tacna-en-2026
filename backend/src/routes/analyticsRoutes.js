const express = require('express');
const router = express.Router();
const SymptomReport = require('../models/SymptomReport');
const ChatConversation = require('../models/ChatConversation');

// GET /api/analytics/temporal-trends - Get temporal trends data
router.get('/temporal-trends', async (req, res) => {
  try {
    const { period = '30d', district, category } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build filter
    const filter = {
      reportedAt: { $gte: startDate }
    };
    if (district) filter['location.district'] = district;
    if (category) filter.category = category;

    // Generate dynamic daily trends
    const dailyTrends = [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const baseTime = Math.floor(now.getTime() / (1000 * 60 * 5));
    const randomSeed = baseTime % 1000;
    
    const generateValue = (base, variation, seed) => {
      return base + (Math.sin(seed + baseTime) * variation) + (Math.random() * variation * 0.1);
    };
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyTrends.push({
        _id: dateStr,
        data: [
          { severity: 'low', count: Math.floor(generateValue(12, 5, randomSeed + i + 100)) },
          { severity: 'medium', count: Math.floor(generateValue(6, 3, randomSeed + i + 200)) },
          { severity: 'high', count: Math.floor(generateValue(2, 2, randomSeed + i + 300)) }
        ],
        total: Math.floor(generateValue(20, 10, randomSeed + i))
      });
    }

    // Generate dynamic weekly trends
    const weeklyTrends = [];
    const weeks = Math.ceil(days / 7);
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const year = weekDate.getFullYear();
      const week = Math.ceil((weekDate - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
      
      weeklyTrends.push({
        _id: { year, week },
        count: Math.floor(generateValue(140, 50, randomSeed + i)),
        avgSeverity: generateValue(1.5, 0.5, randomSeed + i + 400)
      });
    }

    // Generate dynamic top symptoms
    const topSymptoms = [
      { _id: 'Tos seca', totalCount: Math.floor(generateValue(45, 15, randomSeed + 700)), dailyData: [] },
      { _id: 'Dificultad respiratoria', totalCount: Math.floor(generateValue(35, 12, randomSeed + 800)), dailyData: [] },
      { _id: 'Fiebre', totalCount: Math.floor(generateValue(30, 10, randomSeed + 900)), dailyData: [] },
      { _id: 'Dolor de cabeza', totalCount: Math.floor(generateValue(25, 8, randomSeed + 1000)), dailyData: [] },
      { _id: 'Fatiga', totalCount: Math.floor(generateValue(20, 6, randomSeed + 1100)), dailyData: [] },
      { _id: 'Dolor muscular', totalCount: Math.floor(generateValue(18, 5, randomSeed + 1200)), dailyData: [] },
      { _id: 'Congestión nasal', totalCount: Math.floor(generateValue(15, 4, randomSeed + 1300)), dailyData: [] },
      { _id: 'Dolor de garganta', totalCount: Math.floor(generateValue(12, 3, randomSeed + 1400)), dailyData: [] },
      { _id: 'Náuseas', totalCount: Math.floor(generateValue(10, 2, randomSeed + 1500)), dailyData: [] },
      { _id: 'Dolor abdominal', totalCount: Math.floor(generateValue(8, 2, randomSeed + 1600)), dailyData: [] }
    ];

    res.status(200).json({
      success: true,
      data: {
        dailyTrends,
        weeklyTrends,
        topSymptoms,
        period,
        dateRange: {
          start: startDate,
          end: now
        }
      }
    });
  } catch (error) {
    console.error('Error fetching temporal trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching temporal trends',
      error: error.message
    });
  }
});

// GET /api/analytics/disease-reports - Get reports by disease type
router.get('/disease-reports', async (req, res) => {
  try {
    const { period = '30d', district } = req.query;

    const periodToDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const days = periodToDays[period] || 30;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const filter = {
      createdAt: { $gte: startDate, $lte: now }
    };

    if (district) {
      filter['location.district'] = district;
    }

    // Analyze symptoms to detect potential diseases
    const diseaseAnalysis = await SymptomReport.aggregate([
      { $match: filter },
      { $unwind: "$symptoms" },
      {
        $group: {
          _id: "$symptoms.name",
          count: { $sum: 1 },
          avgSeverity: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ["$symptoms.severity", "mild"] }, then: 1 },
                  { case: { $eq: ["$symptoms.severity", "moderate"] }, then: 2 },
                  { case: { $eq: ["$symptoms.severity", "severe"] }, then: 3 }
                ],
                default: 1
              }
            }
          },
          districts: { $addToSet: "$location.district" },
          categories: { $addToSet: "$category" }
        }
      },
      {
        $addFields: {
          // Map symptoms to potential diseases
          potentialDiseases: {
            $switch: {
              branches: [
                { 
                  case: { $regexMatch: { input: "$_id", regex: /tos|respir|asma/i } },
                  then: ["Asma", "Bronquitis", "COVID-19", "Gripe"]
                },
                { 
                  case: { $regexMatch: { input: "$_id", regex: /fiebre|temperatura/i } },
                  then: ["COVID-19", "Gripe", "Neumonía", "Bronquitis"]
                },
                { 
                  case: { $regexMatch: { input: "$_id", regex: /dificultad|ahogo|falta/i } },
                  then: ["Asma", "EPOC", "Neumonía", "COVID-19"]
                },
                { 
                  case: { $regexMatch: { input: "$_id", regex: /dolor.*pecho|opresión/i } },
                  then: ["Neumonía", "COVID-19", "Asma"]
                },
                { 
                  case: { $regexMatch: { input: "$_id", regex: /sibilancias|silbido/i } },
                  then: ["Asma", "Bronquitis", "EPOC"]
                }
              ],
              default: ["Síntoma General"]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get disease patterns from chat conversations
    const chatDiseaseAnalysis = await ChatConversation.aggregate([
      {
        $unwind: "$messages"
      },
      {
        $match: {
          "messages.role": "bot",
          "messages.metadata.detectedDiseases": { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: "$messages.metadata.detectedDiseases"
      },
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

    // Get district-wise disease distribution
    const districtDiseaseDistribution = await SymptomReport.aggregate([
      { $match: filter },
      { $unwind: "$symptoms" },
      {
        $group: {
          _id: {
            district: "$location.district",
            symptom: "$symptoms.name"
          },
          count: { $sum: 1 },
          severity: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ["$symptoms.severity", "mild"] }, then: 1 },
                  { case: { $eq: ["$symptoms.severity", "moderate"] }, then: 2 },
                  { case: { $eq: ["$symptoms.severity", "severe"] }, then: 3 }
                ],
                default: 1
              }
            }
          }
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
        symptomAnalysis: diseaseAnalysis,
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
    res.status(500).json({
      success: false,
      message: 'Error fetching disease reports',
      error: error.message
    });
  }
});

// GET /api/analytics/dashboard - Get comprehensive dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    
    // Generate dynamic mock data that changes over time
    const baseTime = Math.floor(now.getTime() / (1000 * 60 * 5)); // Change every 5 minutes
    const randomSeed = baseTime % 1000;
    
    // Create deterministic but changing data
    const generateValue = (base, variation, seed) => {
      return base + (Math.sin(seed + baseTime) * variation) + (Math.random() * variation * 0.1);
    };
    
    const dashboardData = {
      overview: {
        totalReports: Math.floor(generateValue(750, 200, randomSeed)),
        recentReports: Math.floor(generateValue(75, 25, randomSeed + 1)),
        urgentReports: Math.floor(generateValue(25, 15, randomSeed + 2)),
        totalConversations: Math.floor(generateValue(150, 50, randomSeed + 3)),
        recentConversations: Math.floor(generateValue(20, 10, randomSeed + 4))
      },
      distributions: {
        severity: [
          { _id: 'low', count: Math.floor(generateValue(400, 100, randomSeed + 5)) },
          { _id: 'medium', count: Math.floor(generateValue(250, 75, randomSeed + 6)) },
          { _id: 'high', count: Math.floor(generateValue(100, 50, randomSeed + 7)) }
        ],
        category: [
          { _id: 'respiratory', count: Math.floor(generateValue(200, 50, randomSeed + 8)) },
          { _id: 'fever', count: Math.floor(generateValue(150, 40, randomSeed + 9)) },
          { _id: 'pain', count: Math.floor(generateValue(100, 30, randomSeed + 10)) },
          { _id: 'fatigue', count: Math.floor(generateValue(80, 25, randomSeed + 11)) },
          { _id: 'digestive', count: Math.floor(generateValue(60, 20, randomSeed + 12)) },
          { _id: 'neurological', count: Math.floor(generateValue(40, 15, randomSeed + 13)) }
        ]
      },
      topDistricts: [
        { _id: 'Centro de Tacna', count: Math.floor(generateValue(80, 20, randomSeed + 14)) },
        { _id: 'Gregorio Albarracín', count: Math.floor(generateValue(65, 15, randomSeed + 15)) },
        { _id: 'Ciudad Nueva', count: Math.floor(generateValue(50, 12, randomSeed + 16)) },
        { _id: 'Pocollay', count: Math.floor(generateValue(35, 10, randomSeed + 17)) },
        { _id: 'Alto de la Alianza', count: Math.floor(generateValue(25, 8, randomSeed + 18)) }
      ],
      recentActivity: [
        {
          district: 'Centro de Tacna',
          symptoms: ['Tos seca', 'Dificultad respiratoria'],
          severity: 'high',
          reportedAt: new Date(now.getTime() - Math.random() * 2 * 60 * 60 * 1000),
          category: 'respiratory'
        },
        {
          district: 'Gregorio Albarracín',
          symptoms: ['Fiebre', 'Dolor de cabeza'],
          severity: 'medium',
          reportedAt: new Date(now.getTime() - Math.random() * 4 * 60 * 60 * 1000),
          category: 'fever'
        },
        {
          district: 'Ciudad Nueva',
          symptoms: ['Fatiga', 'Dolor muscular'],
          severity: 'low',
          reportedAt: new Date(now.getTime() - Math.random() * 6 * 60 * 60 * 1000),
          category: 'fatigue'
        },
        {
          district: 'Pocollay',
          symptoms: ['Dolor de garganta', 'Congestión nasal'],
          severity: 'medium',
          reportedAt: new Date(now.getTime() - Math.random() * 8 * 60 * 60 * 1000),
          category: 'respiratory'
        },
        {
          district: 'Alto de la Alianza',
          symptoms: ['Náuseas', 'Dolor abdominal'],
          severity: 'low',
          reportedAt: new Date(now.getTime() - Math.random() * 12 * 60 * 60 * 1000),
          category: 'digestive'
        }
      ],
      lastUpdated: now,
      dataSource: 'dynamic-mock'
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

module.exports = router;
