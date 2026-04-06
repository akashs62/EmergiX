const { useState, useEffect, useMemo } = React;
const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : 'http://127.0.0.1:3000'; // Global config for API base, defaulting to hitting the backend explicitly if config is missing

const VideoConsultationPage = () => {
    const [doctors, setDoctors] = useState([]);
    const [search, setSearch] = useState('');
    const [specFilter, setSpecFilter] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [modalUI, setModalUI] = useState(null); // 'booking', 'payment', 'call'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form
    const [consultType, setConsultType] = useState('instant');
    const [dateTime, setDateTime] = useState('');
    const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', symptoms: '' });

    // Call UI State
    const [callTime, setCallTime] = useState(0);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        // Stripe has been removed, Razorpay handles payments via overlay so no redirect checks are needed
    }, []);
    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`${API_Base}/api/doctors`)
            .then(res => {
                if (!res.ok) throw new Error(`Server responded with ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    setDoctors(data.data);
                } else {
                    throw new Error(data.error || 'Failed to load doctors');
                }
            })
            .catch(err => {
                console.error('Failed to load doctors:', err);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, []);

    const availableCount = doctors.filter(doc => doc.status === 'Available').length;

    const filteredDocs = useMemo(() => {
        let res = [...doctors];
        if (search) {
            const q = search.toLowerCase();
            res = res.filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
        }
        if (specFilter) res = res.filter(d => d.specialization === specFilter);

        if (sortBy === 'price') res.sort((a, b) => a.fee - b.fee);
        if (sortBy === 'experience') res.sort((a, b) => b.experience - a.experience);
        if (sortBy === 'availability') res.sort((a, b) => (a.status === 'Available' ? -1 : 1));

        return res;
    }, [search, specFilter, sortBy, doctors]);

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
        setPatientInfo({ name: '', phone: '', symptoms: '' });
        setConsultType('instant');
        setDateTime('');
        setModalUI('booking');
    };

    const handleRazorpayPayment = async () => {
        if (!selectedDoc) return;
        const effectiveFee = (selectedDoc.fee && selectedDoc.fee > 0) ? selectedDoc.fee : 500;
        setIsPaying(true);
        try {
            // 1. Create order on backend — use effectiveFee to guard against null/zero fee in DB
            const response = await fetch(`${API_Base}/api/razorpay/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: effectiveFee * 100, receipt: `doc_${selectedDoc.id}` }) 
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.error || 'Failed to create Razorpay order');

            if (result.order.isMock) {
                console.warn(result.message);
                setTimeout(() => setModalUI('call'), 800);
                return;
            }

            // 2. Open Razorpay Widget
            const options = {
                key: result.keyId || 'rzp_test_CHANGE_ME', // Dynamic from backend
                amount: result.order.amount,
                currency: result.order.currency,
                name: 'EmergiX Video Consult',
                description: `Consultation with ${selectedDoc.name}`,
                order_id: result.order.id,
                prefill: {
                    name: patientInfo.name,
                    contact: patientInfo.phone
                },
                handler: function (response) {
                    console.log("Consultation Payment Success:", response);
                    setModalUI('call'); // Transition directly to call without page refresh
                },
                theme: { color: '#0284C7' }
            };
            
            if (window.Razorpay) {
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    alert('Payment failed. Please try again.');
                });
                rzp.open();
            } else {
                alert('Razorpay SDK failed to load. Are you connected to the internet?');
            }
        } catch (err) {
            console.error('Payment Error:', err);
            alert('Payment initialization failed: ' + err.message);
        } finally {
            setIsPaying(false);
        }
    };

    const handleEndCall = () => {
        setModalUI('ended');
        setTimeout(() => {
            setModalUI(null);
            setSelectedDoc(null);
            setPatientInfo({ name: '', phone: '', symptoms: '' });
            setCallTime(0);
        }, 3500);
    };

    return (
        <div className="vc-container">
            {/* Post-call ended banner */}
            {modalUI === 'ended' && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: '#0F172A', zIndex: 10001,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', color: 'white'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✅</div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.75rem' }}>Consultation Ended</h2>
                    <p style={{ color: '#94A3B8', fontSize: '1rem' }}>Thank you! A prescription will be sent to your phone.</p>
                    <div style={{ marginTop: '1.5rem', width: '200px', height: '4px', background: '#1E293B', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#2EC4B6', animation: 'shrink 3.5s linear forwards', width: '100%' }}></div>
                    </div>
                    <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
                </div>
            )}
            {/* Header */}
            <div className="vc-header">
                <h1 className="vc-title">Video Consultation</h1>
                <p className="vc-subtitle">Connect face-to-face with top specialists instantly in HD.</p>
                <div className="vc-metrics">
                    <div className="vc-metric">
                        <strong>{availableCount}</strong>
                        <span>Doctors available for immediate consult</span>
                    </div>
                    <div className="vc-metric">
                        <strong>12 min</strong>
                        <span>Median handoff from booking to consult</span>
                    </div>
                    <div className="vc-metric">
                        <strong>4.8 / 5</strong>
                        <span>Average patient satisfaction across specialties</span>
                    </div>
                </div>
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

            <div className="vc-results-bar">
                <span>{filteredDocs.length} specialists matched your filters.</span>
                <span>Use Instant Connect for fast triage, or schedule when the case is stable.</span>
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    <div className="loader" style={{ margin: '0 auto 1rem' }}></div>
                    <p>Fetching specialists...</p>
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444', background: '#FEF2F2', borderRadius: '16px', border: '1px solid #FECACA' }}>
                    <p>⚠️ {error}</p>
                    <button className="vc-btn" onClick={() => window.location.reload()} style={{ marginTop: '1rem', background: '#fff' }}>Retry</button>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748B', background: '#F8FAFC', borderRadius: '24px', border: '2px dashed #E2E8F0' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
                    <h3 style={{ color: '#1E293B', marginBottom: '0.5rem' }}>No specialists found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            ) : (
                <div className="vc-grid">
                    {filteredDocs.map(doc => (
                        <div key={doc.id} className="vc-card">
                            <div className={`vc-status ${doc.status === 'Available' ? 'status-avail' : 'status-busy'}`}>
                                {doc.status}
                            </div>
                            <div className="vc-card-header">
                                <div className="vc-avatar">{doc.name ? doc.name.charAt(0).toUpperCase() : 'D'}</div>
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
                                onClick={() => handleConsult(doc)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                Book Consultation
                            </button>
                        </div>
                    ))}
                </div>
            )}

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

                                <button 
                                    className="vc-btn vc-btn-primary" 
                                    onClick={handleRazorpayPayment}
                                    disabled={isPaying}
                                    style={{ background: '#0284C7', borderColor: '#0284C7' }}
                                >
                                    {isPaying ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <div className="loader" style={{ width: '18px', height: '18px', borderSize: '2px' }}></div>
                                            Processing...
                                        </span>
                                    ) : (
                                        <>Pay & Connect with Razorpay</>
                                    )}
                                </button>
                                <div style={{ marginTop: '1rem', textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
                                    🔒 Secure payment powered by <strong>Razorpay</strong>
                                </div>
                                <button className="vc-btn" style={{ background: 'transparent', color: '#64748B', marginTop: '0.5rem' }} onClick={() => setModalUI('booking')}>Back</button>
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
