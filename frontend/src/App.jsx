import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Activity, Stethoscope, Clock, AlertCircle, CheckCircle, Video, PhoneCall, ChevronRight,
    Send, Languages, ArrowRightCircle, LogOut, ChevronLeft, Heart, Navigation, MapPin,
    Filter, Mic, Star, Info, Bell, ShieldAlert, User, Scale, Ruler, Droplet,
    Thermometer, Wind, Zap, Share2, ClipboardList, TrendingUp, X, MicOff, VideoOff, PhoneOff
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const socket = io('http://localhost:5000');

// --- Auth Context ---

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

// --- Custom Hooks ---

const useQueueSync = (userId) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const fetchStatus = () => axios.get(`${API_BASE}/patient/status/${userId}`).then(res => setData(res.data)).finally(() => setLoading(false));
    useEffect(() => {
        fetchStatus(); socket.on('queue_updated', fetchStatus);
        return () => socket.off('queue_updated');
    }, [userId]);
    return { data, fetchStatus, loading };
};

// --- UI Components ---

const SOSButton = ({ userId }) => (
    <div className="sos-fixed pulse" onClick={() => alert("SOS Alert Sent to nearby clinics!")}>
        <ShieldAlert size={36} color="white" />
    </div>
);

const HealthMetricStat = ({ icon: Icon, label, value, color }) => (
    <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
        <div style={{ display: 'flex', gap: '0.4rem', color: '#6b7280', fontSize: '0.8rem', alignItems: 'center' }}><Icon size={14} /> {label}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{value}</div>
    </div>
);

const VideoCallModal = ({ roomId, remoteName, onEnd }) => (
    <div className="animate-up" style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '100px', height: '100px', background: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>{remoteName[0]}</div>
                <h2>{remoteName}</h2>
                <p style={{ opacity: 0.5 }}>Room: {roomId}</p>
            </div>
        </div>
        <div className="glass-nav" style={{ padding: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', margin: '1rem', borderRadius: '40px' }}>
            <button style={{ borderRadius: '50%', padding: '1rem', background: '#333', color: 'white' }}><Mic /></button>
            <button style={{ borderRadius: '50%', padding: '1rem', background: '#333', color: 'white' }}><Video /></button>
            <button onClick={onEnd} style={{ borderRadius: '50%', padding: '1rem', background: '#ef4444', color: 'white' }}><PhoneOff /></button>
        </div>
    </div>
);

const VoiceInput = ({ onResult }) => {
    const [listening, setListening] = useState(false);
    const handleStart = () => {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) return alert("Speech API not supported.");
        const rec = new Recognition();
        rec.onstart = () => setListening(true);
        rec.onresult = (e) => { onResult(e.results[0][0].transcript); setListening(false); };
        rec.onerror = () => setListening(false);
        rec.start();
    };
    return <button className={listening ? 'primary pulse' : 'outline'} onClick={handleStart} style={{ borderRadius: '50%', padding: '0.75rem', background: listening ? '#ef4444' : '' }}><Mic size={20} /></button>;
};

// --- View Components ---

const LoginPortal = () => {
    const { login } = useContext(AuthContext);
    const [n, setN] = useState(''); const [p, setP] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <input placeholder="Name" value={n} onChange={e => setN(e.target.value)} />
            <input placeholder="Phone" value={p} onChange={e => setP(e.target.value)} />
            <div style={{ display: 'flex', background: '#f1f5f3', padding: '0.4rem', borderRadius: '15px' }}>
                <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>Patient</button>
                <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Doctor</button>
            </div>
            <button className="primary" onClick={() => login(p, n, r)}>Access Dashboard <ArrowRightCircle size={18} /></button>
        </div>
    );
};

const ConversationalIntake = ({ user, onComplete }) => {
    const [chat, setChat] = useState([{ type: 'bot', text: `Hi ${user.name}, let's check your symptoms. What is your age?` }]);
    const [answers, setAnswers] = useState({});
    const [currQ, setCurrQ] = useState({ id: 'age', type: 'number' });
    const [symptom, setSymptom] = useState(null);
    const [inp, setInp] = useState('');
    const scrollRef = useRef(null);
    useEffect(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), [chat]);

    const onSend = async (val = inp) => {
        if (!val) return;
        const nAns = { ...answers, [currQ.id]: val };
        setChat(p => [...p, { type: 'user', text: val }]); setInp(''); setAnswers(nAns);
        let nSym = symptom;
        if (currQ.id === 'mainSymptom') { nSym = val.toLowerCase().replace(/ /g, '_'); setSymptom(nSym); }
        const res = await axios.post(`${API_BASE}/intake/next-question`, { answers: nAns, symptom: nSym });
        if (res.data.isComplete) {
            setChat(p => [...p, { type: 'bot', text: 'Processing results...' }]);
            setTimeout(() => onComplete(nAns, nSym), 1000);
        } else {
            setCurrQ(res.data.nextQuestion);
            setChat(p => [...p, { type: 'bot', text: res.data.nextQuestion.label }]);
        }
    };

    return (
        <div className="card animate-up" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <div className="chat-window">{chat.map((c, i) => <div key={i} className={`chat-bubble chat-${c.type}`}>{c.text}</div>)}<div ref={scrollRef} /></div>
            <div style={{ display: 'flex', gap: '1rem', background: '#f8fafa', padding: '1rem', borderRadius: '20px' }}>
                {currQ?.type === 'select' ? <select onChange={e => onSend(e.target.value)} style={{ flex: 1 }}><option value="">Choose...</option>{currQ.options.map(o => <option key={o}>{o}</option>)}</select> : <input value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && onSend()} style={{ flex: 1, border: 'none', background: 'transparent' }} />}
                <VoiceInput onResult={onSend} /><button className="primary" onClick={() => onSend()} style={{ borderRadius: '50%' }}><Send size={20} /></button>
            </div>
        </div>
    );
};

const DoctorDiscovery = ({ user, onBack }) => {
    const [docs, setDocs] = useState([]);
    useEffect(() => { axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data)); }, []);
    const book = (id) => axios.post(`${API_BASE}/book/doctor`, { userId: user.id, doctorId: id }).then(() => { alert("Booked!"); onBack(); });
    return (
        <div className="container animate-up">
            <button className="outline" onClick={onBack} style={{ marginBottom: '2rem' }}><ChevronLeft /> Back</button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {docs.map(d => (
                    <div key={d.id} className="card">
                        <span className="badge routine-bg">{d.status}</span><h3>{d.doctorName}</h3><p style={{ fontWeight: '700', color: 'var(--primary)' }}>{d.specialty}</p>
                        <button className="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => book(d.id)}>Request Call</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { data: q } = useQueueSync(user.id);
    useEffect(() => { const h = (p) => p.roomId && q?.inQueue && onStartCall(p.roomId); socket.on('call_started', h); return () => socket.off('call_started', h); }, [q]);
    return (
        <div className="container animate-up">
            <h1 className="text-gradient">Hello, {user.name}</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', margin: '2.5rem 0' }}>
                <HealthMetricStat icon={Droplet} label="Blood" value="A+" color="#ef4444" /><HealthMetricStat icon={TrendingUp} label="Vital" value="98%" color="#10b981" /><HealthMetricStat icon={Clock} label="Wait" value="10m" color="#f59e0b" />
            </div>
            <div className="dashboard-grid">
                <div className="card" style={{ background: '#f1f8f5', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '3rem' }}>
                    <Activity size={48} color="var(--primary)" /><h2>Start AI Triage</h2><p>Process your symptoms and join the priority queue.</p>
                    <button className="primary" onClick={() => setView('INTAKE')}>Start Now</button>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3>Queue Status</h3>
                    {q?.inQueue ? <><div style={{ fontSize: '4rem', fontWeight: '900', color: 'var(--primary)' }}>#{q.position}</div><span className="badge moderate-bg">{q.severity}</span>{q.status === 'IN_CONSULTATION' && <button className="primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => onStartCall(q.callRoomId)}>JOIN CALL</button>}</> : <p style={{ color: '#aaa', padding: '2rem 0' }}>Queue is empty.</p>}
                </div>
            </div>
            <div className="card" style={{ marginTop: '2rem', cursor: 'pointer' }} onClick={() => setView('DISCOVERY')}><h4>Find Specialists →</h4></div>
        </div>
    );
};

const DoctorDashboard = ({ user, onStartCall }) => {
    const [q, setQ] = useState([]);
    const fetch = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetch(); socket.on('queue_updated', fetch); return () => socket.off('queue_updated'); }, []);
    const start = async (id, room, name) => { await axios.post(`${API_BASE}/doctor/action`, { queueId: id, action: 'START_CONSULTATION' }); onStartCall(room, name); fetch(); };
    return (
        <div className="container animate-up">
            <h1 className="text-gradient">Clinic Queue</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '3rem' }}>
                {q.map(x => (
                    <div key={x.id} className="card" style={{ borderLeft: `8px solid ${x.severity === 'EMERGENCY' ? '#ef4444' : '#f59e0b'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><h2>{x.name}</h2><p>{x.age}y {x.gender} | Score: {x.riskScore}</p></div>
                            <button className="primary" onClick={() => start(x.id, x.callRoomId, x.name)}>Call Patient</button>
                        </div>
                        <div className="summary-pre" style={{ marginTop: '1rem' }}>{x.reasoning}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Principal App ---

const App = () => {
    const { user, token, logout } = useContext(AuthContext);
    const [view, setView] = useState('DASHBOARD');
    const [activeCall, setActiveCall] = useState(null);
    const [result, setResult] = useState(null);

    if (!token) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
            <div className="card animate-up" style={{ width: '100%', maxWidth: '480px', textAlign: 'center', padding: '4rem 3rem' }}>
                <Activity size={60} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
                <h1 className="text-gradient">SAHAY</h1>
                <p style={{ marginBottom: '3rem' }}>Intelligence in Every Consultation.</p>
                <LoginPortal />
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh' }}>
            <nav className="glass-nav" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '1rem', zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Activity color="var(--primary)" size={24} /><h3 style={{ margin: 0, fontWeight: '900' }}>SAHAY</h3></div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700' }}>{user.name}</span><button onClick={logout} style={{ padding: '0.4rem', borderRadius: '12px', background: '#fee', border: 'none' }}><LogOut color="#ef4444" size={20} /></button>
                </div>
            </nav>

            {user.role === 'PATIENT' ? (
                <>
                    {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid) => setActiveCall({ rid, name: 'Doctor' })} />}
                    {view === 'INTAKE' && (
                        <>
                            <button className="outline" onClick={() => setView('DASHBOARD')} style={{ margin: '0 2rem 1rem', border: 'none' }}><ChevronLeft /> Back</button>
                            <ConversationalIntake user={user} onComplete={(ans, sym) => axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: ans, symptom: sym }).then(r => { setResult(r.data); setView('RESULT'); })} />
                        </>
                    )}
                    {view === 'DISCOVERY' && <DoctorDiscovery user={user} onBack={() => setView('DASHBOARD')} />}
                    {view === 'RESULT' && result && (
                        <div className="container animate-up" style={{ maxWidth: '600px', textAlign: 'center' }}>
                            <div className="card">
                                <CheckCircle color="var(--routine)" size={48} /><h2>Confirmed</h2>
                                <pre className="summary-pre" style={{ textAlign: 'left', marginTop: '1rem' }}>{result.summary}</pre>
                                <button className="primary" style={{ width: '100%', marginTop: '2rem' }} onClick={() => setView('DASHBOARD')}>Back</button>
                            </div>
                        </div>
                    )}
                </>
            ) : <DoctorDashboard user={user} onStartCall={(rid, name) => setActiveCall({ rid, name })} />}

            {activeCall && <VideoCallModal roomId={activeCall.rid} remoteName={activeCall.name} onEnd={() => setActiveCall(null)} />}
            <SOSButton userId={user.id} />
        </div>
    );
};

export default () => <AuthProvider><App /></AuthProvider>;
