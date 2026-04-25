const express = require('express');
const router = express.Router();
const SymptomReport = require('../models/SymptomReport');
const ChatConversation = require('../models/ChatConversation');

// GET /api/analytics/simple-dashboard - Get simplified dashboard data
router.get('/simple-dashboard', async (req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get basic counts with simple queries
    const totalReports = await SymptomReport.countDocuments().maxTimeMS(3000);
    const recentReports = await SymptomReport.countDocuments({ 
      reportedAt: { $gte: last7Days } 
    }).maxTimeMS(3000);
    const urgentReports = await SymptomReport.countDocuments({ 
      status: 'urgent' 
    }).maxTimeMS(3000);
    const totalConversations = await ChatConversation.countDocuments().maxTimeMS(3000);

    // Get simple severity distribution
    const severityCounts = {
      high: await SymptomReport.countDocuments({ severityLevel: 'high' }).maxTimeMS(3000),
      medium: await SymptomReport.countDocuments({ severityLevel: 'medium' }).maxTimeMS(3000),
      low: await SymptomReport.countDocuments({ severityLevel: 'low' }).maxTimeMS(3000)
    };

    // Get simple category distribution
    const categoryCounts = {
      respiratory: await SymptomReport.countDocuments({ category: 'respiratory' }).maxTimeMS(3000),
      fever: await SymptomReport.countDocuments({ category: 'fever' }).maxTimeMS(3000),
      pain: await SymptomReport.countDocuments({ category: 'pain' }).maxTimeMS(3000),
      other: await SymptomReport.countDocuments({ category: 'other' }).maxTimeMS(3000)
    };

    // Get recent activity (last 5 reports)
    const recentActivity = await SymptomReport.find()
      .sort({ reportedAt: -1 })
      .limit(5)
      .select('location.district symptoms severityLevel reportedAt category')
      .maxTimeMS(3000);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalReports,
          recentReports,
          urgentReports,
          totalConversations
        },
        distributions: {
          severity: Object.entries(severityCounts).map(([key, value]) => ({ _id: key, count: value })),
          category: Object.entries(categoryCounts).map(([key, value]) => ({ _id: key, count: value }))
        },
        recentActivity,
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Error fetching simple dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// GET /api/analytics/simple-trends - Get simplified trends data
router.get('/simple-trends', async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get daily counts for last 30 days
    const dailyCounts = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const count = await SymptomReport.countDocuments({
        reportedAt: { $gte: startOfDay, $lt: endOfDay }
      }).maxTimeMS(2000);
      
      dailyCounts.unshift({
        date: startOfDay.toISOString().split('T')[0],
        count
      });
    }

    // Get top symptoms (simple approach)
    const allReports = await SymptomReport.find()
      .select('symptoms')
      .limit(100)
      .maxTimeMS(3000);

    const symptomCounts = {};
    allReports.forEach(report => {
      if (report.symptoms) {
        report.symptoms.forEach(symptom => {
          const name = symptom.name;
          symptomCounts[name] = (symptomCounts[name] || 0) + 1;
        });
      }
    });

    const topSymptoms = Object.entries(symptomCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        dailyTrends: dailyCounts,
        topSymptoms,
        period: '30d',
        dateRange: {
          start: last30Days,
          end: now
        }
      }
    });
  } catch (error) {
    console.error('Error fetching simple trends data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trends data',
      error: error.message
    });
  }
});

// GET /api/analytics/simple-diseases - Get simplified disease data
router.get('/simple-diseases', async (req, res) => {
  try {
    // Get symptom analysis from recent reports
    const recentReports = await SymptomReport.find()
      .select('symptoms category location.district')
      .limit(200)
      .maxTimeMS(3000);

    const symptomAnalysis = {};
    const districtDistribution = {};

    recentReports.forEach(report => {
      // Count by district
      const district = report.location?.district || 'Unknown';
      districtDistribution[district] = (districtDistribution[district] || 0) + 1;

      // Count symptoms
      if (report.symptoms) {
        report.symptoms.forEach(symptom => {
          const name = symptom.name;
          if (!symptomAnalysis[name]) {
            symptomAnalysis[name] = {
              count: 0,
              districts: new Set(),
              categories: new Set()
            };
          }
          symptomAnalysis[name].count++;
          symptomAnalysis[name].districts.add(district);
          symptomAnalysis[name].categories.add(report.category);
        });
      }
    });

    // Convert to array format
    const symptomData = Object.entries(symptomAnalysis)
      .map(([name, data]) => ({
        name,
        count: data.count,
        districts: Array.from(data.districts).length,
        categories: Array.from(data.categories)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const districtData = Object.entries(districtDistribution)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      data: {
        symptomAnalysis: symptomData,
        districtDistribution: districtData,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching simple disease data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching disease data',
      error: error.message
    });
  }
});

module.exports = router;
