require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// Connect to MongoDB (non-blocking — falls back to in-memory if not configured)
// ─────────────────────────────────────────────────────────────────────────────
connectDB();

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: !allowedOrigins.includes('*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname, '.'), { extensions: ['html'] }));

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/stats', require('./routes/stats'));

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    const { isDBConnected } = require('./config/db');
    res.status(200).json({
        status: 'success',
        message: 'EmergiX backend is running!',
        database: isDBConnected() ? 'Supabase (PostgreSQL) connected' : 'In-memory mock mode',
        timestamp: new Date().toISOString()
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 handler for unknown API routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found.` });
});

// ─────────────────────────────────────────────────────────────────────────────
// Catch-all: serve index.html for any non-API route
// ─────────────────────────────────────────────────────────────────────────────
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const message = NODE_ENV === 'production'
        ? 'An unexpected server error occurred.'
        : (err?.message || 'An unexpected server error occurred.');
    res.status(500).json({ error: message });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🚑 EmergiX backend is live at http://localhost:${PORT}`);
        console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
    });
}

module.exports = app;
