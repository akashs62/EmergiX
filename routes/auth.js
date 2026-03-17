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

    const validationError = validateSignup(req.body, role);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();

            // Check if email already exists
            const { data: existing } = await db
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

            const passwordHash = await bcrypt.hash(password, 12);

            const { data: user, error } = await db
                .from('users')
                .insert({
                    name: name.trim(),
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    role,
                    license_no: role === 'doctor' ? licenseNo?.trim() : null,
                    specialization: role === 'doctor' ? specialization : null,
                    fleet_id: role === 'ambulance' ? fleetId?.trim() : null,
                    fleet_name: role === 'ambulance' ? fleetName?.trim() : null,
                })
                .select('id, name, email, role')
                .single();

            if (error) throw error;

            const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
            return res.status(201).json({ status: 'success', token, user });

        } else {
            // In-memory fallback
            const existing = memUsers.find(u => u.email === email.toLowerCase());
            if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

            const passwordHash = await bcrypt.hash(password, 12);
            const newUser = {
                id: `usr_${Date.now()}`,
                name: name.trim(),
                email: email.toLowerCase(),
                password_hash: passwordHash,
                role,
                license_no: role === 'doctor' ? licenseNo : null,
                specialization: role === 'doctor' ? specialization : null,
                fleet_id: role === 'ambulance' ? fleetId : null,
                fleet_name: role === 'ambulance' ? fleetName : null,
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
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            const { data: user } = await db
                .from('users')
                .select('id, name, email, role, password_hash')
                .eq('email', email.toLowerCase())
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
            const stored = memUsers.find(u => u.email === email.toLowerCase() && u.role === 'patient');
            if (stored && !(await bcrypt.compare(password, stored.password_hash))) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            const name = stored ? stored.name : email.split('@')[0];
            const id = stored ? stored.id : `demo_${Date.now()}`;
            const token = signToken({ id, email, role: 'patient', name });
            return res.status(200).json({
                status: 'success', token,
                user: { id, email, role: 'patient', name }
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
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!licenseNo?.trim()) return res.status(400).json({ error: 'Medical License Number is required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            const { data: user } = await db
                .from('users')
                .select('id, name, email, role, password_hash, license_no, specialization')
                .eq('email', email.toLowerCase())
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
            const doctorName = 'Dr. ' + email.split('@')[0];
            const token = signToken({ id: `doc_${Date.now()}`, email, role: 'doctor', name: doctorName, licenseNo });
            return res.status(200).json({
                status: 'success', token,
                user: { email, role: 'doctor', name: doctorName, licenseNo, specialization: 'Emergency Medicine' }
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
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!fleetId?.trim()) return res.status(400).json({ error: 'Fleet Registration ID is required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            const { data: user } = await db
                .from('users')
                .select('id, name, email, role, password_hash, fleet_id, fleet_name')
                .eq('email', email.toLowerCase())
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
            const token = signToken({ id: `amb_${Date.now()}`, email, role: 'ambulance', name: email.split('@')[0], fleetId });
            return res.status(200).json({
                status: 'success', token,
                user: { email, role: 'ambulance', name: email.split('@')[0], fleetId, fleetName: 'EmergiX Fleet Services' }
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
    if (!email || !role) return res.status(400).json({ error: 'Email and role are required.' });

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            
            // Check if user exists
            const { data: user } = await db.from('users').select('id').eq('email', email.toLowerCase()).eq('role', role).maybeSingle();
            if (!user) return res.status(404).json({ error: 'No account found with this email and role.' });

            // Store OTP in database (optional, but let's use in-memory for speed/simplicity since schema doesn't have it)
            // If we want real persistence, we'd need an otps table.
            memOTPs.set(`${email}:${role}`, { otp, expires, verified: false });
        } else {
            const user = memUsers.find(u => u.email === email.toLowerCase() && u.role === role);
            if (!user) return res.status(404).json({ error: 'No account found with this email and role.' });
            memOTPs.set(`${email}:${role}`, { otp, expires, verified: false });
        }

        console.log(`\n[OTP DEBUG] OTP for ${email} (${role}): ${otp}\n`);
        
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
    const stored = memOTPs.get(`${email}:${role}`);

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

    const stored = memOTPs.get(`${email}:${role}`);
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
                .eq('email', email.toLowerCase())
                .eq('role', role)
                .select('id');

            if (error) throw error;
            memOTPs.delete(`${email}:${role}`);
            return res.status(200).json({ status: 'success', message: 'Password updated.' });
        } else {
            const userIndex = memUsers.findIndex(u => u.email === email.toLowerCase() && u.role === role);
            if (userIndex === -1) return res.status(404).json({ error: 'Account not found.' });
            memUsers[userIndex].password_hash = passwordHash;
            memOTPs.delete(`${email}:${role}`);
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
    if (!email || !role) return res.status(400).json({ error: 'Email and role are required.' });

    try {
        if (isDBConnected()) {
            const db = getSupabaseAdmin();
            
            // Check if user exists
            let { data: user } = await db
                .from('users')
                .select('id, name, email, role')
                .eq('email', email.toLowerCase())
                .eq('role', role)
                .maybeSingle();

            // If user doesn't exist, create a mock one (since it's a social login demo)
            if (!user) {
                const { data: newUser, error } = await db
                    .from('users')
                    .insert({
                        name: name || email.split('@')[0],
                        email: email.toLowerCase(),
                        password_hash: 'google_oauth_bypass',
                        role: role
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
            let user = memUsers.find(u => u.email === email.toLowerCase() && u.role === role);
            if (!user) {
                user = {
                    id: `google_${Date.now()}`,
                    name: name || email.split('@')[0],
                    email: email.toLowerCase(),
                    role
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
