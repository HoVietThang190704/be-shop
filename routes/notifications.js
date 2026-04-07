let express = require('express');
let router = express.Router();
const { CheckLogin } = require('../utils/authHandler');
const notificationModel = require('../schemas/notifications');

// Get all notifications for user
router.get('/', CheckLogin, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await notificationModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await notificationModel.countDocuments({ user: userId });
    const unreadCount = await notificationModel.countDocuments({
      user: userId,
      isRead: false
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          unreadCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Get unread notifications
router.get('/unread', CheckLogin, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const unreadNotifications = await notificationModel
      .find({ user: userId, isRead: false })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: unreadNotifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread notifications',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', CheckLogin, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await notificationModel.findOneAndUpdate(
      { _id: notificationId, user: userId },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/read/all', CheckLogin, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    await notificationModel.updateMany(
      { user: userId, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: now
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', CheckLogin, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await notificationModel.findOneAndDelete({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Delete all notifications
router.delete('/', CheckLogin, async (req, res, next) => {
  try {
    const userId = req.user._id;

    await notificationModel.deleteMany({ user: userId });

    res.json({
      success: true,
      message: 'All notifications deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
      error: error.message
    });
  }
});

module.exports = router;
