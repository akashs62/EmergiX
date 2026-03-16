const { useState, useEffect, useMemo } = React;



const DoctorProfilePage = () => {
    const [doctor, setDoctor] = useState(null);
    const [showBooking, setShowBooking] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [patientDetails, setPatientDetails] = useState({ name: '', age: '', sex: '', symptoms: '' });
    const [bookingState, setBookingState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [confirmedId, setConfirmedId] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            fetch(`/api/doctors/${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        setDoctor(data.data);
                    }
                })
                .catch(err => console.error('Error fetching doctor:', err));
        }
    }, []);

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
                            onClick={() => alert('Proceeding to instant video connect.')}
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
                                                    const res = await fetch('/api/appointments', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
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
    );
};

const domNode = document.getElementById('dp-react-root');
const root = ReactDOM.createRoot(domNode);
root.render(<DoctorProfilePage />);
