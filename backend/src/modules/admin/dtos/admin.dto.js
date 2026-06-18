import {
  emptyToNull,
  isValidEmail,
  isValidPhone,
  normalizeGender,
  normalizeShiftDepartmentConfigs,
  normalizeShiftType,
  normalizeStatus,
  parsePositiveId,
} from "../controllers/admin.helpers.js"; // note: admin.helpers.js will be moved to controllers later

export function validateEmployeeDTO(data) {
  const errors = [];
  const fullName = typeof data.full_name === "string" ? data.full_name.trim() : "";
  const position = typeof data.position === "string" ? data.position.trim() : "";
  const departmentId = parsePositiveId(data.department_id);
  const roomId = parsePositiveId(data.room_id);
  const normalizedPhone = emptyToNull(data.phone?.trim());
  const normalizedEmail = emptyToNull(data.email?.trim());

  if (!fullName) {
    errors.push("Vui lòng nhập họ tên");
  }
  if (!departmentId) {
    errors.push("Khoa trực thuộc không hợp lệ");
  }
  if (!position) {
    errors.push("Vui lòng nhập chức vụ");
  }
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    errors.push("Email không đúng định dạng");
  }
  if (normalizedPhone && !isValidPhone(normalizedPhone)) {
    errors.push("Số điện thoại phải gồm đúng 10 chữ số");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      fullName,
      gender: normalizeGender(data.gender),
      dateOfBirth: emptyToNull(data.date_of_birth),
      phone: normalizedPhone,
      email: normalizedEmail,
      departmentId,
      roomId,
      position,
      status: normalizeStatus(data.status),
    },
  };
}

export function validateShiftDTO(data) {
  const errors = [];
  const shiftName = typeof data.shift_name === "string" ? data.shift_name.trim() : "";
  const normalizedShiftType = normalizeShiftType(data.shift_type);
  const normalizedStatus = normalizeStatus(data.status);
  const departmentConfigs = normalizeShiftDepartmentConfigs(data.departments);

  if (!shiftName) {
    errors.push("Vui lòng nhập tên ca");
  }
  if (!data.start_time) {
    errors.push("Vui lòng nhập giờ bắt đầu");
  }
  if (!data.end_time) {
    errors.push("Vui lòng nhập giờ kết thúc");
  }
  if (!normalizedShiftType) {
    errors.push("Loại ca không hợp lệ");
  }
  if (!departmentConfigs || departmentConfigs.length === 0) {
    errors.push("Vui lòng cấu hình khoa áp dụng ca trực hợp lệ");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      shiftName,
      startTime: data.start_time,
      endTime: data.end_time,
      shiftType: normalizedShiftType,
      note: emptyToNull(data.note),
      status: normalizedStatus,
      departmentConfigs,
    },
  };
}
