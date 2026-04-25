/**
 * Symptom Reports Routes
 * API endpoints for symptom reporting and heatmap data
 */

const express = require('express');
const router = express.Router();

// Controllers will be loaded dynamically to avoid mongoose connection issues
let SymptomReport;

// Initialize mongoose connection
const initializeModel = () => {
  if (!SymptomReport) {
    try {
      const mongoose = require('mongoose');
      // Only connect if not already connected
      if (mongoose.connection.readyState === 0) {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';
        mongoose.connect(mongoUri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000
        }).then(() => {
          console.log('✅ MongoDB connected for symptom reports');
        }).catch(err => {
          console.error('❌ MongoDB connection error:', err.message);
        });
      }
      SymptomReport = require('../models/SymptomReport');
    } catch (error) {
      console.error('Error loading SymptomReport model:', error);
    }
  }
  return SymptomReport;
};

/**
 * @route   GET /api/symptom-reports
 * @desc    Get all symptom reports with optional filters
 * @access  Public
 * @query   district, severity, startDate, endDate, limit
 */
router.get('/', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available',
        data: []
      });
    }

    const {
      district,
      severity,
      startDate,
      endDate,
      limit = 100,
      status
    } = req.query;

    // Build query
    const query = {};
    if (district) query['location.district'] = district;
    if (severity) query.overallSeverity = severity;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const reports = await Model.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-contactInfo -patientId'); // Exclude sensitive data

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching symptom reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching symptom reports',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/symptom-reports/heatmap
 * @desc    Get aggregated data for heatmap visualization (real-time)
 * @access  Public
 * @query   startDate, endDate
 */
router.get('/heatmap', async (req, res) => {
  try {
    const Model = initializeModel();
    const mongoose = require('mongoose');
    
    // Get data from both SymptomReport and MedicalHistory
    let aggregatedData = [];
    
    if (Model) {
      const { startDate, endDate } = req.query;
      
      // Log the date range for debugging
      console.log('📅 Heatmap request - Date range:', { 
        startDate, 
        endDate,
        startDateParsed: startDate ? new Date(startDate).toISOString() : null,
        endDateParsed: endDate ? new Date(endDate).toISOString() : null
      });
      
      // Get data from SymptomReport
      const symptomReportData = await Model.getAggregatedByDistrict({
        startDate,
        endDate
      });
      
      console.log('📊 Heatmap response - Districts found:', symptomReportData.length);
      
      // Get data from MedicalHistory (real cases)
      let medicalHistoryData = [];
      try {
        const MedicalHistory = mongoose.models.MedicalHistory || 
          mongoose.model('MedicalHistory', new mongoose.Schema({}, { strict: false }));
        
        const matchStage = {
          'location.latitude': { $exists: true, $ne: null },
          'location.longitude': { $exists: true, $ne: null }
        };
        
        if (startDate) {
          matchStage.date = { $gte: new Date(startDate) };
        }
        if (endDate) {
          matchStage.date = { ...matchStage.date, $lte: new Date(endDate) };
        }
        
        // Map coordinates to districts (simplified mapping)
        const districtMapping = {
          'Centro de Tacna': { lat: -18.0066, lng: -70.2463, bounds: { lat: 0.01, lng: 0.01 } },
          'Alto de la Alianza': { lat: -18.0167, lng: -70.25, bounds: { lat: 0.01, lng: 0.01 } },
          'Gregorio Albarracín': { lat: -18.0, lng: -70.24, bounds: { lat: 0.01, lng: 0.01 } },
          'Ciudad Nueva': { lat: -18.01, lng: -70.23, bounds: { lat: 0.01, lng: 0.01 } },
          'Pocollay': { lat: -18.02, lng: -70.26, bounds: { lat: 0.01, lng: 0.01 } },
          'Calana': { lat: -17.95, lng: -70.2, bounds: { lat: 0.01, lng: 0.01 } },
          'Pachia': { lat: -17.9, lng: -70.15, bounds: { lat: 0.01, lng: 0.01 } },
          'Boca del Río': { lat: -18.1, lng: -70.3, bounds: { lat: 0.01, lng: 0.01 } }
        };
        
        const medicalHistories = await MedicalHistory.find(matchStage)
          .select('location symptoms date diagnosis')
          .lean();
        
        // Group by district based on coordinates
        const districtCounts = {};
        medicalHistories.forEach(history => {
          if (history.location && history.location.latitude && history.location.longitude) {
            // Find closest district
            let closestDistrict = null;
            let minDistance = Infinity;
            
            for (const [district, coords] of Object.entries(districtMapping)) {
              const distance = Math.sqrt(
                Math.pow(history.location.latitude - coords.lat, 2) +
                Math.pow(history.location.longitude - coords.lng, 2)
              );
              if (distance < minDistance && distance < 0.05) { // Within ~5km
                minDistance = distance;
                closestDistrict = district;
              }
            }
            
            if (closestDistrict) {
              if (!districtCounts[closestDistrict]) {
                districtCounts[closestDistrict] = {
                  district: closestDistrict,
                  totalCases: 0,
                  highSeverity: 0,
                  mediumSeverity: 0,
                  lowSeverity: 0,
                  coordinates: {
                    latitude: districtMapping[closestDistrict].lat,
                    longitude: districtMapping[closestDistrict].lng
                  },
                  symptoms: new Set(),
                  lastReport: null
                };
              }
              
              districtCounts[closestDistrict].totalCases++;
              if (history.symptoms) {
                history.symptoms.forEach(s => {
                  if (s.name) districtCounts[closestDistrict].symptoms.add(s.name);
                  if (s.severity === 'severe') districtCounts[closestDistrict].highSeverity++;
                  else if (s.severity === 'moderate') districtCounts[closestDistrict].mediumSeverity++;
                  else districtCounts[closestDistrict].lowSeverity++;
                });
              }
              
              if (!districtCounts[closestDistrict].lastReport || 
                  new Date(history.date) > new Date(districtCounts[closestDistrict].lastReport)) {
                districtCounts[closestDistrict].lastReport = history.date;
              }
            }
          }
        });
        
        medicalHistoryData = Object.values(districtCounts).map(d => ({
          district: d.district,
          totalCases: d.totalCases,
          highSeverity: d.highSeverity,
          mediumSeverity: d.mediumSeverity,
          lowSeverity: d.lowSeverity,
          coordinates: d.coordinates,
          severity: d.highSeverity >= 10 ? 'high' : (d.totalCases >= 20 ? 'medium' : 'low'),
          symptoms: Array.from(d.symptoms),
          lastReport: d.lastReport
        }));
      } catch (mhError) {
        console.warn('Error fetching MedicalHistory data:', mhError.message);
      }
      
      // Merge data from both sources
      const mergedData = {};
      
      // Add SymptomReport data
      symptomReportData.forEach(item => {
        mergedData[item.district] = {
          ...item,
          count: item.totalCases || 0,
          symptoms: new Set(Array.isArray(item.symptoms) ? item.symptoms : [])
        };
      });
      
      // Add/merge MedicalHistory data
      medicalHistoryData.forEach(item => {
        if (mergedData[item.district]) {
          mergedData[item.district].totalCases += item.totalCases;
          mergedData[item.district].count += item.totalCases;
          mergedData[item.district].highSeverity += item.highSeverity;
          mergedData[item.district].mediumSeverity += item.mediumSeverity;
          mergedData[item.district].lowSeverity += item.lowSeverity;
          // Merge symptoms
          if (Array.isArray(item.symptoms)) {
            item.symptoms.forEach(s => mergedData[item.district].symptoms.add(s));
          }
          // Use most recent lastReport
          if (item.lastReport && (!mergedData[item.district].lastReport || 
              new Date(item.lastReport) > new Date(mergedData[item.district].lastReport))) {
            mergedData[item.district].lastReport = item.lastReport;
          }
        } else {
          mergedData[item.district] = {
            ...item,
            count: item.totalCases || 0,
            symptoms: new Set(Array.isArray(item.symptoms) ? item.symptoms : [])
          };
        }
      });
      
      aggregatedData = Object.values(mergedData).map(item => ({
        district: item.district,
        count: item.count || item.totalCases || 0,
        totalCases: item.totalCases || item.count || 0,
        highSeverity: item.highSeverity || 0,
        mediumSeverity: item.mediumSeverity || 0,
        lowSeverity: item.lowSeverity || 0,
        coordinates: item.coordinates,
        severity: item.severity || 'low',
        riskLevel: item.severity || 'low',
        symptoms: item.symptoms instanceof Set ? Array.from(item.symptoms) : (Array.isArray(item.symptoms) ? item.symptoms : []),
        lastReport: item.lastReport || new Date().toISOString()
      }));
    } else {
      // Return mock data if database not available
      aggregatedData = getMockHeatmapData();
    }

    res.json({
      success: true,
      count: aggregatedData.length,
      data: aggregatedData,
      timestamp: new Date().toISOString(),
      realTime: true
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    
    // Return mock data on error
    res.json({
      success: true,
      message: 'Using mock data due to error',
      data: getMockHeatmapData(),
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/symptom-reports/statistics
 * @desc    Get statistics about symptom reports
 * @access  Public
 */
router.get('/statistics', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.json({
        success: true,
        message: 'Using mock statistics',
        data: getMockStatistics()
      });
    }

    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [
      totalReports,
      highSeverityCount,
      mediumSeverityCount,
      lowSeverityCount,
      urgentCount,
      categoryStats
    ] = await Promise.all([
      Model.countDocuments(query),
      Model.countDocuments({ ...query, overallSeverity: 'high' }),
      Model.countDocuments({ ...query, overallSeverity: 'medium' }),
      Model.countDocuments({ ...query, overallSeverity: 'low' }),
      Model.countDocuments({ ...query, status: 'urgent' }),
      Model.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total: totalReports,
        bySeverity: {
          high: highSeverityCount,
          medium: mediumSeverityCount,
          low: lowSeverityCount
        },
        urgent: urgentCount,
        byCategory: categoryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/symptom-reports/:id
 * @desc    Get a specific symptom report
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const report = await Model.findById(req.params.id)
      .select('-contactInfo -patientId'); // Exclude sensitive data

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Symptom report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching symptom report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching symptom report',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/symptom-reports
 * @desc    Create a new symptom report
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    // Validate required fields
    const { location, symptoms, category } = req.body;
    
    if (!location || !location.district || !location.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required'
      });
    }

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one symptom is required'
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Create new report
    const report = new Model(req.body);
    
    // Calculate severity
    report.calculateSeverity();
    
    // Save to database
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Symptom report created successfully',
      data: report
    });
  } catch (error) {
    console.error('Error creating symptom report:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating symptom report',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/symptom-reports/:id
 * @desc    Update a symptom report (for medical staff)
 * @access  Public (should be protected in production)
 */
router.put('/:id', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const report = await Model.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Symptom report not found'
      });
    }

    res.json({
      success: true,
      message: 'Symptom report updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error updating symptom report:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating symptom report',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/symptom-reports/:id
 * @desc    Delete a symptom report
 * @access  Public (should be protected in production)
 */
router.delete('/:id', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const report = await Model.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Symptom report not found'
      });
    }

    res.json({
      success: true,
      message: 'Symptom report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting symptom report:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting symptom report',
      error: error.message
    });
  }
});

// Mock data functions
function getMockHeatmapData() {
  return [
    {
      district: 'Centro de Tacna',
      totalCases: 45,
      highSeverity: 12,
      mediumSeverity: 20,
      lowSeverity: 13,
      coordinates: { latitude: -18.0056, longitude: -70.2444 },
      severity: 'high'
    },
    {
      district: 'Gregorio Albarracín',
      totalCases: 32,
      highSeverity: 8,
      mediumSeverity: 15,
      lowSeverity: 9,
      coordinates: { latitude: -18.0300, longitude: -70.2500 },
      severity: 'medium'
    },
    {
      district: 'Ciudad Nueva',
      totalCases: 28,
      highSeverity: 6,
      mediumSeverity: 14,
      lowSeverity: 8,
      coordinates: { latitude: -18.0120, longitude: -70.2300 },
      severity: 'medium'
    },
    {
      district: 'Pocollay',
      totalCases: 15,
      highSeverity: 2,
      mediumSeverity: 7,
      lowSeverity: 6,
      coordinates: { latitude: -17.9950, longitude: -70.2100 },
      severity: 'low'
    },
    {
      district: 'Alto de la Alianza',
      totalCases: 38,
      highSeverity: 10,
      mediumSeverity: 18,
      lowSeverity: 10,
      coordinates: { latitude: -17.9700, longitude: -70.2400 },
      severity: 'high'
    },
    {
      district: 'Calana',
      totalCases: 12,
      highSeverity: 1,
      mediumSeverity: 5,
      lowSeverity: 6,
      coordinates: { latitude: -17.9600, longitude: -70.1950 },
      severity: 'low'
    },
    {
      district: 'Pachia',
      totalCases: 8,
      highSeverity: 1,
      mediumSeverity: 3,
      lowSeverity: 4,
      coordinates: { latitude: -17.9200, longitude: -70.1850 },
      severity: 'low'
    },
    {
      district: 'Boca del Río',
      totalCases: 25,
      highSeverity: 5,
      mediumSeverity: 12,
      lowSeverity: 8,
      coordinates: { latitude: -18.0400, longitude: -70.2800 },
      severity: 'medium'
    }
  ];
}

function getMockStatistics() {
  return {
    total: 203,
    bySeverity: {
      high: 45,
      medium: 94,
      low: 64
    },
    urgent: 15,
    byCategory: {
      respiratory: 120,
      fever: 65,
      pain: 45,
      digestive: 12,
      fatigue: 35,
      neurological: 8
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = router;

