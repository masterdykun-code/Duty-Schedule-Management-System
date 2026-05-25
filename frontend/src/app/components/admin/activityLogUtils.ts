import type { ActivityLogRecord } from "../../lib/adminApi";

export const activityActionLabels: Record<string, string> = {
  ASSIGN_SCHEDULE_AUTO: "Phân công tự động",
  ASSIGN_SCHEDULE_MANUAL: "Phân công thủ công",
  RESET_ASSIGNMENT: "Reset phân công",
  CREATE_EMPLOYEE: "Thêm nhân viên",
  UPDATE_EMPLOYEE: "Sửa nhân viên",
  DEACTIVATE_EMPLOYEE: "Ngừng nhân viên",
  CREATE_SHIFT: "Thêm ca trực",
  UPDATE_SHIFT: "Sửa ca trực",
  DEACTIVATE_SHIFT: "Ngừng ca trực",
  CREATE_SWAP_REQUEST: "Gửi yêu cầu đổi ca",
  RESPOND_SWAP_REQUEST: "Phản hồi đổi ca",
  APPROVE_SWAP_REQUEST: "Duyệt đổi ca",
  REJECT_SWAP_REQUEST: "Từ chối đổi ca",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  UPDATE_PROFILE: "Cập nhật cá nhân",
  LOGIN: "Đăng nhập",
};

export const activityActionOptions = [
  { value: "all", label: "Tất cả hoạt động" },
  ...Object.entries(activityActionLabels).map(([value, label]) => ({ value, label })),
];

export const roleLabels: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MEDICAL_STAFF: "Nhân viên y tế",
  DEPARTMENT_HEAD: "Trưởng khoa",
  OFFICE: "Phòng hành chính",
};

export function getActivityActionLabel(action: string) {
  return activityActionLabels[action] || action;
}

export function getActivityRoleLabel(role: string) {
  return roleLabels[role] || role || "-";
}

export function formatActivityTime(value: string) {
  if (!value) return "-";
  const [date, time] = value.replace("T", " ").split(" ");
  const [year, month, day] = date.split("-");
  const formattedDate = day && month && year ? `${day}/${month}/${year}` : date;
  return time ? `${formattedDate} ${time.slice(0, 5)}` : formattedDate;
}

export function getActivityActor(log: ActivityLogRecord) {
  return log.username || "Hệ thống";
}
