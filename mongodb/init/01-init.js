// RespiCare MongoDB Initialization Script
// This script runs when MongoDB container first starts

print('===========================================');
print('Initializing RespiCare Database');
print('===========================================');

// Switch to the respicare database
db = db.getSiblingDB('respicare');

// Create application user with read/write permissions
db.createUser({
  user: 'respicare_app',
  pwd: 'respicare_app_password_change_in_production',
  roles: [
    {
      role: 'readWrite',
      db: 'respicare'
    }
  ]
});

print('Created application user: respicare_app');

// Create collections
db.createCollection('users');
db.createCollection('patients');
db.createCollection('medicalHistories');
db.createCollection('aiAnalyses');
db.createCollection('appointments');
db.createCollection('notifications');
db.createCollection('auditLogs');
db.createCollection('sessions');

print('Created collections');

// Create indexes for users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ dni: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ isActive: 1 });

print('Created indexes for users');

// Create indexes for patients
db.patients.createIndex({ dni: 1 }, { unique: true });
db.patients.createIndex({ userId: 1 });
db.patients.createIndex({ createdAt: -1 });
db.patients.createIndex({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 });

print('Created indexes for patients');

// Create indexes for medical histories
db.medicalHistories.createIndex({ patientId: 1 });
db.medicalHistories.createIndex({ doctorId: 1 });
db.medicalHistories.createIndex({ date: -1 });
db.medicalHistories.createIndex({ diagnosis: 1 });
db.medicalHistories.createIndex({ createdAt: -1 });
db.medicalHistories.createIndex({ status: 1 });

print('Created indexes for medicalHistories');

// Create indexes for AI analyses
db.aiAnalyses.createIndex({ patientId: 1 });
db.aiAnalyses.createIndex({ medicalHistoryId: 1 });
db.aiAnalyses.createIndex({ status: 1 });
db.aiAnalyses.createIndex({ createdAt: -1 });
db.aiAnalyses.createIndex({ 'result.confidence': -1 });
db.aiAnalyses.createIndex({ 'result.disease': 1 });

print('Created indexes for aiAnalyses');

// Create indexes for appointments
db.appointments.createIndex({ patientId: 1 });
db.appointments.createIndex({ doctorId: 1 });
db.appointments.createIndex({ date: 1 });
db.appointments.createIndex({ status: 1 });
db.appointments.createIndex({ createdAt: -1 });

print('Created indexes for appointments');

// Create indexes for notifications
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ read: 1 });
db.notifications.createIndex({ createdAt: -1 });
db.notifications.createIndex({ type: 1 });

print('Created indexes for notifications');

// Create indexes for audit logs
db.auditLogs.createIndex({ userId: 1 });
db.auditLogs.createIndex({ action: 1 });
db.auditLogs.createIndex({ timestamp: -1 });
db.auditLogs.createIndex({ resource: 1 });
db.auditLogs.createIndex({ ipAddress: 1 });

print('Created indexes for auditLogs');

// Create indexes for sessions
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('Created indexes for sessions');

// Insert default admin user (only for development)
if (db.users.countDocuments() === 0) {
  print('Creating default admin user...');
  
  db.users.insertOne({
    email: 'admin@respicare.com',
    password: '$2a$10$YourHashedPasswordHere', // Change this!
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    dni: '00000000',
    phone: '+51 999999999',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  print('Default admin user created');
  print('Email: admin@respicare.com');
  print('Password: Please set this in production!');
}

print('===========================================');
print('Database initialization completed!');
print('===========================================');

