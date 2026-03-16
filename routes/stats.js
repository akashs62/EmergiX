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

        // 1. Specialist Doctors (Role: doctor)
        const { count: doctorCount, error: err1 } = await db
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'doctor');

        // 2. Ambulances (Role: ambulance)
        const { count: ambCount, error: err2 } = await db
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'ambulance');

        // 3. Emergency Cases (Total bookings + appointments)
        const { count: bookingCount, error: err3 } = await db
            .from('bookings')
            .select('*', { count: 'exact', head: true });

        const { count: appointCount, error: err4 } = await db
            .from('appointments')
            .select('*', { count: 'exact', head: true });

        // 4. Average Rating
        const { data: reviews, error: err5 } = await db
            .from('reviews')
            .select('rating')
            .eq('approved', true);

        let avgRating = 0;
        if (reviews && reviews.length > 0) {
            avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        }

        if (err1 || err2 || err3 || err4 || err5) {
            console.error('Stats fetch error:', { err1, err2, err3, err4, err5 });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                doctors: doctorCount || 0,
                ambulances: ambCount || 0,
                cases: (bookingCount || 0) + (appointCount || 0),
                avgRating: parseFloat(avgRating.toFixed(1)),
                cities: 12 // Hardcoded for now as it's not in DB
            }
        });
    } catch (err) {
        console.error('Core stats error:', err);
        res.status(500).json({ error: 'Failed to fetch platform statistics.' });
    }
});

module.exports = router;
