const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function seedDoctors() {
    const db = await open({
        filename: path.join(__dirname, '../../database.db'),
        driver: sqlite3.Database
    });

    const doctors = [
        { name: "Dr. Ananya Sharma", phone: "1112223330", specialty: "General Physician", hospital: "Central Clinic", lat: 28.6139, lon: 77.2090, status: "ONLINE" },
        { name: "Dr. Vikram Sethi", phone: "1112223331", specialty: "Cardiologist", hospital: "Heart Care Inst.", lat: 28.6100, lon: 77.2150, status: "BUSY" },
        { name: "Dr. Deepa Malhotra", phone: "1112223332", specialty: "Pediatrician", hospital: "Kids Care", lat: 28.6200, lon: 77.1950, status: "ONLINE" },
        { name: "Dr. Sameer Khan", phone: "1112223333", specialty: "Dermatologist", hospital: "Skin Glow", lat: 28.6150, lon: 77.2200, status: "OFFLINE" },
        { name: "Dr. Neha Kapoor", phone: "1112223334", specialty: "Orthopedic", hospital: "Bone & Joint", lat: 28.6050, lon: 77.2000, status: "ONLINE" },
    ];

    console.log("Seeding doctors...");
    for (const d of doctors) {
        const userId = uuidv4();
        await db.run('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, "DOCTOR")', [userId, d.phone, d.name]);

        const docId = uuidv4();
        await db.run(`
      INSERT INTO doctor_profiles (id, userId, specialty, hospitalName, latitude, longitude, status, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [docId, userId, d.specialty, d.hospital, d.lat, d.lon, d.status, 4.5 + Math.random() * 0.5]);
    }

    console.log("Doctors seeded successfully.");
}

seedDoctors();
