/**
 * ML Analytics Routes (JavaScript version)
 * Endpoints for ML monitoring, features, and fairness metrics
 * 
 * Routes:
 * - /api/analytics/ml/monitoring
 * - /api/analytics/ml/features
 * - /api/analytics/ml/fairness
 * - /api/v1/analytics/ml/monitoring
 * - /api/v1/analytics/ml/features
 * - /api/v1/analytics/ml/fairness
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Get AI Service URL from environment
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-services:8000';

/**
 * @route   GET /api/analytics/ml/monitoring
 * @route   GET /api/v1/analytics/ml/monitoring
 * @desc    Get ML monitoring metrics
 * @access  Public
 * @query   days (optional)
 */
router.get('/ml/monitoring', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days, 10) : undefined;
    const params = days ? { days } : {};

    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/ml/monitoring/metrics`, {
      params,
      timeout: 10000
    });

    // AI service returns {success: true, data: {...}}, forward as is
    if (response.data && response.data.success) {
      return res.json({
        success: true,
        data: response.data.data || response.data
      });
    }

    // Fallback: return response as is
    res.json({
      success: true,
      data: response.data || {}
    });
  } catch (error) {
    console.error('Error fetching ML monitoring metrics:', error.message);
    
    // Return mock data if AI service is unavailable
    res.json({
      success: true,
      data: {
        total_predictions: 0,
        average_confidence: 0.85,
        distributions: {
          diseases: {},
          urgency_levels: {}
        },
        quality_metrics: {
          avg_confidence: 0.85,
          high_confidence_rate: 0.75,
          low_confidence_rate: 0.05
        },
        performance_metrics: {
          avg_response_time_ms: 150,
          p95_response_time_ms: 250
        },
        error_rate: 0.02,
        timestamp: new Date().toISOString()
      },
      message: 'Using mock data (AI service unavailable)',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/ml/features
 * @desc    Get ML feature influence metrics
 * @access  Public
 * @query   top (optional) - number of top features to return
 */
router.get('/ml/features', async (req, res) => {
  try {
    const top = req.query.top ? parseInt(req.query.top, 10) : undefined;
    const params = top ? { top_n: top } : {};

    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/ml/features/influence`, {
      params,
      timeout: 10000
    });

    // AI service returns {success: true, data: {...}}, forward as is
    if (response.data && response.data.success) {
      return res.json({
        success: true,
        data: response.data.data || response.data
      });
    }

    // Fallback: return response as is
    res.json({
      success: true,
      data: response.data || []
    });
  } catch (error) {
    console.error('Error fetching ML feature influence:', error.message);
    
    // Return mock data if AI service is unavailable
    res.json({
      success: true,
      data: [
        { feature: 'tos', importance: 0.45, shap_abs: 0.45 },
        { feature: 'dificultad_respiratoria', importance: 0.32, shap_abs: 0.32 },
        { feature: 'sibilancias', importance: 0.28, shap_abs: 0.28 },
        { feature: 'fiebre', importance: 0.25, shap_abs: 0.25 },
        { feature: 'dolor_pecho', importance: 0.20, shap_abs: 0.20 },
        { feature: 'fatiga', importance: 0.18, shap_abs: 0.18 }
      ],
      message: 'Using mock data (AI service unavailable)',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/ml/fairness
 * @desc    Get ML fairness metrics
 * @access  Public
 * @query   groupField (optional) - field to group by (default: gender)
 * @query   highConfidenceThreshold (optional) - threshold for high confidence
 */
router.get('/ml/fairness', async (req, res) => {
  try {
    const groupField = req.query.groupField || 'gender';
    const highConfidenceThreshold = req.query.highConfidenceThreshold 
      ? parseFloat(req.query.highConfidenceThreshold) 
      : undefined;

    const params = {
      group_field: groupField
    };
    if (highConfidenceThreshold !== undefined) {
      params.high_confidence_threshold = highConfidenceThreshold;
    }

    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/ml/monitoring/fairness`, {
      params,
      timeout: 10000
    });

    // AI service returns {success: true, data: {...}}, forward as is
    if (response.data && response.data.success) {
      return res.json({
        success: true,
        data: response.data.data || response.data
      });
    }

    // Fallback: return response as is
    res.json({
      success: true,
      data: response.data || {}
    });
  } catch (error) {
    console.error('Error fetching ML fairness metrics:', error.message);
    
    // Return mock data if AI service is unavailable
    res.json({
      success: true,
      data: {
        group_field: req.query.groupField || 'gender',
        groups: {
          'M': { count: 450, avg_confidence: 0.87, high_confidence_rate: 0.80 },
          'F': { count: 380, avg_confidence: 0.85, high_confidence_rate: 0.78 },
          'Other': { count: 30, avg_confidence: 0.83, high_confidence_rate: 0.75 }
        },
        fairness_score: 0.92,
        timestamp: new Date().toISOString()
      },
      message: 'Using mock data (AI service unavailable)',
      error: error.message
    });
  }
});

module.exports = router;

