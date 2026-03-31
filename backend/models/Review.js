const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    message: {
        type: String,
        required: [true, 'Review message is required'],
        trim: true,
        minlength: [10, 'Review must be at least 10 characters']
    },
    approved: {
        type: Boolean,
        default: true
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
