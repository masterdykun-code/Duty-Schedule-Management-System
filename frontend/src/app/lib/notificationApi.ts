import { API_BASE_URL, AUTH_SESSION_KEY } from "./auth";

interface ApiNotification {
  notification_id: number | string;
  title: string;
  message: string;
  notification_type: string;
  entity_type: string | null;
  entity_id: number | string | null;
  link_target: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface ApiNotificationsResponse {
  unread_count: number | string;
  data: ApiNotification[];
  message?: string;
}

interface ApiMessageResponse {
  message?: string;
}

export interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  type: string;
  entityType: string;
  entityId: number | null;
  linkTarget: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

function getToken() {
  const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) {
    throw new Error("Ban can dang nhap lai.");
  }

  const session = JSON.parse(rawSession) as { token?: string };
  if (!session.token) {
    throw new Error("Ban can dang nhap lai.");
  }

  return session.token;
}

async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

async function notificationRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  const body = await readResponseJson<T & { message?: string }>(response);

  if (!response.ok) {
    throw new Error(body.message || "Khong the xu ly thong bao.");
  }

  return body;
}

function mapNotification(item: ApiNotification): NotificationRecord {
  return {
    id: Number(item.notification_id),
    title: item.title,
    message: item.message,
    type: item.notification_type,
    entityType: item.entity_type || "",
    entityId: item.entity_id ? Number(item.entity_id) : null,
    linkTarget: item.link_target || "",
    metadata: item.metadata || {},
    isRead: item.is_read,
    readAt: item.read_at,
    createdAt: item.created_at,
  };
}

export async function fetchNotifications(limit = 8): Promise<{
  unreadCount: number;
  data: NotificationRecord[];
}> {
  const body = await notificationRequest<ApiNotificationsResponse>(
    `/api/notifications?limit=${limit}`,
  );

  return {
    unreadCount: Number(body.unread_count || 0),
    data: body.data.map(mapNotification),
  };
}

export async function markNotificationRead(id: number) {
  await notificationRequest<ApiMessageResponse>(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead() {
  await notificationRequest<ApiMessageResponse>("/api/notifications/read-all", {
    method: "PATCH",
  });
}
