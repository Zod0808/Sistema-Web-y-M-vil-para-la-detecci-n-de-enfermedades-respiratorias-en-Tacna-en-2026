/**
 * Chat Conversation Model
 * Model for storing chatbot conversations
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    urgencyLevel: String,
    confidence: Number,
    detectedDiseases: [String],
    detectedSymptoms: [String],
    questionType: String
  }
}, { _id: false });

const chatConversationSchema = new mongoose.Schema({
  // Session information
  sessionId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  
  userId: {
    type: String,
    index: true,
    required: false // Anonymous users don't have userId
  },
  
  // Conversation data
  messages: [messageSchema],
  
  // User information (optional)
  userInfo: {
    name: String,
    email: String,
    phone: String,
    age: Number,
    gender: String
  },
  
  // Location (optional)
  location: {
    district: String,
    city: {
      type: String,
      default: 'Tacna'
    },
    country: {
      type: String,
      default: 'Perú'
    }
  },
  
  // Session metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    language: {
      type: String,
      default: 'es'
    },
    source: {
      type: String,
      enum: ['web', 'mobile'],
      default: 'web'
    }
  },
  
  // Analysis summary
  summary: {
    totalMessages: {
      type: Number,
      default: 0
    },
    userMessages: {
      type: Number,
      default: 0
    },
    botMessages: {
      type: Number,
      default: 0
    },
    detectedDiseases: [String],
    detectedSymptoms: [String],
    highestUrgency: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    averageConfidence: Number
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  
  // Follow-up
  requiresFollowUp: {
    type: Boolean,
    default: false
  },
  
  followUpNotes: String,
  
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
chatConversationSchema.index({ sessionId: 1, createdAt: -1 });
chatConversationSchema.index({ userId: 1, createdAt: -1 });
chatConversationSchema.index({ status: 1 });
chatConversationSchema.index({ 'summary.highestUrgency': 1 });

// Virtual for conversation duration
chatConversationSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return Date.now() - this.startedAt;
});

// Virtual for message count
chatConversationSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Method to add a message
chatConversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  
  // Update summary
  this.summary.totalMessages = this.messages.length;
  this.summary.userMessages = this.messages.filter(m => m.role === 'user').length;
  this.summary.botMessages = this.messages.filter(m => m.role === 'bot').length;
  
  // Update detected diseases and symptoms
  if (metadata.detectedDiseases) {
    this.summary.detectedDiseases = [...new Set([
      ...this.summary.detectedDiseases,
      ...metadata.detectedDiseases
    ])];
  }
  
  if (metadata.detectedSymptoms) {
    this.summary.detectedSymptoms = [...new Set([
      ...this.summary.detectedSymptoms,
      ...metadata.detectedSymptoms
    ])];
  }
  
  // Update highest urgency
  if (metadata.urgencyLevel) {
    const urgencyLevels = ['very_low', 'low', 'medium', 'high', 'critical'];
    
    // Normalize urgency level to ensure it's valid
    const normalizeUrgency = (urgency) => {
      if (!urgency) return 'low';
      const urgencyStr = String(urgency).toLowerCase();
      const urgencyMap = {
        'critica': 'critical',
        'critical': 'critical',
        'alta': 'high',
        'high': 'high',
        'media': 'medium',
        'medium': 'medium',
        'baja': 'low',
        'low': 'low',
        'muy_baja': 'very_low',
        'very_low': 'very_low'
      };
      return urgencyMap[urgencyStr] || 'low';
    };
    
    const normalizedUrgency = normalizeUrgency(metadata.urgencyLevel);
    const currentUrgency = normalizeUrgency(this.summary.highestUrgency || 'low');
    
    const currentLevel = urgencyLevels.indexOf(currentUrgency);
    const newLevel = urgencyLevels.indexOf(normalizedUrgency);
    
    // Ensure both levels are valid (>= 0)
    if (currentLevel >= 0 && newLevel >= 0 && newLevel > currentLevel) {
      this.summary.highestUrgency = normalizedUrgency;
      
      // Mark for follow-up if high or critical
      if (newLevel >= 3) { // high or critical
        this.requiresFollowUp = true;
      }
    } else if (newLevel >= 0 && currentLevel < 0) {
      // If current is invalid but new is valid, use new
      this.summary.highestUrgency = normalizedUrgency;
      if (newLevel >= 3) {
        this.requiresFollowUp = true;
      }
    }
  }
  
  // Update average confidence
  const confidences = this.messages
    .filter(m => m.metadata && m.metadata.confidence)
    .map(m => m.metadata.confidence);
  
  if (confidences.length > 0) {
    this.summary.averageConfidence = 
      confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }
  
  // Update last activity
  this.lastActivityAt = new Date();
  
  return this;
};

// Method to complete conversation
chatConversationSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this;
};

// Static method to get recent conversations
chatConversationSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ lastActivityAt: -1 })
    .limit(limit)
    .select('-messages'); // Exclude messages for performance
};

// Static method to get conversations by user
chatConversationSchema.statics.getByUser = function(userId) {
  return this.find({ userId })
    .sort({ startedAt: -1 });
};

// Static method to get urgent conversations
chatConversationSchema.statics.getUrgent = function() {
  return this.find({
    'summary.highestUrgency': { $in: ['high', 'critical'] },
    status: { $ne: 'completed' }
  }).sort({ lastActivityAt: -1 });
};

// Static method to get statistics
chatConversationSchema.statics.getStatistics = async function(options = {}) {
  const matchStage = {};
  
  if (options.startDate) {
    matchStage.createdAt = { $gte: new Date(options.startDate) };
  }
  if (options.endDate) {
    matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(options.endDate) };
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        activeConversations: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedConversations: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        urgentConversations: {
          $sum: { 
            $cond: [
              { $in: ['$summary.highestUrgency', ['high', 'critical']] },
              1,
              0
            ]
          }
        },
        totalMessages: { $sum: '$summary.totalMessages' },
        avgMessagesPerConversation: { $avg: '$summary.totalMessages' },
        avgConfidence: { $avg: '$summary.averageConfidence' }
      }
    }
  ]);
  
  return stats[0] || {
    totalConversations: 0,
    activeConversations: 0,
    completedConversations: 0,
    urgentConversations: 0,
    totalMessages: 0,
    avgMessagesPerConversation: 0,
    avgConfidence: 0
  };
};

const ChatConversation = mongoose.model('ChatConversation', chatConversationSchema);

module.exports = ChatConversation;

