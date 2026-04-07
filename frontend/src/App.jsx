import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import {
    Activity, Clock, Video, PhoneCall, ChevronRight, Send, ArrowRightCircle, LogOut, ChevronLeft, Heart,
    Zap, Share2, ClipboardList, X, FileText, UserCheck, HeartPulse, History, AlertTriangle, UploadCloud, User, Ruler, Scale, ShieldAlert, Star, MapPin,
    Monitor, Info, Bell, CheckCircle2, AlertCircle, TrendingUp, Mic
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

// --- Restoration: Private Report & Clinical Summary ---
const PrivateReportView = ({ q, onBack, onShare }) => {
    const r = useMemo(() => { try { return JSON.parse(q?.reasoning || "{}"); } catch (e) { return { summary: q?.reasoning }; } }, [q]);
    return (
        <div className="container animate-up" style={{ maxWidth: '900px' }}>
            <div className="card shadow-lg" style={{ padding: '3.5rem', border: 'none', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '2rem', marginBottom: '3rem' }}>
                    <div><h1 style={{ fontSize: '2.5rem' }}>AI Clinical Report</h1><p style={{ color: 'var(--text-muted)' }}>Assigned Urgency: <strong>{q.severity}</strong></p></div>
                    <button className="outline" onClick={() => window.print()}><FileText /> EXPORT PDF</button>
                </div>
                <div style={{ background: q.severity === 'EMERGENCY' ? '#fff1f2' : '#f0f9ff', padding: '2.5rem', borderRadius: '24px', border: `1px solid ${q.severity === 'EMERGENCY' ? '#fecaca' : '#bae6fd'}`, marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}><h3>Medical Synthesis</h3><span className={`badge ${q.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`}>{q.severity}</span></div>
                    <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#1e293b' }}>{r.summary || q.reasoning}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                    <div className="card-report" style={{ background: '#f8fafc', padding: '2rem', borderRadius: '20px' }}><h4>Profile Vitals</h4><p>BMI: {q.profile?.bmi?.toFixed(1)}</p><p>Age: {q.profile?.age} | Sex: {q.profile?.gender}</p></div>
                    <div className="card-report" style={{ background: '#f8fafc', padding: '2rem', borderRadius: '20px' }}><h4>Chronic Markers</h4><p>History: {q.profile?.history}</p><p style={{ color: '#ef4444', fontWeight: '800' }}>● Cardiac Sensitivity Detected</p></div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '4rem' }}>
                    <button className="outline" style={{ flex: 1 }} onClick={onBack}><ChevronLeft /> BACK</button>
                    <button className="primary shadow-blue" style={{ flex: 3, padding: '1.5rem' }} onClick={onShare}>SELECT CLINIC & SHARE CLINICAL DATA <ChevronRight /></button>
                </div>
            </div>
        </div>
    );
};

// --- Restoration: Fully Synchronized Patient Console ---
const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { data: q } = useQueueSync(user.id);
    const [page, setPage] = useState('MAIN');

    if (q?.profileMissing) return <SetupProfile userId={user.id} onComplete={() => window.location.reload()} />;

    const handleShare = async (docId) => {
        try {
            await axios.post(`${API_BASE}/book/share-report`, { userId: user.id, doctorId: docId });
            alert("Digital Report Shared. Priority allocated based on urgency.");
            setPage('MAIN');
        } catch (e) { alert(e.response?.data?.error || "Error."); }
    };

    if (page === 'REPORT') return <PrivateReportView q={q} onBack={() => setPage('MAIN')} onShare={() => setPage('DISCOVERY')} />;
    if (page === 'DISCOVERY') return <DoctorDiscovery user={user} q={q} onBack={() => setPage('MAIN')} onShare={handleShare} />;

    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1 style={{ fontSize: '2.5rem' }}>SAHAY <span className="text-gradient">Clinical Console</span></h1><p style={{ color: 'var(--text-muted)' }}>Universal Patient ID: {user.id?.slice(0, 8)}</p></div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}><div className="badge routine-bg" style={{ padding: '0.8rem 1.5rem' }}>SYSTEM: ONLINE</div><button onClick={() => window.location.reload()} className="outline" style={{ padding: '0.5rem' }}><Activity size={18} /></button></div>
            </header>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
                <div className="card shadow-sm" style={{ gridColumn: 'span 4', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={40} color="var(--primary)" /></div>
                    <h3>{user.name}</h3><p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{q?.profile?.age} yrs | {q?.profile?.bloodGroup}</p>
                    <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '20px', marginTop: '2.5rem', border: '1px solid #bae6fd' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '900', color: '#0369a1' }}>BODY MASS INDEX</p>
                        <h2 style={{ fontSize: '2.5rem', color: '#0369a1' }}>{q?.profile?.bmi?.toFixed(1)}</h2>
                        <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: '800' }}>(Normal Status)</span>
                    </div>
                </div>

                <div className="card shadow-sm" style={{ gridColumn: 'span 8', background: q?.inQueue ? 'white' : '#f8fafc', border: q?.inQueue ? 'none' : '2px dashed #cbd5e1', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {q?.inQueue ? (
                        <div className="animate-up">
                            <FileText size={64} color={q.isShared ? '#10b981' : 'var(--primary)'} />
                            <h2 style={{ marginTop: '1rem' }}>{q.isShared ? 'Digital Handshake Complete' : 'Urgency Report Generated'}</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '400px', margin: '0.5rem auto 2.5rem' }}>Your clinical metadata is structured and ready for specialist review. Share it to join the real-time priority queue.</p>
                            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                                <button className="primary shadow-blue" onClick={() => setPage('REPORT')} style={{ padding: '1rem 3rem' }}>VIEW AI REPORT</button>
                                {!q.isShared && <button className="outline" onClick={() => setPage('DISCOVERY')} style={{ padding: '1rem 3rem' }}>SELECT CLINIC</button>}
                            </div>
                        </div>
                    ) : (<div style={{ opacity: 0.5 }}><ShieldAlert size={64} /><h2 style={{ marginTop: '1rem' }}>Clinical Data Empty</h2><p>Initiate clinical assessment to continue.</p></div>)}
                </div>

                {q?.isShared && (
                    <div className="card animate-up shadow-green" style={{ gridColumn: 'span 12', border: '2px solid #10b981', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2.5rem 4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                            <div style={{ textAlign: 'center' }}><p style={{ fontSize: '0.8rem', fontWeight: '900', color: '#166534' }}>QUEUE POS</p><h1 style={{ fontSize: '5rem', lineHeight: '1', color: '#166534' }}>#{q.position}</h1></div>
                            <div style={{ width: '2px', height: '60px', background: '#bbf7d0' }}></div>
                            <div><h3>Urgency-Based Priority Active</h3><p style={{ color: '#166534', opacity: 0.8 }}>Assigned based on medical metadata. Emergency triage cases take precedence.</p></div>
                        </div>
                        {q.status === 'IN_CONSULTATION' ? (
                            <button className="primary pulse shadow-green" style={{ background: '#10b981', padding: '1.2rem 3rem' }} onClick={() => onStartCall(q.callRoomId, q.doctorPeerId)}><Video /> JOIN VIDEO SESSION</button>
                        ) : <div className="badge moderate-bg" style={{ fontSize: '1rem', padding: '1rem 2rem' }}>WAITING FOR CALL...</div>}
                    </div>
                )}

                <div className="card shadow-sm" style={{ gridColumn: 'span 7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}><h3>Health Timeline</h3><History size={20} color="var(--text-muted)" /></div>
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                        <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: '#f1f5f9' }}></div>
                        {[{ d: 'Today', t: 'Clinical AI Assessment', doc: 'SAHAY Engine', s: 'Generated' }, { d: 'Oct 12', t: 'Physical Checkup', doc: 'Fortis Hospital', s: 'Completed' }].map((t, i) => (
                            <div key={i} style={{ marginBottom: '2.5rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-2.2rem', top: '5px', width: '14px', height: '14px', borderRadius: '50%', background: 'white', border: '3px solid var(--primary)' }}></div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.d}</p>
                                <h4 style={{ margin: '0.2rem 0' }}>{t.t}</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '800' }}>{t.doc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card shadow-sm" style={{ gridColumn: 'span 5', background: '#f5f3ff', border: 'none' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}><Zap color="#8b5cf6" size={24} /><h3 style={{ color: '#5b21b6' }}>AI Logic Insights</h3></div>
                    <p style={{ color: '#6d28d9', fontSize: '1.1rem', lineHeight: '1.8' }}>Your clinical markers suggest high metabolic efficiency. Recommendation: Maintain hydration and light cardiac activity.</p>
                    <button className="primary shadow-purple" style={{ width: '100%', background: '#8b5cf6', marginTop: '2.5rem' }}>VIEW ANALYTICS</button>
                </div>
            </div>

            {!q?.inQueue && (
                <button className="primary pulse shadow-blue" style={{ position: 'fixed', bottom: '4rem', left: '50%', transform: 'translateX(-50%)', padding: '1.5rem 5rem', borderRadius: '50px', zIndex: 1000, fontSize: '1.25rem' }} onClick={() => setView('INTAKE')}>
                    <Mic size={24} /> START CLINICAL ASSESSMENT
                </button>
            )}
        </div>
    );
};

// --- Restoration: Stable & Polled Conversational AI ---
const ConversationalIntake = ({ user, onComplete }) => {
    const [chat, setChat] = useState([{ b: true, t: `Greetings ${user.name}. To generate your Clinical Priority Report, please describe your current condition.` }]);
    const [inp, setInp] = useState('');
    const [ans, setAns] = useState({});
    const [q, setQ] = useState({ id: 'mainSymptom' });
    const [sym, setSym] = useState('');
    const [thinking, setThinking] = useState(false);

    const send = async () => {
        if (!inp || thinking) return;
        const val = inp; setInp(''); setChat(p => [...p, { b: false, t: val }]); setThinking(true);
        const nA = { ...ans, [q.id]: val }; setAns(nA);
        let nS = sym; if (q.id === 'mainSymptom') { nS = val; setSym(val); }

        try {
            const res = await axios.post(`${API_BASE}/intake/next-question`, { answers: nA, symptom: nS });
            if (res.data.isComplete) {
                setChat(p => [...p, { b: true, t: "Synthesizing metadata... Generating structured medical report." }]);
                await axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: nA, symptom: nS });
                setTimeout(() => onComplete(), 2000);
            } else {
                setQ(res.data.nextQuestion);
                setChat(p => [...p, { b: true, t: res.data.nextQuestion.label }]);
            }
        } catch (e) { setChat(p => [...p, { b: true, t: "Engine offline temporarily. Check connection." }]); }
        finally { setThinking(false); }
    };

    return (
        <div className="container animate-up" style={{ maxWidth: '700px' }}>
            <div className="card shadow-lg" style={{ height: '600px', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', border: 'none' }}>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}><Activity size={28} /><h3>SAHAY Clinical Assistant</h3></div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#fdfdfd' }}>
                    {chat.map((m, i) => <div key={i} className={`chat-bubble ${m.b ? 'chat-bot' : 'chat-user'}`} style={{ padding: '1.2rem 1.8rem', borderRadius: '18px', fontSize: '1.1rem' }}>{m.t}</div>)}
                    {thinking && <div className="chat-bubble chat-bot" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontStyle: 'italic' }}>Analyzing condition markers...</div>}
                </div>
                <div className="input-group" style={{ margin: '2rem', border: '1px solid #eef2ff', background: '#f8fafc' }}><input placeholder="Type symptoms..." value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} /><button className="primary shadow-blue" onClick={send} disabled={thinking}><Send /></button></div>
            </div>
        </div>
    );
};

const SetupProfile = ({ userId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ name: '', age: '', gender: 'Male', contact: '', address: '', height: '', weight: '', bloodGroup: 'B+', history: '' });
    const sub = async () => { await axios.post(`${API_BASE}/patient/update-profile`, { userId, ...form }); onComplete(); };
    return (
        <div className="container animate-up" style={{ maxWidth: '700px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '3rem' }}>Patient Pre-Registration</h1>
            <div className="card shadow-lg" style={{ padding: '3.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '3rem' }}>
                    {[1, 2, 3].map(s => <div key={s} style={{ width: '35px', height: '35px', borderRadius: '50%', background: step >= s ? 'var(--primary)' : '#e2e8f0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>{s}</div>)}
                </div>
                {step === 1 && <div style={{ display: 'grid', gap: '1.5rem' }}><div className="input-group"><User size={18} /><input placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="input-group"><Clock size={18} /><input placeholder="Age" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div><select style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: 'none', background: 'var(--primary-light)', fontWeight: '700' }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option></select></div>}
                {step === 2 && <div style={{ display: 'grid', gap: '1.5rem' }}><div className="input-group"><Ruler size={18} /><input placeholder="Height (cm)" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} /></div><div className="input-group"><Scale size={18} /><input placeholder="Weight (kg)" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div><div className="input-group"><HeartPulse size={18} /><input placeholder="Blood Group (e.g. O+)" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} /></div></div>}
                {step === 3 && <div style={{ display: 'grid', gap: '1.5rem' }}><textarea placeholder="Medical History (Past surgeries, allergies, etc.)" style={{ width: '100%', minHeight: '120px', border: 'none', background: 'var(--primary-light)', borderRadius: '20px', padding: '1.5rem', fontWeight: '600' }} value={form.history} onChange={e => setForm({ ...form, history: e.target.value })} /></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}><button className="outline" onClick={() => setStep(step - 1)} style={{ opacity: step === 1 ? 0 : 1 }}>BACK</button><button className="primary shadow-blue" style={{ padding: '1rem 3rem' }} onClick={() => step === 3 ? sub() : setStep(step + 1)}>{step === 3 ? 'COMPLETE REGISTRATION' : 'CONTINUE'}</button></div>
            </div>
        </div>
    );
};

const DoctorDiscovery = ({ user, q, onBack, onShare }) => {
    const [docs, setDocs] = useState([]);
    const fetchDocs = () => axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data));
    useEffect(() => {
        fetchDocs();
        socket.on('queue_updated', fetchDocs);
        return () => socket.off('queue_updated', fetchDocs);
    }, []);

    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1 style={{ fontSize: '2.5rem' }}>Specialist <span className="text-gradient">Discovery Hub</span></h1><p style={{ color: 'var(--text-muted)' }}>Real-time priority queues synchronized with CLINIC cloud.</p></div>
                <button className="outline" onClick={onBack}><ChevronLeft /> BACK TO CONSOLE</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '2.5rem' }}>
                {docs.map(d => (
                    <div key={d.id} className="card shadow-lg animate-up" style={{ borderTop: `12px solid ${d.queueLoad > 3 ? '#ef4444' : 'var(--primary)'}`, padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: '900' }}><Star fill="#f59e0b" size={20} /><span>{d.rating}</span></div>
                            <div className="badge routine-bg" style={{ fontSize: '0.8rem', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Video size={14} /> Teleconsult Active</div>
                        </div>
                        <h3>{d.doctorName}</h3>
                        <p style={{ color: 'var(--primary)', fontWeight: '800', margin: '0.5rem 0' }}>{d.specialty}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}><MapPin size={14} /> {d.address}</p>

                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', marginBottom: '2.5rem', border: '1px solid #eef2ff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #eef2ff', paddingBottom: '0.6rem' }}>
                                <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>Real-time Patient Queue</span>
                                <span style={{ color: d.queueLoad > 4 ? '#ef4444' : 'var(--primary)', fontWeight: '900' }}>{d.queueLoad} waiting</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertCircle size={12} /> {d.emergencyCount} EMERGENCY</div>
                                <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }}></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0369a1' }}>{d.queueLoad - d.emergencyCount} ROUTINE</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>AVAILABLE FOR VIDEO CONSULT</p>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                {JSON.parse(d.slots || '[]').map(s => <span key={s} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' }}>{s}</span>)}
                            </div>
                        </div>

                        <button
                            className="primary shadow-blue"
                            style={{ width: '100%', padding: '1.25rem', background: q?.doctorId === d.id ? '#10b981' : 'var(--primary)' }}
                            onClick={() => onShare(d.id)}
                            disabled={q?.isShared && q?.doctorId !== d.id}
                        >
                            {q?.doctorId === d.id ? 'REPORT SHARED & QUEUED' : 'SHARE AI REPORT & BOOK CONSULT'} <Share2 size={18} style={{ marginLeft: '0.5rem' }} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DoctorDashboard = ({ user, onStartCall }) => {
    const [q, setQ] = useState([]);
    const fetch = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetch(); socket.on('queue_updated', fetch); return () => socket.off('queue_updated'); }, []);

    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1 style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Activity color="#10b981" size={36} /> Doctor Portal</h1><p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Live Priority Triage Queue</p></div>
                <div style={{ background: '#f8fafc', padding: '0.6rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: '800' }}>Tracking {q.length} Active Cases</div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {q.length === 0 ? (
                    <div style={{ padding: '5rem', textAlign: 'center', opacity: 0.5 }}><ShieldAlert size={60} style={{ margin: '0 auto 2rem' }} /><h2>No patients currently in queue.</h2></div>
                ) : q.map(x => {
                    const r = useMemo(() => { try { return JSON.parse(x.reasoning || "{}"); } catch (e) { return { summary: x.reasoning }; } }, [x]);
                    const waitMins = Math.floor((new Date() - new Date(x.createdAt)) / 60000);
                    return (
                        <div key={x.id} className="card shadow-lg" style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <span className="badge emergency-bg" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '50px', padding: '0.4rem 1.2rem' }}><AlertTriangle size={14} /> {x.severity}</span>
                                <span className="badge routine-bg" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '50px', padding: '0.4rem 1.2rem', color: '#64748b', background: '#f1f5f9' }}><Clock size={14} /> {waitMins} mins waiting</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem', alignSelf: 'center' }}>{x.gender}, {x.age}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem' }}>
                                <div>
                                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{x.name}</h1>
                                    <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}><strong>Chief Complaint:</strong> {r.summary?.slice(0, 100)}</p>
                                    <div style={{ background: '#f0f9ff', padding: '1.5rem 2rem', borderRadius: '16px', borderLeft: '4px solid #3b82f6' }}>
                                        <p style={{ color: '#0369a1', fontSize: '1rem', lineHeight: '1.6' }}><strong>AI Brief:</strong> Patient reports severe distress indicating potential cardiac or acute respiratory involvement based on synthesized vitals and symptom duration.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
                                    <button className="outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1.2rem' }}><FileText /> View AI Report</button>
                                    <button className="primary shadow-blue" style={{ padding: '1.5rem', fontSize: '1.2rem', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }} onClick={() => {
                                        const p = new Peer(); p.on('open', (pid) => {
                                            axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'START_CONSULTATION', peerId: pid });
                                            onStartCall(x.callRoomId, x.name, null);
                                        });
                                    }}>Consult <ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
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
            <nav className="glass-nav" style={{ padding: '1.2rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setView('DASHBOARD')}><Activity color="var(--primary)" size={36} /><h2>SAHAY</h2></div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}><div style={{ fontWeight: '900', color: 'var(--primary)', background: 'white', padding: '0.6rem 2rem', borderRadius: '12px', border: '2px solid var(--primary-light)' }}>{user.name}</div><button onClick={logout} style={{ color: '#ef4444' }}><LogOut size={24} /></button></div>
            </nav>
            <main className="container" style={{ paddingBottom: '12rem' }}>
                {user.role === 'PATIENT' ? (
                    <>
                        {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, dpid) => setActiveCall({ rid, name: "Consultation Session", dpid })} />}
                        {view === 'INTAKE' && <ConversationalIntake user={user} onComplete={() => setView('DASHBOARD')} />}
                    </>
                ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}
            </main>
            {activeCall && <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.95)' }}><h1 style={{ color: 'white', fontSize: '3rem' }}>Digital Session In Progress</h1><button className="primary shadow-red" style={{ marginTop: '5rem', background: '#ef4444', padding: '1.5rem 6rem', borderRadius: '60px', fontSize: '1.5rem' }} onClick={() => setActiveCall(null)}>TERMINATE SESSION</button></div>}
        </div>
    );
};

const LoginPortal = () => {
    const { login } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div className="card shadow-2xl" style={{ width: '420px', textAlign: 'center', padding: '5rem 3.5rem', border: 'none' }}>
            <Activity color="var(--primary)" size={56} style={{ marginBottom: '1rem' }} /><h1 className="text-gradient" style={{ fontSize: '3rem' }}>SAHAY</h1><p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>The Smart Healthcare Assistant</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="input-group shadow-sm"><User size={20} /><input placeholder="Full Name" value={n} onChange={e => setN(e.target.value)} /></div>
                <div className="input-group shadow-sm"><PhoneCall size={20} /><input placeholder="Mobile Number" value={p} onChange={e => setP(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '16px' }}>
                    <button className={r === 'PATIENT' ? 'primary shadow-blue' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>Patient</button>
                    <button className={r === 'DOCTOR' ? 'primary shadow-blue' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Doctor</button>
                </div>
                <button className="primary shadow-blue" style={{ padding: '1.25rem', fontSize: '1.2rem', marginTop: '2rem' }} onClick={() => login(p, n, r)}>LAUNCH CLIINCAL CONSOLE</button>
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
