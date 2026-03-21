const express = require('express');
const router = express.Router();
const { getSupabaseAdmin, isConnected } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

const genAppointmentId = () => `APT-${Math.floor(10000 + Math.random() * 90000)}`;
const normalizeText = (value = '') => String(value).trim();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/appointments (List all for doctor dashboard)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, authorize('doctor'), async (req, res) => {
    if (!isConnected()) return res.status(503).json({ error: 'Database connection not available.' });

    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('appointments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) {
        console.error('List appointments error:', err);
        res.status(500).json({ error: 'Server error retrieving appointments.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/appointments
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    const { doctorId, patientName, patientAge, patientSex, symptoms, appointmentDate, appointmentTime } = req.body;
    const cleanDoctorId = normalizeText(doctorId);
    const cleanPatientName = normalizeText(patientName);
    const cleanPatientSex = normalizeText(patientSex);
    const cleanSymptoms = normalizeText(symptoms);
    const cleanAppointmentTime = normalizeText(appointmentTime);
    const parsedAge = Number.parseInt(patientAge, 10);
    const parsedDate = new Date(appointmentDate);
    const cleanAppointmentDate = Number.isNaN(parsedDate.getTime())
        ? null
        : parsedDate.toISOString().split('T')[0];

    if (!cleanDoctorId || !cleanPatientName || !patientAge || !cleanPatientSex || !cleanSymptoms || !appointmentDate || !cleanAppointmentTime) {
        return res.status(400).json({ error: 'All appointment fields are required.' });
    }
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        return res.status(400).json({ error: 'Patient age must be a valid number between 1 and 120.' });
    }
    if (!cleanAppointmentDate) {
        return res.status(400).json({ error: 'Appointment date is invalid.' });
    }

    try {
        const db = getSupabaseAdmin();

        // 1. Fetch real doctor from users table
        const { data: doctor, error: docError } = await db
            .from('users')
            .select('id, name, specialization, fee')
            .eq('role', 'doctor')
            .eq('id', cleanDoctorId)
            .maybeSingle();

        if (docError) throw docError;
        if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

        const appointmentId = genAppointmentId();

        // 2. Insert appointment with real doctor details
        const { data, error } = await db
            .from('appointments')
            .insert({
                appointment_id: appointmentId,
                doctor_id: cleanDoctorId,
                doctor_name: doctor.name,
                patient_name: cleanPatientName,
                patient_age: parsedAge,
                patient_sex: cleanPatientSex,
                symptoms: cleanSymptoms,
                appointment_date: cleanAppointmentDate,
                appointment_time: cleanAppointmentTime,
                consultation_fee: doctor.fee || 500, // Handle missing/null fee gracefully
                status: 'confirmed',
                user_id: req.user?.id || null
            })
            .select('appointment_id, doctor_name, appointment_date, appointment_time, consultation_fee')
            .single();

        if (error) throw error;

        return res.status(201).json({
            status: 'success',
            message: `Appointment confirmed with ${doctor.name}.`,
            appointmentId: data.appointment_id,
            doctor: { name: doctor.name, specialization: doctor.specialization },
            appointmentDate: data.appointment_date,
            appointmentTime: data.appointment_time,
            consultationFee: data.consultation_fee
        });

    } catch (err) {
        console.error('Appointment error:', err);
        res.status(500).json({ error: 'Failed to book appointment. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/appointments/:appointmentId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:appointmentId', async (req, res) => {
    if (!isConnected()) {
        return res.status(503).json({ error: 'Database connection not available.' });
    }

    const { appointmentId } = req.params;
    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('appointments')
            .select('*')
            .eq('appointment_id', appointmentId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Appointment not found.' });

        return res.status(200).json({ status: 'success', data });
    } catch (err) {
        console.error('Get appointment error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
