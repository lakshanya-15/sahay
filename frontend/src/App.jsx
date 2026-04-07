import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import {
    Activity, Stethoscope, Clock, AlertCircle, CheckCircle, Video, PhoneCall, ChevronRight,
    Send, Languages, ArrowRightCircle, LogOut, ChevronLeft, Heart, Navigation, MapPin,
    Filter, Mic, Star, Info, Bell, ShieldAlert, User, Scale, Ruler, Droplet,
    Thermometer, Wind, Zap, Share2, ClipboardList, TrendingUp, X, MicOff, VideoOff, PhoneOff,
    FileText, Plus, BellRing, Database, UserCheck, HeartPulse, History, AlertTriangle, UploadCloud, Monitor
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

// --- Multi-Step Profile Setup ---

const SetupProfile = ({ userId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ age: '', gender: 'Male', contact: '', address: '', height: '', weight: '', bloodGroup: 'B+', history: '' });

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
                            {s === 1 ? <User size={20} /> : s === 2 ? <Heart size={20} /> : <ShieldAlert size={20} />}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{s === 1 ? 'Personal Details' : s === 2 ? 'Vitals & Health' : 'Medical Background'}</span>
                    </div>
                ))}
            </div>

            <div className="card animate-up">
                {step === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <h2 style={{ gridColumn: 'span 2', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #eff6ff', paddingBottom: '1rem' }}>Personal Details</h2>
                        <div className="report-item">
                            <label className="report-label">Full Name</label>
                            <div className="input-group"><User size={18} /><input placeholder="e.g. John Doe" defaultValue={form.name} /></div>
                        </div>
                        <div className="report-item">
                            <label className="report-label">Age</label>
                            <div className="input-group"><Clock size={18} /><input placeholder="Years" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                        </div>
                        <div className="report-item">
                            <label className="report-label">Gender</label>
                            <select style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--primary-light)', fontWeight: '700' }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                        </div>
                        <div className="report-item">
                            <label className="report-label">Contact Number</label>
                            <div className="input-group"><PhoneCall size={18} /><input placeholder="+1 234 567 890" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
                        </div>
                        <div className="report-item" style={{ gridColumn: 'span 2' }}>
                            <label className="report-label">Permanent Address</label>
                            <textarea placeholder="Full address..." style={{ width: '100%', minHeight: '100px', border: 'none', background: 'var(--primary-light)', borderRadius: '16px', padding: '1rem', outline: 'none' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <h2 style={{ gridColumn: 'span 2', fontSize: '1.5rem', marginBottom: '1rem' }}>Vitals & Health</h2>
                        <ReportInput label="Height (cm)" icon={Ruler} value={form.height} onChange={v => setForm({ ...form, height: v })} />
                        <ReportInput label="Weight (kg)" icon={Scale} value={form.weight} onChange={v => setForm({ ...form, weight: v })} />
                        <div className="report-item" style={{ gridColumn: 'span 2' }}>
                            <label className="report-label">Blood Group</label>
                            <select style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--primary-light)', fontWeight: '700' }} value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                                <option>A+</option><option>B+</option><option>O+</option><option>AB+</option><option>A-</option><option>B-</option>
                            </select>
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Medical Background</h2>
                        <ReportInput label="Past Diseases / History" icon={History} value={form.history} onChange={v => setForm({ ...form, history: v })} />
                        <ReportInput label="Known Allergies" icon={Zap} value={form.allergies} onChange={v => setForm({ ...form, allergies: v })} />
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                    <button className="outline" onClick={() => step > 1 && setStep(step - 1)} style={{ opacity: step === 1 ? 0 : 1 }}><ChevronLeft /> BACK</button>
                    <button className="primary" style={{ padding: '1rem 3rem' }} onClick={() => step === 3 ? submit() : setStep(step + 1)}>
                        {step === 3 ? 'COMPLETE SETUP' : 'CONTINUE'} <ChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReportInput = ({ label, icon: Icon, value, onChange }) => (
    <div className="report-item">
        <label className="report-label">{label}</label>
        <div className="input-group"><Icon size={18} /><input placeholder="Enter details..." value={value} onChange={e => onChange(e.target.value)} /></div>
    </div>
);

// --- High Fidelity Patient Dashboard ---

const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { data: q } = useQueueSync(user.id);

    if (q?.profileMissing) return <SetupProfile userId={user.id} onComplete={() => window.location.reload()} />;

    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.04em' }}>Patient Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Welcome back! Here is your centralized health overview.</p>
                </div>
                <div style={{ width: '50px', height: '50px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: '900' }}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                </div>
            </header>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
                <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px' }}><User color="var(--primary)" size={32} /></div>
                        <div>
                            <h3>{user.name}</h3>
                            <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{q?.profile?.age} years | {q?.profile?.gender} | {q?.profile?.bloodGroup}</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', textAlign: 'center', border: '1px solid #eef2ff' }}>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>WEIGHT</p>
                            <h3 style={{ fontSize: '1.25rem' }}>{q?.profile?.weight} kg</h3>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', textAlign: 'center', border: '1px solid #eef2ff' }}>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>HEIGHT</p>
                            <h3 style={{ fontSize: '1.25rem' }}>{q?.profile?.height} cm</h3>
                        </div>
                    </div>
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1.5rem', borderRadius: '20px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '800', marginBottom: '0.5rem' }}>ESTIMATED BMI</p>
                        <h3 style={{ fontSize: '1.75rem', color: '#0369a1' }}>{q?.profile?.bmi?.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>(Normal)</span></h3>
                    </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 8', borderStyle: 'dashed', borderColor: '#cbd5e1', background: '#f8fafc', position: 'relative' }}>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ClipboardList color="var(--text-muted)" size={20} />
                        <h3>Document Hub</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', textAlign: 'center' }}>
                        <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
                        <h4 style={{ color: 'var(--text-muted)' }}>Upload Medical Documents</h4>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '300px', marginTop: '0.5rem' }}>Drag & drop your prescriptions, lab reports, or X-Rays. Our AI will automatically analyze them.</p>
                    </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 4', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Zap color="#8b5cf6" size={20} />
                        <h3 style={{ color: '#5b21b6' }}>AI Health Insights</h3>
                    </div>
                    <p style={{ color: '#6d28d9', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
                        Based on your profile, your cholesterol levels are slightly elevated. We recommend scheduling a consultation with a Cardiologist.
                    </p>
                    <button className="primary" style={{ width: '100%', background: '#7c3aed' }} onClick={() => setView('DISCOVERY')}>Find a Specialist</button>
                </div>

                <div className="card" style={{ gridColumn: 'span 8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><History color="var(--text-muted)" size={20} /> <h3>Medical Timeline</h3></div>
                        <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>VIEW ALL</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '7.5px', top: '10px', bottom: '10px', width: '2px', background: '#e2e8f0' }}></div>
                        {[
                            { date: 'Oct 12, 2025', title: 'Annual General Checkup', doc: 'Dr. Sarah Jenkins (GP)', desc: 'All vitals normal. Prescribed multi-vitamins.' },
                            { date: 'Jul 05, 2025', title: 'Dermatology Consultation', doc: 'Dr. Rahul Bose', desc: 'Treated mild eczema on left arm. Prescribed Hydrocortisone.' }
                        ].map((ev, i) => (
                            <div key={i} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                                <div style={{ minWidth: '15px', height: '15px', borderRadius: '50%', background: 'white', border: '3px solid var(--primary)', marginTop: '5px' }}></div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.25rem' }}><Clock size={12} /> {ev.date}</p>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{ev.title}</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{ev.desc}</p>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>{ev.doc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <button className="primary pulse" style={{ position: 'fixed', bottom: '4rem', left: '50%', transform: 'translateX(-50%)', padding: '1.5rem 3rem', borderRadius: '50px', fontSize: '1.2rem', boxShadow: '0 20px 40px rgba(37,99,235,0.4)', zIndex: 1000 }} onClick={() => setView('INTAKE')}>
                <ShieldAlert size={24} /> START AI TRIAGE ASSESSMENT
            </button>
        </div>
    );
};

// --- Standard Doctor Dashboard ---

const DoctorDashboard = ({ user, onStartCall }) => {
    const [q, setQ] = useState([]);
    const fetchQ = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetchQ(); socket.on('queue_updated', fetchQ); return () => socket.off('queue_updated'); }, []);
    return (
        <div className="container">
            <h1 className="text-gradient">Doctor Console</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '3rem' }}>
                {q.map(x => (
                    <div key={x.id} className="card" style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}><span className="badge emergency-bg">{x.severity}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{x.gender}, {x.age} years</span></div>
                            <h3>{x.name}</h3>
                            <p style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', fontStyle: 'italic' }}>{JSON.parse(x.reasoning || "{}").summary}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button className="primary" onClick={() => {
                                const peer = new Peer();
                                peer.on('open', (pid) => {
                                    axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'START_CONSULTATION', peerId: pid });
                                    onStartCall(x.callRoomId, x.name, null);
                                });
                            }}>CONSULT ></button>
                            <button className="outline" onClick={() => axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'COMPLETE' }).then(fetchQ)}>COMPLETE</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- UI Logic Helpers ---

const App = () => {
    const { user, token, logout } = useContext(AuthContext);
    const [view, setView] = useState('DASHBOARD');
    const [activeCall, setActiveCall] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!token) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoginPortal /></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            <nav className="glass-nav" style={{ padding: '1rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 2000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setView('DASHBOARD')}><Activity color="var(--primary)" size={32} /><h2>SAHAY</h2></div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', background: 'var(--primary-light)', padding: '0.5rem 1.5rem', borderRadius: '12px', color: 'var(--primary)' }}>{user.name}</div>
                    <button onClick={logout} style={{ color: '#ef4444' }}><LogOut size={22} /></button>
                </div>
            </nav>

            <main className="container" style={{ paddingBottom: '10rem' }}>
                {user.role === 'PATIENT' ? (
                    <>
                        {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, dpid) => setActiveCall({ rid, name: "Doctor", dpid })} />}
                        {view === 'INTAKE' && <ConversationalIntake user={user} onComplete={() => setView('DASHBOARD')} />}
                        {view === 'DISCOVERY' && <DoctorDiscovery user={user} onBack={() => setView('DASHBOARD')} />}
                    </>
                ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}
            </main>

            {activeCall && <VideoCallModal roomId={activeCall.rid} remoteName={activeCall.name} doctorPeerId={activeCall.dpid} onEnd={() => setActiveCall(null)} />}
        </div>
    );
};

// --- FORM HELPERS (Login, Intake, etc) ---

const VideoCallModal = ({ onEnd }) => (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: 'white' }}>Video Call Active Point-to-Point...</h1>
        <button onClick={onEnd} className="primary" style={{ position: 'absolute', bottom: '4rem', background: '#ef4444' }}>DISCONNECT</button>
    </div>
);

const LoginPortal = () => {
    const { login } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div className="card" style={{ width: '400px', textAlign: 'center' }}>
            <Activity color="var(--primary)" size={40} style={{ marginBottom: '1rem' }} />
            <h1 className="text-gradient">SAHAY</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                <div className="input-group"><User size={18} /><input placeholder="Full Name" value={n} onChange={e => setN(e.target.value)} /></div>
                <div className="input-group"><PhoneCall size={18} /><input placeholder="Phone" value={p} onChange={e => setP(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1 }} onClick={() => setR('PATIENT')}>Patient</button>
                    <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1 }} onClick={() => setR('DOCTOR')}>Doctor</button>
                </div>
                <button className="primary" onClick={() => login(p, n, r)}>LOGIN</button>
            </div>
        </div>
    );
};

const ConversationalIntake = ({ user, onComplete }) => {
    const onSend = async (val) => {
        const res = await axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: { age: 32, gender: 'Male' }, symptom: val });
        onComplete();
    };
    return (
        <div className="card">
            <h2>AI Triage</h2>
            <p>Describe symptoms...</p>
            <input onKeyPress={e => e.key === 'Enter' && onSend(e.target.value)} style={{ width: '100%', padding: '1rem', marginTop: '1rem' }} />
        </div>
    );
};

const DoctorDiscovery = ({ user, onBack }) => {
    const [docs, setDocs] = useState([]);
    useEffect(() => { axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data)); }, []);
    return (
        <div>
            <button className="outline" onClick={onBack}><ChevronLeft /> Back</button>
            <h1 style={{ marginTop: '2rem' }}>Assign Specialist</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '2rem' }}>
                {docs.map(d => (
                    <div className="card" key={d.id}>
                        <h3>{d.doctorName}</h3><p>{d.specialty}</p>
                        <button className="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => axios.post(`${API_BASE}/book/doctor`, { userId: user.id, doctorId: d.id }).then(onBack)}>ASSIGN</button>
                    </div>
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
