/**
 * Script para probar el endpoint de dashboard del paciente
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testDashboardPatient() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB\n');

    const UserModel = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const MedicalHistoryModel = mongoose.model('MedicalHistory', new mongoose.Schema({}, { strict: false }));
    const AppointmentModel = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
    const AlertModel = mongoose.model('Alert', new mongoose.Schema({}, { strict: false }));

    // Get patient
    const patient = await UserModel.findOne({ email: 'paciente@demo.com' }).lean();
    if (!patient) {
      console.log('❌ Patient not found');
      process.exit(1);
    }

    console.log('👤 Patient:', patient.name, `(${patient.email})`);
    console.log(`   ID: ${patient._id}\n`);

    // Create JWT token
    const token = jwt.sign(
      { userId: patient._id.toString(), email: patient.email, role: patient.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Count manually to verify
    const userIdObj = new mongoose.Types.ObjectId(patient._id);
    
    const totalHistories = await MedicalHistoryModel.countDocuments({
      $or: [
        { patientId: userIdObj },
        { patientId: patient._id.toString() }
      ]
    });
    
    const totalAppointments = await AppointmentModel.countDocuments({
      $or: [
        { patientId: userIdObj },
        { patientId: patient._id.toString() }
      ]
    });
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcomingAppointments = await AppointmentModel.countDocuments({
      $or: [
        { patientId: userIdObj },
        { patientId: patient._id.toString() }
      ],
      status: { $in: ['scheduled', 'rescheduled'] },
      $or: [
        { date: { $gte: now } },
        { scheduledAt: { $gte: now } }
      ]
    });
    
    const activeAlerts = await AlertModel.countDocuments({
      $or: [
        { userId: userIdObj },
        { userId: patient._id.toString() },
        { patientId: userIdObj },
        { patientId: patient._id.toString() }
      ],
      $or: [
        { acknowledged: false },
        { acknowledged: { $exists: false } },
        { status: { $ne: 'acknowledged' } }
      ]
    });

    console.log('📊 Manual counts:');
    console.log(`   Total Histories: ${totalHistories}`);
    console.log(`   Total Appointments: ${totalAppointments}`);
    console.log(`   Upcoming Appointments: ${upcomingAppointments}`);
    console.log(`   Active Alerts: ${activeAlerts}\n`);

    // Test API endpoint
    console.log('🌐 Testing API endpoint...');
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/dashboard/patient`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        console.log('✅ API Response:');
        console.log(JSON.stringify(response.data.data, null, 2));
      } else {
        console.log('❌ API returned error:', response.data);
      }
    } catch (error) {
      console.error('❌ API Error:', error.response?.data || error.message);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDashboardPatient();

