const notificationModel = require('../schemas/notifications');

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (order, promotion, message, system, reward)
 * @param {object} options - Additional options (relatedId, priority, actionUrl)
 * @returns {Promise} Created notification
 */
async function createNotification(userId, title, message, type = 'system', options = {}) {
  try {
    const notification = new notificationModel({
      user: userId,
      title,
      message,
      type,
      relatedId: options.relatedId || null,
      priority: options.priority || 'medium',
      actionUrl: options.actionUrl || null
    });

    await notification.save();

    // Trigger real-time notification if socket is available
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to(userId.toString()).emit('new_notification', notification);
      }
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}


/**
 * Create multiple notifications
 * @param {array} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {object} options - Additional options
 * @returns {Promise} Array of created notifications
 */
async function bulkCreateNotifications(userIds, title, message, type = 'system', options = {}) {
  try {
    const notifications = userIds.map(userId => ({
      user: userId,
      title,
      message,
      type,
      relatedId: options.relatedId || null,
      priority: options.priority || 'medium',
      actionUrl: options.actionUrl || null
    }));

    const result = await notificationModel.insertMany(notifications);

    // Trigger real-time notifications via socket
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        result.forEach(notif => {
          io.to(notif.user.toString()).emit('new_notification', notif);
        });
      }
    } catch (socketError) {
      console.error('Socket bulk notification failed:', socketError);
    }

    return result;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
}


/**
 * Send order notification
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {string} status - Order status (pending, confirmed, shipping, delivered, cancelled)
 */
async function sendOrderNotification(userId, orderId, status) {
  const statusMessages = {
    pending: { title: 'Đơn hàng mới', message: 'Đơn hàng của bạn đã được tạo' },
    confirmed: { title: 'Đơn hàng xác nhận', message: 'Đơn hàng của bạn đã được xác nhận' },
    shipping: { title: 'Đơn hàng đang vận chuyển', message: 'Đơn hàng của bạn đang được giao' },
    delivered: { title: 'Đơn hàng đã giao', message: 'Đơn hàng của bạn đã được giao thành công' },
    cancelled: { title: 'Đơn hàng bị hủy', message: 'Đơn hàng của bạn đã bị hủy' }
  };

  const notificationData = statusMessages[status] || { title: 'Cập nhật đơn hàng', message: 'Đơn hàng của bạn có cập nhật mới' };

  return createNotification(
    userId,
    notificationData.title,
    notificationData.message,
    'order',
    {
      relatedId: orderId,
      priority: status === 'delivered' ? 'high' : 'medium',
      actionUrl: `/orders/${orderId}`
    }
  );
}

/**
 * Send promotion notification
 * @param {string} userId - User ID
 * @param {string} title - Promotion title
 * @param {string} message - Promotion message
 * @param {string} actionUrl - Action URL
 */
async function sendPromotionNotification(userId, title, message, actionUrl = null) {
  return createNotification(
    userId,
    title,
    message,
    'promotion',
    {
      priority: 'high',
      actionUrl
    }
  );
}

/**
 * Send reward notification
 * @param {string} userId - User ID
 * @param {number} points - Reward points earned
 */
async function sendRewardNotification(userId, points) {
  return createNotification(
    userId,
    'Nhận điểm thưởng',
    `Bạn đã nhận ${points} điểm thưởng`,
    'reward',
    {
      priority: 'medium'
    }
  );
}

/**
 * Send message notification
 * @param {string} userId - User ID
 * @param {string} messageId - Message ID
 * @param {string} senderName - Sender name
 */
async function sendMessageNotification(userId, messageId, senderName) {
  return createNotification(
    userId,
    'Tin nhắn mới',
    `Bạn có tin nhắn mới từ ${senderName}`,
    'message',
    {
      relatedId: messageId,
      priority: 'high',
      actionUrl: '/messages'
    }
  );
}

module.exports = {
  createNotification,
  bulkCreateNotifications,
  sendOrderNotification,
  sendPromotionNotification,
  sendRewardNotification,
  sendMessageNotification
};
