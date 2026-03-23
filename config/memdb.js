/**
 * Shared in-memory data store for EmergiX (Mock/Demo mode).
 */
const memUsers = [];
const memOTPs = new Map(); // email -> { otp, expires, verified }
const memAppointments = [];
const memBookings = [];
const memReviews = [];

module.exports = {
    memUsers,
    memOTPs,
    memAppointments,
    memBookings,
    memReviews
};
