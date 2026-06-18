import { API_BASE_URL, AUTH_SESSION_KEY } from "./auth";

type ApiStatus = "ACTIVE" | "INACTIVE";
type UiStatus = "active" | "inactive";

export interface DepartmentOption {
  id: number;
  code: string;
  name: string;
  status: ApiStatus;
}

export interface RoomOption {
  id: number;
  departmentId: number;
  code: string;
  name: string;
  status: ApiStatus;
}

export interface StaffRecord {
  id: number;
  code: string;
  username: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  departmentId: number;
  department: string;
  roomId: number | null;
  room: string;
  position: string;
  status: UiStatus;
}

export interface StaffPayload {
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  department_id: number;
  room_id: number | null;
  position: string;
  status: ApiStatus;
}

export interface ShiftRecord {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  type: string;
  note: string;
  status: UiStatus;
  departments: ShiftDepartmentConfig[];
}

export interface ShiftPayload {
  shift_name: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  note: string | null;
  status: ApiStatus;
  departments: ShiftDepartmentPayload[];
}

export interface ShiftDepartmentConfig {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  isRequired: boolean;
  minStaff: number;
  maxStaff: number;
  status: ApiStatus;
}

export interface ShiftDepartmentPayload {
  department_id: number;
  is_required: boolean;
  min_staff: number;
  max_staff: number;
}

export interface ActivityLogRecord {
  id: number;
  userId: number | null;
  username: string;
  role: string;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export interface ActivityLogParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityLogResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ActivityLogRecord[];
}

interface ApiListResponse<T> {
  data: T[];
  message?: string;
}

interface ApiPagedResponse<T> {
  page: number | string;
  limit: number | string;
  total: number | string;
  total_pages: number | string;
  data: T[];
  message?: string;
}

interface ApiItemResponse<T> {
  data: T;
  message?: string;
}

interface ApiDepartment {
  department_id: number | string;
  department_code: string;
  department_name: string;
  status: ApiStatus;
}

interface ApiRoom {
  room_id: number | string;
  department_id: number | string;
  room_code: string;
  room_name: string;
  status: ApiStatus;
}

interface ApiEmployee {
  employee_id: number | string;
  employee_code: string;
  username: string | null;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  department_id: number | string;
  department_name: string;
  room_id: number | string | null;
  room_code: string | null;
  room_name: string | null;
  position: string;
  status: ApiStatus;
}

interface ApiShift {
  shift_id: number | string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  note: string | null;
  status: ApiStatus;
  departments?: ApiShiftDepartment[];
}

interface ApiShiftDepartment {
  department_id: number | string;
  department_code: string;
  department_name: string;
  is_required: boolean;
  min_staff: number | string;
  max_staff: number | string;
  status: ApiStatus;
}

interface ApiActivityLog {
  log_id: number | string;
  user_id: number | string | null;
  username: string | null;
  role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

function getToken() {
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

async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      if (parsed.success === true && "data" in parsed) {
        return parsed.data as T;
      }
      if (parsed.success === false && "error" in parsed) {
        const errObj = parsed.error || {};
        return {
          message: errObj.message || "Đã xảy ra lỗi hệ thống",
          ...errObj,
        } as unknown as T;
      }
    }
    return parsed as T;
  } catch {
    return {} as T;
  }
}

async function adminRequest<T>(path: string, options: RequestInit = {}) {
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
    throw new Error(body.message || "Không thể xử lý yêu cầu.");
  }

  return body;
}

function toUiStatus(status: ApiStatus): UiStatus {
  return status === "ACTIVE" ? "active" : "inactive";
}

export function toApiStatus(status: UiStatus): ApiStatus {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

function normalizeTime(value: string) {
  return value ? value.slice(0, 5) : "";
}

function mapDepartment(item: ApiDepartment): DepartmentOption {
  return {
    id: Number(item.department_id),
    code: item.department_code,
    name: item.department_name,
    status: item.status,
  };
}

function mapRoom(item: ApiRoom): RoomOption {
  return {
    id: Number(item.room_id),
    departmentId: Number(item.department_id),
    code: item.room_code,
    name: item.room_name,
    status: item.status,
  };
}

function mapEmployee(item: ApiEmployee): StaffRecord {
  return {
    id: Number(item.employee_id),
    code: item.employee_code,
    username: item.username || item.employee_code,
    name: item.full_name,
    gender: item.gender || "",
    dob: item.date_of_birth || "",
    phone: item.phone || "",
    email: item.email || "",
    departmentId: Number(item.department_id),
    department: item.department_name,
    roomId: item.room_id ? Number(item.room_id) : null,
    room: item.room_code || "",
    position: item.position,
    status: toUiStatus(item.status),
  };
}

function mapShift(item: ApiShift): ShiftRecord {
  return {
    id: Number(item.shift_id),
    code: item.shift_code,
    name: item.shift_name,
    startTime: normalizeTime(item.start_time),
    endTime: normalizeTime(item.end_time),
    type: item.shift_type,
    note: item.note || "",
    status: toUiStatus(item.status),
    departments: (item.departments || []).map((department) => ({
      departmentId: Number(department.department_id),
      departmentCode: department.department_code,
      departmentName: department.department_name,
      isRequired: department.is_required,
      minStaff: Number(department.min_staff),
      maxStaff: Number(department.max_staff),
      status: department.status,
    })),
  };
}

function mapActivityLog(item: ApiActivityLog): ActivityLogRecord {
  return {
    id: Number(item.log_id),
    userId: item.user_id ? Number(item.user_id) : null,
    username: item.username || "",
    role: item.role || "",
    action: item.action,
    entityType: item.entity_type || "",
    entityId: item.entity_id ? Number(item.entity_id) : null,
    description: item.description,
    metadata: item.metadata || {},
    ipAddress: item.ip_address || "",
    createdAt: item.created_at,
  };
}

function buildActivityQuery(params: ActivityLogParams = {}) {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.action && params.action !== "all") query.set("action", params.action);
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);

  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function fetchDepartments() {
  const body = await adminRequest<ApiListResponse<ApiDepartment>>("/api/admin/departments");
  return body.data.map(mapDepartment);
}

export async function fetchRooms() {
  const body = await adminRequest<ApiListResponse<ApiRoom>>("/api/admin/rooms");
  return body.data.map(mapRoom);
}

export async function fetchStaff() {
  const body = await adminRequest<ApiListResponse<ApiEmployee>>("/api/admin/employees");
  return body.data.map(mapEmployee);
}

export async function createStaff(payload: StaffPayload) {
  const body = await adminRequest<ApiItemResponse<ApiEmployee>>("/api/admin/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return mapEmployee(body.data);
}

export async function updateStaff(id: number, payload: StaffPayload) {
  const body = await adminRequest<ApiItemResponse<ApiEmployee>>(`/api/admin/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return mapEmployee(body.data);
}

export async function deactivateStaff(id: number) {
  const body = await adminRequest<ApiItemResponse<ApiEmployee>>(`/api/admin/employees/${id}`, {
    method: "DELETE",
  });

  return mapEmployee(body.data);
}

export async function fetchShifts() {
  const body = await adminRequest<ApiListResponse<ApiShift>>("/api/admin/shifts");
  return body.data.map(mapShift);
}

export async function createShift(payload: ShiftPayload) {
  const body = await adminRequest<ApiItemResponse<ApiShift>>("/api/admin/shifts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return mapShift(body.data);
}

export async function fetchActivityLogs(params: ActivityLogParams = {}): Promise<ActivityLogResponse> {
  const body = await adminRequest<ApiPagedResponse<ApiActivityLog>>(
    `/api/admin/activity-logs${buildActivityQuery(params)}`,
  );

  return {
    page: Number(body.page),
    limit: Number(body.limit),
    total: Number(body.total),
    totalPages: Number(body.total_pages),
    data: body.data.map(mapActivityLog),
  };
}

export async function updateShift(id: number, payload: ShiftPayload) {
  const body = await adminRequest<ApiItemResponse<ApiShift>>(`/api/admin/shifts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return mapShift(body.data);
}

export async function deactivateShift(id: number) {
  const body = await adminRequest<ApiItemResponse<ApiShift>>(`/api/admin/shifts/${id}`, {
    method: "DELETE",
  });

  return mapShift(body.data);
}
