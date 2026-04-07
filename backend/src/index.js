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
        CREATE TABLE IF NOT EXISTS patient_profiles (id TEXT PRIMARY KEY, userId TEXT, age INTEGER, gender TEXT, address TEXT, height REAL, weight REAL, bloodGroup TEXT, bmi REAL, history TEXT);
        CREATE TABLE IF NOT EXISTS doctor_profiles (id TEXT PRIMARY KEY, userId TEXT, specialty TEXT, status TEXT, rating REAL, contact TEXT, address TEXT, slots TEXT);
        CREATE TABLE IF NOT EXISTS queue (
            id TEXT PRIMARY KEY, patientId TEXT, doctorId TEXT, severity TEXT, priority REAL, 
            reasoning TEXT, status TEXT, callRoomId TEXT, isShared BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS health_timeline (id TEXT PRIMARY KEY, patientId TEXT, eventTitle TEXT, eventDetails TEXT, doctorName TEXT, date TEXT);
    `);

    // --- Seeding Doctors ---
    const docs = [
        { u: { id: 'doc-1', p: '9999999999', n: 'Dr. Ananya Sharma', r: 'DOCTOR' }, d: { s: 'Cardiology Specialist', st: 'ONLINE', ra: 4.9, c: '+91 9988776655', a: 'Fortis Hospital', sl: '["09:00 AM", "11:30 AM"]' } },
        { u: { id: 'doc-2', p: '8888888888', n: 'Dr. Vikram Malhotra', r: 'DOCTOR' }, d: { s: 'Internal Medicine', st: 'ONLINE', ra: 4.8, c: '+91 8877665544', a: 'Max Super Specialty', sl: '["10:00 AM", "01:00 PM"]' } }
    ];
    for (const doc of docs) {
        await db.run('INSERT OR IGNORE INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [doc.u.id, doc.u.p, doc.u.n, doc.u.r]);
        await db.run('INSERT OR IGNORE INTO doctor_profiles (id, userId, specialty, status, rating, contact, address, slots) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [doc.u.id, doc.u.id, doc.d.s, doc.d.st, doc.d.ra, doc.d.c, doc.d.a, doc.d.sl]);
    }

    app.post('/api/auth/login', async (req, res) => {
        const { phone, name, role } = req.body;
        let user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
        if (!user) {
            user = { id: uuidv4(), phone, name, role };
            await db.run('INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)', [user.id, phone, name, role]);
            if (role === 'DOCTOR') await db.run('INSERT INTO doctor_profiles (id, userId) VALUES (?, ?)', [uuidv4(), user.id]);
        }
        res.json({ token: 'mock-token', user });
    });

    app.post('/api/patient/update-profile', async (req, res) => {
        const { userId, age, gender, address, height, weight, bloodGroup, history } = req.body;
        const bmi = weight / ((height / 100) * (height / 100));
        await db.run('INSERT OR REPLACE INTO patient_profiles (id, userId, age, gender, address, height, weight, bloodGroup, bmi, history) VALUES ((SELECT id FROM patient_profiles WHERE userId=?), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, userId, age, gender, address, height, weight, bloodGroup, bmi, history]);
        res.json({ success: true });
    });

    // --- Complex AI Triage & Report Creation (Private by Default) ---
    app.post('/api/intake/finalize', async (req, res) => {
        const { userId, answers, symptom } = req.body;
        const p = await db.get('SELECT * FROM patient_profiles WHERE userId = ?', userId);

        // Context-Aware Triage using past history + current symptoms
        const triage = TriageService.performTriage({
            age: p?.age || 25,
            gender: p?.gender || 'Male',
            history: [p?.history || ''],
            symptoms: [symptom]
        });

        await db.run('DELETE FROM queue WHERE patientId = ?', p?.id);
        const qId = uuidv4();
        await db.run('INSERT INTO queue (id, patientId, doctorId, severity, priority, reasoning, status, callRoomId, isShared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [qId, p?.id, null, triage.severity, triage.score, JSON.stringify({ summary: triage.clinicalSummary, flags: triage.flags || [] }), 'DRAFT', `room-${qId.slice(0, 8)}`, 0]);

        res.json({ success: true, triage });
    });

    // --- Exclusive Sharing & Priority Queue Allocation ---
    app.post('/api/book/share-report', async (req, res) => {
        const { userId, doctorId } = req.body;
        const p = await db.get('SELECT id FROM patient_profiles WHERE userId = ?', userId);

        // Exclusive Share Lock: Only one active sharing allowed
        const active = await db.get('SELECT id FROM queue WHERE patientId = ? AND isShared = 1 AND status != "COMPLETED"', p?.id);
        if (active) return res.status(400).json({ error: "Report is already shared with another doctor. Revoke first." });

        await db.run('UPDATE queue SET doctorId = ?, isShared = 1, status = "WAITING" WHERE patientId = ?', [doctorId, p?.id]);
        io.emit('queue_updated'); res.json({ success: true });
    });

    // --- Real-time Queue Load Calculation for Doctors ---
    app.get('/api/doctors', async (req, res) => {
        const doctors = await db.all(`SELECT dp.*, u.name as doctorName FROM doctor_profiles dp JOIN users u ON dp.userId = u.id`);
        for (let d of doctors) {
            const qLoad = await db.get('SELECT count(*) as count FROM queue WHERE doctorId = ? AND status = "WAITING"', d.id);
            const highPri = await db.get('SELECT count(*) as count FROM queue WHERE doctorId = ? AND severity = "EMERGENCY" AND status = "WAITING"', d.id);
            d.queueLoad = qLoad.count;
            d.emergencyCount = highPri.count;
        }
        res.json(doctors);
    });

    app.get('/api/patient/status/:userId', async (req, res) => {
        const p = await db.get('SELECT * FROM patient_profiles WHERE userId = ?', req.params.userId);
        if (!p) return res.json({ profileMissing: true });
        const q = await db.get('SELECT * FROM queue WHERE patientId = ? AND status != "COMPLETED"', p.id);
        if (q && q.doctorId) {
            const pos = await db.get('SELECT count(*) as count FROM queue WHERE doctorId = ? AND priority > ? AND status = "WAITING"', [q.doctorId, q.priority]);
            q.position = pos.count + 1;
        }
        res.json({ inQueue: !!q, ...q, profile: p });
    });

    app.get('/api/doctor/queue', async (req, res) => {
        const { doctorUserId } = req.query;
        const d = await db.get('SELECT id FROM doctor_profiles WHERE userId = ?', doctorUserId);
        const list = await db.all('SELECT q.*, u.name, pp.age, pp.gender FROM queue q JOIN patient_profiles pp ON q.patientId = pp.id JOIN users u ON pp.userId = u.id WHERE q.doctorId = ? AND q.status != "COMPLETED" ORDER BY q.priority DESC', d.id);
        res.json(list);
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

    server.listen(process.env.PORT || 5000, '0.0.0.0', () => console.log(`🚀 Engine` | process.pid));
}

start();
const io_connect = (s) => s.on('set_peer_id', (p) => console.log("Peer:", p));
io.on('connection', io_connect);
