const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes requiring authentication.
 * Reads the Bearer token from the Authorization header.
 */
const protect = (req, res, next) => {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'emergix-default-secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Not authorized. Invalid or expired token.' });
    }
};

/**
 * Middleware to restrict access to specific roles.
 * Usage: authorize('doctor'), authorize('ambulance'), authorize('patient', 'doctor')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. This route is restricted to: ${roles.join(', ')}.`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
