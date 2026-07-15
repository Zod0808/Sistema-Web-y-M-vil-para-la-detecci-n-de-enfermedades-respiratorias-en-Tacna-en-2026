/**
 * Symptom Reports Routes (TS)
 *
 * CRUD + aggregation endpoints for symptom reports. Public by design (the
 * demo/dev UI consumes without a token) — production should mount behind a
 * gateway if this is exposed publicly.
 *
 * Mounts (src/dev/index.ts): /api/symptom-reports (dev only)
 * Endpoints:
 *   GET    /            — list with filters (district, severity, date, status)
 *   GET    /heatmap     — merged aggregation from SymptomReport + MedicalHistory
 *   GET    /statistics  — counts by severity / category
 *   GET    /:id         — single report (sensitive fields excluded)
 *   POST   /            — create report (validates location, symptoms, category)
 *   PUT    /:id         — update report
 *   DELETE /:id         — delete report
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const SymptomReport = require('../models/SymptomReport');

const router = Router();

const DISTRICT_MAPPING: Record<string, { lat: number; lng: number }> = {
  'Centro de Tacna': { lat: -18.0066, lng: -70.2463 },
  'Alto de la Alianza': { lat: -18.0167, lng: -70.25 },
  'Gregorio Albarracín': { lat: -18.0, lng: -70.24 },
  'Ciudad Nueva': { lat: -18.01, lng: -70.23 },
  Pocollay: { lat: -18.02, lng: -70.26 },
  Calana: { lat: -17.95, lng: -70.2 },
  Pachia: { lat: -17.9, lng: -70.15 },
  'Boca del Río': { lat: -18.1, lng: -70.3 },
};

interface DistrictAggregate {
  district: string;
  totalCases: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  coordinates: { latitude: number; longitude: number };
  symptoms: Set<string>;
  lastReport: string | Date | null;
}

const MOCK_HEATMAP = [
  { district: 'Centro de Tacna', totalCases: 45, highSeverity: 12, mediumSeverity: 20, lowSeverity: 13, coordinates: { latitude: -18.0056, longitude: -70.2444 }, severity: 'high' },
  { district: 'Gregorio Albarracín', totalCases: 32, highSeverity: 8, mediumSeverity: 15, lowSeverity: 9, coordinates: { latitude: -18.0300, longitude: -70.2500 }, severity: 'medium' },
  { district: 'Ciudad Nueva', totalCases: 28, highSeverity: 6, mediumSeverity: 14, lowSeverity: 8, coordinates: { latitude: -18.0120, longitude: -70.2300 }, severity: 'medium' },
  { district: 'Pocollay', totalCases: 15, highSeverity: 2, mediumSeverity: 7, lowSeverity: 6, coordinates: { latitude: -17.9950, longitude: -70.2100 }, severity: 'low' },
  { district: 'Alto de la Alianza', totalCases: 38, highSeverity: 10, mediumSeverity: 18, lowSeverity: 10, coordinates: { latitude: -17.9700, longitude: -70.2400 }, severity: 'high' },
  { district: 'Calana', totalCases: 12, highSeverity: 1, mediumSeverity: 5, lowSeverity: 6, coordinates: { latitude: -17.9600, longitude: -70.1950 }, severity: 'low' },
  { district: 'Pachia', totalCases: 8, highSeverity: 1, mediumSeverity: 3, lowSeverity: 4, coordinates: { latitude: -17.9200, longitude: -70.1850 }, severity: 'low' },
  { district: 'Boca del Río', totalCases: 25, highSeverity: 5, mediumSeverity: 12, lowSeverity: 8, coordinates: { latitude: -18.0400, longitude: -70.2800 }, severity: 'medium' },
];

const MOCK_STATISTICS = {
  total: 203,
  bySeverity: { high: 45, medium: 94, low: 64 },
  urgent: 15,
  byCategory: { respiratory: 120, fever: 65, pain: 45, digestive: 12, fatigue: 35, neurological: 8 },
};

const isDbAvailable = (): boolean => mongoose.connection.readyState === 1;

// ---------------------------------------------------------------------------
// GET / — list reports with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.status(503).json({ success: false, message: 'Database not available', data: [] });
    }
    const { district, severity, startDate, endDate, limit = '100', status } = req.query as Record<string, string>;
    const query: Record<string, any> = {};
    if (district) query['location.district'] = district;
    if (severity) query.overallSeverity = severity;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const reports = await SymptomReport.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .select('-contactInfo -patientId');

    res.json({ success: true, count: reports.length, data: reports });
  } catch (err: any) {
    logger.error('list symptom reports failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error fetching symptom reports', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /heatmap — aggregation across SymptomReport + MedicalHistory
// ---------------------------------------------------------------------------
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.json({ success: true, count: MOCK_HEATMAP.length, data: MOCK_HEATMAP, timestamp: new Date().toISOString(), realTime: false });
    }

    const { startDate, endDate } = req.query as Record<string, string>;
    const symptomReportData: any[] = await SymptomReport.getAggregatedByDistrict({ startDate, endDate });

    // Merge with MedicalHistory (coordinate → district mapping)
    let medicalHistoryData: any[] = [];
    try {
      const MedicalHistory =
        mongoose.models['MedicalHistory'] ??
        mongoose.model('MedicalHistory', new mongoose.Schema({}, { strict: false }));

      const matchStage: Record<string, any> = {
        'location.latitude': { $exists: true, $ne: null },
        'location.longitude': { $exists: true, $ne: null },
      };
      if (startDate) matchStage.date = { $gte: new Date(startDate) };
      if (endDate) matchStage.date = { ...matchStage.date, $lte: new Date(endDate) };

      const medicalHistories: any[] = await (MedicalHistory as any).find(matchStage)
        .select('location symptoms date diagnosis')
        .lean();

      const districtCounts: Record<string, DistrictAggregate> = {};
      for (const history of medicalHistories) {
        if (!history.location?.latitude || !history.location?.longitude) continue;

        let closestDistrict: string | null = null;
        let minDistance = Infinity;
        for (const [d, coords] of Object.entries(DISTRICT_MAPPING)) {
          const distance = Math.sqrt(
            Math.pow(history.location.latitude - coords.lat, 2) +
              Math.pow(history.location.longitude - coords.lng, 2),
          );
          if (distance < minDistance && distance < 0.05) {
            minDistance = distance;
            closestDistrict = d;
          }
        }
        if (!closestDistrict) continue;

        if (!districtCounts[closestDistrict]) {
          districtCounts[closestDistrict] = {
            district: closestDistrict,
            totalCases: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            lowSeverity: 0,
            coordinates: {
              latitude: DISTRICT_MAPPING[closestDistrict]!.lat,
              longitude: DISTRICT_MAPPING[closestDistrict]!.lng,
            },
            symptoms: new Set(),
            lastReport: null,
          };
        }

        const entry = districtCounts[closestDistrict]!;
        entry.totalCases++;
        if (history.symptoms) {
          for (const s of history.symptoms) {
            if (s.name) entry.symptoms.add(s.name);
            if (s.severity === 'severe') entry.highSeverity++;
            else if (s.severity === 'moderate') entry.mediumSeverity++;
            else entry.lowSeverity++;
          }
        }
        if (!entry.lastReport || new Date(history.date) > new Date(entry.lastReport as any)) {
          entry.lastReport = history.date;
        }
      }

      medicalHistoryData = Object.values(districtCounts).map((d) => ({
        district: d.district,
        totalCases: d.totalCases,
        highSeverity: d.highSeverity,
        mediumSeverity: d.mediumSeverity,
        lowSeverity: d.lowSeverity,
        coordinates: d.coordinates,
        severity: d.highSeverity >= 10 ? 'high' : d.totalCases >= 20 ? 'medium' : 'low',
        symptoms: Array.from(d.symptoms),
        lastReport: d.lastReport,
      }));
    } catch (mhErr: any) {
      logger.warn('MedicalHistory fetch failed', { error: mhErr.message });
    }

    // Merge both sources
    const merged: Record<string, any> = {};
    for (const item of symptomReportData) {
      merged[item.district] = {
        ...item,
        count: item.totalCases ?? 0,
        symptoms: new Set(Array.isArray(item.symptoms) ? item.symptoms : []),
      };
    }
    for (const item of medicalHistoryData) {
      if (merged[item.district]) {
        merged[item.district].totalCases += item.totalCases;
        merged[item.district].count += item.totalCases;
        merged[item.district].highSeverity += item.highSeverity;
        merged[item.district].mediumSeverity += item.mediumSeverity;
        merged[item.district].lowSeverity += item.lowSeverity;
        if (Array.isArray(item.symptoms)) {
          for (const s of item.symptoms) merged[item.district].symptoms.add(s);
        }
        if (
          item.lastReport &&
          (!merged[item.district].lastReport ||
            new Date(item.lastReport) > new Date(merged[item.district].lastReport))
        ) {
          merged[item.district].lastReport = item.lastReport;
        }
      } else {
        merged[item.district] = {
          ...item,
          count: item.totalCases ?? 0,
          symptoms: new Set(Array.isArray(item.symptoms) ? item.symptoms : []),
        };
      }
    }

    const aggregatedData = Object.values(merged).map((item: any) => ({
      district: item.district,
      count: item.count ?? item.totalCases ?? 0,
      totalCases: item.totalCases ?? item.count ?? 0,
      highSeverity: item.highSeverity ?? 0,
      mediumSeverity: item.mediumSeverity ?? 0,
      lowSeverity: item.lowSeverity ?? 0,
      coordinates: item.coordinates,
      severity: item.severity ?? 'low',
      riskLevel: item.severity ?? 'low',
      symptoms: item.symptoms instanceof Set ? Array.from(item.symptoms) : Array.isArray(item.symptoms) ? item.symptoms : [],
      lastReport: item.lastReport ?? new Date().toISOString(),
    }));

    res.json({ success: true, count: aggregatedData.length, data: aggregatedData, timestamp: new Date().toISOString(), realTime: true });
  } catch (err: any) {
    logger.error('heatmap failed, returning mock', { error: err.message });
    res.json({
      success: true,
      message: 'Using mock data due to error',
      data: MOCK_HEATMAP,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ---------------------------------------------------------------------------
// GET /statistics
// ---------------------------------------------------------------------------
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.json({ success: true, message: 'Using mock statistics', data: { ...MOCK_STATISTICS, timestamp: new Date().toISOString() } });
    }
    const { startDate, endDate } = req.query as Record<string, string>;
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query: Record<string, any> = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [totalReports, high, medium, low, urgent, categoryStats] = await Promise.all([
      SymptomReport.countDocuments(query),
      SymptomReport.countDocuments({ ...query, overallSeverity: 'high' }),
      SymptomReport.countDocuments({ ...query, overallSeverity: 'medium' }),
      SymptomReport.countDocuments({ ...query, overallSeverity: 'low' }),
      SymptomReport.countDocuments({ ...query, status: 'urgent' }),
      SymptomReport.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total: totalReports,
        bySeverity: { high, medium, low },
        urgent,
        byCategory: categoryStats.reduce((acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error('statistics failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error fetching statistics', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.status(503).json({ success: false, message: 'Database not available' });
    }
    const report = await SymptomReport.findById(req.params.id).select('-contactInfo -patientId');
    if (!report) return res.status(404).json({ success: false, message: 'Symptom report not found' });
    res.json({ success: true, data: report });
  } catch (err: any) {
    logger.error('get symptom report failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error fetching symptom report', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.status(503).json({ success: false, message: 'Database not available' });
    }
    const { location, symptoms, category } = req.body;
    if (!location || !location.district || !location.coordinates) {
      return res.status(400).json({ success: false, message: 'Location data is required' });
    }
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one symptom is required' });
    }
    if (!category) return res.status(400).json({ success: false, message: 'Category is required' });

    const report = new SymptomReport(req.body);
    report.calculateSeverity();
    await report.save();

    res.status(201).json({ success: true, message: 'Symptom report created successfully', data: report });
  } catch (err: any) {
    logger.error('create symptom report failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error creating symptom report', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id
// ---------------------------------------------------------------------------
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.status(503).json({ success: false, message: 'Database not available' });
    }
    const report = await SymptomReport.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!report) return res.status(404).json({ success: false, message: 'Symptom report not found' });
    res.json({ success: true, message: 'Symptom report updated successfully', data: report });
  } catch (err: any) {
    logger.error('update symptom report failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error updating symptom report', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.status(503).json({ success: false, message: 'Database not available' });
    }
    const report = await SymptomReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Symptom report not found' });
    res.json({ success: true, message: 'Symptom report deleted successfully' });
  } catch (err: any) {
    logger.error('delete symptom report failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error deleting symptom report', error: err.message });
  }
});

export default router;
