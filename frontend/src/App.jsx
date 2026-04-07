import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import {
    Activity, Stethoscope, Clock, AlertCircle, CheckCircle, Video, PhoneCall, ChevronRight,
    Send, Languages, ArrowRightCircle, LogOut, ChevronLeft, Heart, Navigation, MapPin,
    Filter, Mic, Star, Info, Bell, ShieldAlert, User, Scale, Ruler, Droplet,
    Thermometer, Wind, Zap, Share2, ClipboardList, TrendingUp, X, MicOff, VideoOff, PhoneOff,
    FileText, Plus, BellRing, Database, UserCheck, HeartPulse, History, AlertTriangle
} from 'lucide-react';
import { translations } from './utils/translations';

const API_BASE = 'https://sahay-6doo.onrender.com/api';
const socket = io('https://sahay-6doo.onrender.com');

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

const ReportSection = ({ icon: Icon, title, children }) => (
    <div className="report-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #eef2ff', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            <Icon size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>{title}</h3>
        </div>
        {children}
    </div>
);

const ReportItem = ({ label, value, color }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <div className="report-label">{label}</div>
        <div className="report-value" style={{ color: color || 'inherit' }}>{value || 'Not provided'}</div>
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
        <div className="animate-up" style={{ position: 'fixed', inset: 0, background: '#0f172a', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '0.75rem 1.25rem', borderRadius: '16px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div>
                        <span style={{ fontWeight: '700' }}>{callActive ? `Live: ${remoteName}` : 'Re-establishing Connection...'}</span>
                    </div>
                </div>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: '2rem', right: '2rem', width: '240px', height: '160px', borderRadius: '24px', border: '4px solid rgba(255,255,255,0.2)', objectFit: 'cover', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
            </div>
            <div className="glass-nav" style={{ padding: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center', background: 'rgba(15,23,42,0.9)', margin: '1.5rem', borderRadius: '32px' }}>
                <button style={{ borderRadius: '50%', background: 'rgba(255,255,255,0.1)', padding: '1.25rem', color: 'white' }}><MicOff /></button>
                <button style={{ borderRadius: '50%', background: 'rgba(255,255,255,0.1)', padding: '1.25rem', color: 'white' }}><VideoOff /></button>
                <button onClick={onEnd} style={{ borderRadius: '40px', background: '#ef4444', padding: '1rem 3rem', color: 'white', fontWeight: '800' }}><PhoneOff /> END CONSULTATION</button>
            </div>
        </div>
    );
};

// --- Report View Component ---

const ClinicalReportView = ({ q, onClose }) => {
    const reasonObj = useMemo(() => {
        try { return JSON.parse(q?.reasoning || "{}"); }
        catch (e) { return { summary: q?.reasoning }; }
    }, [q]);

    return (
        <div className="container animate-up" style={{ maxWidth: '900px' }}>
            <div className="card card-report" style={{ padding: '4rem' }}>
                <div className="report-header">
                    <div>
                        <h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.04em', color: '#1e293b' }}>Pre-Consultation Report</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Generated by SAHAY NextGen Triage Engine</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="report-label">Triage Timestamp</div>
                        <div className="report-value" style={{ fontSize: '1.1rem' }}>{new Date().toLocaleString()}</div>
                    </div>
                </div>

                <div className="triage-hero" style={{ background: q?.severity === 'EMERGENCY' ? '#fff1f2' : '#f0f9ff', borderColor: q?.severity === 'EMERGENCY' ? '#fecaca' : '#bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: q?.severity === 'EMERGENCY' ? '#e11d48' : '#0369a1' }}>
                            <ShieldAlert size={28} />
                            <h2 style={{ fontSize: '1.5rem', color: 'inherit' }}>AI Triage Assessment</h2>
                        </div>
                        <span className={`badge ${q?.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`} style={{ fontSize: '1rem', padding: '0.6rem 1.25rem' }}>
                            <AlertTriangle size={16} /> {q?.severity}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <span style={{ fontWeight: '800' }}>Chief Complaint:</span> <span style={{ color: '#475569' }}>{q.reasoning?.includes('chest') ? 'chest pain' : 'symptom reported'}</span>
                            <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>(Duration: 3 days)</span>
                        </div>
                        <div>
                            <p style={{ fontWeight: '800', marginBottom: '0.5rem', color: '#1e293b' }}>AI Case Summary:</p>
                            <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6' }}>{reasonObj.summary || q.reasoning}</p>
                        </div>
                        {q?.severity === 'EMERGENCY' && (
                            <div style={{ color: '#e11d48', fontWeight: '800', borderTop: '1px solid #fee2e2', paddingTop: '1rem' }}>
                                <AlertCircle size={18} style={{ marginRight: '0.5rem' }} />
                                Detected Risks: Myocardial Infarction, Acute Respiratory Failure
                            </div>
                        )}
                    </div>
                </div>

                <div className="report-grid">
                    <div>
                        <ReportSection icon={UserCheck} title="Patient Demographics">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <ReportItem label="Full Name" value={q.name || "N/A"} />
                                <ReportItem label="Age & Gender" value={`${q.age} years, ${q.gender}`} />
                                <ReportItem label="Contact" value="+91 91234 56789" />
                                <ReportItem label="Address" value="Near Civil Lines, Saharanpur" />
                            </div>
                        </ReportSection>

                        <ReportSection icon={HeartPulse} title="Vitals Profile">
                            <div className="vitals-grid">
                                <div className="vital-card">
                                    <div className="report-label">Blood Group</div>
                                    <div className="report-value" style={{ color: '#e11d48' }}>B+</div>
                                </div>
                                <div className="vital-card">
                                    <div className="report-label">Height / Weight</div>
                                    <div className="report-value">178 cm / 74 kg</div>
                                </div>
                                <div className="vital-card">
                                    <div className="report-label">BMI</div>
                                    <div className="report-value">23.4</div>
                                </div>
                            </div>
                        </ReportSection>
                    </div>

                    <div>
                        <ReportSection icon={History} title="Medical Background">
                            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', marginBottom: '1rem' }}>
                                <div className="report-label">Past Diseases / Surgeries</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>None reported</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', marginBottom: '1rem' }}>
                                <div className="report-label">Chronic Illnesses</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>Hypertension (Managed)</div>
                            </div>
                            <div style={{ background: '#fff1f2', padding: '1.25rem', borderRadius: '16px', marginBottom: '1rem', border: '1px solid #fee2e2' }}>
                                <div className="report-label" style={{ color: '#e11d48' }}>Known Allergies</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#e11d48' }}>Dust, Penicillin</div>
                            </div>
                        </ReportSection>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem' }}>
                    <button className="primary" style={{ flex: 1, padding: '1.25rem' }} onClick={onClose}>CONFIRM & RETURN</button>
                    <button className="outline" style={{ padding: '1.25rem' }}><Share2 /> EXPORT PDF</button>
                </div>
            </div>
        </div>
    );
};

// --- Dashboards ---

const PatientDashboard = ({ user, setView, onStartCall }) => {
    const { t } = useContext(AuthContext);
    const { data: q } = useQueueSync(user.id);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        const h = (p) => p.roomId && q?.inQueue && onStartCall(p.roomId, p.doctorPeerId);
        socket.on('call_started', h); return () => socket.off('call_started', h);
    }, [q]);

    if (showReport && q?.inQueue) return <ClinicalReportView q={{ ...q, ...q.profile, name: user.name }} onClose={() => setShowReport(false)} />;

    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.04em' }}>Welcome, <span className="text-gradient">{user.name}</span></h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Your health companion is active and monitored.</p>
                </div>
                <div style={{ background: 'white', padding: '1rem 2rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></div>
                    <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>SYSTEM: ONLINE</span>
                </div>
            </header>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
                <div className="card" style={{ gridColumn: 'span 8', padding: '3rem', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{ color: 'white', fontSize: '2rem', marginBottom: '1rem' }}>Start AI-Powered Triage</h2>
                        <p style={{ opacity: 0.9, fontSize: '1.2rem', maxWidth: '500px', marginBottom: '2.5rem' }}>Experience the next generation of healthcare assessment. Instant, clinical, and accurate.</p>
                        <button className="primary" style={{ background: 'white', color: 'var(--primary)', padding: '1.25rem 2.5rem', borderRadius: '16px', fontSize: '1.1rem' }} onClick={() => setView('INTAKE')}>
                            BEGIN NEW ASSESSMENT <ArrowRightCircle size={22} />
                        </button>
                    </div>
                    <Zap size={200} color="rgba(255,255,255,0.05)" style={{ position: 'absolute', right: '-40px', bottom: '-40px' }} />
                </div>

                <div className="card" style={{ gridColumn: 'span 4', textAlign: 'center', background: 'white', position: 'relative' }}>
                    <h3 style={{ marginBottom: '2rem' }}>Live Queue Position</h3>
                    {q?.inQueue ? (
                        <>
                            <div style={{ fontSize: '7rem', fontWeight: '900', color: 'var(--primary)', height: '140px' }}>{q.position}</div>
                            <div className={`badge ${q.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`} style={{ margin: '1rem 0' }}>{q.severity} PRIORITY</div>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Wait time: ~{q.position * 12} mins</p>
                            <button className="outline" style={{ width: '100%', padding: '1rem' }} onClick={() => setShowReport(true)}>VIEW AI REPORT</button>
                        </>
                    ) : (
                        <div style={{ padding: '3rem 0', opacity: 0.4 }}>
                            <Clock size={80} style={{ margin: '0 auto 1.5rem' }} />
                            <p style={{ fontWeight: '800' }}>No active assessment found.</p>
                        </div>
                    )}
                </div>
            </div>

            {q?.inQueue && q.status === 'IN_CONSULTATION' && (
                <div className="card animate-up" style={{ marginTop: '2rem', background: '#ecfdf5', border: '2px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="pulse" style={{ background: '#10b981', padding: '1rem', borderRadius: '50%', color: 'white' }}><Video size={32} /></div>
                        <div>
                            <h2 style={{ color: '#065f46' }}>A Specialist is Connected!</h2>
                            <p style={{ color: '#065f46', opacity: 0.8 }}>Secure WebRTC tunnel established. Join now for consultation.</p>
                        </div>
                    </div>
                    <button className="primary" style={{ background: '#10b981', padding: '1.25rem 3rem', fontSize: '1.1rem' }} onClick={() => onStartCall(q.callRoomId, "Dr. Specialist", q.doctorPeerId)}>
                        JOIN CONSULTATION NOW
                    </button>
                </div>
            )}

            <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card" style={{ cursor: 'pointer' }} onClick={() => setView('DISCOVERY')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '16px' }}><Stethoscope color="var(--primary)" size={28} /></div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem' }}>Browse Specialists</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Cardiologists, GPs, Pediatricians available 24/7</p>
                            </div>
                        </div>
                        <ChevronRight color="var(--primary)" />
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ background: 'var(--success-bg)', padding: '1rem', borderRadius: '16px' }}><ShieldAlert color="var(--success)" size={28} /></div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem' }}>E-Pharmacy & Prescriptions</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Access your digital clinical records instantly</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DoctorDashboard = ({ user, onStartCall }) => {
    const { t } = useContext(AuthContext);
    const [q, setQ] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
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

    if (selectedPatient) return <ClinicalReportView q={selectedPatient} onClose={() => setSelectedPatient(null)} />;

    return (
        <div className="container animate-up">
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.04em' }}>Doctor Portal</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Live Priority Triage Queue</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ background: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700' }}>
                        Tracking <span style={{ color: 'var(--primary)' }}>{q.length} Active Cases</span>
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {q.map(x => {
                    let reasonObj = { summary: x.reasoning };
                    try { if (x.reasoning?.startsWith('{')) reasonObj = JSON.parse(x.reasoning); } catch (e) { }
                    return (
                        <div key={x.id} className="card" style={{ padding: '2rem 3rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
                                    <span className={`badge ${x.severity === 'EMERGENCY' ? 'emergency-bg' : 'moderate-bg'}`}>
                                        <AlertTriangle size={14} /> {x.severity}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}><Clock size={14} /> 16 mins waiting</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>{x.gender}, {x.age}</span>
                                </div>
                                <h3 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>{x.name}</h3>
                                <p style={{ fontWeight: '800', marginBottom: '1.25rem' }}>Chief Complaint: <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>{x.reasoning?.includes('chest') ? 'Severe chest pain' : 'Reported symptoms'}</span></p>
                                <div style={{ background: '#f8fafc', padding: '1.25rem 2rem', borderRadius: '16px', border: '1px solid #eef2ff' }}>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.5rem' }}>AI Brief:</p>
                                    <p style={{ margin: 0, fontSize: '0.95rem', fontStyle: 'italic', color: '#475569' }}>{reasonObj.summary || x.reasoning}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '220px' }}>
                                <button className="outline" style={{ padding: '1rem', width: '100%', fontSize: '1rem' }} onClick={() => setSelectedPatient(x)}>
                                    <FileText size={18} /> View AI Report
                                </button>
                                <button className="primary" style={{ padding: '1rem', width: '100%', fontSize: '1rem', background: '#0f172a' }} onClick={() => handleAction(x.id)}>
                                    CONSULT <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {q.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                        <UserCheck size={80} style={{ margin: '0 auto 2rem' }} />
                        <h2>Queue Clear</h2>
                        <p>No patients currently waiting for triage.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---Principal App Root ---

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
                setNfs(prev => [...prev, { id: Date.now(), title: 'SPECIALIST CONNECTED', msg: 'A clinical session is ready for you.' }]);
            }
        });
        return () => socket.off('call_started');
    }, [user]);

    const handleIntakeSubmit = async (ans, sym) => {
        setLoading(true);
        try {
            const r = await axios.post(`${API_BASE}/intake/finalize`, { userId: user.id, answers: ans, symptom: sym });
            setResult(r.data); setView('RESULT');
        } catch (e) { alert("clinical engine error."); }
        finally { setLoading(false); }
    };

    if (!token) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div className="card animate-up" style={{ width: '100%', maxWidth: '500px', textAlign: 'center', padding: '5rem 4rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
                <Activity size={60} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
                <h1 style={{ fontSize: '3rem', letterSpacing: '-0.06em' }} className="text-gradient">SAHAY</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>Next generation digital healthcare infrastructure.</p>
                <LoginPortal />
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            {loading && <div className="loading-overlay"><div className="spinner"></div><h2 style={{ color: 'white', marginTop: '2rem' }}>Synthesizing Clinical Analysis...</h2></div>}
            <nav className="glass-nav" style={{ padding: '1rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setView('DASHBOARD')}>
                    <Activity color="var(--primary)" size={32} /><h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.04em' }}>SAHAY</h2>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--primary-light)', padding: '0.6rem 1.5rem', borderRadius: '12px', color: 'var(--primary)', fontWeight: '800' }}>
                        <User size={18} /> {user.name}
                    </div>
                    <button onClick={logout} style={{ color: '#ef4444', background: '#fef2f2', padding: '0.6rem' }}><LogOut size={22} /></button>
                </div>
            </nav>

            <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 5000, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {nfs.map(n => (
                    <div key={n.id} className="card animate-up" style={{ minWidth: '400px', padding: '1.5rem 2rem', borderLeft: '8px solid var(--success)', background: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div><h4 style={{ color: 'var(--success)' }}>{n.title}</h4><p style={{ margin: 0, fontWeight: '600' }}>{n.msg}</p></div>
                            <X onClick={() => setNfs(p => p.filter(x => x.id !== n.id))} style={{ cursor: 'pointer' }} />
                        </div>
                    </div>
                ))}
            </div>

            <main className="container">
                {user.role === 'PATIENT' ? (
                    <>
                        {view === 'DASHBOARD' && <PatientDashboard user={user} setView={setView} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}
                        {view === 'INTAKE' && (
                            <>
                                <button className="outline" onClick={() => setView('DASHBOARD')} style={{ marginBottom: '2rem' }}><ChevronLeft /> BACK TO CONSOLE</button>
                                <ConversationalIntake user={user} onComplete={handleIntakeSubmit} />
                            </>
                        )}
                        {view === 'DISCOVERY' && <DoctorDiscovery user={user} onBack={() => setView('DASHBOARD')} />}
                        {view === 'RESULT' && result && (
                            <div style={{ padding: '2rem 0' }}>
                                <ClinicalReportView q={{ ...result, ...user, severity: result.triage.severity, reasoning: result.summary }} onClose={() => setView('DASHBOARD')} />
                            </div>
                        )}
                    </>
                ) : <DoctorDashboard user={user} onStartCall={(rid, name, dpid) => setActiveCall({ rid, name, dpid })} />}
            </main>

            {activeCall && <VideoCallModal roomId={activeCall.rid} remoteName={activeCall.name} doctorPeerId={activeCall.dpid} onEnd={() => setActiveCall(null)} />}
            <div className="sos-fixed pulse" onClick={() => alert("SOS Broadacast Sent to nearest Trauma Center!")} style={{ position: 'fixed', bottom: '3rem', right: '3rem', background: '#ef4444', width: '80px', height: '80px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, boxShadow: '0 15px 30px rgba(239,68,68,0.4)', cursor: 'pointer' }}>
                <ShieldAlert size={40} />
            </div>
        </div>
    );
};

// --- Simplified Form Helpers ---
const LoginPortal = () => {
    const { login } = useContext(AuthContext);
    const [p, setP] = useState(''); const [n, setN] = useState(''); const [r, setR] = useState('PATIENT');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group"><User size={20} /><input placeholder="Full Name" value={n} onChange={e => setN(e.target.value)} /></div>
            <div className="input-group"><PhoneCall size={20} /><input placeholder="Mobile Number" value={p} onChange={e => setP(e.target.value)} /></div>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.5rem', borderRadius: '16px' }}>
                <button className={r === 'PATIENT' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('PATIENT')}>Im a Patient</button>
                <button className={r === 'DOCTOR' ? 'primary' : 'outline'} style={{ flex: 1, border: 'none' }} onClick={() => setR('DOCTOR')}>Im a Doctor</button>
            </div>
            <button className="primary" style={{ padding: '1.25rem', fontSize: '1.1rem' }} onClick={() => login(p, n, r)}>ENTER CONSOLE <ArrowRightCircle /></button>
        </div>
    );
};

const ConversationalIntake = ({ user, onComplete }) => {
    const [chat, setChat] = useState([{ type: 'bot', text: `Greetings ${user.name}, I am your SAHAY AI clinical assistant. What health concerns are you experiencing today?` }]);
    const [answers, setAnswers] = useState({});
    const [currQ, setCurrQ] = useState({ id: 'mainSymptom', type: 'text', label: 'Please describe your main symptom.' });
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
            setChat(p => [...p, { type: 'bot', text: 'Synthesis complete. Generating pre-consultation report...' }]);
            setTimeout(() => onComplete(nAns, nSym), 1500);
        } else {
            setCurrQ(res.data.nextQuestion);
            setChat(p => [...p, { type: 'bot', text: res.data.nextQuestion.label }]);
        }
    };
    return (
        <div className="card" style={{ maxWidth: '700px', margin: '0 auto', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
            <div style={{ height: '500px', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                {chat.map((c, i) => <div key={i} className={`chat-bubble chat-${c.type}`}>{c.text}</div>)}
                <div ref={endRef} />
            </div>
            <div style={{ padding: '2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
                <input placeholder="Type your response..." value={inp} onChange={e => setInp(e.target.value)} onKeyPress={e => e.key === 'Enter' && onSend()} style={{ flex: 1, padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem' }} />
                <button className="primary" style={{ padding: '1rem' }} onClick={() => onSend()}><Send /></button>
            </div>
        </div>
    );
};

const DoctorDiscovery = ({ user, onBack }) => {
    const [docs, setDocs] = useState([]);
    useEffect(() => { axios.get(`${API_BASE}/doctors`).then(res => setDocs(res.data)); }, []);
    return (
        <div className="container animate-up">
            <h1 style={{ marginBottom: '3rem' }}>Find Medical Specialists</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                {docs.map(d => (
                    <div key={d.id} className="card" style={{ borderTop: `10px solid ${d.status === 'ONLINE' ? 'var(--success)' : '#9CA3AF'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div className="badge routine-bg">{d.status}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: '800' }}><Star size={16} fill="#f59e0b" /> {d.rating}</div>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{d.doctorName}</h2>
                        <p style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1rem', marginBottom: '2rem' }}>{d.specialty}</p>
                        <button className="primary" style={{ width: '100%' }} onClick={() => axios.post(`${API_BASE}/book/doctor`, { userId: user.id, doctorId: d.id }).then(() => { alert("Specialist Assigned!"); onBack(); })}>REQUEST CONSULTATION <Heart /></button>
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
