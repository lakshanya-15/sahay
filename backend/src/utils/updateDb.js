const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function updateDb() {
    const db = await open({
        filename: path.join(__dirname, '../../database.db'),
        driver: sqlite3.Database
    });

    console.log("Updating database schema for SAHAY Advanced features...");

    // Update Users (adding coordinates if needed, but profiles are better)
    // Update Patient Profiles
    try { await db.exec('ALTER TABLE patient_profiles ADD COLUMN height REAL'); } catch (e) { }
    try { await db.exec('ALTER TABLE patient_profiles ADD COLUMN weight REAL'); } catch (e) { }
    try { await db.exec('ALTER TABLE patient_profiles ADD COLUMN bloodGroup TEXT'); } catch (e) { }
    try { await db.exec('ALTER TABLE patient_profiles ADD COLUMN chronicConditions TEXT'); } catch (e) { }

    // Update Doctor Profiles
    try { await db.exec('ALTER TABLE doctor_profiles ADD COLUMN latitude REAL'); } catch (e) { }
    try { await db.exec('ALTER TABLE doctor_profiles ADD COLUMN longitude REAL'); } catch (e) { }
    try { await db.exec('ALTER TABLE doctor_profiles ADD COLUMN specialty TEXT'); } catch (e) { }
    try { await db.exec('ALTER TABLE doctor_profiles ADD COLUMN status TEXT DEFAULT "ONLINE"'); } catch (e) { }
    try { await db.exec('ALTER TABLE doctor_profiles ADD COLUMN hospitalName TEXT'); } catch (e) { }
    try { await db.exec('ALTER TABLE doctor_profiles ADD COLUMN rating REAL DEFAULT 4.5'); } catch (e) { }

    // Emergency SOS Table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT DEFAULT 'PENDING',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patient_profiles(id)
    );
  `);

    console.log("Database schema updated successfully.");
    return db;
}

if (require.main === module) {
    updateDb();
}

module.exports = updateDb;
