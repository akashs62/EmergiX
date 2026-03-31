const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');

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

module.exports = router;
