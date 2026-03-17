const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { isDBConnected, } = require('../config/db');
const { getSupabaseAdmin } = require('../config/supabase');

// ── In-memory store (when Supabase is not configured) ─────────────────────────
const memUsers = [];
const memOTPs = new Map(); // Store OTPs: email -> { otp, expires, verified }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const signToken = (payload) =>
    jwt.sign(payload, process.env.JWT_SECRET || 'emergix-default-secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const normalizeRole = (role = 'patient') => String(role).trim().toLowerCase();

const validateSignup = (body, role) => {
    const { name, email, password } = body;
    if (!name || name.trim().length < 2) return 'Name must be at least 2 characters.';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Please provide a valid email.';
    if (!password || password.length < 6) return 'Password must be at least 6 characters.';
    if (role === 'doctor' && (!body.licenseNo || !body.licenseNo.trim())) return 'Medical License Number is required.';
    if (role === 'ambulance' && (!body.fleetId || !body.fleetId.trim())) return 'Fleet Registration ID is required.';
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    const { name, email, password, role = 'patient', licenseNo, specialization, fleetId, fleetName } = req.body;
    const cleanEmail = normalizeEmail(email);
    const cleanRole = normalizeRole(role);

    const validationError = validateSignup(req.body, cleanRole);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();

            // Check if email already exists
            const { data: existing } = await db
                .from('users')
                .select('id')
                .eq('email', cleanEmail)
                .maybeSingle();

            if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

            const passwordHash = await bcrypt.hash(password, 12);

            const { data: user, error } = await db
                .from('users')
                .insert({
                    name: name.trim(),
                    email: cleanEmail,
                    password_hash: passwordHash,
                    role: cleanRole,
                    license_no: cleanRole === 'doctor' ? licenseNo?.trim() : null,
                    specialization: cleanRole === 'doctor' ? specialization : null,
                    fleet_id: cleanRole === 'ambulance' ? fleetId?.trim() : null,
                    fleet_name: cleanRole === 'ambulance' ? fleetName?.trim() : null,
                })
                .select('id, name, email, role')
                .single();

            if (error) throw error;

            const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
            return res.status(201).json({ status: 'success', token, user });

        } else {
            // In-memory fallback
            const existing = memUsers.find(u => u.email === cleanEmail);
            if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

            const passwordHash = await bcrypt.hash(password, 12);
            const newUser = {
                id: `usr_${Date.now()}`,
                name: name.trim(),
                email: cleanEmail,
                password_hash: passwordHash,
                role: cleanRole,
                license_no: cleanRole === 'doctor' ? licenseNo : null,
                specialization: cleanRole === 'doctor' ? specialization : null,
                fleet_id: cleanRole === 'ambulance' ? fleetId : null,
                fleet_name: cleanRole === 'ambulance' ? fleetName : null,
            };
            memUsers.push(newUser);

            const token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name });
            return res.status(201).json({
                status: 'success', token,
                user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
            });
        }
    } catch (err) {
        console.error('Signup error:', err);
        if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signin  (patient)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            const { data: user } = await db
                .from('users')
                .select('id, name, email, role, password_hash')
                .eq('email', cleanEmail)
                .eq('role', 'patient')
                .maybeSingle();

            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
            return res.status(200).json({
                status: 'success', token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role }
            });
        } else {
            // Demo fallback — accept any valid email + password
            const stored = memUsers.find(u => u.email === cleanEmail && u.role === 'patient');
            if (stored && !(await bcrypt.compare(password, stored.password_hash))) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            const name = stored ? stored.name : email.split('@')[0];
            const id = stored ? stored.id : `demo_${Date.now()}`;
            const token = signToken({ id, email: cleanEmail, role: 'patient', name });
            return res.status(200).json({
                status: 'success', token,
                user: { id, email: cleanEmail, role: 'patient', name }
            });
        }
    } catch (err) {
        console.error('Signin error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/doctor/signin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/doctor/signin', async (req, res) => {
    const { email, password, licenseNo } = req.body;
    const cleanEmail = normalizeEmail(email);
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!licenseNo?.trim()) return res.status(400).json({ error: 'Medical License Number is required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            const { data: user } = await db
                .from('users')
                .select('id, name, email, role, password_hash, license_no, specialization')
                .eq('email', cleanEmail)
                .eq('role', 'doctor')
                .maybeSingle();

            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }
            if (user.license_no && user.license_no !== licenseNo.trim()) {
                return res.status(401).json({ error: 'Incorrect medical license number.' });
            }

            const token = signToken({ id: user.id, email: user.email, role: 'doctor', name: user.name, licenseNo: user.license_no });
            return res.status(200).json({
                status: 'success', token,
                user: { id: user.id, name: user.name, email: user.email, role: 'doctor', licenseNo: user.license_no, specialization: user.specialization }
            });
        } else {
            const doctorName = 'Dr. ' + cleanEmail.split('@')[0];
            const token = signToken({ id: `doc_${Date.now()}`, email: cleanEmail, role: 'doctor', name: doctorName, licenseNo });
            return res.status(200).json({
                status: 'success', token,
                user: { email: cleanEmail, role: 'doctor', name: doctorName, licenseNo, specialization: 'Emergency Medicine' }
            });
        }
    } catch (err) {
        console.error('Doctor signin error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/ambulance/signin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ambulance/signin', async (req, res) => {
    const { email, password, fleetId } = req.body;
    const cleanEmail = normalizeEmail(email);
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!fleetId?.trim()) return res.status(400).json({ error: 'Fleet Registration ID is required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            const { data: user } = await db
                .from('users')
                .select('id, name, email, role, password_hash, fleet_id, fleet_name')
                .eq('email', cleanEmail)
                .eq('role', 'ambulance')
                .maybeSingle();

            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }
            if (user.fleet_id && user.fleet_id !== fleetId.trim()) {
                return res.status(401).json({ error: 'Incorrect fleet registration ID.' });
            }

            const token = signToken({ id: user.id, email: user.email, role: 'ambulance', name: user.name, fleetId: user.fleet_id });
            return res.status(200).json({
                status: 'success', token,
                user: { id: user.id, name: user.name, email: user.email, role: 'ambulance', fleetId: user.fleet_id, fleetName: user.fleet_name }
            });
        } else {
            const token = signToken({ id: `amb_${Date.now()}`, email: cleanEmail, role: 'ambulance', name: cleanEmail.split('@')[0], fleetId });
            return res.status(200).json({
                status: 'success', token,
                user: { email: cleanEmail, role: 'ambulance', name: cleanEmail.split('@')[0], fleetId, fleetName: 'EmergiX Fleet Services' }
            });
        }
    } catch (err) {
        console.error('Ambulance signin error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/request-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post('/request-otp', async (req, res) => {
    const { email, role } = req.body;
    const cleanEmail = normalizeEmail(email);
    const cleanRole = normalizeRole(role);
    if (!cleanEmail || !cleanRole) return res.status(400).json({ error: 'Email and role are required.' });

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            
            // Check if user exists
            const { data: user } = await db.from('users').select('id').eq('email', cleanEmail).eq('role', cleanRole).maybeSingle();
            if (!user) return res.status(404).json({ error: 'No account found with this email and role.' });

            // Store OTP in database (optional, but let's use in-memory for speed/simplicity since schema doesn't have it)
            // If we want real persistence, we'd need an otps table.
            memOTPs.set(`${cleanEmail}:${cleanRole}`, { otp, expires, verified: false });
        } else {
            const user = memUsers.find(u => u.email === cleanEmail && u.role === cleanRole);
            if (!user) return res.status(404).json({ error: 'No account found with this email and role.' });
            memOTPs.set(`${cleanEmail}:${cleanRole}`, { otp, expires, verified: false });
        }

        if ((process.env.NODE_ENV || 'development') !== 'production') {
            console.log(`\n[OTP DEBUG] OTP for ${cleanEmail} (${cleanRole}): ${otp}\n`);
        }
        
        // In a real app, send email here. For now, simulate.
        res.status(200).json({ status: 'success', message: 'OTP sent to your email.' });
    } catch (err) {
        console.error('OTP request error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
    const { email, role, otp } = req.body;
    const stored = memOTPs.get(`${normalizeEmail(email)}:${normalizeRole(role)}`);

    if (!stored || stored.otp !== otp || new Date() > stored.expires) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    stored.verified = true;
    res.status(200).json({ status: 'success', message: 'OTP verified.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    const { email, role, newPassword, otp } = req.body;
    if (!email || !role || !newPassword || !otp) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanRole = normalizeRole(role);

    const stored = memOTPs.get(`${cleanEmail}:${cleanRole}`);
    if (!stored || !stored.verified || stored.otp !== otp) {
        return res.status(401).json({ error: 'OTP verification required.' });
    }

    try {
        const passwordHash = await bcrypt.hash(newPassword, 12);

        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('users')
                .update({ password_hash: passwordHash })
                .eq('email', cleanEmail)
                .eq('role', cleanRole)
                .select('id');

            if (error) throw error;
            memOTPs.delete(`${cleanEmail}:${cleanRole}`);
            return res.status(200).json({ status: 'success', message: 'Password updated.' });
        } else {
            const userIndex = memUsers.findIndex(u => u.email === cleanEmail && u.role === cleanRole);
            if (userIndex === -1) return res.status(404).json({ error: 'Account not found.' });
            memUsers[userIndex].password_hash = passwordHash;
            memOTPs.delete(`${cleanEmail}:${cleanRole}`);
            return res.status(200).json({ status: 'success', message: 'Password updated (In-memory).' });
        }
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
    const { email, name, role } = req.body;
    const cleanEmail = normalizeEmail(email);
    const cleanRole = normalizeRole(role);
    if (!cleanEmail || !cleanRole) return res.status(400).json({ error: 'Email and role are required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            
            // Check if user exists
            let { data: user } = await db
                .from('users')
                .select('id, name, email, role')
                .eq('email', cleanEmail)
                .eq('role', cleanRole)
                .maybeSingle();

            // If user doesn't exist, create a mock one (since it's a social login demo)
            if (!user) {
                const { data: newUser, error } = await db
                    .from('users')
                    .insert({
                        name: name || email.split('@')[0],
                        email: cleanEmail,
                        password_hash: 'google_oauth_bypass',
                        role: cleanRole
                    })
                    .select('id, name, email, role')
                    .single();
                
                if (error) throw error;
                user = newUser;
            }

            const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
            return res.status(200).json({ status: 'success', token, user });
        } else {
            // In-memory fallback
            let user = memUsers.find(u => u.email === cleanEmail && u.role === cleanRole);
            if (!user) {
                user = {
                    id: `google_${Date.now()}`,
                    name: name || email.split('@')[0],
                    email: cleanEmail,
                    role: cleanRole
                };
                memUsers.push(user);
            }
            const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
            return res.status(200).json({ status: 'success', token, user });
        }
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(500).json({ error: 'Server error during social login.' });
    }
});

module.exports = router;
