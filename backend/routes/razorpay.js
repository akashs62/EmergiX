const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Mock function for when keys aren't set yet
const isRazorpayConfigured = () => {
    return process.env.RAZORPAY_KEY_ID && 
           process.env.RAZORPAY_KEY_SECRET && 
           process.env.RAZORPAY_KEY_ID !== 'rzp_test_CHANGE_ME';
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/razorpay/create-order
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = "INR", receipt = "receipt#1" } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Minimum amount must be at least 100 paise.' });
        }

        if (!isRazorpayConfigured()) {
            console.log("⚠️ Razorpay is not configured. Returning mock order info.");
            return res.status(200).json({
                status: 'success',
                message: 'Mock order created (Keys not found)',
                order: {
                    id: "order_mock_" + Math.floor(Math.random() * 1000000),
                    amount: amount,
                    currency: currency,
                    receipt: receipt,
                    isMock: true
                }
            });
        }

        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: amount, // amount in the smallest currency unit (paise)
            currency: currency,
            receipt: receipt
        };

        const order = await instance.orders.create(options);

        if (!order) return res.status(500).json({ error: 'Some error occurred while creating Razorpay order' });

        return res.status(200).json({ 
            status: 'success', 
            order,
            keyId: process.env.RAZORPAY_KEY_ID 
        });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ error: error.message || 'Error creating Razorpay order' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/razorpay/verify-payment
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-payment', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing required payment verification parameters' });
        }

        if (!isRazorpayConfigured()) {
            // Mock success if mock order
            if (razorpay_order_id.startsWith('order_mock_')) {
                return res.status(200).json({ status: 'success', message: 'Mock payment verified successfully' });
            }
            return res.status(500).json({ error: 'Razorpay keys are not configured.' });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            return res.status(200).json({ status: 'success', message: 'Payment verified successfully' });
        } else {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Razorpay Verification Error:', error);
        res.status(500).json({ error: error.message || 'Error verifying Razorpay payment' });
    }
});

module.exports = router;
