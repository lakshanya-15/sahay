import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import {
    Activity, Clock, Video, PhoneCall, ChevronRight,
    Send, ArrowRightCircle, LogOut, ChevronLeft, Heart,
    Zap, Share2, ClipboardList, X,
    FileText, UserCheck, HeartPulse, History, AlertTriangle, UploadCloud, User, Ruler, Scale, ShieldAlert
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
    const logout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('user');
        setUser(null); setToken(null);
    };
    return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
};

const SetupProfile = ({ userId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ name: '', age: '', gender: 'Male', contact: '', address: '', height: '', weight: '', bloodGroup: 'B+', history: '', allergies: '' });
    const submit = async () => {
        await axios.post(`${API_BASE}/patient/update-profile`, { userId, ...form });
        onComplete();
    };
    return (
        <div className="container animate-up" style={{ maxWidth: '800px' }}>
            <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem' }}>Complete your Patient Profile</h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '20px', left: '10%', right: '10%', height: '2px', background: '#e2e8f0', zIndex: 0 }}></div>
                {[1, 2, 3].map(s => (
                    <div key={s} style={{ zIndex: 1, textAlign: 'center', opacity: step >= s ? 1 : 0.4 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: step >= s ? 'var(--primary)' : 'white', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: step >= s ? 'white' : 'var(--primary)', margin: '0 auto 0.5rem' }}>
                            {s === 1 ? <User size={20} /> : s === 2 ? <HeartPulse size={20} /> : <ShieldAlert size={20} />}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{s === 1 ? 'Personal' : s === 2 ? 'Vitals' : 'History'}</span>
                    </div>
                ))}
            </div>
            <div className="card animate-up">
                {step === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <h2 style={{ gridColumn: 'span 2', fontSize: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>Personal Details</h2>
                        <div className="report-item"><label className="report-label">Full Name</label><div className="input-group"><User size={18} /><input placeholder="e.g. John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div></div>
                        <div className="report-item"><label className="report-label">Age</label><div className="input-group"><Clock size={18} /><input placeholder="Years" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div></div>
                        <div className="report-item">
                            <label className="report-label">Gender</label>
                            <select style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--primary-light)', fontWeight: '700' }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select>
                        </div>
                        <div className="report-item"><label className="report-label">Contact</label><div className="input-group"><PhoneCall size={18} /><input placeholder="+91" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div></div>
                        <div className="report-item" style={{ gridColumn: 'span 2' }}><label className="report-label">Address</label><textarea placeholder="Full address..." style={{ width: '100%', minHeight: '80px', border: 'none', background: 'var(--primary-light)', borderRadius: '16px', padding: '1rem' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    </div>
                )}
                {step === 2 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <h2 style={{ gridColumn: 'span 2', fontSize: '1.5rem' }}>Vitals & Health</h2>
                        <div className="report-item"><label className="report-label">Height (cm)</label><div className="input-group"><Ruler size={18} /><input value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} /></div></div>
                        <div className="report-item"><label className="report-label">Weight (kg)</label><div className="input-group"><Scale size={18} /><input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div></div>
                        <div className="report-item" style={{ gridColumn: 'span 2' }}>
                            <label className="report-label">Blood Group</label>
                            <select style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--primary-light)', fontWeight: '700' }} value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}><option>A+</option><option>B+</option><option>O+</option><option>AB+</option><option>A-</option><option>B-</option></select>
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem' }}>Medical Background</h2>
                        <div className="report-item"><label className="report-label">Past History</label><div className="input-group"><History size={18} /><input value={form.history} onChange={e => setForm({ ...form, history: e.target.value })} /></div></div>
                        <div className="report-item"><label className="report-label">Known Allergies</label><div className="input-group"><Zap size={18} /><input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} /></div></div>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                    <button className="outline" onClick={() => step > 1 && setStep(step - 1)} style={{ opacity: step === 1 ? 0 : 1 }}><ChevronLeft /> BACK</button>
                    <button className="primary" style={{ padding: '1rem 3rem' }} onClick={() => step === 3 ? submit() : setStep(step + 1)}>{step === 3 ? 'SETUP COMPLETE' : 'CONTINUE'} <ChevronRight /></button>
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
                <div><h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.04em' }}>Patient Dashboard</h1><p style={{ color: 'var(--text-muted)' }}>Welcome back! Here is your health overview.</p></div>
                <div style={{ width: '45px', height: '45px', background: 'white', borderRadius: '50%', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: '900' }}>{user.name.slice(0, 2).toUpperCase()}</div>
            </header>
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
                <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '12px' }}><User color="var(--primary)" size={28} /></div><div><h3>{user.name}</h3><p style={{ fontSize: '0.9rem', opacity: 0.6 }}>{q?.profile?.age}y | {q?.profile?.gender} | {q?.profile?.bloodGroup}</p></div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="vital-card" style={{ textAlign: 'center' }}><p style={{ fontSize: '0.7rem', opacity: 0.5 }}>WEIGHT</p><h3>{q?.profile?.weight} kg</h3></div>
                        <div className="vital-card" style={{ textAlign: 'center' }}><p style={{ fontSize: '0.7rem', opacity: 0.5 }}>HEIGHT</p><h3>{q?.profile?.height} cm</h3></div>
                    </div>
                    <div style={{ background: '#f0f9ff', padding: '1.2rem', borderRadius: '16px', textAlign: 'center', border: '1px solid #bae6fd' }}><p style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '800' }}>ESTIMATED BMI</p><h3 style={{ color: '#0369a1' }}>{q?.profile?.bmi?.toFixed(1)} (Normal)</h3></div>
                </div>
                <div className="card" style={{ gridColumn: 'span 8', borderStyle: 'dashed', background: '#f8fafc', display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={40} color="#94a3b8" /><h4 style={{ color: '#94a3b8', marginTop: '1rem' }}>Document Hub</h4><p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Drag reports here for clinical analysis</p>
                </div>
                <div className="card" style={{ gridColumn: 'span 4', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Zap color="#8b5cf6" size={18} /><h3 style={{ color: '#5b21b6' }}>AI Insights</h3></div>
                    <p style={{ color: '#6d28d9', fontSize: '0.9rem', lineHeight: '1.6' }}>Heart health looks stable based on recent activity. Keep it up!</p>
                    <button className="primary" style={{ width: '100%', marginTop: '2rem', background: '#7c3aed' }} onClick={() => setView('DISCOVERY')}>Specialists</button>
                </div>
                <div className="card" style={{ gridColumn: 'span 8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}><h3>Medical Timeline</h3><span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem' }}>VIEW ALL</span></div>
                    <div style={{ borderLeft: '2px solid #eee', marginLeft: '10px', paddingLeft: '2rem', position: 'relative' }}>
                        <div style={{ marginBottom: '1.5rem' }}><p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Today</p><h4>Ready for assessment</h4><p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>No recent records found.</p></div>
                    </div>
                </div>
            </div>
            <button className="primary pulse" style={{ position: 'fixed', bottom: '3rem', left: '50%', transform: 'translateX(-50%)', padding: '1.2rem 3rem', borderRadius: '50px', zIndex: 2000 }} onClick={() => setView('INTAKE')}>START AI TRIAGE</button>
        </div>
    );
};

const DoctorDashboard = ({ user, onStartCall }) => {
    const [q, setQ] = useState([]);
    const fetchQ = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetchQ(); socket.on('queue_updated', fetchQ); return () => socket.off('queue_updated'); }, []);
    return (
        <div className="container">
            <h1 className="text-gradient">Doctor Console</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '3rem' }}>
                {q.map(x => (
                    <div key={x.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
                        <div><div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.5rem' }}><span className="badge emergency-bg">{x.severity}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{x.gender}, {x.age}y</span></div><h3>{x.name}</h3></div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="primary" onClick={() => {
                                const peer = new Peer();
                                peer.on('open', (pid) => {
                                    axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'START_CONSULTATION', peerId: pid });
                                    onStartCall(x.callRoomId, x.name, null);
                                });
                            }}>CONSULT &gt;</button>
                        </div>
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

    if (!token) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoginPortal /></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            <nav className="glass-nav" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => setView('DASHBOARD')}><Activity color="var(--primary)" size={28} /><h2>SAHAY</h2></div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}><div style={{ fontSize: '0.9rem', fontWeight: '800', background: 'var(--primary-light)', padding: '0.4rem 1rem', borderRadius: '8px', color: 'var(--primary)' }}>{user.name}</div><button onClick={logout} style={{ color: '#ef4444', padding: '0.4rem' }}><LogOut size={20} /></button></div>
            </nav>
            <main className="container" style={{ paddingBottom: '8rem' }}>
                {user.role === 'PATIENT' ? (
                    <>
                        {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, dpid) => setActiveCall({ rid, name: "Doctor", dpid })} />}
                        {view === 'INTAKE' && <ConversationalIntake user={user} onComplete={() => setView('DASHBOARD')} />}
                        {view === 'DISCOVERY' && <DoctorDiscovery user={user} onBack={() => setView('DASHBOARD')} />}
                    </>
                ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}
            </main>
            {activeCall && <VideoCallModal onEnd={() => setActiveCall(null)} />}
        </div>
    );
};

const VideoCallModal = ({ onEnd }) => (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: 'white' }}>Video Session Active</h1>
        <button onClick={onEnd} className="primary" style={{ position: 'absolute', bottom: '3rem', background: '#ef4444' }}>END CALL</button>
    </div>
);

const LoginPortal = () => {
    const { login } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div className="card" style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <Activity color="var(--primary)" size={36} style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '2.5rem' }} className="text-gradient">SAHAY</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                <div className="input-group"><User size={18} /><input placeholder="Full Name" value={n} onChange={e => setN(e.target.value)} /></div>
                <div className="input-group"><PhoneCall size={18} /><input placeholder="Phone" value={p} onChange={e => setP(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px' }}>
                    <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>Patient</button>
                    <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Doctor</button>
                </div>
                <button className="primary" onClick={() => login(p, n, r)} style={{ padding: '1rem' }}>LOG IN</button>
            </div>
        </div>
    );
};

const ConversationalIntake = ({ user, onComplete }) => {
    const [msgs, setMsgs] = useState([{ b: true, t: `Hi ${user.name}, what symptoms are you feeling?` }]);
    const [inp, setInp] = useState('');
    const send = async () => {
        if (!inp) return;
        setMsgs([...msgs, { b: false, t: inp }]); setInp('');
        await axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: { age: 25, gender: 'Male' }, symptom: inp });
        setTimeout(() => onComplete(), 1000);
    };
    return (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ height: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                {msgs.map((m, i) => <div key={i} className={`badge ${m.b ? 'moderate-bg' : 'primary'}`} style={{ alignSelf: m.b ? 'flex-start' : 'flex-end', textTransform: 'none' }}>{m.t}</div>)}
            </div>
            <div className="input-group" style={{ marginTop: '1rem' }}><input placeholder="Type symptom..." value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} /><button className="primary" onClick={send}><Send size={18} /></button></div>
        </div>
    );
};

const DoctorDiscovery = ({ user, onBack }) => {
    const [docs, setDocs] = useState([]);
    useEffect(() => { axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data)); }, []);
    return (
        <div className="animate-up">
            <h2 style={{ marginBottom: '2rem' }}>Specialists</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {docs.map(d => (
                    <div className="card" key={d.id}><h3>{d.doctorName}</h3><p style={{ color: 'var(--primary)', fontWeight: '800' }}>{d.specialty}</p><button className="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => axios.post(`${API_BASE}/book/doctor`, { userId: user.id, doctorId: d.id }).then(onBack)}>BOOK VISIT</button></div>
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
