const { useState, useEffect, useMemo } = React;
const API_Base = window.EmergiXConfig ? window.EmergiXConfig.API_BASE_URL : '';



const DoctorProfilePage = () => {
    const [doctor, setDoctor] = useState(null);
    const [showBooking, setShowBooking] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [patientDetails, setPatientDetails] = useState({ name: '', age: '', sex: '', symptoms: '' });
    const [bookingState, setBookingState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [confirmedId, setConfirmedId] = useState(null);

    // Instant consult payment + call state
    const [showPayModal, setShowPayModal] = useState(false);
    const [instantPatient, setInstantPatient] = useState({ name: '', phone: '', symptoms: '' });
    const [isPaying, setIsPaying] = useState(false);
    const [callActive, setCallActive] = useState(false);
    const [callTime, setCallTime] = useState(0);
    const [callEnded, setCallEnded] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            fetch(`${API_Base}/api/doctors/${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        setDoctor(data.data);
                    }
                })
                .catch(err => console.error('Error fetching doctor:', err));
        }

        // Dynamically load Razorpay SDK if not present
        if (!window.Razorpay) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            document.head.appendChild(script);
        }
    }, []);

    // Call timer
    useEffect(() => {
        let interval = null;
        if (callActive) {
            interval = setInterval(() => setCallTime(prev => prev + 1), 1000);
        } else {
            setCallTime(0);
            if (interval) clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [callActive]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleInstantConsultPayment = async () => {
        if (!doctor) return;
        const effectiveFee = (doctor.fee && doctor.fee > 0) ? doctor.fee : 500;
        setIsPaying(true);
        try {
            const response = await fetch(`${API_Base}/api/razorpay/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: effectiveFee * 100, receipt: `consult_${doctor.id}` })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to create order');

            if (result.order.isMock) {
                // Mock mode — skip Razorpay widget and go straight to call
                console.warn('Using mock payment:', result.message);
                setShowPayModal(false);
                setTimeout(() => setCallActive(true), 400);
                return;
            }

            const options = {
                key: result.keyId,
                amount: result.order.amount,
                currency: result.order.currency,
                name: 'EmergiX Video Consult',
                description: `Instant consultation with ${doctor.name}`,
                order_id: result.order.id,
                prefill: { name: instantPatient.name, contact: instantPatient.phone },
                handler: async function (response) {
                    try {
                        console.log('Payment success, verifying signature...');
                        if (result.order && result.order.isMock) {
                            setShowPayModal(false);
                            setTimeout(() => setCallActive(true), 400);
                            return;
                        }
                        
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
                        
                        setShowPayModal(false);
                        setTimeout(() => setCallActive(true), 400);
                    } catch (err) {
                        console.error('Verification Error:', err);
                        alert('Payment verification failed. Please contact support.');
                    }
                },
                theme: { color: '#2B7FFF' }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
                alert('Payment failed: ' + response.error.description);
            });
            rzp.open();
        } catch (err) {
            console.error('Payment error:', err);
            alert('Payment initialization failed: ' + err.message);
        } finally {
            setIsPaying(false);
        }
    };

    const handleEndCall = () => {
        setCallActive(false);
        setCallEnded(true);
        setTimeout(() => {
            setCallEnded(false);
            setCallTime(0);
            setInstantPatient({ name: '', phone: '', symptoms: '' });
        }, 3500);
    };

    const dates = useMemo(() => {
        const ds = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i + 1); // Next 7 days
            ds.push({
                fullTimestamp: d.getTime(),
                dayStr: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dateStr: d.getDate(),
                isAvailable: d.getDay() !== 0 // Sunday (0) is disabled
            });
        }
        return ds;
    }, []);

    const timeSlots = ["09:00 AM", "10:30 AM", "01:00 PM", "03:00 PM", "05:00 PM"];

    if (!doctor) return <div style={{ padding: '80px', textAlign: 'center', fontSize: '1.2rem' }}>Loading doctor profile...</div>;

    const isAvailable = doctor.status === "Available";

    return (
        <>
        <div className="dp-container" style={{ maxWidth: '1000px', margin: '60px auto', padding: '0 24px', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                .glow-btn-primary {
                    animation: glow-primary 2.5s ease-in-out infinite alternate;
                }
                @keyframes glow-primary {
                    from { box-shadow: 0 4px 14px rgba(43, 127, 255, 0.4); }
                    to { box-shadow: 0 4px 28px rgba(43, 127, 255, 0.85); }
                }
                
                .glow-btn-secondary {
                    animation: glow-secondary 2.5s ease-in-out infinite alternate;
                    animation-delay: 1.25s;
                }
                @keyframes glow-secondary {
                    from { box-shadow: 0 4px 14px rgba(39, 174, 96, 0.2); }
                    to { box-shadow: 0 4px 28px rgba(39, 174, 96, 0.5); }
                }

                .btn-disabled {
                    background: #E2E8F0 !important;
                    color: #94A3B8 !important;
                    cursor: not-allowed !important;
                    box-shadow: none !important;
                    animation: none !important;
                    border: none !important;
                }
                
                .dp-info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                }
                
                @media (max-width: 800px) {
                    .dp-info-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .dp-action-buttons {
                        flex-direction: column;
                    }
                }
                
                @media (max-width: 500px) {
                    .dp-info-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                .dashed-divider {
                    border-top: 1px dashed #E2E8F0;
                    margin: 32px 0;
                }

                .booking-slot-card {
                    border: 1.5px solid #E2E8F0;
                    border-radius: 12px;
                    padding: 12px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                }
                .booking-slot-card.available:hover {
                    border-color: #27AE60;
                    background: #F0FDF4;
                }
                .booking-slot-card.selected {
                    border-color: #27AE60;
                    background: #27AE60;
                    color: white !important;
                }
                .booking-slot-card.selected > div {
                    color: white !important;
                }
                .booking-slot-card.unavailable {
                    background: #F8FAFC;
                    border-color: #F1F5F9;
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .vc-input {
                    width: 100%;
                    padding: 14px;
                    border: 1px solid #E2E8F0;
                    border-radius: 12px;
                    font-size: 1rem;
                    color: #1E293B;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .vc-input:focus {
                    outline: none;
                    border-color: #2B7FFF;
                    box-shadow: 0 0 0 3px rgba(43, 127, 255, 0.15);
                }
            `}} />

            <a href="video-consultation.html" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748B', textDecoration: 'none', fontWeight: '500', marginBottom: '24px', fontSize: '0.95rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Search
            </a>

            <div className="dp-card" style={{ background: '#ffffff', borderRadius: '24px', padding: '36px', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.04)', border: '1px solid #F1F5F9' }}>

                {/* Doctor Bio Section */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#F0F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: '700', color: '#2B7FFF', border: '2px solid #E0E7FF' }}>
                        {doctor.name.split(' ')[1]?.charAt(0) || doctor.name.charAt(0)}
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                            <h1 style={{ margin: '0', fontSize: '1.75rem', color: '#0F172A', fontWeight: '800', letterSpacing: '-0.02em' }}>{doctor.name}</h1>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: isAvailable ? '#ECFDF5' : '#FEF2F2', color: isAvailable ? '#059669' : '#DC2626', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAvailable ? '#10B981' : '#EF4444' }}></div>
                                {isAvailable ? 'Available Now' : 'Currently Busy'}
                            </div>
                        </div>
                        <p style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#2B7FFF', fontWeight: '600', background: '#F0F5FF', display: 'inline-block', padding: '4px 12px', borderRadius: '6px' }}>{doctor.specialization}</p>

                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#64748B', fontSize: '0.95rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#F59E0B' }}>⭐</span> <span style={{ fontWeight: '600', color: '#334155' }}>{doctor.rating} / 5</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>⏳</span> <span style={{ fontWeight: '500' }}>{doctor.experience} Years Exp.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🗣️</span> <span style={{ fontWeight: '500' }}>{doctor.languages}</span>
                            </div>
                        </div>
                    </div>

                    {/* Price Reveal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px', borderLeft: '1px solid #E2E8F0', height: '96px' }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Consultation Fee</div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1E293B', lineHeight: '1' }}>₹{doctor.fee}</div>
                        </div>
                    </div>
                </div>

                <div className="dashed-divider"></div>

                {/* Buttons */}
                {!showBooking && (
                    <div className="dp-action-buttons" style={{ display: 'flex', gap: '16px' }}>
                        <button
                            className={`vc-btn vc-btn-primary ${isAvailable ? 'glow-btn-primary' : 'btn-disabled'}`}
                            disabled={!isAvailable}
                            style={{ flex: 1, padding: '18px', borderRadius: '12px', border: 'none', background: '#2B7FFF', color: 'white', fontWeight: '700', fontSize: '1.05rem', cursor: isAvailable ? 'pointer' : 'not-allowed', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            onClick={() => {
                                    setInstantPatient({ name: '', phone: '', symptoms: '' });
                                    setShowPayModal(true);
                                }}
                        >
                            {isAvailable && (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2.5" />
                                    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            )}
                            {isAvailable ? 'Consult Now' : 'Currently Unavailable'}
                        </button>

                        <button
                            className="vc-btn glow-btn-secondary"
                            style={{ flex: 1, padding: '18px', borderRadius: '12px', border: '1.5px solid #27AE60', background: '#F0FDF4', color: '#27AE60', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            onClick={() => setShowBooking(true)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            Book for Later
                        </button>
                    </div>
                )}

                {/* Booking Calendar Section UI */}
                {showBooking && (
                    <div style={{ animation: 'fadeIn 0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.4rem', color: '#0F172A', fontWeight: '800', margin: '0' }}>Schedule Consultation</h3>
                            <button onClick={() => setShowBooking(false)} style={{ background: '#F1F5F9', border: 'none', color: '#475569', cursor: 'pointer', padding: '8px 16px', borderRadius: '999px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg> Cancel
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                            {/* Left Column: Date and Time */}
                            <div style={{ flex: '1 1 340px', background: '#F8FAFC', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                                <h3 style={{ fontSize: '1.05rem', color: '#1E293B', fontWeight: '700', marginBottom: '16px' }}>1. Select Date</h3>
                                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', margin: '0 -4px', padding: '4px' }}>
                                    {dates.map((d, i) => {
                                        const isSelected = selectedDate === d.fullTimestamp;
                                        return (
                                            <div
                                                key={i}
                                                className={`booking-slot-card ${d.isAvailable ? 'available' : 'unavailable'} ${isSelected ? 'selected' : ''}`}
                                                style={{ minWidth: '76px', background: isSelected ? '#27AE60' : 'white' }}
                                                onClick={() => {
                                                    if (d.isAvailable) {
                                                        setSelectedDate(d.fullTimestamp);
                                                        setSelectedTime(null);
                                                    }
                                                }}
                                            >
                                                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: isSelected ? 'white' : (d.isAvailable ? '#64748B' : '#94A3B8'), textTransform: 'uppercase' }}>{d.dayStr}</div>
                                                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: isSelected ? 'white' : (d.isAvailable ? '#0F172A' : '#94A3B8'), marginTop: '4px' }}>{d.dateStr}</div>
                                                {!d.isAvailable && <div style={{ fontSize: '0.65rem', color: '#EF4444', marginTop: '6px', fontWeight: '700' }}>OFF</div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Time Slots Area */}
                                <div style={{ marginTop: '24px', animation: 'fadeIn 0.3s', opacity: selectedDate ? 1 : 0.4, pointerEvents: selectedDate ? 'auto' : 'none' }}>
                                    <h3 style={{ fontSize: '1.05rem', color: '#1E293B', fontWeight: '700', marginBottom: '16px' }}>2. Select Time</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                                        {timeSlots.map((time, idx) => {
                                            const isSelectedTime = selectedTime === time;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`booking-slot-card available ${isSelectedTime ? 'selected' : ''}`}
                                                    style={{ padding: '12px', fontSize: '1rem', fontWeight: '600', background: isSelectedTime ? '#27AE60' : 'white', color: isSelectedTime ? 'white' : '#1E293B' }}
                                                    onClick={() => setSelectedTime(time)}
                                                >
                                                    {time}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Patient Details */}
                            <div style={{ flex: '1 1 340px' }}>
                                <div style={{ opacity: (selectedDate && selectedTime) ? 1 : 0.4, pointerEvents: (selectedDate && selectedTime) ? 'auto' : 'none', transition: 'all 0.3s' }}>
                                    <h3 style={{ fontSize: '1.05rem', color: '#1E293B', fontWeight: '700', marginBottom: '16px' }}>3. Patient Details</h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <input type="text" className="vc-input" placeholder="Patient Full Name" required minLength="3"
                                                value={patientDetails.name} onChange={(e) => setPatientDetails({ ...patientDetails, name: e.target.value })} />
                                        </div>

                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <input type="number" className="vc-input" placeholder="Age" required min="1" max="120"
                                                    value={patientDetails.age} onChange={(e) => setPatientDetails({ ...patientDetails, age: e.target.value })} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <select className="vc-input" required value={patientDetails.sex} onChange={(e) => setPatientDetails({ ...patientDetails, sex: e.target.value })}>
                                                    <option value="" disabled>Select Sex</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <textarea className="vc-input" rows="3" placeholder="Briefly describe your symptoms/reason for visit..." required
                                                value={patientDetails.symptoms} onChange={(e) => setPatientDetails({ ...patientDetails, symptoms: e.target.value })}></textarea>
                                        </div>

                                        <button
                                            className="vc-btn glow-btn-secondary"
                                            disabled={!(patientDetails.name && patientDetails.age && patientDetails.sex && patientDetails.symptoms) || bookingState === 'loading' || bookingState === 'success'}
                                            style={{
                                                width: '100%', padding: '18px', borderRadius: '12px', border: 'none',
                                                background: bookingState === 'success' ? '#059669' : bookingState === 'error' ? '#DC2626' : (patientDetails.name && patientDetails.age && patientDetails.sex && patientDetails.symptoms) ? '#27AE60' : '#E2E8F0',
                                                color: (patientDetails.name && patientDetails.age && patientDetails.sex && patientDetails.symptoms) || bookingState !== 'idle' ? 'white' : '#94A3B8',
                                                fontWeight: '700', fontSize: '1.1rem', cursor: (patientDetails.name && patientDetails.age && patientDetails.sex && patientDetails.symptoms) && bookingState === 'idle' ? 'pointer' : 'not-allowed',
                                                transition: 'all 0.3s', marginTop: '8px'
                                            }}
                                            onClick={async () => {
                                                setBookingState('loading');
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const res = await fetch(`${API_Base}/api/appointments`, {
                                                        method: 'POST',
                                                        headers: { 
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${token}`
                                                        },
                                                        body: JSON.stringify({
                                                            doctorId: doctor.id,
                                                            patientName: patientDetails.name,
                                                            patientAge: parseInt(patientDetails.age),
                                                            patientSex: patientDetails.sex,
                                                            symptoms: patientDetails.symptoms,
                                                            appointmentDate: new Date(selectedDate).toISOString(),
                                                            appointmentTime: selectedTime
                                                        })
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        setConfirmedId(data.appointmentId);
                                                        setBookingState('success');
                                                    } else {
                                                        setBookingState('error');
                                                    }
                                                } catch {
                                                    setBookingState('error');
                                                }
                                            }}
                                        >
                                            {bookingState === 'loading' ? 'Confirming...' : bookingState === 'success' ? `✓ Booked — ${confirmedId}` : bookingState === 'error' ? 'Failed — Retry' : `Confirm Appointment • ₹${doctor.fee}`}
                                        </button>
                                        {(selectedDate && selectedTime) && !(patientDetails.name && patientDetails.age && patientDetails.sex && patientDetails.symptoms) && (
                                            <p style={{ fontSize: '0.8rem', color: '#DC2626', textAlign: 'center', margin: '0' }}>Please fill all patient details to confirm.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!isAvailable && !showBooking && (
                    <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.85rem', marginTop: '16px', marginBottom: '0' }}>
                        This doctor is currently attending another patient. Please schedule an appointment for later.
                    </p>
                )}
            </div>
        </div>

        {/* ── Instant Consult Payment Modal ──────────────────── */}
        {showPayModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)',
                zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}>
                <div style={{
                    background: 'white', borderRadius: '24px', padding: '2.5rem',
                    maxWidth: '480px', width: '100%', boxShadow: '0 32px 72px rgba(0,0,0,0.24)',
                    position: 'relative'
                }}>
                    <button onClick={() => setShowPayModal(false)} style={{
                        position: 'absolute', top: '20px', right: '20px',
                        background: '#F1F5F9', border: 'none', borderRadius: '50%',
                        width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>

                    <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.5rem', color: '#0F172A', fontWeight: '800' }}>Instant Consultation</h2>
                    <p style={{ color: '#64748B', margin: '0 0 1.5rem', fontSize: '0.95rem' }}>with <strong>{doctor.name}</strong> · {doctor.specialization}</p>

                    {/* Fee Summary */}
                    <div style={{
                        background: 'linear-gradient(135deg, #EEF6FF, #E0F2FE)',
                        border: '1px solid #BFDBFE', borderRadius: '16px',
                        padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consultation Fee</div>
                            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1E293B', lineHeight: '1.1', marginTop: '4px' }}>₹{doctor.fee}</div>
                        </div>
                        <div style={{ background: '#2B7FFF', color: 'white', padding: '10px 18px', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem' }}>1 Session</div>
                    </div>

                    {/* Patient Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                        <input
                            type="text" placeholder="Your Full Name"
                            value={instantPatient.name}
                            onChange={e => setInstantPatient({ ...instantPatient, name: e.target.value })}
                            style={{
                                padding: '13px 14px', border: '1.5px solid #E2E8F0', borderRadius: '12px',
                                fontSize: '1rem', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#2B7FFF'}
                            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        />
                        <input
                            type="tel" placeholder="Phone Number (+91...)"
                            value={instantPatient.phone}
                            onChange={e => setInstantPatient({ ...instantPatient, phone: e.target.value })}
                            style={{
                                padding: '13px 14px', border: '1.5px solid #E2E8F0', borderRadius: '12px',
                                fontSize: '1rem', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#2B7FFF'}
                            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        />
                        <textarea
                            rows="2" placeholder="Brief symptoms / reason for visit..."
                            value={instantPatient.symptoms}
                            onChange={e => setInstantPatient({ ...instantPatient, symptoms: e.target.value })}
                            style={{
                                padding: '13px 14px', border: '1.5px solid #E2E8F0', borderRadius: '12px',
                                fontSize: '1rem', fontFamily: 'inherit', outline: 'none', resize: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#2B7FFF'}
                            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        />
                    </div>

                    <button
                        disabled={!instantPatient.name || !instantPatient.phone || isPaying}
                        onClick={handleInstantConsultPayment}
                        style={{
                            width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                            background: (!instantPatient.name || !instantPatient.phone) ? '#E2E8F0' : '#2B7FFF',
                            color: (!instantPatient.name || !instantPatient.phone) ? '#94A3B8' : 'white',
                            fontWeight: '700', fontSize: '1.05rem', cursor: (!instantPatient.name || !instantPatient.phone) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        {isPaying ? (
                            <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}></div> Processing...</>
                        ) : (
                            <>🔒 Pay ₹{doctor.fee} &amp; Join Call</>
                        )}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '0.75rem', color: '#94A3B8', fontSize: '0.78rem' }}>
                        🔒 Secure payment powered by <strong>Razorpay</strong>
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        )}

        {/* ── LIVE Call Screen ──────────────────────────────── */}
        {callActive && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: '#0F172A', zIndex: 10000, display: 'flex', flexDirection: 'column'
            }}>
                {/* Call Header */}
                <div style={{
                    background: 'rgba(15,23,42,0.9)', padding: '1rem 2rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{doctor.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{doctor.specialization}</div>
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.1)', padding: '6px 14px',
                        borderRadius: '8px', fontFamily: 'monospace', fontSize: '1.1rem', color: 'white'
                    }}>
                        <span style={{ color: '#2EC4B6' }}>● LIVE</span>&nbsp; {formatTime(callTime)}
                    </div>
                </div>

                {/* Video Area */}
                <div style={{ flex: 1, display: 'flex', padding: '2rem', gap: '2rem' }}>
                    <div style={{
                        flex: 3, background: '#1E293B', borderRadius: '16px',
                        position: 'relative', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        <span style={{ fontSize: '4.5rem' }}>👨‍⚕️</span>
                        <div style={{
                            position: 'absolute', bottom: '20px', left: '20px',
                            background: 'rgba(0,0,0,0.55)', padding: '5px 14px',
                            borderRadius: '8px', color: 'white', fontSize: '0.9rem', fontWeight: '600'
                        }}>{doctor.name}</div>

                        {/* PiP - Patient */}
                        <div style={{
                            position: 'absolute', bottom: '24px', right: '24px',
                            width: '220px', height: '150px', background: '#334155',
                            borderRadius: '12px', border: '2px solid white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                        }}>
                            <span style={{ fontSize: '3rem' }}>👤</span>
                            <div style={{
                                position: 'absolute', bottom: '8px', left: '8px',
                                background: 'rgba(0,0,0,0.5)', padding: '2px 10px',
                                borderRadius: '6px', color: 'white', fontSize: '0.75rem'
                            }}>You</div>
                        </div>
                    </div>

                    {/* Chat Sidebar */}
                    <div style={{
                        flex: 1, background: '#1E293B', borderRadius: '16px',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '320px'
                    }}>
                        <div style={{
                            padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.05)',
                            color: 'white', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.06)'
                        }}>Consultation Chat</div>
                        <div style={{
                            flex: 1, padding: '1rem 1.25rem', color: '#94A3B8',
                            fontSize: '0.9rem', display: 'flex', alignItems: 'flex-end'
                        }}>
                            <div>Doctor has joined the call. You can type messages below.</div>
                        </div>
                        <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Type a message..."
                                style={{
                                    flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none',
                                    padding: '0.75rem 1rem', borderRadius: '8px', color: 'white',
                                    outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem'
                                }}
                            />
                            <button style={{
                                width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                                background: '#2B7FFF', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinejoin="round" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Call Controls */}
                <div style={{
                    padding: '1.5rem', background: 'rgba(15,23,42,0.9)',
                    display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center'
                }}>
                    {[['🎤', 'Mute Audio'], ['📹', 'Stop Video'], ['💻', 'Share Screen'], ['📎', 'Attach']].map(([icon, label]) => (
                        <button key={label} title={label} style={{
                            width: '54px', height: '54px', borderRadius: '50%', border: 'none',
                            background: '#334155', color: 'white', fontSize: '1.2rem',
                            cursor: 'pointer', transition: 'transform 0.15s'
                        }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                           onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>{icon}</button>
                    ))}
                    <button onClick={handleEndCall} title="End Call" style={{
                        width: '64px', height: '64px', borderRadius: '50%', border: 'none',
                        background: '#EF4444', color: 'white', fontSize: '1.5rem',
                        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                        boxShadow: '0 4px 18px rgba(239,68,68,0.45)'
                    }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                       onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>📞</button>
                </div>
            </div>
        )}

        {/* ── Post-call Thank You Banner ─────────────────────── */}
        {callEnded && (
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
        </>
    );
};

const domNode = document.getElementById('dp-react-root');
const root = ReactDOM.createRoot(domNode);
root.render(<DoctorProfilePage />);
