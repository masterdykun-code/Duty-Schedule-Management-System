export class NotificationRepository {
  static async createNotification(client, {
    recipientUserId = null,
    recipientRole = null,
    senderUserId = null,
    title,
    message,
    notificationType,
    entityType = null,
    entityId = null,
    linkTarget = null,
    metadata = {},
  }) {
    await client.query(
      `
      INSERT INTO notifications (
        recipient_user_id,
        recipient_role,
        sender_user_id,
        title,
        message,
        notification_type,
        entity_type,
        entity_id,
        link_target,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      `,
      [
        recipientUserId,
        recipientRole,
        senderUserId,
        title,
        message,
        notificationType,
        entityType,
        entityId,
        linkTarget,
        JSON.stringify(metadata || {}),
      ],
    );
  }

  static async findUserIdsByEmployeeIds(client, employeeIds) {
    const result = await client.query(
      `
      SELECT employee_id, user_id, employee_code, full_name
      FROM employees
      WHERE employee_id = ANY($1::bigint[])
        AND user_id IS NOT NULL
      `,
      [employeeIds],
    );
    return result.rows;
  }

  static async findActiveDepartmentHeads(client, departmentId) {
    const result = await client.query(
      `
      SELECT e.user_id, e.employee_id, e.employee_code
      FROM employees e
      JOIN users u ON u.user_id = e.user_id
      WHERE e.department_id = $1
        AND e.status = 'ACTIVE'
        AND u.status = 'ACTIVE'
        AND u.role = 'DEPARTMENT_HEAD'
        AND e.user_id IS NOT NULL
      `,
      [departmentId],
    );
    return result.rows;
  }

  static async listNotifications(client, { recipientUserId, recipientRole, limit }) {
    const result = await client.query(
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
      [recipientUserId, recipientRole, limit],
    );
    return result.rows;
  }

  static async countUnreadNotifications(client, { recipientUserId, recipientRole }) {
    const result = await client.query(
      `
      SELECT COUNT(*)::INTEGER AS unread_count
      FROM notifications
      WHERE (recipient_user_id = $1 OR recipient_role = $2)
        AND is_read = FALSE
      `,
      [recipientUserId, recipientRole],
    );
    return result.rows[0]?.unread_count || 0;
  }

  static async markNotificationAsRead(client, { notificationId, recipientUserId, recipientRole }) {
    const result = await client.query(
      `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE notification_id = $1
        AND (recipient_user_id = $2 OR recipient_role = $3)
      RETURNING notification_id
      `,
      [notificationId, recipientUserId, recipientRole],
    );
    return result.rowCount > 0;
  }

  static async markAllNotificationsAsRead(client, { recipientUserId, recipientRole }) {
    const result = await client.query(
      `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE (recipient_user_id = $1 OR recipient_role = $2)
        AND is_read = FALSE
      `,
      [recipientUserId, recipientRole],
    );
    return result.rowCount;
  }
}
