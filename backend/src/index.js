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
        CREATE TABLE IF NOT EXISTS patient_profiles (id TEXT PRIMARY KEY, userId TEXT, age INTEGER, gender TEXT);
        CREATE TABLE IF NOT EXISTS doctor_profiles (id TEXT PRIMARY KEY, userId TEXT, specialty TEXT, status TEXT, rating REAL);
        CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, patientId TEXT, doctorId TEXT, severity TEXT, priority REAL, reasoning TEXT, status TEXT, callRoomId TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, patientId TEXT, doctorId TEXT, notes TEXT, medicines TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
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

    // --- Intake/Triage ---
    app.post('/api/intake/next-question', (req, res) => {
        const { answers, symptom } = req.body;
        if (!symptom) return res.json({ isComplete: false, nextQuestion: { id: 'mainSymptom', type: 'text', label: 'Please describe your main symptom briefly.' } });
        const symptomsOrder = ['age', 'gender', 'pain_level', 'duration', 'is_smoker'];
        const currentIdx = symptomsOrder.indexOf(Object.keys(answers).pop() || 'mainSymptom');
        const nextId = symptomsOrder[currentIdx + 1];
        if (!nextId) return res.json({ isComplete: true });
        res.json({ isComplete: false, nextQuestion: { id: nextId, type: 'text', label: `Please provide: ${nextId}` } });
    });

    app.post('/api/intake/finalize', async (req, res) => {
        const { userId, answers, symptom } = req.body;
        const triage = TriageService.performTriage({ age: parseInt(answers.age), gender: answers.gender, history: [], symptoms: [symptom] });
        const summary = triage.clinicalSummary;

        let profile = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', userId);
        if (!profile) {
            const pId = uuidv4();
            await db.run('INSERT INTO patient_profiles (id, userId, age, gender) VALUES (?, ?, ?, ?)', [pId, userId, parseInt(answers.age), answers.gender]);
            profile = { id: pId };
        } else {
            await db.run('UPDATE patient_profiles SET age = ?, gender = ? WHERE id = ?', [parseInt(answers.age), answers.gender, profile.id]);
        }

        await db.run('DELETE FROM queue WHERE patientId = ?', profile.id);
        await db.run(`INSERT INTO queue (id, patientId, doctorId, severity, priority, reasoning, status, callRoomId)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), profile.id, null, triage.severity, triage.score, JSON.stringify({ summary, flags: triage.flags || [] }), 'WAITING', `room-${uuidv4().slice(0, 8)}`]);

        io.emit('queue_updated');
        res.json({ success: true, triage, summary });
    });

    app.post('/api/book/doctor', async (req, res) => {
        const { userId, doctorId } = req.body;
        let profile = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', userId);
        if (!profile) return res.status(400).json({ error: "Profile missing." });

        const inQueue = await db.get('SELECT id FROM queue WHERE patientId = ?', profile.id);
        if (inQueue) {
            await db.run('UPDATE queue SET doctorId = ?, status = "WAITING" WHERE id = ?', [doctorId, inQueue.id]);
        } else {
            await db.run(`INSERT INTO queue (id, patientId, doctorId, severity, priority, reasoning, status, callRoomId)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), profile.id, doctorId, 'MODERATE', 50, JSON.stringify({ summary: "Manual Specialist Request" }), 'WAITING', `room-${uuidv4().slice(0, 8)}`]);
        }
        io.emit('queue_updated'); res.json({ success: true });
    });

    app.get('/api/patient/status/:userId', async (req, res) => {
        const p = await db.get('SELECT * FROM patient_profiles WHERE userId = ?', req.params.userId);
        if (!p) return res.json({ message: "No data" });
        const q = await db.get('SELECT * FROM queue WHERE patientId = ? AND status != "COMPLETED"', p.id);
        if (!q) return res.json({ profile: p, message: "No queue" });
        const higher = await db.get('SELECT count(*) as count FROM queue WHERE priority > ? AND status = "WAITING"', q.priority);
        res.json({ inQueue: true, ...q, position: higher.count + 1, profile: p });
    });

    app.get('/api/doctor/queue', async (req, res) => {
        const { doctorUserId } = req.query;
        let query = `SELECT q.*, u.name, pp.age, pp.gender FROM queue q JOIN patient_profiles pp ON q.patientId = pp.id JOIN users u ON pp.userId = u.id WHERE q.status != "COMPLETED"`;
        const params = [];
        if (doctorUserId) {
            const doc = await db.get('SELECT id FROM doctor_profiles WHERE userId = ?', doctorUserId);
            if (doc) { query += ' AND (q.doctorId = ? OR q.doctorId IS NULL)'; params.push(doc.id); }
        }
        res.json(await db.all(query + ' ORDER BY q.priority DESC', params));
    });

    app.post('/api/doctor/action', async (req, res) => {
        const { queueId, action, peerId } = req.body;
        const status = action === 'START_CONSULTATION' ? 'IN_CONSULTATION' : 'COMPLETED';
        await db.run('UPDATE queue SET status = ? WHERE id = ?', [status, queueId]);
        if (action === 'START_CONSULTATION') {
            const entry = await db.get('SELECT * FROM queue WHERE id = ?', queueId);
            io.emit('call_started', { queueId, roomId: entry.callRoomId, patientId: entry.patientId, doctorPeerId: peerId });
        }
        io.emit('queue_updated'); res.json({ success: true });
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

    app.get('/api/doctors', async (req, res) => {
        res.json(await db.all(`SELECT dp.*, u.name as doctorName FROM doctor_profiles dp JOIN users u ON dp.userId = u.id`));
    });

    app.get('/api/health', (req, res) => res.json({ status: 'SAHAY_PROD_READY', timestamp: new Date().toISOString() }));

    app.use((err, req, res, next) => { console.error("Err:", err); res.status(500).json({ error: "Service Error" }); });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Engine: ${PORT}`));
}

io.on('connection', (s) => s.on('set_peer_id', (p) => console.log("Peer ready:", p)));
start();
