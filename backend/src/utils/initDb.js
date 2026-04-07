const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function initDb() {
    const db = await open({
        filename: path.join(__dirname, '../../database.db'),
        driver: sqlite3.Database
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      name TEXT,
      role TEXT DEFAULT 'PATIENT', -- PATIENT, DOCTOR, ADMIN
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patient_profiles (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE,
      age INTEGER,
      gender TEXT,
      medicalHistory TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS doctor_profiles (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE,
      specialization TEXT,
      isAvailable BOOLEAN DEFAULT 1,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS queue (
      id TEXT PRIMARY KEY,
      patientId TEXT UNIQUE,
      severity TEXT, -- EMERGENCY, MODERATE, ROUTINE
      riskScore INTEGER DEFAULT 0,
      status TEXT DEFAULT 'WAITING', -- WAITING, CONSULTING, COMPLETED
      symptoms TEXT, -- JSON
      reasoning TEXT,
      priority REAL DEFAULT 0,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patient_profiles(id)
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      doctorId TEXT,
      status TEXT DEFAULT 'COMPLETED',
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patient_profiles(id),
      FOREIGN KEY (doctorId) REFERENCES doctor_profiles(id)
    );
  `);

    console.log("Database tables initialized.");
    return db;
}

if (require.main === module) {
    initDb();
}

module.exports = initDb;
