/**
 * Seed Users Script - JavaScript version
 * Creates demo users for mobile app testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';

// User Schema (simple version for seeding)
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    default: 'patient'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get or create model
let UserModel;
try {
  UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
} catch (error) {
  UserModel = mongoose.model('User', UserSchema);
}

const demoUsers = [
  {
    name: 'Paciente Demo',
    email: 'paciente@demo.com',
    password: 'demo1234',
    role: 'patient',
    isActive: true
  },
  {
    name: 'Juan Pérez',
    email: 'juan.perez@demo.com',
    password: 'demo1234',
    role: 'patient',
    isActive: true
  },
  {
    name: 'María García',
    email: 'maria.garcia@demo.com',
    password: 'demo1234',
    role: 'patient',
    isActive: true
  },
  {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@demo.com',
    password: 'demo1234',
    role: 'patient',
    isActive: true
  },
  {
    name: 'Ana López',
    email: 'ana.lopez@demo.com',
    password: 'demo1234',
    role: 'patient',
    isActive: true
  },
  {
    name: 'Dr. Roberto Silva',
    email: 'doctor@demo.com',
    password: 'demo1234',
    role: 'doctor',
    isActive: true
  },
  {
    name: 'Admin RespiCare',
    email: 'admin@demo.com',
    password: 'admin1234',
    role: 'admin',
    isActive: true
  }
];

async function seedUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB');

    console.log('👤 Creating demo users...');
    
    const createdUsers = [];
    
    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const existingUser = await UserModel.findOne({ email: userData.email.toLowerCase() });
        
        if (existingUser) {
          console.log(`   User ${userData.email} already exists, updating...`);
          // Update password in case it changed
          existingUser.password = userData.password;
          existingUser.isActive = userData.isActive;
          await existingUser.save();
          createdUsers.push(existingUser);
        } else {
          // Create new user
          const user = new UserModel(userData);
          await user.save();
          console.log(`   ✅ Created user: ${userData.email} (${userData.role})`);
          createdUsers.push(user);
        }
      } catch (error) {
        console.warn(`   ⚠️  Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log(`\n✅ Created/updated ${createdUsers.length} users`);
    
    console.log('\n🔑 Demo User Credentials:');
    console.log('   Patient: paciente@demo.com / demo1234');
    console.log('   Patient: juan.perez@demo.com / demo1234');
    console.log('   Patient: maria.garcia@demo.com / demo1234');
    console.log('   Patient: carlos.mendoza@demo.com / demo1234');
    console.log('   Patient: ana.lopez@demo.com / demo1234');
    console.log('   Doctor: doctor@demo.com / demo1234');
    console.log('   Admin: admin@demo.com / admin1234');
    
    const totalUsers = await UserModel.countDocuments();
    console.log(`\n✅ Total users in database: ${totalUsers}`);
    console.log('✅ User seeding completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  seedUsers();
}

module.exports = { seedUsers };

