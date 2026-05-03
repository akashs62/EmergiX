/**
 * EmergiX — Video Consultation (Patient Side)
 * Real WebRTC peer-to-peer video call via WebSocket signaling.
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : 'http://127.0.0.1:3000';

// ─── ICE Config ───────────────────────────────────────────────────────────────
const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ─── WebRTC Manager (Patient) ─────────────────────────────────────────────────
class PatientWebRTC {
    constructor({ roomId, onRemoteStream, onStatusChange, onChatMessage, onPeerLeft }) {
        this.roomId = roomId;
        this.onRemoteStream = onRemoteStream;
        this.onStatusChange = onStatusChange;
        this.onChatMessage = onChatMessage;
        this.onPeerLeft = onPeerLeft;
        this.pc = null;
        this.ws = null;
        this.localStream = null;
        this._pendingCandidates = [];
    }

    async start() {
        this.onStatusChange('Accessing camera & microphone...');
        // Get local media
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.onStatusChange('Waiting for doctor to join...');

        // Set up WebSocket accurately
        let wsBase = API_Base.replace(/^https/, 'wss').replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/ws?roomId=${this.roomId}&role=patient`;
        console.log('[Patient] Connecting to WS:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => console.log('[Patient] WS connected');
        this.ws.onmessage = (e) => this._handleSignal(JSON.parse(e.data));
        this.ws.onerror = (e) => console.error('[Patient] WS error', e);
        this.ws.onclose = () => console.log('[Patient] WS closed');

        return this.localStream;
    }

    _createPeerConnection() {
        const pc = new RTCPeerConnection(ICE_CONFIG);
        this.pc = pc;

        // Add local tracks
        this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

        // ICE candidates
        pc.onicecandidate = ({ candidate }) => {
            if (candidate && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ice-candidate', candidate }));
            }
        };

        // Remote stream
        pc.ontrack = ({ streams }) => {
            if (streams && streams[0]) this.onRemoteStream(streams[0]);
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === 'connected') this.onStatusChange('connected');
            if (state === 'disconnected' || state === 'failed') this.onStatusChange('disconnected');
        };

        return pc;
    }

    async _handleSignal(msg) {
        switch (msg.type) {
            case 'joined':
                console.log('[Patient] Joined room');
                break;
            case 'peer-joined':
                this.onStatusChange('Doctor joined — connecting...');
                if (!this.pc) this._createPeerConnection();
                // Drain any buffered ICE candidates
                break;
            case 'offer':
                // Doctor sent offer — patient answers
                if (!this.pc) this._createPeerConnection();
                await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                // Drain pending candidates
                for (const c of this._pendingCandidates) {
                    await this.pc.addIceCandidate(new RTCIceCandidate(c));
                }
                this._pendingCandidates = [];
                const answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);
                this.ws.send(JSON.stringify({ type: 'answer', sdp: this.pc.localDescription }));
                this.onStatusChange('Call connected');
                break;
            case 'ice-candidate':
                if (this.pc && this.pc.remoteDescription) {
                    await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                } else {
                    this._pendingCandidates.push(msg.candidate);
                }
                break;
            case 'chat':
                this.onChatMessage({ from: 'Doctor', text: msg.text });
                break;
            case 'peer-left':
                this.onPeerLeft();
                break;
            case 'end-call':
                this.onPeerLeft();
                break;
            default:
                break;
        }
    }

    sendChat(text) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'chat', text }));
        }
    }

    toggleMute(muted) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(t => { t.enabled = !muted; });
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'toggle-audio', muted }));
        }
    }

    toggleVideo(videoOff) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(t => { t.enabled = !videoOff; });
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'toggle-video', videoOff }));
        }
    }

    endCall() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'end-call' }));
        }
        this.destroy();
    }

    destroy() {
        if (this.pc) { this.pc.close(); this.pc = null; }
        if (this.ws) { this.ws.close(); this.ws = null; }
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const VideoConsultationPage = () => {
    const [doctors, setDoctors] = useState([]);
    const [search, setSearch] = useState('');
    const [specFilter, setSpecFilter] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [modalUI, setModalUI] = useState(null); // 'booking' | 'payment' | 'call' | 'ended'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [consultType, setConsultType] = useState('instant');
    const [dateTime, setDateTime] = useState('');
    const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', symptoms: '' });
    const [isPaying, setIsPaying] = useState(false);
    const [callTime, setCallTime] = useState(0);
    const [feedback, setFeedback] = useState({ rating: 0, quality: '', satisfied: '', comments: '' });

    // WebRTC state
    const [roomId, setRoomId] = useState(null);
    const [callStatus, setCallStatus] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [remoteVideoOff, setRemoteVideoOff] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [callConnected, setCallConnected] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const webrtcRef = useRef(null);
    const chatEndRef = useRef(null);

    // Fetch doctors
    // Fetch doctors (Initial + Background polling)
    useEffect(() => {
        const fetchDocs = (isInitial = false) => {
            if (isInitial) setLoading(true);
            fetch(`${API_Base}/api/doctors`)
                .then(res => {
                    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        // Only update if state actually changed to avoid unnecessary re-renders
                        setDoctors(prev => JSON.stringify(prev) !== JSON.stringify(data.data) ? data.data : prev);
                    }
                    else throw new Error(data.error || 'Failed to load doctors');
                })
                .catch(err => { if (isInitial) setError(err.message); })
                .finally(() => { if (isInitial) setLoading(false); });
        };

        fetchDocs(true); // Initial load
        const interval = setInterval(() => fetchDocs(false), 5000); // Background poll
        return () => clearInterval(interval);
    }, []);

    // Call timer
    useEffect(() => {
        let interval = null;
        if (modalUI === 'call' && callConnected) {
            interval = setInterval(() => setCallTime(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [modalUI, callConnected]);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Cleanup WebRTC on unmount
    useEffect(() => {
        return () => { if (webrtcRef.current) webrtcRef.current.destroy(); };
    }, []);

    const availableCount = doctors.filter(d => d.status === 'Available').length;

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

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleConsult = (doc) => {
        setSelectedDoc(doc);
        const storedName = localStorage.getItem('userName') || '';
        setPatientInfo({ name: storedName, phone: '', symptoms: '' });
        setConsultType('instant');
        setDateTime('');
        setModalUI('booking');
    };

    const handleRazorpayPayment = async () => {
        if (!selectedDoc) return;
        const effectiveFee = (selectedDoc.fee && selectedDoc.fee > 0) ? selectedDoc.fee : 500;
        setIsPaying(true);
        try {
            const response = await fetch(`${API_Base}/api/razorpay/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: effectiveFee * 100, receipt: `doc_${selectedDoc.id}` })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to create Razorpay order');

            const onPaymentSuccess = async () => {
                // Create a video room
                const roomRes = await fetch(`${API_Base}/api/rooms/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ doctorId: selectedDoc.id, patientName: patientInfo.name })
                });
                const roomData = await roomRes.json();
                if (!roomRes.ok) throw new Error('Failed to create call room');
                setRoomId(roomData.roomId);
                setModalUI('call');
                startWebRTC(roomData.roomId);
            };

            if (result.order && result.order.isMock) {
                console.warn(result.message);
                setTimeout(onPaymentSuccess, 300);
                return;
            }

            const options = {
                key: result.keyId || 'rzp_test_CHANGE_ME',
                amount: result.order.amount,
                currency: result.order.currency,
                name: 'EmergiX Video Consult',
                description: `Consultation with ${selectedDoc.name}`,
                order_id: result.order.id,
                prefill: { name: patientInfo.name, contact: patientInfo.phone },
                handler: async (response) => {
                    try {
                        setIsPaying(true);
                        // If it's a mock order, skip verification API call
                        if (result.order && result.order.isMock) {
                            await onPaymentSuccess();
                            return;
                        }

                        // Verify Signature via Backend
                        const verifyRes = await fetch(`${API_Base}/api/razorpay/verify-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        
                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');
                        
                        // Verification successful -> proceed
                        await onPaymentSuccess();
                    } catch (err) {
                        console.error('Verification Error:', err);
                        alert('Payment verification failed. Please contact support.');
                    } finally {
                        setIsPaying(false);
                    }
                },
                theme: { color: '#0284C7' }
            };

            if (window.Razorpay) {
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (response) => {
                    alert('Payment failed: ' + response.error.description);
                });
                rzp.open();
            } else {
                alert('Razorpay SDK failed to load.');
            }
        } catch (err) {
            console.error('Payment Error:', err);
            alert('Payment initialization failed: ' + err.message);
        } finally {
            setIsPaying(false);
        }
    };

    const startWebRTC = useCallback(async (rid) => {
        setCallStatus('Initializing...');
        setCallTime(0);
        setChatMessages([]);
        setCallConnected(false);

        const manager = new PatientWebRTC({
            roomId: rid,
            onRemoteStream: (stream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;
                    remoteVideoRef.current.play().catch(() => {});
                }
                setCallConnected(true);
            },
            onStatusChange: (status) => {
                setCallStatus(status);
                if (status === 'connected' || status === 'Call connected') setCallConnected(true);
            },
            onChatMessage: (msg) => setChatMessages(prev => [...prev, msg]),
            onPeerLeft: () => {
                setCallStatus('Doctor left the call');
                setCallConnected(false);
                handleEndCall();
            }
        });

        try {
            const localStream = await manager.start();
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
                localVideoRef.current.play().catch(() => {});
            }
            webrtcRef.current = manager;
        } catch (err) {
            console.error('WebRTC start failed:', err);
            setCallStatus('Camera/mic access denied. Check browser permissions.');
        }
    }, []);

    const handleEndCall = () => {
        if (webrtcRef.current) {
            webrtcRef.current.endCall();
            webrtcRef.current = null;
        }
        // Clean up video elements immediately
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

        setCallConnected(false);
        setModalUI('ended');

        // Transition to feedback after the "Ended" banner
        setTimeout(() => {
            setModalUI('feedback');
        }, 3500);
    };

    const handleFeedbackSubmit = () => {
        console.log('[Consultation Feedback]', feedback);
        // Reset everything and return to home view
        setModalUI(null);
        setSelectedDoc(null);
        setRoomId(null);
        setCallStatus('');
        setCallTime(0);
        setFeedback({ rating: 0, quality: '', satisfied: '', comments: '' });
        alert('Thank you for your feedback! It helps us improve our service.');
    };

    const handleMuteToggle = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (webrtcRef.current) webrtcRef.current.toggleMute(newMuted);
    };

    const handleVideoToggle = () => {
        const newOff = !isVideoOff;
        setIsVideoOff(newOff);
        if (webrtcRef.current) webrtcRef.current.toggleVideo(newOff);
    };

    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        const msg = { from: 'You', text: chatInput.trim() };
        setChatMessages(prev => [...prev, msg]);
        if (webrtcRef.current) webrtcRef.current.sendChat(chatInput.trim());
        setChatInput('');
    };

    const copyRoomId = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId).then(() => {
                // Visual feedback handled by button state in render
            });
        }
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
                    <p style={{ color: '#94A3B8', fontSize: '1rem' }}>Thank you! Duration: {formatTime(callTime)}</p>
                    <div style={{ marginTop: '1.5rem', width: '200px', height: '4px', background: '#1E293B', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#2EC4B6', animation: 'shrink 3.5s linear forwards', width: '100%' }}></div>
                    </div>
                    <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
                </div>
            )}

            {/* Consultation Feedback Form */}
            {modalUI === 'feedback' && (
                <div className="vc-feedback-overlay">
                    <div className="vc-feedback-card">
                        <div className="vc-feedback-header">
                            <h2>Session Feedback</h2>
                            <p>How was your consultation with <strong>Dr. {selectedDoc?.name}</strong>?</p>
                        </div>

                        <div className="vc-rating-stars">
                            {[1, 2, 3, 4, 5].map(star => (
                                <span 
                                    key={star} 
                                    className={`vc-star ${feedback.rating >= star ? 'active' : ''}`}
                                    onClick={() => setFeedback({ ...feedback, rating: star })}
                                >
                                    ★
                                </span>
                            ))}
                        </div>

                        <div className="vc-feedback-q">
                            <label className="vc-feedback-label">How was the video & audio quality?</label>
                            <div className="vc-options-grid">
                                {['Excellent', 'Acceptable', 'Poor'].map(opt => (
                                    <div 
                                        key={opt}
                                        className={`vc-option ${feedback.quality === opt ? 'selected' : ''}`}
                                        onClick={() => setFeedback({ ...feedback, quality: opt })}
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="vc-feedback-q">
                            <label className="vc-feedback-label">Did the doctor address all your concerns?</label>
                            <div className="vc-options-grid">
                                {['Yes', 'Partially', 'No'].map(opt => (
                                    <div 
                                        key={opt}
                                        className={`vc-option ${feedback.satisfied === opt ? 'selected' : ''}`}
                                        onClick={() => setFeedback({ ...feedback, satisfied: opt })}
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="vc-feedback-q">
                            <label className="vc-feedback-label">Additional Comments (Optional)</label>
                            <textarea 
                                className="vc-feedback-textarea" 
                                placeholder="Any suggestions to help us improve..."
                                value={feedback.comments}
                                onChange={e => setFeedback({ ...feedback, comments: e.target.value })}
                            ></textarea>
                        </div>

                        <button 
                            className="vc-submit-btn" 
                            disabled={!feedback.rating || !feedback.quality || !feedback.satisfied}
                            onClick={handleFeedbackSubmit}
                        >
                            Submit Feedback
                        </button>
                    </div>
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

            {/* Doctor Grid */}
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
                            <div className={`vc-status ${doc.status === 'Available' ? 'status-avail' : doc.status === 'Busy' ? 'status-busy' : 'status-inactive'}`}>
                                {doc.status || 'Inactive'}
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
                                disabled={doc.status === 'Inactive'}
                                style={{ opacity: doc.status === 'Inactive' ? 0.5 : 1, cursor: doc.status === 'Inactive' ? 'not-allowed' : 'pointer' }}
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

            {/* Booking / Payment Modal */}
            {(modalUI === 'booking' || modalUI === 'payment') && (
                <div className="modal-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-box" style={{ maxWidth: '550px' }}>
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
                                    <button className="vc-btn vc-btn-primary" disabled={!patientInfo.name || !patientInfo.phone} onClick={() => setModalUI('payment')}>
                                        Proceed to Payment — ₹{selectedDoc.fee}
                                    </button>
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
                                <button className="vc-btn vc-btn-primary" onClick={handleRazorpayPayment} disabled={isPaying} style={{ background: '#0284C7', borderColor: '#0284C7' }}>
                                    {isPaying ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <div className="loader" style={{ width: '18px', height: '18px' }}></div>
                                            Processing...
                                        </span>
                                    ) : <>Pay & Connect with Razorpay</>}
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

            {/* ── REAL VIDEO CALL SCREEN ── */}
            {modalUI === 'call' && (
                <div className="vc-call-screen">
                    {/* Header */}
                    <div className="vc-call-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className={`vc-live-dot ${callConnected ? 'live' : 'waiting'}`}></div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedDoc && selectedDoc.name}</div>
                                <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>{selectedDoc && selectedDoc.specialization}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {roomId && (
                                <button onClick={copyRoomId} className="vc-btn" style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', cursor: 'pointer' }} title="Copy Room ID">
                                    Copy Room ID
                                </button>
                            )}
                            <div className="vc-call-status-badge">{callStatus || 'Connecting...'}</div>
                            {callConnected && (
                                <div className="vc-timer">
                                    <span style={{ color: '#2EC4B6', marginRight: '6px' }}>●</span>{formatTime(callTime)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Call Body */}
                    <div className="vc-call-body">
                        {/* Main video area */}
                        <div className="vc-video-main">
                            {/* Remote (Doctor) video — full size */}
                            <video
                                ref={remoteVideoRef}
                                className="vc-video-stream remote"
                                autoPlay
                                playsInline
                                style={{ display: callConnected ? 'block' : 'none' }}
                            />
                            {/* Waiting overlay */}
                            {!callConnected && (
                                <div className="vc-waiting-overlay">
                                    <div className="vc-pulse-ring"></div>
                                    <div className="vc-doc-avatar-large">{selectedDoc && selectedDoc.name.charAt(0)}</div>
                                    <p className="vc-waiting-text">{callStatus || 'Waiting for doctor to join...'}</p>
                                    <div className="vc-status-message">
                                        Waiting for the doctor to join...
                                    </div>
                                </div>
                            )}
                            {/* Doctor name label */}
                            {callConnected && (
                                <div className="vc-stream-label remote-label">
                                    {remoteVideoOff ? '🎥 Doc camera off' : `Dr. ${selectedDoc && selectedDoc.name}`}
                                </div>
                            )}

                            {/* Local (Patient) PiP video */}
                            <div className="vc-video-patient">
                                <video
                                    ref={localVideoRef}
                                    className="vc-video-stream local"
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ display: isVideoOff ? 'none' : 'block' }}
                                />
                                {isVideoOff && (
                                    <div className="vc-cam-off-placeholder">
                                        <span style={{ fontSize: '1.8rem' }}>👤</span>
                                        <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '4px' }}>Cam Off</span>
                                    </div>
                                )}
                                <div className="vc-stream-label local-label">You</div>
                            </div>
                        </div>

                        {/* Chat Sidebar */}
                        <div className="vc-call-sidebar">
                            <div className="vc-chat-header">💬 Consultation Chat</div>
                            <div className="vc-chat-body">
                                {chatMessages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.85rem', padding: '16px' }}>
                                        {callConnected ? 'Doctor has joined. Chat is live.' : 'Chat will be active once the doctor joins.'}
                                    </div>
                                ) : (
                                    chatMessages.map((msg, i) => (
                                        <div key={i} className={`vc-chat-msg ${msg.from === 'You' ? 'mine' : 'theirs'}`}>
                                            <span className="vc-chat-sender">{msg.from}</span>
                                            <span className="vc-chat-text">{msg.text}</span>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="vc-chat-input-wrap">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                    disabled={!callConnected}
                                />
                                <button className="btn-circle" style={{ width: '46px', height: '46px', background: '#2B7FFF' }} onClick={handleSendChat} disabled={!callConnected}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinejoin="round" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Call Controls */}
                    <div className="vc-call-controls">
                        <button
                            className={`btn-circle ${isMuted ? 'bg-active' : 'bg-gray'}`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                            onClick={handleMuteToggle}
                        >
                            {isMuted ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 1a4 4 0 014 4v5a4 4 0 01-8 0V5a4 4 0 014-4z" fill="white" opacity="0.4"/><line x1="3" y1="3" x2="21" y2="21" stroke="white" strokeWidth="2.5"/></svg>
                            ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 1a4 4 0 014 4v5a4 4 0 01-8 0V5a4 4 0 014-4z" fill="white"/><path d="M19 10a7 7 0 01-14 0" stroke="white" strokeWidth="2"/><line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="2"/></svg>
                            )}
                        </button>
                        <button
                            className={`btn-circle ${isVideoOff ? 'bg-active' : 'bg-gray'}`}
                            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                            onClick={handleVideoToggle}
                        >
                            {isVideoOff ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M16 3H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z" fill="white" opacity="0.4"/><path d="M22 8.5l-4 3 4 3V8.5z" fill="white" opacity="0.4"/><line x1="3" y1="3" x2="21" y2="21" stroke="white" strokeWidth="2.5"/></svg>
                            ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M16 3H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z" fill="white"/><path d="M22 8.5l-4 3 4 3V8.5z" fill="white"/></svg>
                            )}
                        </button>
                        <button className="btn-circle bg-red" style={{ width: '64px', height: '64px' }} onClick={handleEndCall} title="End Call">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C9.6 21 3 14.4 3 6c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="white"/></svg>
                        </button>
                        <button className="btn-circle bg-gray" title="Share Screen" onClick={() => alert('Screen sharing requires HTTPS. Available in production.')}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2"/></svg>
                        </button>
                        <button className="btn-circle bg-gray" title="Attach Document" onClick={() => alert('Document sharing available during call.')}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const domNode = document.getElementById('vc-react-root');
const root = ReactDOM.createRoot(domNode);
root.render(<VideoConsultationPage />);
