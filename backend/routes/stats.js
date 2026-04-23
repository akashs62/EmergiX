const express = require('express');
const router = express.Router();
const { isConnected, getSupabaseAdmin } = require('../config/supabase');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    try {
        const db = getSupabaseAdmin();

        const [doctorResult, ambulanceResult, bookingResult, appointmentResult, reviewResult] = await Promise.all([
            db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'doctor'),
            db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'ambulance'),
            db.from('bookings').select('*', { count: 'exact', head: true }),
            db.from('appointments').select('*', { count: 'exact', head: true }),
            db.from('reviews').select('rating').eq('approved', true)
        ]);

        const doctorCount = doctorResult.count;
        const ambCount = ambulanceResult.count;
        const bookingCount = bookingResult.count;
        const appointCount = appointmentResult.count;
        const reviews = reviewResult.data;
        const statsError = doctorResult.error || ambulanceResult.error || bookingResult.error || appointmentResult.error || reviewResult.error;

        let avgRating = 0;
        if (reviews && reviews.length > 0) {
            avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        }

        if (statsError) {
            console.error('Stats fetch error:', statsError);
            return res.status(500).json({ error: 'Failed to fetch platform statistics.' });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                doctors: doctorCount || 0,
                ambulances: ambCount || 0,
                cases: (bookingCount || 0) + (appointCount || 0),
                avgRating: parseFloat(avgRating.toFixed(1)),
                cities: 1 
            }
        });
    } catch (err) {
        console.error('Core stats error:', err);
        res.status(500).json({ error: 'Failed to fetch platform statistics.' });
    }
});

module.exports = router;
