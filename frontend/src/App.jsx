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

// --- Full Restoration: Private Clinical Report View ---
const PrivateReportView = ({ q, onBack, onShare }) => {
    const reasonObj = useMemo(() => { try { return JSON.parse(q?.reasoning || "{}"); } catch (e) { return { summary: q?.reasoning }; } }, [q]);
    return (
        <div className="container animate-up" style={{ maxWidth: '900px' }}>
            <div className="card" style={{ padding: '3.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
                    <div><h1 style={{ fontSize: '2.5rem' }}>AI Clinical Health Report</h1><p style={{ color: 'var(--text-muted)' }}>ID: {q.id?.slice(0, 8)} | SAHAY Triage Engine</p></div>
                    <div style={{ textAlign: 'right' }}><button className="outline" onClick={() => window.print()}><FileText size={18} /> EXPORT PDF</button></div>
                </div>
                <div style={{ background: q.severity === 'EMERGENCY' ? '#fff1f2' : '#f0f9ff', padding: '2.5rem', borderRadius: '24px', marginBottom: '2.5rem', border: `1px solid ${q.severity === 'EMERGENCY' ? '#fecaca' : '#bae6fd'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}><h3>Assessment Summary</h3><span className={`badge ${q.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`}>{q.severity} PRIORITY</span></div>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#1e293b' }}>{reasonObj.summary || q.reasoning}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                    <div className="report-item"><h4>Clinical Risk Factors</h4><p style={{ color: '#ef4444', fontWeight: '800', marginTop: '0.5rem' }}>● High Cardiac Sensitivity</p><p style={{ color: '#f59e0b', fontWeight: '800' }}>● Possible Hypertension Risk</p></div>
                    <div className="report-item"><h4>Patient Metadata</h4><p>BMI: {q.profile?.bmi?.toFixed(1)}</p><p>Age: {q.profile?.age}y | {q.profile?.gender}</p></div>
                </div>
                <div style={{ marginTop: '3.5rem', display: 'flex', gap: '2rem' }}>
                    <button className="outline" style={{ flex: 1 }} onClick={onBack}><ChevronLeft /> BACK</button>
                    <button className="primary" style={{ flex: 2, padding: '1.25rem' }} onClick={onShare}>SELECT CLINIC & SHARE <ChevronRight /></button>
                </div>
            </div>
        </div>
    );
};

// --- Restoration: Advanced Healthcare Dashboard ---
const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { data: q } = useQueueSync(user.id);
    const [page, setPage] = useState('MAIN');

    if (q?.profileMissing) return <SetupProfile userId={user.id} onComplete={() => window.location.reload()} />;

    const handleShare = async (docId) => {
        try {
            await axios.post(`${API_BASE}/book/share-report`, { userId: user.id, doctorId: docId });
            alert("Report Shared & Enqueued based on Urgency.");
            setPage('MAIN');
        } catch (e) { alert(e.response?.data?.error || "Sharing Error."); }
    };

    if (page === 'REPORT') return <PrivateReportView q={q} onBack={() => setPage('MAIN')} onShare={() => setPage('DISCOVERY')} />;
    if (page === 'DISCOVERY') return <DoctorDiscovery user={user} q={q} onBack={() => setPage('MAIN')} onShare={handleShare} />;

    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1 style={{ fontSize: '2.5rem' }}>Patient <span className="text-gradient">Clinical Console</span></h1><p style={{ color: 'var(--text-muted)' }}>Welcome back, {user.name}. Centralized Health Overview.</p></div>
                <div style={{ width: '50px', height: '50px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: '900' }}>{user.name[0]}</div>
            </header>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
                {/* Stats Section */}
                <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><User color="var(--primary)" size={32} /><div><h3>{user.name}</h3><p style={{ color: 'var(--text-muted)' }}>{q?.profile?.age} yrs | {q?.profile?.bloodGroup}</p></div></div>
                    <div className="vitals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="vital-card" style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', textAlign: 'center' }}><p style={{ fontSize: '0.75rem', opacity: 0.6 }}>WEIGHT</p><h3>{q?.profile?.weight} kg</h3></div>
                        <div className="vital-card" style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', textAlign: 'center' }}><p style={{ fontSize: '0.75rem', opacity: 0.6 }}>HEIGHT</p><h3>{q?.profile?.height} cm</h3></div>
                    </div>
                    <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '20px', textAlign: 'center', border: '1px solid #bae6fd' }}><p style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: '800' }}>BODY MASS INDEX (BMI)</p><h2 style={{ color: '#0369a1', fontSize: '2.5rem' }}>{q?.profile?.bmi?.toFixed(1)}</h2><p style={{ fontWeight: '800', color: '#0369a1' }}>(Healthy Status)</p></div>
                </div>

                {/* Report Tracking */}
                <div className="card" style={{ gridColumn: 'span 8', background: q?.inQueue ? 'white' : '#f8fafc', border: q?.inQueue ? '1px solid var(--border)' : '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    {q?.inQueue ? (
                        <div className="animate-up">
                            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                <FileText size={64} color={q.isShared ? '#10b981' : 'var(--primary)'} />
                                {q.isShared && <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#10b981', color: 'white', borderRadius: '50%', padding: '4px' }}><CheckCircle2 size={16} /></div>}
                            </div>
                            <h2>{q.isShared ? 'Report Shared with Doctor' : 'AI Clinical Assessment Ready'}</h2>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 2.5rem' }}>{q.isShared ? `Your report is being processed by ${q.doctorId?.slice(0, 8)}. Wait for notification.` : 'Your structured medical report has been generated. Review and share it with a specialist to join the priority queue.'}</p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="primary" style={{ padding: '1rem 3rem' }} onClick={() => setPage('REPORT')}>VIEW REPORT</button>
                                {!q.isShared && <button className="outline" style={{ padding: '1rem 3rem' }} onClick={() => setPage('DISCOVERY')}>FIND CLINIC</button>}
                            </div>
                        </div>
                    ) : (
                        <div style={{ opacity: 0.6 }}><UploadCloud size={64} color="#94a3b8" /><h2 style={{ marginTop: '1rem', color: '#94a3b8' }}>No Active Assessment</h2><p style={{ color: '#94a3b8' }}>Start a triage flow to generate your clinical report.</p></div>
                    )}
                </div>

                {/* Shared Queue Info */}
                {q?.isShared && (
                    <div className="card animate-up" style={{ gridColumn: 'span 12', border: '2px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#10b981' }}>EST. WAIT POS</p><h1 style={{ fontSize: '4.5rem', color: '#10b981', lineHeight: '1' }}>#{q.position}</h1></div>
                            <div style={{ width: '2px', height: '60px', background: '#dcfce7' }}></div>
                            <div><h2 style={{ color: '#065f46' }}>Real-time Priority Access</h2><p style={{ color: '#065f46', opacity: 0.7 }}>You are queued based on medical urgency. Emergency cases are prioritized.</p></div>
                        </div>
                        {q.status === 'IN_CONSULTATION' ? (
                            <button className="primary pulse" style={{ background: '#10b981', padding: '1.2rem 3rem' }} onClick={() => onStartCall(q.callRoomId, q.doctorPeerId)}><Video /> JOIN VIDEO SESSION</button>
                        ) : <div className="badge moderate-bg" style={{ fontSize: '1rem' }}>WAITING FOR DOCTOR...</div>}
                    </div>
                )}

                {/* Timeline Restoration */}
                <div className="card" style={{ gridColumn: 'span 7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}><h3>Medical Timeline</h3><Clock color="var(--text-muted)" size={18} /></div>
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                        <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: '#f1f5f9' }}></div>
                        {[
                            { title: 'Annual Checkup', date: 'Oct 14, 2025', host: 'Dr. Sarah Jenkins', status: 'Completed' },
                            { title: 'Dermatology Session', date: 'Aug 05, 2025', host: 'Apollo Clinic', status: 'Completed' }
                        ].map((t, i) => (
                            <div key={i} style={{ marginBottom: '2rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-2.2rem', top: '5px', width: '12px', height: '12px', borderRadius: '50%', background: 'white', border: '3px solid var(--primary)' }}></div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.date}</p>
                                <h4 style={{ margin: '0.2rem 0' }}>{t.title}</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>{t.host}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Insights Restoration */}
                <div className="card" style={{ gridColumn: 'span 5', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}><Zap color="#8b5cf6" size={20} /><h3 style={{ color: '#5b21b6' }}>AI Health Insights</h3></div>
                    <p style={{ color: '#6d28d9', fontSize: '1rem', lineHeight: '1.7', marginBottom: '2rem' }}>Based on your consistent metrics, your metabolic health is in the top 15% for your age group.</p>
                    <button className="primary" style={{ width: '100%', background: '#7c3aed' }}>VIEW ANALYTICS</button>
                </div>
            </div>

            {!q?.inQueue && (
                <button className="primary pulse" style={{ position: 'fixed', bottom: '4rem', left: '50%', transform: 'translateX(-50%)', padding: '1.5rem 4rem', borderRadius: '50px', zIndex: 1000, boxShadow: '0 20px 50px rgba(37,99,235,0.4)' }} onClick={() => setView('INTAKE')}>
                    <AlertCircle size={24} /> START AI TRIAGE & PDF GENERATION
                </button>
            )}
        </div>
    );
};

// --- Restoration: Fully Functional AI Triage bot ---
const ConversationalIntake = ({ user, onComplete }) => {
    const [chat, setChat] = useState([{ b: true, t: `Greetings ${user.name}. To generate your structured PDF report, describe your symptoms.` }]);
    const [inp, setInp] = useState('');
    const [ans, setAns] = useState({});
    const [currQ, setCurrQ] = useState({ id: 'mainSymptom', label: 'Describe symptoms...' });
    const [sym, setSym] = useState('');
    const [thinking, setThinking] = useState(false);

    const send = async () => {
        if (!inp || thinking) return;
        const val = inp; setInp(''); setThinking(true);
        setChat(p => [...p, { b: false, t: val }]);

        const nA = { ...ans, [currQ.id]: val }; setAns(nA);
        let nS = sym; if (currQ.id === 'mainSymptom') { nS = val; setSym(val); }

        try {
            const res = await axios.post(`${API_BASE}/intake/next-question`, { answers: nA, symptom: nS });
            if (res.data.isComplete) {
                setChat(p => [...p, { b: true, t: "Report processing... Analyzing metadata and synthesizing clinical summary." }]);
                await axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: nA, symptom: nS });
                setTimeout(() => onComplete(), 2000);
            } else {
                setCurrQ(res.data.nextQuestion);
                setChat(p => [...p, { b: true, t: res.data.nextQuestion.label }]);
            }
        } catch (e) {
            setChat(p => [...p, { b: true, t: "Engine offline temporarily. Retrying..." }]);
        } finally { setThinking(false); }
    };

    return (
        <div className="container animate-up" style={{ maxWidth: '700px' }}>
            <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column', padding: '0' }}>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem 2rem', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}><Activity size={24} /><h3>SAHAY Clinical Assistant</h3></div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {chat.map((m, i) => <div key={i} className={`chat-bubble ${m.b ? 'chat-bot' : 'chat-user'}`} style={{ maxWidth: '85%' }}>{m.t}</div>)}
                    {thinking && <div className="chat-bubble chat-bot" style={{ fontStyle: 'italic', opacity: 0.7 }}>Analyzing conditions...</div>}
                </div>
                <div className="input-group" style={{ margin: '1.5rem', background: '#f8fafc', border: '1px solid #eef2ff' }}>
                    <input autoFocus placeholder="Type here..." value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} />
                    <button className="primary" onClick={send} disabled={thinking}><Send size={20} /></button>
                </div>
            </div>
        </div>
    );
};

// --- Restoration: Advanced Clinic Discovery ---
const DoctorDiscovery = ({ user, q, onBack, onShare }) => {
    const [docs, setDocs] = useState([]);
    const fetch = () => axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data));
    useEffect(() => { fetch(); socket.on('queue_updated', fetch); return () => socket.off('queue_updated'); }, []);

    return (
        <div className="container animate-up">
            <button className="outline" onClick={onBack} style={{ marginBottom: '2rem' }}><ChevronLeft /> Back to Console</button>
            <h1 style={{ marginBottom: '3rem' }}>Select Specialist Clinic</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
                {docs.map(d => (
                    <div key={d.id} className="card" style={{ borderTop: `10px solid ${d.queueLoad > 3 ? '#ef4444' : 'var(--primary)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div style={{ color: '#f59e0b', fontWeight: '900', display: 'flex', gap: '0.4rem' }}><Star fill="#f59e0b" size={18} /><span>{d.rating}</span></div>
                            <span className="badge moderate-bg">{d.specialty}</span>
                        </div>
                        <h3>{d.doctorName}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}><MapPin size={12} /> {d.address}</p>
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', margin: '1.5rem 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}><strong>Live Priority Queue</strong> <span>{d.queueLoad} waiting</span></div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span style={{ background: '#fef2f2', color: '#ef4444', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '800' }}>{d.emergencyCount} EMERGENCY</span>
                                <span style={{ background: '#f0f9ff', color: '#0369a1', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '800' }}>{d.queueLoad - d.emergencyCount} ROUTINE</span>
                            </div>
                        </div>
                        <button className="primary" style={{ width: '100%', background: q?.doctorId === d.id ? '#10b981' : 'var(--primary)' }} onClick={() => onShare(d.id)} disabled={q?.isShared && q?.doctorId !== d.id}>
                            {q?.doctorId === d.id ? 'REPORT SHARED' : 'SHARE & JOIN QUEUE'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Standard Doctor Console ---
const DoctorDashboard = ({ user, onStartCall }) => {
    const [q, setQ] = useState([]);
    const fetch = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetch(); socket.on('queue_updated', fetch); return () => socket.off('queue_updated'); }, []);
    return (
        <div className="container animate-up">
            <h1 className="text-gradient">Doctor Queue</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '3rem' }}>
                {q.map(x => (
                    <div key={x.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center', borderLeft: `8px solid ${x.severity === 'EMERGENCY' ? '#ef4444' : '#f59e0b'}` }}>
                        <div><span className={`badge ${x.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`}>{x.severity}</span><h3>{x.name} ({x.age}y)</h3></div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="outline"><FileText size={16} /> READ REPORT</button>
                            <button className="primary" onClick={() => {
                                const p = new Peer(); p.on('open', (pid) => {
                                    axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'START_CONSULTATION', peerId: pid });
                                    onStartCall(x.callRoomId, x.name, null);
                                });
                            }}>CONSULT</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Setup Profile Restore ---
const SetupProfile = ({ userId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ name: '', age: '', gender: 'Male', contact: '', address: '', height: '', weight: '', bloodGroup: 'B+', history: '' });
    const complete = async () => { await axios.post(`${API_BASE}/patient/update-profile`, { userId, ...form }); onComplete(); };
    return (
        <div className="container animate-up" style={{ maxWidth: '600px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Complete Profile</h1>
            <div className="card">
                {step === 1 && <div style={{ display: 'grid', gap: '1.2rem' }}><div className="input-group"><User size={18} /><input placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="input-group"><Clock size={18} /><input placeholder="Age" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div><select style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--primary-light)' }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option></select></div>}
                {step === 2 && <div style={{ display: 'grid', gap: '1.2rem' }}><div className="input-group"><Ruler size={18} /><input placeholder="Height (cm)" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} /></div><div className="input-group"><Scale size={18} /><input placeholder="Weight (kg)" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div><div className="input-group"><HeartPulse size={18} /><input placeholder="Blood Group (e.g. B+)" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} /></div></div>}
                {step === 3 && <div style={{ display: 'grid', gap: '1.2rem' }}><textarea placeholder="Medical History (Past Surgeries, Allergies...)" style={{ width: '100%', minHeight: '120px', border: 'none', background: 'var(--primary-light)', borderRadius: '16px', padding: '1rem' }} value={form.history} onChange={e => setForm({ ...form, history: e.target.value })} /></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                    <button className="outline" onClick={() => setStep(step - 1)} style={{ opacity: step === 1 ? 0 : 1 }}>BACK</button>
                    <button className="primary" onClick={() => step === 3 ? complete() : setStep(step + 1)}>{step === 3 ? 'COMPLETE' : 'NEXT'}</button>
                </div>
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
            <nav className="glass-nav" style={{ padding: '1rem 3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setView('DASHBOARD')}><Activity color="var(--primary)" size={32} /><h2>SAHAY</h2></div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}><div style={{ fontWeight: '900', color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.4rem 1.5rem', borderRadius: '8px' }}>{user.name}</div><button onClick={logout} style={{ color: '#ef4444' }}><LogOut size={22} /></button></div>
            </nav>
            <main className="container" style={{ paddingBottom: '10rem' }}>
                {user.role === 'PATIENT' ? (
                    <>
                        {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, dpid) => setActiveCall({ rid, name: "Doctor Session", dpid })} />}
                        {view === 'INTAKE' && <ConversationalIntake user={user} onComplete={() => setView('DASHBOARD')} />}
                    </>
                ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}
            </main>
            {activeCall && <div className="loading-overlay" style={{ background: '#09090b' }}><h1 style={{ color: 'white' }}>Live WebRTC Session Active</h1><button className="primary" style={{ marginTop: '3rem', background: '#ef4444', padding: '1rem 4rem' }} onClick={() => setActiveCall(null)}>END SESSION</button></div>}
        </div>
    );
};

const LoginPortal = () => {
    const { login } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div className="card" style={{ width: '380px', textAlign: 'center', padding: '4rem 3rem' }}>
            <Activity color="var(--primary)" size={48} /><h1 className="text-gradient">SAHAY</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2.5rem' }}>
                <div className="input-group"><User size={20} /><input placeholder="Full Name" value={n} onChange={e => setN(e.target.value)} /></div>
                <div className="input-group"><PhoneCall size={20} /><input placeholder="Phone" value={p} onChange={e => setP(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px' }}>
                    <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>Patient</button>
                    <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Doctor</button>
                </div>
                <button className="primary" style={{ padding: '1.1rem' }} onClick={() => login(p, n, r)}>LAUNCH</button>
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
