const { useState, useEffect, useMemo } = React;

const mockDoctors = [
    { id: 1, name: "Dr. Raj Mehta", specialization: "General Physician", experience: 12, fee: 500, rating: 4.8, status: "Available" },
    { id: 2, name: "Dr. Ananya Sen", specialization: "ENT", experience: 8, fee: 600, rating: 4.7, status: "Available" },
    { id: 3, name: "Dr. Vikram Rao", specialization: "Cardiology", experience: 15, fee: 800, rating: 4.9, status: "Busy" },
    { id: 4, name: "Dr. Priya Sharma", specialization: "Neurology", experience: 10, fee: 900, rating: 4.6, status: "Available" },
    { id: 5, name: "Dr. Arjun Das", specialization: "Orthopedic", experience: 7, fee: 700, rating: 4.5, status: "Available" },
    { id: 6, name: "Dr. Suman Roy", specialization: "General Physician", experience: 5, fee: 400, rating: 4.4, status: "Busy" },
    { id: 7, name: "Dr. Kavita Nair", specialization: "Cardiology", experience: 20, fee: 1200, rating: 5.0, status: "Available" },
];

const VideoConsultationPage = () => {
    const [search, setSearch] = useState('');
    const [specFilter, setSpecFilter] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [modalUI, setModalUI] = useState(null); // 'booking', 'payment', 'call'

    // Form
    const [consultType, setConsultType] = useState('instant');
    const [dateTime, setDateTime] = useState('');
    const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', symptoms: '' });

    // Call UI State
    const [callTime, setCallTime] = useState(0);

    const filteredDocs = useMemo(() => {
        let res = [...mockDoctors];
        if (search) {
            const q = search.toLowerCase();
            res = res.filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
        }
        if (specFilter) res = res.filter(d => d.specialization === specFilter);

        if (sortBy === 'price') res.sort((a, b) => a.fee - b.fee);
        if (sortBy === 'experience') res.sort((a, b) => b.experience - a.experience);
        if (sortBy === 'availability') res.sort((a, b) => (a.status === 'Available' ? -1 : 1));

        return res;
    }, [search, specFilter, sortBy]);

    useEffect(() => {
        let interval = null;
        if (modalUI === 'call') {
            interval = setInterval(() => setCallTime(prev => prev + 1), 1000);
        } else {
            setCallTime(0);
            if (interval) clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [modalUI]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleConsult = (doc) => {
        setSelectedDoc(doc);
        setModalUI('booking');
        setConsultType('instant');
        setPatientInfo({ name: '', phone: '', symptoms: '' });
    };

    const handleMockPayment = () => {
        setModalUI('call');
    };

    const handleEndCall = () => {
        alert('Consultation ended successfully. A prescription will be sent to your phone.');
        setModalUI(null);
        setSelectedDoc(null);
    };

    return (
        <div className="vc-container">
            {/* Header */}
            <div className="vc-header">
                <h1 className="vc-title">Video Consultation</h1>
                <p className="vc-subtitle">Connect face-to-face with top specialists instantly in HD.</p>
            </div>

            {/* Filters */}
            <div className="vc-controls">
                <input type="text" className="vc-input" placeholder="Search doctor or specialty..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="vc-select" value={specFilter} onChange={e => setSpecFilter(e.target.value)}>
                    <option value="">All Specialties</option>
                    <option value="General Physician">General Physician</option>
                    <option value="ENT">ENT</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedic">Orthopedic</option>
                </select>
                <select className="vc-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="">Sort By...</option>
                    <option value="price">Price (Low to High)</option>
                    <option value="experience">Experience (High to Low)</option>
                    <option value="availability">Availability First</option>
                </select>
            </div>

            {/* Grid */}
            <div className="vc-grid">
                {filteredDocs.map(doc => (
                    <div key={doc.id} className="vc-card">
                        <div className={`vc-status ${doc.status === 'Available' ? 'status-avail' : 'status-busy'}`}>
                            {doc.status}
                        </div>
                        <div className="vc-card-header">
                            <div className="vc-avatar">{doc.name.split(' ')[1].charAt(0)}</div>
                            <div>
                                <h3 className="vc-name">{doc.name}</h3>
                                <div className="vc-spec">{doc.specialization}</div>
                            </div>
                        </div>
                        <div className="vc-stats">
                            <span>⭐ {doc.rating} / 5</span>
                            <span>⏳ {doc.experience} Years Exp.</span>
                        </div>
                        <div className="vc-price">₹{doc.fee} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '400' }}>/ consult</span></div>
                        <button
                            className="vc-btn vc-btn-primary"
                            disabled={doc.status === 'Busy'}
                            onClick={() => handleConsult(doc)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            {doc.status === 'Available' ? 'Consult Now' : 'Doctor is Busy'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Modals Overlay */}
            {(modalUI === 'booking' || modalUI === 'payment') && (
                <div className="modal-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="ec-modal-content" style={{ maxWidth: '550px' }}>
                        <button className="modal-close-btn" style={{ position: 'absolute', right: '24px', top: '24px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => { setModalUI(null); setSelectedDoc(null); }}>✕</button>

                        {modalUI === 'booking' && (
                            <>
                                <h2 style={{ marginBottom: '0.5rem' }}>Book Consultation</h2>
                                <p style={{ color: '#64748B', marginBottom: '2rem' }}>with <strong>{selectedDoc.name}</strong> • ₹{selectedDoc.fee}</p>

                                <div className="vc-form-group">
                                    <label>Consultation Type</label>
                                    <select className="vc-select" value={consultType} onChange={e => setConsultType(e.target.value)}>
                                        <option value="instant">Instant Connect (Now)</option>
                                        <option value="scheduled">Schedule for Later</option>
                                    </select>
                                </div>

                                {consultType === 'scheduled' && (
                                    <div className="vc-form-group">
                                        <label>Select Date & Time</label>
                                        <input type="datetime-local" className="vc-input" value={dateTime} onChange={e => setDateTime(e.target.value)} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="vc-form-group" style={{ flex: 1 }}>
                                        <label>Patient Name</label>
                                        <input type="text" className="vc-input" value={patientInfo.name} onChange={e => setPatientInfo({ ...patientInfo, name: e.target.value })} placeholder="Full Name" />
                                    </div>
                                    <div className="vc-form-group" style={{ flex: 1 }}>
                                        <label>Phone Number</label>
                                        <input type="tel" className="vc-input" value={patientInfo.phone} onChange={e => setPatientInfo({ ...patientInfo, phone: e.target.value })} placeholder="+91" />
                                    </div>
                                </div>

                                <div className="vc-form-group">
                                    <label>Brief Symptoms / Reason for Visit</label>
                                    <textarea className="vc-textarea" rows="3" value={patientInfo.symptoms} onChange={e => setPatientInfo({ ...patientInfo, symptoms: e.target.value })} placeholder="E.g., High fever for 2 days..."></textarea>
                                </div>

                                <div style={{ marginTop: '2rem' }}>
                                    <button
                                        className="vc-btn vc-btn-primary"
                                        disabled={!patientInfo.name || !patientInfo.phone}
                                        onClick={() => setModalUI('payment')}
                                    >Proceed to Payment — ₹{selectedDoc.fee}</button>
                                </div>
                            </>
                        )}

                        {modalUI === 'payment' && (
                            <>
                                <h2 style={{ marginBottom: '0.5rem' }}>Payment</h2>
                                <p style={{ color: '#64748B', marginBottom: '2rem' }}>Secure checkout for {selectedDoc.name}</p>

                                <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem', border: '1px solid #E2E8F0' }}>
                                    <div style={{ fontSize: '1rem', color: '#64748B', marginBottom: '0.5rem' }}>Consultation Fee</div>
                                    <div style={{ fontSize: '3rem', fontWeight: '700', color: '#2B7FFF' }}>₹{selectedDoc.fee}</div>
                                </div>

                                <button className="vc-btn vc-btn-primary" onClick={handleMockPayment}>
                                    Pay & Connect Now
                                </button>
                                <button className="vc-btn" style={{ background: 'transparent', color: '#64748B', marginTop: '1rem' }} onClick={() => setModalUI('booking')}>Back</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Video Call Full Screen */}
            {modalUI === 'call' && (
                <div className="vc-call-screen">
                    <div className="vc-call-header">
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedDoc.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{selectedDoc.specialization}</div>
                        </div>
                        <div className="vc-timer">
                            <span style={{ color: '#2EC4B6' }}>● LIVE</span> &nbsp; {formatTime(callTime)}
                        </div>
                    </div>

                    <div className="vc-call-body">
                        <div className="vc-video-main">
                            <span style={{ fontSize: '4rem' }}>👨‍⚕️</span>
                            <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '12px', color: 'white', fontSize: '0.9rem' }}>{selectedDoc.name}</div>

                            {/* PiP */}
                            <div className="vc-video-patient">
                                <span style={{ fontSize: '3rem' }}>👤</span>
                                <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}>You</div>
                            </div>
                        </div>

                        <div className="vc-call-sidebar">
                            <div className="vc-chat-header">Consultation Chat</div>
                            <div className="vc-chat-body">
                                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>Doctor has joined the call.</div>
                            </div>
                            <div className="vc-chat-input-wrap">
                                <input type="text" placeholder="Type a message..." />
                                <button className="btn-circle" style={{ width: '46px', height: '46px', background: '#2B7FFF' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinejoin="round" /></svg></button>
                            </div>
                        </div>
                    </div>

                    <div className="vc-call-controls">
                        <button className="btn-circle bg-gray" title="Mute Audio">🎤</button>
                        <button className="btn-circle bg-gray" title="Stop Video">📹</button>
                        <button className="btn-circle bg-red" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }} onClick={handleEndCall} title="End Call">📞</button>
                        <button className="btn-circle bg-gray" title="Share Screen">💻</button>
                        <button className="btn-circle bg-gray" title="Attach Document">📎</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const domNode = document.getElementById('vc-react-root');
const root = ReactDOM.createRoot(domNode);
root.render(<VideoConsultationPage />);
