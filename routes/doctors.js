const express = require('express');
const router = express.Router();
const { getSupabaseAdmin, isConnected } = require('../config/supabase');
const { memUsers } = require('../config/memdb');
const normalizeText = (value = '') => String(value).trim();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/doctors  — List all doctors (with optional filtering)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { specialization, status, minRating, maxFee, search } = req.query;
    const parsedMinRating = minRating ? Number.parseFloat(minRating) : null;
    const parsedMaxFee = maxFee ? Number.parseInt(maxFee, 10) : null;

    if (!isConnected()) {
        // ── Mock Fallback ──
        let docs = memUsers.filter(u => u.role === 'doctor');
        
        if (specialization) {
            const spec = normalizeText(specialization).toLowerCase();
            docs = docs.filter(d => d.specialization?.toLowerCase().includes(spec));
        }
        if (status) {
            const normalizedStatus = normalizeText(status).toLowerCase();
            docs = docs.filter(d => String(d.status || '').toLowerCase() === normalizedStatus);
        }
        if (search) {
            const q = normalizeText(search).toLowerCase();
            docs = docs.filter(d => 
                d.name.toLowerCase().includes(q) || 
                d.specialization?.toLowerCase().includes(q)
            );
        }
        
        // Add default mock fields if missing
        docs = docs.map(d => ({
            id: d.id,
            name: d.name,
            specialization: d.specialization || 'General Physician',
            experience: d.experience || 5,
            fee: d.fee || 500,
            languages: d.languages || 'English, Hindi',
            rating: d.rating || 4.5,
            status: d.status || 'Available'
        }));

        if (parsedMinRating !== null) {
            if (Number.isNaN(parsedMinRating) || parsedMinRating < 0 || parsedMinRating > 5) {
                return res.status(400).json({ error: 'minRating must be a number between 0 and 5.' });
            }
            docs = docs.filter(d => Number(d.rating) >= parsedMinRating);
        }

        if (parsedMaxFee !== null) {
            if (Number.isNaN(parsedMaxFee) || parsedMaxFee < 0) {
                return res.status(400).json({ error: 'maxFee must be a positive integer.' });
            }
            docs = docs.filter(d => Number(d.fee) <= parsedMaxFee);
        }

        return res.status(200).json({ status: 'success', count: docs.length, data: docs });
    }

    try {
        const db = getSupabaseAdmin();

        let query = db
            .from('users')
            .select('id, name, specialization, experience, fee, languages, rating, status')
            .eq('role', 'doctor');

        if (specialization) {
            query = query.ilike('specialization', `%${normalizeText(specialization)}%`);
        }
        if (status) {
            query = query.eq('status', normalizeText(status));
        }
        if (parsedMinRating !== null) {
            if (Number.isNaN(parsedMinRating) || parsedMinRating < 0 || parsedMinRating > 5) {
                return res.status(400).json({ error: 'minRating must be a number between 0 and 5.' });
            }
            query = query.gte('rating', parsedMinRating);
        }
        if (parsedMaxFee !== null) {
            if (Number.isNaN(parsedMaxFee) || parsedMaxFee < 0) {
                return res.status(400).json({ error: 'maxFee must be a positive integer.' });
            }
            query = query.lte('fee', parsedMaxFee);
        }
        if (search) {
            const q = normalizeText(search).toLowerCase();
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
        const doc = memUsers.find(u => u.role === 'doctor' && u.id === req.params.id);
        if (!doc) return res.status(404).json({ error: 'Doctor not found.' });
        
        return res.status(200).json({ 
            status: 'success', 
            data: {
                id: doc.id,
                name: doc.name,
                specialization: doc.specialization || 'General Physician',
                experience: doc.experience || 5,
                fee: doc.fee || 500,
                languages: doc.languages || 'English, Hindi',
                rating: doc.rating || 4.5,
                status: doc.status || 'Available'
            } 
        });
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
