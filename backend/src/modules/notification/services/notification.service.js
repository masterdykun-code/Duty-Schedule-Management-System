import { pool } from "../../../db.js";
import { NotificationRepository } from "../repositories/notification.repository.js";

export async function createNotification(client = pool, payload) {
  if (!payload.recipientUserId && !payload.recipientRole) {
    return;
  }
  await NotificationRepository.createNotification(client, payload);
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

  const employees = await NotificationRepository.findUserIdsByEmployeeIds(client, ids);

  for (const employee of employees) {
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

export async function createNotificationsForRole(client = pool, payload) {
  await createNotification(client, payload);
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

  const heads = await NotificationRepository.findActiveDepartmentHeads(client, departmentId);

  for (const head of heads) {
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
