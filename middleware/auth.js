const jwt = require('jsonwebtoken');
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'emergix-default-secret';

/**
 * Middleware to protect routes requiring authentication.
 * Reads the Bearer token from the Authorization header.
 */
const protect = (req, res, next) => {
    if (NODE_ENV === 'production' && (JWT_SECRET === 'emergix-default-secret' || !process.env.JWT_SECRET)) {
        return res.status(500).json({ 
            error: 'Server auth is not configured securely.',
            details: 'JWT_SECRET must be set in production environment variables.'
        });
    }

    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
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
