let mongoose = require('mongoose');

let commentsSchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = new mongoose.model('comment', commentsSchema);
