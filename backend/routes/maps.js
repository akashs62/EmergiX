const express = require('express');
const router = express.Router();

// Helper to get Google Maps API key from env
const getApiKey = () => process.env.GOOGLE_MAPS_API_KEY || '';

// @route   GET /api/maps/geocode
// @desc    Convert coordinates to address via Google Geocoding API
// @access  Public
router.get('/geocode', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ status: 'error', message: 'Latitude and longitude are required' });
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            // Mock fallback if API key is not present
            return res.json({
                status: 'success',
                address: `Mock Address for ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`
            });
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            return res.json({
                status: 'success',
                address: data.results[0].formatted_address
            });
        } else {
            return res.status(400).json({ status: 'error', message: 'Geocoding failed', details: data.status });
        }
    } catch (error) {
        console.error('Maps Geocode error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to reverse geocode' });
    }
});

// @route   GET /api/maps/distance
// @desc    Calculate distance and ETA using Google Distance Matrix API
// @access  Public
router.get('/distance', async (req, res) => {
    try {
        const { origins, destinations } = req.query;
        if (!origins || !destinations) {
            return res.status(400).json({ status: 'error', message: 'Origins and destinations are required' });
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            // Mock fallback
            return res.json({
                status: 'success',
                distance: { text: "2.5 km", value: 2500 },
                duration: { text: "6 mins", value: 360 } // value in seconds
            });
        }

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
            const element = data.rows[0].elements[0];
            return res.json({
                status: 'success',
                distance: element.distance,
                duration: element.duration
            });
        } else {
            return res.status(400).json({ status: 'error', message: 'Distance matrix calculation failed', details: data.status });
        }
    } catch (error) {
        console.error('Maps Distance error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to calculate distance' });
    }
});

// @route   GET /api/maps/config
// @desc    Expose Google Maps Key to Frontend map loader
// @access  Public
router.get('/config', (req, res) => {
    // Only send if it exists and is not the default mock
    const key = getApiKey();
    res.json({ apiKey: key === 'your_google_maps_api_key_here' ? '' : key });
});

module.exports = router;
