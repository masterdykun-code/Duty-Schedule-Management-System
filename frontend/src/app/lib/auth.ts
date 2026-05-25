import type { Role } from "../components/Header";

type ApiRole = "ADMIN" | "MEDICAL_STAFF" | "DEPARTMENT_HEAD" | "OFFICE";

interface ApiUser {
  user_id: number;
  username: string;
  role: ApiRole;
  status: string;
  employee_id?: number | null;
  employee_code?: string | null;
  full_name?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  room_id?: number | null;
  room_name?: string | null;
  position?: string | null;
}

interface LoginResponse {
  token: string;
  expires_in?: number;
  user: ApiUser;
  message?: string;
}

interface MeResponse {
  user: ApiUser;
  message?: string;
}

interface MessageResponse {
  message?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: Role;
  apiRole: ApiRole;
  status: string;
  employeeId?: number | null;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  roomId?: number | null;
  roomName?: string | null;
  position?: string | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresIn?: number;
}

const importMetaWithEnv = import.meta as ImportMeta & {
  env?: { VITE_API_URL?: string };
};

export const API_BASE_URL = importMetaWithEnv.env?.VITE_API_URL || "http://localhost:3000";
export const AUTH_SESSION_KEY = "medschedule_auth_session";

const roleByApiRole: Record<ApiRole, Role> = {
  ADMIN: "admin",
  MEDICAL_STAFF: "staff",
  DEPARTMENT_HEAD: "head",
  OFFICE: "office",
};

async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

function getStoredToken() {
  const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) {
    throw new Error("Bạn cần đăng nhập lại.");
  }

  const session = JSON.parse(rawSession) as { token?: string };
  if (!session.token) {
    throw new Error("Bạn cần đăng nhập lại.");
  }

  return session.token;
}

function normalizeUser(user: ApiUser): AuthUser {
  return {
    id: user.user_id,
    username: user.username,
    name: user.full_name || user.username,
    role: roleByApiRole[user.role],
    apiRole: user.role,
    status: user.status,
    employeeId: user.employee_id,
    employeeCode: user.employee_code,
    departmentId: user.department_id,
    departmentName: user.department_name,
    roomId: user.room_id,
    roomName: user.room_name,
    position: user.position,
  };
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const body = await readResponseJson<LoginResponse>(response);

  if (!response.ok) {
    throw new Error(body.message || "Dang nhap that bai");
  }

  return {
    token: body.token,
    expiresIn: body.expires_in,
    user: normalizeUser(body.user),
  };
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await readResponseJson<MeResponse>(response);

  if (!response.ok) {
    throw new Error(body.message || "Phien dang nhap khong hop le");
  }

  return normalizeUser(body.user);
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getStoredToken()}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });

  const body = await readResponseJson<MessageResponse>(response);

  if (!response.ok) {
    throw new Error(body.message || "Không thể đổi mật khẩu.");
  }

  return body.message || "Đổi mật khẩu thành công.";
}
