const { useState, useEffect, useMemo } = React;

const mockCaregivers = [
    { id: 1, name: "Meera Das", experience: 5, specialization: "General Care", rating: 4.5, status: "Available", packages: { day: 500, week: 3000, month: 12000 } },
    { id: 2, name: "Rakesh Singh", experience: 8, specialization: "Post-Surgery", rating: 4.8, status: "Available", packages: { day: 600, week: 3500, month: 14000 } },
    { id: 3, name: "Anjali Verma", experience: 6, specialization: "Dementia Care", rating: 4.7, status: "Busy", packages: { day: 800, week: 4500, month: 18000 } },
    { id: 4, name: "Suman Roy", experience: 4, specialization: "Home Nursing", rating: 4.6, status: "Available", packages: { day: 550, week: 3200, month: 12500 } },
    { id: 5, name: "Anita Kapoor", experience: 10, specialization: "General Care", rating: 4.9, status: "Available", packages: { day: 550, week: 3200, month: 12500 } },
    { id: 6, name: "Vikram Patel", experience: 3, specialization: "Post-Surgery", rating: 4.2, status: "Available", packages: { day: 450, week: 2800, month: 11000 } },
];

const ElderCarePage = () => {
    const [search, setSearch] = useState('');
    const [specFilter, setSpecFilter] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [selectedCaregiver, setSelectedCaregiver] = useState(null);
    const [bookingStep, setBookingStep] = useState(null); // 'booking', 'payment', 'confirmed'

    // Form states
    const [duration, setDuration] = useState('day');
    const [startDate, setStartDate] = useState('');
    const [patientInfo, setPatientInfo] = useState({ name: '', age: '', address: '', contact: '', instructions: '' });

    // Confirmed state
    const [bookingRef, setBookingRef] = useState(null);

    const filteredAndSorted = useMemo(() => {
        let res = [...mockCaregivers];
        if (search) {
            res = res.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.specialization.toLowerCase().includes(search.toLowerCase()));
        }
        if (specFilter) {
            res = res.filter(c => c.specialization === specFilter);
        }
        if (sortBy === 'price') res.sort((a, b) => a.packages.day - b.packages.day);
        if (sortBy === 'experience') res.sort((a, b) => b.experience - a.experience);
        if (sortBy === 'rating') res.sort((a, b) => b.rating - a.rating);
        if (sortBy === 'availability') {
            res.sort((a, b) => (a.status === 'Available' ? -1 : 1));
        }
        return res;
    }, [search, specFilter, sortBy]);

    const handleBookNow = (c) => {
        setSelectedCaregiver(c);
        setBookingStep('booking');
        setDuration('day');
        setStartDate('');
        setPatientInfo({ name: '', age: '', address: '', contact: '', instructions: '' });
    };

    const handleCloseModal = () => {
        setBookingStep(null);
        setSelectedCaregiver(null);
    };

    const currentPrice = selectedCaregiver ? selectedCaregiver.packages[duration] : 0;

    const simulatePayment = () => {
        const id = "BKG-" + Math.floor(100000 + Math.random() * 900000);
        setBookingRef({
            id,
            caregiver: selectedCaregiver.name,
            duration,
            startDate,
            total: currentPrice
        });
        setBookingStep('confirmed');
    };

    return (
        <div className="ec-container">
            <div className="ec-header">
                <h1 className="ec-title">Elder Care Professionals</h1>
                <p className="ec-subtitle">Compassionate, professional long-term care at home.</p>
            </div>

            <div className="ec-controls">
                <input type="text" className="ec-input" placeholder="Search by name or specialization..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="ec-select" value={specFilter} onChange={e => setSpecFilter(e.target.value)}>
                    <option value="">All Specializations</option>
                    <option value="General Care">General Care</option>
                    <option value="Post-Surgery">Post-Surgery</option>
                    <option value="Dementia Care">Dementia Care</option>
                    <option value="Home Nursing">Home Nursing</option>
                </select>
                <select className="ec-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="">Sort By...</option>
                    <option value="price">Lowest Price (Per Day)</option>
                    <option value="experience">Experience (High to Low)</option>
                    <option value="rating">Rating (High to Low)</option>
                    <option value="availability">Availability First</option>
                </select>
            </div>

            <div className="ec-grid">
                {filteredAndSorted.map(c => (
                    <div key={c.id} className="ec-card" >
                        <div className="ec-card-header">
                            <div className="ec-avatar">{c.name.charAt(0)}</div>
                            <div>
                                <h3 className="ec-name">{c.name}</h3>
                                <div className="ec-spec">{c.specialization}</div>
                            </div>
                        </div>
                        <div className="ec-stats">
                            <span className="ec-stat">⭐ {c.rating}</span>
                            <span className="ec-stat">⏳ {c.experience} yrs</span>
                            <span className={`ec-status ${c.status === 'Available' ? 'status-available' : 'status-busy'}`}>{c.status}</span>
                        </div>
                        <div className="ec-prices">
                            <div className="ec-price-item"><span>1 Day:</span> <strong>₹{c.packages.day}</strong></div>
                            <div className="ec-price-item"><span>1 Week:</span> <strong>₹{c.packages.week}</strong></div>
                            <div className="ec-price-item"><span>1 Month:</span> <strong>₹{c.packages.month}</strong></div>
                        </div>
                        <button
                            className="ec-btn ec-btn-primary"
                            disabled={c.status === 'Busy'}
                            onClick={() => handleBookNow(c)}
                        >
                            {c.status === 'Busy' ? 'Currently Unavailable' : 'Book Now'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Booking Modal Overlay */}
            {bookingStep && (
                <div className="modal-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="ec-modal-content">

                        {bookingStep === 'booking' && (
                            <>
                                <h2>Book {selectedCaregiver.name}</h2>
                                <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>Specialization: {selectedCaregiver.specialization}</p>

                                <div className="ec-form-group">
                                    <label>Duration Package</label>
                                    <select className="ec-select" value={duration} onChange={e => setDuration(e.target.value)}>
                                        <option value="day">1 Day (₹{selectedCaregiver.packages.day})</option>
                                        <option value="week">1 Week (₹{selectedCaregiver.packages.week})</option>
                                        <option value="month">1 Month (₹{selectedCaregiver.packages.month})</option>
                                    </select>
                                </div>
                                <div className="ec-form-group">
                                    <label>Start Date</label>
                                    <input type="date" className="ec-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="ec-form-group">
                                    <label>Patient Name</label>
                                    <input type="text" className="ec-input" value={patientInfo.name} onChange={e => setPatientInfo({ ...patientInfo, name: e.target.value })} placeholder="Full Name" />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="ec-form-group" style={{ flex: 1 }}>
                                        <label>Age</label>
                                        <input type="number" className="ec-input" value={patientInfo.age} onChange={e => setPatientInfo({ ...patientInfo, age: e.target.value })} />
                                    </div>
                                    <div className="ec-form-group" style={{ flex: 2 }}>
                                        <label>Contact Number</label>
                                        <input type="tel" className="ec-input" value={patientInfo.contact} onChange={e => setPatientInfo({ ...patientInfo, contact: e.target.value })} />
                                    </div>
                                </div>
                                <div className="ec-form-group">
                                    <label>Address</label>
                                    <textarea className="ec-input" rows="2" value={patientInfo.address} onChange={e => setPatientInfo({ ...patientInfo, address: e.target.value })}></textarea>
                                </div>
                                <div className="ec-form-group">
                                    <label>Special Instructions (Optional)</label>
                                    <textarea className="ec-input" rows="2" value={patientInfo.instructions} onChange={e => setPatientInfo({ ...patientInfo, instructions: e.target.value })}></textarea>
                                </div>

                                <div className="ec-summary">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '600' }}>
                                        <span>Total Amount:</span>
                                        <span style={{ color: '#2B7FFF' }}>₹{currentPrice}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                    <button className="ec-btn" style={{ background: '#E2E8F0', color: '#475569' }} onClick={handleCloseModal}>Cancel</button>
                                    <button className="ec-btn ec-btn-primary"
                                        onClick={() => setBookingStep('payment')}
                                        disabled={!startDate || !patientInfo.name || !patientInfo.contact || !patientInfo.address}
                                    >Proceed to Payment</button>
                                </div>
                            </>
                        )}

                        {bookingStep === 'payment' && (
                            <>
                                <h2>Payment Details</h2>
                                <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>Please complete the mock payment to confirm.</p>

                                <div className="ec-summary" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                    <div style={{ fontSize: '1rem', color: '#64748B' }}>Amount to Pay</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1E293B' }}>₹{currentPrice}</div>
                                </div>

                                <div className="ec-form-group">
                                    <label>Payment Method</label>
                                    <select className="ec-select">
                                        <option>Credit / Debit Card</option>
                                        <option>UPI</option>
                                        <option>Net Banking</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button className="ec-btn" style={{ background: '#E2E8F0', color: '#475569' }} onClick={() => setBookingStep('booking')}>Back</button>
                                    <button className="ec-btn ec-btn-primary" onClick={simulatePayment}>Confirm & Pay</button>
                                </div>
                            </>
                        )}

                        {bookingStep === 'confirmed' && (
                            <div style={{ textAlign: 'center' }}>
                                <div className="ec-conf-icon">✓</div>
                                <h2>Booking Confirmed!</h2>
                                <p style={{ color: '#64748B' }}>Your caregiver is assigned and ready.</p>

                                <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: '8px', marginTop: '1.5rem', textAlign: 'left' }}>
                                    <p><strong>Booking ID:</strong> {bookingRef.id}</p>
                                    <p><strong>Caregiver:</strong> {bookingRef.caregiver}</p>
                                    <p><strong>Duration:</strong> 1 {bookingRef.duration.charAt(0).toUpperCase() + bookingRef.duration.slice(1)}</p>
                                    <p><strong>Start Date:</strong> {bookingRef.startDate}</p>
                                    <p><strong>Amount Paid:</strong> ₹{bookingRef.total}</p>
                                    <p><strong>Status:</strong> <span style={{ color: '#22C55E', fontWeight: '600' }}>Confirmed</span></p>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexDirection: 'column' }}>
                                    <button className="ec-btn ec-btn-primary" onClick={() => alert('Opening live tracker...')}>Track Caregiver</button>
                                    <button className="ec-btn" style={{ background: '#EEF6FF', color: '#2B7FFF' }} onClick={() => alert('Starting chat...')}>Chat / Call {selectedCaregiver.name.split(' ')[0]}</button>
                                    <button className="ec-btn" style={{ background: 'transparent', color: '#64748B', marginTop: '1rem' }} onClick={handleCloseModal}>Return to Listings</button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

const domNode = document.getElementById('react-root');
const root = ReactDOM.createRoot(domNode);
root.render(<ElderCarePage />);
