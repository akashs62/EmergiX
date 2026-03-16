const { initSupabase, isConnected } = require('./supabase');

/**
 * Connect to Supabase (replaces MongoDB connectDB).
 * Non-blocking — falls back to in-memory if credentials are missing.
 */
const connectDB = () => {
    initSupabase();
};

const isDBConnected = () => isConnected();

module.exports = { connectDB, isDBConnected };
