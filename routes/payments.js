const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getSupabaseAdmin, isConnected } = require('../config/supabase');
const { memUsers } = require('../config/memdb');

/**
 * @route   GET /api/payments/config
 * @desc    Get Stripe Publishable Key
 */
router.get('/config', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

/**
 * @route   POST /api/payments/create-checkout-session
 * @desc    Create a Stripe Checkout Session for a doctor consultation
 * @access  Public (should be protected in production)
 */
router.post('/create-checkout-session', async (req, res) => {
    const { doctorId, patientName } = req.body;

    if (!doctorId) {
        return res.status(400).json({ error: 'Doctor ID is required.' });
    }

    try {
        let doctor;
        
        // Handle both DB and In-Memory cases
        if (!isConnected()) {
            doctor = memUsers.find(u => u.id === doctorId);
            // If not found in memUsers, check if it's one of the hardcoded docs or just use a fallback
            if (!doctor) {
                // Simplified fallback for demo/mock purposes
                doctor = { name: 'Specialist', fee: 500 };
            }
        } else {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('users')
                .select('name, fee')
                .eq('id', doctorId)
                .single();
            
            if (error) {
                console.error('Supabase fetch error:', error);
                // Fallback for demo if id is valid but query fails
                doctor = { name: 'Specialist', fee: 500 };
            } else {
                doctor = data;
            }
        }

        const fee = doctor.fee || 500; 

        // Create the Stripe Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Consultation with Dr. ${doctor.name}`,
                            description: `Online video consultation for ${patientName || 'Patient'}`,
                            images: ['https://emergix.vercel.app/logo.png'], // Placeholder logo
                        },
                        unit_amount: fee * 100, // Amount in paise
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/video-consultation?status=success',
            cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/video-consultation?status=cancelled',
        });

        console.log('Stripe Session Created:', session.id);
        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error('Stripe Session Error:', err);
        res.status(500).json({ error: 'Failed to create checkout session: ' + err.message });
    }
});

module.exports = router;
