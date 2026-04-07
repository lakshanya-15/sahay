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
            [uuidv4(), profile.id, doctorId || null, triage.severity, triage.score, summary, 'WAITING', `room-${uuidv4().slice(0, 8)}`]);

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
        const { queueId, action } = req.body;
        const status = action === 'START_CONSULTATION' ? 'IN_CONSULTATION' : 'COMPLETED';
        await db.run('UPDATE queue SET status = ? WHERE id = ?', [status, queueId]);
        if (action === 'START_CONSULTATION') {
            const entry = await db.get('SELECT * FROM queue WHERE id = ?', queueId);
            io.emit('call_started', { queueId, roomId: entry.callRoomId, patientId: entry.patientId });
        }
        io.emit('queue_updated');
        res.json({ success: true });
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

    app.get('/api/health', (req, res) => res.json({ status: 'SAHAY_UP' }));

    server.listen(5000, '0.0.0.0', () => console.log('🚀 SAHAY Engine Functional on port 5000'));
}

start();
