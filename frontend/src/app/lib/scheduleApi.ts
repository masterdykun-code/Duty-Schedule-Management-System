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

interface ApiAssignmentScheduleResponse {
  week_start: string;
  week_end: string;
  rooms: ApiScheduleRoom[];
  shifts: ApiScheduleShift[];
  employees: ApiAssignableEmployee[];
  required_shifts: ApiRequiredShiftConfig[];
  data: ApiGeneralScheduleItem[];
  message?: string;
}

interface ApiActionResponse {
  message?: string;
}

interface ApiValidationResponse {
  complete: boolean;
  missing_count: number | string;
  missing: ApiMissingAssignment[];
  message?: string;
}

interface ApiAutoAssignResponse extends ApiActionResponse {
  created_count: number | string;
  updated_count: number | string;
  remaining_missing_count: number | string;
  remaining_missing: ApiMissingAssignment[];
}

interface ApiResetAssignmentResponse extends ApiActionResponse {
  updated_count: number | string;
}

interface ApiScheduleCoworker {
  schedule_id: number | string;
  employee_id: number | string;
  employee_code: string;
  full_name: string;
  position: string;
  note: string | null;
}

interface ApiScheduleDetailResponse {
  schedule: ApiScheduleItem;
  coworkers: ApiScheduleCoworker[];
  rooms: ApiRoomOption[];
  shifts: ApiScheduleShift[];
  message?: string;
}

interface ApiRoomOption {
  department_id: number | string;
  room_id: number | string;
  room_code: string;
  room_name: string;
}

interface ApiSwapCandidate {
  target_schedule_id: number | string;
  duty_date: string;
  note: string | null;
  employee_id: number | string;
  employee_code: string;
  full_name: string;
  position: string;
  room_id: number | string;
  room_code: string;
  room_name: string;
  shift_id: number | string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  shift_type: string;
}

interface ApiSwapOptionsResponse {
  data: ApiSwapCandidate[];
  message?: string;
}

interface ApiCreateSwapRequestResponse extends ApiActionResponse {
  request_id: number | string;
  status: string;
}

interface ApiSwapRequestEmployee {
  employee_id: number | string;
  employee_code: string;
  full_name: string;
  role?: string | null;
}

interface ApiSwapRequestApprover {
  employee_id: number | string;
  full_name: string;
}

interface ApiSwapRequestSchedule {
  schedule_id: number | string;
  duty_date: string;
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
}

interface ApiSwapRequest {
  request_id: number | string;
  reason: string;
  status: string;
  response_note: string | null;
  approval_note: string | null;
  requested_at: string;
  responded_at: string | null;
  approved_at: string | null;
  can_respond: boolean;
  can_approve: boolean;
  requester: ApiSwapRequestEmployee;
  target_employee: ApiSwapRequestEmployee;
  approved_by: ApiSwapRequestApprover | null;
  source_schedule: ApiSwapRequestSchedule;
  target_schedule: ApiSwapRequestSchedule | null;
}

interface ApiSwapRequestsResponse {
  data: ApiSwapRequest[];
  message?: string;
}

interface ApiSwapActionResponse extends ApiActionResponse {
  request_id: number | string;
  status: string;
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

interface ApiAssignableEmployee {
  employee_id: number | string;
  employee_code: string;
  full_name: string;
  position: string;
  department_id: number | string;
  room_id: number | string | null;
  room_code: string | null;
}

interface ApiRequiredShiftConfig {
  department_id: number | string;
  shift_id: number | string;
  is_required: boolean;
  min_staff: number | string;
  max_staff: number | string;
}

interface ApiMissingAssignment {
  department_id: number | string;
  department_code: string;
  department_name: string;
  room_id: number | string;
  room_code: string;
  shift_id: number | string;
  shift_code: string;
  shift_name: string;
  duty_date: string;
  min_staff: number | string;
  max_staff: number | string;
  assigned_count: number | string;
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

export interface AssignableEmployee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  position: string;
  departmentId: number;
  roomId: number | null;
  roomCode: string;
}

export interface RequiredShiftConfig {
  departmentId: number;
  shiftId: number;
  isRequired: boolean;
  minStaff: number;
  maxStaff: number;
}

export interface MissingAssignment {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  roomId: number;
  roomCode: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  dutyDate: string;
  minStaff: number;
  maxStaff: number;
  assignedCount: number;
}

export interface AssignmentScheduleResponse extends GeneralScheduleResponse {
  employees: AssignableEmployee[];
  requiredShifts: RequiredShiftConfig[];
}

export interface AssignmentCellPayload {
  duty_date: string;
  room_id: number;
  shift_id: number;
  employee_ids: number[];
  note?: string | null;
}

export interface AssignmentValidationResponse {
  complete: boolean;
  missingCount: number;
  missing: MissingAssignment[];
  message: string;
}

export interface AutoAssignResponse {
  message: string;
  createdCount: number;
  updatedCount: number;
  remainingMissingCount: number;
  remainingMissing: MissingAssignment[];
}

export interface ResetAssignmentResponse {
  message: string;
  updatedCount: number;
}

export interface ScheduleCoworker {
  scheduleId: number;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  position: string;
  note: string;
}

export interface RoomOption {
  departmentId: number;
  roomId: number;
  roomCode: string;
  roomName: string;
}

export interface ScheduleDetailResponse {
  schedule: MyScheduleItem;
  coworkers: ScheduleCoworker[];
  rooms: RoomOption[];
  shifts: ScheduleShift[];
}

export interface SwapCandidate {
  targetScheduleId: number;
  dutyDate: string;
  note: string;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  position: string;
  roomId: number;
  roomCode: string;
  roomName: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  shiftType: string;
}

export interface SwapOptionsParams {
  sourceScheduleId: number;
  dutyDate: string;
  roomId: number;
  shiftId: number;
}

export interface CreateSwapRequestPayload {
  source_schedule_id: number;
  target_schedule_id: number;
  reason: string;
}

export interface CreateSwapRequestResponse {
  message: string;
  requestId: number;
  status: string;
}

export interface SwapRequestEmployee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  role: string;
}

export interface SwapRequestApprover {
  employeeId: number;
  fullName: string;
}

export interface SwapRequestSchedule {
  scheduleId: number;
  dutyDate: string;
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
}

export interface SwapRequestRecord {
  requestId: number;
  reason: string;
  status: string;
  responseNote: string;
  approvalNote: string;
  requestedAt: string;
  respondedAt: string;
  approvedAt: string;
  canRespond: boolean;
  canApprove: boolean;
  requester: SwapRequestEmployee;
  targetEmployee: SwapRequestEmployee;
  approvedBy: SwapRequestApprover | null;
  sourceSchedule: SwapRequestSchedule;
  targetSchedule: SwapRequestSchedule | null;
}

export interface SwapRequestActionResponse {
  message: string;
  requestId: number;
  status: string;
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

function mapAssignableEmployee(item: ApiAssignableEmployee): AssignableEmployee {
  return {
    employeeId: Number(item.employee_id),
    employeeCode: item.employee_code,
    fullName: item.full_name,
    position: item.position,
    departmentId: Number(item.department_id),
    roomId: item.room_id ? Number(item.room_id) : null,
    roomCode: item.room_code || "",
  };
}

function mapRequiredShiftConfig(item: ApiRequiredShiftConfig): RequiredShiftConfig {
  return {
    departmentId: Number(item.department_id),
    shiftId: Number(item.shift_id),
    isRequired: item.is_required,
    minStaff: Number(item.min_staff),
    maxStaff: Number(item.max_staff),
  };
}

function mapMissingAssignment(item: ApiMissingAssignment): MissingAssignment {
  return {
    departmentId: Number(item.department_id),
    departmentCode: item.department_code,
    departmentName: item.department_name,
    roomId: Number(item.room_id),
    roomCode: item.room_code,
    shiftId: Number(item.shift_id),
    shiftCode: item.shift_code,
    shiftName: item.shift_name,
    dutyDate: item.duty_date,
    minStaff: Number(item.min_staff),
    maxStaff: Number(item.max_staff),
    assignedCount: Number(item.assigned_count),
  };
}

function mapCoworker(item: ApiScheduleCoworker): ScheduleCoworker {
  return {
    scheduleId: Number(item.schedule_id),
    employeeId: Number(item.employee_id),
    employeeCode: item.employee_code,
    fullName: item.full_name,
    position: item.position,
    note: item.note || "",
  };
}

function mapRoomOption(item: ApiRoomOption): RoomOption {
  return {
    departmentId: Number(item.department_id),
    roomId: Number(item.room_id),
    roomCode: item.room_code,
    roomName: item.room_name,
  };
}

function mapSwapCandidate(item: ApiSwapCandidate): SwapCandidate {
  return {
    targetScheduleId: Number(item.target_schedule_id),
    dutyDate: item.duty_date,
    note: item.note || "",
    employeeId: Number(item.employee_id),
    employeeCode: item.employee_code,
    fullName: item.full_name,
    position: item.position,
    roomId: Number(item.room_id),
    roomCode: item.room_code,
    roomName: item.room_name,
    shiftId: Number(item.shift_id),
    shiftCode: item.shift_code,
    shiftName: item.shift_name,
    startTime: item.start_time,
    endTime: item.end_time,
    shiftType: item.shift_type,
  };
}

function mapSwapRequestEmployee(item: ApiSwapRequestEmployee): SwapRequestEmployee {
  return {
    employeeId: Number(item.employee_id),
    employeeCode: item.employee_code,
    fullName: item.full_name,
    role: item.role || "",
  };
}

function mapSwapRequestApprover(item: ApiSwapRequestApprover | null): SwapRequestApprover | null {
  if (!item) return null;
  return {
    employeeId: Number(item.employee_id),
    fullName: item.full_name,
  };
}

function mapSwapRequestSchedule(item: ApiSwapRequestSchedule | null): SwapRequestSchedule | null {
  if (!item) return null;
  return {
    scheduleId: Number(item.schedule_id),
    dutyDate: item.duty_date,
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
  };
}

function mapSwapRequest(item: ApiSwapRequest): SwapRequestRecord {
  const sourceSchedule = mapSwapRequestSchedule(item.source_schedule);
  if (!sourceSchedule) {
    throw new Error("Dữ liệu yêu cầu đổi ca không hợp lệ.");
  }

  return {
    requestId: Number(item.request_id),
    reason: item.reason || "",
    status: item.status,
    responseNote: item.response_note || "",
    approvalNote: item.approval_note || "",
    requestedAt: item.requested_at || "",
    respondedAt: item.responded_at || "",
    approvedAt: item.approved_at || "",
    canRespond: Boolean(item.can_respond),
    canApprove: Boolean(item.can_approve),
    requester: mapSwapRequestEmployee(item.requester),
    targetEmployee: mapSwapRequestEmployee(item.target_employee),
    approvedBy: mapSwapRequestApprover(item.approved_by),
    sourceSchedule,
    targetSchedule: mapSwapRequestSchedule(item.target_schedule),
  };
}

async function scheduleRequest<T>(path: string, options: RequestInit = {}) {
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

export async function fetchAssignmentSchedule(weekStart: string): Promise<AssignmentScheduleResponse> {
  const body = await scheduleRequest<ApiAssignmentScheduleResponse>(
    `/api/schedules/assignment?week_start=${weekStart}`,
  );

  return {
    weekStart: body.week_start,
    weekEnd: body.week_end,
    rooms: body.rooms.map(mapRoom),
    shifts: body.shifts.map(mapShift),
    data: body.data.map(mapGeneralSchedule),
    employees: body.employees.map(mapAssignableEmployee),
    requiredShifts: body.required_shifts.map(mapRequiredShiftConfig),
  };
}

export async function saveAssignmentCell(payload: AssignmentCellPayload) {
  const body = await scheduleRequest<ApiActionResponse>("/api/schedules/assignment/cell", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return body.message || "Lưu phân công thành công.";
}

export async function validateAssignmentSchedule(weekStart: string): Promise<AssignmentValidationResponse> {
  const body = await scheduleRequest<ApiValidationResponse>("/api/schedules/assignment/validate", {
    method: "POST",
    body: JSON.stringify({ week_start: weekStart }),
  });

  return {
    complete: body.complete,
    missingCount: Number(body.missing_count),
    missing: body.missing.map(mapMissingAssignment),
    message: body.message || "",
  };
}

export async function autoAssignSchedule(weekStart: string): Promise<AutoAssignResponse> {
  const body = await scheduleRequest<ApiAutoAssignResponse>("/api/schedules/assignment/auto", {
    method: "POST",
    body: JSON.stringify({ week_start: weekStart }),
  });

  return {
    message: body.message || "",
    createdCount: Number(body.created_count),
    updatedCount: Number(body.updated_count),
    remainingMissingCount: Number(body.remaining_missing_count),
    remainingMissing: body.remaining_missing.map(mapMissingAssignment),
  };
}

export async function resetAssignmentSchedule(weekStart: string): Promise<ResetAssignmentResponse> {
  const body = await scheduleRequest<ApiResetAssignmentResponse>("/api/schedules/assignment/reset", {
    method: "POST",
    body: JSON.stringify({ week_start: weekStart }),
  });

  return {
    message: body.message || "",
    updatedCount: Number(body.updated_count),
  };
}

export async function fetchScheduleDetail(scheduleId: number): Promise<ScheduleDetailResponse> {
  const body = await scheduleRequest<ApiScheduleDetailResponse>(`/api/schedules/me/schedules/${scheduleId}`);

  return {
    schedule: mapSchedule(body.schedule),
    coworkers: body.coworkers.map(mapCoworker),
    rooms: body.rooms.map(mapRoomOption),
    shifts: body.shifts.map(mapShift),
  };
}

export async function fetchSwapOptions(params: SwapOptionsParams): Promise<SwapCandidate[]> {
  const query = new URLSearchParams({
    source_schedule_id: String(params.sourceScheduleId),
    duty_date: params.dutyDate,
    room_id: String(params.roomId),
    shift_id: String(params.shiftId),
  });

  const body = await scheduleRequest<ApiSwapOptionsResponse>(
    `/api/schedules/me/swap-options?${query.toString()}`,
  );

  return body.data.map(mapSwapCandidate);
}

export async function createSwapRequest(
  payload: CreateSwapRequestPayload,
): Promise<CreateSwapRequestResponse> {
  const body = await scheduleRequest<ApiCreateSwapRequestResponse>("/api/schedules/me/swap-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    message: body.message || "",
    requestId: Number(body.request_id),
    status: body.status,
  };
}

export async function fetchSwapRequests(): Promise<SwapRequestRecord[]> {
  const body = await scheduleRequest<ApiSwapRequestsResponse>("/api/schedules/me/swap-requests");

  return body.data.map(mapSwapRequest);
}

export async function respondSwapRequestAction(
  requestId: number,
  accepted: boolean,
  note = "",
): Promise<SwapRequestActionResponse> {
  const body = await scheduleRequest<ApiSwapActionResponse>(
    `/api/schedules/me/swap-requests/${requestId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ accepted, note }),
    },
  );

  return {
    message: body.message || "",
    requestId: Number(body.request_id),
    status: body.status,
  };
}

export async function reviewSwapRequestAction(
  requestId: number,
  approved: boolean,
  note = "",
): Promise<SwapRequestActionResponse> {
  const body = await scheduleRequest<ApiSwapActionResponse>(
    `/api/schedules/me/swap-requests/${requestId}/review`,
    {
      method: "POST",
      body: JSON.stringify({ approved, note }),
    },
  );

  return {
    message: body.message || "",
    requestId: Number(body.request_id),
    status: body.status,
  };
}
