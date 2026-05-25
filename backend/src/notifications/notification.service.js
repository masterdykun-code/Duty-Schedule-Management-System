import { pool } from "../db.js";

export async function createNotification(
  client = pool,
  {
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
  },
) {
  if (!recipientUserId && !recipientRole) {
    return;
  }

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

export async function createNotificationsForEmployeeIds(client = pool, {
  employeeIds,
  senderUserId = null,
  title,
  message,
  notificationType,
  entityType = null,
  entityId = null,
  linkTarget = null,
  metadata = {},
}) {
  const ids = [...new Set((employeeIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) return;

  const result = await client.query(
    `
    SELECT employee_id, user_id, employee_code, full_name
    FROM employees
    WHERE employee_id = ANY($1::bigint[])
      AND user_id IS NOT NULL
    `,
    [ids],
  );

  for (const employee of result.rows) {
    await createNotification(client, {
      recipientUserId: employee.user_id,
      senderUserId,
      title,
      message,
      notificationType,
      entityType,
      entityId,
      linkTarget,
      metadata: {
        ...metadata,
        employee_id: employee.employee_id,
        employee_code: employee.employee_code,
      },
    });
  }
}

export async function createNotificationsForRole(client = pool, {
  recipientRole,
  senderUserId = null,
  title,
  message,
  notificationType,
  entityType = null,
  entityId = null,
  linkTarget = null,
  metadata = {},
}) {
  await createNotification(client, {
    recipientRole,
    senderUserId,
    title,
    message,
    notificationType,
    entityType,
    entityId,
    linkTarget,
    metadata,
  });
}

export async function createNotificationsForDepartmentHeads(client = pool, {
  departmentId,
  senderUserId = null,
  title,
  message,
  notificationType,
  entityType = null,
  entityId = null,
  linkTarget = null,
  metadata = {},
}) {
  if (!departmentId) return;

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

  for (const head of result.rows) {
    await createNotification(client, {
      recipientUserId: head.user_id,
      senderUserId,
      title,
      message,
      notificationType,
      entityType,
      entityId,
      linkTarget,
      metadata: {
        ...metadata,
        department_id: departmentId,
        employee_id: head.employee_id,
        employee_code: head.employee_code,
      },
    });
  }
}
