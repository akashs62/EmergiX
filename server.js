require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '.'), { extensions: ['html'] }));

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'EmergiX backend is running!' });
});

// Mock Authentication - Patient Sign In
app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;

    // Simple mock validation
    if (email && password) {
        res.status(200).json({
            status: 'success',
            token: 'mock-jwt-token-7382910',
            user: { email, role: 'patient' }
        });
    } else {
        res.status(400).json({ error: 'Email and password are required' });
    }
});

// Mock Authentication - Doctor Sign In
app.post('/api/auth/doctor/signin', (req, res) => {
    const { email, password, licenseNo } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!licenseNo || !licenseNo.trim()) {
        return res.status(400).json({ error: 'Medical License Number is required for doctor login' });
    }

    // In a real app, verify the license against a medical registry
    res.status(200).json({
        status: 'success',
        token: 'mock-doctor-jwt-token-' + Date.now(),
        user: {
            email,
            role: 'doctor',
            name: 'Dr. ' + email.split('@')[0],
            licenseNo,
            specialization: 'Emergency Medicine'
        }
    });
});

// Mock Booking Endpoint
app.post('/api/bookings', (req, res) => {
    const bookingDetails = req.body;

    if (!bookingDetails || Object.keys(bookingDetails).length === 0) {
        return res.status(400).json({ error: 'Booking details are required' });
    }

    // In a real app, save to the database here
    res.status(201).json({
        status: 'success',
        message: 'Ambulance booked successfully',
        bookingId: `EMG-${Math.floor(Math.random() * 100000)}`,
        data: bookingDetails
    });
});

// ============================================
// CATCH-ALL ROUTE
// ============================================

// Serve index.html for all other routes so frontend routing works (if you configure it later)
app.use((req, res, next) => {
    // Only serve index.html if the request is not requesting an API
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server successfully started on http://localhost:${PORT}`);
});
