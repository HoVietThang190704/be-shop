const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    pointsCost: {
      type: Number,
      required: true,
      min: 1,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['active', 'locked', 'redeemed', 'expired'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lockedAt: Date,
    redeemedAt: Date,
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'order',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('voucher', voucherSchema);
