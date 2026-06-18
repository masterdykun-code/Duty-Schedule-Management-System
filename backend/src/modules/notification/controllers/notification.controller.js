import { pool } from "../../../db.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { sendSuccess, sendError } from "../../../utils/response.js";


function parseLimit(value) {
  const parsed = Number(value || 8);
  if (!Number.isInteger(parsed) || parsed < 1) return 8;
  return Math.min(parsed, 20);
}

function parseNotificationId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mapNotification(row) {
  return {
    notification_id: row.notification_id,
    recipient_user_id: row.recipient_user_id,
    recipient_role: row.recipient_role,
    sender_user_id: row.sender_user_id,
    title: row.title,
    message: row.message,
    notification_type: row.notification_type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    link_target: row.link_target,
    metadata: row.metadata || {},
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

export async function listMyNotifications(req, res) {
  try {
    const limit = parseLimit(req.query.limit);

    const [notifications, unreadCount] = await Promise.all([
      NotificationRepository.listNotifications(pool, {
        recipientUserId: req.user.sub,
        recipientRole: req.user.role,
        limit,
      }),
      NotificationRepository.countUnreadNotifications(pool, {
        recipientUserId: req.user.sub,
        recipientRole: req.user.role,
      }),
    ]);

    sendSuccess(res, {
      unread_count: unreadCount,
      data: notifications.map(mapNotification),
    });
  } catch (error) {
    sendError(res, "Lỗi khi lấy danh sách thông báo", 500, { error: error.message });
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    const notificationId = parseNotificationId(req.params.notificationId);
    if (!notificationId) {
      return sendError(res, "Mã thông báo không hợp lệ", 400);
    }

    const updated = await NotificationRepository.markNotificationAsRead(pool, {
      notificationId,
      recipientUserId: req.user.sub,
      recipientRole: req.user.role,
    });

    if (!updated) {
      return sendError(res, "Không tìm thấy thông báo", 404);
    }

    sendSuccess(res, { message: "Đã đánh dấu thông báo đã đọc" });
  } catch (error) {
    sendError(res, "Lỗi khi cập nhật thông báo", 500, { error: error.message });
  }
}

export async function markAllNotificationsAsRead(req, res) {
  try {
    const updatedCount = await NotificationRepository.markAllNotificationsAsRead(pool, {
      recipientUserId: req.user.sub,
      recipientRole: req.user.role,
    });

    sendSuccess(res, {
      message: "Đã đánh dấu tất cả thông báo đã đọc",
      updated_count: updatedCount,
    });
  } catch (error) {
    sendError(res, "Lỗi khi cập nhật thông báo", 500, { error: error.message });
  }
}
