import { getRequestedWeekStart, isValidIsoDate } from "../../../utils/schedule-date.js";
import { parsePositiveId, uniquePositiveIds } from "../../../utils/schedule-ids.js";

export function validateCreateSwapDTO(data) {
  const errors = [];
  const sourceScheduleId = parsePositiveId(data.sourceScheduleId || data.source_schedule_id);
  const targetScheduleId = parsePositiveId(data.targetScheduleId || data.target_schedule_id);
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";

  if (!sourceScheduleId) {
    errors.push("Mã ca trực nguồn không hợp lệ");
  }
  if (!targetScheduleId) {
    errors.push("Mã ca trực đích không hợp lệ");
  }
  if (!reason) {
    errors.push("Vui lòng nhập lý do đổi ca");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      sourceScheduleId,
      targetScheduleId,
      reason,
    },
  };
}

export function validateRespondSwapDTO(data) {
  const errors = [];
  if (typeof data.accepted !== "boolean") {
    errors.push("Vui lòng chọn đồng ý hoặc từ chối");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      accepted: data.accepted,
      note: typeof data.note === "string" ? data.note.trim() : "",
    },
  };
}

export function validateReviewSwapDTO(data) {
  const errors = [];
  if (typeof data.approved !== "boolean") {
    errors.push("Vui lòng chọn duyệt hoặc từ chối");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      approved: data.approved,
      note: typeof data.note === "string" ? data.note.trim() : "",
    },
  };
}

export function validateSaveAssignmentCellDTO(data) {
  const errors = [];
  const employeeIds = uniquePositiveIds(data.employee_ids);
  const departmentId = parsePositiveId(data.department_id);
  const roomId = parsePositiveId(data.room_id);
  const shiftId = parsePositiveId(data.shift_id);
  const dutyDate = data.duty_date;

  if (!departmentId) errors.push("Khoa không hợp lệ");
  if (!roomId) errors.push("Phòng không hợp lệ");
  if (!shiftId) errors.push("Ca trực không hợp lệ");
  if (!dutyDate || !isValidIsoDate(dutyDate)) errors.push("Ngày trực không hợp lệ");
  if (!employeeIds) errors.push("Nhân viên không hợp lệ");

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      employeeIds,
      departmentId,
      roomId,
      shiftId,
      dutyDate,
      note: typeof data.note === "string" ? data.note.trim() : "",
    },
  };
}

export function validateWeekStartDTO(data) {
  const errors = [];
  const weekStart = getRequestedWeekStart(data.week_start);
  if (!weekStart) {
    errors.push("week_start phải có định dạng YYYY-MM-DD");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      weekStart,
    },
  };
}
