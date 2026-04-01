const { useState, useEffect } = React;
const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : '';

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
        name: '', phone: '', location: '', type: 'other', ambType: 'BLS', weight: '', helper: false
    });
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectError, setDetectError] = useState(null);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setDetectError('Geolocation not supported');
            return;
        }

        setIsDetecting(true);
        setDetectError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    const address = data.display_name || `${latitude}, ${longitude}`;
                    setFormData(prev => ({ ...prev, location: address }));
                } catch (err) {
                    setFormData(prev => ({ ...prev, location: `${latitude}, ${longitude}` }));
                } finally {
                    setIsDetecting(false);
                }
            },
            (err) => {
                setDetectError('Failed to get location');
                setIsDetecting(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    useEffect(() => {
        detectLocation();
    }, []);

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

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="ad-form-group" style={{ flex: 2 }}>
                            <label className="ad-label">Contact Number</label>
                            <input className="ad-input" type="tel" placeholder="+91" required
                                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="ad-form-group" style={{ flex: 1 }}>
                            <label className="ad-label">Patient Weight (kg)</label>
                            <input className="ad-input" type="number" placeholder="e.g. 70"
                                value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
                        </div>
                    </div>

                    <div className="ad-form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="ad-label">Current Location {isDetecting && <span style={{ color: '#2563EB', fontSize: '0.75rem', fontWeight: 400 }}>— Searching...</span>}</label>
                            <button type="button" onClick={detectLocation} disabled={isDetecting} 
                                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}>
                                <span>🔄</span> Refresh
                            </button>
                        </div>
                        <input className="ad-input" type="text" placeholder={isDetecting ? "Detecting location..." : "Your address here..."} required
                            value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        {detectError && <div style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>{detectError}</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
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

                    <div className="ad-form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="ad-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <input type="checkbox" checked={formData.helper} onChange={e => setFormData({ ...formData, helper: e.target.checked })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                            <div>
                                <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>Is Helper Needed?</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Check if an additional assistant is required for lifting/moving the patient.</div>
                            </div>
                        </label>
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

// Next-Gen Conversational AI Triage
const AIChatTriage = ({ onBack, onComplete }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        
        try {
            const apiBase = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : '';
            const res = await fetch(`${apiBase}/api/triage/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() })
            });
            const result = await res.json();
            
            if (res.ok && result.status === 'success') {
                onComplete(result.data);
            } else {
                throw new Error(result.error || 'Failed to analyze symptoms.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Network error analyzing symptoms. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ad-modal-wrap">
            <div className="ad-modal-header">
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{background: 'linear-gradient(135deg, #10B981, #2B7FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>AI Triage</span>
                        <span style={{fontSize: '0.7rem', padding: '2px 6px', background: '#EEF6FF', color: '#2B7FFF', borderRadius: '4px', fontWeight: 'bold'}}>✨ Powered by Gemini</span>
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Describe the emergency in your own words.</span>
                </div>
                <button className="ad-back-btn" onClick={onBack}>✕ Cancel</button>
            </div>
            <div className="ad-modal-body" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                    Our AI dispatcher will analyze your symptoms to determine the exact type of ambulance needed instantly.
                </p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '1rem' }}>
                    <textarea 
                        className="ad-input" 
                        style={{ flexGrow: 1, minHeight: '120px', resize: 'none', lineHeight: '1.5' }}
                        placeholder="E.g. My dad is clutching his chest, breathing heavily, and sweating profusely..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isLoading}
                    />
                    {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', padding: '0.5rem', background: '#FEF2F2', borderRadius: '6px' }}>{error}</div>}
                    <button type="submit" className="ad-btn ad-btn-primary" disabled={isLoading || !query.trim()} style={{ opacity: isLoading || !query.trim() ? 0.7 : 1, transition: 'all 0.2s', background: isLoading ? '#64748B' : '' }}>
                        {isLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <span className="ad-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                AI is analyzing...
                            </span>
                        ) : '✨ Analyze Symptoms'}
                    </button>
                </form>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

// ── Cancel Booking Component ──
const CANCEL_REASONS = [
    { id: 'not_needed', label: 'Ambulance is no longer needed' },
    { id: 'alternate', label: 'Found alternate transport (cab, personal vehicle)' },
    { id: 'mistake', label: 'Booked by mistake' }
];

const CancelBooking = ({ bookingData, onBack, onConfirmCancel }) => {
    const [selectedReason, setSelectedReason] = useState(null);
    const [confirming, setConfirming] = useState(false);

    const handleCancel = () => {
        if (!selectedReason) return;
        setConfirming(true);
        setTimeout(() => {
            onConfirmCancel(selectedReason);
        }, 1200);
    };

    return (
        <div className="ad-modal-wrap">
            <div className="ad-modal-header" style={{ background: '#DC2626' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Cancel Booking</h2>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{bookingData.id}</span>
                </div>
                <button className="ad-back-btn" onClick={onBack}>✕ Back</button>
            </div>
            <div className="ad-modal-body">
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>Why are you cancelling this booking?</p>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>Please select a reason to help us improve our services.</p>

                <div className="ad-cancel-reasons">
                    {CANCEL_REASONS.map(r => (
                        <label key={r.id} className={`ad-cancel-option ${selectedReason === r.id ? 'selected' : ''}`}
                            onClick={() => setSelectedReason(r.id)}>
                            <div className={`ad-cancel-radio ${selectedReason === r.id ? 'checked' : ''}`}>
                                {selectedReason === r.id && <div className="ad-cancel-radio-dot"></div>}
                            </div>
                            <span>{r.label}</span>
                        </label>
                    ))}
                </div>

                <button
                    className={`ad-btn ${selectedReason ? 'ad-btn-danger' : ''}`}
                    style={!selectedReason ? { background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed' } : {}}
                    disabled={!selectedReason || confirming}
                    onClick={handleCancel}>
                    {confirming ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
                <button className="ad-btn ad-btn-secondary" style={{ marginTop: '0.75rem' }} onClick={onBack}>
                    Go Back — Keep My Booking
                </button>
            </div>
        </div>
    );
};

const TrackingScreen = ({ bookingData, onHome, onCancel }) => {
    const [showMap, setShowMap] = useState(false);

    // Mock driver data attached to the booking
    const driverInfo = {
        name: 'Sunil Yadav',
        phone: '+919876511111',
        phoneDisplay: '+91 98765 11111',
        rating: 4.8,
        experience: '6 years'
    };

    useEffect(() => {
        if (!showMap) return;

        let map;
        let ambMarker;
        let animationFrameId;

        const patientLatLng = [22.57286, 88.36401]; // Kolkata center [lat, lng]
        const initialAmbLatLng = [22.55994, 88.35056];

        map = L.map('ambMapCanvas').setView(patientLatLng, 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OSM &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        // Patient marker
        const patientIcon = L.divIcon({
            className: 'emergi-marker',
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

        // Ambulance marker
        const ambIcon = L.divIcon({
            className: 'emergi-marker',
            html: `<div style="background:#2EC4B6; color:#fff; width:36px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 0 12px rgba(46,196,182,0.6);">🚑</div>`,
            iconSize: [36, 26],
            iconAnchor: [18, 13]
        });
        ambMarker = L.marker(initialAmbLatLng, { icon: ambIcon, zIndexOffset: 1000 }).addTo(map);

        let progress = 0;
        const animate = () => {
            progress += 0.008;
            const index = Math.floor(progress);

            if (index >= ambRoute.length - 1) {
                ambMarker.setLatLng(ambRoute[ambRoute.length - 1]);
                const etaEl = document.getElementById('ad-eta-display');
                if (etaEl) etaEl.innerText = 'Arrived';
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

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (map) map.remove();
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

                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', textAlign: 'left', marginBottom: '1.5rem' }}>
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

                {/* ── Driver Info Card ── */}
                <div className="ad-driver-card">
                    <div className="ad-driver-card-header">
                        <div className="ad-driver-avatar">{driverInfo.name.split(' ').map(n => n[0]).join('')}</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B' }}>{driverInfo.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>★ {driverInfo.rating} · {driverInfo.experience}</div>
                        </div>
                        <a href={`tel:${driverInfo.phone}`} className="ad-call-driver-btn" title="Call Driver">
                            <span className="ad-call-icon">📞</span>
                            Call Driver
                        </a>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.5rem' }}>Driver assigned to your ambulance</div>
                </div>

                {/* ── Action Buttons ── */}
                <button className="ad-btn ad-btn-primary" onClick={() => setShowMap(true)}>View Live Map</button>

                <button className="ad-btn ad-btn-cancel-outline" onClick={onCancel}>
                    Cancel Booking
                </button>

                <button className="ad-btn" style={{ background: 'transparent', color: '#94A3B8', marginTop: '0.5rem' }} onClick={onHome}>Close</button>
            </div>
        </div>
    );
};

const PaymentSelectionScreen = ({ onBack, onConfirm }) => {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const methods = [
        { id: 'razorpay', name: 'Razorpay (Cards, UPI, NetBanking)', icon: '⚡', desc: 'Secure online payment', color: '#3395FF' },
        { id: 'cod', name: 'Cash on Delivery', icon: '💵', desc: 'Pay directly to the driver', color: '#F59E0B' }
    ];

    const handleSubmit = async () => {
        if (!selectedMethod) return;
        setIsProcessing(true);

        if (selectedMethod === 'razorpay') {
            try {
                // 1. Create order on backend
                const response = await fetch(`${API_Base}/api/razorpay/create-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 999 * 100 }) // 999 INR in paise
                });
                const result = await response.json();
                
                if (!response.ok) throw new Error(result.error || 'Failed to create order');

                if (result.order.isMock) {
                    // Fallback if keys are placeholders
                    console.warn(result.message);
                    setTimeout(() => onConfirm('razorpay'), 800);
                    return;
                }

                // 2. Open Razorpay Widget
                const options = {
                    key: result.keyId || 'rzp_test_CHANGE_ME', // Dynamic from backend
                    amount: result.order.amount,
                    currency: result.order.currency,
                    name: 'EmergiX Dispatch',
                    description: 'Ambulance Booking Fee',
                    order_id: result.order.id,
                    handler: function (response) {
                        // Payment successful
                        console.log("Payment Success:", response);
                        onConfirm('razorpay');
                    },
                    theme: { color: '#0284C7' }
                };
                
                if (window.Razorpay) {
                    const rzp = new window.Razorpay(options);
                    rzp.on('payment.failed', function (response) {
                        alert('Payment failed. Please try again or use Cash on Delivery.');
                        setIsProcessing(false);
                    });
                    rzp.open();
                } else {
                    alert('Razorpay SDK failed to load.');
                    setIsProcessing(false);
                }
            } catch (err) {
                console.error("Razorpay Error:", err);
                alert("Could not initialize Razorpay. Please try again.");
                setIsProcessing(false);
            }
        } else {
            // Cash on delivery flow
            setTimeout(() => {
                onConfirm(selectedMethod);
            }, 800);
        }
    };

    return (
        <div className="ad-modal-wrap" style={{ background: '#fff' }}>
            <div className="ad-modal-header" style={{ background: '#0F172A', color: 'white' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Select Payment Method</h2>
                    <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Secure Checkout</span>
                </div>
                <button className="ad-back-btn" onClick={onBack}>✕ Back</button>
            </div>
            
            <div className="ad-modal-body">
                <div style={{ marginBottom: '1.5rem', background: '#EEF6FF', padding: '1rem', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                    <div style={{ color: '#0284C7', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💰</span> Estimated Dispatch Fee: <strong>₹999</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Final amount may vary based on distance.</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {methods.map(m => (
                        <div 
                            key={m.id} 
                            onClick={() => setSelectedMethod(m.id)}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                padding: '1.25rem', 
                                borderRadius: '12px', 
                                border: `2px solid ${selectedMethod === m.id ? m.color : '#E2E8F0'}`,
                                background: selectedMethod === m.id ? `${m.color}11` : '#F8FAFC',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontSize: '1.8rem', marginRight: '1rem' }}>{m.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '1.05rem' }}>{m.name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{m.desc}</div>
                            </div>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${selectedMethod === m.id ? m.color : '#CBD5E1'}`, background: selectedMethod === m.id ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {selectedMethod === m.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'white' }} />}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '2.5rem' }}>
                    <button 
                        className={`ad-btn ${selectedMethod ? 'ad-btn-primary' : ''}`}
                        style={!selectedMethod ? { background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed' } : {}}
                        disabled={!selectedMethod || isProcessing}
                        onClick={handleSubmit}
                    >
                        {isProcessing ? 'Processing Securely...' : 'Confirm & Dispatch'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main App Component
const AmbulanceDispatchApp = () => {
    const [view, setView] = useState('home'); // home, direct, triage, result, payment, tracking, cancel, cancelled
    const [triageResult, setTriageResult] = useState(null);
    const [pendingBookingData, setPendingBookingData] = useState(null);
    const [bookingRef, setBookingRef] = useState(null);
    const [cancelReason, setCancelReason] = useState(null);

    const createBooking = async (details) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_Base}/api/bookings`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(details)
            });

            if (!response.ok) {
                throw new Error('Booking API failed');
            }

            const data = await response.json();
            const bookingId = data.bookingId || ('EMR-' + Math.floor(1000 + Math.random() * 9000));
            return { id: bookingId, ambType: details.ambType, vehicleId: `${details.ambType}-204` };
        } catch (error) {
            return {
                id: 'EMR-' + Math.floor(1000 + Math.random() * 9000),
                ambType: details.ambType,
                vehicleId: `${details.ambType}-204`
            };
        }
    };

    const handleDirectConfirm = async (data) => {
        setPendingBookingData({
            source: 'direct',
            patientName: data.name,
            contact: data.phone,
            location: data.location,
            emergencyType: data.type,
            ambType: data.ambType,
            patientWeight: data.weight,
            isHelperNeeded: data.helper
        });
        setView('payment');
    };

    const handleTriageComplete = (result) => {
        setTriageResult(result);
        setView('result');
    };

    const handleProceedFromTriage = async (ambType) => {
        setPendingBookingData({
            source: 'triage',
            severity: triageResult?.severity,
            reason: triageResult?.reason,
            ambType
        });
        setView('payment');
    };

    const handlePaymentConfirm = async (paymentMethod) => {
        const fullData = { ...pendingBookingData, paymentMethod };
        const booking = await createBooking(fullData);
        setBookingRef(booking);
        setView('tracking');
    };

    const handleCancelConfirm = (reasonId) => {
        const reason = CANCEL_REASONS.find(r => r.id === reasonId);
        setCancelReason(reason ? reason.label : 'Unknown');
        setView('cancelled');
    };

    return (
        <div className="ad-wrapper">

            {view === 'home' && (
                <>
                    <div className="ad-header">
                        <h1 className="ad-title">Ambulance Dispatch</h1>
                        <p className="ad-subtitle">Select your dispatch method. Every second counts.</p>
                        <div className="ad-hero-stats">
                            <div className="ad-hero-stat">
                                <strong>&lt; 60 sec</strong>
                                <span>Fastest triage path to dispatch</span>
                            </div>
                            <div className="ad-hero-stat">
                                <strong>ALS / BLS</strong>
                                <span>Unit assignment by severity and need</span>
                            </div>
                            <div className="ad-hero-stat">
                                <strong>Live ETA</strong>
                                <span>Track vehicle progress after confirmation</span>
                            </div>
                        </div>
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

            {view === 'triage' && <AIChatTriage onBack={() => setView('home')} onComplete={handleTriageComplete} />}

            {view === 'result' && <SeverityResult result={triageResult} onProceed={handleProceedFromTriage} />}

            {view === 'payment' && <PaymentSelectionScreen onBack={() => {
                if (pendingBookingData?.source === 'triage') setView('result');
                else setView('direct');
            }} onConfirm={handlePaymentConfirm} />}

            {view === 'tracking' && <TrackingScreen bookingData={bookingRef} onHome={() => setView('home')} onCancel={() => setView('cancel')} />}

            {view === 'cancel' && <CancelBooking bookingData={bookingRef} onBack={() => setView('tracking')} onConfirmCancel={handleCancelConfirm} />}

            {view === 'cancelled' && (
                <div className="ad-modal-wrap">
                    <div className="ad-modal-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>✕</div>
                        <h2 style={{ color: '#1E293B', marginBottom: '0.5rem' }}>Booking Cancelled</h2>
                        <p style={{ color: '#64748B', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{bookingRef?.id} has been cancelled.</p>
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600, marginBottom: '0.25rem' }}>Reason</div>
                            <div style={{ fontSize: '0.95rem', color: '#1E293B' }}>{cancelReason}</div>
                        </div>
                        <button className="ad-btn ad-btn-primary" onClick={() => { setView('home'); setBookingRef(null); setCancelReason(null); }}>Back to Home</button>
                    </div>
                </div>
            )}

        </div>
    );
};

const domNode = document.getElementById('ad-react-root');
const root = ReactDOM.createRoot(domNode);
root.render(<AmbulanceDispatchApp />);
