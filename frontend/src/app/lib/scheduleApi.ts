import { API_BASE_URL, AUTH_SESSION_KEY } from "./auth";

interface ApiMyScheduleResponse<T> {
  week_start: string;
  week_end: string;
  profile: ApiScheduleProfile;
  shifts: ApiScheduleShift[];
  data: T[];
  message?: string;
}

interface ApiGeneralScheduleResponse<T> {
  week_start: string;
  week_end: string;
  rooms: ApiScheduleRoom[];
  shifts: ApiScheduleShift[];
  data: T[];
  message?: string;
}

interface ApiScheduleProfile {
  employee_id: number | string;
  employee_code: string;
  full_name: string;
  position: string;
  status: string;
  department_id: number | string;
  department_code: string;
  department_name: string;
  room_id: number | string | null;
  room_code: string | null;
  room_name: string | null;
}

interface ApiScheduleItem {
  schedule_id: number | string;
  duty_date: string;
  status: string;
  note: string | null;
  department_id: number | string;
  department_code: string;
  department_name: string;
  room_id: number | string;
  room_code: string;
  room_name: string;
  shift_id: number | string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  assigned_by_username: string | null;
  swap_request_status: string | null;
}

interface ApiScheduleRoom {
  department_id: number | string;
  department_code: string;
  department_name: string;
  room_id: number | string | null;
  room_code: string | null;
  room_name: string | null;
}

interface ApiScheduleShift {
  shift_id: number | string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  shift_type: string;
}

interface ApiGeneralScheduleItem extends ApiScheduleItem {
  employee_id: number | string;
  employee_code: string;
  full_name: string;
  position: string;
}

export interface MyScheduleProfile {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  position: string;
  status: string;
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  roomId: number | null;
  roomCode: string;
  roomName: string;
}

export interface MyScheduleItem {
  scheduleId: number;
  dutyDate: string;
  status: string;
  note: string;
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  roomId: number;
  roomCode: string;
  roomName: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  shiftType: string;
  assignedByUsername: string;
  swapRequestStatus: string;
}

export interface MyScheduleResponse {
  weekStart: string;
  weekEnd: string;
  profile: MyScheduleProfile;
  shifts: ScheduleShift[];
  data: MyScheduleItem[];
}

export interface ScheduleRoom {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  roomId: number | null;
  roomCode: string;
  roomName: string;
}

export interface ScheduleShift {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  shiftType: string;
}

export interface GeneralScheduleItem extends MyScheduleItem {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  position: string;
}

export interface GeneralScheduleResponse {
  weekStart: string;
  weekEnd: string;
  rooms: ScheduleRoom[];
  shifts: ScheduleShift[];
  data: GeneralScheduleItem[];
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
  return text ? JSON.parse(text) : ({} as T);
}

function mapProfile(profile: ApiScheduleProfile): MyScheduleProfile {
  return {
    employeeId: Number(profile.employee_id),
    employeeCode: profile.employee_code,
    fullName: profile.full_name,
    position: profile.position,
    status: profile.status,
    departmentId: Number(profile.department_id),
    departmentCode: profile.department_code,
    departmentName: profile.department_name,
    roomId: profile.room_id ? Number(profile.room_id) : null,
    roomCode: profile.room_code || "",
    roomName: profile.room_name || "",
  };
}

function mapSchedule(item: ApiScheduleItem): MyScheduleItem {
  return {
    scheduleId: Number(item.schedule_id),
    dutyDate: item.duty_date,
    status: item.status,
    note: item.note || "",
    departmentId: Number(item.department_id),
    departmentCode: item.department_code,
    departmentName: item.department_name,
    roomId: Number(item.room_id),
    roomCode: item.room_code,
    roomName: item.room_name,
    shiftId: Number(item.shift_id),
    shiftCode: item.shift_code,
    shiftName: item.shift_name,
    startTime: item.start_time,
    endTime: item.end_time,
    shiftType: item.shift_type,
    assignedByUsername: item.assigned_by_username || "",
    swapRequestStatus: item.swap_request_status || "",
  };
}

function mapRoom(item: ApiScheduleRoom): ScheduleRoom {
  return {
    departmentId: Number(item.department_id),
    departmentCode: item.department_code,
    departmentName: item.department_name,
    roomId: item.room_id ? Number(item.room_id) : null,
    roomCode: item.room_code || "",
    roomName: item.room_name || "",
  };
}

function mapShift(item: ApiScheduleShift): ScheduleShift {
  return {
    shiftId: Number(item.shift_id),
    shiftCode: item.shift_code,
    shiftName: item.shift_name,
    startTime: item.start_time,
    endTime: item.end_time,
    shiftType: item.shift_type,
  };
}

function mapGeneralSchedule(item: ApiGeneralScheduleItem): GeneralScheduleItem {
  return {
    ...mapSchedule(item),
    employeeId: Number(item.employee_id),
    employeeCode: item.employee_code,
    fullName: item.full_name,
    position: item.position,
  };
}

export async function fetchMySchedule(weekStart: string): Promise<MyScheduleResponse> {
  const response = await fetch(`${API_BASE_URL}/api/schedules/me?week_start=${weekStart}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const body = await readResponseJson<ApiMyScheduleResponse<ApiScheduleItem>>(response);

  if (!response.ok) {
    throw new Error(body.message || "Không thể tải lịch trực cá nhân.");
  }

  return {
    weekStart: body.week_start,
    weekEnd: body.week_end,
    profile: mapProfile(body.profile),
    shifts: body.shifts.map(mapShift),
    data: body.data.map(mapSchedule),
  };
}

export async function fetchGeneralSchedule(weekStart: string): Promise<GeneralScheduleResponse> {
  const response = await fetch(`${API_BASE_URL}/api/schedules/general?week_start=${weekStart}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const body = await readResponseJson<ApiGeneralScheduleResponse<ApiGeneralScheduleItem>>(response);

  if (!response.ok) {
    throw new Error(body.message || "Không thể tải lịch trực tổng quát.");
  }

  return {
    weekStart: body.week_start,
    weekEnd: body.week_end,
    rooms: body.rooms.map(mapRoom),
    shifts: body.shifts.map(mapShift),
    data: body.data.map(mapGeneralSchedule),
  };
}
