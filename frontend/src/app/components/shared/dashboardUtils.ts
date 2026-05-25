import type { BadgeStatus } from "../StatusBadge";

const weekDayLabels = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

function datePart(value: string) {
  return (value || "").split("T")[0].split(" ")[0];
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromIso(value: string) {
  const [year, month, day] = datePart(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getCurrentWeekStart(reference = new Date()) {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);

  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return toIsoDate(date);
}

export function addDaysIso(value: string, days: number) {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function formatDate(value: string) {
  const normalized = datePart(value);
  if (!normalized) return "-";

  const [year, month, day] = normalized.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

export function formatShortDate(value: string) {
  const normalized = datePart(value);
  if (!normalized) return "-";

  const [, month, day] = normalized.split("-");
  return day && month ? `${day}/${month}` : value;
}

export function formatDateTime(value: string) {
  if (!value) return "-";

  const [date, time] = value.replace("T", " ").split(" ");
  return time ? `${formatDate(date)} ${time.slice(0, 5)}` : formatDate(date);
}

export function formatTimeRange(startTime: string, endTime: string) {
  const start = startTime ? startTime.slice(0, 5) : "--:--";
  const end = endTime ? endTime.slice(0, 5) : "--:--";
  return `${start} - ${end}`;
}

export function formatWeekRange(weekStart: string) {
  const weekEnd = addDaysIso(weekStart, 6);
  return `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}/${dateFromIso(weekEnd).getFullYear()}`;
}

export function formatTodayLong(date = new Date()) {
  return `${weekDayLabels[date.getDay()]}, ngày ${formatDate(toIsoDate(date))}`;
}

export function isToday(value: string) {
  return datePart(value) === toIsoDate(new Date());
}

export function isUpcomingOrToday(value: string) {
  return datePart(value) >= toIsoDate(new Date());
}

export function compareDutyTime(
  left: { dutyDate: string; startTime?: string },
  right: { dutyDate: string; startTime?: string },
) {
  return (
    datePart(left.dutyDate).localeCompare(datePart(right.dutyDate)) ||
    (left.startTime || "").localeCompare(right.startTime || "")
  );
}

export function getGreetingName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : fullName;
}

export function getScheduleBadgeStatus(status: string): BadgeStatus {
  if (status === "CANCELLED") return "rejected";
  if (status === "UPDATED") return "on_duty";
  return "assigned";
}

export function getSwapBadgeStatus(status: string): BadgeStatus {
  if (status === "PENDING_RESPONSE") return "waiting_response";
  if (status === "PENDING_APPROVAL") return "waiting_process";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "EXPIRED") return "expired";
  return "empty";
}
