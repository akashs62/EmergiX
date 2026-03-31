const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    appointmentId: { type: String, unique: true },
    doctorId: {
        type: Number,  // References the mock doctor data ID (or Mongo ObjectId if using DB)
        required: true
    },
    doctorName: { type: String, required: true },
    patientName: { type: String, required: true },
    patientAge: { type: Number, required: true },
    patientSex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    symptoms: { type: String, required: true },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true },
    consultationFee: { type: Number, required: true },
    status: {
        type: String,
        enum: ['confirmed', 'completed', 'cancelled'],
        default: 'confirmed'
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Auto generate appointmentId
appointmentSchema.pre('save', function (next) {
    if (!this.appointmentId) {
        this.appointmentId = `APT-${Math.floor(10000 + Math.random() * 90000)}`;
    }
    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
