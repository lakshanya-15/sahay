import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import {
    Activity, Stethoscope, Clock, AlertCircle, CheckCircle, Video, PhoneCall, ChevronRight,
    Send, Languages, ArrowRightCircle, LogOut, ChevronLeft, Heart, Navigation, MapPin,
    Filter, Mic, Star, Info, Bell, ShieldAlert, User, Scale, Ruler, Droplet,
    Thermometer, Wind, Zap, Share2, ClipboardList, TrendingUp, X, MicOff, VideoOff, PhoneOff,
    FileText, Plus, BellRing
} from 'lucide-react';
import { translations } from './utils/translations';

const API_BASE = 'https://sahay-6doo.onrender.com/api';
const socket = io('https://sahay-6doo.onrender.com');

// --- Auth & Lang ---
const AuthContext = createContext(null);
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [lang, setLang] = useState('en');
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
    const t = translations[lang] || translations.en;
    return <AuthContext.Provider value={{ user, token, login, logout, lang, setLang, t }}>{children}</AuthContext.Provider>;
};

// --- Shared Components ---
const HealthMetricStat = ({ icon: Icon, label, value, color }) => (
    <div className="stat-card" style={{ borderTop: `4px solid ${color}`, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
            <Icon size={14} /> {label}
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{value}</div>
    </div>
);

const NotificationSystem = ({ nfs, setNfs }) => (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 5000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {nfs.map(n => (
            <div key={n.id} className="animate-up card" style={{ padding: '1rem 1.5rem', minWidth: '300px', borderLeft: '6px solid var(--primary)', display: 'flex', gap: '1rem', alignItems: 'center', background: 'white', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}>
                <BellRing size={20} color="var(--primary)" />
                <div><p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{n.title}</p><p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>{n.msg}</p></div>
                <X size={16} style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setNfs(p => p.filter(x => x.id !== n.id))} />
            </div>
        ))}
    </div>
);

const VideoCallModal = ({ roomId, remoteName, onEnd, doctorPeerId }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [callActive, setCallActive] = useState(false);
    useEffect(() => {
        const peer = new Peer();
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => {
            setStream(s);
            if (localVideoRef.current) localVideoRef.current.srcObject = s;
            if (doctorPeerId) {
                const call = peer.call(doctorPeerId, s);
                call.on('stream', rs => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs; setCallActive(true); });
            } else {
                peer.on('call', call => {
                    call.answer(s);
                    call.on('stream', rs => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs; setCallActive(true); });
                });
                socket.emit('set_peer_id', { peerId: peer.id });
            }
        });
        return () => { stream?.getTracks().forEach(t => t.stop()); peer.destroy(); };
    }, [doctorPeerId]);
    return (
        <div className="animate-up" style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '12px', color: 'white' }}>{callActive ? `Live: ${remoteName}` : 'Establishing Secure Connection...'}</div>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: '2rem', right: '2rem', width: '200px', height: '140px', borderRadius: '12px', border: '2px solid white', objectFit: 'cover' }} />
            </div>
            <div className="glass-nav" style={{ padding: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', margin: '1rem', borderRadius: '40px' }}>
                <button style={{ borderRadius: '50%', background: '#333', padding: '1.2rem', color: 'white' }}><Mic /></button>
                <button onClick={onEnd} style={{ borderRadius: '50%', background: '#ef4444', padding: '1.2rem', color: 'white' }}><PhoneOff /></button>
            </div>
        </div>
    );
};

const PrescriptionModal = ({ patient, doctorId, onSave, onClose }) => {
    const [notes, setNotes] = useState('');
    const [meds, setMeds] = useState([{ name: '', dose: '' }]);
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="card animate-up" style={{ maxWidth: '450px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}><h3>Digital Prescription</h3><X onClick={onClose} style={{ cursor: 'pointer' }} /></div>
                <textarea placeholder="Clinical Notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', height: '100px', padding: '1rem', borderRadius: '12px' }} />
                <button className="primary" onClick={() => onSave({ notes, medicines: meds })} style={{ width: '100%', marginTop: '2rem' }}>Save and Issue</button>
            </div>
        </div>
    );
};

// --- Main Dashboards ---

const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { t } = useContext(AuthContext);
    const { data: q } = useQueueSync(user.id);
    const [prescs, setPrescs] = useState([]);

    useEffect(() => {
        axios.get(`${API_BASE}/patient/prescriptions/${user.id}`).then(res => setPrescs(res.data));
        const h = (p) => p.roomId && q?.inQueue && onStartCall(p.roomId, p.doctorPeerId);
        socket.on('call_started', h); return () => socket.off('call_started', h);
    }, [q]);

    const reasonObj = useMemo(() => {
        try { return JSON.parse(q?.reasoning || "{}"); }
        catch (e) { return { summary: q?.reasoning }; }
    }, [q]);

    return (
        <div className="container animate-up">
            <h1 className="text-gradient">{t.welcome}, {user.name}</h1>
            <div style={{ display: 'flex', gap: '1.5rem', margin: '2.5rem 0', flexWrap: 'wrap' }}>
                <HealthMetricStat icon={User} label={t.age} value={q?.profile?.age || '--'} color="var(--primary)" />
                <HealthMetricStat icon={TrendingUp} label={t.results} value={q?.priority ? `${Math.round(q.priority)}%` : '--'} color={q?.severity === 'EMERGENCY' ? '#ef4444' : '#10b981'} />
                <HealthMetricStat icon={Clock} label={t.wait_time} value={q?.position ? `${q.position * 10}m` : '--'} color="#f59e0b" />
            </div>

            <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ background: '#f1f8f5', padding: '2.5rem' }}>
                        <Zap size={32} color="var(--primary)" /><h2>Start AI Triage</h2>
                        <p style={{ margin: '1rem 0' }}>{t.subtitle}</p>
                        <button className="primary" onClick={() => setView('INTAKE')}>Begin Health Check</button>
                    </div>

                    {(q?.profile || q?.inQueue) && (
                        <div className="card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><ClipboardList size={22} color="var(--primary)" /> Your Clinical Profile</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '15px' }}>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: 0 }}>GENDER</p>
                                    <p style={{ fontWeight: '800', margin: 0 }}>{q?.profile?.gender || 'Not Set'}</p>
                                </div>
                                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '15px' }}>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: 0 }}>PATIENT ID</p>
                                    <p style={{ fontWeight: '800', margin: 0 }}>#{q?.profile?.id?.slice(0, 8) || 'N/A'}</p>
                                </div>
                            </div>
                            {q?.inQueue && (
                                <div style={{ marginTop: '2rem', background: '#eef2ff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #c7d2fe' }}>
                                    <p style={{ fontWeight: '900', color: '#4338ca', marginBottom: '0.5rem', fontSize: '0.8rem' }}>AI ANALYSIS SUMMARY</p>
                                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: '#1e1b4b' }}>{reasonObj.summary || q.reasoning}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '300px' }}>
                    <h3>{t.queue_pos}</h3>
                    {q?.inQueue ? (
                        <>
                            <div style={{ fontSize: '6rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>#{q.position}</div>
                            <div className={`badge ${q.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`} style={{ margin: '1rem auto' }}>{q.severity} PRIORITY</div>
                            {q.status === 'IN_CONSULTATION' && (
                                <button className="primary pulse" style={{ width: '100%', marginTop: '1rem', background: '#10b981' }} onClick={() => onStartCall(q.callRoomId, q.doctorPeerId)}>
                                    <Video size={18} /> JOIN SECURE CALL NOW
                                </button>
                            )}
                        </>
                    ) : (
                        <div style={{ opacity: 0.4 }}>
                            <Clock size={60} style={{ margin: '2rem 0' }} />
                            <p>Queue is currently empty.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem', cursor: 'pointer', background: 'var(--primary)', color: 'white' }} onClick={() => setView('DISCOVERY')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Stethoscope /> <h3>Talk to Specialist Doctors</h3></div>
                    <ArrowRightCircle />
                </div>
            </div>
        </div>
    );
};

const DoctorDashboard = ({ user, onStartCall }) => {
    const { t } = useContext(AuthContext);
    const [q, setQ] = useState([]);
    const [targetP, setTargetP] = useState(null);
    const fetchQ = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetchQ(); socket.on('queue_updated', fetchQ); return () => socket.off('queue_updated'); }, []);
    const handleAction = async (queueId) => {
        const peer = new Peer();
        peer.on('open', async (pid) => {
            await axios.post(`${API_BASE}/doctor/action`, { queueId, action: 'START_CONSULTATION', peerId: pid });
            const entry = q.find(x => x.id === queueId);
            onStartCall(entry.callRoomId, entry.name, null);
            fetchQ();
        });
    };
    return (
        <div className="container animate-up">
            <h1 className="text-gradient">Doctor Queue Management</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2.5rem' }}>
                {q.map(x => {
                    const reasonObj = JSON.parse(x.reasoning || "{}");
                    return (
                        <div key={x.id} className="card" style={{ borderLeft: `8px solid ${x.severity === 'EMERGENCY' ? '#ef4444' : '#f59e0b'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><h3>{x.name} ({x.age}y)</h3><p style={{ opacity: 0.6 }}>Priority: {x.severity}</p></div>
                                <div style={{ display: 'flex', gap: '0.8rem' }}>
                                    <button className="primary" onClick={() => handleAction(x.id)}><Video size={18} /> Call</button>
                                    <button className="outline" onClick={() => setTargetP(x)}><FileText size={18} /></button>
                                    <button className="secondary" onClick={() => axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'COMPLETE' }).then(fetchQ)}><CheckCircle size={18} /></button>
                                </div>
                            </div>
                            <div className="summary-pre" style={{ marginTop: '1rem', background: '#f8fafc', fontSize: '0.85rem' }}>{reasonObj.summary || x.reasoning}</div>
                        </div>
                    );
                })}
            </div>
            {targetP && <PrescriptionModal onClose={() => setTargetP(null)} onSave={(d) => axios.post(`${API_BASE}/prescription/add`, { ...d, patientId: targetP.patientId, doctorId: user.id }).then(() => setTargetP(null))} />}
        </div>
    );
};

// --- Principal Root ---
const App = () => {
    const { user, token, logout, lang, setLang, t } = useContext(AuthContext);
    const [view, setView] = useState('DASHBOARD');
    const [activeCall, setActiveCall] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [nfs, setNfs] = useState([]);

    useEffect(() => {
        socket.on('call_started', (p) => {
            if (user?.role === 'PATIENT' && p.patientId === user.id) {
                setNfs(prev => [...prev, { id: Date.now(), title: 'Doctor Connected', msg: 'A physician is ready to see you now.' }]);
            }
        });
        return () => socket.off('call_started');
    }, [user]);

    const handleIntakeSubmit = async (ans, sym) => {
        setLoading(true);
        try {
            const r = await axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: ans, symptom: sym });
            setResult(r.data); setView('RESULT');
        } catch (e) { alert("Error during analysis. Please check your connection."); }
        finally { setLoading(false); }
    };

    if (!token) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f6f4' }}>
            <div className="card animate-up" style={{ width: '100%', maxWidth: '480px', textAlign: 'center', padding: '4rem 3rem' }}>
                <Activity size={50} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h1 className="text-gradient">SAHAY</h1>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1.5rem 0' }}>
                    <button className={lang === 'en' ? 'secondary' : 'outline'} style={{ padding: '0.5rem 1rem' }} onClick={() => setLang('en')}>English</button>
                    <button className={lang === 'hi' ? 'secondary' : 'outline'} style={{ padding: '0.5rem 1rem' }} onClick={() => setLang('hi')}>हिन्दी</button>
                </div>
                <LoginPortal />
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            {loading && <div className="loading-overlay"><div className="spinner"></div><p style={{ color: 'white', marginTop: '1.5rem', fontWeight: 'bold' }}>Simplifying Analysis for You...</p></div>}
            <nav className="glass-nav" style={{ margin: '1rem', padding: '0.8rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '1rem', zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setView('DASHBOARD')}><Activity color="var(--primary)" size={24} /><h2 style={{ margin: 0, fontWeight: '900' }}>SAHAY</h2></div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="card" style={{ padding: '0.5rem 1.2rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #eee', fontSize: '0.9rem' }}>
                        <User size={16} /><strong>{user.name}</strong>
                    </div>
                    <button onClick={logout} className="secondary" style={{ padding: '0.5rem', borderRadius: '12px' }}><LogOut size={18} /></button>
                </div>
            </nav>
            <NotificationSystem nfs={nfs} setNfs={setNfs} />
            {user.role === 'PATIENT' ? (
                <div className="container">
                    {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, dpid) => setActiveCall({ rid, name: 'Medical Specialist', dpid })} />}
                    {view === 'INTAKE' && (
                        <>
                            <button className="outline" onClick={() => setView('DASHBOARD')} style={{ marginBottom: '1.5rem' }}><ChevronLeft /> Cancel</button>
                            <ConversationalIntake user={user} onComplete={handleIntakeSubmit} />
                        </>
                    )}
                    {view === 'DISCOVERY' && <DoctorDiscovery user={user} onBack={() => setView('DASHBOARD')} />}
                    {view === 'RESULT' && result && (
                        <div className="card animate-up" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '4rem' }}>
                            <div style={{ background: '#ecfdf5', width: '80px', height: '80px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}><CheckCircle color="#10b981" size={48} /></div>
                            <h2>Triage Analysis Ready</h2>
                            <div className="badge moderate-bg" style={{ margin: '1rem 0', fontSize: '1.1rem' }}>{result.triage.severity}</div>
                            <div style={{ textAlign: 'left', background: '#f8fafc', padding: '2rem', borderRadius: '20px', border: '1px solid #eef', marginTop: '1.5rem', lineHeight: '1.6' }}>{result.summary}</div>
                            <button className="primary" style={{ width: '100%', marginTop: '3rem', padding: '1.2rem' }} onClick={() => setView('DASHBOARD')}>Back to Dashboard</button>
                        </div>
                    )}
                </div>
            ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}
            {activeCall && <VideoCallModal roomId={activeCall.rid} remoteName={activeCall.name} doctorPeerId={activeCall.dpid} onEnd={() => setActiveCall(null)} />}
            <SOSButton userId={user.id} />
        </div>
    );
};

// --- Helpers ---
const SOSButton = () => (
    <div className="sos-fixed pulse" onClick={() => alert("SOS Alert Broadacasted!")}><ShieldAlert size={36} /></div>
);
const LoginPortal = () => {
    const { login, t } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group"><User size={18} /><input placeholder="Enter Name" value={n} onChange={e => setN(e.target.value)} /></div>
            <div className="input-group"><PhoneCall size={18} /><input placeholder="Enter Mobile" value={p} onChange={e => setP(e.target.value)} /></div>
            <div style={{ display: 'flex', background: '#f8fafc', padding: '0.4rem', borderRadius: '15px' }}>
                <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>Patient</button>
                <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Doctor</button>
            </div>
            <button className="primary" onClick={() => login(p, n, r)} style={{ padding: '1.2rem', borderRadius: '20px' }}>Access Dashboard</button>
        </div>
    );
};
const VoiceInput = ({ onResult }) => {
    const [l, setL] = useState(false);
    const start = () => {
        const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return;
        const r = new R(); r.onstart = () => setL(true);
        r.onresult = (e) => { onResult(e.results[0][0].transcript); setL(false); };
        r.onerror = () => setL(false); r.start();
    };
    return <button className={l ? 'pulse primary' : 'outline'} onClick={start} style={{ borderRadius: '50%', padding: '0.8rem', background: l ? '#ef4444' : '' }}><Mic size={20} /></button>;
};
const ConversationalIntake = ({ user, onComplete }) => {
    const { t } = useContext(AuthContext);
    const [chat, setChat] = useState([{ type: 'bot', text: `Hi ${user.name}, please tell me what symptoms you are feeling?` }]);
    const [answers, setAnswers] = useState({});
    const [currQ, setCurrQ] = useState({ id: 'age', type: 'number', label: "What is your Age?" });
    const [symptom, setSymptom] = useState(null);
    const [inp, setInp] = useState('');
    const endRef = useRef(null);
    useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [chat]);
    const onSend = async (v = inp) => {
        if (!v) return;
        const nAns = { ...answers, [currQ.id]: v };
        setChat(p => [...p, { type: 'user', text: v }]); setInp(''); setAnswers(nAns);
        let nSym = symptom; if (currQ.id === 'mainSymptom') { nSym = v.toLowerCase().replace(/ /g, '_'); setSymptom(nSym); }
        const res = await axios.post(`${API_BASE}/intake/next-question`, { answers: nAns, symptom: nSym });
        if (res.data.isComplete) {
            setChat(p => [...p, { type: 'bot', text: 'Analyzing your health profile...' }]);
            setTimeout(() => onComplete(nAns, nSym), 1500);
        } else {
            setCurrQ(res.data.nextQuestion);
            setChat(p => [...p, { type: 'bot', text: res.data.nextQuestion.label }]);
        }
    };
    return (
        <div className="card animate-up" style={{ maxWidth: '650px', margin: '0 auto' }}>
            <div className="chat-window" style={{ height: '400px', overflowY: 'auto', padding: '1rem' }}>
                {chat.map((c, i) => <div key={i} className={`chat-bubble chat-${c.type}`}>{c.text}</div>)}
                <div ref={endRef} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '24px', margin: '1rem' }}>
                {currQ?.type === 'select' ? (
                    <select onChange={e => onSend(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent' }}><option value="">Select...</option>{currQ.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
                ) : <input placeholder="Type here..." value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && onSend()} style={{ flex: 1, border: 'none', background: 'transparent' }} />}
                <VoiceInput onResult={onSend} /><button className="primary" onClick={() => onSend()} style={{ borderRadius: '50%', padding: '0.8rem' }}><Send size={20} /></button>
            </div>
        </div>
    );
};
const DoctorDiscovery = ({ user, onBack }) => {
    const [docs, setDocs] = useState([]);
    useEffect(() => { axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data)); }, []);
    return (
        <div className="container animate-up">
            <button className="outline" onClick={onBack} style={{ marginBottom: '2rem' }}><ChevronLeft /> Back</button>
            <div className="doctor-grid">
                {docs.map(d => (
                    <div key={d.id} className="card" style={{ borderTop: `8px solid ${d.status === 'ONLINE' ? '#10b981' : '#9CA3AF'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="badge routine-bg">{d.status}</span><div style={{ display: 'flex', gap: '0.2rem', color: '#F59E0B' }}><Star size={14} fill="#F59E0B" /> {d.rating}</div></div>
                        <h3 style={{ marginTop: '1rem' }}>{d.doctorName}</h3><p style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '1.5rem' }}>{d.specialty}</p>
                        <button className="primary" style={{ width: '100%' }} onClick={() => axios.post(`${API_BASE}/book/doctor`, { userId: user.id, doctorId: d.id }).then(() => { alert("Doctor Assigned!"); onBack(); })}>Connect Now</button>
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
