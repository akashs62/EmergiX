const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingId: {
        type: String,
        unique: true
    },
    source: {
        type: String,
        enum: ['direct', 'triage'],
        default: 'direct'
    },
    patientName: { type: String, required: true },
    contact: { type: String, required: true },
    location: { type: String, required: true },
    emergencyType: { type: String, default: 'other' },
    ambType: {
        type: String,
        enum: ['BLS', 'ALS'],
        default: 'BLS'
    },
    severity: { type: String, enum: ['Low', 'Moderate', 'Critical'] },
    reason: { type: String },
    status: {
        type: String,
        enum: ['dispatched', 'en_route', 'arrived', 'cancelled'],
        default: 'dispatched'
    },
    vehicleId: { type: String },
    cancelReason: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Auto-generate bookingId before saving
bookingSchema.pre('save', function (next) {
    if (!this.bookingId) {
        this.bookingId = `EMG-${Math.floor(10000 + Math.random() * 90000)}`;
    }
    if (!this.vehicleId) {
        this.vehicleId = `${this.ambType}-${Math.floor(100 + Math.random() * 900)}`;
    }
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);
