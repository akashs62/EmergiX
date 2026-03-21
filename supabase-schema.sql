-- ============================================================
-- EmergiX — Supabase PostgreSQL Schema
-- Run this entire script in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── 1. USERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'patient'
                        CHECK (role IN ('patient', 'doctor', 'ambulance')),

    -- Doctor-specific
    specialization  TEXT,
    license_no      TEXT,
    experience      INTEGER,
    fee             INTEGER,
    languages       TEXT,
    rating          NUMERIC(3,1) DEFAULT 4.5,
    status          TEXT DEFAULT 'Available'
                        CHECK (status IN ('Available', 'Busy', 'Offline')),

    -- Ambulance-specific
    fleet_name      TEXT,
    fleet_id        TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── 2. BOOKINGS (Ambulance Dispatch) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      TEXT NOT NULL UNIQUE,
    source          TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'triage')),
    patient_name    TEXT NOT NULL,
    contact         TEXT NOT NULL,
    location        TEXT NOT NULL,
    emergency_type  TEXT DEFAULT 'other',
    amb_type        TEXT DEFAULT 'BLS' CHECK (amb_type IN ('BLS', 'ALS')),
    severity        TEXT CHECK (severity IN ('Low', 'Moderate', 'Critical', NULL)),
    reason          TEXT,
    status          TEXT DEFAULT 'dispatched'
                        CHECK (status IN ('dispatched', 'en_route', 'arrived', 'cancelled')),
    vehicle_id      TEXT,
    cancel_reason   TEXT,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);

-- ── 3. APPOINTMENTS (Doctor Consultations) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id      TEXT NOT NULL UNIQUE,
    doctor_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_name         TEXT NOT NULL,
    patient_name        TEXT NOT NULL,
    patient_age         INTEGER NOT NULL,
    patient_sex         TEXT NOT NULL CHECK (patient_sex IN ('Male', 'Female', 'Other')),
    symptoms            TEXT NOT NULL,
    appointment_date    DATE NOT NULL,
    appointment_time    TEXT NOT NULL,
    consultation_fee    INTEGER NOT NULL,
    status              TEXT DEFAULT 'confirmed'
                            CHECK (status IN ('confirmed', 'completed', 'cancelled')),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_id      ON appointments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor  ON appointments(doctor_id);

-- ── 4. REVIEWS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message     TEXT NOT NULL,
    approved    BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);

-- ── 5. SEED — Initial Reviews ─────────────────────────────────────────────────
INSERT INTO reviews (name, rating, message, created_at) VALUES
    ('Aditi Verma', 5, 'EmergiX dispatched an ambulance in under 4 minutes. The paramedics were well-equipped and professional. Absolutely life-saving service!', '2026-01-10'),
    ('Rahul Nair', 5, 'I had a cardiac scare and the AI triage instantly recommended an ALS ambulance. Reached the hospital in time. Cannot thank EmergiX enough.', '2026-01-25'),
    ('Priti Ghosh', 4, 'Using the doctor consultation feature for the first time — very smooth booking experience. Got an appointment confirmed instantly.', '2026-02-05')
ON CONFLICT DO NOTHING;

-- ── 6. ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────
-- Enable RLS on all tables (best practice)
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews      ENABLE ROW LEVEL SECURITY;

-- Allow the service_role (backend) to do everything (bypasses RLS automatically)
-- Allow anon to read reviews only
CREATE POLICY "Anon can read approved reviews"
    ON reviews FOR SELECT
    TO anon
    USING (approved = TRUE);

-- Allow anyone to insert reviews
CREATE POLICY "Anyone can insert reviews"
    ON reviews FOR INSERT
    TO anon
    WITH CHECK (true);

-- Service role bypasses all policies automatically in Supabase.
-- ✅ Done — your schema is ready!
