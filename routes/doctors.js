const express = require('express');
const router = express.Router();
const { getSupabaseAdmin, isConnected } = require('../config/supabase');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/doctors  — List all doctors (with optional filtering)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    try {
        const db = getSupabaseAdmin();
        const { specialization, status, minRating, maxFee, search } = req.query;

        let query = db
            .from('users')
            .select('id, name, specialization, experience, fee, languages, rating, status')
            .eq('role', 'doctor');

        if (specialization) {
            query = query.ilike('specialization', `%${specialization}%`);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (minRating) {
            query = query.gte('rating', parseFloat(minRating));
        }
        if (maxFee) {
            query = query.lte('fee', parseInt(maxFee));
        }
        if (search) {
            const q = search.toLowerCase();
            query = query.or(`name.ilike.%${q}%,specialization.ilike.%${q}%,languages.ilike.%${q}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) {
        console.error('Get doctors error:', err);
        res.status(500).json({ error: 'Server error fetching doctors.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/doctors/:id  — Get single doctor profile
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('users')
            .select('id, name, specialization, experience, fee, languages, rating, status')
            .eq('role', 'doctor')
            .eq('id', req.params.id)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Doctor not found.' });
        }

        res.status(200).json({ status: 'success', data });
    } catch (err) {
        console.error('Get doctor error:', err);
        res.status(500).json({ error: 'Server error fetching doctor profile.' });
    }
});

module.exports = router;
