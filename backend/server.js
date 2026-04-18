require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
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
app.use(express.static(path.join(__dirname, '../frontend'), { extensions: ['html'] }));

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/razorpay', require('./routes/razorpay'));
app.use('/api/triage', require('./routes/triage'));
app.use('/api/maps', require('./routes/maps'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/fleet', require('./routes/fleet'));

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
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
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
// WebRTC Signaling Server (WebSocket)
// Rooms: Map<roomId, Map<role, ws>>
// ─────────────────────────────────────────────────────────────────────────────
function attachSignalingServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    // rooms: roomId → { patient: ws|null, doctor: ws|null }
    const signalingRooms = new Map();

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const roomId = url.searchParams.get('roomId');
        const role = url.searchParams.get('role'); // 'patient' | 'doctor'

        if (!roomId || !role) {
            ws.send(JSON.stringify({ type: 'error', message: 'roomId and role are required' }));
            ws.close();
            return;
        }

        console.log(`[WS] ${role} joined room: ${roomId}`);

        // Ensure the room exists in our signaling map
        if (!signalingRooms.has(roomId)) {
            signalingRooms.set(roomId, { patient: null, doctor: null });
        }
        const room = signalingRooms.get(roomId);

        // Store connection
        room[role] = ws;
        ws._roomId = roomId;
        ws._role = role;

        // Notify the joining peer they're in
        ws.send(JSON.stringify({ type: 'joined', role, roomId }));

        // If both peers are now present, notify both that they should start negotiation
        if (room.patient && room.doctor) {
            console.log(`[WS] Both peers in room ${roomId} — signaling ready`);
            // Doctor sends offer, so tell doctor "ready"
            room.doctor.send(JSON.stringify({ type: 'ready', roomId }));
            room.patient.send(JSON.stringify({ type: 'peer-joined', role: 'doctor' }));
        }

        ws.on('message', (data) => {
            let msg;
            try { msg = JSON.parse(data); } catch { return; }

            const peer = role === 'patient' ? room.doctor : room.patient;
            if (!peer || peer.readyState !== 1 /* OPEN */) {
                // Queue or silently drop — peer not connected yet
                return;
            }

            // Forward signaling messages to the other peer
            switch (msg.type) {
                case 'offer':
                case 'answer':
                case 'ice-candidate':
                case 'chat':
                case 'toggle-video':
                case 'toggle-audio':
                case 'end-call':
                    peer.send(JSON.stringify(msg));
                    break;
                default:
                    console.warn(`[WS] Unknown message type: ${msg.type}`);
            }
        });

        ws.on('close', () => {
            console.log(`[WS] ${role} left room: ${roomId}`);
            const other = role === 'patient' ? room.doctor : room.patient;
            room[role] = null;

            // Notify the other peer
            if (other && other.readyState === 1) {
                other.send(JSON.stringify({ type: 'peer-left', role }));
            }

            // Clean up if both gone
            if (!room.patient && !room.doctor) {
                signalingRooms.delete(roomId);
                console.log(`[WS] Room ${roomId} cleaned up`);
            }
        });

        ws.on('error', (err) => {
            console.error(`[WS] Error for ${role} in ${roomId}:`, err.message);
        });
    });

    console.log('🔌 WebRTC signaling server attached at /ws');
    return wss;
}

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
    const httpServer = http.createServer(app);
    attachSignalingServer(httpServer);

    httpServer.listen(PORT, () => {
        console.log(`\n🚑 EmergiX backend is live at http://localhost:${PORT}`);
        console.log(`   Health check: http://localhost:${PORT}/api/health`);
        console.log(`   WS signaling: ws://localhost:${PORT}/ws\n`);
    });
}

module.exports = app;
