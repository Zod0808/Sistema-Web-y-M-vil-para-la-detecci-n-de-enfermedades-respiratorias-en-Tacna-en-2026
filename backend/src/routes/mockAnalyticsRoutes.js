const express = require('express');
const router = express.Router();

// GET /api/analytics/mock-dashboard - Get mock dashboard data for demonstration
router.get('/mock-dashboard', async (req, res) => {
  try {
    const now = new Date();
    
    // Mock data for demonstration
    const mockData = {
      overview: {
        totalReports: 203,
        recentReports: 45,
        urgentReports: 8,
        totalConversations: 156
      },
      distributions: {
        severity: [
          { _id: 'high', count: 45 },
          { _id: 'medium', count: 94 },
          { _id: 'low', count: 64 }
        ],
        category: [
          { _id: 'respiratory', count: 170 },
          { _id: 'fever', count: 25 },
          { _id: 'pain', count: 8 }
        ]
      },
      topDistricts: [
        { _id: 'Centro de Tacna', count: 45, avgSeverity: 2.1 },
        { _id: 'Alto de la Alianza', count: 38, avgSeverity: 2.3 },
        { _id: 'Gregorio Albarracín', count: 32, avgSeverity: 1.8 },
        { _id: 'Ciudad Nueva', count: 28, avgSeverity: 2.0 },
        { _id: 'Boca del Río', count: 25, avgSeverity: 1.9 }
      ],
      recentActivity: [
        {
          location: { district: 'Centro de Tacna' },
          symptoms: [{ name: 'tos seca' }, { name: 'fiebre' }],
          severityLevel: 'high',
          reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          category: 'respiratory'
        },
        {
          location: { district: 'Alto de la Alianza' },
          symptoms: [{ name: 'dificultad respiratoria' }],
          severityLevel: 'medium',
          reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          category: 'respiratory'
        },
        {
          location: { district: 'Gregorio Albarracín' },
          symptoms: [{ name: 'dolor de garganta' }],
          severityLevel: 'low',
          reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          category: 'pain'
        }
      ],
      lastUpdated: now
    };

    res.status(200).json({
      success: true,
      data: mockData
    });
  } catch (error) {
    console.error('Error fetching mock dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// GET /api/analytics/mock-trends - Get mock trends data
router.get('/mock-trends', async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate mock daily trends for last 30 days
    const dailyTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const baseCount = Math.floor(Math.random() * 15) + 5; // 5-20 reports per day
      const highCount = Math.floor(baseCount * 0.2);
      const mediumCount = Math.floor(baseCount * 0.4);
      const lowCount = baseCount - highCount - mediumCount;
      
      dailyTrends.push({
        _id: date.toISOString().split('T')[0],
        data: [
          { severity: 'high', count: highCount },
          { severity: 'medium', count: mediumCount },
          { severity: 'low', count: lowCount }
        ],
        total: baseCount
      });
    }

    // Generate mock weekly trends
    const weeklyTrends = [];
    for (let i = 4; i >= 0; i--) {
      const weekCount = Math.floor(Math.random() * 50) + 30; // 30-80 reports per week
      weeklyTrends.push({
        _id: { year: 2024, week: 45 - i },
        count: weekCount,
        avgSeverity: Math.random() * 2 + 1 // 1-3 severity
      });
    }

    // Mock top symptoms
    const topSymptoms = [
      { _id: 'tos seca', totalCount: 45, dailyData: [] },
      { _id: 'fiebre', totalCount: 38, dailyData: [] },
      { _id: 'dificultad respiratoria', totalCount: 32, dailyData: [] },
      { _id: 'dolor de garganta', totalCount: 28, dailyData: [] },
      { _id: 'fatiga', totalCount: 25, dailyData: [] }
    ];

    res.status(200).json({
      success: true,
      data: {
        dailyTrends,
        weeklyTrends,
        topSymptoms,
        period: '30d',
        dateRange: {
          start: last30Days,
          end: now
        }
      }
    });
  } catch (error) {
    console.error('Error fetching mock trends data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trends data',
      error: error.message
    });
  }
});

// GET /api/analytics/mock-diseases - Get mock disease data
router.get('/mock-diseases', async (req, res) => {
  try {
    // Mock symptom analysis
    const symptomAnalysis = [
      {
        _id: 'tos seca',
        count: 45,
        avgSeverity: 2.1,
        districts: ['Centro de Tacna', 'Alto de la Alianza', 'Gregorio Albarracín'],
        categories: ['respiratory'],
        potentialDiseases: ['Asma', 'Bronquitis', 'COVID-19', 'Gripe']
      },
      {
        _id: 'fiebre',
        count: 38,
        avgSeverity: 2.5,
        districts: ['Centro de Tacna', 'Ciudad Nueva', 'Boca del Río'],
        categories: ['fever'],
        potentialDiseases: ['COVID-19', 'Gripe', 'Neumonía', 'Bronquitis']
      },
      {
        _id: 'dificultad respiratoria',
        count: 32,
        avgSeverity: 2.8,
        districts: ['Alto de la Alianza', 'Pocollay'],
        categories: ['respiratory'],
        potentialDiseases: ['Asma', 'EPOC', 'Neumonía', 'COVID-19']
      }
    ];

    // Mock chat disease analysis
    const chatDiseaseAnalysis = [
      { _id: 'Asma', count: 25, avgConfidence: 0.85, avgUrgency: 2.1 },
      { _id: 'COVID-19', count: 18, avgConfidence: 0.78, avgUrgency: 3.2 },
      { _id: 'Bronquitis', count: 15, avgConfidence: 0.82, avgUrgency: 2.5 },
      { _id: 'Gripe', count: 12, avgConfidence: 0.75, avgUrgency: 1.8 },
      { _id: 'Neumonía', count: 8, avgConfidence: 0.88, avgUrgency: 3.5 }
    ];

    // Mock district distribution
    const districtDistribution = [
      {
        _id: 'Centro de Tacna',
        symptoms: [
          { name: 'tos seca', count: 15, severity: 2.1 },
          { name: 'fiebre', count: 12, severity: 2.3 }
        ],
        totalReports: 45
      },
      {
        _id: 'Alto de la Alianza',
        symptoms: [
          { name: 'dificultad respiratoria', count: 18, severity: 2.8 },
          { name: 'tos seca', count: 10, severity: 2.0 }
        ],
        totalReports: 38
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        symptomAnalysis,
        chatDiseaseAnalysis,
        districtDistribution,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching mock disease data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching disease data',
      error: error.message
    });
  }
});

module.exports = router;
