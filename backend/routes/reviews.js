const express = require('express');
const router = express.Router();
const { isConnected, getSupabaseAdmin } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const normalizeText = (value = '') => String(value).trim();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('reviews')
            .select('id, name, rating, message, created_at')
            .eq('approved', true)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ error: 'Server error retrieving reviews.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    const { name, rating, message } = req.body;
    const cleanName = normalizeText(name);
    const cleanMessage = normalizeText(message);
    const parsedRating = Number.parseInt(rating, 10);

    if (!cleanName || !rating || !cleanMessage) return res.status(400).json({ error: 'Name, rating, and message are required.' });
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    if (cleanMessage.length < 10) return res.status(400).json({ error: 'Review message must be at least 10 characters.' });

    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('reviews')
            .insert({ name: cleanName, rating: parsedRating, message: cleanMessage, approved: true })
            .select('id, name, rating')
            .single();

        if (error) throw error;
        return res.status(201).json({ status: 'success', message: 'Thank you for your review!', data });
    } catch (err) {
        console.error('Submit review error:', err);
        res.status(500).json({ error: 'Failed to submit review. Please try again.' });
    }
});

module.exports = router;
