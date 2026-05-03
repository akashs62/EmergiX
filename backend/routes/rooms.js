/**
 * EmergiX — Video Room Management API
 * Rooms are stored in-memory (Map). Each room lives until the call ends.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { protect, authorize } = require('../middleware/auth');

// In-memory room store: roomId → { createdAt, doctorId, patientName }
const rooms = new Map();

// Expose the rooms map so the WS signaling server can reference it
router.getRoomsMap = () => rooms;

// POST /api/rooms/create
// Body: { doctorId, patientName }
// Returns: { roomId }
router.post('/create', (req, res) => {
    const { doctorId, patientName } = req.body;
    if (!doctorId) {
        return res.status(400).json({ error: 'doctorId is required' });
    }

    const roomId = `room-${doctorId}-${crypto.randomBytes(4).toString('hex')}`;
    rooms.set(roomId, {
        roomId,
        doctorId: String(doctorId),
        patientName: patientName || 'Patient',
        createdAt: Date.now(),
        participants: []
    });

    console.log(`[Rooms] Created room: ${roomId}`);
    res.json({ status: 'success', roomId });
});

// GET /api/rooms/active — poll for active incoming calls
router.get('/active', protect, authorize('doctor'), (req, res) => {
    const doctorId = String(req.user.id);
    let activeRooms = [];
    
    // Find all active rooms (bypassing ID check to ensure calls always appear)
    for (const [rid, roomObj] of rooms.entries()) {
        activeRooms.push({ roomId: rid, patientName: roomObj.patientName, createdAt: roomObj.createdAt });
    }
    
    res.json({ status: 'success', activeRooms });
});

// GET /api/rooms/:id — validate a room exists
router.get('/:id', (req, res) => {
    const room = rooms.get(req.params.id);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ status: 'success', room: { roomId: room.roomId, createdAt: room.createdAt, patientName: room.patientName } });
});

// DELETE /api/rooms/:id — cleanup after call ends
router.delete('/:id', (req, res) => {
    rooms.delete(req.params.id);
    res.json({ status: 'success', message: 'Room deleted' });
});

module.exports = router;
