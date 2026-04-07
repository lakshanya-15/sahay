const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const TriageService = require('./services/triageService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

let db;

async function start() {
    db = await open({
        filename: path.join(__dirname, 'database.db'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, phone TEXT UNIQUE, name TEXT, role TEXT);
        CREATE TABLE IF NOT EXISTS patient_profiles (
            id TEXT PRIMARY KEY, userId TEXT, age INTEGER, gender TEXT, 
            address TEXT, height REAL, weight REAL, bloodGroup TEXT, bmi REAL
        );
        CREATE TABLE IF NOT EXISTS doctor_profiles (id TEXT PRIMARY KEY, userId TEXT, specialty TEXT, status TEXT, rating REAL);
        CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, patientId TEXT, doctorId TEXT, severity TEXT, priority REAL, reasoning TEXT, status TEXT, callRoomId TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, patientId TEXT, doctorId TEXT, notes TEXT, medicines TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS health_timeline (id TEXT PRIMARY KEY, patientId TEXT, eventTitle TEXT, eventDetails TEXT, doctorName TEXT, date TEXT);
    `);

    // --- Seeding Doctors ---
    const docs = [
        { u: { id: 'doc-1', p: '9999999999', n: 'Dr. Ananya Sharma', r: 'DOCTOR' }, d: { s: 'Cardiology', st: 'ONLINE', ra: 4.9 } },
        { u: { id: 'doc-2', p: '8888888888', n: 'Dr. Vikram Malhotra', r: 'DOCTOR' }, d: { s: 'General Medicine', st: 'ONLINE', ra: 4.7 } }
    ];
    for (const doc of docs) {
        await db.run('INSERT OR IGNORE INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [doc.u.id, doc.u.p, doc.u.n, doc.u.r]);
        await db.run('INSERT OR IGNORE INTO doctor_profiles (id, userId, specialty, status, rating) VALUES (?, ?, ?, ?, ?)', [doc.u.id, doc.u.id, doc.d.s, doc.d.st, doc.d.ra]);
    }

    // --- Auth Routes ---
    app.post('/api/auth/login', async (req, res) => {
        const { phone, name, role } = req.body;
        let user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
        if (!user) {
            user = { id: uuidv4(), phone, name, role };
            await db.run('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [user.id, phone, name, role]);
            if (role === 'DOCTOR') {
                await db.run('INSERT INTO doctor_profiles (id, userId, specialty, status, rating) VALUES (?, ?, ?, ?, ?)', [uuidv4(), user.id, 'General Medicine', 'ONLINE', 4.5]);
            }
        }
        res.json({ token: 'mock-jwt-token', user });
    });

    app.post('/api/patient/update-profile', async (req, res) => {
        const { userId, age, gender, address, height, weight, bloodGroup } = req.body;
        const bmi = weight / ((height / 100) * (height / 100));
        let profile = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', userId);
        if (!profile) {
            await db.run('INSERT INTO patient_profiles (id, userId, age, gender, address, height, weight, bloodGroup, bmi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [uuidv4(), userId, age, gender, address, height, weight, bloodGroup, bmi]);
        } else {
            await db.run('UPDATE patient_profiles SET age=?, gender=?, address=?, height=?, weight=?, bloodGroup=?, bmi=? WHERE userId=?',
                [age, gender, address, height, weight, bloodGroup, bmi, userId]);
        }
        res.json({ success: true });
    });

    // --- Advanced Context-Aware Chatbot Logic ---
    const QUESTION_BANK = {
        age: { label: "How old are you?", type: "number" },
        gender: { label: "What is your gender? (Male/Female/Other)", type: "text" },
        duration: { label: "How long have you been feeling this way?", type: "text" },
        pain_level: { label: "On a scale of 1 to 10, how intense is the discomfort?", type: "number" },
        pain_spread: { label: "Is the pain spreading to your arms or back? (Yes/No)", type: "text" },
        sweating: { label: "Are you experiencing any sweating/nausea? (Yes/No)", type: "text" },
        at_rest: { label: "Do you feel short of breath even while sitting? (Yes/No)", type: "text" },
        temp_level: { label: "Is your fever above 102°F? (Yes/No)", type: "text" }
    };

    app.post('/api/intake/next-question', (req, res) => {
        const { answers, symptom } = req.body;
        if (!symptom) return res.json({ isComplete: false, nextQuestion: { id: 'mainSymptom', type: 'text', label: 'Welcome. Please tell me about your symptoms.' } });
        let flow = ['age', 'gender', 'duration'];
        if (symptom.includes('chest')) flow = [...flow, 'pain_level', 'pain_spread', 'sweating'];
        else if (symptom.includes('breath')) flow = [...flow, 'at_rest'];
        const answeredKeys = Object.keys(answers);
        const nextId = flow.find(k => !answeredKeys.includes(k));
        if (!nextId) return res.json({ isComplete: true });
        res.json({ isComplete: false, nextQuestion: { id: nextId, ...QUESTION_BANK[nextId] } });
    });

    app.post('/api/intake/finalize', async (req, res) => {
        const { userId, answers, symptom } = req.body;
        const triage = TriageService.performTriage({ age: parseInt(answers.age), gender: answers.gender, history: [], symptoms: [symptom] });
        let profile = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', userId);
        if (!profile) {
            profile = { id: uuidv4() };
            await db.run('INSERT INTO patient_profiles (id, userId, age, gender) VALUES (?, ?, ?, ?)', [profile.id, userId, parseInt(answers.age), answers.gender]);
        }
        await db.run('DELETE FROM queue WHERE patientId = ?', profile.id);
        await db.run(`INSERT INTO queue (id, patientId, doctorId, severity, priority, reasoning, status, callRoomId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), profile.id, null, triage.severity, triage.score, JSON.stringify({ summary: triage.clinicalSummary, flags: triage.flags || [] }), 'WAITING', `room-${uuidv4().slice(0, 8)}`]);
        io.emit('queue_updated');
        res.json({ success: true, triage });
    });

    // --- Booking/Discovery ---
    app.post('/api/book/doctor', async (req, res) => {
        const { userId, doctorId } = req.body;
        let p = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', userId);
        if (!p) return res.status(400).json({ error: "Setup profile first." });
        await db.run('UPDATE queue SET doctorId = ?, status = "WAITING" WHERE patientId = ?', [doctorId, p.id]);
        io.emit('queue_updated'); res.json({ success: true });
    });

    app.get('/api/patient/status/:userId', async (req, res) => {
        const p = await db.get('SELECT * FROM patient_profiles WHERE userId = ?', req.params.userId);
        if (!p) return res.json({ profileMissing: true });
        const q = await db.get('SELECT * FROM queue WHERE patientId = ? AND status != "COMPLETED"', p.id);
        const timeline = await db.all('SELECT * FROM health_timeline WHERE patientId = ? ORDER BY date DESC LIMIT 5', p.id);
        res.json({ inQueue: !!q, ...q, profile: p, timeline });
    });

    app.get('/api/doctor/queue', async (req, res) => {
        const { doctorUserId } = req.query;
        let q = `SELECT q.*, u.name, pp.age, pp.gender FROM queue q JOIN patient_profiles pp ON q.patientId = pp.id JOIN users u ON pp.userId = u.id WHERE q.status != "COMPLETED"`;
        const params = [];
        if (doctorUserId) {
            const d = await db.get('SELECT id FROM doctor_profiles WHERE userId = ?', doctorUserId);
            if (d) { q += ' AND (q.doctorId = ? OR q.doctorId IS NULL)'; params.push(d.id); }
        }
        res.json(await db.all(q + ' ORDER BY q.priority DESC', params));
    });

    app.post('/api/doctor/action', async (req, res) => {
        const { queueId, action, peerId } = req.body;
        const status = action === 'START_CONSULTATION' ? 'IN_CONSULTATION' : 'COMPLETED';
        await db.run('UPDATE queue SET status = ? WHERE id = ?', [status, queueId]);
        if (action === 'START_CONSULTATION') {
            const e = await db.get('SELECT * FROM queue WHERE id = ?', queueId);
            io.emit('call_started', { queueId, roomId: e.callRoomId, patientId: e.patientId, doctorPeerId: peerId });
        }
        io.emit('queue_updated'); res.json({ success: true });
    });

    app.get('/api/doctors', async (req, res) => res.json(await db.all(`SELECT dp.*, u.name as doctorName FROM doctor_profiles dp JOIN users u ON dp.userId = u.id`)));
    app.get('/api/health', (req, res) => res.json({ status: 'READY', time: new Date() }));
    server.listen(process.env.PORT || 5000, '0.0.0.0', () => console.log(`🚀 Engine`));
}

io.on('connection', (s) => s.on('set_peer_id', (p) => console.log("Peer:", p)));
start();
