const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    const db = await open({
        filename: path.join(__dirname, '../../database.db'),
        driver: sqlite3.Database
    });

    console.log("Cleaning old data...");
    await db.exec("DELETE FROM queue; DELETE FROM patient_profiles; DELETE FROM users;");

    const patients = [
        { name: "Amit Kumar", phone: "9876543210", severity: "EMERGENCY", age: 45, symptoms: ["chest_pain"], reasoning: "Emergency: Chest pain in high-risk age group (40+)." },
        { name: "Rajesh Singh", phone: "9876543211", severity: "MODERATE", age: 30, symptoms: ["fever"], reasoning: "Moderate: Persistent fever for 4 days." },
        { name: "Suman Devi", phone: "9876543212", severity: "MODERATE", age: 28, symptoms: ["abdominal_pain"], reasoning: "Moderate: Severe abdominal pain." },
        { name: "Pooja Sharma", phone: "9876543213", severity: "ROUTINE", age: 22, symptoms: ["cough"], reasoning: "Routine: Mild cough/cold." },
        { name: "Rahul Gupta", phone: "9876543214", severity: "ROUTINE", age: 35, symptoms: ["skin_rash"], reasoning: "Routine: Minor skin irritation." },
    ];

    for (const p of patients) {
        const userId = uuidv4();
        await db.run('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [userId, p.phone, p.name, 'PATIENT']);

        const pId = uuidv4();
        await db.run('INSERT INTO patient_profiles (id, userId, age, gender, medicalHistory) VALUES (?, ?, ?, ?, ?)',
            [pId, userId, p.age, 'Male', '[]']);

        const qId = uuidv4();
        const baseScore = p.severity === 'EMERGENCY' ? 100 : p.severity === 'MODERATE' ? 50 : 10;
        await db.run('INSERT INTO queue (id, patientId, severity, riskScore, symptoms, reasoning, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [qId, pId, p.severity, baseScore, JSON.stringify(p.symptoms), p.reasoning, baseScore, 'WAITING']);
    }

    console.log("Seed data created successfully.");
}

seed();
