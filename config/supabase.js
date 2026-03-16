const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
let supabaseAdmin = null;
let _isConnected = false;

/**
 * Initialise Supabase clients.
 * - supabase       → uses anon key (public reads)
 * - supabaseAdmin  → uses service_role key (bypasses RLS for server-side writes)
 */
const initSupabase = () => {
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT')) {
        console.warn('⚠️  Supabase credentials not configured. Running in in-memory mock mode.');
        return false;
    }

    try {
        // Public client (anon key)
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });

        // Admin client (service_role key) — for server-side operations, bypasses RLS
        const serviceKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
        supabaseAdmin = createClient(SUPABASE_URL, serviceKey, {
            auth: { persistSession: false }
        });

        _isConnected = true;
        console.log('✅ Supabase connected successfully');
        return true;
    } catch (err) {
        console.error('❌ Supabase initialisation error:', err.message);
        return false;
    }
};

const getSupabase = () => supabase;
const getSupabaseAdmin = () => supabaseAdmin || supabase;
const isConnected = () => _isConnected;

module.exports = { initSupabase, getSupabase, getSupabaseAdmin, isConnected };
