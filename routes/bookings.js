const express = require('express');
const router = express.Router();
const { isConnected, getSupabaseAdmin } = require('../config/supabase');

const genBookingId = () => `EMG-${Math.floor(10000 + Math.random() * 90000)}`;
const genVehicleId = (type) => `${type}-${Math.floor(100 + Math.random() * 900)}`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings (List all for admin/fleet)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) {
        console.error('List bookings error:', err);
        res.status(500).json({ error: 'Server error retrieving bookings.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    const { patientName, contact, location, emergencyType, ambType, source, severity, reason } = req.body;

    if (!patientName || !contact || !location) {
        return res.status(400).json({ error: 'Patient name, contact, and location are required.' });
    }

    const resolvedAmbType = ambType === 'ALS' ? 'ALS' : 'BLS';
    const bookingId = genBookingId();
    const vehicleId = genVehicleId(resolvedAmbType);
    const eta = resolvedAmbType === 'ALS' ? '< 2 mins' : '~6 mins';

    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('bookings')
            .insert({
                booking_id: bookingId,
                vehicle_id: vehicleId,
                source: source || 'direct',
                patient_name: patientName,
                contact,
                location,
                emergency_type: emergencyType || 'other',
                amb_type: resolvedAmbType,
                severity: severity || null,
                reason: reason || null,
                status: 'dispatched'
            })
            .select('*')
            .single();

        if (error) throw error;

        return res.status(201).json({
            status: 'success',
            message: 'Ambulance dispatched successfully.',
            bookingId: data.booking_id,
            vehicleId: data.vehicle_id,
            ambType: data.amb_type,
            eta
        });
    } catch (err) {
        console.error('Booking error:', err);
        res.status(500).json({ error: 'Failed to create booking. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:bookingId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:bookingId', async (req, res) => {
    if (!isConnected()) return res.status(503).json({ error: 'Database connection not available.' });

    const { bookingId } = req.params;
    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('bookings')
            .select('*')
            .eq('booking_id', bookingId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Booking not found.' });
        return res.status(200).json({ status: 'success', data });
    } catch (err) {
        console.error('Get booking error:', err);
        res.status(500).json({ error: 'Server error retrieving booking details.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:bookingId/cancel
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:bookingId/cancel', async (req, res) => {
    if (!isConnected()) return res.status(503).json({ error: 'Database connection not available.' });

    const { bookingId } = req.params;
    const { cancelReason } = req.body;

    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('bookings')
            .update({ status: 'cancelled', cancel_reason: cancelReason })
            .eq('booking_id', bookingId)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Booking not found.' });
        return res.status(200).json({ status: 'success', message: 'Booking cancelled.', data });
    } catch (err) {
        console.error('Cancel booking error:', err);
        res.status(500).json({ error: 'Server error cancelling booking.' });
    }
});

module.exports = router;
