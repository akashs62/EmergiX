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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fleet/drivers
// ─────────────────────────────────────────────────────────────────────────────
router.post('/drivers', protect, authorize('ambulance'), async (req, res) => {
    try {
        const { 
            name, address, phone, altPhone, 
            age, ambulanceNumber, ambulancePic, drivingLicensePic,
            helperName, helperAge, helperPhone, helperLicense
        } = req.body;

        if (!name || !address || !phone) {
            return res.status(400).json({ error: 'Name, address, and phone are required.' });
        }

        const newDriver = {
            id: `D${memDrivers.length + 1}`,
            name,
            age: age || null,
            address: address || '',
            phone,
            altPhone: altPhone || '',
            ambulanceNumber: ambulanceNumber || '',
            ambulancePic: ambulancePic || 'https://placehold.co/100x60?text=Ambulance',
            drivingLicensePic: drivingLicensePic || 'https://placehold.co/100x60?text=License',
            helperName: helperName || '',
            helperAge: helperAge || null,
            helperPhone: helperPhone || '',
            helperLicense: helperLicense || '',
            status: 'on-duty',
            rating: 5.0,
            experience: 'New'
        };

        memDrivers.push(newDriver);
        return res.status(201).json({ status: 'success', data: newDriver });
    } catch (err) {
        console.error('Add driver error:', err);
        res.status(500).json({ error: 'Server error adding driver.' });
    }
});

module.exports = router;
