/**
 * Symptom Report Model
 * Model for storing symptom reports with location data
 */

const mongoose = require('mongoose');

const symptomReportSchema = new mongoose.Schema({
  // Patient information
  patientId: {
    type: String,
    required: false, // Optional for anonymous reports
    index: true
  },
  
  // Location data
  location: {
    district: {
      type: String,
      required: true,
      enum: [
        'Centro de Tacna',
        'Gregorio Albarracín',
        'Ciudad Nueva',
        'Pocollay',
        'Alto de la Alianza',
        'Calana',
        'Pachia',
        'Boca del Río'
      ]
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -18.1,
        max: -17.8
      },
      longitude: {
        type: Number,
        required: true,
        min: -70.3,
        max: -70.1
      }
    },
    address: {
      type: String,
      required: false
    }
  },
  
  // Symptoms
  symptoms: [{
    name: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      required: true
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks']
      }
    }
  }],
  
  // Primary symptom category
  category: {
    type: String,
    enum: ['respiratory', 'fever', 'pain', 'digestive', 'fatigue', 'neurological'],
    required: true
  },
  
  // Severity assessment
  overallSeverity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
    default: 'low'
  },
  
  // Disease suspicion
  suspectedDisease: {
    type: String,
    enum: ['asma', 'neumonia', 'bronquitis', 'covid19', 'gripe', 'epoc', 'resfriado', 'unknown'],
    default: 'unknown'
  },
  
  // Additional data
  temperature: {
    type: Number,
    min: 35,
    max: 42
  },
  
  oxygenSaturation: {
    type: Number,
    min: 0,
    max: 100
  },
  
  hasPreexistingConditions: {
    type: Boolean,
    default: false
  },
  
  preexistingConditions: [{
    type: String
  }],
  
  // Contact information (for follow-up)
  contactInfo: {
    phone: String,
    email: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'urgent', 'resolved'],
    default: 'pending'
  },
  
  // Medical attention
  medicalAttentionRequired: {
    type: Boolean,
    default: false
  },
  
  medicalAttentionReceived: {
    type: Boolean,
    default: false
  },
  
  // Notes
  notes: {
    type: String
  },
  
  // Metadata
  reportedBy: {
    type: String,
    enum: ['patient', 'family', 'healthcare_worker', 'anonymous'],
    default: 'anonymous'
  },
  
  source: {
    type: String,
    enum: ['web', 'mobile', 'phone', 'hospital'],
    default: 'web'
  },
  
  isAnonymous: {
    type: Boolean,
    default: true
  },
  
  // Date when the symptom was actually reported (can be different from createdAt)
  reportedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for queries
symptomReportSchema.index({ 'location.district': 1, createdAt: -1 });
symptomReportSchema.index({ overallSeverity: 1, createdAt: -1 });
symptomReportSchema.index({ category: 1 });
symptomReportSchema.index({ status: 1 });
symptomReportSchema.index({ createdAt: -1 });

// Virtual for calculating days since report
symptomReportSchema.virtual('daysSinceReport').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for risk level
symptomReportSchema.virtual('riskLevel').get(function() {
  if (this.overallSeverity === 'high' || this.medicalAttentionRequired) {
    return 'high';
  } else if (this.overallSeverity === 'medium') {
    return 'medium';
  }
  return 'low';
});

// Method to calculate severity based on symptoms
symptomReportSchema.methods.calculateSeverity = function() {
  const severeCounts = this.symptoms.filter(s => s.severity === 'severe').length;
  const moderateCounts = this.symptoms.filter(s => s.severity === 'moderate').length;
  
  if (severeCounts >= 2 || (severeCounts === 1 && moderateCounts >= 2)) {
    this.overallSeverity = 'high';
    this.medicalAttentionRequired = true;
  } else if (severeCounts === 1 || moderateCounts >= 2) {
    this.overallSeverity = 'medium';
  } else {
    this.overallSeverity = 'low';
  }
  
  return this.overallSeverity;
};

// Static method to get reports by district
symptomReportSchema.statics.getByDistrict = function(district, options = {}) {
  const query = { 'location.district': district };
  
  if (options.startDate) {
    query.createdAt = { $gte: new Date(options.startDate) };
  }
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: new Date(options.endDate) };
  }
  if (options.severity) {
    query.overallSeverity = options.severity;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get aggregated data by district
symptomReportSchema.statics.getAggregatedByDistrict = async function(options = {}) {
  const matchStage = {};
  
  // Build date filter - use createdAt (primary field) or reportedAt if it exists
  if (options.startDate || options.endDate) {
    const dateConditions = {};
    if (options.startDate) {
      dateConditions.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      dateConditions.$lte = new Date(options.endDate);
    }
    
    // Use $or to match either reportedAt or createdAt within the date range
    // This handles documents that might have either field
    matchStage.$or = [
      { reportedAt: dateConditions },
      { 
        $and: [
          { $or: [{ reportedAt: { $exists: false } }, { reportedAt: null }] },
          { createdAt: dateConditions }
        ]
      }
    ];
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$location.district',
        totalCases: { $sum: 1 },
        highSeverity: {
          $sum: { $cond: [{ $eq: ['$overallSeverity', 'high'] }, 1, 0] }
        },
        mediumSeverity: {
          $sum: { $cond: [{ $eq: ['$overallSeverity', 'medium'] }, 1, 0] }
        },
        lowSeverity: {
          $sum: { $cond: [{ $eq: ['$overallSeverity', 'low'] }, 1, 0] }
        },
        avgLatitude: { $avg: '$location.coordinates.latitude' },
        avgLongitude: { $avg: '$location.coordinates.longitude' },
        diseases: { $push: '$suspectedDisease' }
      }
    },
    {
      $project: {
        _id: 0,
        district: '$_id',
        totalCases: 1,
        highSeverity: 1,
        mediumSeverity: 1,
        lowSeverity: 1,
        coordinates: {
          latitude: '$avgLatitude',
          longitude: '$avgLongitude'
        },
        severity: {
          $cond: [
            { $gte: ['$highSeverity', 10] }, 'high',
            { $cond: [
              { $gte: ['$totalCases', 20] }, 'medium',
              'low'
            ]}
          ]
        }
      }
    },
    { $sort: { totalCases: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

const SymptomReport = mongoose.model('SymptomReport', symptomReportSchema);

module.exports = SymptomReport;

