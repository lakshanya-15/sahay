import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import {
    Activity, Clock, Video, PhoneCall, ChevronRight, Send, ArrowRightCircle, LogOut, ChevronLeft, Heart,
    Zap, Share2, ClipboardList, X, FileText, UserCheck, HeartPulse, History, AlertTriangle, UploadCloud, User, Ruler, Scale, ShieldAlert, Star, MapPin
} from 'lucide-react';

const API_BASE = 'https://sahay-6doo.onrender.com/api';
const socket = io('https://sahay-6doo.onrender.com');

const AuthContext = createContext(null);
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const login = async (phone, name, role) => {
        try {
            const res = await axios.post(`${API_BASE}/auth/login`, { phone, name, role });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setToken(res.data.token); setUser(res.data.user);
        } catch (e) { alert("Login failed."); }
    };
    const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); setToken(null); };
    return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
};

// --- Multi-Step Profile ---
const SetupProfile = ({ userId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ name: '', age: '', gender: 'Male', contact: '', address: '', height: '', weight: '', bloodGroup: 'B+' });
    const submit = async () => { await axios.post(`${API_BASE}/patient/update-profile`, { userId, ...form }); onComplete(); };
    return (
        <div className="container animate-up" style={{ maxWidth: '700px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '3rem' }}>Complete Patient Profile</h1>
            <div className="card">
                {step === 1 && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem' }}>Personal Details</h2>
                        <div className="input-group"><User size={18} /><input placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="input-group"><Clock size={18} /><input placeholder="Age" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                        <select style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--primary-light)' }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option></select>
                    </div>
                )}
                {step === 2 && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem' }}>Vitals</h2>
                        <div className="input-group"><Ruler size={18} /><input placeholder="Height (cm)" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} /></div>
                        <div className="input-group"><Scale size={18} /><input placeholder="Weight (kg)" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                    <button className="outline" onClick={() => setStep(step - 1)} style={{ opacity: step === 1 ? 0 : 1 }}>BACK</button>
                    <button className="primary" onClick={() => step === 2 ? submit() : setStep(2)}>{step === 2 ? 'FINISH' : 'NEXT'}</button>
                </div>
            </div>
        </div>
    );
};

// --- Intelligent Conversational AI Triage (Context-Aware) ---
const ConversationalIntake = ({ user, onComplete }) => {
    const [chat, setChat] = useState([{ b: true, t: `Hi ${user.name}, I am SAHAY AI. Describe your symptoms.` }]);
    const [inp, setInp] = useState('');
    const [answers, setAnswers] = useState({});
    const [currQ, setCurrQ] = useState({ id: 'mainSymptom' });
    const [symptom, setSymptom] = useState('');

    const sendMsg = async () => {
        if (!inp) return;
        const val = inp; setInp('');
        setChat(p => [...p, { b: false, t: val }]);
        const nAns = { ...answers, [currQ.id]: val }; setAnswers(nAns);
        let nSym = symptom; if (currQ.id === 'mainSymptom') { nSym = val; setSymptom(val); }
        const res = await axios.post(`${API_BASE}/intake/next-question`, { answers: nAns, symptom: nSym });
        if (res.data.isComplete) {
            setChat(p => [...p, { b: true, t: "Thank you. Finalizing your AI clinical report..." }]);
            await axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: nAns, symptom: nSym });
            setTimeout(() => onComplete(), 2000);
        } else {
            setCurrQ(res.data.nextQuestion);
            setChat(p => [...p, { b: true, t: res.data.nextQuestion.label }]);
        }
    };
    return (
        <div className="container animate-up" style={{ maxWidth: '600px' }}>
            <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {chat.map((m, i) => <div key={i} className={`badge ${m.b ? 'moderate-bg' : 'primary'}`} style={{ alignSelf: m.b ? 'flex-start' : 'flex-end', textTransform: 'none', padding: '1rem', borderRadius: '16px' }}>{m.t}</div>)}
                </div>
                <div className="input-group" style={{ marginTop: '1rem' }}><input placeholder="Reply to SAHAY..." value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} /><button className="primary" onClick={sendMsg}><Send size={18} /></button></div>
            </div>
        </div>
    );
};

// --- Scheduling & Appointment Dashboard ---
const SchedulingDashboard = ({ doctor, user, onBack }) => {
    const slots = JSON.parse(doctor.slots || "[]");
    const [selSlot, setSelSlot] = useState(null);
    const book = async () => {
        if (!selSlot) return alert("Select slot.");
        await axios.post(`${API_BASE}/book/doctor`, { userId: user.id, doctorId: doctor.id, slot: selSlot });
        alert("Appointment Scheduled Successfully!"); onBack();
    };
    return (
        <div className="container animate-up">
            <button className="outline" onClick={onBack} style={{ marginBottom: '2rem' }}><ChevronLeft /> Back to Discovery</button>
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
                <div className="card" style={{ gridColumn: 'span 5' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ width: '100px', height: '100px', background: 'var(--primary-light)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={50} color="var(--primary)" /></div>
                        <h2>{doctor.doctorName}</h2>
                        <p style={{ color: 'var(--primary)', fontWeight: '800' }}>{doctor.specialty}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.2rem', color: '#f59e0b', marginTop: '0.5rem' }}><Star size={16} fill="#f59e0b" /><span>{doctor.rating}</span></div>
                    </div>
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><PhoneCall size={20} color="var(--primary)" /><p><strong>Contact:</strong> {doctor.contact}</p></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><MapPin size={20} color="var(--primary)" /><p><strong>Location:</strong> {doctor.address}</p></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Video size={20} color="#10b981" /><p style={{ color: '#10b981' }}><strong>Teleconsultation Enabled</strong></p></div>
                    </div>
                </div>
                <div className="card" style={{ gridColumn: 'span 7' }}>
                    <h3>Select Appointment Slot</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Available slots for live clinical consultation</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {slots.map(s => (
                            <button key={s} className={selSlot === s ? 'primary' : 'outline'} style={{ padding: '1.5rem' }} onClick={() => setSelSlot(s)}>{s}</button>
                        ))}
                    </div>
                    <button className="primary" style={{ width: '100%', marginTop: '3rem', padding: '1.5rem' }} onClick={book}>CONFIRM & SCHEDULE CONSULTATION</button>
                </div>
            </div>
        </div>
    );
};

const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { data: q } = useQueueSync(user.id);
    if (q?.profileMissing) return <SetupProfile userId={user.id} onComplete={() => window.location.reload()} />;
    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1>SAHAY Console</h1><p style={{ color: 'var(--text-muted)' }}>Welcome, {user.name}. Your health is our priority.</p></div>
                <div style={{ width: '45px', height: '45px', background: 'white', borderRadius: '50%', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: '900' }}>{user.name[0]}</div>
            </header>
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
                <div className="card" style={{ gridColumn: 'span 4' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Member Profile</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><User size={24} color="var(--primary)" /><div><p><strong>{user.name}</strong></p><p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{q?.profile?.age} years | {q?.profile?.gender}</p></div></div>
                    <div style={{ background: 'var(--primary-light)', padding: '1.5rem', borderRadius: '16px', marginTop: '2rem', textAlign: 'center' }}>
                        <Scale size={20} color="var(--primary)" /><p style={{ fontSize: '0.7rem' }}>ESTIMATED BMI</p><h2>{q?.profile?.bmi?.toFixed(1)}</h2>
                    </div>
                </div>
                <div className="card" style={{ gridColumn: 'span 8', borderStyle: 'dashed', background: '#f8fafc', textAlign: 'center' }}>
                    <UploadCloud size={40} color="#94a3b8" /><h4>Medical Document Hub</h4><p style={{ color: '#94a3b8' }}>Upload prescriptions here</p>
                </div>
                <div className="card" style={{ gridColumn: 'span 6', background: '#f5f3ff' }}>
                    <h3>AI Insights</h3><p>Your vitals are stable. Drink plenty of water and maintain regular checkups.</p>
                    <button className="primary" style={{ width: '100%', marginTop: '1.5rem', background: '#7c3aed' }} onClick={() => setView('DISCOVERY')}>Find a Doctor</button>
                </div>
                <div className="card" style={{ gridColumn: 'span 6' }}>
                    <h3>Status</h3>{q?.inQueue ? (
                        <div><div className="badge moderate-bg" style={{ marginBottom: '1rem' }}>{q.severity} PRIORITY</div><p>Queue Position: #{q.position || 1}</p></div>
                    ) : (<p>No active assessment.</p>)}
                </div>
            </div>
            {q?.inQueue && q.status === 'IN_CONSULTATION' && (
                <div className="card pulse" style={{ marginTop: '2rem', background: '#ecfdf5', border: '2px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Session Online!</h3><button className="primary" style={{ background: '#10b981' }} onClick={() => onStartCall(q.callRoomId, q.doctorPeerId)}>JOIN VIDEO CALL</button>
                </div>
            )}
            <button className="primary pulse" style={{ position: 'fixed', bottom: '3rem', left: '50%', transform: 'translateX(-50%)', padding: '1.5rem 3rem', borderRadius: '50px', zIndex: 1000 }} onClick={() => setView('INTAKE')}>START AI TRIAGE</button>
        </div>
    );
};

const DoctorDashboard = ({ user, onStartCall }) => {
    const [q, setQ] = useState([]);
    const fetchQ = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetchQ(); socket.on('queue_updated', fetchQ); return () => socket.off('queue_updated'); }, []);
    return (
        <div className="container">
            <h1>Doctor Portal</h1><div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
                {q.map(x => (
                    <div key={x.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
                        <div><span className="badge emergency-bg">{x.severity}</span><h3>{x.name} ({x.age}y)</h3></div>
                        <button className="primary" onClick={() => {
                            const p = new Peer(); p.on('open', (pid) => {
                                axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'START_CONSULTATION', peerId: pid });
                                onStartCall(x.callRoomId, x.name, null);
                            });
                        }}>START CONSULTATION</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const App = () => {
    const { user, token, logout } = useContext(AuthContext);
    const [view, setView] = useState('DASHBOARD');
    const [activeCall, setActiveCall] = useState(null);
    const [selDoc, setSelDoc] = useState(null);

    if (!token) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoginPortal /></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            <nav className="glass-nav" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => { setView('DASHBOARD'); setSelDoc(null); }}><Activity color="var(--primary)" size={28} /><h2>SAHAY</h2></div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}><div style={{ fontWeight: '800', color: 'var(--primary)' }}>{user.name}</div><button onClick={logout} style={{ color: '#ef4444' }}><LogOut size={20} /></button></div>
            </nav>
            <main className="container">
                {selDoc ? <SchedulingDashboard doctor={selDoc} user={user} onBack={() => setSelDoc(null)} /> : (
                    user.role === 'PATIENT' ? (
                        <>
                            {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, dpid) => setActiveCall({ rid, name: "Doctor", dpid })} />}
                            {view === 'INTAKE' && <ConversationalIntake user={user} onComplete={() => setView('DASHBOARD')} />}
                            {view === 'DISCOVERY' && <DoctorDiscovery user={user} setDoc={setSelDoc} onBack={() => setView('DASHBOARD')} />}
                        </>
                    ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />
                )}
            </main>
            {activeCall && <div className="loading-overlay" style={{ background: '#000' }}><h1 style={{ color: 'white' }}>WebRTC Session Active</h1><button className="primary" style={{ marginTop: '2rem', background: '#ef4444' }} onClick={() => setActiveCall(null)}>END CALL</button></div>}
        </div>
    );
};

const LoginPortal = () => {
    const { login } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div className="card" style={{ width: '380px', textAlign: 'center' }}>
            <Activity color="var(--primary)" size={36} /><h1 className="text-gradient">SAHAY</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                <div className="input-group"><User size={18} /><input placeholder="Full Name" value={n} onChange={e => setN(e.target.value)} /></div>
                <div className="input-group"><PhoneCall size={18} /><input placeholder="Phone" value={p} onChange={e => setP(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px' }}>
                    <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>Patient</button>
                    <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Doctor</button>
                </div>
                <button className="primary" onClick={() => login(p, n, r)}>LOGIN</button>
            </div>
        </div>
    );
};

const DoctorDiscovery = ({ setDoc }) => {
    const [docs, setDocs] = useState([]);
    useEffect(() => { axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data)); }, []);
    return (
        <div className="animate-up">
            <h2 style={{ marginBottom: '2rem' }}>Live Medical Specialists</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {docs.map(d => (
                    <div className="card" key={d.id}><h3>{d.doctorName}</h3><p style={{ color: 'var(--primary)', fontWeight: '800' }}>{d.specialty}</p><button className="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setDoc(d)}>VIEW PROFILE & BOOK</button></div>
                ))}
            </div>
        </div>
    );
};

const useQueueSync = (userId) => {
    const [data, setData] = useState(null);
    useEffect(() => {
        const fetch = () => axios.get(`${API_BASE}/patient/status/${userId}`).then(res => setData(res.data));
        fetch(); socket.on('queue_updated', fetch); return () => socket.off('queue_updated');
    }, [userId]);
    return { data };
};

export default () => <AuthProvider><App /></AuthProvider>;
