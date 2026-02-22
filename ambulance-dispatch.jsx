const { useState, useEffect } = React;

// --- Mock Data ---
const EMERGENCY_TYPES = [
    { id: 'cardiac', label: 'Cardiac Emergency' },
    { id: 'accident', label: 'Accident / Trauma' },
    { id: 'stroke', label: 'Stroke' },
    { id: 'breathing', label: 'Breathing Difficulty' },
    { id: 'other', label: 'Other/General' }
];

// --- Sub components ---

const DirectBookingForm = ({ onBack, onConfirm }) => {
    const [formData, setFormData] = useState({
        name: '', phone: '', location: '', type: 'other', ambType: 'BLS'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(formData);
    };

    return (
        <div className="ad-modal-wrap">
            <div className="ad-modal-header">
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Direct Dispatch</h2>
                    <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Fastest way to get an ambulance</span>
                </div>
                <button className="ad-back-btn" onClick={onBack}>✕ Cancel</button>
            </div>
            <div className="ad-modal-body">
                <form onSubmit={handleSubmit}>
                    <div className="ad-form-group">
                        <label className="ad-label">Patient Name</label>
                        <input className="ad-input" type="text" placeholder="Full Name" required
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>

                    <div className="ad-form-group">
                        <label className="ad-label">Contact Number</label>
                        <input className="ad-input" type="tel" placeholder="+91" required
                            value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>

                    <div className="ad-form-group">
                        <label className="ad-label">Current Location (Auto-detect simulated)</label>
                        <input className="ad-input" type="text" placeholder="Search via Google Maps API..." required
                            value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="ad-form-group" style={{ flex: 1 }}>
                            <label className="ad-label">Emergency Type</label>
                            <select className="ad-select" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                {EMERGENCY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>

                        <div className="ad-form-group" style={{ flex: 1 }}>
                            <label className="ad-label">Ambulance Type</label>
                            <select className="ad-select" value={formData.ambType} onChange={e => setFormData({ ...formData, ambType: e.target.value })}>
                                <option value="BLS">BLS (Basic Support)</option>
                                <option value="ALS">ALS (Advanced ICU)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ background: '#EEF6FF', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#1E40AF', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚡</span> ETA to your location: <strong>~6 mins</strong>
                    </div>

                    <button type="submit" className="ad-btn ad-btn-primary">Confirm Booking</button>
                </form>
            </div>
        </div>
    );
};

// AI Triage Q&A definitions
const TRIAGE_QUESTIONS = [
    { id: 'q1', text: 'Is the patient conscious?', type: 'yesno' },
    { id: 'q2', text: 'Is the patient breathing normally?', type: 'yesno' },
    { id: 'q3', text: 'Is there any chest pain?', type: 'yesno' },
    { id: 'q4', text: 'Is there severe bleeding?', type: 'yesno' },
    { id: 'q5', text: 'What is the patient\'s blood pressure?', type: 'options', opts: ['High / Very High', 'Normal', 'Low / Very Low', 'Unknown'] }
];

const TriageFlow = ({ onBack, onComplete }) => {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});

    const handleAnswer = (qid, val) => {
        const newAns = { ...answers, [qid]: val };
        setAnswers(newAns);

        if (step < TRIAGE_QUESTIONS.length - 1) {
            setStep(step + 1);
        } else {
            // Process AI Logic
            let severity = 'Low';
            let ambType = 'BLS';
            let reason = 'Patient is stable, requires standard transport.';

            if (newAns.q1 === 'No' || newAns.q2 === 'No') {
                severity = 'Critical'; ambType = 'ALS';
                reason = 'Unconscious or breathing issues demand immediate advanced life support.';
            } else if (newAns.q3 === 'Yes' && newAns.q5 === 'High / Very High') {
                severity = 'Critical'; ambType = 'ALS';
                reason = 'Potential cardiac event detected. Dispatching ICU on wheels.';
            } else if (newAns.q4 === 'Yes') {
                severity = 'Critical'; ambType = 'ALS';
                reason = 'Trauma and heavy bleeding require immediate paramedical intervention.';
            } else if (newAns.q3 === 'Yes' || newAns.q5 === 'Low / Very Low') {
                severity = 'Moderate'; ambType = 'ALS';
                reason = 'Moderate risk indicators. Sending ALS as precaution.';
            } else {
                severity = 'Low'; ambType = 'BLS';
                reason = 'Symptoms appear mild. BLS ambulance mapped.';
            }

            onComplete({ severity, ambType, reason });
        }
    };

    const q = TRIAGE_QUESTIONS[step];
    const progress = Math.round(((step) / TRIAGE_QUESTIONS.length) * 100);

    return (
        <div className="ad-modal-wrap">
            <div className="ad-modal-header">
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>AI Triage</h2>
                    <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Fast clinical assessment</span>
                </div>
                <button className="ad-back-btn" onClick={onBack}>✕ Cancel</button>
            </div>
            <div className="ad-modal-body">
                <div className="ad-progress-bar">
                    <div className="ad-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="ad-question">{q.text}</div>

                <div className="ad-answer-btns">
                    {q.type === 'yesno' ? (
                        <>
                            <button className="ad-ans-btn" onClick={() => handleAnswer(q.id, 'Yes')}>Yes</button>
                            <button className="ad-ans-btn" onClick={() => handleAnswer(q.id, 'No')}>No</button>
                        </>
                    ) : (
                        q.opts.map(opt => (
                            <button key={opt} className="ad-ans-btn" onClick={() => handleAnswer(q.id, opt)}>{opt}</button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const SeverityResult = ({ result, onProceed }) => {
    return (
        <div className="ad-modal-wrap">
            <div className="ad-modal-header" style={{ background: result.severity === 'Critical' ? '#FF4D4F' : result.severity === 'Moderate' ? '#F59E0B' : '#2EC4B6' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Triage Result</h2>
            </div>
            <div className="ad-modal-body ad-result-card">
                <div style={{ color: '#64748B', fontWeight: '600' }}>Emergency Severity</div>
                <div className={`ad-result-val lvl-${result.severity.toLowerCase()}`}>{result.severity}</div>

                <div className="ad-result-box">
                    <div className="ad-box-item">
                        <span className="ad-box-lbl">Recommended</span>
                        <span className="ad-box-val">{result.ambType} Ambulance</span>
                    </div>
                    <div className="ad-box-item">
                        <span className="ad-box-lbl">Est. Dispatch</span>
                        <span className="ad-box-val">{result.severity === 'Critical' ? '< 2 mins' : '~5 mins'}</span>
                    </div>
                </div>

                <p style={{ background: '#F1F5F9', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#475569', textAlign: 'left', marginBottom: '2rem' }}>
                    <strong>AI Analysis:</strong> {result.reason}
                </p>

                <button className={`ad-btn ${result.severity === 'Critical' ? 'ad-btn-danger' : 'ad-btn-success'}`} onClick={() => onProceed(result.ambType)}>
                    Proceed with {result.ambType} Dispatch
                </button>
            </div>
        </div>
    );
};

const TrackingScreen = ({ bookingData, onHome }) => {
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        if (!showMap) return;

        let map;
        let ambMarker;
        let intervalId;

        // Dummy coordinates for patient and ambulance initial location
        const patientLatLng = [22.57286, 88.36401]; // Kolkata center
        const initialAmbLatLng = [22.55994, 88.35056];

        map = L.map('ambMapCanvas').setView(patientLatLng, 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 20
        }).addTo(map);

        const patientIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background:#FF4D4F; color:#fff; width:24px; height:24px; border-radius:50%; text-align:center; line-height:24px; font-weight:bold; box-shadow:0 0 10px rgba(255,77,79,0.5);">!</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        L.marker(patientLatLng, { icon: patientIcon }).addTo(map).bindPopup('Your Location');

        const ambRoute = [
            initialAmbLatLng,
            [22.56582, 88.35172],
            [22.56857, 88.35729],
            [22.57534, 88.35961],
            patientLatLng
        ];

        L.polyline(ambRoute, {
            color: '#2EC4B6',
            weight: 4,
            dashArray: '10, 10',
            opacity: 0.7
        }).addTo(map);

        const ambIcon = L.divIcon({
            className: 'custom-amb-pin',
            html: `<div style="background:#2EC4B6; color:#fff; width:36px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 0 12px rgba(46,196,182,0.6);">🚑</div>`,
            iconSize: [36, 26],
            iconAnchor: [18, 13]
        });

        ambMarker = L.marker(initialAmbLatLng, { icon: ambIcon, zIndexOffset: 1000 }).addTo(map);

        let progress = 0;
        intervalId = setInterval(() => {
            progress += 0.05;
            const index = Math.floor(progress);

            if (index >= ambRoute.length - 1) {
                ambMarker.setLatLng(ambRoute[ambRoute.length - 1]);
                const etaEl = document.getElementById('ad-eta-display');
                if (etaEl) etaEl.innerText = 'Arrived';
                clearInterval(intervalId);
                return;
            }

            const currentP = ambRoute[index];
            const nextP = ambRoute[index + 1];
            const t = progress - index;

            const lat = currentP[0] + (nextP[0] - currentP[0]) * t;
            const lng = currentP[1] + (nextP[1] - currentP[1]) * t;

            ambMarker.setLatLng([lat, lng]);

            const remaining = Math.max(1, Math.ceil(4 - (progress / (ambRoute.length - 1)) * 4));
            const etaEl = document.getElementById('ad-eta-display');
            if (etaEl && etaEl.innerText !== 'Arrived') {
                etaEl.innerText = remaining + ' mins';
            }
        }, 100);

        return () => {
            clearInterval(intervalId);
            map.remove();
        };
    }, [showMap]);

    if (showMap) {
        return (
            <div className="ad-modal-wrap" style={{ background: '#fff' }}>
                <div className="ad-modal-header" style={{ background: '#1E293B', color: '#fff' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Live Tracking</h2>
                    <button className="ad-back-btn" onClick={() => setShowMap(false)}>✕ Back</button>
                </div>
                <div className="ad-modal-body" style={{ padding: 0 }}>
                    <div id="ambMapCanvas" style={{ width: '100%', height: '400px', background: '#EEF6FF' }}></div>
                    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <strong style={{ fontSize: '1.2rem', color: '#1E293B', display: 'block' }}>Ambulance {bookingData.vehicleId} En Route</strong>
                        <p style={{ color: '#64748B', margin: '0.5rem 0' }}>ETA: <strong id="ad-eta-display" style={{ color: '#2EC4B6' }}>4 mins</strong> • {bookingData.ambType} Unit</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ad-modal-wrap" style={{ background: '#0F172A', color: 'white' }}>
            <div className="ad-modal-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div className="tracker-dot"></div>
                <h2>Ambulance Dispatched!</h2>
                <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>Booking ID: <strong style={{ color: '#fff' }}>{bookingData.id}</strong></p>

                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#94A3B8' }}>Ambulance</span>
                        <strong>{bookingData.ambType} Unit ({bookingData.vehicleId})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#94A3B8' }}>ETA</span>
                        <strong style={{ color: '#2EC4B6' }}>4 mins</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94A3B8' }}>Hospital Pre-alert</span>
                        <strong style={{ color: '#22C55E' }}>✓ Sent</strong>
                    </div>
                </div>

                <button className="ad-btn ad-btn-primary" onClick={() => setShowMap(true)}>View Live Map</button>
                <button className="ad-btn" style={{ background: 'transparent', color: '#94A3B8', marginTop: '1rem' }} onClick={onHome}>Close</button>
            </div>
        </div>
    );
};


// Main App Component
const AmbulanceDispatchApp = () => {
    const [view, setView] = useState('home'); // home, direct, triage, result, tracking
    const [triageResult, setTriageResult] = useState(null);
    const [bookingRef, setBookingRef] = useState(null);

    const handleDirectConfirm = (data) => {
        // Mock save
        const id = 'EMR-' + Math.floor(1000 + Math.random() * 9000);
        setBookingRef({ id, ambType: data.ambType, vehicleId: `${data.ambType}-204` });
        setView('tracking');
    };

    const handleTriageComplete = (result) => {
        setTriageResult(result);
        setView('result');
    };

    const handleProceedFromTriage = (ambType) => {
        // For simplicity, directly tracking for now. In real app, might ask for address here if not known.
        const id = 'EMR-' + Math.floor(1000 + Math.random() * 9000);
        setBookingRef({ id, ambType, vehicleId: `${ambType}-990` });
        setView('tracking');
    };

    return (
        <div className="ad-wrapper">

            {view === 'home' && (
                <>
                    <div className="ad-header">
                        <h1 className="ad-title">Ambulance Dispatch</h1>
                        <p className="ad-subtitle">Select your dispatch method. Every second counts.</p>
                    </div>

                    <div className="ad-options-container">
                        <div className="ad-option-card" onClick={() => setView('triage')}>
                            <div className="ad-icon blue">🧠</div>
                            <h3 className="ad-opt-title">AI-Assisted Triage</h3>
                            <p className="ad-opt-desc">Answer 5 quick questions. AI determines severity and auto-matches the exact ambulance type.</p>
                            <button className="ad-btn ad-btn-secondary" style={{ marginTop: '2rem' }}>Start Triage</button>
                        </div>

                        <div className="ad-option-card" style={{ border: '2px solid #FF4D4F' }} onClick={() => setView('direct')}>
                            <div className="ad-icon red">🚨</div>
                            <h3 className="ad-opt-title">Direct Booking</h3>
                            <p className="ad-opt-desc">Know what you need? Book directly and dispatch nearest unit to your live location.</p>
                            <button className="ad-btn ad-btn-danger" style={{ marginTop: '2rem' }}>Book Immediately</button>
                        </div>
                    </div>
                </>
            )}

            {view === 'direct' && <DirectBookingForm onBack={() => setView('home')} onConfirm={handleDirectConfirm} />}

            {view === 'triage' && <TriageFlow onBack={() => setView('home')} onComplete={handleTriageComplete} />}

            {view === 'result' && <SeverityResult result={triageResult} onProceed={handleProceedFromTriage} />}

            {view === 'tracking' && <TrackingScreen bookingData={bookingRef} onHome={() => setView('home')} />}

        </div>
    );
};

const domNode = document.getElementById('ad-react-root');
const root = ReactDOM.createRoot(domNode);
root.render(<AmbulanceDispatchApp />);
