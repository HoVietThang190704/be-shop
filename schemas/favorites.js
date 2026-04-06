let mongoose = require('mongoose');

let favoriteSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        unique: true,
        required: true
    },
    products: {
        type: [
            {
                type: mongoose.Types.ObjectId,
                ref: 'product'
            }
        ],
        default: []
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('favorite', favoriteSchema)