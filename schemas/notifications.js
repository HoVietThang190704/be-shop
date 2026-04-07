const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['order', 'promotion', 'message', 'system', 'reward'],
      default: 'system'
    },
    relatedId: {
      type: mongoose.Types.ObjectId,
      ref: function() {
        return this.type === 'order' ? 'order' : this.type === 'message' ? 'message' : null;
      }
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    actionUrl: {
      type: String,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('notification', notificationSchema);
