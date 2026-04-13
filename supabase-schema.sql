-- ============================================================
-- EmergiX — CLEAN PRODUCTION SCHEMA (NO SEED DATA)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'patient'
        CHECK (role IN ('patient', 'doctor', 'ambulance')),

    -- Doctor fields
    specialization TEXT,
    license_no TEXT,
    age INTEGER,
    experience INTEGER,
    fee INTEGER,
    languages TEXT,
    rating NUMERIC(3,1) DEFAULT 0.0,
    status TEXT DEFAULT 'Available'
        CHECK (status IN ('Available', 'Busy', 'Offline')),

    -- Ambulance fields
    fleet_name TEXT,
    fleet_id TEXT,

    -- Patient fields
    phone TEXT,
    gender TEXT,
    blood_group TEXT,
    problems TEXT,
    medical_records TEXT,
    address TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── 2. BOOKINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'triage')),
    patient_name TEXT NOT NULL,
    contact TEXT NOT NULL,
    location TEXT NOT NULL,
    emergency_type TEXT,
    amb_type TEXT DEFAULT 'BLS' CHECK (amb_type IN ('BLS', 'ALS')),
    severity TEXT CHECK (severity IN ('Low', 'Moderate', 'Critical')),
    reason TEXT,
    status TEXT DEFAULT 'dispatched'
        CHECK (status IN ('dispatched', 'en_route', 'arrived', 'cancelled')),
    vehicle_id TEXT,
    cancel_reason TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ── 3. APPOINTMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT UNIQUE NOT NULL,
    doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_age INTEGER NOT NULL,
    patient_sex TEXT CHECK (patient_sex IN ('Male', 'Female', 'Other')),
    symptoms TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    consultation_fee INTEGER NOT NULL,
    status TEXT DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'completed', 'cancelled')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_id ON appointments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);

-- ── 4. REVIEWS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message TEXT NOT NULL,
    approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);

-- ── 5. ENABLE RLS ──────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ── 6. POLICIES (RERUN SAFE) ───────────────────────────────

-- REVIEWS
DROP POLICY IF EXISTS "read_reviews" ON reviews;
CREATE POLICY "read_reviews"
ON reviews FOR SELECT
TO anon
USING (approved = TRUE);

DROP POLICY IF EXISTS "insert_reviews" ON reviews;
CREATE POLICY "insert_reviews"
ON reviews FOR INSERT
TO anon
WITH CHECK (true);

-- USERS (only doctors visible publicly)
DROP POLICY IF EXISTS "read_doctors" ON users;
CREATE POLICY "read_doctors"
ON users FOR SELECT
TO anon
USING (role = 'doctor');

-- BOOKINGS
DROP POLICY IF EXISTS "insert_bookings" ON bookings;
CREATE POLICY "insert_bookings"
ON bookings FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "read_bookings" ON bookings;
CREATE POLICY "read_bookings"
ON bookings FOR SELECT
TO anon
USING (true);

-- APPOINTMENTS
DROP POLICY IF EXISTS "insert_appointments" ON appointments;
CREATE POLICY "insert_appointments"
ON appointments FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "read_appointments" ON appointments;
CREATE POLICY "read_appointments"
ON appointments FOR SELECT
TO anon
USING (true);

-- ✅ DONE — CLEAN PRODUCTION SETUP