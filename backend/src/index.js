require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const TriageService = require('./services/triageService');
const { QuestionnaireService } = require('./services/questionnaireService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'full_functionality_sahay_secret';

app.use(cors());
app.use(express.json());

let db;

async function start() {
    db = await open({ filename: path.join(__dirname, '../database.db'), driver: sqlite3.Database });

    // --- Production Ready Schema Cleanup ---
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, phone TEXT UNIQUE, name TEXT, role TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS patient_profiles (id TEXT PRIMARY KEY, userId TEXT UNIQUE, age INTEGER, gender TEXT, medicalHistory TEXT);
        CREATE TABLE IF NOT EXISTS doctor_profiles (id TEXT PRIMARY KEY, userId TEXT UNIQUE, doctorName TEXT, specialty TEXT, hospitalName TEXT, rating REAL, status TEXT DEFAULT 'ONLINE');
        CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, patientId TEXT, doctorId TEXT, severity TEXT, priority REAL, reasoning TEXT, status TEXT DEFAULT 'WAITING', callRoomId TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, patientId TEXT, doctorId TEXT, notes TEXT, medicines TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
    `);

    // --- Production Auto-Seeding (Essential for Demos/Render restarts) ---
    const doctorCount = await db.get('SELECT COUNT(*) as count FROM doctor_profiles');
    if (doctorCount.count === 0) {
        console.log("🌱 Seeding production doctor profiles...");
        const docUserId = uuidv4();
        await db.run('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [docUserId, '9999999999', 'Dr. Ananya Sharma', 'DOCTOR']);
        await db.run('INSERT INTO doctor_profiles (id, userId, doctorName, specialty, hospitalName, rating, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), docUserId, 'Dr. Ananya Sharma', 'General Medicine & Triage', 'City Care Rural Clinic', 4.9, 'ONLINE']);

        const docUserId2 = uuidv4();
        await db.run('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [docUserId2, '8888888888', 'Dr. Vikram Malhotra', 'Cardiology', 'Apex Heart Institute', 4.8, 'ONLINE']);
        await db.run('INSERT INTO doctor_profiles (id, userId, doctorName, specialty, hospitalName, rating, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), docUserId2, 'Dr. Vikram Malhotra', 'Cardiologist', 'Apex Heart Institute', 4.8, 'ONLINE']);
    }

    // --- Auth ---
    app.post('/api/auth/login', async (req, res) => {
        const { phone, name, role = 'PATIENT' } = req.body;
        let user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
        if (!user) {
            const id = uuidv4();
            await db.run('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [id, phone, name, role]);
            user = { id, phone, name, role };
        }
        res.json({ token: jwt.sign(user, SECRET), user });
    });

    // --- Intake & Triage ---
    app.post('/api/intake/next-question', (req, res) => {
        const { answers, symptom } = req.body;
        const nextQ = QuestionnaireService.getNextQuestion(answers, symptom);
        res.json({ nextQuestion: nextQ, isComplete: !nextQ });
    });

    app.post('/api/intake/finalize', async (req, res) => {
        const { userId, answers, symptom, doctorId } = req.body;
        const triage = TriageService.performTriage({ symptoms: [symptom], answers, age: parseInt(answers.age), history: [answers.chronicConditions] });
        const summary = QuestionnaireService.generateSummary(answers, symptom, triage);

        let profile = await db.get('SELECT * FROM patient_profiles WHERE userId = ?', userId);
        if (!profile) {
            const pId = uuidv4();
            await db.run('INSERT INTO patient_profiles (id, userId, age, gender) VALUES (?, ?, ?, ?)', [pId, userId, parseInt(answers.age), answers.gender]);
            profile = { id: pId };
        }

        await db.run('DELETE FROM queue WHERE patientId = ?', profile.id);
        await db.run(`INSERT INTO queue (id, patientId, doctorId, severity, priority, reasoning, status, callRoomId)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), profile.id, doctorId || null, triage.severity, triage.score, JSON.stringify({ summary, flags: triage.flags || [] }), 'WAITING', `room-${uuidv4().slice(0, 8)}`]);

        io.emit('queue_updated');
        res.json({ success: true, triage, summary });
    });

    // --- Booking from Discovery portal ---
    app.post('/api/book/doctor', async (req, res) => {
        const { userId, doctorId } = req.body;
        let profile = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', userId);
        if (!profile) return res.status(400).json({ error: "Profile missing. Complete Intake first." });

        await db.run('UPDATE queue SET doctorId = ?, status = "WAITING" WHERE patientId = ?', [doctorId, profile.id]);
        io.emit('queue_updated');
        res.json({ success: true });
    });

    // --- Doctor Dashboard ---
    app.get('/api/doctor/queue', async (req, res) => {
        const { doctorUserId } = req.query;
        let query = `SELECT q.*, u.name, pp.age, pp.gender FROM queue q 
                      JOIN patient_profiles pp ON q.patientId = pp.id 
                      JOIN users u ON pp.userId = u.id 
                      WHERE q.status != "COMPLETED"`;
        const params = [];
        if (doctorUserId) {
            const doc = await db.get('SELECT id FROM doctor_profiles WHERE userId = ?', doctorUserId);
            if (doc) { query += ' AND (q.doctorId = ? OR q.doctorId IS NULL)'; params.push(doc.id); }
        }
        const queueList = await db.all(query + ' ORDER BY q.priority DESC', params);
        res.json(queueList);
    });

    app.post('/api/doctor/action', async (req, res) => {
        const { queueId, action, peerId } = req.body;
        const status = action === 'START_CONSULTATION' ? 'IN_CONSULTATION' : 'COMPLETED';
        await db.run('UPDATE queue SET status = ? WHERE id = ?', [status, queueId]);
        if (action === 'START_CONSULTATION') {
            const entry = await db.get('SELECT * FROM queue WHERE id = ?', queueId);
            io.emit('call_started', { queueId, roomId: entry.callRoomId, patientId: entry.patientId, doctorPeerId: peerId });
        }
        io.emit('queue_updated');
        res.json({ success: true });
    });

    app.post('/api/prescription/add', async (req, res) => {
        const { patientId, doctorId, notes, medicines } = req.body;
        await db.run('INSERT INTO prescriptions (id, patientId, doctorId, notes, medicines) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), patientId, doctorId, notes, JSON.stringify(medicines)]);
        res.json({ success: true });
    });

    app.get('/api/patient/prescriptions/:userId', async (req, res) => {
        const p = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', req.params.userId);
        if (!p) return res.json([]);
        const list = await db.all('SELECT * FROM prescriptions WHERE patientId = ? ORDER BY createdAt DESC', p.id);
        res.json(list);
    });

    // --- Core API ---
    app.get('/api/doctors', async (req, res) => {
        const d = await db.all(`SELECT dp.*, u.name as doctorName FROM doctor_profiles dp JOIN users u ON dp.userId = u.id`);
        res.json(d);
    });

    app.get('/api/patient/status/:userId', async (req, res) => {
        const p = await db.get('SELECT * FROM patient_profiles WHERE userId = ?', req.params.userId);
        if (!p) return res.json({ inQueue: false });
        const q = await db.get('SELECT * FROM queue WHERE patientId = ? AND status != "COMPLETED"', p.id);
        if (!q) return res.json({ inQueue: false, profile: p });
        const higher = await db.get('SELECT COUNT(*) as count FROM queue WHERE priority > ? AND status = "WAITING"', [q.priority]);
        res.json({ inQueue: true, ...q, position: higher.count + 1, profile: p });
    });

    app.get('/api/health', (req, res) => res.json({ status: 'SAHAY_PROD_READY', timestamp: new Date().toISOString() }));

    // --- Global Error Handling ---
    app.use((err, req, res, next) => {
        console.error("Prod Error:", err);
        res.status(500).json({ error: "Service Error" });
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => console.log(`🚀 SAHAY Engine PROD on ${PORT}`));
}

io.on('connection', (s) => s.on('set_peer_id', (p) => console.log("Peer ready:", p)));

start();
