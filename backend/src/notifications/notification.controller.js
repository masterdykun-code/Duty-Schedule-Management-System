import { pool } from "../db.js";

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

    const [notificationsResult, unreadCountResult] = await Promise.all([
      pool.query(
        `
        SELECT
          notification_id,
          recipient_user_id,
          recipient_role,
          sender_user_id,
          title,
          message,
          notification_type,
          entity_type,
          entity_id,
          link_target,
          metadata,
          is_read,
          to_char(read_at, 'YYYY-MM-DD HH24:MI') AS read_at,
          to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
        FROM notifications
        WHERE recipient_user_id = $1
           OR recipient_role = $2
        ORDER BY is_read ASC, created_at DESC, notification_id DESC
        LIMIT $3
        `,
        [req.user.sub, req.user.role, limit],
      ),
      pool.query(
        `
        SELECT COUNT(*)::INTEGER AS unread_count
        FROM notifications
        WHERE (recipient_user_id = $1 OR recipient_role = $2)
          AND is_read = FALSE
        `,
        [req.user.sub, req.user.role],
      ),
    ]);

    res.json({
      unread_count: unreadCountResult.rows[0]?.unread_count || 0,
      data: notificationsResult.rows.map(mapNotification),
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách thông báo",
      error: error.message,
    });
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    const notificationId = parseNotificationId(req.params.notificationId);
    if (!notificationId) {
      return res.status(400).json({ message: "Mã thông báo không hợp lệ" });
    }

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE notification_id = $1
        AND (recipient_user_id = $2 OR recipient_role = $3)
      RETURNING notification_id
      `,
      [notificationId, req.user.sub, req.user.role],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    res.json({ message: "Đã đánh dấu thông báo đã đọc" });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi cập nhật thông báo",
      error: error.message,
    });
  }
}

export async function markAllNotificationsAsRead(req, res) {
  try {
    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE (recipient_user_id = $1 OR recipient_role = $2)
        AND is_read = FALSE
      `,
      [req.user.sub, req.user.role],
    );

    res.json({
      message: "Đã đánh dấu tất cả thông báo đã đọc",
      updated_count: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi cập nhật thông báo",
      error: error.message,
    });
  }
}
