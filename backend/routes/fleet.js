const express = require('express');
const router = express.Router();
const { isConnected, getSupabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');
const { memAmbulances, memDrivers } = require('../config/memdb');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fleet/ambulances
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ambulances', protect, authorize('ambulance'), async (req, res) => {
    try {
        // Fallback to in-memory store if DB is not configured for ambulances
        return res.status(200).json({ status: 'success', data: memAmbulances });
    } catch (err) {
        console.error('List ambulances error:', err);
        res.status(500).json({ error: 'Server error retrieving ambulances.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fleet/drivers
// ─────────────────────────────────────────────────────────────────────────────
router.get('/drivers', protect, authorize('ambulance'), async (req, res) => {
    try {
        // Fallback to in-memory store if DB is not configured for drivers
        return res.status(200).json({ status: 'success', data: memDrivers });
    } catch (err) {
        console.error('List drivers error:', err);
        res.status(500).json({ error: 'Server error retrieving drivers.' });
    }
});

module.exports = router;
