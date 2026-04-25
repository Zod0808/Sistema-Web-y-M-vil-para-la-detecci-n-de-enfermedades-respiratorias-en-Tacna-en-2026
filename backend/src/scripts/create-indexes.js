require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare';

const createIndexes = async () => {
  console.log('🔌 Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Create indexes for SymptomReport collection
    console.log('📊 Creating indexes for SymptomReport collection...');
    
    // Index for reportedAt field (for temporal queries)
    await db.collection('symptomreports').createIndex({ reportedAt: 1 });
    console.log('✅ Created index on reportedAt');
    
    // Index for location.district field (for district queries)
    await db.collection('symptomreports').createIndex({ 'location.district': 1 });
    console.log('✅ Created index on location.district');
    
    // Index for category field (for category queries)
    await db.collection('symptomreports').createIndex({ category: 1 });
    console.log('✅ Created index on category');
    
    // Index for severityLevel field (for severity queries)
    await db.collection('symptomreports').createIndex({ severityLevel: 1 });
    console.log('✅ Created index on severityLevel');
    
    // Compound index for common query patterns
    await db.collection('symptomreports').createIndex({ 
      'location.district': 1, 
      reportedAt: 1 
    });
    console.log('✅ Created compound index on district + reportedAt');
    
    await db.collection('symptomreports').createIndex({ 
      category: 1, 
      reportedAt: 1 
    });
    console.log('✅ Created compound index on category + reportedAt');

    // Create indexes for ChatConversation collection
    console.log('💬 Creating indexes for ChatConversation collection...');
    
    // Index for sessionId field
    await db.collection('chatconversations').createIndex({ sessionId: 1 });
    console.log('✅ Created index on sessionId');
    
    // Index for startTime field
    await db.collection('chatconversations').createIndex({ startTime: 1 });
    console.log('✅ Created index on startTime');
    
    // Index for status field
    await db.collection('chatconversations').createIndex({ status: 1 });
    console.log('✅ Created index on status');

    console.log('\n🎉 All indexes created successfully!');
    
    // Show index information
    console.log('\n📋 Index Information:');
    const symptomIndexes = await db.collection('symptomreports').indexes();
    console.log('SymptomReport indexes:', symptomIndexes.length);
    
    const chatIndexes = await db.collection('chatconversations').indexes();
    console.log('ChatConversation indexes:', chatIndexes.length);

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createIndexes();
