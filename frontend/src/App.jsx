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

// --- Auth & Lang Contexts ---

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

// --- Global Notifications System ---

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

// --- Telemedicine Core (WebRTC) ---

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

            if (doctorPeerId) { // Patient Side: Call Doctor
                const call = peer.call(doctorPeerId, s);
                call.on('stream', rs => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs; setCallActive(true); });
            } else { // Doctor Side: Listen for Patient
                peer.on('call', call => {
                    call.answer(s);
                    call.on('stream', rs => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs; setCallActive(true); });
                });
                socket.emit('set_peer_id', { peerId: peer.id }); // Helper for signaling
            }
        });

        return () => { stream?.getTracks().forEach(t => t.stop()); peer.destroy(); };
    }, [doctorPeerId]);

    return (
        <div className="animate-up" style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '12px', color: 'white' }}>
                    {callActive ? `Live: ${remoteName}` : 'Waiting for connection...'}
                </div>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: '2rem', right: '2rem', width: '200px', height: '140px', borderRadius: '12px', border: '2px solid white', objectFit: 'cover' }} />
            </div>
            <div className="glass-nav" style={{ padding: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', margin: '1rem', borderRadius: '40px' }}>
                <button style={{ borderRadius: '50%', background: '#333', padding: '1.2rem', color: 'white' }}><Mic /></button>
                <button onClick={onEnd} style={{ borderRadius: '50%', background: '#ef4444', padding: '1.2rem', color: 'white' }}><PhoneOff /></button>
            </div>
        </div>
    );
};

// --- Prescription Modal (Clinical Utils) ---

const PrescriptionModal = ({ patient, doctorId, onSave, onClose }) => {
    const [notes, setNotes] = useState('');
    const [meds, setMeds] = useState([{ name: '', dose: '' }]);
    const addMed = () => setMeds([...meds, { name: '', dose: '' }]);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="card animate-up" style={{ maxWidth: '450px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3>Digital Prescription</h3><X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>
                <textarea placeholder="Clinical Notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', height: '100px', padding: '1rem', borderRadius: '12px', border: '1px solid #eee' }} />
                <div style={{ marginTop: '1.5rem' }}>
                    <p style={{ fontWeight: '700' }}>Medications</p>
                    {meds.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input placeholder="Name" value={m.name} onChange={e => { const nm = [...meds]; nm[i].name = e.target.value; setMeds(nm); }} />
                            <input placeholder="Dose" value={m.dose} onChange={e => { const nm = [...meds]; nm[i].dose = e.target.value; setMeds(nm); }} />
                        </div>
                    ))}
                    <button className="outline" onClick={addMed} style={{ width: '100%', padding: '0.5rem' }}><Plus size={16} /> Add Medicine</button>
                </div>
                <button className="primary" onClick={() => onSave({ notes, medicines: meds })} style={{ width: '100%', marginTop: '2rem' }}>Save and Issue</button>
            </div>
        </div>
    );
};

// --- Dashboards ---

const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { t } = useContext(AuthContext);
    const { data: q } = useQueueSync(user.id);
    const [prescs, setPrescs] = useState([]);

    useEffect(() => {
        axios.get(`${API_BASE}/patient/prescriptions/${user.id}`).then(res => setPrescs(res.data));
        const h = (p) => p.roomId && q?.inQueue && onStartCall(p.roomId, p.doctorPeerId);
        socket.on('call_started', h); return () => socket.off('call_started', h);
    }, [q]);

    return (
        <div className="container animate-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="text-gradient">{t.welcome}, {user.name}</h1>
                <Activity color="var(--primary)" className="pulse" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', margin: '2.5rem 0' }}>
                <div className="stat-card" style={{ borderTop: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.8rem' }}><User size={14} /> {t.age}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{q?.profile?.age || '--'}</div>
                </div>
                <div className="stat-card" style={{ borderTop: `4px solid ${q?.severity === 'EMERGENCY' ? '#ef4444' : '#10b981'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.8rem' }}><TrendingUp size={14} /> {t.results}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{q?.priority ? `${Math.round(q.priority)}%` : '--'}</div>
                </div>
                <div className="stat-card" style={{ borderTop: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.8rem' }}><Clock size={14} /> {t.wait_time}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{q?.position ? `${q.position * 10}m` : '--'}</div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="card" style={{ background: '#f1f8f5', padding: '2.5rem' }}>
                    <Zap size={32} color="var(--primary)" /><h2>{t.start}</h2>
                    <p style={{ margin: '1rem 0' }}>{t.subtitle}</p>
                    <button className="primary" onClick={() => setView('INTAKE')}>{t.submit}</button>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3>{t.queue_pos}</h3>
                    {q?.inQueue ? <><div style={{ fontSize: '5rem', fontWeight: '900', color: 'var(--primary)' }}>#{q.position}</div><span className={`badge ${q.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`}>{q.severity}</span>{q.status === 'IN_CONSULTATION' && <button className="primary pulse" style={{ width: '100%', marginTop: '1.5rem', background: '#10b981' }} onClick={() => onStartCall(q.callRoomId, q.doctorPeerId)}><Video size={18} /> JOIN CALL</button>}</> : <p style={{ color: '#aaa', padding: '2rem 0' }}>{t.wait_time}: 0</p>}
                </div>
            </div>

            {prescs.length > 0 && (
                <div style={{ marginTop: '3rem' }}>
                    <h3>Recent {t.prescription}s</h3>
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                        {prescs.map(p => (
                            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem' }}>
                                <div><p style={{ margin: 0, fontWeight: '800' }}>Doctor ID: {p.doctorId.slice(0, 8)}</p><p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{p.createdAt}</p></div>
                                <button className="outline" onClick={() => alert(`Prescription Notes: ${p.notes}`)}><FileText size={18} /> View</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="card" style={{ marginTop: '2rem', cursor: 'pointer' }} onClick={() => setView('DISCOVERY')}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h4>{t.find_spec}</h4><ChevronRight /></div></div>
        </div>
    );
};

const DoctorDashboard = ({ user, onStartCall }) => {
    const { t } = useContext(AuthContext);
    const [q, setQ] = useState([]);
    const [targetP, setTargetP] = useState(null);
    const fetchQ = () => axios.get(`${API_BASE}/doctor/queue?doctorUserId=${user.id}`).then(res => setQ(res.data));
    useEffect(() => { fetchQ(); socket.on('queue_updated', fetchQ); return () => socket.off('queue_updated'); }, []);

    const handleAction = async (queueId, patientId) => {
        // Telemedicine: Doctor generates a Peer ID on the fly for this session
        const peer = new Peer();
        peer.on('open', async (pid) => {
            await axios.post(`${API_BASE}/doctor/action`, { queueId, action: 'START_CONSULTATION', peerId: pid });
            const entry = q.find(x => x.id === queueId);
            onStartCall(entry.callRoomId, entry.name, null); // Doctor doesn't need a target peerId initially, they listen
            fetchQ();
        });
    };

    const handleSavePrescription = async (data) => {
        await axios.post(`${API_BASE}/prescription/add`, { ...data, patientId: targetP.patientId, doctorId: user.id });
        setTargetP(null);
        alert("Prescription issued successfully!");
    };

    return (
        <div className="container animate-up">
            <h1 className="text-gradient">Physician Control Panel</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '3rem' }}>
                {q.map(x => {
                    const reasonObj = JSON.parse(x.reasoning || "{}");
                    return (
                        <div key={x.id} className="card" style={{ borderLeft: `10px solid ${x.severity === 'EMERGENCY' ? '#ef4444' : '#f59e0b'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2>{x.name}</h2>
                                    <p>{x.age}y {x.gender} | Priority Level: <strong>{x.severity} ({Math.round(x.priority)}%)</strong></p>
                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                        {reasonObj.flags?.map(f => <span key={f} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: '#fee', color: '#e44', borderRadius: '4px', fontWeight: '800' }}>#{f}</span>)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button className="primary" onClick={() => handleAction(x.id, x.patientId)}><Video size={18} /> {t.call}</button>
                                    <button className="outline" onClick={() => setTargetP(x)}><FileText size={18} /> {t.prescription}</button>
                                    <button className="secondary" style={{ padding: '0.5rem', borderRadius: '12px' }} onClick={() => axios.post(`${API_BASE}/doctor/action`, { queueId: x.id, action: 'COMPLETE' }).then(fetchQ)}><CheckCircle size={18} /></button>
                                </div>
                            </div>
                            <div className="summary-pre" style={{ marginTop: '1.2rem', background: '#f8fafc', fontSize: '0.85rem' }}>{reasonObj.summary || x.reasoning}</div>
                        </div>
                    );
                })}
            </div>
            {targetP && <PrescriptionModal patient={targetP} doctorId={user.id} onClose={() => setTargetP(null)} onSave={handleSavePrescription} />}
        </div>
    );
};

// --- Principal App ---

const App = () => {
    const { user, token, logout, lang, setLang, t } = useContext(AuthContext);
    const [view, setView] = useState('DASHBOARD');
    const [activeCall, setActiveCall] = useState(null);
    const [result, setResult] = useState(null);
    const [nfs, setNfs] = useState([]);

    useEffect(() => {
        socket.on('call_started', (p) => {
            if (user?.role === 'PATIENT' && p.patientId === user.id) {
                setNfs(prev => [...prev, { id: Date.now(), title: 'Doctor Incoming', msg: 'Dr is initiating a video consultation.' }]);
            }
        });
        return () => socket.off('call_started');
    }, [user]);

    if (!token) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f6f4' }}>
            <div className="card animate-up" style={{ width: '100%', maxWidth: '480px', textAlign: 'center', padding: '4rem 3rem' }}>
                <Activity size={50} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
                <h1 className="text-gradient">SAHAY</h1>
                <p style={{ marginBottom: '3rem' }}>{t.subtitle}</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
                    <button className={lang === 'en' ? 'secondary' : 'outline'} onClick={() => setLang('en')}>EN</button>
                    <button className={lang === 'hi' ? 'secondary' : 'outline'} onClick={() => setLang('hi')}>हिन्दी</button>
                </div>
                <LoginPortal />
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            <nav className="glass-nav" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '1rem', zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setView('DASHBOARD')}><Activity color="var(--primary)" size={24} /><h3 style={{ margin: 0, fontWeight: '900' }}>SAHAY</h3></div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <button className="outline" style={{ borderRadius: '50%', padding: '0.5rem', border: 'none' }} onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}><Languages size={20} /></button>
                    <div className="card" style={{ padding: '0.4rem 1rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #eee' }}>
                        <User size={16} /><span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{user.name}</span>
                    </div>
                    <button onClick={logout} style={{ padding: '0.4rem', borderRadius: '12px', background: '#fee', border: 'none' }}><LogOut color="#ef4444" size={20} /></button>
                </div>
            </nav>

            <NotificationSystem nfs={nfs} setNfs={setNfs} />

            {user.role === 'PATIENT' ? (
                <>
                    {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, dpid) => setActiveCall({ rid, name: 'Doctor', dpid })} />}
                    {view === 'INTAKE' && (
                        <>
                            <button className="outline" onClick={() => setView('DASHBOARD')} style={{ margin: '0 2rem 1rem', border: 'none' }}><ChevronLeft /> {t.back}</button>
                            <ConversationalIntake user={user} onComplete={(ans, sym) => axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: ans, symptom: sym }).then(r => { setResult(r.data); setView('RESULT'); })} />
                        </>
                    )}
                    {view === 'DISCOVERY' && <DoctorDiscovery user={user} onBack={() => setView('DASHBOARD')} />}
                    {view === 'RESULT' && result && (
                        <div className="container animate-up" style={{ maxWidth: '600px', textAlign: 'center' }}>
                            <div className="card" style={{ padding: '4rem' }}>
                                <div style={{ background: 'var(--routine-bg)', width: '80px', height: '80px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}><CheckCircle color="var(--routine)" size={48} /></div>
                                <h2>{t.triage_result}</h2><div className="badge moderate-bg" style={{ margin: '1rem 0' }}>{result.triage.severity}</div>
                                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '2rem', borderRadius: '20px', border: '1px solid #eef', marginTop: '1rem', fontStyle: 'italic', fontSize: '0.95rem' }}>{result.summary}</div>
                                <button className="primary" style={{ width: '100%', marginTop: '3rem' }} onClick={() => setView('DASHBOARD')}>{t.home}</button>
                            </div>
                        </div>
                    )}
                </>
            ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}

            {activeCall && <VideoCallModal roomId={activeCall.rid} remoteName={activeCall.name} doctorPeerId={activeCall.dpid} onEnd={() => setActiveCall(null)} />}
            <SOSButton userId={user.id} />
        </div>
    );
};

// --- Sub-components (Stateless helper types) ---

const SOSButton = ({ userId }) => (
    <div className="sos-fixed pulse" onClick={() => alert("SOS Alert Sent! Nearby clinics are being notified of your location.")} style={{ padding: '1.2rem', borderRadius: '50%', background: '#ef4444', color: 'white', filter: 'drop-shadow(0 10px 20px rgba(239,68,68,0.4))' }}>
        <ShieldAlert size={36} />
    </div>
);

const LoginPortal = () => {
    const { login, t } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="input-group"><User size={18} /><input placeholder={t.name} value={n} onChange={e => setN(e.target.value)} /></div>
            <div className="input-group"><PhoneCall size={18} /><input placeholder={t.phone} value={p} onChange={e => setP(e.target.value)} /></div>
            <div style={{ display: 'flex', background: '#f1f5f3', padding: '0.4rem', borderRadius: '15px' }}>
                <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>{t.male}</button>
                <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Doctor</button>
            </div>
            <button className="primary" onClick={() => login(p, n, r)} style={{ padding: '1.2rem', borderRadius: '20px' }}>Join SAHAY <ArrowRightCircle size={18} /></button>
        </div>
    );
};

const VoiceInput = ({ onResult }) => {
    const [l, setL] = useState(false);
    const start = () => {
        const R = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!R) return; const r = new R(); r.onstart = () => setL(true);
        r.onresult = (e) => { onResult(e.results[0][0].transcript); setL(false); };
        r.onerror = () => setL(false); r.start();
    };
    return <button className={l ? 'pulse primary' : 'outline'} onClick={start} style={{ borderRadius: '50%', padding: '0.8rem', background: l ? '#ef4444' : '' }}><Mic size={20} /></button>;
};

const ConversationalIntake = ({ user, onComplete }) => {
    const { t } = useContext(AuthContext);
    const [chat, setChat] = useState([{ type: 'bot', text: `Hi ${user.name}, ${t.symptoms}` }]);
    const [answers, setAnswers] = useState({});
    const [currQ, setCurrQ] = useState({ id: 'age', type: 'number', label: t.age });
    const [symptom, setSymptom] = useState(null);
    const [inp, setInp] = useState('');
    const endRef = useRef(null);

    useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [chat]);

    const onSend = async (v = inp) => {
        if (!v) return;
        const nAns = { ...answers, [currQ.id]: v };
        setChat(p => [...p, { type: 'user', text: v }]); setInp(''); setAnswers(nAns);
        let nSym = symptom;
        if (currQ.id === 'mainSymptom') { nSym = v.toLowerCase().replace(/ /g, '_'); setSymptom(nSym); }
        const res = await axios.post(`${API_BASE}/intake/next-question`, { answers: nAns, symptom: nSym });
        if (res.data.isComplete) {
            setChat(p => [...p, { type: 'bot', text: 'Analyzing clinical profile...' }]);
            setTimeout(() => onComplete(nAns, nSym), 1500);
        } else {
            setCurrQ(res.data.nextQuestion);
            setChat(p => [...p, { type: 'bot', text: res.data.nextQuestion.label }]);
        }
    };

    return (
        <div className="card animate-up" style={{ maxWidth: '650px', margin: '2rem auto' }}>
            <div className="chat-window" style={{ height: '450px', overflowY: 'auto', padding: '1rem' }}>
                {chat.map((c, i) => <div key={i} className={`chat-bubble chat-${c.type}`}>{c.text}</div>)}
                <div ref={endRef} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '24px', margin: '1rem' }}>
                {currQ?.type === 'select' ? (
                    <select onChange={e => onSend(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent' }}><option value="">Choose...</option>{currQ.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
                ) : <input placeholder={t.submit} value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && onSend()} style={{ flex: 1, border: 'none', background: 'transparent' }} />}
                <VoiceInput onResult={onSend} /><button className="primary" onClick={() => onSend()} style={{ borderRadius: '50%', padding: '0.8rem' }}><Send size={20} /></button>
            </div>
        </div>
    );
};

const DoctorDiscovery = ({ user, onBack }) => {
    const { t } = useContext(AuthContext);
    const [docs, setDocs] = useState([]);
    useEffect(() => { axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data)); }, []);
    const book = (id) => axios.post(`${API_BASE}/book/doctor`, { userId: user.id, doctorId: id }).then(() => { alert("Specialist Assigned!"); onBack(); });
    return (
        <div className="container animate-up">
            <button className="outline" onClick={onBack} style={{ marginBottom: '2rem' }}><ChevronLeft /> {t.back}</button>
            <div className="doctor-grid">
                {docs.map(d => (
                    <div key={d.id} className="card" style={{ borderTop: `8px solid ${d.status === 'ONLINE' ? '#10b981' : '#9CA3AF'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="badge routine-bg">{d.status}</span><div style={{ display: 'flex', gap: '0.2rem', color: '#F59E0B' }}><Star size={14} fill="#F59E0B" /> {d.rating}</div></div>
                        <h3 style={{ marginTop: '1rem' }}>{d.doctorName}</h3><p style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '1.5rem' }}>{d.specialty}</p>
                        <button className="primary" style={{ width: '100%' }} onClick={() => book(d.id)}>{t.start}</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Queue Sync Hook ---
const useQueueSync = (userId) => {
    const [data, setData] = useState(null);
    useEffect(() => {
        const fetch = () => axios.get(`${API_BASE}/patient/status/${userId}`).then(res => setData(res.data));
        fetch(); socket.on('queue_updated', fetch); return () => socket.off('queue_updated');
    }, [userId]);
    return { data };
};

export default () => <AuthProvider><App /></AuthProvider>;
